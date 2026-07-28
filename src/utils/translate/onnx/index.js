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
