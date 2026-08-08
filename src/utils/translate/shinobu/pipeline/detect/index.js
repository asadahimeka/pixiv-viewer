/**
 * @file Text detection entry point — orchestrates ONNX → Tesseract → Heuristic fallback.
 *
 * Mechanically converted from ShinobuTranslator `src/pipeline/detect/index.ts`
 * (TS → JS). Types → JSDoc @typedef / import() references.
 *
 * Fallback chain (preserved verbatim from Shinobu source):
 *   1. ONNX model (detector) — primary, GPU-preprocess + IO binding
 *   2. Tesseract OCR (dynamic import, may fail gracefully)
 *   3. Pure heuristic (threshold + connected components)
 *
 * Exports:
 *   detectTextRegionsWithMask — full pipeline with engine tracking
 *   detectTextRegions         — convenience, returns regions only
 */

import { detectByOnnx } from './onnxDetect.js'
import { detectByTesseract, detectByHeuristic } from './heuristicDetect.js'

// ---------------------------------------------------------------------------
// Doc-only type imports — zero runtime impact
// ---------------------------------------------------------------------------

/** @typedef {import('./onnxDetect.js').DetectOutput} DetectOutput */

// Re-export the DetectOutput placeholder (runtime value + JSDoc type) from onnxDetect.js
export { DetectOutput } from './onnxDetect.js'

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

// ---------------------------------------------------------------------------
// Detection pipeline
// ---------------------------------------------------------------------------

/**
 * Detect text regions in an image, with raw mask canvas output.
 *
 * @param {import('../../runtime/platform.js').PipelineImage} image
 * @param {import('../../runtime/platform.js').PlatformProvider} platform
 * @returns {Promise<DetectOutput>}
 */
export async function detectTextRegionsWithMask(image, platform) {
  /** @type {Array<string>} */
  const fallbackReasons = []
  try {
    const onnxResult = await detectByOnnx(image, platform)
    if (onnxResult.regions.length > 0) {
      return { ...onnxResult, engine: 'onnx' }
    }
    throw new Error('未找到文本')
  } catch (error) {
    if (error instanceof Error && error.message === '未找到文本') {
      throw error
    }
    const reason = toErrorMessage(error)
    fallbackReasons.push(`onnx: ${reason}`)
    console.warn(`[detect] onnx detector unavailable, fallback to tesseract/heuristic: ${reason}`)
  }

  try {
    const tessRegions = await detectByTesseract(image, platform)
    if (tessRegions.length > 0) {
      return {
        regions: tessRegions,
        rawMaskCanvas: null,
        engine: 'tesseract',
        fallbackReason: fallbackReasons.join(' | '),
      }
    }
  } catch (error) {
    const reason = toErrorMessage(error)
    fallbackReasons.push(`tesseract: ${reason}`)
    console.warn(`[detect] tesseract fallback unavailable, switch to heuristic: ${reason}`)
  }

  const heuristicRegions = await detectByHeuristic(image, platform)
  if (heuristicRegions.length === 0) {
    throw new Error('未找到文本')
  }
  return {
    regions: heuristicRegions,
    rawMaskCanvas: null,
    engine: 'heuristic',
    fallbackReason: fallbackReasons.join(' | '),
  }
}

/**
 * Convenience wrapper: detect text regions, return regions only.
 *
 * @param {import('../../runtime/platform.js').PipelineImage} image
 * @param {import('../../runtime/platform.js').PlatformProvider} platform
 * @returns {Promise<Array<import('../../types.js').TextRegion>>}
 */
export async function detectTextRegions(image, platform) {
  const result = await detectTextRegionsWithMask(image, platform)
  return result.regions
}
