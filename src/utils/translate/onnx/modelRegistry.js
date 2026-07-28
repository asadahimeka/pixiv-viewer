/**
 * Model registry — loads model manifest from CDN and resolves model URLs.
 * Reads VUE_APP_MODEL_MANIFEST_URL env var for manifest location.
 */

let manifestCache = null
let manifestPromise = null

/**
 * Resolve manifest URL from env vars or fall back to upstream default.
 * @returns {string}
 */
function getDefaultManifestUrl() {
  if (typeof process !== 'undefined' && process.env && process.env.VUE_APP_MODEL_MANIFEST_URL) {
    return process.env.VUE_APP_MODEL_MANIFEST_URL
  }
  return 'https://cdn.jsdelivr.net/gh/zyddnys/manga-image-translator@main/models/models.json'
}

/**
 * Resolve model base URL from env var mirror or fall back to upstream default.
 * @returns {string}
 */
function getDefaultBaseUrl() {
  if (typeof process !== 'undefined' && process.env && process.env.VUE_APP_MODEL_MIRROR) {
    return process.env.VUE_APP_MODEL_MIRROR
  }
  return 'https://huggingface.co/zyddnys/manga-image-translator/resolve/main/models/'
}

/**
 * Load model manifest from CDN.
 * @param {string} [manifestUrl]
 * @returns {Promise<object>}
 */
export async function loadManifest(manifestUrl) {
  if (manifestCache) return manifestCache
  if (manifestPromise) return manifestPromise

  const url = manifestUrl || getDefaultManifestUrl()

  manifestPromise = (async () => {
    const res = await fetch(url)
    if (!res.ok) {
      throw new Error(`Failed to load model manifest: ${res.status} ${res.statusText}`)
    }
    const manifest = await res.json()
    validateManifest(manifest)
    manifestCache = manifest
    manifestPromise = null
    return manifest
  })()

  return manifestPromise
}

/**
 * Validate manifest structure.
 * @param {object} manifest
 */
function validateManifest(manifest) {
  if (!manifest || typeof manifest !== 'object') {
    throw new Error('Invalid model manifest: must be a JSON object')
  }
  if (!manifest.models || typeof manifest.models !== 'object') {
    throw new Error('Invalid model manifest: missing "models" object')
  }
  const names = manifest.modelOrder || Object.keys(manifest.models)
  for (const name of names) {
    const model = manifest.models[name]
    if (!model) throw new Error(`Model "${name}" not found in manifest.models`)
    if (!model.name) model.name = name
    if (!model.url) throw new Error(`Model "${name}" missing "url" field`)
    if (!model.task) throw new Error(`Model "${name}" missing "task" field`)
  }
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
  const baseUrl = manifest.baseUrl || getDefaultBaseUrl()
  return baseUrl + model.url
}
