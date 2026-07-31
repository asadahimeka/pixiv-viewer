/**
 * ONNX Runtime Web Worker — main thread wrapper.
 *
 * Provides helpers to manage the lifecycle of an ONNX inference worker:
 * create, load a model, run inference, and dispose cleanly.
 *
 * Supports multi-session with a 3-tier cache:
 *   Layer 1: in-memory session cache
 *   Layer 2: in-flight promise deduplication
 *   Layer 3: IndexedDB persistent byte cache (via localDb)
 */

import localDb from '@/utils/storage/localDb'

// ---------------------------------------------------------------------------
// Worker singleton
// ---------------------------------------------------------------------------

/** @type {Worker|null} */
let worker = null

/** @type {Promise<Worker>|null} */
let workerPromise = null

/**
 * Get or create the singleton ONNX worker.
 * @returns {Promise<Worker>}
 */
export async function getWorker() {
  if (worker) return worker
  if (workerPromise) return workerPromise
  workerPromise = (async () => {
    const w = createWorker()
    worker = w
    workerPromise = null
    return w
  })()
  return workerPromise
}

// ---------------------------------------------------------------------------
// Session cache layers
// ---------------------------------------------------------------------------

/** @type {Map<string, object>} */
const sessionCache = new Map()

/** @type {Map<string, Promise<object>>} */
const sessionPromiseCache = new Map()

// ---------------------------------------------------------------------------
// Worker lifecycle
// ---------------------------------------------------------------------------

/**
 * Create an ONNX inference worker.
 * @returns {Worker}
 */
export function createWorker() {
  const w = new Worker(
    new URL('./worker.js', import.meta.url),
    { type: 'module' }
  )
  return w
}

/**
 * Dispose a model in the worker and terminate.
 * @param {Worker} w
 * @returns {Promise<void>}
 */
export function disposeWorker(w) {
  return new Promise(resolve => {
    const handler = e => {
      if (e.data.type === 'disposed') {
        w.removeEventListener('message', handler)
        w.terminate()
        resolve()
      }
    }
    w.addEventListener('message', handler)
    w.postMessage({ type: 'dispose' })
    // Safety timeout — force terminate if worker doesn't respond
    setTimeout(() => {
      w.removeEventListener('message', handler)
      w.terminate()
      resolve()
    }, 3000)
  })
}

// ---------------------------------------------------------------------------
// Model loading and inference
// ---------------------------------------------------------------------------

/**
 * Load a model in the worker. Returns a promise that resolves when ready.
 * By default tries WebGPU → WASM. Pass custom `executionProviders` in sessionOptions to override.
 *
 * @param {Worker} w
 * @param {string} modelUrl
 * @param {object} [sessionOptions]
 * @param {string} [modelKey] - Optional model identifier for multi-session support
 * @returns {Promise<{provider: string, inputNames: string[], outputNames: string[]}>}
 */
export function loadModel(w, modelUrl, sessionOptions = {}, modelKey) {
  return new Promise((resolve, reject) => {
    const handler = e => {
      const msg = e.data
      if (msg.type === 'ready' && (!modelKey || msg.modelKey === modelKey)) {
        w.removeEventListener('message', handler)
        resolve(msg)
      } else if (msg.type === 'error') {
        w.removeEventListener('message', handler)
        reject(new Error(msg.message))
      }
    }
    w.addEventListener('message', handler)
    w.postMessage({ type: 'init', modelKey, modelUrl, sessionOptions })
  })
}

/**
 * Load a model in the singleton worker by sending model bytes with transfer list.
 * @param {string} modelKey
 * @param {ArrayBuffer} modelData
 * @param {object} [sessionOptions]
 * @returns {Promise<{provider: string, inputNames: string[], outputNames: string[]}>}
 */
export function loadModelInWorker(modelKey, modelData, sessionOptions = {}) {
  const w = worker
  if (!w) throw new Error('Worker not initialized. Call getWorker() first.')
  return new Promise((resolve, reject) => {
    const handler = e => {
      const msg = e.data
      if (msg.type === 'ready' && msg.modelKey === modelKey) {
        w.removeEventListener('message', handler)
        resolve(msg)
      } else if (msg.type === 'error') {
        w.removeEventListener('message', handler)
        reject(new Error(msg.message))
      }
    }
    w.addEventListener('message', handler)
    const transfer = modelData instanceof ArrayBuffer ? [modelData] : []
    w.postMessage({ type: 'init', modelKey, modelUrl: modelData, sessionOptions }, transfer)
  })
}

/**
 * Run inference in the worker.
 * @param {Worker} w
 * @param {object} feeds - { [inputName]: { data: Float32Array|Uint8Array, dims: number[], type?: string } }
 * @param {string} [modelKey] - Optional model identifier for multi-session support
 * @returns {Promise<object>} - { [outputName]: { data, dims, type } }
 */
export function runInference(w, feeds, modelKey) {
  return new Promise((resolve, reject) => {
    const handler = e => {
      const msg = e.data
      if (msg.type === 'result') {
        if (!modelKey || msg.modelKey === modelKey) {
          w.removeEventListener('message', handler)
          resolve(msg.outputs)
        }
      } else if (msg.type === 'error') {
        w.removeEventListener('message', handler)
        reject(new Error(msg.message))
      }
    }
    w.addEventListener('message', handler)
    w.postMessage({ type: 'infer', modelKey, feeds })
  })
}

// ---------------------------------------------------------------------------
// IndexedDB byte cache
// ---------------------------------------------------------------------------

/**
 * Get model bytes from IndexedDB cache or fetch from network.
 * @param {string} modelKey
 * @param {string} modelUrl
 * @returns {Promise<ArrayBuffer>}
 */
async function getCachedModelBytes(modelKey, modelUrl) {
  const cacheKey = `onnx:${modelKey}`
  try {
    const cached = await localDb.get(cacheKey)
    if (cached) return cached
  } catch (_) {
    // IndexedDB unavailable, fall through to fetch
  }
  const response = await fetch(modelUrl)
  if (!response.ok) {
    throw new Error(`Failed to fetch model "${modelKey}": ${response.status}`)
  }
  const bytes = await response.arrayBuffer()
  try {
    await localDb.set(cacheKey, bytes, 30 * 24 * 60 * 60) // 30 day TTL
  } catch (_) {
    // Cache failure is non-fatal
  }
  return bytes
}

// ---------------------------------------------------------------------------
// 3-tier session cache
// ---------------------------------------------------------------------------

/**
 * Get or create a model session using the 3-tier cache.
 * Layer 1: in-memory session cache
 * Layer 2: in-flight promise deduplication
 * Layer 3: IndexedDB persistent byte cache
 *
 * @param {string} modelKey
 * @param {string} modelUrl
 * @param {object} [sessionOptions]
 * @returns {Promise<object>}
 */
export async function getModelSession(modelKey, modelUrl, sessionOptions) {
  // Layer 1: in-memory session cache
  const cached = sessionCache.get(modelKey)
  if (cached) return cached

  // Layer 2: deduplicate concurrent creation
  const pending = sessionPromiseCache.get(modelKey)
  if (pending) return pending

  const creation = (async () => {
    const bytes = await getCachedModelBytes(modelKey, modelUrl)
    const handle = await loadModelInWorker(modelKey, bytes, sessionOptions)
    sessionCache.set(modelKey, handle)
    return handle
  })()
    .finally(() => sessionPromiseCache.delete(modelKey))

  sessionPromiseCache.set(modelKey, creation)
  return creation
}

// ---------------------------------------------------------------------------
// Session disposal
// ---------------------------------------------------------------------------

/**
 * Dispose a specific model session.
 * @param {string} modelKey
 */
export function disposeModelSession(modelKey) {
  sessionCache.delete(modelKey)
  sessionPromiseCache.delete(modelKey)
  if (worker) {
    worker.postMessage({ type: 'dispose', modelKey })
  }
}

/**
 * Dispose all model sessions and clear caches.
 */
export function disposeAllModelSessions() {
  sessionCache.clear()
  sessionPromiseCache.clear()
  if (worker) {
    worker.postMessage({ type: 'dispose' }) // no modelKey = dispose all
  }
}

// ---------------------------------------------------------------------------
// Batch loading helpers
// ---------------------------------------------------------------------------

/**
 * Load multiple models sequentially with progress reporting.
 * Models are loaded one at a time to avoid memory spikes.
 * If a model fails, error is reported via progress callback but loading continues.
 *
 * @param {Worker} w
 * @param {string[]} modelNames - Array of model names (as in the manifest)
 * @param {Function} onProgress - Callback({ model: string, loaded: number, total: number, status: 'loading'|'ready'|'error', error?: string })
 * @param {AbortSignal} [signal] - Optional AbortSignal to cancel loading
 * @returns {Promise<string[]>} - Array of model names that loaded successfully
 */
export async function loadModelsSequentially(w, modelNames, onProgress, signal) {
  const loaded = []

  for (let i = 0; i < modelNames.length; i++) {
    if (signal?.aborted) {
      console.log(`[loadModels] Aborted at model ${i}/${modelNames.length}`)
      break
    }

    const modelName = modelNames[i]

    onProgress({
      model: modelName,
      loaded: i,
      total: modelNames.length,
      status: 'loading',
    })

    try {
      const { getModelUrl } = await import('./modelRegistry.js')
      const modelUrl = await getModelUrl(modelName)

      if (signal?.aborted) {
        console.log(`[loadModels] Aborted before loading ${modelName}`)
        break
      }

      await loadModel(w, modelUrl)

      loaded.push(modelName)

      onProgress({
        model: modelName,
        loaded: loaded.length,
        total: modelNames.length,
        status: 'ready',
      })
    } catch (err) {
      console.log(`[loadModels] Failed to load model "${modelName}":`, err.message)

      onProgress({
        model: modelName,
        loaded: i,
        total: modelNames.length,
        status: 'error',
        error: err.message,
      })
    }
  }

  return loaded
}

/**
 * Unload all models and terminate the worker.
 * @param {Worker} w
 * @returns {Promise<void>}
 */
export async function unloadAll(w) {
  try {
    await disposeWorker(w)
  } catch (e) {
    // Ignore errors during cleanup
  }
}
