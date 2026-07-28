/**
 * ONNX Runtime Web Worker — main thread wrapper.
 *
 * Provides helpers to manage the lifecycle of an ONNX inference worker:
 * create, load a model, run inference, and dispose cleanly.
 */

/**
 * Create an ONNX inference worker.
 * @returns {Worker}
 */
export function createWorker() {
  const worker = new Worker(
    new URL('./worker.js', import.meta.url),
    { type: 'module' }
  )
  return worker
}

/**
 * Load a model in the worker. Returns a promise that resolves when ready.
 * By default tries WebGPU → WASM. Pass custom `executionProviders` in sessionOptions to override.
 * @param {Worker} worker
 * @param {string} modelUrl
 * @param {object} [sessionOptions]
 * @returns {Promise<{provider: string, inputNames: string[], outputNames: string[]}>}
 */
export function loadModel(worker, modelUrl, sessionOptions = {}) {
  return new Promise((resolve, reject) => {
    const handler = (e) => {
      const msg = e.data
      if (msg.type === 'ready') {
        worker.removeEventListener('message', handler)
        resolve(msg)
      } else if (msg.type === 'error') {
        worker.removeEventListener('message', handler)
        reject(new Error(msg.message))
      }
    }
    worker.addEventListener('message', handler)
    worker.postMessage({ type: 'init', modelUrl, sessionOptions })
  })
}

/**
 * Run inference in the worker.
 * @param {Worker} worker
 * @param {object} feeds - { [inputName]: { data: Float32Array|Uint8Array, dims: number[], type?: string } }
 * @returns {Promise<object>} - { [outputName]: { data, dims, type } }
 */
export function runInference(worker, feeds) {
  return new Promise((resolve, reject) => {
    const handler = (e) => {
      const msg = e.data
      if (msg.type === 'result') {
        worker.removeEventListener('message', handler)
        resolve(msg.outputs)
      } else if (msg.type === 'error') {
        worker.removeEventListener('message', handler)
        reject(new Error(msg.message))
      }
    }
    worker.addEventListener('message', handler)
    worker.postMessage({ type: 'infer', feeds })
  })
}

/**
 * Dispose a model in the worker and terminate.
 * @param {Worker} worker
 * @returns {Promise<void>}
 */
export function disposeWorker(worker) {
  return new Promise((resolve) => {
    const handler = (e) => {
      if (e.data.type === 'disposed') {
        worker.removeEventListener('message', handler)
        worker.terminate()
        resolve()
      }
    }
    worker.addEventListener('message', handler)
    worker.postMessage({ type: 'dispose' })
    // Safety timeout — force terminate if worker doesn't respond
    setTimeout(() => {
      worker.removeEventListener('message', handler)
      worker.terminate()
      resolve()
    }, 3000)
  })
}

/**
 * Load multiple models sequentially with progress reporting.
 * Models are loaded one at a time to avoid memory spikes.
 * If a model fails, error is reported via progress callback but loading continues.
 *
 * @param {Worker} worker
 * @param {string[]} modelNames - Array of model names (as in the manifest)
 * @param {Function} onProgress - Callback({ model: string, loaded: number, total: number, status: 'loading'|'ready'|'error', error?: string })
 * @param {AbortSignal} [signal] - Optional AbortSignal to cancel loading
 * @returns {Promise<string[]>} - Array of model names that loaded successfully
 */
export async function loadModelsSequentially(worker, modelNames, onProgress, signal) {
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

      await loadModel(worker, modelUrl)

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
 * Unload the current model session in the worker.
 * @param {Worker} worker
 * @returns {Promise<void>}
 */
export function unloadModel(worker) {
  return new Promise((resolve) => {
    const handler = (e) => {
      if (e.data.type === 'disposed') {
        worker.removeEventListener('message', handler)
        resolve()
      }
    }
    worker.addEventListener('message', handler)
    worker.postMessage({ type: 'dispose' })
    setTimeout(() => {
      worker.removeEventListener('message', handler)
      resolve()
    }, 3000)
  })
}

/**
 * Unload all models and terminate the worker.
 * @param {Worker} worker
 * @returns {Promise<void>}
 */
export async function unloadAll(worker) {
  try {
    await unloadModel(worker)
  } catch (e) {
    // Ignore errors during cleanup
  }
  worker.terminate()
}
