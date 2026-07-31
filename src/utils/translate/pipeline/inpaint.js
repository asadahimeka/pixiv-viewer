/**
 * Inpainting module — text removal using aot_inpaint_512.onnx.
 *
 * Takes original image and a mask marking text regions,
 * runs ONNX inference to fill text areas with background-like content.
 * Supports region-crop inpainting for better quality on localized text.
 */

import { runInference, loadModel, getModelSession } from '../onnx/index.js'
import { getModelUrl } from '../onnx/modelRegistry.js'

/**
 * Normalize pixel values to [-1, 1] range.
 * @param {ImageData} imageData
 * @param {number} width
 * @param {number} height
 * @returns {Float32Array} Float32 tensor [3, H, W], RGB, normalized [-1, 1]
 */
function normalizeImage(imageData, width, height) {
  const data = new Float32Array(3 * height * width)
  const pixels = imageData.data
  for (let i = 0; i < height * width; i++) {
    const offset = i * 4
    data[i] = (pixels[offset] / 255) * 2 - 1
    data[height * width + i] = (pixels[offset + 1] / 255) * 2 - 1
    data[2 * height * width + i] = (pixels[offset + 2] / 255) * 2 - 1
  }
  return data
}

/**
 * Normalize mask to [0, 1] range for the model.
 * Mask is binary: 0 = keep, 1 = inpaint
 * @param {ImageData} imageData
 * @param {number} width
 * @param {number} height
 * @returns {Float32Array} Float32 mask [1, H, W], values 0 or 1
 */
function normalizeMask(imageData, width, height) {
  const data = new Float32Array(height * width)
  const pixels = imageData.data
  for (let i = 0; i < height * width; i++) {
    data[i] = pixels[i * 4] > 128 ? 1 : 0
  }
  return data
}

/**
 * Denormalize output tensor back to RGBA ImageData.
 * @param {Float32Array} data - [3, H, W] float32, values in [-1, 1]
 * @param {number} width
 * @param {number} height
 * @returns {ImageData}
 */
function denormalizeOutput(data, width, height) {
  const output = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    const r = data[i]
    const g = data[width * height + i]
    const b = data[2 * width * height + i]
    output[i * 4] = Math.round((Math.max(-1, Math.min(1, r)) + 1) / 2 * 255)
    output[i * 4 + 1] = Math.round((Math.max(-1, Math.min(1, g)) + 1) / 2 * 255)
    output[i * 4 + 2] = Math.round((Math.max(-1, Math.min(1, b)) + 1) / 2 * 255)
    output[i * 4 + 3] = 255
  }
  return new ImageData(output, width, height)
}

/**
 * Check if the output is valid (not all black/textureless).
 * @param {ImageData} imageData
 * @returns {boolean}
 */
function isValidOutput(imageData) {
  const pixels = imageData.data
  let total = 0
  let darkCount = 0
  for (let i = 0; i < pixels.length; i += 4) {
    total++
    const brightness = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3
    if (brightness < 10) darkCount++
  }
  return darkCount / total < 0.8
}

/**
 * Check if mask is effectively empty (no text to inpaint).
 * @param {HTMLCanvasElement} maskCanvas
 * @returns {boolean}
 */
function isMaskEmpty(maskCanvas) {
  const ctx = maskCanvas.getContext('2d')
  const imageData = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height)
  const pixels = imageData.data
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i] > 0) return false
  }
  return true
}

/**
 * Composite inpainted result with original using mask.
 * 1. Draw original
 * 2. Cut out mask areas (destination-out)
 * 3. Paste inpainted content in those areas (source-over)
 * @param {HTMLCanvasElement} originalCanvas
 * @param {HTMLCanvasElement} maskCanvas
 * @param {HTMLCanvasElement} resultCanvas - Inpainted result (will be resized to original dims)
 * @returns {HTMLCanvasElement}
 */
function compositeResult(originalCanvas, maskCanvas, resultCanvas) {
  const w = originalCanvas.width
  const h = originalCanvas.height

  const base = document.createElement('canvas')
  base.width = w
  base.height = h
  const ctx = base.getContext('2d')

  ctx.drawImage(originalCanvas, 0, 0)
  ctx.globalCompositeOperation = 'destination-out'
  ctx.drawImage(maskCanvas, 0, 0)
  ctx.globalCompositeOperation = 'source-over'
  ctx.drawImage(resultCanvas, 0, 0, w, h)

  return base
}

/**
 * Full-image inpainting: resize entire original + mask to model size,
 * run inference, then composite back (original fallback behavior).
 * @param {HTMLCanvasElement} originalCanvas
 * @param {HTMLCanvasElement} maskCanvas
 * @param {Worker} worker
 * @param {number} modelSize
 * @returns {Promise<HTMLCanvasElement>}
 */
async function fullImageInpaint(originalCanvas, maskCanvas, worker, modelSize) {
  if (isMaskEmpty(maskCanvas)) {
    console.debug('[inpaint] Mask is empty — no inpainting needed')
    const result = document.createElement('canvas')
    result.width = originalCanvas.width
    result.height = originalCanvas.height
    result.getContext('2d').drawImage(originalCanvas, 0, 0)
    return result
  }

  const origWidth = originalCanvas.width
  const origHeight = originalCanvas.height

  const modelUrl = await getModelUrl('inpaint')
  await getModelSession('inpaint', modelUrl)

  const resizeCanvas = source => {
    const c = document.createElement('canvas')
    c.width = modelSize
    c.height = modelSize
    const ctx = c.getContext('2d')
    ctx.drawImage(source, 0, 0, modelSize, modelSize)
    return c
  }

  const resizedOriginal = resizeCanvas(originalCanvas)
  const resizedMask = resizeCanvas(maskCanvas)

  const origCtx = resizedOriginal.getContext('2d')
  const maskCtx = resizedMask.getContext('2d')
  const origImageData = origCtx.getImageData(0, 0, modelSize, modelSize)
  const maskImageData = maskCtx.getImageData(0, 0, modelSize, modelSize)

  const imageTensor = normalizeImage(origImageData, modelSize, modelSize)
  const maskTensor = normalizeMask(maskImageData, modelSize, modelSize)

  const feeds = {
    image: { data: imageTensor, dims: [1, 3, modelSize, modelSize], type: 'float32' },
    mask: { data: maskTensor, dims: [1, 1, modelSize, modelSize], type: 'float32' },
  }

  const outputs = await runInference(worker, feeds)

  let outputData = null
  for (const tensor of Object.values(outputs)) {
    if (tensor.dims && tensor.dims.length === 4 && tensor.dims[1] === 3 && tensor.dims[2] === modelSize) {
      outputData = tensor.data
      break
    }
  }
  if (!outputData) {
    const firstOutput = Object.values(outputs)[0]
    outputData = firstOutput?.data
  }
  if (!outputData) throw new Error('Failed to find valid output tensor from inpainting model')

  const outputImageData = denormalizeOutput(outputData, modelSize, modelSize)

  if (!isValidOutput(outputImageData)) {
    console.debug('[inpaint] Model produced invalid (all-dark) output — returning original')
    const result = document.createElement('canvas')
    result.width = origWidth
    result.height = origHeight
    result.getContext('2d').drawImage(originalCanvas, 0, 0)
    return result
  }

  const result512 = document.createElement('canvas')
  result512.width = modelSize
  result512.height = modelSize
  result512.getContext('2d').putImageData(outputImageData, 0, 0)

  return compositeResult(originalCanvas, maskCanvas, result512)
}

/**
 * Region-crop inpainting: for each text region, crop + pad + resize to 512×512,
 * inpaint, resize back, and composite onto a growing result canvas.
 * Regions are processed sequentially so later ones overlay earlier.
 * @param {HTMLCanvasElement} originalCanvas
 * @param {HTMLCanvasElement} maskCanvas
 * @param {Worker} worker
 * @param {Array} regions - Text regions with box { x, y, width, height }
 * @param {number} modelSize
 * @returns {Promise<HTMLCanvasElement>}
 */
async function regionCropInpaint(originalCanvas, maskCanvas, worker, regions, modelSize) {
  const modelUrl = await getModelUrl('inpaint')
  await getModelSession('inpaint', modelUrl)

  const origWidth = originalCanvas.width
  const origHeight = originalCanvas.height

  // Start with a copy of the original as the base
  const baseCanvas = document.createElement('canvas')
  baseCanvas.width = origWidth
  baseCanvas.height = origHeight
  const baseCtx = baseCanvas.getContext('2d')
  baseCtx.drawImage(originalCanvas, 0, 0)

  for (const region of regions) {
    const { box } = region
    const padding = Math.max(32, Math.round(box.width * 0.2))

    // Calculate crop region (clamp to image bounds)
    const cropX = Math.max(0, Math.round(box.x - padding))
    const cropY = Math.max(0, Math.round(box.y - padding))
    const cropW = Math.min(origWidth - cropX, Math.round(box.width + padding * 2))
    const cropH = Math.min(origHeight - cropY, Math.round(box.height + padding * 2))

    if (cropW <= 0 || cropH <= 0) continue

    // Extract crop from original and mask
    const cropCanvas = document.createElement('canvas')
    cropCanvas.width = modelSize
    cropCanvas.height = modelSize
    const cropCtx = cropCanvas.getContext('2d')
    cropCtx.drawImage(originalCanvas, cropX, cropY, cropW, cropH, 0, 0, modelSize, modelSize)

    const maskCropCanvas = document.createElement('canvas')
    maskCropCanvas.width = modelSize
    maskCropCanvas.height = modelSize
    const maskCropCtx = maskCropCanvas.getContext('2d')
    maskCropCtx.drawImage(maskCanvas, cropX, cropY, cropW, cropH, 0, 0, modelSize, modelSize)

    // Prepare tensors
    const cropImageData = cropCtx.getImageData(0, 0, modelSize, modelSize)
    const maskImageData = maskCropCtx.getImageData(0, 0, modelSize, modelSize)

    const imageTensor = normalizeImage(cropImageData, modelSize, modelSize)
    const maskTensor = normalizeMask(maskImageData, modelSize, modelSize)

    const feeds = {
      image: { data: imageTensor, dims: [1, 3, modelSize, modelSize], type: 'float32' },
      mask: { data: maskTensor, dims: [1, 1, modelSize, modelSize], type: 'float32' },
    }

    const outputs = await runInference(worker, feeds)

    // Find output tensor
    let outputData = null
    for (const tensor of Object.values(outputs)) {
      if (tensor.dims && tensor.dims.length === 4 && tensor.dims[1] === 3 && tensor.dims[2] === modelSize) {
        outputData = tensor.data
        break
      }
    }
    if (!outputData) {
      const firstOutput = Object.values(outputs)[0]
      outputData = firstOutput?.data
    }
    if (!outputData) continue

    const outputImageData = denormalizeOutput(outputData, modelSize, modelSize)

    if (!isValidOutput(outputImageData)) continue

    // Resize inpainted crop back to original crop size
    const inpaintCropCanvas = document.createElement('canvas')
    inpaintCropCanvas.width = cropW
    inpaintCropCanvas.height = cropH
    const inpaintCropCtx = inpaintCropCanvas.getContext('2d')
    // Draw the 512×512 model output, resized to crop dimensions
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = modelSize
    tempCanvas.height = modelSize
    tempCanvas.getContext('2d').putImageData(outputImageData, 0, 0)
    inpaintCropCtx.drawImage(tempCanvas, 0, 0, modelSize, modelSize, 0, 0, cropW, cropH)

    // Composite the inpainted crop onto the base
    baseCtx.save()
    baseCtx.globalCompositeOperation = 'source-over'
    baseCtx.drawImage(inpaintCropCanvas, cropX, cropY)
    baseCtx.restore()
  }

  return baseCanvas
}

/**
 * Run inpainting using aot_inpaint_512.onnx.
 *
 * Supports region-crop mode for better quality on localized text regions,
 * with automatic fallback to full-image inpainting when regions are too
 * numerous or cover too much of the image.
 *
 * @param {HTMLCanvasElement} originalCanvas - Source image canvas
 * @param {HTMLCanvasElement} maskCanvas - Binary mask (white = text to remove)
 * @param {Worker} worker - ONNX inference worker
 * @param {object} [options] - Optional settings
 * @param {Array} [options.regions=[]] - Text regions for crop-inpainting
 * @param {boolean} [options.useRegionInpainting=true] - Enable region-crop mode
 * @returns {Promise<HTMLCanvasElement>} Inpainted canvas (same dimensions as original)
 */
export async function runInpaint(originalCanvas, maskCanvas, worker, options = {}) {
  const {
    regions = [],
    useRegionInpainting = true,
  } = options

  const origWidth = originalCanvas.width
  const origHeight = originalCanvas.height
  const modelSize = 512

  // Determine if we should use region-crop or full-image
  const totalRegionArea = regions.reduce((sum, r) => sum + r.box.width * r.box.height, 0)
  const totalImageArea = origWidth * origHeight
  const useRegionMode = useRegionInpainting &&
    regions.length <= 50 &&
    totalRegionArea / totalImageArea < 0.5

  if (useRegionMode && regions.length > 0) {
    return await regionCropInpaint(originalCanvas, maskCanvas, worker, regions, modelSize)
  } else {
    return await fullImageInpaint(originalCanvas, maskCanvas, worker, modelSize)
  }
}
