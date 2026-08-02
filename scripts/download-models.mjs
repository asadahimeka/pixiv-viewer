/**
 * ONNX Model Downloader
 *
 * Downloads individual model assets directly from the DonutShinobu/ShinobuTranslator
 * GitHub Releases. The `models-*` prerelease tags publish standalone .onnx files
 * alongside a `models.sha256` checksum file.
 *
 * Main path — direct download per asset:
 *   https://github.com/{DEFAULT_REPO}/releases/download/{tag}/{filename}
 *
 * The `models.sha256` asset (sha256sum format `{hash}  {filename}`) is
 * downloaded, parsed, and each model's sha256 field is written back into
 * public/models/models.json.
 *
 * Fallback path (--zip): downloads ShinobuTranslator.zip and extracts model
 * files — kept for releases that only ship a zip bundle.
 *
 * Tag resolution (env > CLI > latest models-* prerelease):
 *   VUE_APP_MODEL_RELEASE_TAG=models-v0.7.0 node scripts/download-models.mjs
 *   node scripts/download-models.mjs --tag models-v0.7.0
 *   node scripts/download-models.mjs                  # auto-discover
 */

import { readFile, writeFile, mkdir, unlink } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { DEFAULT_REPO, formatBytes, sha256File } from './model-release-assets.mjs'

const MODELS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'models')
const MANIFEST_PATH = resolve(MODELS_DIR, 'models.json')
const ZIP_NAME = 'ShinobuTranslator.zip'
const RELEASE_BASE = `https://github.com/${DEFAULT_REPO}/releases/download`

/**
 * Discover the latest `models-*` prerelease tag via the GitHub releases API.
 * @returns {Promise<string>}
 */
async function getLatestModelTag() {
  const res = await fetch(`https://api.github.com/repos/${DEFAULT_REPO}/releases?per_page=20`)
  if (!res.ok) {
    throw new Error(`Failed to fetch releases: ${res.status} ${res.statusText}`)
  }
  const releases = await res.json()
  const modelTags = (Array.isArray(releases) ? releases : [])
    .filter(r => r.prerelease === true && typeof r.tag_name === 'string' && r.tag_name.startsWith('models-'))
    .sort((a, b) => (b.published_at || '').localeCompare(a.published_at || ''))
  if (modelTags.length === 0) {
    throw new Error('No models-* prerelease found in the latest 20 releases')
  }
  return modelTags[0].tag_name
}

/**
 * Download a URL to a local file. fetch() follows redirects (302 → asset CDN).
 * @param {string} url
 * @param {string} destPath
 * @returns {Promise<number>} bytes written
 */
async function downloadFile(url, destPath) {
  console.log(`  URL: ${url}`)
  const res = await fetch(url, { redirect: 'follow' })
  if (!res.ok) {
    throw new Error(`Download failed: ${res.status} ${res.statusText}`)
  }
  const contentLength = res.headers.get('content-length')
  if (contentLength) {
    console.log(`  Size: ${formatBytes(Number(contentLength))}`)
  }
  const buffer = Buffer.from(await res.arrayBuffer())
  await writeFile(destPath, buffer)
  return buffer.length
}

/**
 * Verify file integrity with SHA-256.
 * @param {Buffer} data - File data
 * @param {string} expected - Expected SHA-256 hex string
 * @returns {Promise<boolean>}
 */
async function verifyIntegrity(data, expected) {
  const actual = await sha256File(data)
  return actual === expected.toLowerCase()
}

/**
 * Read and parse the models manifest.
 * @returns {Promise<object>}
 */
async function readManifest() {
  if (!existsSync(MANIFEST_PATH)) {
    throw new Error(`Manifest not found at ${MANIFEST_PATH}`)
  }
  const raw = await readFile(MANIFEST_PATH, 'utf-8')
  return JSON.parse(raw)
}

/**
 * Parse CLI flags.
 * @param {string} flag
 * @returns {boolean}
 */
function hasCliFlag(flag) {
  return process.argv.slice(2).includes(flag)
}

/**
 * Parse CLI --tag argument (in addition to env var).
 * @returns {string|undefined}
 */
function parseCliTag() {
  const argv = process.argv.slice(2)
  const tagIdx = argv.indexOf('--tag')
  if (tagIdx !== -1 && tagIdx + 1 < argv.length) {
    return argv[tagIdx + 1]
  }
  return undefined
}

/**
 * Parse a sha256sum file (format: `{hash}  {filename}` or `{hash} *{filename}`).
 * @param {string} text
 * @returns {Object<string, string>} filename → sha256 hex
 */
function parseSha256Map(text) {
  const map = {}
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const match = trimmed.match(/^([0-9a-fA-F]{64})\s+(\*?)(.+)$/)
    if (match) {
      map[match[3].trim()] = match[1].toLowerCase()
    }
  }
  return map
}

/**
 * Download and parse models.sha256 for a tag.
 * @param {string} tag
 * @returns {Promise<Object<string, string>>} filename → sha256 hex
 */
async function downloadSha256(tag) {
  const url = `${RELEASE_BASE}/${tag}/models.sha256`
  console.log('Downloading models.sha256...')
  const res = await fetch(url, { redirect: 'follow' })
  if (!res.ok) {
    throw new Error(`Download failed: ${res.status} ${res.statusText}`)
  }
  const text = await res.text()
  const map = parseSha256Map(text)
  if (Object.keys(map).length === 0) {
    throw new Error('models.sha256 parsed to empty map')
  }
  console.log(`  ✓ ${Object.keys(map).length} checksums parsed\n`)
  return map
}

/**
 * Write sha256 values into the manifest and persist it.
 * @param {object} manifest
 * @param {Object<string, string>} shaMap
 * @param {Array<{name: string, filename: string, isDict?: boolean}>} files
 * @returns {Promise<number>} number of sha256 fields written
 */
async function writeManifestSha(manifest, shaMap, files) {
  let written = 0
  for (const model of Object.values(manifest.models || {})) {
    const filename = model.url.split('/').pop()
    if (shaMap[filename]) {
      model.sha256 = shaMap[filename]
      written++
    }
    if (model.dictUrl) {
      const dictFile = model.dictUrl.split('/').pop()
      if (shaMap[dictFile]) {
        model.dictSha256 = shaMap[dictFile]
        written++
      }
    }
  }
  await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`)
  return written
}

/**
 * Fallback path: download the release zip and extract model files.
 * @param {string} tag
 * @param {Array<{name: string, filename: string, sha256: string|null, isDict?: boolean}>} filesToExtract
 * @param {number} skipped
 * @returns {Promise<{success: number, failed: number}>}
 */
async function downloadViaZip(tag, filesToExtract, skipped) {
  const tmpSuffix = Date.now().toString(36)
  const zipPath = resolve(tmpdir(), `${ZIP_NAME.replace('.zip', '')}-${tmpSuffix}.zip`)
  const zipUrl = `${RELEASE_BASE}/${tag}/${ZIP_NAME}`

  let zipDownloaded = false
  let success = 0
  let failed = 0
  try {
    console.log('Downloading release zip...')
    const zipSize = await downloadFile(zipUrl, zipPath)
    console.log(`  ✓ Downloaded: ${formatBytes(zipSize)}\n`)
    zipDownloaded = true

    console.log('Extracting model files...')
    const zipPaths = filesToExtract.map(f => `models/${f.filename}`)
    const quote = s => `"${s}"`
    const unzipCmd = `unzip -j -o ${quote(zipPath)} ${zipPaths.map(quote).join(' ')} -d ${quote(MODELS_DIR)}`

    try {
      const output = execSync(unzipCmd, { encoding: 'utf-8', stdio: 'pipe' })
      const lines = output.split('\n').filter(l => l.trim() && !l.startsWith('Archive:') && !l.startsWith('  inflating:'))
      if (lines.length > 0) {
        console.log(lines.join('\n'))
      }
    } catch (err) {
      if (err.stdout) {
        const lines = err.stdout.split('\n').filter(l => l.trim() && !l.startsWith('Archive:') && !l.startsWith('  inflating:'))
        if (lines.length > 0) {
          console.log(lines.join('\n'))
        }
      }
      if (err.stderr) {
        console.error(`  ⚠ unzip: ${err.stderr.trim()}`)
      }
    }

    for (const entry of filesToExtract) {
      const destPath = resolve(MODELS_DIR, entry.filename)

      if (!existsSync(destPath)) {
        console.error(`  ✗ ${entry.filename} — not found in zip`)
        failed++
        continue
      }

      const fileData = await readFile(destPath)
      const size = formatBytes(fileData.length)

      if (entry.sha256) {
        const valid = await verifyIntegrity(fileData, entry.sha256)
        if (!valid) {
          console.error(`  ✗ ${entry.filename} — SHA-256 mismatch`)
          failed++
          continue
        }
      }

      console.log(`  ✓ ${entry.filename} (${size})`)
      success++
    }
  } finally {
    if (zipDownloaded) {
      try { await unlink(zipPath) } catch { /* best-effort */ }
    }
  }

  console.log('\n─'.repeat(50))
  console.log('Summary:')
  console.log(`  Downloaded (extracted): ${success}`)
  console.log(`  Skipped:    ${skipped}`)
  console.log(`  Failed:     ${failed}`)
  return { success, failed }
}

async function main() {
  console.log('📦 ONNX Model Downloader')
  console.log('─'.repeat(50))
  console.log(`Repo: ${DEFAULT_REPO}`)
  console.log(`Target: ${MODELS_DIR}`)
  console.log('─'.repeat(50))

  // Read manifest
  const manifest = await readManifest()
  const models = manifest.models || {}
  const entries = Object.entries(models)
  console.log(`Models in manifest: ${entries.length}\n`)

  if (entries.length === 0) {
    console.log('No models to download.')
    return
  }

  // Resolve release tag (env > CLI > latest models-* prerelease)
  let tag = process.env.VUE_APP_MODEL_RELEASE_TAG || parseCliTag()
  if (tag) {
    console.log(`Tag: ${tag}`)
  } else {
    console.log('Discovering latest models-* prerelease...')
    tag = await getLatestModelTag()
    console.log(`Latest tag: ${tag}`)
  }
  console.log('')

  // Ensure target directory exists
  await mkdir(MODELS_DIR, { recursive: true })

  // Collect all files (model .onnx + dict files)
  const filesToFetch = []
  for (const [name, model] of entries) {
    const filename = model.url.split('/').pop()
    filesToFetch.push({ name, filename, sha256: model.sha256 || null })
    if (model.dictUrl) {
      filesToFetch.push({ name, filename: model.dictUrl.split('/').pop(), sha256: null, isDict: true })
    }
  }

  // Download models.sha256 (best-effort — missing sha256 must not block download)
  let shaMap = {}
  try {
    shaMap = await downloadSha256(tag)
  } catch (err) {
    console.log(`  ⚠ models.sha256 unavailable (${err.message}) — sha256 verification/write skipped\n`)
  }

  // Check existing files: skip when present and sha256 matches (manifest or shaMap)
  let skipped = 0
  const pending = []
  for (const entry of filesToFetch) {
    const destPath = resolve(MODELS_DIR, entry.filename)
    const expected = entry.sha256 || shaMap[entry.filename] || null

    if (existsSync(destPath) && expected) {
      const existingData = await readFile(destPath)
      if (await verifyIntegrity(existingData, expected)) {
        console.log(`[✓] ${entry.name}: ${entry.filename} — up-to-date (${formatBytes(existingData.length)})`)
        skipped++
        continue
      }
    }
    pending.push(entry)
  }

  if (pending.length === 0) {
    console.log('\nAll models already up-to-date. Nothing to download.')
    if (Object.keys(shaMap).length > 0) {
      const written = await writeManifestSha(manifest, shaMap, filesToFetch)
      console.log(`  ✓ Wrote ${written} sha256 fields into models.json`)
    }
    console.log('─'.repeat(50))
    console.log('Summary:')
    console.log('  Downloaded: 0')
    console.log(`  Skipped:    ${skipped}`)
    console.log('  Failed:     0')
    return
  }

  let success = 0
  let failed = 0

  if (hasCliFlag('--zip')) {
    const result = await downloadViaZip(tag, pending, skipped)
    success = result.success
    failed = result.failed
  } else {
    // Main path: direct download each asset
    for (const entry of pending) {
      const destPath = resolve(MODELS_DIR, entry.filename)
      const url = `${RELEASE_BASE}/${tag}/${entry.filename}`
      try {
        console.log(`Downloading ${entry.filename}...`)
        const size = await downloadFile(url, destPath)
        let ok = true

        const expected = entry.sha256 || shaMap[entry.filename] || null
        if (expected) {
          const fileData = await readFile(destPath)
          if (!(await verifyIntegrity(fileData, expected))) {
            console.error(`  ✗ ${entry.filename} — SHA-256 mismatch`)
            failed++
            ok = false
          }
        }

        if (ok) {
          console.log(`  ✓ ${entry.filename} (${formatBytes(size)})`)
          success++
        }
      } catch (err) {
        console.error(`  ✗ ${entry.filename} — ${err.message}`)
        failed++
      }
    }
  }

  // Write sha256 values back into the manifest (best-effort)
  if (Object.keys(shaMap).length > 0) {
    try {
      const written = await writeManifestSha(manifest, shaMap, filesToFetch)
      console.log(`\n  ✓ Wrote ${written} sha256 fields into models.json`)
    } catch (err) {
      console.log(`  ⚠ Could not write sha256 into manifest: ${err.message}`)
    }
  }

  // Summary
  console.log('\n─'.repeat(50))
  console.log('Summary:')
  console.log(`  Downloaded: ${success}`)
  console.log(`  Skipped:    ${skipped}`)
  console.log(`  Failed:     ${failed}`)

  if (failed > 0) {
    process.exit(1)
  }
}

main().catch(err => {
  console.error('Download failed:', err.message)
  process.exit(1)
})
