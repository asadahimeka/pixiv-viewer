/**
 * @file Shinobu runtime self-check — main thread.
 *
 * Mechanically converted from ShinobuTranslator `src/runtime/selfCheck.ts`
 * (TS → JS). Performs lightweight browser capability probes in the main
 * thread (WASM, WebGPU, Secure Context, WebNN API), then delegates heavy
 * ONNX session creation to the comlink worker via `onnxBridge.probeRuntime()`.
 *
 * Old `src/utils/translate/runtime/selfCheck.js` WASM check logic
 * (WebAssembly.validate) is preserved as a lightweight pre-check.
 *
 * No extension runtime references — pixiv-viewer is a webapp, not an extension.
 */

// ---------------------------------------------------------------------------
// Types — mechanically converted from Shinobu source, matching exactly
// ---------------------------------------------------------------------------

/** @typedef {'pass'|'warn'|'fail'|'running'|'skip'} CheckStatus */

/**
 * @typedef {Object} RuntimeCheckItem
 * @property {string} id
 * @property {string} title
 * @property {CheckStatus} status
 * @property {string} [code]
 * @property {string} message
 * @property {string} [detail]
 */

/**
 * @typedef {Object} RuntimeSelfCheckReport
 * @property {string} createdAt
 * @property {{ url: string, secureContext: boolean, crossOriginIsolated: boolean, userAgent: string, ortVersion?: string }} env
 * @property {RuntimeCheckItem[]} checks
 * @property {{ ok: boolean, effectiveRuntime: 'webnn'|'wasm'|'webgpu'|'cuda'|'cpu'|'none', reason: string }} summary
 */

export const RuntimeSelfCheckReport = {}
export const RuntimeCheckItem = {}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run a comprehensive runtime self-check. Lightweight checks probe
 * WASM/WebGPU/WebNN API availability in the main thread; heavy ONNX
 * session verification is delegated to the worker via probeRuntime.
 *
 * @param {string} [modelUrl] Diagnostic ONNX model URL (defaults to the
 *   resolved paddleocr model URL — same resolution the pipeline uses)
 * @returns {Promise<RuntimeSelfCheckReport>}
 */
export async function runRuntimeSelfCheck(modelUrl) {
  /** @type {RuntimeCheckItem[]} */
  const checks = []
  const nav = typeof navigator === 'undefined' ? null : navigator
  const ua = nav?.userAgent ?? 'unknown'
  const isSecure = typeof window !== 'undefined' && window.isSecureContext === true
  const crossOriginIsolated = typeof window !== 'undefined' && window.crossOriginIsolated === true

  // 1. WASM lightweight check (preserved from old selfCheck.js)
  const wasmAvailable = typeof WebAssembly !== 'undefined' && typeof WebAssembly.validate === 'function'
  checks.push({
    id: 'wasm.api',
    title: 'WASM 支持',
    status: wasmAvailable ? 'pass' : 'fail',
    code: wasmAvailable ? undefined : 'A001_WASM_UNAVAILABLE',
    message: wasmAvailable ? 'WebAssembly 可用' : 'WebAssembly 不可用，浏览器不支持 WASM',
    detail: 'WebAssembly.validate=function',
  })

  // 2. WebGPU lightweight check (preserved from old selfCheck.js pattern)
  let webgpuAvailable = false
  try {
    if (nav?.gpu) {
      const adapter = await nav.gpu.requestAdapter()
      webgpuAvailable = adapter !== null
      checks.push({
        id: 'webgpu.api',
        title: 'WebGPU API',
        status: webgpuAvailable ? 'pass' : 'warn',
        code: webgpuAvailable ? undefined : 'A002_WEBGPU_NO_ADAPTER',
        message: webgpuAvailable
          ? 'WebGPU 适配器可用' + (adapter && adapter.name ? ' (' + adapter.name + ')' : '')
          : 'WebGPU API 可见但无可用适配器',
        detail: `adapter=${adapter ? (adapter.name || 'unnamed') : 'null'}`,
      })
    } else {
      checks.push({
        id: 'webgpu.api',
        title: 'WebGPU API',
        status: 'fail',
        code: 'A003_WEBGPU_UNAVAILABLE',
        message: 'navigator.gpu 不可用，当前浏览器不支持 WebGPU',
        detail: `ua=${ua}`,
      })
    }
  } catch (error) {
    checks.push({
      id: 'webgpu.api',
      title: 'WebGPU API',
      status: 'warn',
      code: 'A004_WEBGPU_ERROR',
      message: 'WebGPU 探测异常',
      detail: toErrorMessage(error),
    })
  }

  // 3. Secure context check
  checks.push({
    id: 'env.security',
    title: '浏览器安全上下文',
    status: isSecure ? 'pass' : 'fail',
    code: isSecure ? undefined : 'S001_INSECURE_CONTEXT',
    message: isSecure ? '当前页面为安全上下文' : '当前页面不是安全上下文，WebNN/WebGPU 可能不可用',
    detail: `isSecureContext=${String(isSecure)}, crossOriginIsolated=${String(crossOriginIsolated)}`,
  })

  // 4. WebNN API check
  const hasMlApi = Boolean(nav?.ml)
  checks.push({
    id: 'webnn.api',
    title: 'WebNN API 可见性',
    status: hasMlApi ? 'pass' : 'fail',
    code: hasMlApi ? undefined : 'B002_NO_WEBNN',
    message: hasMlApi ? 'navigator.ml 可用' : 'navigator.ml 不可用',
    detail: `ua=${ua}`,
  })

  // 5. Delegate heavy ONNX session checks to the worker
  /** @type {RuntimeSelfCheckReport | null} */
  let workerReport = null
  try {
    if (!modelUrl) {
      const { getModel } = await import('./modelRegistry.js')
      const model = await getModel('bubble')
      modelUrl = model.url
    }
    const onnxBridge = await import('./onnxBridge.js')
    workerReport = await onnxBridge.probeRuntime(modelUrl)
    // Append worker checks (skip duplicates — worker checks have ort.* prefix)
    checks.push(...workerReport.checks)
  } catch (error) {
    checks.push({
      id: 'ort.worker',
      title: 'ONNX 诊断 Worker',
      status: 'fail',
      code: 'O001_WORKER_PROBE_FAILED',
      message: '无法连接到 ONNX 诊断 Worker',
      detail: toErrorMessage(error),
    })
  }

  // 6. Compute summary
  const workerOk = workerReport?.summary?.ok ?? false
  const effectiveRuntime = webgpuAvailable
    ? 'webgpu'
    : workerReport?.summary?.effectiveRuntime === 'webnn'
      ? 'webnn'
      : wasmAvailable || workerReport?.summary?.effectiveRuntime === 'wasm'
        ? 'wasm'
        : 'none'
  const reason = effectiveRuntime === 'webgpu'
    ? 'WebGPU 可用'
    : effectiveRuntime === 'webnn'
      ? 'WebNN 可用'
      : effectiveRuntime === 'wasm'
        ? 'WASM 可用'
        : 'WebGPU/WebNN/WASM 均不可用，请检查浏览器环境'

  return {
    createdAt: new Date().toISOString(),
    env: {
      url: typeof window !== 'undefined' ? String(window.location?.href ?? '') : '',
      secureContext: isSecure,
      crossOriginIsolated,
      userAgent: ua,
      ortVersion: workerReport?.env?.ortVersion,
    },
    checks,
    summary: {
      ok: webgpuAvailable || workerOk || wasmAvailable,
      effectiveRuntime,
      reason,
    },
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Safely extract an error message from any thrown value.
 * @param {unknown} error
 * @returns {string}
 */
function toErrorMessage(error) {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  try { return JSON.stringify(error) } catch (_resolve) { return String(error) }
}
