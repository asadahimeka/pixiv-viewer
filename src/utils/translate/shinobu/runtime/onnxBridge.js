/**
 * @file ONNX Bridge — browser-only, lazy-loads onnxWorkerBridge on first call.
 *
 * Mechanically converted from ShinobuTranslator `src/runtime/onnxBridge.ts`
 * (TS → JS). Node branch removed entirely — pixiv-viewer is a browser-only
 * webpack app. All calls delegate to onnxWorkerBridge which manages the
 * Comlink worker singleton.
 */

// ---------------------------------------------------------------------------
// Lazy bridge module cache — loaded once, reused across pipeline calls
// ---------------------------------------------------------------------------

/** @type {typeof import('./onnxWorkerBridge.js') | null} */
let bridge = null

/** @returns {Promise<typeof import('./onnxWorkerBridge.js')>} */
async function loadBridge() {
  if (bridge) return bridge
  bridge = await import('./onnxWorkerBridge.js')
  return bridge
}

// ---------------------------------------------------------------------------
// Public API — thin async wrappers that resolve the bridge on first call
// ---------------------------------------------------------------------------

/**
 * @param {string} modelKey
 * @param {string} modelUrl
 * @param {Array<import('./onnxTypes.js').RuntimeProvider>} preferred
 * @param {import('./onnxSessionOptions.js').OnnxSessionOptions} [sessionOptions]
 * @returns {Promise<import('./onnxWorkerTypes.js').WorkerSessionHandle>}
 */
export async function createSession(modelKey, modelUrl, preferred, sessionOptions) {
  return (await loadBridge()).createSession(modelKey, modelUrl, preferred, sessionOptions)
}

/**
 * @param {string} sessionId
 * @param {Object.<string, import('./onnxWorkerTypes.js').TensorTransport>} feeds
 * @returns {Promise<import('./onnxWorkerTypes.js').InferenceResult>}
 */
export async function runInference(sessionId, feeds) {
  return (await loadBridge()).runInference(sessionId, feeds)
}

/**
 * @param {string} modelUrl
 * @returns {Promise<import('./selfCheck.js').RuntimeSelfCheckReport>}
 */
export async function probeRuntime(modelUrl) {
  return (await loadBridge()).probeRuntime(modelUrl)
}

/**
 * @param {import('./onnxWorkerTypes.js').PaddleGraphCaptureProbeOptions} options
 * @returns {Promise<import('./onnxWorkerTypes.js').PaddleGraphCaptureProbeResult>}
 */
export async function probePaddleGraphCapture(options) {
  return (await loadBridge()).probePaddleGraphCapture(options)
}

/**
 * @param {string} sessionId
 * @param {ImageBitmap} imageSource
 * @returns {Promise<import('./onnxWorkerTypes.js').GpuDetectResult>}
 */
export async function runDetectWithGpuPreprocess(sessionId, imageSource) {
  return (await loadBridge()).runDetectWithGpuPreprocess(sessionId, imageSource)
}

/**
 * @param {string} sessionId
 * @returns {Promise<void>}
 */
export async function disposeSession(sessionId) {
  return (await loadBridge()).disposeSession(sessionId)
}

/**
 * @returns {Promise<void>}
 */
export async function disposeAll() {
  return (await loadBridge()).disposeAll()
}
