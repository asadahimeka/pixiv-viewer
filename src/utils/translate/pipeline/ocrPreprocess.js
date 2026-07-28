/**
 * OCR preprocessing — extracts and normalizes sub-image regions for PP-OCRv6.
 */

/**
 * Build PaddleOCR input tensor from a region sub-image.
 * PP-OCRv6 input: [1, 3, 48, N] float32 tensor, BGR, normalized [-1, 1]
 *
 * @param {HTMLImageElement|HTMLCanvasElement} image - Source image
 * @param {{ x: number, y: number, width: number, height: number }} box - Region bounding box
 * @param {object} [options]
 * @param {number} [options.height=48] - Target height (fixed for PP-OCR)
 * @param {number} [options.maxWidth=320] - Max width before splitting
 * @returns {{ tensor: { data: Float32Array, dims: number[], type: string }, width: number }|null}
 */
export function buildPaddleOcrInput(image, box, { height = 48, maxWidth = 320 } = {}) {
  let { x, y, width, height: boxH } = box

  const imgW = image.naturalWidth || image.width
  const imgH = image.naturalHeight || image.height
  x = Math.max(0, Math.round(x))
  y = Math.max(0, Math.round(y))
  const maxX = Math.min(imgW, Math.round(x + width))
  const maxY = Math.min(imgH, Math.round(y + boxH))
  width = maxX - x
  boxH = maxY - y

  if (width < 8 || boxH < 8) return null

  const targetW = Math.max(16, Math.min(width, maxWidth))

  const canvas = document.createElement('canvas')
  canvas.width = targetW
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(image, x, y, width, boxH, 0, 0, targetW, height)

  const imageData = ctx.getImageData(0, 0, targetW, height)
  const pixels = imageData.data

  // NCHW float32 [1, 3, 48, N], BGR normalized [-1, 1]
  const data = new Float32Array(3 * height * targetW)
  for (let i = 0; i < height * targetW; i++) {
    const offset = i * 4
    data[i] = (pixels[offset + 2] / 255 - 0.5) / 0.5
    data[height * targetW + i] = (pixels[offset + 1] / 255 - 0.5) / 0.5
    data[2 * height * targetW + i] = (pixels[offset] / 255 - 0.5) / 0.5
  }

  return {
    tensor: { data, dims: [1, 3, height, targetW], type: 'float32' },
    width: targetW,
  }
}
