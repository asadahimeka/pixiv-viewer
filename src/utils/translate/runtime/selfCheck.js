/**
 * @file Runtime environment self-check
 *
 * Probes available WebGPU, WASM (via ONNX Runtime), and WebNN capabilities
 * to determine the optimal execution provider for ONNX inference.
 * Non-blocking — all checks wrap errors gracefully.
 * Adapted from ShinobuTranslator src/runtime/selfCheck.ts
 */

/**
 * @typedef {Object} RuntimeCheckResult
 * @property {'checking'|'available'|'unavailable'|'error'} webgpu
 * @property {'checking'|'available'|'unavailable'|'error'} wasm
 * @property {'checking'|'available'|'unavailable'|'error'} webnn
 * @property {'webgpu'|'wasm'|'webnn'} recommended - Best available provider
 * @property {boolean} secureContext - Whether window.isSecureContext
 * @property {Object} [details] - Additional debug info
 */

/**
 * Perform runtime environment check.
 * Returns a promise that resolves to a RuntimeCheckResult.
 * Never throws — all errors are caught and reflected in result fields.
 *
 * @returns {Promise<RuntimeCheckResult>}
 */
export async function selfCheck() {
  const result = {
    webgpu: 'unavailable',
    wasm: 'unavailable',
    webnn: 'unavailable',
    recommended: 'wasm',
    secureContext: false,
    details: {},
  }

  try {
    result.secureContext = !!(window && window.isSecureContext)
  } catch (_) {
    result.secureContext = false
  }

  // WebGPU check
  try {
    if (navigator.gpu) {
      const adapter = await navigator.gpu.requestAdapter()
      if (adapter) {
        result.webgpu = 'available'
        result.details.webgpuAdapter = adapter.name || 'unknown'
      } else {
        result.webgpu = 'unavailable'
      }
    } else {
      result.webgpu = 'unavailable'
    }
  } catch (err) {
    result.webgpu = 'error'
    result.details.webgpuError = err.message
  }

  // WebNN check
  try {
    if (navigator.ml) {
      const context = await navigator.ml.getNeuralNetworkContext()
      if (context) {
        result.webnn = 'available'
      } else {
        result.webnn = 'unavailable'
      }
    } else {
      result.webnn = 'unavailable'
    }
  } catch (err) {
    result.webnn = 'error'
    result.details.webnnError = err.message
  }

  // WASM is assumed available when the page loads (ORT always has WASM fallback)
  try {
    // Simple check: WASM is supported if WebAssembly is available
    if (typeof WebAssembly !== 'undefined' && WebAssembly.validate) {
      result.wasm = 'available'
    } else {
      result.wasm = 'unavailable'
    }
  } catch (err) {
    result.wasm = 'error'
    result.details.wasmError = err.message
  }

  // Determine recommended provider
  if (result.webgpu === 'available') {
    result.recommended = 'webgpu'
  } else if (result.webnn === 'available') {
    result.recommended = 'webnn'
  } else {
    result.recommended = 'wasm'
  }

  console.log('[selfCheck] Runtime:', JSON.stringify(result, null, 2))
  return result
}

/**
 * Quick synchronous check for runtime recommendation.
 * Useful for UI components that need a fast answer.
 *
 * @returns {'webgpu'|'wasm'|'webnn'}
 */
export function getRuntimeRecommendation() {
  // This is a simple default; call selfCheck() for accurate results
  if (typeof WebAssembly !== 'undefined') return 'wasm'
  return 'wasm'
}
