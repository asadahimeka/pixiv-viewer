/**
 * ONNX Model Downloader
 *
 * Downloads ONNX model files from the DonutShinobu/ShinobuTranslator
 * GitHub Releases into public/models/.
 *
 * Usage:
 *   node scripts/download-models.mjs
 *   VUE_APP_MODEL_RELEASE_TAG=v0.1.0 node scripts/download-models.mjs
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DEFAULT_REPO, formatBytes, sha256File } from './model-release-assets.mjs'

const MODELS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'models')
const MANIFEST_PATH = resolve(MODELS_DIR, 'models.json')

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
 * Download a single model file from GitHub Releases.
 * @param {string} filename - Name of the file to download
 * @param {string} tag - Git tag of the release
 * @returns {Promise<{data: Buffer, size: number}>}
 */
async function downloadModel(filename, tag) {
  const url = `https://github.com/${DEFAULT_REPO}/releases/download/${tag}/${filename}`
  console.log(`  URL: ${url}`)

  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Download failed: ${res.status} ${res.statusText}`)
  }

  const buffer = Buffer.from(await res.arrayBuffer())
  return { data: buffer, size: buffer.length }
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

  // Resolve release tag
  let tag = process.env.VUE_APP_MODEL_RELEASE_TAG
  if (tag) {
    console.log(`Tag from env: ${tag}`)
  } else {
    console.log('Fetching latest release tag...')
    tag = await getLatestReleaseTag()
    console.log(`Latest tag: ${tag}`)
  }
  console.log('')

  // Ensure target directory exists
  await mkdir(MODELS_DIR, { recursive: true })

  // Track results
  const results = { success: 0, skipped: 0, failed: 0 }

  // Download each model
  for (const [name, model] of entries) {
    const filename = model.url.split('/').pop()
    const destPath = resolve(MODELS_DIR, filename)
    const sha256 = model.sha256 || null

    console.log(`[${results.success + results.skipped + results.failed + 1}/${entries.length}] ${name}`)

    // Skip if file exists and SHA-256 matches
    if (existsSync(destPath) && sha256) {
      const existingData = await readFile(destPath)
      const match = await verifyIntegrity(existingData, sha256)
      if (match) {
        const size = formatBytes(existingData.length)
        console.log(`  ✓ Already up-to-date (${size})\n`)
        results.skipped++
        continue
      }
    }

    try {
      const { data, size } = await downloadModel(filename, tag)

      // Verify SHA-256 if manifest provides it
      if (sha256) {
        const valid = await verifyIntegrity(data, sha256)
        if (!valid) {
          throw new Error('SHA-256 mismatch — file may be corrupted')
        }
      }

      await writeFile(destPath, data)
      console.log(`  ✓ Downloaded (${formatBytes(size)})`)
      results.success++
    } catch (err) {
      console.error(`  ✗ Failed: ${err.message}`)
      results.failed++
    }

    console.log('')
  }

  // Summary
  console.log('─'.repeat(50))
  console.log('Summary:')
  console.log(`  Downloaded: ${results.success}`)
  console.log(`  Skipped:    ${results.skipped}`)
  console.log(`  Failed:     ${results.failed}`)

  if (results.failed > 0) {
    process.exit(1)
  }
}

main().catch(err => {
  console.error('Download failed:', err.message)
  process.exit(1)
})
