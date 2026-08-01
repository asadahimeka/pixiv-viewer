/**
 * @file ONNX text detection — runs the detector model via onnxBridge and
 *        post-processes outputs (CTD text-lines, YOLO-style boxes, or
 *        segmentation mask connected components).
 *
 * Mechanically converted from ShinobuTranslator `src/pipeline/detect/onnxDetect.ts`
 * (TS → JS). All type-only imports → JSDoc @typedef / import() references.
 *
 * Provider fallback chain preserved verbatim from Shinobu source:
 *   WebGPU (GPU-preprocess) → [webnn, wasm] → [wasm]
 *   CPU: [webnn, wasm] → [wasm]
 *
 * Dependencies:
 *   onnxBridge.js    (T7: runInference / runDetectWithGpuPreprocess)
 *   modelRegistry.js (T6: getModelSession)
 *   onnxTypes.js     (T3: isContextLostRuntimeError)
 *   utils.js         (T17: clamp, polygonArea, nmsBoxes)
 *   geometry.js      (this dir: minAreaRect)
 */

import { runInference, runDetectWithGpuPreprocess } from '../../runtime/onnxBridge.js'
import { getModelSession } from '../../runtime/modelRegistry.js'
import { isContextLostRuntimeError } from '../../runtime/onnxTypes.js'
import { clamp, polygonArea, nmsBoxes } from '../utils.js'
import { minAreaRect } from './geometry.js'

// ---------------------------------------------------------------------------
// Doc-only type imports — zero runtime impact
// ---------------------------------------------------------------------------

/** @typedef {import('../../types.js').Rect} Rect */
/** @typedef {import('../../types.js').TextRegion} TextRegion */
/** @typedef {import('../../types.js').QuadPoint} QuadPoint */
/** @typedef {import('../../runtime/platform.js').PlatformProvider} PlatformProvider */
/** @typedef {import('../../runtime/platform.js').PipelineCanvas} PipelineCanvas */
/** @typedef {import('../../runtime/platform.js').PipelineImage} PipelineImage */
/** @typedef {import('../../runtime/onnxTypes.js').RuntimeProvider} RuntimeProvider */
/** @typedef {import('../../runtime/onnxTypes.js').WebNnDeviceType} WebNnDeviceType */
/** @typedef {import('../../runtime/onnxWorkerTypes.js').WorkerSessionHandle} WorkerSessionHandle */
/** @typedef {import('../../runtime/onnxWorkerTypes.js').TensorTransport} TensorTransport */
/** @typedef {import('./geometry.js').Quad} Quad */
/** @typedef {import('../utils.js').ScoredBox} ScoredBox */

// ---------------------------------------------------------------------------
// Local types — JSDoc @typedef
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} LetterboxResult
 * @property {Float32Array} input
 * @property {number} size
 * @property {number} ratio
 * @property {number} unpaddedWidth
 * @property {number} unpaddedHeight
 */
export const LetterboxResult = {}

/**
 * @typedef {Object} CtdTextLineContour
 * @property {Array<QuadPoint>} boundary
 * @property {Array<number>} pixels
 */
export const CtdTextLineContour = {}

/**
 * @typedef {Object} DetectOutput
 * @property {Array<TextRegion>} regions
 * @property {PipelineCanvas|null} rawMaskCanvas
 * @property {'onnx'|'tesseract'|'heuristic'} [engine]
 * @property {string} [fallbackReason]
 * @property {RuntimeProvider} [actualProvider]
 * @property {WebNnDeviceType} [actualWebnnDeviceType]
 */
export const DetectOutput = {}

// ---------------------------------------------------------------------------
// Helpers — toErrorMessage (inline, 4-line helper from shared/utils.ts)
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

// ===========================================================================
// Shared helpers (used by both ONNX and heuristic paths)
// ===========================================================================

/**
 * @param {Rect} box
 * @returns {Quad}
 */
export function rectToQuad(box) {
  const x0 = box.x
  const y0 = box.y
  const x1 = box.x + box.width
  const y1 = box.y + box.height
  return [
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: y1 },
    { x: x0, y: y1 },
  ]
}

/**
 * @param {Rect} box
 * @returns {'h'|'v'}
 */
export function inferDirection(box) {
  return box.height > box.width ? 'v' : 'h'
}

/**
 * @param {Rect} box
 * @returns {TextRegion}
 */
export function makeRegion(box) {
  return {
    id: crypto.randomUUID(),
    box,
    quad: rectToQuad(box),
    direction: inferDirection(box),
    sourceText: '',
    translatedText: '',
  }
}

/**
 * @param {Rect} a
 * @param {Rect} b
 * @param {number} gap
 * @returns {boolean}
 */
export function intersectsOrNear(a, b, gap) {
  return !(
    a.x + a.width + gap < b.x ||
    b.x + b.width + gap < a.x ||
    a.y + a.height + gap < b.y ||
    b.y + b.height + gap < a.y
  )
}

/**
 * @param {Array<Rect>} rects
 * @param {number} gap
 * @returns {Array<Rect>}
 */
export function mergeRects(rects, gap) {
  /** @type {Array<Rect>} */
  const merged = []
  for (const rect of rects) {
    let mergedCurrent = false
    for (let i = 0; i < merged.length; i += 1) {
      if (!intersectsOrNear(rect, merged[i], gap)) {
        continue
      }
      const left = Math.min(rect.x, merged[i].x)
      const top = Math.min(rect.y, merged[i].y)
      const right = Math.max(rect.x + rect.width, merged[i].x + merged[i].width)
      const bottom = Math.max(rect.y + rect.height, merged[i].y + merged[i].height)
      merged[i] = { x: left, y: top, width: right - left, height: bottom - top }
      mergedCurrent = true
      break
    }
    if (!mergedCurrent) {
      merged.push({ ...rect })
    }
  }
  return merged
}

// ===========================================================================
// ONNX-specific quad/geometry helpers (private)
// ===========================================================================

/**
 * @param {number} value
 * @returns {number}
 */
function roundHalfToEven(value) {
  const base = Math.floor(value)
  const diff = value - base
  if (diff < 0.5) {
    return base
  }
  if (diff > 0.5) {
    return base + 1
  }
  return base % 2 === 0 ? base : base + 1
}

/**
 * @param {QuadPoint} a
 * @param {QuadPoint} b
 * @returns {number}
 */
function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

/**
 * @param {Array<QuadPoint>} points
 * @returns {number}
 */
function polygonPerimeter(points) {
  if (points.length < 2) {
    return 0
  }
  let acc = 0
  for (let i = 0; i < points.length; i += 1) {
    acc += distance(points[i], points[(i + 1) % points.length])
  }
  return acc
}

/**
 * @param {Float32Array} scoreMap
 * @param {CtdTextLineContour} contour
 * @returns {number}
 */
export function scoreCtdContourPixels(scoreMap, contour) {
  if (contour.pixels.length === 0) {
    return 0
  }
  let sum = 0
  for (const pixel of contour.pixels) {
    sum += scoreMap[pixel] ?? 0
  }
  return sum / contour.pixels.length
}

/**
 * @param {Quad} box
 * @param {number} unclipRatio
 * @returns {Quad}
 */
function unclipBox(box, unclipRatio) {
  const area = polygonArea(box)
  const perimeter = polygonPerimeter(box)
  if (area <= 0 || perimeter <= 1e-6) {
    return box
  }
  const distanceValue = (area * unclipRatio) / perimeter

  const center = {
    x: (box[0].x + box[1].x + box[2].x + box[3].x) / 4,
    y: (box[0].y + box[1].y + box[2].y + box[3].y) / 4,
  }
  const widthVec = { x: box[1].x - box[0].x, y: box[1].y - box[0].y }
  const heightVec = { x: box[3].x - box[0].x, y: box[3].y - box[0].y }
  const width = Math.hypot(widthVec.x, widthVec.y)
  const height = Math.hypot(heightVec.x, heightVec.y)
  if (width <= 1e-6 || height <= 1e-6) {
    return box
  }

  const ux = widthVec.x / width
  const uy = widthVec.y / width
  const vx = heightVec.x / height
  const vy = heightVec.y / height
  const halfW = width * 0.5 + distanceValue
  const halfH = height * 0.5 + distanceValue

  return [
    { x: center.x - ux * halfW - vx * halfH, y: center.y - uy * halfW - vy * halfH },
    { x: center.x + ux * halfW - vx * halfH, y: center.y + uy * halfW - vy * halfH },
    { x: center.x + ux * halfW + vx * halfH, y: center.y + uy * halfW + vy * halfH },
    { x: center.x - ux * halfW + vx * halfH, y: center.y - uy * halfW + vy * halfH },
  ]
}

/**
 * @param {Quad} quad
 * @param {number} imageWidth
 * @param {number} imageHeight
 * @returns {Rect}
 */
function quadToRect(quad, imageWidth, imageHeight) {
  const minX = Math.min(quad[0].x, quad[1].x, quad[2].x, quad[3].x)
  const minY = Math.min(quad[0].y, quad[1].y, quad[2].y, quad[3].y)
  const maxX = Math.max(quad[0].x, quad[1].x, quad[2].x, quad[3].x)
  const maxY = Math.max(quad[0].y, quad[1].y, quad[2].y, quad[3].y)
  const x = clamp(Math.floor(minX), 0, imageWidth - 1)
  const y = clamp(Math.floor(minY), 0, imageHeight - 1)
  const right = clamp(Math.ceil(maxX), x + 1, imageWidth)
  const bottom = clamp(Math.ceil(maxY), y + 1, imageHeight)
  return { x, y, width: right - x, height: bottom - y }
}

/**
 * @param {Quad} quad
 * @returns {{ quad: Quad, direction: 'h'|'v' }}
 */
export function sortCtdQuadPoints(quad) {
  // Shallow-clone to avoid mutating the input
  const points = quad.map(point => ({ x: point.x, y: point.y }))
  /** @type {Array<{ x: number, y: number, norm: number, order: number }>} */
  const pairwiseVectors = []

  for (let i = 0; i < points.length; i += 1) {
    for (let j = 0; j < points.length; j += 1) {
      const x = points[i].x - points[j].x
      const y = points[i].y - points[j].y
      pairwiseVectors.push({ x, y, norm: Math.hypot(x, y), order: i * points.length + j })
    }
  }

  pairwiseVectors.sort((a, b) => a.norm - b.norm || a.order - b.order)
  const longSideVecs = [
    { x: pairwiseVectors[8].x, y: pairwiseVectors[8].y },
    { x: pairwiseVectors[10].x, y: pairwiseVectors[10].y },
  ]
  const innerProduct = longSideVecs[0].x * longSideVecs[1].x + longSideVecs[0].y * longSideVecs[1].y
  if (innerProduct < 0) {
    longSideVecs[0].x = -longSideVecs[0].x
    longSideVecs[0].y = -longSideVecs[0].y
  }

  const structureVector = {
    x: Math.abs((longSideVecs[0].x + longSideVecs[1].x) * 0.5),
    y: Math.abs((longSideVecs[0].y + longSideVecs[1].y) * 0.5),
  }
  const direction = structureVector.x <= structureVector.y ? 'v' : 'h'

  if (direction === 'v') {
    const byY = [...points].sort((a, b) => a.y - b.y || a.x - b.x)
    const top = [byY[0], byY[1]].sort((a, b) => a.x - b.x || a.y - b.y)
    const bottom = [byY[2], byY[3]].sort((a, b) => b.x - a.x || a.y - b.y)
    return { quad: [top[0], top[1], bottom[0], bottom[1]], direction }
  }

  const byX = [...points].sort((a, b) => a.x - b.x || a.y - b.y)
  const left = [byX[0], byX[1]].sort((a, b) => a.y - b.y || a.x - b.x)
  const right = [byX[2], byX[3]].sort((a, b) => a.y - b.y || a.x - b.x)
  return { quad: [left[0], right[0], right[1], left[1]], direction }
}

/**
 * @param {Quad} quad
 * @param {number} imageWidth
 * @param {number} imageHeight
 * @param {number} score
 * @returns {TextRegion}
 */
function makeRegionFromQuad(quad, imageWidth, imageHeight, score) {
  const sorted = sortCtdQuadPoints(quad)
  return {
    id: crypto.randomUUID(),
    box: quadToRect(sorted.quad, imageWidth, imageHeight),
    quad: sorted.quad,
    direction: sorted.direction,
    prob: score,
    sourceText: '',
    translatedText: '',
  }
}

/**
 * @param {Uint8Array} mask
 * @param {number} width
 * @param {number} height
 * @param {PlatformProvider} platform
 * @returns {PipelineCanvas}
 */
function binaryMaskToCanvas(mask, width, height, platform) {
  const canvas = platform.createCanvas(width, height)
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('文本检测遮罩输出无法创建画布上下文')
  }
  const image = ctx.createImageData(width, height)
  for (let i = 0, p = 0; i < mask.length; i += 1, p += 4) {
    const value = mask[i] > 0 ? 255 : 0
    image.data[p] = value
    image.data[p + 1] = value
    image.data[p + 2] = value
    image.data[p + 3] = 255
  }
  ctx.putImageData(image, 0, 0)
  return canvas
}

/**
 * @param {PipelineCanvas} maskCanvas
 * @param {PipelineImage} image
 * @param {PlatformProvider} platform
 * @returns {PipelineCanvas}
 */
function scaleMaskToOriginal(maskCanvas, image, platform) {
  const out = platform.createCanvas(image.naturalWidth, image.naturalHeight)
  const ctx = out.getContext('2d', { willReadFrequently: true })
  if (!ctx) {
    throw new Error('文本检测遮罩缩放失败')
  }
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(maskCanvas, 0, 0, out.width, out.height)
  const imageData = ctx.getImageData(0, 0, out.width, out.height)
  const data = imageData.data
  for (let p = 0; p < data.length; p += 4) {
    const value = data[p] > 127 ? 255 : 0
    data[p] = value
    data[p + 1] = value
    data[p + 2] = value
    data[p + 3] = 255
  }
  ctx.putImageData(imageData, 0, 0)
  return out
}

/**
 * @param {Uint8Array} mask
 * @param {number} width
 * @param {number} height
 * @param {PipelineImage} image
 * @param {PlatformProvider} platform
 * @returns {PipelineCanvas}
 */
function buildMaskCanvasFromBinary(mask, width, height, image, platform) {
  return scaleMaskToOriginal(binaryMaskToCanvas(mask, width, height, platform), image, platform)
}

// ===========================================================================
// connectedComponents (shared with heuristic path)
// ===========================================================================

/**
 * @param {Uint8Array} mask
 * @param {number} width
 * @param {number} height
 * @returns {Array<Rect>}
 */
export function connectedComponents(mask, width, height) {
  const total = width * height
  const visited = new Uint8Array(total)
  const queue = new Int32Array(total)
  /** @type {Array<Rect>} */
  const out = []

  for (let idx = 0; idx < total; idx += 1) {
    if (mask[idx] === 0 || visited[idx] === 1) {
      continue
    }

    let head = 0
    let tail = 0
    queue[tail] = idx
    tail += 1
    visited[idx] = 1

    let minX = width
    let minY = height
    let maxX = 0
    let maxY = 0
    let count = 0

    while (head < tail) {
      const current = queue[head]
      head += 1
      const x = current % width
      const y = Math.floor(current / width)
      count += 1
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)

      const xStart = Math.max(0, x - 1)
      const xEnd = Math.min(width - 1, x + 1)
      const yStart = Math.max(0, y - 1)
      const yEnd = Math.min(height - 1, y + 1)
      for (let ny = yStart; ny <= yEnd; ny += 1) {
        for (let nx = xStart; nx <= xEnd; nx += 1) {
          if (nx === x && ny === y) {
            continue
          }
          const next = ny * width + nx
          if (visited[next] === 1 || mask[next] === 0) {
            continue
          }
          visited[next] = 1
          queue[tail] = next
          tail += 1
        }
      }
    }

    const boxWidth = maxX - minX + 1
    const boxHeight = maxY - minY + 1
    const area = boxWidth * boxHeight
    const density = count / area
    if (count < 10 || boxWidth < 4 || boxHeight < 4 || density < 0.03) {
      continue
    }
    out.push({ x: minX, y: minY, width: boxWidth, height: boxHeight })
  }
  return out
}

// ===========================================================================
// ONNX tensor processing (private, adapted for TensorTransport)
// ===========================================================================

/**
 * @param {Object.<string, TensorTransport>} outputs
 * @returns {TensorTransport|null}
 */
function pickBlkTensor(outputs) {
  const byName = outputs.blk
  if (byName && byName.dims.length === 3 && byName.dims[2] >= 6) {
    return byName
  }
  for (const value of Object.values(outputs)) {
    if (value.dims.length === 3 && value.dims[2] >= 6) {
      return value
    }
  }
  return null
}

/**
 * @param {Object.<string, TensorTransport>} outputs
 * @returns {TensorTransport|null}
 */
function pickDetTensor(outputs) {
  const byName = outputs.det
  if (byName && byName.dims.length === 4 && byName.dims[1] >= 1) {
    return byName
  }
  for (const value of Object.values(outputs)) {
    if (value.dims.length === 4 && value.dims[1] >= 1 && value.dims[2] >= 64 && value.dims[3] >= 64) {
      return value
    }
  }
  return null
}

/**
 * @param {Object.<string, TensorTransport>} outputs
 * @returns {TensorTransport}
 */
function pickSegTensor(outputs) {
  const byName = outputs.seg
  if (byName) {
    return byName
  }

  for (const value of Object.values(outputs)) {
    if (value.dims.length === 4 && value.dims[1] === 1) {
      return value
    }
  }
  throw new Error('ONNX 检测结果中未找到 seg 输出')
}

/**
 * @param {TensorTransport} tensor
 * @param {number} inputSize
 * @param {number} unpaddedWidth
 * @param {number} unpaddedHeight
 * @returns {Array<ScoredBox>}
 */
function boxesFromBlk(tensor, inputSize, unpaddedWidth, unpaddedHeight) {
  if (!(tensor.data instanceof Float32Array)) {
    return []
  }
  const data = tensor.data
  const rows = tensor.dims[1] ?? 0
  const cols = tensor.dims[2] ?? 0
  if (rows <= 0 || cols < 6) {
    return []
  }

  /** @type {Array<ScoredBox>} */
  const candidates = []
  const confThreshold = 0.35
  for (let i = 0; i < rows; i += 1) {
    const base = i * cols
    const cx = data[base]
    const cy = data[base + 1]
    const w = data[base + 2]
    const h = data[base + 3]
    const obj = data[base + 4]
    if (!Number.isFinite(cx + cy + w + h + obj)) {
      continue
    }
    let cls = 1
    for (let k = 5; k < cols; k += 1) {
      cls = Math.max(cls, data[base + k])
    }
    const score = obj * cls
    if (score < confThreshold) {
      continue
    }

    const x = cx - w / 2
    const y = cy - h / 2
    const left = clamp(Math.floor(x), 0, inputSize - 1)
    const top = clamp(Math.floor(y), 0, inputSize - 1)
    const right = clamp(Math.ceil(x + w), left + 1, inputSize)
    const bottom = clamp(Math.ceil(y + h), top + 1, inputSize)
    if (left >= unpaddedWidth || top >= unpaddedHeight) {
      continue
    }

    const clippedRight = Math.min(right, unpaddedWidth)
    const clippedBottom = Math.min(bottom, unpaddedHeight)
    const boxWidth = clippedRight - left
    const boxHeight = clippedBottom - top
    if (boxWidth < 6 || boxHeight < 6) {
      continue
    }

    const ratio = (boxWidth * boxHeight) / (unpaddedWidth * unpaddedHeight)
    if (ratio < 0.00004 || ratio > 0.1) {
      continue
    }

    candidates.push({
      box: { x: left, y: top, width: boxWidth, height: boxHeight },
      score,
    })
  }

  const picked = nmsBoxes(candidates, 0.35).slice(0, 96)
  return picked
}

/**
 * @param {PipelineImage} image
 * @param {number} size
 * @param {PlatformProvider} platform
 * @returns {LetterboxResult}
 */
function preprocessLetterbox(image, size, platform) {
  const width = image.naturalWidth
  const height = image.naturalHeight
  const ratio = Math.min(size / height, size / width)
  const unpaddedWidth = Math.max(1, Math.round(width * ratio))
  const unpaddedHeight = Math.max(1, Math.round(height * ratio))

  const canvas = platform.createCanvas(size, size)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) {
    throw new Error('ONNX 检测预处理失败：无法创建画布')
  }
  ctx.fillStyle = 'black'
  ctx.fillRect(0, 0, size, size)
  ctx.drawImage(image, 0, 0, unpaddedWidth, unpaddedHeight)

  const data = ctx.getImageData(0, 0, size, size).data
  const input = new Float32Array(1 * 3 * size * size)
  const hw = size * size
  for (let i = 0, p = 0; i < hw; i += 1, p += 4) {
    input[i] = data[p] / 255
    input[hw + i] = data[p + 1] / 255
    input[2 * hw + i] = data[p + 2] / 255
  }

  return {
    input,
    size,
    ratio,
    unpaddedWidth,
    unpaddedHeight,
  }
}

/**
 * @param {TensorTransport} tensor
 * @param {number} unpaddedWidth
 * @param {number} unpaddedHeight
 * @param {number} threshold
 * @param {number} [channelIndex=0]
 * @returns {{ mask: Uint8Array, width: number, height: number } | null}
 */
function buildBinaryMaskFromTensor(tensor, unpaddedWidth, unpaddedHeight, threshold, channelIndex = 0) {
  if (!(tensor.data instanceof Float32Array)) {
    return null
  }
  const dims = tensor.dims
  if (dims.length !== 4) {
    return null
  }

  const channels = dims[1] ?? 0
  const rawHeight = dims[2] ?? 0
  const rawWidth = dims[3] ?? 0
  if (channels <= 0 || rawWidth <= 0 || rawHeight <= 0) {
    return null
  }

  const width = Math.min(unpaddedWidth, rawWidth)
  const height = Math.min(unpaddedHeight, rawHeight)
  if (width <= 0 || height <= 0) {
    return null
  }

  const source = tensor.data
  const channelStride = rawWidth * rawHeight
  const channel = clamp(Math.floor(channelIndex), 0, channels - 1)
  const channelOffset = channel * channelStride
  const mask = new Uint8Array(width * height)

  for (let y = 0; y < height; y += 1) {
    const sourceRow = channelOffset + y * rawWidth
    const destRow = y * width
    for (let x = 0; x < width; x += 1) {
      const idx = destRow + x
      mask[idx] = source[sourceRow + x] > threshold ? 1 : 0
    }
  }

  return { mask, width, height }
}

/**
 * @param {Uint8Array} mask
 * @param {number} width
 * @param {number} height
 * @returns {Array<CtdTextLineContour>}
 */
export function extractCtdTextLineContours(mask, width, height) {
  const total = width * height
  const visited = new Uint8Array(total)
  const queue = new Int32Array(total)
  /** @type {Array<CtdTextLineContour>} */
  const out = []

  for (let idx = 0; idx < total; idx += 1) {
    if (mask[idx] === 0 || visited[idx] === 1) {
      continue
    }

    let head = 0
    let tail = 0
    queue[tail] = idx
    tail += 1
    visited[idx] = 1

    /** @type {Array<number>} */
    const pixels = []

    while (head < tail) {
      const current = queue[head]
      head += 1
      pixels.push(current)

      const x = current % width
      const y = Math.floor(current / width)
      const xStart = Math.max(0, x - 1)
      const xEnd = Math.min(width - 1, x + 1)
      const yStart = Math.max(0, y - 1)
      const yEnd = Math.min(height - 1, y + 1)
      for (let ny = yStart; ny <= yEnd; ny += 1) {
        for (let nx = xStart; nx <= xEnd; nx += 1) {
          if (nx === x && ny === y) {
            continue
          }
          const next = ny * width + nx
          if (visited[next] === 1 || mask[next] === 0) {
            continue
          }
          visited[next] = 1
          queue[tail] = next
          tail += 1
        }
      }
    }

    if (pixels.length === 0) {
      continue
    }

    /** @type {Array<QuadPoint>} */
    const boundary = []
    for (const pixel of pixels) {
      const x = pixel % width
      const y = Math.floor(pixel / width)
      let isBoundary = false
      for (let ny = y - 1; ny <= y + 1 && !isBoundary; ny += 1) {
        for (let nx = x - 1; nx <= x + 1; nx += 1) {
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
            isBoundary = true
            break
          }
          if (mask[ny * width + nx] === 0) {
            isBoundary = true
            break
          }
        }
      }
      if (isBoundary) {
        boundary.push({ x, y })
      }
    }

    if (boundary.length < 2) {
      continue
    }

    out.push({ boundary, pixels })

    if (out.length >= 1000) {
      break
    }
  }

  return out
}

/**
 * @param {Quad} quad
 * @param {number} srcWidth
 * @param {number} srcHeight
 * @param {number} destWidth
 * @param {number} destHeight
 * @returns {Quad}
 */
function mapQuadToOriginal(quad, srcWidth, srcHeight, destWidth, destHeight) {
  const mapped = quad.map(point => ({
    x: clamp(roundHalfToEven((point.x / srcWidth) * destWidth), 0, destWidth),
    y: clamp(roundHalfToEven((point.y / srcHeight) * destHeight), 0, destHeight),
  }))
  return [mapped[0], mapped[1], mapped[2], mapped[3]]
}

/**
 * @param {TensorTransport} detTensor
 * @param {PipelineImage} image
 * @param {LetterboxResult} prep
 * @returns {Array<TextRegion>}
 */
function detectCtdRegionsFromDetTensor(detTensor, image, prep) {
  if (!(detTensor.data instanceof Float32Array)) {
    return []
  }

  const dims = detTensor.dims
  if (dims.length !== 4 || dims[1] < 1) {
    return []
  }

  const rawHeight = dims[2]
  const rawWidth = dims[3]
  if (rawWidth <= 0 || rawHeight <= 0) {
    return []
  }

  const width = Math.min(prep.unpaddedWidth, rawWidth)
  const height = Math.min(prep.unpaddedHeight, rawHeight)
  if (width <= 0 || height <= 0) {
    return []
  }

  const channelOffset = 0
  const map = new Float32Array(width * height)
  const mask = new Uint8Array(width * height)
  const source = detTensor.data
  for (let y = 0; y < height; y += 1) {
    const sourceRow = channelOffset + y * rawWidth
    const destRow = y * width
    for (let x = 0; x < width; x += 1) {
      const value = source[sourceRow + x]
      const idx = destRow + x
      map[idx] = value
      mask[idx] = value > 0.3 ? 1 : 0
    }
  }

  const contours = extractCtdTextLineContours(mask, width, height)
  /** @type {Array<TextRegion>} */
  const regions = []

  for (const contour of contours) {
    const mini = minAreaRect(contour.boundary)
    if (!mini || mini.shortSide < 2) {
      continue
    }

    const score = scoreCtdContourPixels(map, contour)
    if (score <= 0.6) {
      continue
    }

    const expanded = unclipBox(mini.box, 1.5)
    const refined = minAreaRect(expanded)
    if (!refined) {
      continue
    }

    const mapped = mapQuadToOriginal(refined.box, width, height, image.naturalWidth, image.naturalHeight)
    const region = makeRegionFromQuad(mapped, image.naturalWidth, image.naturalHeight, score)
    if (region.box.width < 1 || region.box.height < 1) {
      continue
    }
    regions.push(region)
  }

  regions.sort((a, b) => a.box.y - b.box.y || a.box.x - b.box.x)
  return regions
}

/**
 * @param {Array<Rect>} boxes
 * @param {PipelineImage} image
 * @param {LetterboxResult} prep
 * @param {number} [padRatio=0.15]
 * @param {number} [maxAreaRatio=0.18]
 * @returns {Array<Rect>}
 */
function mapBoxesToOriginal(boxes, image, prep, padRatio = 0.15, maxAreaRatio = 0.18) {
  const scale = 1 / prep.ratio
  /** @type {Array<Rect>} */
  const mapped = []
  const imageArea = image.naturalWidth * image.naturalHeight

  for (const box of boxes) {
    const clippedRight = Math.min(prep.unpaddedWidth, box.x + box.width)
    const clippedBottom = Math.min(prep.unpaddedHeight, box.y + box.height)
    if (clippedRight <= box.x || clippedBottom <= box.y) {
      continue
    }

    const x = clamp(Math.floor(box.x * scale), 0, image.naturalWidth - 1)
    const y = clamp(Math.floor(box.y * scale), 0, image.naturalHeight - 1)
    const right = clamp(Math.ceil(clippedRight * scale), x + 1, image.naturalWidth)
    const bottom = clamp(Math.ceil(clippedBottom * scale), y + 1, image.naturalHeight)

    const pad = Math.max(3, Math.round(Math.min(right - x, bottom - y) * padRatio))
    const mappedRect = {
      x: clamp(x - pad, 0, image.naturalWidth - 1),
      y: clamp(y - pad, 0, image.naturalHeight - 1),
      width: clamp(right + pad, 1, image.naturalWidth) - clamp(x - pad, 0, image.naturalWidth - 1),
      height: clamp(bottom + pad, 1, image.naturalHeight) - clamp(y - pad, 0, image.naturalHeight - 1),
    }
    const ratio = (mappedRect.width * mappedRect.height) / imageArea
    if (ratio < 0.00005 || ratio > maxAreaRatio) {
      continue
    }
    mapped.push(mappedRect)
  }

  return mapped
}

// ===========================================================================
// Main ONNX detection function (exported)
// ===========================================================================

/**
 * @param {PipelineImage} image
 * @param {PlatformProvider} platform
 * @returns {Promise<DetectOutput>}
 */
export async function detectByOnnx(image, platform) {
  const primaryHandle = await getModelSession('detector')
  const inputSize = 1024

  let actualProvider = primaryHandle.provider
  let actualWebnnDeviceType = primaryHandle.webnnDeviceType

  /** @type {Object.<string, TensorTransport>} */
  let outputTensors
  let prep

  // WebGPU path: GPU preprocess + IO binding
  if (primaryHandle.provider === 'webgpu') {
    try {
      // PipelineImage is HTMLImageElement at runtime in the browser (browserPlatform.createImage)
      const imageBitmap = await createImageBitmap(/** @type {HTMLImageElement} */ (image))
      const gpuResult = await runDetectWithGpuPreprocess(primaryHandle.sessionId, imageBitmap)
      prep = {
        input: new Float32Array(0), // not needed for GPU path
        size: inputSize,
        ratio: gpuResult.ratio,
        unpaddedWidth: gpuResult.unpaddedWidth,
        unpaddedHeight: gpuResult.unpaddedHeight,
      }
      outputTensors = gpuResult.outputs
    } catch (error) {
      const message = toErrorMessage(error)
      console.warn(`[detector] WebGPU GPU预处理失败，回退到 CPU: ${message}`)
      // Fallback: try WebNN first, then WASM (matching original fallback order)
      prep = preprocessLetterbox(image, inputSize, platform)

      /** @type {Array<Array<RuntimeProvider>>} */
      const fallbackPlans = [['webnn', 'wasm'], ['wasm']]
      let recovered = false
      let lastFallbackError = null

      for (const preferred of fallbackPlans) {
        try {
          const handle = await getModelSession('detector', preferred)
          const inputName = handle.inputNames[0] ?? 'images'
          /** @type {Object.<string, TensorTransport>} */
          const feeds = {
            [inputName]: { data: prep.input, dims: [1, 3, inputSize, inputSize], type: 'float32' },
          }
          const result = await runInference(handle.sessionId, feeds)
          if (result.error) throw new Error(result.error)
          outputTensors = result.outputs
          actualProvider = handle.provider
          actualWebnnDeviceType = handle.webnnDeviceType
          console.warn(`[detector] 已回退到 ${handle.provider}`)
          recovered = true
          break
        } catch (fallbackError) {
          lastFallbackError = fallbackError
        }
      }

      if (!recovered) {
        const fallbackMessage = lastFallbackError ? toErrorMessage(lastFallbackError) : '未知错误'
        throw new Error(`WebGPU GPU预处理失败且回退失败: ${message} | fallback: ${fallbackMessage}`)
      }
    }
  } else {
    // CPU path (webnn/wasm): existing letterbox preprocessing
    prep = preprocessLetterbox(image, inputSize, platform)

    /**
     * @param {WorkerSessionHandle} handle
     * @returns {Promise<Object.<string, TensorTransport>>}
     */
    const runWithHandle = async handle => {
      const inputName = handle.inputNames[0] ?? 'images'
      /** @type {Object.<string, TensorTransport>} */
      const feeds = {
        [inputName]: { data: prep.input, dims: [1, 3, inputSize, inputSize], type: 'float32' },
      }
      const result = await runInference(handle.sessionId, feeds)
      if (result.error) throw new Error(result.error)
      return result.outputs
    }

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
      fallbackPlans.push(['wasm'])

      /** @type {Object.<string, TensorTransport>|null} */
      let recovered = null
      let lastFallbackError = null
      console.warn(`[detector] ${primaryHandle.provider} ${reason}, 尝试回退: ${message}`)

      for (const preferred of fallbackPlans) {
        try {
          const handle = await getModelSession('detector', preferred)
          recovered = await runWithHandle(handle)
          if (handle.provider !== primaryHandle.provider) {
            console.warn(`[detector] 已回退到 ${handle.provider}`)
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
        throw new Error(`检测推理失败且回退失败: ${message} | fallback: ${fallbackMessage}`)
      }

      outputTensors = recovered
    }
  }

  // Post-process: try det (CTD text-lines) first, then blk (YOLO boxes), then seg (connected components)
  const detTensor = pickDetTensor(outputTensors)
  if (detTensor) {
    const regions = detectCtdRegionsFromDetTensor(detTensor, image, prep)

    let maskTensor = detTensor
    try {
      const segTensor = pickSegTensor(outputTensors)
      if (segTensor.dims.length === 4 && (segTensor.dims[1] ?? 0) >= 1) {
        maskTensor = segTensor
      }
    } catch {
      // 当前模型无独立 seg 输出时，回退使用 det 通道 0 作为粗遮罩。
    }

    const binaryMask = buildBinaryMaskFromTensor(maskTensor, prep.unpaddedWidth, prep.unpaddedHeight, 0.3, 0)
    if (!binaryMask) {
      return { regions, rawMaskCanvas: null, actualProvider, actualWebnnDeviceType }
    }

    return {
      regions,
      rawMaskCanvas: buildMaskCanvasFromBinary(binaryMask.mask, binaryMask.width, binaryMask.height, image, platform),
      actualProvider,
      actualWebnnDeviceType,
    }
  }

  const blkTensor = pickBlkTensor(outputTensors)
  if (blkTensor) {
    const blkBoxes = boxesFromBlk(blkTensor, inputSize, prep.unpaddedWidth, prep.unpaddedHeight)
    if (blkBoxes.length > 0) {
      const mapped = mapBoxesToOriginal(
        blkBoxes.map(item => item.box),
        image,
        prep,
        0.08,
        0.1
      )
        .filter(box => box.width / Math.max(1, box.height) <= 1.8)
        .filter(box => box.width <= image.naturalWidth * 0.35 && box.height <= image.naturalHeight * 0.45)
        .sort((a, b) => b.width * b.height - a.width * a.height)
        .slice(0, 72)
        .sort((a, b) => a.y - b.y || a.x - b.x)

      if (mapped.length > 0) {
        const regions = mapped.map(makeRegion)
        return {
          regions,
          rawMaskCanvas: null,
          actualProvider,
          actualWebnnDeviceType,
        }
      }
    }
  }

  const segTensor = pickSegTensor(outputTensors)
  const binaryMask = buildBinaryMaskFromTensor(segTensor, prep.unpaddedWidth, prep.unpaddedHeight, 0.46, 0)
  if (!binaryMask) {
    return { regions: [], rawMaskCanvas: null, actualProvider, actualWebnnDeviceType }
  }
  const { mask, width, height } = binaryMask

  const boxes1024 = connectedComponents(mask, width, height)
  const mapped = mapBoxesToOriginal(boxes1024, image, prep, 0.05, 0.08)
  const merged = mergeRects(mapped, 5)
    .filter(box => box.width / Math.max(1, box.height) <= 1.8)
    .filter(box => box.width <= image.naturalWidth * 0.35 && box.height <= image.naturalHeight * 0.45)
    .sort((a, b) => b.width * b.height - a.width * a.height)
    .slice(0, 64)
    .sort((a, b) => a.y - b.y || a.x - b.x)

  if (merged.length === 0) {
    return { regions: [], rawMaskCanvas: null, actualProvider, actualWebnnDeviceType }
  }

  const regions = merged.map(makeRegion)
  return {
    regions,
    rawMaskCanvas: buildMaskCanvasFromBinary(mask, width, height, image, platform),
    actualProvider,
    actualWebnnDeviceType,
  }
}
