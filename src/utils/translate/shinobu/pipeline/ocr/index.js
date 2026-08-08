/**
 * @file OCR stage entry point — registers PaddleOCR provider and exports runOcr.
 *
 * Mechanically converted from ShinobuTranslator
 * `src/pipeline/ocr/index.ts` (TS → JS).
 */

import {
  registerOcrProvider,
  registerOcrProviderAlias,
  getOcrProvider,
  fillMissingOcrFields,
} from './provider.js'
import { paddleocrV6MediumProvider } from './paddleocrProvider.js'

/** @typedef {import('./provider.js').OcrRecognizeResult} OcrRecognizeResult */
/** @typedef {import('../../types.js').OcrRunDebugInfo} OcrRunDebugInfo */
/** @typedef {import('../../types.js').TextRegion} TextRegion */
/** @typedef {import('../../runtime/platform.js').PlatformProvider} PlatformProvider */
/** @typedef {import('../../runtime/platform.js').PipelineImage} PipelineImage */

// ---------------------------------------------------------------------------
// Register built-in OCR providers
// ---------------------------------------------------------------------------

registerOcrProvider(paddleocrV6MediumProvider)
registerOcrProviderAlias('builtin', 'paddleocr_v6_medium')
registerOcrProviderAlias('48px', 'paddleocr_v6_medium')
registerOcrProviderAlias('paddleocr', 'paddleocr_v6_medium')
registerOcrProviderAlias('paddleocr_v6_small', 'paddleocr_v6_medium')

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} OcrResult
 * @property {Array<TextRegion>} regions
 * @property {import('../../runtime/onnxTypes.js').RuntimeProvider} actualProvider
 * @property {import('../../runtime/onnxTypes.js').WebNnDeviceType} [actualWebnnDeviceType]
 * @property {OcrRunDebugInfo} debug
 */
export const OcrResult = {}

/**
 * @typedef {Object} RunOcrOptions
 * @property {boolean} [compactActiveBatch]
 */

// ---------------------------------------------------------------------------
// mapResultsToRegions
// ---------------------------------------------------------------------------

/**
 * Map OCR recognition results back to TextRegions with original box/properties.
 * @param {Array<OcrRecognizeResult>} results
 * @param {Array<TextRegion>} detectedRegions
 * @returns {Array<TextRegion>}
 */
export function mapResultsToRegions(results, detectedRegions) {
  const detectedById = new Map(detectedRegions.map(region => [region.id, region]))
  return results.map((result, index) => {
    const detected = (
      (result.regionId ? detectedById.get(result.regionId) : undefined) ??
      detectedRegions[index]
    )
    return {
      id: detected?.id ?? result.regionId ?? `ocr-${index}`,
      box: detected?.box ?? { x: 0, y: 0, width: 0, height: 0 },
      quad: result.quad,
      direction: result.direction,
      prob: result.confidence,
      fgColor: result.fgColor,
      bgColor: result.bgColor,
      sourceText: result.text,
      translatedText: '',
    }
  })
}

// ---------------------------------------------------------------------------
// Debug helpers
// ---------------------------------------------------------------------------

/**
 * @param {number} resultCount
 * @returns {OcrRunDebugInfo}
 */
function createDefaultDebug(resultCount) {
  return {
    mode: 'ctc',
    candidateCount: resultCount,
    preparedCount: resultCount,
    preprocessTotalMs: 0,
    preprocessPerRegionMs: [],
    chunkBatchSize: 0,
    chunks: [],
    colorDecodeMode: 'none',
    colorBatchSize: 0,
    colorSessionRunCount: 0,
    colorSessionRunTotalMs: 0,
    colorTotalMs: 0,
    colorFallbackRegions: [],
    fallbackTriggerCount: 0,
    totalSessionRunCount: 0,
    totalSessionRunMs: 0,
  }
}

/**
 * @param {OcrRunDebugInfo} debugInfo
 * @param {Array<OcrRecognizeResult>} results
 * @param {Array<TextRegion>} detectedRegions
 * @param {number} durationMs
 * @returns {OcrRunDebugInfo}
 */
function addExternalColorFillDebug(debugInfo, results, detectedRegions, durationMs) {
  const missingColorResults = results.filter(
    result => result.fgColor === undefined || result.bgColor === undefined
  )
  debugInfo.colorBatchSize = results.length
  debugInfo.colorTotalMs += durationMs
  if (debugInfo.paddle) {
    debugInfo.paddle.colorFillMs = (debugInfo.paddle.colorFillMs ?? 0) + durationMs
  }
  if (missingColorResults.length > 0) {
    debugInfo.colorDecodeMode = 'fallback'
    debugInfo.colorFallbackRegions = missingColorResults.map((result, index) => ({
      regionId: (
        result.regionId ??
        detectedRegions[results.indexOf(result)]?.id ??
        `ocr-${index}`
      ),
      durationMs: 0,
      accepted: true,
      error: '模型未返回颜色，使用图像采样补齐',
    }))
  } else if (results.length > 0 && debugInfo.colorDecodeMode === 'none') {
    debugInfo.colorDecodeMode = 'reuse'
  }
  return debugInfo
}

// ---------------------------------------------------------------------------
// Provider normalization
// ---------------------------------------------------------------------------

/**
 * @param {string} [providerName]
 * @returns {string}
 */
function normalizeOcrProviderName(providerName) {
  if (
    !providerName ||
    providerName === 'builtin' ||
    providerName === '48px' ||
    providerName === 'paddleocr' ||
    providerName === 'paddleocr_v6_small'
  ) {
    return 'paddleocr_v6_medium'
  }
  return providerName
}

// ---------------------------------------------------------------------------
// runOcr
// ---------------------------------------------------------------------------

/**
 * Run OCR on detected text regions.
 *
 * Signature preserved from Shinobu source:
 *   runOcr(image, detectedRegions, providerName?, platform?, options?)
 *
 * @param {PipelineImage} image
 * @param {Array<TextRegion>} detectedRegions
 * @param {string} [providerName] - OCR engine name (default: paddleocr_v6_medium)
 * @param {PlatformProvider} [platform]
 * @param {RunOcrOptions} [_options]
 * @returns {Promise<OcrResult>}
 */
export async function runOcr(
  image,
  detectedRegions,
  providerName,
  platform,
  _options
) {
  if (!platform) {
    throw new Error('OCR 需要 PlatformProvider')
  }

  const providerNameResolved = normalizeOcrProviderName(providerName)
  const provider = getOcrProvider(providerNameResolved)
  if (!provider) throw new Error(`OCR 引擎未注册: ${providerNameResolved}`)

  const output = await provider.recognize(image, detectedRegions, platform)
  const colorFillT0 = performance.now()
  const filled = fillMissingOcrFields(output.results, image, platform)
  const colorFillMs = performance.now() - colorFillT0
  const debug = addExternalColorFillDebug(
    output.debug ?? createDefaultDebug(output.results.length),
    output.results,
    detectedRegions,
    colorFillMs
  )
  const regions = mapResultsToRegions(filled, detectedRegions)
  if (regions.length > 0) {
    return {
      regions,
      actualProvider: output.provider,
      actualWebnnDeviceType: output.webnnDeviceType,
      debug,
    }
  }
  throw new Error('OCR 未返回有效识别结果')
}
