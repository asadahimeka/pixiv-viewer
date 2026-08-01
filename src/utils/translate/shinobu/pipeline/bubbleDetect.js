/**
 * @file Bubble detection pipeline — ONNX YOLOv8-seg inference for speech bubbles.
 *
 * Mechanically converted from ShinobuTranslator `src/pipeline/bubbleDetect.ts`
 * (TS → JS). Types → JSDoc @typedef; all logic preserved verbatim.
 *
 * BubbleDetection type ({ box, score, mask }) is defined in ../types.js (T2),
 * referenced here via JSDoc import() — not re-exported.
 *
 * Dependencies:
 *   ../runtime/modelRegistry.js — getModelSession("bubble") (T4)
 *   ../runtime/onnxBridge.js     — runInference (T7)
 *   ./utils.js                   — nmsBoxes (T17)
 *   ../types.js                  — BubbleDetection, Rect, TextRegion (T2)
 */

// ---------------------------------------------------------------------------
// Doc-only type imports — referenced in JSDoc, zero runtime impact
// ---------------------------------------------------------------------------

/** @typedef {import('../types.js').BubbleDetection} BubbleDetection */
/** @typedef {import('../types.js').Rect} Rect */
/** @typedef {import('../types.js').TextRegion} TextRegion */

/** @typedef {import('../runtime/platform.js').PlatformProvider} PlatformProvider */
/** @typedef {import('../runtime/platform.js').PipelineImage} PipelineImage */
/** @typedef {import('../runtime/platform.js').PipelineImageData} PipelineImageData */

/** @typedef {import('../runtime/onnxTypes.js').RuntimeProvider} RuntimeProvider */
/** @typedef {import('../runtime/onnxTypes.js').WebNnDeviceType} WebNnDeviceType */
/** @typedef {import('../runtime/onnxWorkerTypes.js').TensorTransport} TensorTransport */

// ---------------------------------------------------------------------------
// Runtime imports
// ---------------------------------------------------------------------------

import { nmsBoxes } from './utils.js'
import { getModelSession } from '../runtime/modelRegistry.js'
import { runInference } from '../runtime/onnxBridge.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} BubbleDetectResult
 * @property {Array<BubbleDetection>} bubbles
 * @property {RuntimeProvider} actualProvider
 * @property {WebNnDeviceType} [actualWebnnDeviceType]
 */

// ---------------------------------------------------------------------------
// Preprocessing — letterbox to 640×640, CHW float32 [0,1]
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} LetterboxResult
 * @property {Float32Array} input
 * @property {number} size
 * @property {number} ratio
 * @property {number} padX
 * @property {number} padY
 */

/**
 * @param {PipelineImage} image
 * @param {number} size
 * @param {PlatformProvider} platform
 * @returns {LetterboxResult}
 */
function preprocessLetterbox(image, size, platform) {
  const w = image.naturalWidth
  const h = image.naturalHeight
  const ratio = Math.min(size / w, size / h)
  const newW = Math.round(w * ratio)
  const newH = Math.round(h * ratio)
  const padX = Math.round((size - newW) / 2)
  const padY = Math.round((size - newH) / 2)

  const canvas = platform.createCanvas(size, size)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('气泡检测预处理失败：无法创建画布')

  ctx.fillStyle = '#7f7f7f'
  ctx.fillRect(0, 0, size, size)
  ctx.drawImage(image, padX, padY, newW, newH)

  const data = ctx.getImageData(0, 0, size, size).data
  const input = new Float32Array(3 * size * size)
  const hw = size * size
  for (let i = 0, p = 0; i < hw; i += 1, p += 4) {
    input[i] = data[p] / 255
    input[hw + i] = data[p + 1] / 255
    input[2 * hw + i] = data[p + 2] / 255
  }
  return { input, size, ratio, padX, padY }
}

// ---------------------------------------------------------------------------
// Inference
// ---------------------------------------------------------------------------

/**
 * @param {PipelineImage} image
 * @param {PlatformProvider} platform
 * @returns {Promise<{
 *   output0: Float32Array,
 *   output0Shape: readonly number[],
 *   output1: Float32Array,
 *   output1Shape: readonly number[],
 *   prep: LetterboxResult,
 *   actualProvider: RuntimeProvider,
 *   actualWebnnDeviceType?: WebNnDeviceType
 * }>}
 */
async function runBubbleInference(image, platform) {
  const handle = await getModelSession('bubble')
  const size = 640
  const prep = preprocessLetterbox(image, size, platform)

  const inputName = handle.inputNames[0] ?? 'images'
  const feeds = {
    [inputName]: { data: prep.input, dims: [1, 3, size, size], type: 'float32' },
  }
  const result = await runInference(handle.sessionId, feeds)
  if (result.error) throw new Error(result.error)

  const outputNames = handle.outputNames
  const out0 = result.outputs[outputNames[0]]
  const out1 = result.outputs[outputNames[1]]
  if (!out0 || !out1) {
    throw new Error('气泡检测模型输出张量缺失')
  }

  return {
    output0: out0.data,
    output0Shape: out0.dims,
    output1: out1.data,
    output1Shape: out1.dims,
    prep,
    actualProvider: handle.provider,
    actualWebnnDeviceType: handle.webnnDeviceType,
  }
}

// ---------------------------------------------------------------------------
// Decode output0 → boxes + scores + mask coefficients
// ---------------------------------------------------------------------------

const CONF_THRESHOLD = 0.5
const IOU_THRESHOLD = 0.5

/**
 * @typedef {Object} RawDetection
 * @property {Rect} box
 * @property {number} score
 * @property {Float32Array} maskCoeffs
 */

/**
 * @param {Float32Array} output0
 * @param {readonly number[]} shape
 * @param {LetterboxResult} prep
 * @param {number} imgW
 * @param {number} imgH
 * @returns {Array<RawDetection>}
 */
function decodeDetections(
  output0,
  shape,
  prep,
  imgW,
  imgH
) {
  // 4(box) + 1(score) + 32(mask coefficients) = 37 for single-class YOLOv8-seg
  if (shape[1] !== 37) {
    throw new Error(`气泡检测模型 output0 通道数异常: 期望 37, 实际 ${shape[1]}`)
  }
  const numCandidates = shape[2]

  const detections = []
  const coeffsMap = new Map()

  for (let i = 0; i < numCandidates; i++) {
    const cx = output0[0 * numCandidates + i]
    const cy = output0[1 * numCandidates + i]
    const w = output0[2 * numCandidates + i]
    const h = output0[3 * numCandidates + i]
    const score = output0[4 * numCandidates + i]

    if (score < CONF_THRESHOLD) continue

    const x1 = (cx - w / 2 - prep.padX) / prep.ratio
    const y1 = (cy - h / 2 - prep.padY) / prep.ratio
    const bw = w / prep.ratio
    const bh = h / prep.ratio

    const clampedX = Math.max(0, Math.min(x1, imgW))
    const clampedY = Math.max(0, Math.min(y1, imgH))
    const clampedW = Math.min(bw, imgW - clampedX)
    const clampedH = Math.min(bh, imgH - clampedY)

    if (clampedW <= 0 || clampedH <= 0) continue

    detections.push({ box: { x: clampedX, y: clampedY, width: clampedW, height: clampedH }, score, index: i })

    const coeffs = new Float32Array(32)
    for (let c = 0; c < 32; c++) {
      coeffs[c] = output0[(5 + c) * numCandidates + i]
    }
    coeffsMap.set(i, coeffs)
  }

  const kept = nmsBoxes(detections, IOU_THRESHOLD)

  return kept.map(d => ({
    box: d.box,
    score: d.score,
    maskCoeffs: coeffsMap.get(d.index),
  }))
}

// ---------------------------------------------------------------------------
// Decode proto masks → per-instance PipelineImageData
// ---------------------------------------------------------------------------

/**
 * @param {Array<RawDetection>} detections
 * @param {Float32Array} output1
 * @param {readonly number[]} output1Shape
 * @param {LetterboxResult} prep
 * @param {number} imgW
 * @param {number} imgH
 * @param {PlatformProvider} platform
 * @returns {Array<PipelineImageData>}
 */
function decodeMasks(
  detections,
  output1,
  output1Shape,
  prep,
  imgW,
  imgH,
  platform
) {
  const numProtos = output1Shape[1]
  const maskH = output1Shape[2]
  const maskW = output1Shape[3]

  /** @type {Array<PipelineImageData>} */
  const masks = []

  for (const det of detections) {
    const combined = new Float32Array(maskH * maskW)
    for (let p = 0; p < numProtos; p++) {
      const coeff = det.maskCoeffs[p]
      const protoOffset = p * maskH * maskW
      for (let j = 0; j < maskH * maskW; j++) {
        combined[j] += coeff * output1[protoOffset + j]
      }
    }

    for (let j = 0; j < combined.length; j++) {
      combined[j] = 1 / (1 + Math.exp(-combined[j]))
    }

    const lbx1 = det.box.x * prep.ratio + prep.padX
    const lby1 = det.box.y * prep.ratio + prep.padY
    const lbx2 = (det.box.x + det.box.width) * prep.ratio + prep.padX
    const lby2 = (det.box.y + det.box.height) * prep.ratio + prep.padY

    const scaleX = maskW / prep.size
    const scaleY = maskH / prep.size
    const mx1 = Math.max(0, Math.floor(lbx1 * scaleX))
    const my1 = Math.max(0, Math.floor(lby1 * scaleY))
    const mx2 = Math.min(maskW, Math.ceil(lbx2 * scaleX))
    const my2 = Math.min(maskH, Math.ceil(lby2 * scaleY))

    const imageData = platform.createImageData(imgW, imgH)
    const pixels = imageData.data

    for (let iy = 0; iy < imgH; iy++) {
      const mfy = (iy * prep.ratio + prep.padY) * scaleY
      const miy = Math.floor(mfy)
      if (miy < my1 || miy >= my2) continue

      for (let ix = 0; ix < imgW; ix++) {
        const mfx = (ix * prep.ratio + prep.padX) * scaleX
        const mix = Math.floor(mfx)
        if (mix < mx1 || mix >= mx2) continue

        const val = combined[miy * maskW + mix]
        if (val > 0.5) {
          const idx = (iy * imgW + ix) * 4
          pixels[idx] = 255
          pixels[idx + 1] = 255
          pixels[idx + 2] = 255
          pixels[idx + 3] = 255
        }
      }
    }

    masks.push(imageData)
  }

  return masks
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run bubble detection on an image.
 *
 * @param {PipelineImage} image
 * @param {PlatformProvider} platform
 * @returns {Promise<BubbleDetectResult>}
 */
export async function detectBubbles(image, platform) {
  const { output0, output0Shape, output1, output1Shape, prep, actualProvider, actualWebnnDeviceType } = await runBubbleInference(image, platform)
  const imgW = image.naturalWidth
  const imgH = image.naturalHeight

  const detections = decodeDetections(output0, output0Shape, prep, imgW, imgH)
  const masks = decodeMasks(detections, output1, output1Shape, prep, imgW, imgH, platform)

  const bubbles = detections.map((det, i) => ({
    box: det.box,
    score: det.score,
    mask: masks[i],
  }))

  return { bubbles, actualProvider, actualWebnnDeviceType }
}

// ---------------------------------------------------------------------------
// Region ↔ Bubble matching
// ---------------------------------------------------------------------------

/**
 * Match text regions to detected speech bubbles.
 *
 * Each region whose center falls within a bubble mask is assigned the
 * smallest containing bubble's box and mask. Regions that don't match any
 * bubble are tracked as unmatched.
 *
 * @param {Array<TextRegion>} regions
 * @param {Array<BubbleDetection>} bubbles
 * @returns {{ unmatchedCount: number, unmatchedRegionIds: Array<string> }}
 */
export function matchRegionsToBubbles(
  regions,
  bubbles
) {
  /** @type {Array<string>} */
  const unmatchedRegionIds = []

  for (const region of regions) {
    const cx = region.box.x + region.box.width / 2
    const cy = region.box.y + region.box.height / 2

    let bestBubble = null
    let bestArea = Infinity

    for (const bubble of bubbles) {
      const area = bubble.box.width * bubble.box.height
      if (area >= bestArea) continue

      const px = Math.round(cx)
      const py = Math.round(cy)
      const maskW = bubble.mask.width
      const maskH = bubble.mask.height
      if (px < 0 || px >= maskW || py < 0 || py >= maskH) continue

      const idx = (py * maskW + px) * 4
      if (bubble.mask.data[idx + 3] > 0) {
        bestBubble = bubble
        bestArea = area
      }
    }

    if (bestBubble) {
      region.bubbleBox = { ...bestBubble.box }
      region.bubbleMask = bestBubble.mask
    } else {
      unmatchedRegionIds.push(region.id)
    }
  }

  return {
    unmatchedCount: unmatchedRegionIds.length,
    unmatchedRegionIds,
  }
}
