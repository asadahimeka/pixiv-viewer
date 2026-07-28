/**
 * Model registry — loads model manifest from CDN and resolves model URLs.
 */

let manifestCache = null

const DEFAULT_MANIFEST_URL = 'https://cdn.example.com/models/models.json' // TODO: Update to real CDN

/**
 * Load model manifest from CDN.
 * @param {string} [manifestUrl]
 * @returns {Promise<object>}
 */
export async function loadManifest(manifestUrl = DEFAULT_MANIFEST_URL) {
  if (manifestCache) return manifestCache

  const res = await fetch(manifestUrl)
  if (!res.ok) {
    throw new Error(`Failed to load model manifest: ${res.status} ${res.statusText}`)
  }

  const manifest = await res.json()
  manifestCache = manifest
  return manifest
}

/**
 * Get model config by name.
 * @param {string} name
 * @returns {Promise<object>}
 */
export async function getModel(name) {
  const manifest = await loadManifest()
  const model = manifest.models[name]
  if (!model) throw new Error(`Model "${name}" not found in manifest`)
  return model
}

/**
 * Get full download URL for a model.
 * @param {string} name
 * @returns {Promise<string>}
 */
export async function getModelUrl(name) {
  const manifest = await loadManifest()
  const model = manifest.models[name]
  if (!model) throw new Error(`Model "${name}" not found in manifest`)
  return manifest.baseUrl + model.url
}
