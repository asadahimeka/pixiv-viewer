/**
 * Text detection module — manga page text region detection.
 *
 * Uses ONNX detector.onnx for ML-based detection with a heuristic
 * edge-detection fallback when ONNX is unavailable or returns no results.
 */

import { createWorker, loadModel, runInference, getModelSession } from '../onnx/index.js'
import { getModelUrl } from '../onnx/modelRegistry.js'
import { createTextRegion } from './types.js'

/**
 * Preprocess an image to a 1024×1024 float32 tensor for detector.onnx.
 * Letterboxes the image (white padding) to maintain aspect ratio.
 *
 * @param {HTMLImageElement|HTMLCanvasElement} image
 * @returns {{ tensor: { data: Float32Array, dims: number[], type: string }, scale: number, offsetX: number, offsetY: number, origWidth: number, origHeight: number }}
 */
function preprocessImage(image) {
  const origWidth = image.naturalWidth || image.width
  const origHeight = image.naturalHeight || image.height

  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 1024
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, 1024, 1024)

  const scale = Math.min(1024 / origWidth, 1024 / origHeight)
  const w = origWidth * scale
  const h = origHeight * scale
  const x = (1024 - w) / 2
  const y = (1024 - h) / 2
  ctx.drawImage(image, x, y, w, h)

  const imageData = ctx.getImageData(0, 0, 1024, 1024)
  const pixels = imageData.data

  // NCHW float32 tensor [1, 3, 1024, 1024], RGB normalized [0, 1]
  const data = new Float32Array(3 * 1024 * 1024)
  for (let i = 0; i < 1024 * 1024; i++) {
    const offset = i * 4
    data[i] = pixels[offset] / 255
    data[1024 * 1024 + i] = pixels[offset + 1] / 255
    data[2 * 1024 * 1024 + i] = pixels[offset + 2] / 255
  }

  return {
    tensor: { data, dims: [1, 3, 1024, 1024], type: 'float32' },
    scale,
    offsetX: x,
    offsetY: y,
    origWidth,
    origHeight,
  }
}

/**
 * Find connected components in a binary image using flood-fill (4-direction).
 *
 * @param {Uint8Array} binary - Flattened binary image (0/1)
 * @param {number} W - Image width
 * @param {number} H - Image height
 * @returns {Array<Array<[number, number]>>} Array of component pixel lists
 */
function findConnectedComponents(binary, W, H) {
  const visited = new Uint8Array(W * H)
  const components = []

  function floodFill(startX, startY) {
    const stack = [[startX, startY]]
    const pixels = []
    while (stack.length > 0) {
      const [cx, cy] = stack.pop()
      if (cx < 0 || cx >= W || cy < 0 || cy >= H) continue
      const idx = cy * W + cx
      if (visited[idx] || !binary[idx]) continue
      visited[idx] = 1
      pixels.push([cx, cy])
      stack.push([cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1])
    }
    return pixels
  }

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = y * W + x
      if (!visited[idx] && binary[idx]) {
        const pixels = floodFill(x, y)
        if (pixels.length > 10) {
          components.push(pixels)
        }
      }
    }
  }

  return components
}

/**
 * Map component pixels to a TextRegion in original image coordinates.
 *
 * @param {Array<[number, number]>} pixels
 * @param {{ scale: number, offsetX: number, offsetY: number, origWidth: number, origHeight: number }} mapping
 * @returns {import('./types.js').TextRegion}
 */
function componentToRegion(pixels, { scale, offsetX, offsetY, origWidth, origHeight }) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const [px, py] of pixels) {
    if (px < minX) minX = px
    if (py < minY) minY = py
    if (px > maxX) maxX = px
    if (py > maxY) maxY = py
  }

  const mapX = x1024 => (x1024 - offsetX) / scale
  const mapY = y1024 => (y1024 - offsetY) / scale

  const direction = (maxX - minX) > (maxY - minY) ? 'h' : 'v'

  return createTextRegion({
    id: `r${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    box: {
      x: mapX(minX),
      y: mapY(minY),
      width: mapX(maxX) - mapX(minX),
      height: mapY(maxY) - mapY(minY),
    },
    direction,
    prob: 0.8,
  })
}

/**
 * Postprocess ONNX detector output to extract text regions.
 * Applies sigmoid → threshold → connected components → bounding boxes.
 *
 * @param {{ data: Float32Array, dims: number[] }} output - ONNX inference output
 * @param {{ scale: number, offsetX: number, offsetY: number, origWidth: number, origHeight: number }} preprocessed
 * @returns {import('./types.js').TextRegion[]}
 */
function postprocessDetector(output, preprocessed) {
  const { data, dims } = output
  const { scale, offsetX, offsetY, origWidth, origHeight } = preprocessed

  const H = dims[dims.length - 2] || 1024
  const W = dims[dims.length - 1] || 1024

  const threshold = 0.3
  const binary = new Uint8Array(H * W)
  for (let i = 0; i < H * W; i++) {
    const prob = 1 / (1 + Math.exp(-data[i]))
    binary[i] = prob > threshold ? 1 : 0
  }

  const components = findConnectedComponents(binary, W, H)

  const regions = components.map(pixels =>
    componentToRegion(pixels, { scale, offsetX, offsetY, origWidth, origHeight })
  )

  // Filter by area: discard tiny noise and overly large regions
  return regions.filter(r => {
    const area = r.box.width * r.box.height
    const imgArea = origWidth * origHeight
    return area > imgArea * 0.001 && area < imgArea * 0.8
  })
}

/**
 * Sobel edge detection on a grayscale image.
 *
 * @param {Uint8Array} gray - Flattened grayscale pixels [0-255]
 * @param {number} width
 * @param {number} height
 * @returns {Uint8Array} Edge magnitude [0-255]
 */
function sobelEdgeDetect(gray, width, height) {
  const edges = new Uint8Array(width * height)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x
      const gx =
        -gray[idx - width - 1] + gray[idx - width + 1] -
        2 * gray[idx - 1] + 2 * gray[idx + 1] -
        gray[idx + width - 1] + gray[idx + width + 1]
      const gy =
        -gray[idx - width - 1] - 2 * gray[idx - width] - gray[idx - width + 1] +
        gray[idx + width - 1] + 2 * gray[idx + width] + gray[idx + width + 1]
      edges[idx] = Math.min(255, Math.sqrt(gx * gx + gy * gy))
    }
  }
  return edges
}

/**
 * Heuristic fallback: edge detection + connected components.
 * Used when ONNX inference fails or returns no regions.
 *
 * @param {HTMLImageElement|HTMLCanvasElement} image
 * @returns {Promise<import('./types.js').TextRegion[]>}
 */
async function heuristicDetect(image) {
  const origWidth = image.naturalWidth || image.width
  const origHeight = image.naturalHeight || image.height

  const canvas = document.createElement('canvas')
  canvas.width = origWidth
  canvas.height = origHeight
  const ctx = canvas.getContext('2d')
  ctx.drawImage(image, 0, 0)
  const imageData = ctx.getImageData(0, 0, origWidth, origHeight)

  const gray = new Uint8Array(origWidth * origHeight)
  for (let i = 0; i < gray.length; i++) {
    const offset = i * 4
    gray[i] = 0.299 * imageData.data[offset] + 0.587 * imageData.data[offset + 1] + 0.114 * imageData.data[offset + 2]
  }

  const edges = sobelEdgeDetect(gray, origWidth, origHeight)

  const binary = new Uint8Array(origWidth * origHeight)
  for (let i = 0; i < binary.length; i++) {
    binary[i] = edges[i] > 80 ? 1 : 0
  }

  const components = findConnectedComponents(binary, origWidth, origHeight)

  const regions = components
    .map(pixels =>
      componentToRegion(pixels, {
        scale: 1,
        offsetX: 0,
        offsetY: 0,
        origWidth,
        origHeight,
      })
    )
    .filter(r => {
      const ratio = r.box.width / r.box.height
      return ratio > 0.3 && ratio < 15
    })

  return regions
}

/**
 * Run ONNX-based text detection using detector.onnx.
 *
 * @param {HTMLImageElement|HTMLCanvasElement} image
 * @param {{ worker: Worker, signal?: AbortSignal }} options
 * @returns {Promise<import('./types.js').TextRegion[]>}
 */
async function onnxDetect(image, { worker, signal }) {
  const preprocessed = preprocessImage(image)

  const modelUrl = await getModelUrl('detector')
  await getModelSession('detector', modelUrl)

  if (signal?.aborted) return []

  const outputs = await runInference(worker, { input: preprocessed.tensor })

  const outputName = Object.keys(outputs)[0]
  const output = outputs[outputName]

  return postprocessDetector(output, preprocessed)
}

/**
 * Detect text regions in a manga page image.
 *
 * Uses ONNX detector.onnx for ML-based detection. Falls back to heuristic
 * edge detection when ONNX is unavailable, fails, or returns no regions.
 *
 * @param {HTMLImageElement|HTMLCanvasElement} image - The manga page image
 * @param {object} [options]
 * @param {Worker} [options.worker] - Pre-existing ONNX worker (creates one if not provided)
 * @param {AbortSignal} [options.signal] - Optional abort signal
 * @returns {Promise<{regions: import('./types.js').TextRegion[], worker: Worker}>}
 */
export async function detectTextRegions(image, { worker, signal } = {}) {
  let ownWorker = false
  if (!worker) {
    worker = createWorker()
    ownWorker = true
  }

  try {
    const regions = await onnxDetect(image, { worker, signal })
    if (regions.length > 0) {
      return { regions, worker }
    }
    console.log('[detect] ONNX returned no regions, trying heuristic fallback')
  } catch (err) {
    console.log('[detect] ONNX failed:', err.message, '- trying heuristic fallback')
  }

  const regions = await heuristicDetect(image)
  return { regions, worker }
}
