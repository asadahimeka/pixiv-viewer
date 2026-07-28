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
 * Tries WebGPU first, falls back to WASM if unavailable.
 * @param {{ modelUrl: string, sessionOptions?: object }} msg
 */
async function handleInit(msg) {
  const { modelUrl, sessionOptions = {} } = msg

  if (session) {
    // Clean up previous session before creating a new one
    session = null
  }

  // Try WebGPU first, fall back to WASM
  const options = {
    executionProviders: ['webgpu', 'wasm'],
    ...sessionOptions,
  }

  const startTime = performance.now()

  try {
    session = await ort.InferenceSession.create(modelUrl, options)
    const elapsed = ((performance.now() - startTime) / 1000).toFixed(1)
    console.log(`[TranslateWorker] Model loaded in ${elapsed}s (executionProviders: ${options.executionProviders.join(', ')})`)

    postMessage({
      type: 'ready',
      provider: 'webgpu+wasm',
      inputNames: session.inputNames,
      outputNames: session.outputNames,
    })
  } catch (err) {
    // WebGPU+WASM failed, retry with WASM only
    console.log('[TranslateWorker] WebGPU+WASM failed, retrying with WASM only:', err.message)

    try {
      const optionsWasm = { executionProviders: ['wasm'], ...sessionOptions }
      const wasmStart = performance.now()
      session = await ort.InferenceSession.create(modelUrl, optionsWasm)
      const elapsed = ((performance.now() - wasmStart) / 1000).toFixed(1)
      console.log(`[TranslateWorker] Model loaded in ${elapsed}s (executionProviders: wasm)`)

      postMessage({
        type: 'ready',
        provider: 'wasm',
        inputNames: session.inputNames,
        outputNames: session.outputNames,
      })
    } catch (err2) {
      throw new Error(`Failed to create inference session: ${err2.message}`)
    }
  }
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
