// Shared constants for model release asset management
export const DEFAULT_REPO = 'DonutShinobu/ShinobuTranslator'

/**
 * Collect model assets from the manifest.
 * @param {object} manifest - Parsed models.json
 * @returns {Array<{name: string, filename: string, url: string}>}
 */
export function collectModelAssets(manifest) {
  const assets = []
  for (const [name, model] of Object.entries(manifest.models)) {
    assets.push({
      name,
      filename: model.url.split('/').pop(),
      url: model.url,
    })
  }
  return assets
}

/**
 * Compute SHA-256 hash of file data.
 * @param {Buffer|Uint8Array} data
 * @returns {Promise<string>}
 */
export async function sha256File(data) {
  const { createHash } = await import('node:crypto')
  return createHash('sha256').update(data).digest('hex')
}

/**
 * Format bytes to human-readable string.
 * @param {number} bytes
 * @returns {string}
 */
export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
