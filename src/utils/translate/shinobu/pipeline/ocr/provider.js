/**
 * @file OCR provider registry — register, alias, lookup OCR engines.
 *
 * Mechanically converted from ShinobuTranslator
 * `src/pipeline/ocr/provider.ts` (TS → JS).
 *
 * The `colorDistance` function from `../typeset/color.ts` has been inlined here
 * since the typeset module is not yet ported. It's a pure CIELAB DeltaE calculation.
 */

import { sampleEdgeColors, sampleCornerBgColor, sampleTextColors } from './colorSampling.js'

/** @typedef {import('../../types.js').OcrRunDebugInfo} OcrRunDebugInfo */
/** @typedef {import('../../types.js').QuadPoint} QuadPoint */
/** @typedef {import('../../types.js').TextDirection} TextDirection */
/** @typedef {import('../../types.js').TextRegion} TextRegion */
/** @typedef {import('../../runtime/platform.js').PlatformProvider} PlatformProvider */
/** @typedef {import('../../runtime/platform.js').PipelineImage} PipelineImage */

/**
 * @typedef {Object} OcrRecognizeResult
 * @property {string} [regionId] - Source region identity, retained even when other regions are rejected
 * @property {string} text
 * @property {number} confidence
 * @property {[QuadPoint, QuadPoint, QuadPoint, QuadPoint]} quad
 * @property {TextDirection} [direction]
 * @property {[number, number, number]} [fgColor]
 * @property {[number, number, number]} [bgColor]
 */
export const OcrRecognizeResult = {}

/**
 * @typedef {Object} OcrRecognizeOutput
 * @property {Array<OcrRecognizeResult>} results
 * @property {import('../../runtime/onnxTypes.js').RuntimeProvider} provider
 * @property {import('../../runtime/onnxTypes.js').WebNnDeviceType} [webnnDeviceType]
 * @property {OcrRunDebugInfo} [debug]
 */
export const OcrRecognizeOutput = {}

/**
 * @typedef {Object} OcrProvider
 * @property {string} name
 * @property {function(PipelineImage, Array<TextRegion>, PlatformProvider): Promise<OcrRecognizeOutput>} recognize
 */
export const OcrProvider = {}

// ---------------------------------------------------------------------------
// Inlined colorDistance (from src/pipeline/typeset/color.ts)
// ---------------------------------------------------------------------------

/**
 * Convert sRGB [0,255] to CIELAB using D65 illuminant.
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {[number, number, number]}
 */
function rgbToLab(r, g, b) {
  let rl = r / 255
  let gl = g / 255
  let bl = b / 255
  rl = rl > 0.04045 ? Math.pow((rl + 0.055) / 1.055, 2.4) : rl / 12.92
  gl = gl > 0.04045 ? Math.pow((gl + 0.055) / 1.055, 2.4) : gl / 12.92
  bl = bl > 0.04045 ? Math.pow((bl + 0.055) / 1.055, 2.4) : bl / 12.92

  let x = (rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375) / 0.95047
  let y = rl * 0.2126729 + gl * 0.7151522 + bl * 0.0721750
  let z = (rl * 0.0193339 + gl * 0.1191920 + bl * 0.9503041) / 1.08883

  const f = t => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
  x = f(x)
  y = f(y)
  z = f(z)

  return [116 * y - 16, 500 * (x - y), 200 * (y - z)]
}

/**
 * CIE76 color difference (Euclidean distance in CIELAB space).
 * @param {[number, number, number]} c1
 * @param {[number, number, number]} c2
 * @returns {number}
 */
function colorDistance(c1, c2) {
  const lab1 = rgbToLab(c1[0], c1[1], c1[2])
  const lab2 = rgbToLab(c2[0], c2[1], c2[2])
  return Math.sqrt(
    (lab1[0] - lab2[0]) ** 2 +
    (lab1[1] - lab2[1]) ** 2 +
    (lab1[2] - lab2[2]) ** 2
  )
}

// ---------------------------------------------------------------------------
// OCR provider registry
// ---------------------------------------------------------------------------

/** @type {Object.<string, OcrProvider>} */
const ocrProviders = {}

/**
 * @param {OcrProvider} provider
 */
export function registerOcrProvider(provider) {
  ocrProviders[provider.name] = provider
}

/**
 * @param {string} alias
 * @param {string} providerName
 */
export function registerOcrProviderAlias(alias, providerName) {
  const provider = ocrProviders[providerName]
  if (provider) {
    ocrProviders[alias] = provider
  }
}

/**
 * @param {string} name
 * @returns {OcrProvider|undefined}
 */
export function getOcrProvider(name) {
  return ocrProviders[name]
}

// ---------------------------------------------------------------------------
// Direction inference
// ---------------------------------------------------------------------------

/**
 * @param {[QuadPoint, QuadPoint, QuadPoint, QuadPoint]} quad
 * @returns {TextDirection}
 */
export function inferDirectionFromQuad(quad) {
  const minX = Math.min(quad[0].x, quad[1].x, quad[2].x, quad[3].x)
  const maxX = Math.max(quad[0].x, quad[1].x, quad[2].x, quad[3].x)
  const minY = Math.min(quad[0].y, quad[1].y, quad[2].y, quad[3].y)
  const maxY = Math.max(quad[0].y, quad[1].y, quad[2].y, quad[3].y)
  const width = maxX - minX
  const height = maxY - minY
  return width >= height ? 'h' : 'v'
}

// ---------------------------------------------------------------------------
// Fill helpers
// ---------------------------------------------------------------------------

/**
 * @param {PipelineImage} image
 * @param {[QuadPoint, QuadPoint, QuadPoint, QuadPoint]} quad
 * @param {PlatformProvider} platform
 * @returns {{ data: Uint8ClampedArray, width: number, height: number } | null}
 */
function cropQuadRegion(image, quad, platform) {
  const xs = quad.map(p => p.x)
  const ys = quad.map(p => p.y)
  const minX = Math.floor(Math.min(...xs))
  const minY = Math.floor(Math.min(...ys))
  const maxX = Math.ceil(Math.max(...xs))
  const maxY = Math.ceil(Math.max(...ys))
  const width = maxX - minX
  const height = maxY - minY
  const canvas = platform.createCanvas(width, height)
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(image, minX, minY, width, height, 0, 0, width, height)
  const imageData = ctx.getImageData(0, 0, width, height)
  return { data: imageData.data, width, height }
}

/**
 * Fill missing OCR fields (direction, fgColor, bgColor) using image sampling.
 * When the OCR model provides both colors but they're too similar (CIELAB
 * DeltaE < 30), falls back to pixel candidate analysis.
 *
 * @param {Array<OcrRecognizeResult>} results
 * @param {PipelineImage} [image]
 * @param {PlatformProvider} [platform]
 * @returns {Array<OcrRecognizeResult>}
 */
export function fillMissingOcrFields(results, image, platform) {
  return results.map(r => {
    let fgColor = r.fgColor
    let bgColor = r.bgColor

    // When OCR model provides both colors but they're too similar, fall back
    if (fgColor && bgColor && colorDistance(fgColor, bgColor) < 30) {
      if (image) {
        const cropped = cropQuadRegion(image, r.quad, platform)
        if (cropped) {
          const sampledColors = sampleTextColors(cropped.data, cropped.width, cropped.height)
          if (sampledColors) {
            fgColor = sampledColors.fgColor
            bgColor = sampledColors.bgColor
          }
        }
      }
    }

    if (image && (fgColor === undefined || bgColor === undefined)) {
      const cropped = cropQuadRegion(image, r.quad, platform)
      if (cropped) {
        // Try unified pixel candidates first; Sobel/corners are last-resort fallbacks
        const sampledColors = sampleTextColors(cropped.data, cropped.width, cropped.height)
        if (sampledColors) {
          if (fgColor === undefined) fgColor = sampledColors.fgColor
          if (bgColor === undefined) bgColor = sampledColors.bgColor
        } else {
          if (fgColor === undefined) {
            const sampled = sampleEdgeColors(cropped.data, cropped.width, cropped.height)
            fgColor = sampled ?? [0, 0, 0]
          }
          if (bgColor === undefined) {
            bgColor = sampleCornerBgColor(cropped.data, cropped.width, cropped.height)
          }
        }
      }
    }

    return {
      ...r,
      direction: r.direction ?? inferDirectionFromQuad(r.quad),
      fgColor: fgColor ?? [0, 0, 0],
      bgColor: bgColor ?? [255, 255, 255],
    }
  })
}
