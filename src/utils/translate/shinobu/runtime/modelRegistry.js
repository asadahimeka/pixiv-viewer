/**
 * @file Model registry — loads model manifest and resolves model URLs.
 *
 * Mechanically converted from ShinobuTranslator `src/runtime/modelRegistry.ts`
 * (TS → JS). Types → JSDoc @typedef + placeholder exports; functions preserved.
 *
 * CDN dual-mode: When VUE_APP_MODEL_RELEASE_TAG is set, model URLs resolve to
 * GitHub Releases CDN. Otherwise, models are loaded from ./models/ (local dev
 * server — public/models/ directory).
 *
 * Session management (getModelSession / disposeModelSession /
 * disposeAllModelSessions) are skeleton implementations — the actual comlink
 * worker call (createSession from onnxBridge.js) will be connected in T6.
 *
 * Dependencies (all in ./runtime/):
 *   onnxTypes.js       — RuntimeProvider type (T3)
 *   onnxSessionOptions.js — OnnxSessionOptions type + serializeOnnxSessionOptions (T3)
 *   onnxWorkerTypes.js — WorkerSessionHandle type (T2)
 */

// ---------------------------------------------------------------------------
// Doc-only type imports — referenced in JSDoc, zero runtime impact
// ---------------------------------------------------------------------------

/** @typedef {import('./onnxTypes.js').RuntimeProvider} RuntimeProvider */
/** @typedef {import('./onnxSessionOptions.js').OnnxSessionOptions} OnnxSessionOptions */
/** @typedef {import('./onnxWorkerTypes.js').WorkerSessionHandle} WorkerSessionHandle */

// ---------------------------------------------------------------------------
// Types — JSDoc @typedef + placeholder exports (T2/T3 convention)
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} ManifestModel
 * @property {string} name - Model name key
 * @property {string} task - Model task: 'detection' | 'inpainting' | 'ocr'
 * @property {string} url - Model file URL (resolved via resolveModelUrl at runtime)
 * @property {string|Array<number>} input - Input shape or descriptor
 * @property {Array<RuntimeProvider>} [runtime] - Supported runtime providers
 * @property {string} [dictUrl] - Dictionary URL (OCR models)
 * @property {'zero_to_one'|'minus_one_to_one'} [normalize]
 * @property {'rgb'|'bgr'} [channelOrder]
 * @property {'zero_to_one'|'minus_one_to_one'|'zero_to_255'} [outputNormalize]
 * @property {'zero_before_normalize'|'zero_after_normalize'} [maskFill]
 * @property {string} [maskInputName]
 */
export const ManifestModel = {}

/**
 * @typedef {Object} ManifestData
 * @property {string} [source] - Manifest source identifier
 * @property {string} [note] - Human-readable note
 * @property {Object.<string, ManifestModel>} models - Models keyed by name
 * @property {Array<string>} [modelOrder] - Preferred iteration order
 */
export const ManifestData = {}

/** @typedef {'detector'|'inpaint'|'bubble'|'paddleocr_v6_medium_rec'} ModelName */
export const ModelName = {}

// ---------------------------------------------------------------------------
// Manifest cache & URL resolution (CDN dual-mode)
// ---------------------------------------------------------------------------

/** @type {ManifestData|null} */
let manifestCache = null

let manifestPromise = null

/**
 * Resolve the default manifest URL.
 * Respects VUE_APP_MODEL_MANIFEST_URL if set; otherwise defaults to
 * ./models/models.json for local dev.
 * @returns {string}
 */
export function getDefaultManifestUrl() {
  if (typeof process !== 'undefined' && process.env && process.env.VUE_APP_MODEL_MANIFEST_URL) {
    return process.env.VUE_APP_MODEL_MANIFEST_URL
  }
  return './models/models.json'
}

/**
 * Resolve a model asset URL — CDN dual-mode.
 *
 * When VUE_APP_MODEL_RELEASE_TAG is set (e.g., 'models-v1.0.0'), model files
 * are served from GitHub Releases CDN:
 *   https://github.com/DonutShinobu/ShinobuTranslator/releases/download/{tag}/{filename}
 *
 * Otherwise, models are served from the local dev server's public/models/
 * directory:
 *   ./models/{path}
 *
 * @param {string} path - Model file path from manifest (e.g., 'detector.onnx')
 * @returns {string} Resolved model URL
 */
export function resolveModelUrl(path) {
  const releaseTag = typeof process !== 'undefined' && process.env && process.env.VUE_APP_MODEL_RELEASE_TAG
  if (releaseTag) {
    const filename = path.split('/').pop()
    return `https://github.com/DonutShinobu/ShinobuTranslator/releases/download/${releaseTag}/${filename}`
  }
  return `./models/${path.replace(/^\//, '')}`
}

// ---------------------------------------------------------------------------
// Manifest loading
// ---------------------------------------------------------------------------

/**
 * Validate manifest structure.
 * @param {object} manifest
 * @throws {Error} if manifest is structurally invalid
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
    if (!model) {
      throw new Error(`Model "${name}" not found in manifest.models`)
    }
    if (!model.name) model.name = name
    if (!model.url) {
      throw new Error(`Model "${name}" missing "url" field`)
    }
    if (!model.task) {
      throw new Error(`Model "${name}" missing "task" field`)
    }
  }
}

/**
 * Load and cache the model manifest JSON.
 * @param {string} [manifestUrl] - Custom manifest URL (falls back to getDefaultManifestUrl())
 * @returns {Promise<ManifestData>}
 */
export async function loadManifest(manifestUrl) {
  if (manifestCache) return manifestCache
  if (manifestPromise) return manifestPromise

  const url = manifestUrl || getDefaultManifestUrl()
  console.log(`[shinobu/modelRegistry] Loading model manifest from: ${url}`)

  manifestPromise = (async () => {
    const res = await fetch(url)
    if (!res.ok) {
      throw new Error(`Failed to load model manifest: ${res.status} ${res.statusText}`)
    }
    const data = await res.json()
    validateManifest(data)
    manifestCache = data
    manifestPromise = null
    return data
  })()

  return manifestPromise
}

// ---------------------------------------------------------------------------
// Runtime provider normalization (browser-only)
// ---------------------------------------------------------------------------

/**
 * Normalize runtime providers for the browser environment.
 * Filters to only browser-supported providers (webnn, webgpu, wasm).
 * Falls back to ['wasm'] if no valid providers remain.
 * @param {unknown} value - Runtime providers from manifest
 * @returns {Array<RuntimeProvider>}
 */
function normalizeRuntime(value) {
  if (!Array.isArray(value)) return ['wasm']
  const out = []
  for (const item of value) {
    if (item === 'webnn' || item === 'webgpu' || item === 'wasm') {
      if (!out.includes(item)) out.push(item)
    }
  }
  return out.length > 0 ? out : ['wasm']
}

// ---------------------------------------------------------------------------
// Model access
// ---------------------------------------------------------------------------

/**
 * Get resolved model configuration by name.
 *
 * Loads the manifest, resolves model URL (CDN dual-mode), resolves dictionary
 * URL (if present), and normalizes runtime providers for the browser.
 *
 * @param {ModelName} name - Model name (detector|inpaint|bubble|paddleocr_v6_medium_rec)
 * @returns {Promise<ManifestModel>} Resolved model config with CDN-aware URLs
 */
export async function getModel(name) {
  const manifest = await loadManifest()
  const model = manifest.models[name]
  if (!model) {
    throw new Error(`Model "${name}" not found in manifest`)
  }
  return {
    ...model,
    url: resolveModelUrl(model.url),
    dictUrl: model.dictUrl ? resolveModelUrl(model.dictUrl) : undefined,
    runtime: normalizeRuntime(model.runtime),
  }
}

/**
 * Get the resolved download URL for a model.
 * @param {ModelName} name
 * @returns {Promise<string>}
 */
export async function getModelUrl(name) {
  const model = await getModel(name)
  return model.url
}

// ---------------------------------------------------------------------------
// Session cache (dedup, reuse)
// ---------------------------------------------------------------------------

/** @type {Map<string, WorkerSessionHandle>} — Resolved session handles */
const sessionCache = new Map()

/** @type {Map<string, Promise<WorkerSessionHandle>>} — In-flight creation promises */
const sessionPromiseCache = new Map()

// ---------------------------------------------------------------------------
// Session management (skeleton — T6 comlink worker bridge)
// ---------------------------------------------------------------------------

/**
 * Get or create an ONNX inference session for a model.
 *
 * SKELETON — the actual `createSession` call (comlink worker bridge from
 * `onnxBridge.js`) will be connected in T6. This function implements the full
 * cache-dedup and model-resolution pipeline; only the creation call is stubbed.
 *
 * Current behavior:
 *   1. Resolves model config + URL via getModel()
 *   2. Normalizes runtime providers
 *   3. Computes a cache key from (name, runtime, sessionOptions)
 *   4. Returns cached session if available
 *   5. Deduplicates concurrent calls to the same cache key
 *   6. TODO(T6): calls createSession(name, model.url, runtime, sessionOptions)
 *
 * @param {ModelName} name - Model name key
 * @param {Array<RuntimeProvider>} [preferred] - Preferred runtime providers
 *   (default: model.runtime from manifest, falling back to ['wasm'])
 * @param {OnnxSessionOptions} [sessionOptions] - ONNX session creation options
 * @returns {Promise<WorkerSessionHandle>}
 */
export async function getModelSession(name, preferred, sessionOptions) {
  // Resolve model config and runtime
  const model = await getModel(name)
  const runtime = preferred && preferred.length > 0 ? preferred : model.runtime
  const sessionOptionsKey = sessionOptions ? JSON.stringify(sessionOptions) : 'default'
  const cacheKey = `${name}:${runtime.join(',')}:${sessionOptionsKey}`

  // Check resolved cache
  const cached = sessionCache.get(cacheKey)
  if (cached) return cached

  // Dedup in-flight creation
  const pending = sessionPromiseCache.get(cacheKey)
  if (pending) return pending

  // ---------------------------------------------------------------------------
  // TODO(T6): Replace the throw below with comlink ONNX worker session creation.
  //
  // Import from onnxBridge.js (T6):
  //   import { createSession } from './onnxBridge.js'
  //
  // Insertion point — replace this throw block with:
  //
  //   const creation = createSession(name, model.url, runtime, sessionOptions)
  //     .then(handle => {
  //       sessionCache.set(cacheKey, handle)
  //       return handle
  //     })
  //     .finally(() => {
  //       sessionPromiseCache.delete(cacheKey)
  //     })
  //   sessionPromiseCache.set(cacheKey, creation)
  //   return creation
  //
  // The disposed-session and provider-fallback logic from the Shinobu source
  // can also be added here (recordPerfRuntimeEvent from ../shared/perfTrace).
  // ---------------------------------------------------------------------------

  throw new Error(
    `[shinobu/modelRegistry] getModelSession("${name}") — comlink worker not yet wired. ` +
    `Model URL: ${model.url}. Runtime: ${runtime.join(',')}. ` +
    'This will be connected in T6 (onnxBridge.js).'
  )
}

/**
 * Dispose cached sessions for a model.
 *
 * SKELETON — clears local session cache. The actual `disposeSession` call via
 * the comlink worker will be connected in T6.
 *
 * @param {ModelName} name
 * @returns {Promise<void>}
 */
export async function disposeModelSession(name) {
  for (const key of [...sessionCache.keys()]) {
    if (key.startsWith(`${name}:`)) {
      sessionCache.delete(key)
    }
  }
  // TODO(T6): await disposeSession(name) via onnxBridge.js
  console.log(
    `[shinobu/modelRegistry] disposeModelSession("${name}") — local cache cleared; ` +
    'worker disposal pending T6'
  )
}

/**
 * Dispose all cached sessions and clear manifest cache.
 *
 * SKELETON — clears all local caches. The actual `disposeAll` call via the
 * comlink worker will be connected in T6.
 *
 * @returns {Promise<void>}
 */
export async function disposeAllModelSessions() {
  sessionCache.clear()
  sessionPromiseCache.clear()
  manifestCache = null
  manifestPromise = null
  // TODO(T6): await disposeAll() via onnxBridge.js
  console.log(
    '[shinobu/modelRegistry] disposeAllModelSessions — all local caches cleared; ' +
    'worker disposal pending T6'
  )
}
