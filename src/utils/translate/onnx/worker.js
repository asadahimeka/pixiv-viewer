/**
 * ONNX Runtime Web Worker
 *
 * Loads ONNX models, runs inference, and cleans up.
 * Communicates with the main thread via a structured message protocol.
 *
 * Messages FROM main thread TO worker:
 *   { type: 'init', modelUrl: string, sessionOptions?: object }
 *   { type: 'infer', feeds: {[name]: {data: Float32Array|Uint8Array, dims: number[], type?: string}} }
 *   { type: 'dispose' }
 *
 * Messages FROM worker TO main thread:
 *   { type: 'ready', provider?: string, inputNames?: string[], outputNames?: string[] }
 *   { type: 'result', outputs: {[name]: {data: Float32Array, dims: number[], type: string}} }
 *   { type: 'error', message: string, stack?: string }
 *   { type: 'disposed' }
 */

import * as ort from 'onnxruntime-web'

/** @type {ort.InferenceSession|null} */
let session = null

// WASM backend: multi-threaded if SharedArrayBuffer is available
const canUseWasmThreads = typeof self !== 'undefined' && self.crossOriginIsolated
if (!canUseWasmThreads) {
  console.log('[TranslateWorker] Not cross-origin isolated — using single-threaded WASM. Multi-threaded ~2-3x faster with COOP+COEP headers.')
}
ort.env.wasm.numThreads = canUseWasmThreads ? Math.min(8, navigator.hardwareConcurrency || 1) : 1
ort.env.wasm.wasmPaths = undefined // let ONNX Runtime auto-detect

/**
 * Handle messages from the main thread.
 */
self.addEventListener('message', async (event) => {
  const msg = event.data

  try {
    switch (msg.type) {
      case 'init':
        await handleInit(msg)
        break
      case 'infer':
        await handleInfer(msg)
        break
      case 'dispose':
        handleDispose()
        break
      default:
        postMessage({
          type: 'error',
          message: `Unknown message type: ${msg.type}`,
        })
    }
  } catch (err) {
    postMessage({
      type: 'error',
      message: err.message,
      stack: err.stack,
    })
  }
})

/**
 * Initialize: create an InferenceSession from a model URL.
 * @param {{ modelUrl: string, sessionOptions?: object }} msg
 */
async function handleInit(msg) {
  const { modelUrl, sessionOptions = {} } = msg

  if (session) {
    // Clean up previous session before creating a new one
    session = null
  }

  session = await ort.InferenceSession.create(modelUrl, sessionOptions)

  postMessage({
    type: 'ready',
    provider: ort.env.debug ? 'wasm' : 'wasm',
    inputNames: session.inputNames,
    outputNames: session.outputNames,
  })
}

/**
 * Run inference with the given feeds.
 * @param {{ feeds: object }} msg
 */
async function handleInfer(msg) {
  if (!session) {
    throw new Error('Model not loaded. Call init first.')
  }

  const feeds = {}
  for (const [name, tensorData] of Object.entries(msg.feeds)) {
    const { data, dims, type = 'float32' } = tensorData
    feeds[name] = new ort.Tensor(type, data, dims)
  }

  const results = await session.run(feeds)

  /** @type {object} */
  const outputs = {}
  const transferables = []

  for (const [name, tensor] of Object.entries(results)) {
    const data = tensor.data
    outputs[name] = {
      data,
      dims: tensor.dims.slice(),
      type: tensor.type,
    }
    // Transfer ArrayBuffer if possible
    if (data instanceof Float32Array || data instanceof Uint8Array || data instanceof Int32Array || data instanceof BigInt64Array || data instanceof BigUint64Array) {
      transferables.push(data.buffer)
    }
  }

  postMessage({ type: 'result', outputs }, transferables)
}

/**
 * Dispose of the current session.
 */
function handleDispose() {
  session = null
  postMessage({ type: 'disposed' })
}
