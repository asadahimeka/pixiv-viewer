/**
 * @file Heuristic text detection fallback.
 *
 * Mechanically converted from ShinobuTranslator `src/pipeline/detect/heuristicDetect.ts`
 * (TS → JS). Types → JSDoc @typedef / import() references.
 *
 * Fallback strategy when ONNX detection is unavailable:
 *   Pure heuristic: thresholding + connected components + merge
 *
 * NOTE: The original Shinobu source also shipped a Tesseract OCR fallback, but
 *       tesseract.js is NOT a dependency of pixiv-viewer (see plan: only
 *       comlink is added as a new dependency). `detectByTesseract` is therefore
 *       stubbed to return an empty array so the caller (index.js) degrades to
 *       the heuristic detector.
 */

import { connectedComponents, mergeRects, makeRegion } from './onnxDetect.js'
import { clamp } from '../utils.js'

// ---------------------------------------------------------------------------
// Doc-only type imports — zero runtime impact
// ---------------------------------------------------------------------------

/** @typedef {import('../../types.js').Rect} Rect */
/** @typedef {import('../../types.js').TextRegion} TextRegion */
/** @typedef {import('../../runtime/platform.js').PlatformProvider} PlatformProvider */
/** @typedef {import('../../runtime/platform.js').PipelineImage} PipelineImage */

// ===========================================================================
// Heuristic detection helpers (private)
// ===========================================================================

/**
 * @param {Uint8ClampedArray} grays
 * @returns {number}
 */
function estimateThreshold(grays) {
  let sum = 0
  let sq = 0
  for (let i = 0; i < grays.length; i += 1) {
    const v = grays[i]
    sum += v
    sq += v * v
  }
  const mean = sum / grays.length
  const variance = Math.max(0, sq / grays.length - mean * mean)
  const stdev = Math.sqrt(variance)
  return clamp(Math.round(mean - stdev * 0.35), 70, 170)
}

// ===========================================================================
// Exported detection functions
// ===========================================================================

/**
 * Pure heuristic text detection: threshold → connected components → merge.
 *
 * @param {PipelineImage} image
 * @param {PlatformProvider} platform
 * @returns {Promise<Array<TextRegion>>}
 */
export async function detectByHeuristic(image, platform) {
  const maxSide = 1280
  const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight))
  const width = Math.max(1, Math.round(image.naturalWidth * scale))
  const height = Math.max(1, Math.round(image.naturalHeight * scale))

  const canvas = platform.createCanvas(width, height)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) {
    throw new Error('文本检测阶段无法创建画布上下文')
  }
  ctx.drawImage(image, 0, 0, width, height)
  const imageData = ctx.getImageData(0, 0, width, height)
  const pixels = imageData.data
  const totalPixels = width * height
  const grays = new Uint8ClampedArray(totalPixels)

  for (let i = 0, p = 0; i < totalPixels; i += 1, p += 4) {
    grays[i] = Math.round(pixels[p] * 0.299 + pixels[p + 1] * 0.587 + pixels[p + 2] * 0.114)
  }
  const threshold = estimateThreshold(grays)
  const dark = new Uint8Array(totalPixels)
  for (let i = 0; i < totalPixels; i += 1) {
    dark[i] = grays[i] < threshold ? 1 : 0
  }

  const mapped = connectedComponents(dark, width, height)
  const scaleX = image.naturalWidth / width
  const scaleY = image.naturalHeight / height
  const pad = Math.max(4, Math.round(Math.min(scaleX, scaleY) * 6))
  const imageArea = image.naturalWidth * image.naturalHeight
  const projected = mapped
    .map(rect => {
      const x = clamp(Math.floor(rect.x * scaleX) - pad, 0, image.naturalWidth - 1)
      const y = clamp(Math.floor(rect.y * scaleY) - pad, 0, image.naturalHeight - 1)
      const right = clamp(Math.ceil((rect.x + rect.width) * scaleX) + pad, x + 1, image.naturalWidth)
      const bottom = clamp(Math.ceil((rect.y + rect.height) * scaleY) + pad, y + 1, image.naturalHeight)
      return { x, y, width: right - x, height: bottom - y }
    })
    .filter(rect => {
      const ratio = (rect.width * rect.height) / imageArea
      return ratio >= 0.00005 && ratio <= 0.18
    })

  const merged = mergeRects(projected, Math.max(6, Math.round(Math.min(scaleX, scaleY) * 12)))
  const sorted = merged
    .sort((a, b) => b.width * b.height - a.width * a.height)
    .slice(0, 40)
    .sort((a, b) => a.y - b.y || a.x - b.x)

  return sorted.map(makeRegion)
}

/**
 * Tesseract-based text detection.
 *
 * NOTE: tesseract.js is NOT a dependency of pixiv-viewer. Stubbed to return an
 *       empty array so the caller (index.js) degrades to the heuristic detector.
 *
 * @param {PipelineImage} image
 * @param {PlatformProvider} platform
 * @returns {Promise<Array<TextRegion>>}
 */
export async function detectByTesseract(image, platform) {
  return []
}
