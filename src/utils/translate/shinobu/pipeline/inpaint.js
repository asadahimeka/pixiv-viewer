/**
 * @file ONNX inpainting pipeline stage.
 *
 * Mechanically converted from ShinobuTranslator `src/pipeline/inpaint.ts`
 * (TS → JS). Types → JSDoc @typedef + doc-only import() references.
 * `toErrorMessage` inlined (4-line helper, same pattern as T3/T6/T14).
 */

import { getModel, getModelSession } from '../runtime/modelRegistry.js'
import { isContextLostRuntimeError } from '../runtime/onnxTypes.js'
import { runInference } from '../runtime/onnxBridge.js'
import { clamp } from './utils.js'

// ---------------------------------------------------------------------------
// Doc-only type imports — referenced in JSDoc, zero runtime impact
// ---------------------------------------------------------------------------

/** @typedef {import('../runtime/platform.js').PlatformProvider} PlatformProvider */
/** @typedef {import('../runtime/platform.js').PipelineCanvas} PipelineCanvas */
/** @typedef {import('../runtime/onnxTypes.js').RuntimeProvider} RuntimeProvider */
/** @typedef {import('../runtime/onnxTypes.js').WebNnDeviceType} WebNnDeviceType */
/** @typedef {import('../runtime/onnxWorkerTypes.js').WorkerSessionHandle} WorkerSessionHandle */
/** @typedef {import('../runtime/onnxWorkerTypes.js').TensorTransport} TensorTransport */

// ---------------------------------------------------------------------------
// Types — JSDoc @typedef + placeholder export (T2/T3 convention)
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} InpaintResult
 * @property {PipelineCanvas} canvas - Inpainted result canvas
 * @property {RuntimeProvider} actualProvider - Runtime provider actually used
 * @property {WebNnDeviceType} [actualWebnnDeviceType] - WebNN device type
 */
export const InpaintResult = {}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * @param {unknown} error
 * @returns {string}
 */
function toErrorMessage(error) {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}

/**
 * @typedef {'zero_to_one'|'minus_one_to_one'} InpaintInputNormalize
 */
/**
 * @typedef {'zero_to_one'|'minus_one_to_one'|'zero_to_255'} InpaintOutputNormalize
 */
/**
 * @typedef {'zero_before_normalize'|'zero_after_normalize'} InpaintMaskFill
 */

/**
 * Pick the output tensor with shape [1, 3, H, W] (RGB image).
 * @param {Object.<string, TensorTransport>} outputs
 * @returns {TensorTransport|null}
 */
function pickInpaintTensor(outputs) {
  for (const value of Object.values(outputs)) {
    if (value.dims.length === 4 && value.dims[0] === 1 && value.dims[1] === 3) {
      return value
    }
  }
  return null
}

/**
 * Preprocess image + mask into ONNX model input tensors.
 *
 * @param {PipelineCanvas} source - Original image
 * @param {PipelineCanvas} mask - Refined mask (white = inpaint area)
 * @param {number} size - Model input size (square)
 * @param {InpaintInputNormalize} normalize - Input normalization mode
 * @param {InpaintMaskFill} maskFill - Mask fill timing (before/after normalize)
 * @param {PlatformProvider} platform
 * @returns {{
 *   image: TensorTransport,
 *   mask: TensorTransport,
 *   sourceRgba: Uint8ClampedArray,
 *   maskBinary: Float32Array
 * }}
 */
function preprocessInpaintImage(source, mask, size, normalize, maskFill, platform) {
  const imageCanvas = platform.createCanvas(size, size)
  const imageCtx = imageCanvas.getContext('2d', { willReadFrequently: true })
  if (!imageCtx) {
    throw new Error('去字 ONNX 图像预处理失败')
  }
  imageCtx.drawImage(source, 0, 0, size, size)
  const imageData = imageCtx.getImageData(0, 0, size, size).data

  const maskCanvas = platform.createCanvas(size, size)
  const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true })
  if (!maskCtx) {
    throw new Error('去字 ONNX 遮罩预处理失败')
  }
  maskCtx.drawImage(mask, 0, 0, size, size)
  const maskData = maskCtx.getImageData(0, 0, size, size).data

  const area = size * size
  const imageOut = new Float32Array(3 * area)
  const maskOut = new Float32Array(area)
  const sourceRgba = new Uint8ClampedArray(imageData)
  for (let i = 0, p = 0; i < area; i += 1, p += 4) {
    const maskValue = maskData[p] > 127 ? 1 : 0
    maskOut[i] = maskValue
    const sourceR = imageData[p]
    const sourceG = imageData[p + 1]
    const sourceB = imageData[p + 2]
    if (normalize === 'minus_one_to_one') {
      const r = sourceR / 127.5 - 1
      const g = sourceG / 127.5 - 1
      const b = sourceB / 127.5 - 1
      if (maskValue === 1) {
        const fill = maskFill === 'zero_after_normalize' ? 0 : -1
        imageOut[i] = fill
        imageOut[area + i] = fill
        imageOut[2 * area + i] = fill
      } else {
        imageOut[i] = r
        imageOut[area + i] = g
        imageOut[2 * area + i] = b
      }
    } else {
      imageOut[i] = maskValue === 1 ? 0 : sourceR / 255
      imageOut[area + i] = maskValue === 1 ? 0 : sourceG / 255
      imageOut[2 * area + i] = maskValue === 1 ? 0 : sourceB / 255
    }
  }
  return {
    image: { data: imageOut, dims: [1, 3, size, size], type: 'float32' },
    mask: { data: maskOut, dims: [1, 1, size, size], type: 'float32' },
    sourceRgba,
    maskBinary: maskOut,
  }
}

/**
 * Read RGBA pixel data from a canvas at the given dimensions.
 * @param {PipelineCanvas} source
 * @param {number} width
 * @param {number} height
 * @param {PlatformProvider} platform
 * @returns {Uint8ClampedArray}
 */
function readCanvasRgba(source, width, height, platform) {
  const canvas = platform.createCanvas(width, height)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) {
    throw new Error('去字 ONNX 读取原图失败')
  }
  ctx.drawImage(source, 0, 0, width, height)
  return new Uint8ClampedArray(ctx.getImageData(0, 0, width, height).data)
}

/**
 * Read binary mask (0 or 1) from a canvas at the given dimensions.
 * @param {PipelineCanvas} mask
 * @param {number} width
 * @param {number} height
 * @param {PlatformProvider} platform
 * @returns {Float32Array}
 */
function readMaskBinary(mask, width, height, platform) {
  const canvas = platform.createCanvas(width, height)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) {
    throw new Error('去字 ONNX 读取遮罩失败')
  }
  ctx.drawImage(mask, 0, 0, width, height)
  const data = ctx.getImageData(0, 0, width, height).data
  const out = new Float32Array(width * height)
  for (let i = 0, p = 0; i < out.length; i += 1, p += 4) {
    out[i] = data[p] > 127 ? 1 : 0
  }
  return out
}

/**
 * Resize RGBA pixel data to a new dimensions.
 * @param {Uint8ClampedArray} sourceRgba
 * @param {number} sourceWidth
 * @param {number} sourceHeight
 * @param {number} outWidth
 * @param {number} outHeight
 * @param {PlatformProvider} platform
 * @returns {Uint8ClampedArray}
 */
function resizeRgba(sourceRgba, sourceWidth, sourceHeight, outWidth, outHeight, platform) {
  const sourceCanvas = platform.createCanvas(sourceWidth, sourceHeight)
  const sourceCtx = sourceCanvas.getContext('2d')
  if (!sourceCtx) {
    throw new Error('去字 ONNX 图像缩放失败')
  }
  const sourceImage = sourceCtx.createImageData(sourceWidth, sourceHeight)
  sourceImage.data.set(sourceRgba)
  sourceCtx.putImageData(sourceImage, 0, 0)

  const outCanvas = platform.createCanvas(outWidth, outHeight)
  const outCtx = outCanvas.getContext('2d', { willReadFrequently: true })
  if (!outCtx) {
    throw new Error('去字 ONNX 图像缩放失败')
  }
  outCtx.drawImage(sourceCanvas, 0, 0, outWidth, outHeight)
  return new Uint8ClampedArray(outCtx.getImageData(0, 0, outWidth, outHeight).data)
}

/**
 * Decode a float32 output tensor back to RGBA pixels.
 * @param {TensorTransport} tensor
 * @param {number} width
 * @param {number} height
 * @param {InpaintOutputNormalize} normalize
 * @returns {Uint8ClampedArray}
 */
function decodeInpaintTensor(tensor, width, height, normalize) {
  const area = width * height
  const data = tensor.data
  if (!(data instanceof Float32Array)) {
    throw new Error('去字 ONNX 输出类型不支持')
  }
  const out = new Uint8ClampedArray(area * 4)
  for (let i = 0, p = 0; i < area; i += 1, p += 4) {
    const r = data[i]
    const g = data[area + i]
    const b = data[2 * area + i]
    const rr =
      normalize === 'minus_one_to_one' ? (r + 1) * 127.5 : normalize === 'zero_to_255' ? r : r * 255
    const gg =
      normalize === 'minus_one_to_one' ? (g + 1) * 127.5 : normalize === 'zero_to_255' ? g : g * 255
    const bb =
      normalize === 'minus_one_to_one' ? (b + 1) * 127.5 : normalize === 'zero_to_255' ? b : b * 255
    out[p] = clamp(Math.round(rr), 0, 255)
    out[p + 1] = clamp(Math.round(gg), 0, 255)
    out[p + 2] = clamp(Math.round(bb), 0, 255)
    out[p + 3] = 255
  }
  return out
}

/**
 * Compose the final inpainted canvas: use inpainted pixels for masked areas,
 * original pixels for everything else.
 *
 * @param {Uint8ClampedArray} sourceRgba - Original image pixels at output resolution
 * @param {Uint8ClampedArray} inpaintedRgba - Inpainted pixels at output resolution
 * @param {Float32Array} maskBinary - Binary mask (1 = inpainted, 0 = original)
 * @param {number} width
 * @param {number} height
 * @param {PlatformProvider} platform
 * @returns {PipelineCanvas}
 */
function composeInpaintResult(sourceRgba, inpaintedRgba, maskBinary, width, height, platform) {
  const canvas = platform.createCanvas(width, height)
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('去字 ONNX 合成失败')
  }
  const image = ctx.createImageData(width, height)
  const area = width * height
  for (let i = 0, p = 0; i < area; i += 1, p += 4) {
    const useInpainted = maskBinary[i] >= 0.5
    image.data[p] = useInpainted ? inpaintedRgba[p] : sourceRgba[p]
    image.data[p + 1] = useInpainted ? inpaintedRgba[p + 1] : sourceRgba[p + 1]
    image.data[p + 2] = useInpainted ? inpaintedRgba[p + 2] : sourceRgba[p + 2]
    image.data[p + 3] = 255
  }
  ctx.putImageData(image, 0, 0)
  return canvas
}

/**
 * Heuristic check: is the WebNN inpaint result likely garbage?
 *
 * Returns true when masked areas are nearly all black (inpaint luma ≤ 10)
 * while the source area was reasonably bright (source luma ≥ 40), and ≥ 90%
 * of masked pixels are black. This catches WebNN silent output corruption.
 *
 * @param {Uint8ClampedArray} sourceRgba
 * @param {Uint8ClampedArray} inpaintedRgba
 * @param {Float32Array} maskBinary
 * @returns {boolean}
 */
function isLikelyInvalidInpaintResult(sourceRgba, inpaintedRgba, maskBinary) {
  let maskedCount = 0
  let sourceLumaSum = 0
  let inpaintLumaSum = 0
  let nearlyBlackCount = 0

  for (let i = 0, p = 0; i < maskBinary.length; i += 1, p += 4) {
    if (maskBinary[i] < 0.5) {
      continue
    }
    maskedCount += 1

    const sourceLuma =
      sourceRgba[p] * 0.299 + sourceRgba[p + 1] * 0.587 + sourceRgba[p + 2] * 0.114
    const inpaintLuma =
      inpaintedRgba[p] * 0.299 + inpaintedRgba[p + 1] * 0.587 + inpaintedRgba[p + 2] * 0.114

    sourceLumaSum += sourceLuma
    inpaintLumaSum += inpaintLuma
    if (inpaintLuma <= 8) {
      nearlyBlackCount += 1
    }
  }

  if (maskedCount < 64) {
    return false
  }

  const sourceMean = sourceLumaSum / maskedCount
  const inpaintMean = inpaintLumaSum / maskedCount
  const blackRatio = nearlyBlackCount / maskedCount

  return sourceMean >= 40 && inpaintMean <= 10 && blackRatio >= 0.9
}

// ---------------------------------------------------------------------------
// Core inpainting logic
// ---------------------------------------------------------------------------

/**
 * Run ONNX-based inpainting with fallback chain:
 *   1. Primary provider (from model manifest or preferred list)
 *   2. If GPU: fallback [webnn, wasm] → [wasm]
 *   3. If WebNN result looks invalid (all-black): retry with WASM
 *
 * @param {PipelineCanvas} originalCanvas
 * @param {PipelineCanvas} refinedMaskCanvas
 * @param {PlatformProvider} platform
 * @returns {Promise<InpaintResult>}
 */
async function runInpaintByOnnx(originalCanvas, refinedMaskCanvas, platform) {
  const model = await getModel('inpaint')
  const primaryHandle = await getModelSession('inpaint', ['webgpu', 'webnn', 'wasm'])
  const rawSize = model.input?.[0]
  const size = Number.isFinite(rawSize) ? rawSize : 512
  const normalize = model.normalize ?? 'zero_to_one'
  const outputNormalize = model.outputNormalize ?? normalize
  const maskFill = model.maskFill ?? 'zero_before_normalize'
  if (refinedMaskCanvas.width <= 0 || refinedMaskCanvas.height <= 0) {
    throw new Error('去字 ONNX 缺少有效 refined mask，已禁用文本框遮罩回退')
  }
  const feeds = preprocessInpaintImage(originalCanvas, refinedMaskCanvas, size, normalize, maskFill, platform)

  /**
   * Run inference with a specific session handle.
   * @param {WorkerSessionHandle} handle
   * @returns {Promise<Object.<string, TensorTransport>>}
   */
  const runWithHandle = async handle => {
    const imageName = handle.inputNames[0]
    const maskName = model.maskInputName ?? handle.inputNames[1]
    if (!imageName || !maskName) {
      throw new Error('去字 ONNX 模型输入定义不完整')
    }
    const result = await runInference(handle.sessionId, {
      [imageName]: feeds.image,
      [maskName]: feeds.mask,
    })
    if (result.error) throw new Error(result.error)
    return result.outputs
  }

  /**
   * Decode output tensors to RGBA.
   * @param {Object.<string, TensorTransport>} outputs
   * @returns {Uint8ClampedArray}
   */
  const decodeOutputs = outputs => {
    const outTensor = pickInpaintTensor(outputs)
    if (!outTensor) {
      throw new Error('去字 ONNX 模型输出未匹配到图像张量')
    }
    return decodeInpaintTensor(outTensor, size, size, outputNormalize)
  }

  /** @type {RuntimeProvider} */
  let actualProvider = primaryHandle.provider
  /** @type {WebNnDeviceType|undefined} */
  let actualWebnnDeviceType = primaryHandle.webnnDeviceType
  let outputTensors
  try {
    outputTensors = await runWithHandle(primaryHandle)
  } catch (error) {
    const message = toErrorMessage(error)
    const reason = isContextLostRuntimeError(error) ? 'context lost' : 'run failed'
    if (primaryHandle.provider === 'wasm') {
      throw error
    }

    /** @type {Array<Array<RuntimeProvider>>} */
    const fallbackPlans = []
    if (primaryHandle.provider === 'webgpu') {
      fallbackPlans.push(['webnn', 'wasm'])
    }
    fallbackPlans.push(['wasm'])

    let recovered = null
    let lastFallbackError = null
    console.warn(`[inpaint] ${primaryHandle.provider} ${reason}, 尝试回退: ${message}`)

    for (const preferred of fallbackPlans) {
      try {
        const handle = await getModelSession('inpaint', preferred)
        recovered = await runWithHandle(handle)
        if (handle.provider !== primaryHandle.provider) {
          console.warn(`[inpaint] 已回退到 ${handle.provider}`)
          actualProvider = handle.provider
          actualWebnnDeviceType = handle.webnnDeviceType
        }
        break
      } catch (fallbackError) {
        lastFallbackError = fallbackError
      }
    }

    if (!recovered) {
      const fallbackMessage = lastFallbackError ? toErrorMessage(lastFallbackError) : '未知错误'
      throw new Error(`去字推理失败且回退失败: ${message} | fallback: ${fallbackMessage}`)
    }

    outputTensors = recovered
  }

  let inpaintedRgba = decodeOutputs(outputTensors)

  // WebNN silent corruption guard: retry with WASM if result looks broken
  if (
    actualProvider === 'webnn' &&
    isLikelyInvalidInpaintResult(feeds.sourceRgba, inpaintedRgba, feeds.maskBinary)
  ) {
    const wasmHandle = await getModelSession('inpaint', ['wasm'])
    const wasmOutputTensors = await runWithHandle(wasmHandle)
    inpaintedRgba = decodeOutputs(wasmOutputTensors)
    actualProvider = 'wasm'
    actualWebnnDeviceType = undefined
  }

  const outputWidth = originalCanvas.width
  const outputHeight = originalCanvas.height
  const originalSourceRgba = readCanvasRgba(originalCanvas, outputWidth, outputHeight, platform)
  const originalMaskBinary = readMaskBinary(refinedMaskCanvas, outputWidth, outputHeight, platform)
  const inpaintedRgbaAtOriginalSize = resizeRgba(inpaintedRgba, size, size, outputWidth, outputHeight, platform)

  const canvas = composeInpaintResult(
    originalSourceRgba,
    inpaintedRgbaAtOriginalSize,
    originalMaskBinary,
    outputWidth,
    outputHeight,
    platform
  )

  return { canvas, actualProvider, actualWebnnDeviceType }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run text inpainting (erase) on the original image using the refined mask.
 *
 * This is the main entry point for the erasure stage. It delegates to
 * `runInpaintByOnnx` which handles model loading, preprocessing, ONNX
 * inference with fallback retry, and result compositing.
 *
 * @param {PipelineCanvas} originalCanvas - Original image canvas
 * @param {PipelineCanvas} refinedMaskCanvas - Refined binary mask canvas (white = erase)
 * @param {PlatformProvider} platform - Platform abstraction (browser)
 * @returns {Promise<InpaintResult>} Inpainted canvas + runtime metadata
 */
export async function runInpaint(originalCanvas, refinedMaskCanvas, platform) {
  return runInpaintByOnnx(originalCanvas, refinedMaskCanvas, platform)
}
