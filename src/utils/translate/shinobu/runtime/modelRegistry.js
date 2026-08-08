/**
 * @file Model registry — loads model manifest and resolves model URLs.
 *
 * Mechanically converted from ShinobuTranslator `src/runtime/modelRegistry.ts`
 * (TS → JS). Types → JSDoc @typedef + placeholder exports; functions preserved.
 *
 * CDN triple-mode: VUE_APP_MODEL_URL_TEMPLATE (custom URL template with a
 * {filename} placeholder) takes priority, then VUE_APP_MODEL_RELEASE_TAG
 * (GitHub Releases CDN), then ./models/ (local dev server — public/models/
 * directory).
 *
 * Session management (getModelSession / disposeModelSession /
 * disposeAllModelSessions) delegate to onnxBridge.js (T7 comlink worker
 * bridge): session creation with main-thread cache dedup, and dispose
 * forwarding to the worker.
 *
 * Cache key alignment: the main-thread key uses serializeOnnxSessionOptions
 * (from onnxSessionOptions.js) — this MUST match the worker-side sessionId
 * key construction in workers/onnx-worker.js, otherwise session cache hits
 * never occur.
 *
 * Dependencies (all in ./runtime/):
 *   onnxTypes.js       — RuntimeProvider type (T3)
 *   onnxSessionOptions.js — OnnxSessionOptions type + serializeOnnxSessionOptions (T3)
 *   onnxWorkerTypes.js — WorkerSessionHandle type (T2)
 *   onnxBridge.js      — comlink worker bridge (T7)
 */

// ---------------------------------------------------------------------------
// Doc-only type imports — referenced in JSDoc, zero runtime impact
// ---------------------------------------------------------------------------

/** @typedef {import('./onnxTypes.js').RuntimeProvider} RuntimeProvider */
/** @typedef {import('./onnxSessionOptions.js').OnnxSessionOptions} OnnxSessionOptions */
/** @typedef {import('./onnxWorkerTypes.js').WorkerSessionHandle} WorkerSessionHandle */

// ---------------------------------------------------------------------------
// Runtime imports — onnxBridge (T7 comlink worker bridge) + session option key
// serializer. Both are real imports (not doc-only).
// ---------------------------------------------------------------------------

import { serializeOnnxSessionOptions } from './onnxSessionOptions.js'
import { createSession, disposeSession, disposeAll } from './onnxBridge.js'

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
  if (process.env.VUE_APP_MODEL_MANIFEST_URL) {
    return process.env.VUE_APP_MODEL_MANIFEST_URL
  }
  return '/models/models.json'
}

/**
 * Resolve a model asset URL — CDN triple-mode.
 *
 * Priority (highest first):
 *   1. VUE_APP_MODEL_URL_TEMPLATE — custom CDN URL template; the `{filename}`
 *      placeholder is replaced with the model's basename (e.g.,
 *      'https://cdn.example.com/models/{filename}').
 *   2. VUE_APP_MODEL_RELEASE_TAG — GitHub Releases CDN (e.g., 'models-v1.0.0'):
 *        https://github.com/DonutShinobu/ShinobuTranslator/releases/download/{tag}/{filename}
 *   3. Local dev server's public/models/ directory:
 *        ./models/{path}
 *
 * @param {string} path - Model file path from manifest (e.g., 'detector.onnx')
 * @returns {string} Resolved model URL
 */
export function resolveModelUrl(path) {
  const filename = path.split('/').pop()
  const urlTemplate = process.env.VUE_APP_MODEL_URL_TEMPLATE
  if (urlTemplate) return urlTemplate.replace('{filename}', filename)
  const releaseTag = process.env.VUE_APP_MODEL_RELEASE_TAG
  if (releaseTag) {
    return `https://github.com/DonutShinobu/ShinobuTranslator/releases/download/${releaseTag}/${filename}`
  }
  return `/models/${path.replace(/^\//, '')}`
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
  // 归一化 input：管线消费者（paddleocrProvider/inpaint）读 model.input[0]/[1]，
  // 旧 manifest 可能存 "image" 字符串导致 NaN 崩溃
  const rawInput = model.input
  let resolved = model
  if (!Array.isArray(rawInput) || !rawInput.every(v => Number.isFinite(v))) {
    const defaults = {
      detection: [1024, 1024],
      inpainting: [512, 512],
      ocr: [48, 320],
    }
    resolved = { ...model, input: defaults[model.task] || [512, 512] }
  }
  return {
    ...resolved,
    url: resolveModelUrl(resolved.url),
    dictUrl: resolved.dictUrl ? resolveModelUrl(resolved.dictUrl) : undefined,
    runtime: normalizeRuntime(resolved.runtime),
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
// Session management — onnxBridge delegation with cache dedup
// ---------------------------------------------------------------------------

/**
 * Get or create an ONNX inference session for a model.
 *
 * Resolves model config + URL via getModel(), computes a cache key from
 * (name, runtime, serializeOnnxSessionOptions(sessionOptions)), returns a
 * cached session when available, deduplicates concurrent in-flight creations,
 * and otherwise delegates session creation to onnxBridge.createSession
 * (comlink worker bridge).
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
  // Key alignment: must match worker-side sessionId in workers/onnx-worker.js
  const sessionOptionsKey = serializeOnnxSessionOptions(sessionOptions)
  const dedupedRuntime = runtime.filter((item, idx) => runtime.indexOf(item) === idx)
  const cacheKey = `${name}:${dedupedRuntime.join(',')}:${sessionOptionsKey}`

  // Check resolved cache
  const cached = sessionCache.get(cacheKey)
  if (cached) return cached

  // Dedup in-flight creation
  const pending = sessionPromiseCache.get(cacheKey)
  if (pending) return pending

  // Create session via the comlink worker bridge; store on success
  const creation = createSession(name, model.url, runtime, sessionOptions)
    .then(handle => {
      sessionCache.set(cacheKey, handle)
      return handle
    })
    .finally(() => {
      sessionPromiseCache.delete(cacheKey)
    })
  sessionPromiseCache.set(cacheKey, creation)
  return creation
}

/**
 * Dispose cached sessions for a model, then forward to the worker.
 *
 * Clears matching local cache entries, then delegates the actual ONNX session
 * release to onnxBridge.disposeSession(name) — the worker disposes by exact
 * sessionId match plus `${name}:` prefix match.
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
  await disposeSession(name)
}

/**
 * Dispose all cached sessions, clear caches, and forward to the worker.
 *
 * @returns {Promise<void>}
 */
export async function disposeAllModelSessions() {
  sessionCache.clear()
  sessionPromiseCache.clear()
  manifestCache = null
  manifestPromise = null
  await disposeAll()
}
