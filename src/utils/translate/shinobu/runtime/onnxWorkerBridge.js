/**
 * @file ONNX Worker Bridge — main-thread proxy to the Comlink-exposed ONNX web worker.
 *
 * Mechanically converted from ShinobuTranslator `src/runtime/onnxWorkerBridge.ts`
 * (TS → JS). Adapted for pixiv-viewer (webpack + browser-only, no Chrome extension):
 * - Worker creation: `new Worker(new URL('../workers/onnx-worker.js', import.meta.url), { type: 'module' })`
 * - No chrome-extension:// bootstrap (no chrome.runtime.getURL)
 * - No Blob fallback for HTTP (webpack bundles the worker)
 * - ORT WASM served from jsdelivr CDN (not self-hosted)
 * - Perf tracing (recordPerfRuntimeEvent / recordPerfWorkerCall) → noop console.debug
 * - serializePipelineError → inlined 4-line helper
 * - WorkerBootstrapError class removed (single-path bootstrap, no multi-attempt)
 *
 * @see {@link ./onnxWorkerTypes.js#OnnxWorkerApi} for the worker comlink interface
 */

import * as Comlink from 'comlink'
import { Toast } from '@/lib/vant-apis'

// ---------------------------------------------------------------------------
// Inline helpers (replacing src/shared/* imports — not yet ported)
// ---------------------------------------------------------------------------

/**
 * Noop performance tracing — src/shared/perfTrace not yet ported.
 * Set `false` to `true` during debugging to see trace events.
 *
 * @param {string} _kind - Event kind (e.g. 'worker-bootstrap-attempt', 'inference-failure')
 * @param {object} [_payload] - Event data
 */
function recordPerfRuntimeEvent(_kind, _payload) {
  // Noop — shared/perfTrace not yet ported
  console.log(`[${_kind}]`, _payload)
}

/**
 * Noop worker call tracing — see recordPerfRuntimeEvent notes.
 *
 * @param {object} _payload
 */
function recordPerfWorkerCall(_payload) {
  // Noop — shared/perfTrace not yet ported
  console.log('_payload: ', _payload)
}

// ---------------------------------------------------------------------------
// ORT config
// ---------------------------------------------------------------------------

/** CDN path for onnxruntime-web WASM assets (mirrors worker default). */
const ORT_CDN_PATH =
  process.env.VUE_APP_ORT_WASM_PATH ||
  'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.27.0/dist/'

/** Maximum wait for worker init() handshake. */
const WORKER_INIT_TIMEOUT_MS = 10000

// ---------------------------------------------------------------------------
// Model cache quota warning
// ---------------------------------------------------------------------------

/** True once a quota warning has been surfaced — avoid toast spam. */
let cacheQuotaWarningShown = false

/**
 * Surface the worker's "model cache quota exceeded" notification as a toast.
 * Shown at most once per session so a batch of model loads doesn't spam.
 */
function showCacheQuotaWarning() {
  if (cacheQuotaWarningShown) return
  cacheQuotaWarningShown = true
  Toast({ message: '模型缓存空间不足，将每次重新下载', duration: 2500 })
}

// ---------------------------------------------------------------------------
// Worker singleton — created once, reused across pipeline calls.
// ---------------------------------------------------------------------------

/** @type {Worker | null} */
let worker = null

/** @type {Comlink.Remote<import('./onnxWorkerTypes.js').OnnxWorkerApi> | null} */
let proxy = null

/** @type {Promise<{ worker: Worker, proxy: Comlink.Remote<import('./onnxWorkerTypes.js').OnnxWorkerApi> }> | null} */
let workerPromise = null

/** @type {Map<string, import('./onnxTypes.js').RuntimeProvider>} */
const sessionProviders = new Map()

/** @type {Map<string, string>} */
const sessionModels = new Map()

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

/**
 * @template T
 * @param {Promise<T>} promise
 * @param {number} timeoutMs
 * @param {string} label
 * @returns {Promise<T>}
 */
function withTimeout(promise, timeoutMs, label) {
  /** @type {ReturnType<typeof setTimeout> | null} */
  let timer = null
  return Promise.race([
    promise,
    new Promise((_resolve, reject) => {
      timer = setTimeout(
        () => reject(new Error(`${label} timed out after ${timeoutMs}ms`)),
        timeoutMs
      )
    }),
  ]).finally(() => {
    if (timer !== null) {
      clearTimeout(timer)
    }
  })
}

/**
 * Create the ONNX web worker, wrap with Comlink, and perform the init handshake.
 *
 * Only one bootstrap attempt — webpack handles worker bundling, so there is no
 * direct-HTTP or blob-fallback code path needed. Uses the same `new URL` pattern
 * as pixiv-viewer's existing `src/utils/translate/onnx/index.js`.
 *
 * @returns {Promise<{ worker: Worker, proxy: Comlink.Remote<import('./onnxWorkerTypes.js').OnnxWorkerApi> }>}
 */
async function bootstrapWorker() {
  const candidate = new Worker(
    new URL('../workers/onnx-worker.js', import.meta.url),
    { type: 'module' }
  )

  // Non-comlink message from the worker (payloads without an `id` are ignored
  // by Comlink's message filter), forwarded to the user-facing toast.
  candidate.addEventListener('message', event => {
    if (event.data && event.data.type === 'shinobu-cache-quota-warning') {
      showCacheQuotaWarning()
    }
  })

  /** @type {Comlink.Remote<import('./onnxWorkerTypes.js').OnnxWorkerApi>} */
  const candidateProxy = Comlink.wrap(candidate)

  /** @type {((event: ErrorEvent) => void) | null} */
  let workerErrorListener = null
  const workerError = new Promise((_resolve, reject) => {
    workerErrorListener = event => {
      const detail = [
        event.message || 'ONNX Worker 加载失败',
        event.filename ? `source=${event.filename}` : '',
        event.lineno ? `line=${event.lineno}:${event.colno ?? 0}` : '',
      ].filter(Boolean).join(' | ')
      reject(
        new Error(detail, event.error === undefined ? undefined : { cause: event.error })
      )
    }
    candidate.addEventListener('error', workerErrorListener, { once: true })
  })

  try {
    recordPerfRuntimeEvent('worker-bootstrap-attempt', {
      message: '开始 ONNX Worker 启动 (webpack bundle)',
      data: { ortPath: ORT_CDN_PATH },
    })

    await withTimeout(
      Promise.race([candidateProxy.init(ORT_CDN_PATH), workerError]),
      WORKER_INIT_TIMEOUT_MS,
      'ONNX Worker init'
    )

    recordPerfRuntimeEvent('worker-bootstrap-complete', {
      message: 'ONNX Worker 启动成功',
    })

    return { worker: candidate, proxy: candidateProxy }
  } catch (error) {
    candidate.terminate()
    recordPerfRuntimeEvent('worker-bootstrap-attempt', {
      message: 'ONNX Worker 启动失败',
      error,
    })
    throw error
  } finally {
    if (workerErrorListener) {
      candidate.removeEventListener('error', workerErrorListener)
    }
  }
}

/**
 * Lazy-init the worker singleton. Concurrent callers share the same promise.
 *
 * @returns {Promise<{ worker: Worker, proxy: Comlink.Remote<import('./onnxWorkerTypes.js').OnnxWorkerApi> }>}
 */
async function ensureWorker() {
  if (worker && proxy) return { worker, proxy }
  if (workerPromise) return workerPromise
  workerPromise = bootstrapWorker()
    .then(result => {
      worker = result.worker
      proxy = result.proxy
      return result
    })
    .finally(() => {
      workerPromise = null
    })
  return workerPromise
}

/**
 * Resolve the Comlink proxy (lazy-init the worker if needed).
 *
 * @returns {Promise<Comlink.Remote<import('./onnxWorkerTypes.js').OnnxWorkerApi>>}
 */
function getProxy() {
  return ensureWorker().then(({ proxy }) => proxy)
}

// ---------------------------------------------------------------------------
// Tensor byte-length helpers (perf tracing only)
// ---------------------------------------------------------------------------

/**
 * @param {import('./onnxWorkerTypes.js').TensorTransport} tensor
 * @returns {number}
 */
function tensorByteLength(tensor) {
  return tensor.data.byteLength
}

/**
 * @param {Object.<string, import('./onnxWorkerTypes.js').TensorTransport>} tensors
 * @returns {number}
 */
function tensorRecordByteLength(tensors) {
  return Object.values(tensors).reduce((sum, t) => sum + tensorByteLength(t), 0)
}

/**
 * @param {import('./onnxWorkerTypes.js').GpuDetectResult} result
 * @returns {number}
 */
function gpuDetectOutputBytes(result) {
  return tensorRecordByteLength(result.outputs)
}

// ---------------------------------------------------------------------------
// Public API — thin async wrappers around Comlink proxy calls.
//
// Input data (Float32Array / BigInt64Array) is sent via structured clone
// (not Transferable) so that the main thread retains ownership. This is
// critical for fallback paths: if the first inference attempt fails, the
// same preprocessed data must still be available to retry with a different
// provider. Output data is transferred by the Worker (zero-copy return).
// ---------------------------------------------------------------------------

/**
 * Create an ONNX inference session inside the worker.
 *
 * @param {string} modelKey - Human-readable model identifier for caching
 * @param {string} modelUrl - CDN URL or relative path to the .onnx model file
 * @param {Array<import('./onnxTypes.js').RuntimeProvider>} preferred - Ordered EP preference list
 * @param {import('./onnxSessionOptions.js').OnnxSessionOptions} [sessionOptions] - WebGPU-specific options
 * @returns {Promise<import('./onnxWorkerTypes.js').WorkerSessionHandle>}
 */
export async function createSession(modelKey, modelUrl, preferred, sessionOptions) {
  const startedAt = performance.now()
  /** @type {import('./onnxWorkerTypes.js').WorkerSessionHandle | null} */
  let handle = null
  /** @type {unknown} */
  let failure = null
  try {
    handle = await (await getProxy()).createSession(
      modelKey,
      modelUrl,
      preferred,
      sessionOptions
    )
    sessionProviders.set(handle.sessionId, handle.provider)
    sessionModels.set(handle.sessionId, modelKey)
    return handle
  } catch (error) {
    failure = error
    throw error
  } finally {
    recordPerfWorkerCall({
      kind: 'createSession',
      model: modelKey,
      provider: handle?.provider,
      startedAt,
      durationMs: performance.now() - startedAt,
      error: failure instanceof Error ? failure.message : failure === null ? undefined : String(failure),
    })
  }
}

/**
 * Run inference on a previously created session.
 *
 * The Worker returns any inference failure via `InferenceResult.error`
 * rather than throwing, so callers must check that field.
 *
 * @param {string} sessionId - Returned by createSession()
 * @param {Object.<string, import('./onnxWorkerTypes.js').TensorTransport>} feeds - Input tensors
 * @returns {Promise<import('./onnxWorkerTypes.js').InferenceResult>}
 */
export async function runInference(sessionId, feeds) {
  const startedAt = performance.now()
  /** @type {import('./onnxWorkerTypes.js').InferenceResult | null} */
  let result = null
  /** @type {unknown} */
  let failure = null
  try {
    result = await (await getProxy()).runInference(sessionId, feeds)
    if (result.error) {
      failure = new Error(result.error)
      recordPerfRuntimeEvent('inference-failure', {
        model: sessionModels.get(sessionId) ?? sessionId,
        provider: sessionProviders.get(sessionId),
        message: `ONNX 推理失败: ${sessionModels.get(sessionId) ?? sessionId}`,
        error: failure,
      })
    }
    return result
  } catch (error) {
    failure = error
    recordPerfRuntimeEvent('inference-failure', {
      model: sessionModels.get(sessionId) ?? sessionId,
      provider: sessionProviders.get(sessionId),
      message: `ONNX 推理调用异常: ${sessionModels.get(sessionId) ?? sessionId}`,
      error,
    })
    throw error
  } finally {
    recordPerfWorkerCall({
      kind: 'runInference',
      model: sessionModels.get(sessionId) ?? sessionId,
      provider: sessionProviders.get(sessionId),
      inputBytes: tensorRecordByteLength(feeds),
      outputBytes: result ? tensorRecordByteLength(result.outputs) : undefined,
      startedAt,
      durationMs: performance.now() - startedAt,
      error: failure instanceof Error ? failure.message : failure === null ? undefined : String(failure),
    })
  }
}

/**
 * Probe runtime capabilities using a diagnostic model URL.
 * Returns a {@link import('./selfCheck.js').RuntimeSelfCheckReport} with
 * per-check pass/fail/warn/skip status blocks — used by the selfCheck module.
 *
 * @param {string} modelUrl - CDN URL of the diagnostic .onnx model
 * @returns {Promise<import('./selfCheck.js').RuntimeSelfCheckReport>}
 */
export async function probeRuntime(modelUrl) {
  const startedAt = performance.now()
  try {
    return await (await getProxy()).probeRuntime(modelUrl)
  } finally {
    recordPerfWorkerCall({
      kind: 'probeRuntime',
      model: modelUrl,
      startedAt,
      durationMs: performance.now() - startedAt,
    })
  }
}

/**
 * Probe WebGPU graph-capture support (PaddleOCR-specific).
 * Creates a PaddleOCR-shaped session with `enableGraphCapture` and runs
 * warm-up inferences to measure graph-capture performance.
 *
 * @param {import('./onnxWorkerTypes.js').PaddleGraphCaptureProbeOptions} options
 * @returns {Promise<import('./onnxWorkerTypes.js').PaddleGraphCaptureProbeResult>}
 */
export async function probePaddleGraphCapture(options) {
  const startedAt = performance.now()
  /** @type {import('./onnxWorkerTypes.js').PaddleGraphCaptureProbeResult | null} */
  let result = null
  try {
    result = await (await getProxy()).probePaddleGraphCapture(options)
    return result
  } finally {
    recordPerfWorkerCall({
      kind: 'probePaddleGraphCapture',
      model: options.modelUrl,
      inputBytes: result?.inputBytes,
      outputBytes: result?.outputBytes,
      startedAt,
      durationMs: performance.now() - startedAt,
    })
  }
}

/**
 * Run detector inference with GPU-side letterbox preprocessing.
 * Transfers the ImageBitmap to the Worker via Comlink transfer.
 *
 * @param {string} sessionId - Detector session ID (must be WebGPU EP)
 * @param {ImageBitmap} imageSource - Source image to detect
 * @returns {Promise<import('./onnxWorkerTypes.js').GpuDetectResult>}
 */
export async function runDetectWithGpuPreprocess(sessionId, imageSource) {
  const p = await getProxy()
  const startedAt = performance.now()
  /** @type {import('./onnxWorkerTypes.js').GpuDetectResult | null} */
  let result = null
  /** @type {unknown} */
  let failure = null
  try {
    result = await p.runDetectWithGpuPreprocess(
      sessionId,
      Comlink.transfer(imageSource, [imageSource])
    )
    return result
  } catch (error) {
    failure = error
    recordPerfRuntimeEvent('inference-failure', {
      model: sessionModels.get(sessionId) ?? sessionId,
      provider: sessionProviders.get(sessionId),
      message: `GPU 检测推理调用异常: ${sessionModels.get(sessionId) ?? sessionId}`,
      error,
    })
    throw error
  } finally {
    recordPerfWorkerCall({
      kind: 'runDetectWithGpuPreprocess',
      model: sessionModels.get(sessionId) ?? sessionId,
      provider: sessionProviders.get(sessionId),
      outputBytes: result ? gpuDetectOutputBytes(result) : undefined,
      startedAt,
      durationMs: performance.now() - startedAt,
      error: failure instanceof Error ? failure.message : failure === null ? undefined : String(failure),
    })
  }
}

/**
 * Dispose a single ONNX session by its sessionId.
 * Clears the local provider/model caches for that session.
 *
 * @param {string} sessionId
 * @returns {Promise<void>}
 */
export async function disposeSession(sessionId) {
  await (await getProxy()).disposeSession(sessionId)
  sessionProviders.delete(sessionId)
  sessionModels.delete(sessionId)
}

/**
 * Dispose all ONNX sessions, release the Comlink proxy, and terminate the worker.
 * After this call the worker singleton is reset — the next pipeline call will
 * create a fresh worker.
 *
 * @returns {Promise<void>}
 */
export async function disposeAll() {
  const currentWorker = worker
  const currentProxy = proxy
  worker = null
  proxy = null
  workerPromise = null
  sessionProviders.clear()
  sessionModels.clear()
  if (!currentWorker || !currentProxy) return
  try {
    await currentProxy.disposeAll()
  } finally {
    try {
      currentProxy[Comlink.releaseProxy]()
    } catch {
      // Older Comlink proxies may not expose releaseProxy.
    }
    currentWorker.terminate()
  }
}
