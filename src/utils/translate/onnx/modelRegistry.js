/**
 * Model registry — loads model manifest and resolves model URLs.
 * Supports local manifest (./models/models.json) for dev server
 * and GitHub Releases CDN when VUE_APP_MODEL_RELEASE_TAG is set.
 * Reads VUE_APP_MODEL_MANIFEST_URL env var for custom manifest location.
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
  // Default to local manifest for dev server
  return './models/models.json'
}

/**
 * Resolve model URL based on environment.
 * When VUE_APP_MODEL_RELEASE_TAG is set, returns CDN URL from GitHub Releases.
 * Otherwise returns the local path relative to the public directory.
 * @param {string} path - Model URL from manifest (e.g., "detector.onnx")
 * @returns {string}
 */
function resolveModelUrl(path) {
  const releaseTag = typeof process !== 'undefined' && process.env && process.env.VUE_APP_MODEL_RELEASE_TAG
  if (releaseTag) {
    const filename = path.split('/').pop()
    return `https://github.com/DonutShinobu/ShinobuTranslator/releases/download/${releaseTag}/${filename}`
  }
  // In dev mode, models are served from public/models/ via dev server
  return `./models/${path.replace(/^\//, '')}`
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
  console.log(`[modelRegistry] Loading model manifest from: ${url}`)

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
  return resolveModelUrl(model.url)
}

/**
 * Verify SHA-256 integrity of downloaded model data.
 * Skips verification if no expected hash is provided.
 * @param {ArrayBuffer} data - Downloaded model data
 * @param {string} [expectedHash] - Expected SHA-256 hex string
 * @returns {Promise<boolean>}
 */
export async function verifyModelIntegrity(data, expectedHash) {
  if (!expectedHash) return true
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex === expectedHash.toLowerCase()
}

/**
 * Download a model and verify its integrity.
 * Throws on hash mismatch with a Chinese error message for end users.
 * @param {string} name - Model name from manifest
 * @returns {Promise<ArrayBuffer>} Verified model data
 */
export async function downloadModel(name) {
  const [modelUrl, modelConfig] = await Promise.all([
    getModelUrl(name),
    getModel(name),
  ])

  const res = await fetch(modelUrl)
  if (!res.ok) {
    throw new Error(`Failed to fetch model "${name}": ${res.status} ${res.statusText}`)
  }

  const data = await res.arrayBuffer()

  const valid = await verifyModelIntegrity(data, modelConfig.sha256)
  if (!valid) {
    throw new Error('模型文件损坏，请重新加载')
  }

  return data
}
