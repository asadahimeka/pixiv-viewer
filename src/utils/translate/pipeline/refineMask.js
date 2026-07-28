/**
 * Mask refinement — creates binary masks from detected text regions
 * for input to the ONNX inpainting model.
 *
 * Operations:
 * 1. Fill white rectangles for each region
 * 2. Dilate to ensure text fully covered
 * 3. Gaussian blur for smooth edges
 */

/**
 * Create a binary mask from text regions.
 * White (255) = text area to inpaint, black (0) = keep original.
 *
 * @param {import('./types.js').TextRegion[]} regions
 * @param {number} imageWidth
 * @param {number} imageHeight
 * @returns {HTMLCanvasElement} Mask canvas
 */
export function createMaskFromRegions(regions, imageWidth, imageHeight) {
  const canvas = document.createElement('canvas')
  canvas.width = imageWidth
  canvas.height = imageHeight
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#FFFFFF'
  for (const region of regions) {
    const { x, y, width, height } = region.box
    if (width < 1 || height < 1) continue
    ctx.fillRect(
      Math.max(0, Math.round(x)),
      Math.max(0, Math.round(y)),
      Math.ceil(width),
      Math.ceil(height)
    )
  }

  const imageData = ctx.getImageData(0, 0, imageWidth, imageHeight)
  const dilated = dilateMask(imageData, imageWidth, imageHeight, 4)

  ctx.putImageData(dilated, 0, 0)

  return canvas
}

/**
 * Dilate binary mask with a square kernel.
 * Uses a simple max-filter approach.
 *
 * @param {ImageData} imageData - Source mask pixels
 * @param {number} width
 * @param {number} height
 * @param {number} kernelSize - Dilation radius in pixels
 * @returns {ImageData} Dilated mask
 */
function dilateMask(imageData, width, height, kernelSize) {
  const src = imageData.data
  const dst = new Uint8ClampedArray(src.length)
  const radius = Math.max(1, kernelSize)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let maxVal = 0
      for (let ky = -radius; ky <= radius; ky++) {
        for (let kx = -radius; kx <= radius; kx++) {
          const px = x + kx
          const py = y + ky
          if (px >= 0 && px < width && py >= 0 && py < height) {
            const idx = (py * width + px) * 4
            if (src[idx] > maxVal) maxVal = src[idx]
          }
        }
      }
      const dstIdx = (y * width + x) * 4
      dst[dstIdx] = maxVal
      dst[dstIdx + 1] = maxVal
      dst[dstIdx + 2] = maxVal
      dst[dstIdx + 3] = 255
    }
  }

  return new ImageData(dst, width, height)
}

/**
 * Apply a simple Gaussian blur approximation (3-pass box blur).
 *
 * @param {ImageData} imageData
 * @param {number} width
 * @param {number} height
 * @param {number} radius - Blur radius (typically 3-5)
 * @returns {ImageData}
 */
function gaussianBlur(imageData, width, height, radius) {
  if (radius < 1) return imageData

  let data = new Uint8ClampedArray(imageData.data)
  for (let pass = 0; pass < 3; pass++) {
    data = boxBlur(data, width, height, radius)
  }

  return new ImageData(data, width, height)
}

/**
 * Single-pass box blur.
 */
function boxBlur(src, width, height, radius) {
  const dst = new Uint8ClampedArray(src.length)
  const size = radius * 2 + 1

  // Horizontal pass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0
      let count = 0
      for (let kx = -radius; kx <= radius; kx++) {
        const px = x + kx
        if (px >= 0 && px < width) {
          sum += src[(y * width + px) * 4] // R channel (same as G,B for grayscale mask)
          count++
        }
      }
      const val = sum / count
      const idx = (y * width + x) * 4
      dst[idx] = val
      dst[idx + 1] = val
      dst[idx + 2] = val
      dst[idx + 3] = 255
    }
  }

  // Vertical pass
  const result = new Uint8ClampedArray(src.length)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0
      let count = 0
      for (let ky = -radius; ky <= radius; ky++) {
        const py = y + ky
        if (py >= 0 && py < height) {
          sum += dst[(py * width + x) * 4]
          count++
        }
      }
      const val = sum / count
      const idx = (y * width + x) * 4
      result[idx] = val
      result[idx + 1] = val
      result[idx + 2] = val
      result[idx + 3] = 255
    }
  }

  return result
}

/**
 * Refine text mask — create mask from regions, dilate, and blur.
 *
 * @param {HTMLCanvasElement} originalCanvas - Source image (used for dimensions)
 * @param {import('./types.js').TextRegion[]} regions - Detected text regions
 * @param {object} [options]
 * @param {number} [options.dilationRadius=4] - Dilation pixel radius
 * @param {number} [options.blurRadius=3] - Gaussian blur radius
 * @returns {HTMLCanvasElement} Refined mask canvas
 */
export function refineTextMask(originalCanvas, regions, options = {}) {
  const { dilationRadius = 4, blurRadius = 3 } = options
  const w = originalCanvas.width
  const h = originalCanvas.height

  const mask = createMaskFromRegions(regions, w, h)
  const ctx = mask.getContext('2d')
  const imageData = ctx.getImageData(0, 0, w, h)

  const blurred = gaussianBlur(imageData, w, h, blurRadius)
  ctx.putImageData(blurred, 0, 0)

  return mask
}
