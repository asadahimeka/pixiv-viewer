/**
 * @file OCR post-filter — removes false-positive regions from OCR output.
 *
 * Mechanically converted from ShinobuTranslator
 * `src/pipeline/ocrPostFilter/index.ts` (TS → JS).
 *
 * The filter works by asking the OCR engine to recognize each candidate
 * region at three slightly different scales (inset / original / outset)
 * and then applying the danbooru-medium-v4 rule to decide whether the
 * region is a false positive.
 *
 * Degradation behaviour: on any internal error this module catches the
 * throw and returns the original region list unchanged + a debug record
 * with skippedReason = 'error'.  It MUST NOT fail-fast — the orchestrator
 * should always be able to continue.
 */

import { getOcrProvider } from '../ocr/provider.js'
import {
  evaluateOcrPostFilterCandidate,
  OCR_POST_FILTER_RULE_ID,
} from './rule.js'

/** @typedef {import('../../types.js').TextRegion} TextRegion */
/** @typedef {import('../../types.js').QuadPoint} QuadPoint */
/** @typedef {import('../../types.js').Rect} Rect */
/** @typedef {import('../../types.js').OcrPostFilterDebugInfo} OcrPostFilterDebugInfo */
/** @typedef {import('../../types.js').OcrPostFilterDebugDecision} OcrPostFilterDebugDecision */
/** @typedef {import('../../runtime/platform.js').PlatformProvider} PlatformProvider */
/** @typedef {import('../../runtime/platform.js').PipelineCanvas} PipelineCanvas */
/** @typedef {import('../../runtime/platform.js').PipelineImage} PipelineImage */
/** @typedef {import('../ocr/provider.js').OcrProvider} OcrProvider */
/** @typedef {import('../ocr/provider.js').OcrRecognizeOutput} OcrRecognizeOutput */
/** @typedef {import('./rule.js').OcrPostFilterVariant} OcrPostFilterVariant */
/** @typedef {import('./rule.js').OcrPostFilterMaskFeatures} OcrPostFilterMaskFeatures */

const MAX_MASK_SAMPLE_SIDE = 320
const OCR_VARIANTS = [
  { name: 'inset', scale: 0.94 },
  { name: 'original', scale: 1 },
  { name: 'outset', scale: 1.06 },
]

/**
 * @typedef {Object} OcrPostFilterOptions
 * @property {PlatformProvider} platform
 * @property {string} providerName
 * @property {OcrProvider['recognize']} [recognize]
 */

/**
 * @typedef {Object} OcrPostFilterResult
 * @property {Array<TextRegion>} regions
 * @property {OcrPostFilterDebugInfo} debug
 */

/**
 * @typedef {Object} VariantMetadata
 * @property {TextRegion} sourceRegion
 * @property {string} name
 * @property {TextRegion} variantRegion
 */

/**
 * @param {string} text
 * @returns {string}
 */
function normalizeText(text) {
  return text.normalize('NFKC').replace(/\s+/gu, '')
}

/**
 * @param {string} text
 * @returns {number}
 */
function countGraphemes(text) {
  if (typeof Intl.Segmenter === 'function') {
    return Array.from(
      new Intl.Segmenter('ja', { granularity: 'grapheme' }).segment(text)
    ).length
  }
  return Array.from(text).length
}

/**
 * @param {number} value
 * @param {number} minimum
 * @param {number} maximum
 * @returns {number}
 */
function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value))
}

/**
 * @param {Pick<TextRegion, 'box'|'quad'>} region
 * @returns {[QuadPoint, QuadPoint, QuadPoint, QuadPoint]}
 */
function regionQuad(region) {
  return region.quad ?? [
    { x: region.box.x, y: region.box.y },
    { x: region.box.x + region.box.width, y: region.box.y },
    { x: region.box.x + region.box.width, y: region.box.y + region.box.height },
    { x: region.box.x, y: region.box.y + region.box.height },
  ]
}

/**
 * @param {TextRegion} region
 * @param {number} scale
 * @param {number} imageWidth
 * @param {number} imageHeight
 * @returns {[QuadPoint, QuadPoint, QuadPoint, QuadPoint]}
 */
function scaledQuad(region, scale, imageWidth, imageHeight) {
  const quad = regionQuad(region)
  const centerX = quad.reduce((sum, point) => sum + point.x, 0) / quad.length
  const centerY = quad.reduce((sum, point) => sum + point.y, 0) / quad.length
  return quad.map(point => ({
    x: clamp(
      centerX + (point.x - centerX) * scale,
      0,
      Math.max(0, imageWidth - 1)
    ),
    y: clamp(
      centerY + (point.y - centerY) * scale,
      0,
      Math.max(0, imageHeight - 1)
    ),
  }))
}

/**
 * @param {[QuadPoint, QuadPoint, QuadPoint, QuadPoint]} quad
 * @returns {Rect}
 */
function quadBox(quad) {
  const minX = Math.floor(Math.min(...quad.map(point => point.x)))
  const minY = Math.floor(Math.min(...quad.map(point => point.y)))
  const maxX = Math.ceil(Math.max(...quad.map(point => point.x)))
  const maxY = Math.ceil(Math.max(...quad.map(point => point.y)))
  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  }
}

/**
 * @param {TextRegion} region
 * @param {number} imageWidth
 * @param {number} imageHeight
 * @returns {boolean}
 */
function isExpandedGateCandidate(region, imageWidth, imageHeight) {
  const normalized = normalizeText(region.sourceText)
  const width = Math.max(1, region.box.width)
  const height = Math.max(1, region.box.height)
  return (
    Boolean(normalized) &&
    region.bubbleBox === undefined &&
    (region.originalLineCount ?? 1) <= 1 &&
    countGraphemes(normalized) <= 5 &&
    width * height / Math.max(1, imageWidth * imageHeight) >= 0.015 &&
    Math.max(width / height, height / width) <= 2.6
  )
}

/**
 * @param {number} x
 * @param {number} y
 * @param {QuadPoint[]} polygon
 * @returns {boolean}
 */
function pointInPolygon(x, y, polygon) {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const a = polygon[i]
    const b = polygon[j]
    const crosses = (
      (a.y > y) !== (b.y > y) &&
      x < (b.x - a.x) * (y - a.y) / (b.y - a.y || 1e-12) + a.x
    )
    if (crosses) inside = !inside
  }
  return inside
}

/**
 * @param {Uint8Array} binary
 * @param {number} width
 * @param {number} height
 * @returns {number[]}
 */
function connectedComponentAreas(binary, width, height) {
  const visited = new Uint8Array(binary.length)
  const queue = new Int32Array(binary.length)
  const areas = []
  for (let start = 0; start < binary.length; start += 1) {
    if (binary[start] === 0 || visited[start] === 1) continue
    let head = 0
    let tail = 0
    let componentArea = 0
    queue[tail++] = start
    visited[start] = 1
    while (head < tail) {
      const index = queue[head++]
      componentArea += 1
      const x = index % width
      const y = Math.floor(index / width)
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) continue
          const nextX = x + dx
          const nextY = y + dy
          if (nextX < 0 || nextY < 0 || nextX >= width || nextY >= height) {
            continue
          }
          const next = nextY * width + nextX
          if (binary[next] === 0 || visited[next] === 1) continue
          visited[next] = 1
          queue[tail++] = next
        }
      }
    }
    if (componentArea >= 2) areas.push(componentArea)
  }
  return areas
}

/**
 * @param {PipelineCanvas} rawMask
 * @param {TextRegion} region
 * @param {PlatformProvider} platform
 * @returns {OcrPostFilterMaskFeatures}
 */
function measureMask(rawMask, region, platform) {
  const boxX = Math.max(0, Math.floor(region.box.x))
  const boxY = Math.max(0, Math.floor(region.box.y))
  const boxWidth = Math.max(1, Math.min(
    rawMask.width - boxX,
    Math.ceil(region.box.width)
  ))
  const boxHeight = Math.max(1, Math.min(
    rawMask.height - boxY,
    Math.ceil(region.box.height)
  ))
  const sampleScale = Math.min(
    1,
    MAX_MASK_SAMPLE_SIDE / Math.max(boxWidth, boxHeight)
  )
  const sampleWidth = Math.max(1, Math.round(boxWidth * sampleScale))
  const sampleHeight = Math.max(1, Math.round(boxHeight * sampleScale))
  const sampleCanvas = platform.createCanvas(sampleWidth, sampleHeight)
  const context = sampleCanvas.getContext('2d')
  if (!context) {
    throw new Error('raw mask 2d context unavailable')
  }
  context.imageSmoothingEnabled = false
  context.drawImage(
    rawMask,
    boxX,
    boxY,
    boxWidth,
    boxHeight,
    0,
    0,
    sampleWidth,
    sampleHeight
  )
  const rgba = context.getImageData(0, 0, sampleWidth, sampleHeight).data
  const quad = regionQuad(region).map(point => ({
    x: (point.x - boxX) / boxWidth * sampleWidth,
    y: (point.y - boxY) / boxHeight * sampleHeight,
  }))
  const binary = new Uint8Array(sampleWidth * sampleHeight)
  let quadSamplePixels = 0
  let foregroundPixels = 0
  for (let y = 0; y < sampleHeight; y += 1) {
    for (let x = 0; x < sampleWidth; x += 1) {
      if (!pointInPolygon(x + 0.5, y + 0.5, quad)) continue
      quadSamplePixels += 1
      const index = y * sampleWidth + x
      if (rgba[index * 4] <= 127) continue
      binary[index] = 1
      foregroundPixels += 1
    }
  }
  let boundaryPixels = 0
  for (let y = 0; y < sampleHeight; y += 1) {
    for (let x = 0; x < sampleWidth; x += 1) {
      const index = y * sampleWidth + x
      if (binary[index] === 0) continue
      if (
        x === 0 ||
        y === 0 ||
        x === sampleWidth - 1 ||
        y === sampleHeight - 1 ||
        binary[index - 1] === 0 ||
        binary[index + 1] === 0 ||
        binary[index - sampleWidth] === 0 ||
        binary[index + sampleWidth] === 0
      ) {
        boundaryPixels += 1
      }
    }
  }
  const componentAreas = connectedComponentAreas(binary, sampleWidth, sampleHeight)
  return {
    maskFillRatioInQuad: foregroundPixels / Math.max(1, quadSamplePixels),
    componentCount: componentAreas.length,
    largestComponentRatio: Math.max(0, ...componentAreas) /
      Math.max(1, foregroundPixels),
    boundaryPixelRatio: boundaryPixels / Math.max(1, foregroundPixels),
  }
}

/**
 * @param {Array<TextRegion>} candidates
 * @param {number} imageWidth
 * @param {number} imageHeight
 * @returns {VariantMetadata[]}
 */
function buildVariantMetadata(candidates, imageWidth, imageHeight) {
  return candidates.flatMap(sourceRegion => OCR_VARIANTS.map(variant => {
    const quad = scaledQuad(
      sourceRegion,
      variant.scale,
      imageWidth,
      imageHeight
    )
    return {
      sourceRegion,
      name: variant.name,
      variantRegion: {
        id: `${sourceRegion.id}::postfilter-${variant.name}-${variant.scale}`,
        box: quadBox(quad),
        quad,
        direction: sourceRegion.direction,
        sourceText: '',
        translatedText: '',
      },
    }
  }))
}

/**
 * @param {TextRegion} region
 * @param {VariantMetadata[]} metadata
 * @param {OcrRecognizeOutput} rawOcr
 * @returns {OcrPostFilterVariant[]}
 */
function variantsForRegion(region, metadata, rawOcr) {
  const debugByRegionId = new Map(
    (rawOcr.debug?.paddle?.regions ?? []).map(item => [item.regionId, item])
  )
  const acceptedByRegionId = new Map(
    rawOcr.results
      .filter(item => item.regionId)
      .map(item => [item.regionId, item])
  )
  return metadata
    .filter(item => item.sourceRegion.id === region.id)
    .map(item => {
      const debug = debugByRegionId.get(item.variantRegion.id)
      const accepted = acceptedByRegionId.get(item.variantRegion.id)
      return {
        name: item.name,
        text: debug?.decodedText ?? accepted?.text ?? '',
        confidence: debug?.confidence ?? accepted?.confidence ?? 0,
        accepted: debug?.accepted ?? Boolean(accepted),
      }
    })
}

/**
 * @param {TextRegion} region
 * @param {number} relativeArea
 * @param {number} aspectRatio
 * @param {OcrPostFilterVariant[]} variants
 * @param {OcrPostFilterMaskFeatures} mask
 * @returns {OcrPostFilterDebugDecision}
 */
function makeDebugDecision(region, relativeArea, aspectRatio, variants, mask) {
  const evaluation = evaluateOcrPostFilterCandidate({
    sourceText: region.sourceText,
    probability: region.prob ?? 0,
    originalLineCount: region.originalLineCount ?? 1,
    hasBubble: region.bubbleBox !== undefined,
    relativeArea,
    aspectRatio,
    variants,
    mask,
  })
  return {
    regionId: region.id,
    sourceText: region.sourceText,
    relativeArea,
    aspectRatio,
    variants,
    mask,
    eligible: evaluation.eligible,
    shouldFilter: evaluation.shouldFilter,
    majorityAgreement: evaluation.majorityAgreement,
    variantScriptDrift: evaluation.variantScriptDrift,
    nonEmptyScriptDrift: evaluation.nonEmptyScriptDrift,
    originalVariantConfidence: evaluation.originalVariantConfidence,
    maskSignalCount: evaluation.maskSignalCount,
    junkLikeSource: evaluation.junkLikeSource,
    poorConsensus: evaluation.poorConsensus,
    protectionReason: evaluation.protectionReason,
  }
}

/**
 * Post-filter OCR regions — remove false-positive detections by
 * running scaled variants through OCR and applying the danbooru-medium-v4
 * evaluation rule.
 *
 * Degradation: on any internal error the function console.warn()s the
 * error detail and returns ALL original regions unchanged (skippedReason
 * = 'error').  The orchestrator must never abort because of a post-filter
 * failure.
 *
 * @param {PipelineImage} image
 * @param {PipelineCanvas} rawMask
 * @param {Array<TextRegion>} regions
 * @param {OcrPostFilterOptions} options
 * @returns {Promise<OcrPostFilterResult>}
 */
export async function filterOcrRegions(image, rawMask, regions, options) {
  const startedAt = performance.now()
  try {
    const imageWidth = image.naturalWidth
    const imageHeight = image.naturalHeight
    const candidates = regions.filter(region => (
      isExpandedGateCandidate(region, imageWidth, imageHeight)
    ))
    if (candidates.length === 0) {
      return {
        regions,
        debug: {
          mode: 'balanced',
          ruleId: OCR_POST_FILTER_RULE_ID,
          candidateCount: 0,
          filteredCount: 0,
          filteredRegionIds: [],
          decisions: [],
          durationMs: performance.now() - startedAt,
          skippedReason: 'no-candidates',
        },
      }
    }
    const metadata = buildVariantMetadata(candidates, imageWidth, imageHeight)
    const provider = options.recognize
      ? undefined
      : getOcrProvider(options.providerName)
    const recognize = options.recognize ?? provider?.recognize?.bind(provider)
    if (!recognize) {
      throw new Error(`OCR 引擎未注册: ${options.providerName}`)
    }
    const rawOcr = await recognize(
      image,
      metadata.map(item => item.variantRegion),
      options.platform
    )
    const decisions = candidates.map(region => {
      const width = Math.max(1, region.box.width)
      const height = Math.max(1, region.box.height)
      return makeDebugDecision(
        region,
        width * height / Math.max(1, imageWidth * imageHeight),
        Math.max(width / height, height / width),
        variantsForRegion(region, metadata, rawOcr),
        measureMask(rawMask, region, options.platform)
      )
    })
    const filteredRegionIds = decisions
      .filter(decision => decision.shouldFilter)
      .map(decision => decision.regionId)
    const filtered = new Set(filteredRegionIds)
    return {
      regions: regions.filter(region => !filtered.has(region.id)),
      debug: {
        mode: 'balanced',
        ruleId: OCR_POST_FILTER_RULE_ID,
        candidateCount: candidates.length,
        filteredCount: filteredRegionIds.length,
        filteredRegionIds,
        decisions,
        durationMs: performance.now() - startedAt,
      },
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    console.warn(`[ocr-postfilter] 后处理失败，保留全部区域: ${detail}`)
    return {
      regions,
      debug: {
        mode: 'balanced',
        ruleId: OCR_POST_FILTER_RULE_ID,
        candidateCount: 0,
        filteredCount: 0,
        filteredRegionIds: [],
        decisions: [],
        durationMs: performance.now() - startedAt,
        skippedReason: 'error',
        error: detail,
      },
    }
  }
}
