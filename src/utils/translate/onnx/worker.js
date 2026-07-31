/**
 * ONNX Runtime Web Worker
 *
 * Loads ONNX models, runs inference, and cleans up.
 * Communicates with the main thread via a structured message protocol.
 * Supports multiple named sessions identified by modelKey.
 * Inference calls are serialized via SerialInferenceQueue.
 *
 * Messages FROM main thread TO worker:
 *   { type: 'init', modelKey: string, modelUrl: string, sessionOptions?: object }
 *   { type: 'infer', modelKey: string, feeds: {[name]: {data: Float32Array|Uint8Array, dims: number[], type?: string}} }
 *   { type: 'dispose', modelKey?: string }
 *
 * Messages FROM worker TO main thread:
 *   { type: 'ready', modelKey: string, provider?: string, inputNames?: string[], outputNames?: string[] }
 *   { type: 'result', modelKey: string, outputs: {[name]: {data: Float32Array, dims: number[], type: string}} }
 *   { type: 'error', message: string, stack?: string }
 *   { type: 'disposed' }
 */

import * as ort from 'onnxruntime-web'
import { SerialInferenceQueue } from '../pipeline/onnx/serialInferenceQueue.js'

/** @type {Map<string, { session: ort.InferenceSession, provider: string }>} */
const sessions = new Map()

const inferenceQueue = new SerialInferenceQueue()

// WASM backend: multi-threaded if SharedArrayBuffer is available
const canUseWasmThreads = typeof self !== 'undefined' && self.crossOriginIsolated
if (!canUseWasmThreads) {
  console.log('[TranslateWorker] Not cross-origin isolated — using single-threaded WASM. Multi-threaded ~2-3x faster with COOP+COEP headers.')
}
ort.env.wasm.numThreads = canUseWasmThreads ? Math.min(8, navigator.hardwareConcurrency || 1) : 1
// Load ORT WASM from CDN instead of bundling (~78MB savings)
ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.27.0/dist/'

/**
 * Create an ONNX inference session with timeout.
 * @param {string} modelUrl
 * @param {object} options
 * @param {number} [timeoutMs=30000]
 * @returns {Promise<ort.InferenceSession>}
 */
async function createSessionWithTimeout(modelUrl, options, timeoutMs = 30000) {
  return await Promise.race([
    ort.InferenceSession.create(modelUrl, options),
    new Promise((_resolve, reject) =>
      setTimeout(() => reject(new Error(`Session creation timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ])
}

/**
 * Handle messages from the main thread.
 */
self.addEventListener('message', async event => {
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
        handleDispose(msg)
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
 * @param {{ modelKey: string, modelUrl: string, sessionOptions?: object }} msg
 */
async function handleInit(msg) {
  const { modelKey, modelUrl, sessionOptions = {} } = msg

  // Try WebGPU first, fall back to WASM
  const options = {
    executionProviders: ['webgpu', 'wasm'],
    ...sessionOptions,
  }

  const startTime = performance.now()

  try {
    const session = await createSessionWithTimeout(modelUrl, options)
    const elapsed = ((performance.now() - startTime) / 1000).toFixed(1)
    console.log(`[TranslateWorker] Model "${modelKey}" loaded in ${elapsed}s (executionProviders: webgpu+wasm)`)

    sessions.set(modelKey, { session, provider: 'webgpu+wasm' })

    postMessage({
      type: 'ready',
      modelKey,
      provider: 'webgpu+wasm',
      inputNames: session.inputNames,
      outputNames: session.outputNames,
    })
  } catch (err) {
    // WebGPU+WASM failed, retry with WASM only
    console.log(`[TranslateWorker] WebGPU+WASM failed for "${modelKey}", retrying with WASM only:`, err.message)

    try {
      const optionsWasm = { executionProviders: ['wasm'], ...sessionOptions }
      const wasmStart = performance.now()
      const session = await createSessionWithTimeout(modelUrl, optionsWasm)
      const elapsed = ((performance.now() - wasmStart) / 1000).toFixed(1)
      console.log(`[TranslateWorker] Model "${modelKey}" loaded in ${elapsed}s (executionProviders: wasm)`)

      sessions.set(modelKey, { session, provider: 'wasm' })

      postMessage({
        type: 'ready',
        modelKey,
        provider: 'wasm',
        inputNames: session.inputNames,
        outputNames: session.outputNames,
      })
    } catch (err2) {
      throw new Error(`Failed to create session for "${modelKey}": ${err2.message}`)
    }
  }
}

/**
 * Run inference with the given feeds.
 * @param {{ modelKey: string, feeds: object }} msg
 */
async function handleInfer(msg) {
  const { modelKey, feeds: rawFeeds } = msg

  const entry = sessions.get(modelKey)
  if (!entry) {
    throw new Error(`Model "${modelKey}" not loaded. Call init first.`)
  }

  const feeds = {}
  for (const [name, tensorData] of Object.entries(rawFeeds)) {
    const { data, dims, type = 'float32' } = tensorData
    feeds[name] = new ort.Tensor(type, data, dims)
  }

  const results = await inferenceQueue.enqueue(() => entry.session.run(feeds))

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

  postMessage({ type: 'result', modelKey, outputs }, transferables)
}

/**
 * Dispose of a specific session or all sessions.
 * @param {{ modelKey?: string }} [msg]
 */
function handleDispose(msg) {
  const modelKey = msg?.modelKey
  if (modelKey) {
    sessions.delete(modelKey)
    console.log(`[TranslateWorker] Session "${modelKey}" disposed`)
  } else {
    sessions.clear()
    console.log('[TranslateWorker] All sessions disposed')
  }
  postMessage({ type: 'disposed' })
}
