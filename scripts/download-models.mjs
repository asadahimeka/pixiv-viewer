/**
 * ONNX Model Downloader
 *
 * Downloads ShinobuTranslator.zip from the DonutShinobu/ShinobuTranslator
 * GitHub Releases, then extracts model files into public/models/.
 *
 * Shinobu does not publish individual .onnx assets — only a single zip
 * containing the full dist/ bundle (models/ directory included). This
 * script downloads that zip and extracts only the model files we need.
 *
 * Usage:
 *   node scripts/download-models.mjs
 *   VUE_APP_MODEL_RELEASE_TAG=v0.8.1 node scripts/download-models.mjs
 *   node scripts/download-models.mjs --tag v0.8.1
 */

import { readFile, mkdir, unlink } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { DEFAULT_REPO, formatBytes, sha256File } from './model-release-assets.mjs'

const MODELS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'models')
const MANIFEST_PATH = resolve(MODELS_DIR, 'models.json')
const ZIP_NAME = 'ShinobuTranslator.zip'

/**
 * Fetch the latest release tag from GitHub.
 * @returns {Promise<string>}
 */
async function getLatestReleaseTag() {
  const res = await fetch(`https://api.github.com/repos/${DEFAULT_REPO}/releases/latest`)
  if (!res.ok) {
    throw new Error(`Failed to fetch latest release: ${res.status} ${res.statusText}`)
  }
  const data = await res.json()
  return data.tag_name
}

/**
 * Download a URL to a local file.
 * @param {string} url
 * @param {string} destPath
 * @returns {Promise<number>} bytes written
 */
async function downloadFile(url, destPath) {
  console.log(`  URL: ${url}`)
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Download failed: ${res.status} ${res.statusText}`)
  }
  const contentLength = res.headers.get('content-length')
  if (contentLength) {
    console.log(`  Size: ${formatBytes(Number(contentLength))}`)
  }
  const buffer = Buffer.from(await res.arrayBuffer())
  await writeFileTmp(destPath, buffer)
  return buffer.length
}

/**
 * Like writeFile but uses the node:fs/promises version.
 * @param {string} path
 * @param {Buffer} data
 * @returns {Promise<void>}
 */
async function writeFileTmp(path, data) {
  const { writeFile } = await import('node:fs/promises')
  await writeFile(path, data)
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

  // Resolve release tag (env > CLI > latest)
  let tag = process.env.VUE_APP_MODEL_RELEASE_TAG || parseCliTag()
  if (tag) {
    console.log(`Tag: ${tag}`)
  } else {
    console.log('Fetching latest release tag...')
    tag = await getLatestReleaseTag()
    console.log(`Latest tag: ${tag}`)
  }
  console.log('')

  // Ensure target directory exists
  await mkdir(MODELS_DIR, { recursive: true })

  // Collect all files we need from the zip (model .onnx + dict files)
  // Zip internal paths are "models/<filename>"
  const filesToExtract = []
  for (const [name, model] of entries) {
    filesToExtract.push({ name, filename: model.url, sha256: model.sha256 || null })
    if (model.dictUrl) {
      filesToExtract.push({ name, filename: model.dictUrl, sha256: null, isDict: true })
    }
  }

  // Check if all files already exist and pass integrity check
  let allUpToDate = true
  let skipped = 0
  for (const entry of filesToExtract) {
    const destPath = resolve(MODELS_DIR, entry.filename)

    if (existsSync(destPath) && entry.sha256) {
      const existingData = await readFile(destPath)
      const match = await verifyIntegrity(existingData, entry.sha256)
      if (match) {
        const size = formatBytes(existingData.length)
        console.log(`[✓] ${entry.name}: ${entry.filename} — up-to-date (${size})`)
        skipped++
        continue
      }
    }
    allUpToDate = false
  }

  if (allUpToDate) {
    console.log('\nAll models already up-to-date. Nothing to download.')
    console.log('─'.repeat(50))
    console.log('Summary:')
    console.log('  Downloaded: 0')
    console.log(`  Skipped:    ${skipped}`)
    console.log('  Failed:     0')
    return
  }

  // Download the release zip
  const tmpSuffix = Date.now().toString(36)
  const zipPath = resolve(tmpdir(), `${ZIP_NAME.replace('.zip', '')}-${tmpSuffix}.zip`)
  const zipUrl = `https://github.com/${DEFAULT_REPO}/releases/download/${tag}/${ZIP_NAME}`

  let zipDownloaded = false
  try {
    console.log('Downloading release zip...')
    const zipSize = await downloadFile(zipUrl, zipPath)
    console.log(`  ✓ Downloaded: ${formatBytes(zipSize)}\n`)
    zipDownloaded = true

    // Extract model files from the zip in a single unzip pass
    console.log('Extracting model files...')
    const zipPaths = filesToExtract.map(f => `models/${f.filename}`)
    const quote = s => `"${s}"`
    const unzipCmd = `unzip -j -o ${quote(zipPath)} ${zipPaths.map(quote).join(' ')} -d ${quote(MODELS_DIR)}`

    try {
      const output = execSync(unzipCmd, { encoding: 'utf-8', stdio: 'pipe' })
      // Print extraction output (except the standard "Archive:" and "inflating:" noise)
      const lines = output.split('\n').filter(l => l.trim() && !l.startsWith('Archive:') && !l.startsWith('  inflating:'))
      if (lines.length > 0) {
        console.log(lines.join('\n'))
      }
    } catch (err) {
      // unzip returns non-zero when some files are missing from the archive
      // but still successfully extracts what it finds — log and continue
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

    // Verify each extracted file
    let success = 0
    let failed = 0

    for (const entry of filesToExtract) {
      const destPath = resolve(MODELS_DIR, entry.filename)

      if (!existsSync(destPath)) {
        console.error(`  ✗ ${entry.filename} — not found in zip`)
        failed++
        continue
      }

      const fileData = await readFile(destPath)
      const size = formatBytes(fileData.length)

      // Verify SHA-256 if manifest provides it
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

    // Summary
    console.log('\n─'.repeat(50))
    console.log('Summary:')
    console.log(`  Downloaded (extracted): ${success}`)
    console.log(`  Skipped:    ${skipped}`)
    console.log(`  Failed:     ${failed}`)

    if (failed > 0) {
      process.exit(1)
    }
  } finally {
    // Clean up temp zip
    if (zipDownloaded) {
      try { await unlink(zipPath) } catch { /* best-effort */ }
    }
  }
}

main().catch(err => {
  console.error('Download failed:', err.message)
  process.exit(1)
})
