/**
 * Font size fitting, vertical/horizontal layout calculation core.
 *
 * Source: ShinobuTranslator `src/pipeline/typeset/fontFitCore.ts` (2292 lines)
 *
 * TS→JS mechanical conversion. All type annotations removed; logic preserved
 * verbatim. Bubble-constraint functions (resolveHorizontalMaskHeight,
 * queryMaskMaxY, resolveVerticalContentHeight, etc.) are kept intact.
 */

import { clamp } from '../utils.js'
import { hasBubbleMaskPixel } from '../bubbleMask.js'
import {
  KINSOKU_NSTART,
  KINSOKU_NEND,
  countTextLength,
  countTextGlyphs,
  resolveSourceColumns,
} from './columns.js'
import { segmentVerticalGraphemes, tokenizeVerticalText } from './verticalOrientation.js'
import {
  quadAngle,
  cloneRegionForTypeset,
  getRegionQuad,
  quadCenter,
  quadDimensions,
  rotateQuad,
  quadBounds,
  scaleQuadFromOrigin,
  updateRegionGeometryFromQuad,
} from './geometry.js'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const verticalAdvanceTightenRatio = 1.0
export const verticalColumnSpacingRatio = 0.1
export const minVerticalAdvanceScale = 0.75
export const minSourceGeometryAdvanceScale = 0.6
export const sourceGeometryActualBoxScale = 0.65
export const sourceGeometryAdvanceQuantizationBiasPx = 0.15
export const minVerticalColSpacingScale = 0.5
export const verticalContentHeightExpandBaseRatio = 0.007
export const verticalContentHeightExpandFontRatio = 0.0
export const minVerticalContentHeightExpandPx = 0
export const minFontSafetySize = 8
export const minorOverflowMaxGlyphCount = 2
export const minorOverflowShrinkMinScale = 0.8
export const minOffscreenGuardPaddingPx = 8
export const offscreenGuardPaddingByFontRatio = 0.35
export const minHorizontalLetterSpacingScale = 0.85
export const maxHorizontalLetterSpacingScale = 1.5
export const minHorizontalLineHeightScale = 0.85
export const maxSourceGeometryAnchorAngleRad = 0.052
export const maxVerticalSourceColumnOverlapRatio = 0.45
export const minSidewaysLatinOpticalScale = 0.85
export const maxSidewaysLatinOpticalScale = 1.2

const latinGraphemePattern = /^\p{Script=Latin}\p{M}*$/u

// ---------------------------------------------------------------------------
// Horizontal layout constants
// ---------------------------------------------------------------------------

export const horizontalLetterSpacingRatio = -0.05
export const horizontalLineHeightRatio = 0.93

// ---------------------------------------------------------------------------
// Utility wrappers
// ---------------------------------------------------------------------------

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clampNumber(value, min, max) {
  return clamp(value, min, max)
}

// ---------------------------------------------------------------------------
// Font size resolution
// ---------------------------------------------------------------------------

/**
 * Determine the initial font size for a region.
 * Prefers region.fontSize (from OCR/merge), falls back to box-based heuristic.
 *
 * @param {Object} region
 * @returns {number}
 */
export function resolveInitialFontSize(region) {
  let base

  if (region.fontSize && region.fontSize > 0) {
    base = region.fontSize
  } else {
    base = Math.min(48, Math.max(14, Math.floor(region.box.height / 3)))
  }

  return Math.max(10, Math.min(base, Math.round(
    Math.max(region.box.width, region.box.height) * 0.8
  )))
}

// ---------------------------------------------------------------------------
// Font/glyph functions
// ---------------------------------------------------------------------------

/**
 * Measure a single glyph's visual bounds.
 *
 * @param {Object} ctx
 * @param {string} ch
 * @param {number} fallbackFontSize
 * @returns {{width: number, height: number}}
 */
export function measureGlyphBox(ctx, ch, fallbackFontSize) {
  const metrics = ctx.measureText(ch)
  const left = Number.isFinite(metrics.actualBoundingBoxLeft) ? Math.abs(metrics.actualBoundingBoxLeft) : 0
  const right = Number.isFinite(metrics.actualBoundingBoxRight) ? Math.abs(metrics.actualBoundingBoxRight) : 0
  const ascent = Number.isFinite(metrics.actualBoundingBoxAscent) ? Math.abs(metrics.actualBoundingBoxAscent) : 0
  const descent = Number.isFinite(metrics.actualBoundingBoxDescent) ? Math.abs(metrics.actualBoundingBoxDescent) : 0

  let width = left + right
  let height = ascent + descent

  if (width <= 0) {
    width = metrics.width > 0 ? metrics.width : fallbackFontSize
  }
  if (height <= 0) {
    height = fallbackFontSize
  }

  return { width, height }
}

/**
 * @param {number} value
 * @returns {number}
 */
export function metricAbs(value) {
  return Number.isFinite(value) ? Math.abs(value) : 0
}

/**
 * @param {Object} ctx
 * @param {string} text
 * @param {number} fallbackFontSize
 * @returns {{width: number, height: number, centerX: number, centerY: number}}
 */
function measureTextInkMetrics(ctx, text, fallbackFontSize) {
  const metrics = ctx.measureText(text)
  const left = Number.isFinite(metrics.actualBoundingBoxLeft)
    ? metrics.actualBoundingBoxLeft
    : 0
  const right = Number.isFinite(metrics.actualBoundingBoxRight)
    ? metrics.actualBoundingBoxRight
    : 0
  const ascent = Number.isFinite(metrics.actualBoundingBoxAscent)
    ? metrics.actualBoundingBoxAscent
    : 0
  const descent = Number.isFinite(metrics.actualBoundingBoxDescent)
    ? metrics.actualBoundingBoxDescent
    : 0
  const measuredWidth = left + right
  const measuredHeight = ascent + descent
  const hasHorizontalInkBounds = measuredWidth > 0
  const hasVerticalInkBounds = measuredHeight > 0

  return {
    width: hasHorizontalInkBounds
      ? measuredWidth
      : Math.max(1, metrics.width || fallbackFontSize),
    height: hasVerticalInkBounds
      ? measuredHeight
      : fallbackFontSize,
    centerX: hasHorizontalInkBounds ? (right - left) / 2 : 0,
    centerY: hasVerticalInkBounds ? (descent - ascent) / 2 : 0,
  }
}

/**
 * Estimate vertical advance from font metrics.
 *
 * @param {Object} ctx
 * @param {number} fontSize
 * @returns {number}
 */
export function resolveFontVerticalAdvance(ctx, fontSize) {
  const metrics = ctx.measureText('国')
  const fontBox = metricAbs(metrics.fontBoundingBoxAscent ?? 0) + metricAbs(metrics.fontBoundingBoxDescent ?? 0)
  const resolved = fontBox > 0
    ? fontBox
    : fontSize
  return Math.max(1, Math.ceil(Math.max(resolved, fontSize)))
}

/**
 * Estimate per-glyph vertical advance.
 *
 * @param {Object} ctx
 * @param {string} ch
 * @param {number} fontSize
 * @param {number} defaultAdvanceY
 * @param {number} [advanceScale=1]
 * @param {number} [actualBoxScale]
 * @param {boolean} [useDefaultAdvanceBase=false]
 * @returns {number}
 */
export function resolveGlyphVerticalAdvance(
  ctx,
  ch,
  fontSize,
  defaultAdvanceY,
  advanceScale = 1,
  actualBoxScale,
  useDefaultAdvanceBase = false
) {
  const metrics = ctx.measureText(ch)
  const fontBox = metricAbs(metrics.fontBoundingBoxAscent ?? 0) + metricAbs(metrics.fontBoundingBoxDescent ?? 0)
  const actualBox = metricAbs(metrics.actualBoundingBoxAscent ?? 0) + metricAbs(metrics.actualBoundingBoxDescent ?? 0)
  const glyphAdvanceBase = fontBox > 0
    ? fontBox
    : defaultAdvanceY
  const baseAdvance = useDefaultAdvanceBase ? defaultAdvanceY : glyphAdvanceBase
  const stabilizedAdvance = Math.max(baseAdvance, fontSize * 0.9)
  const resolvedAdvance = stabilizedAdvance * verticalAdvanceTightenRatio * advanceScale

  const resolvedActualBoxScale = actualBoxScale ?? Math.max(advanceScale, minVerticalAdvanceScale)
  const scaledActualBox = actualBox * resolvedActualBoxScale
  const advance = Math.max(scaledActualBox, resolvedAdvance)
  const quantizedAdvance = useDefaultAdvanceBase
    ? advance - sourceGeometryAdvanceQuantizationBiasPx
    : advance
  return Math.max(1, Math.round(quantizedAdvance))
}

/**
 * @param {Object} ctx
 * @param {Object} token
 * @param {number} fontSize
 * @param {number} defaultAdvanceY
 * @param {number} [advanceScale=1]
 * @param {number} [actualBoxScale]
 * @param {boolean} [useDefaultAdvanceBase=false]
 * @returns {Object}
 */
export function resolveVerticalTokenMetrics(
  ctx,
  token,
  fontSize,
  defaultAdvanceY,
  advanceScale = 1,
  actualBoxScale,
  useDefaultAdvanceBase = false
) {
  const ink = measureTextInkMetrics(ctx, token.displayText, fontSize)
  const renderOffsetX = ink.centerX === 0 ? 0 : -ink.centerX
  const renderOffsetY = ink.centerY === 0 ? 0 : -ink.centerY
  if (token.kind !== 'sideways-run') {
    const measureText = token.kind === 'tate-chu-yoko' ? '国' : token.displayText
    return {
      advanceY: resolveGlyphVerticalAdvance(
        ctx,
        measureText,
        fontSize,
        defaultAdvanceY,
        advanceScale,
        actualBoxScale,
        useDefaultAdvanceBase
      ),
      renderInlineScale: 1,
      renderCrossScale: 1,
      renderOffsetX,
      renderOffsetY: 0,
      inkWidth: ink.width,
      inkHeight: ink.height,
      boundaryGap: 0,
    }
  }

  const isLatinRun = token.sourceGlyphCount > 1 &&
    segmentVerticalGraphemes(token.sourceText).every(grapheme =>
      latinGraphemePattern.test(grapheme)
    )
  const referenceInk = measureTextInkMetrics(ctx, '国', fontSize)
  const targetLatinCrossSize = Math.max(
    referenceInk.width,
    Math.min(fontSize, defaultAdvanceY * advanceScale)
  )
  const renderCrossScale = isLatinRun
    ? clampNumber(
      targetLatinCrossSize / Math.max(1, ink.height),
      minSidewaysLatinOpticalScale,
      maxSidewaysLatinOpticalScale
    )
    : 1

  if (token.sourceGlyphCount === 1) {
    const advanceY = resolveGlyphVerticalAdvance(
      ctx,
      token.displayText,
      fontSize,
      defaultAdvanceY,
      advanceScale,
      actualBoxScale,
      useDefaultAdvanceBase
    )
    return {
      advanceY,
      renderInlineScale: Math.min(1, advanceY / Math.max(1, ink.width)),
      renderCrossScale,
      renderOffsetX,
      renderOffsetY,
      inkWidth: ink.width,
      inkHeight: ink.height,
      boundaryGap: 0,
    }
  }

  const boundaryGap = isLatinRun
    ? Math.max(0, (defaultAdvanceY * advanceScale - referenceInk.height) / 2)
    : 0
  const inlineScale = renderCrossScale * (isLatinRun ? 1 : advanceScale)
  const scaledInkWidth = ink.width * inlineScale
  const unquantizedAdvance = scaledInkWidth + boundaryGap * 2
  const quantizedAdvance = useDefaultAdvanceBase
    ? unquantizedAdvance - sourceGeometryAdvanceQuantizationBiasPx
    : unquantizedAdvance
  const advanceY = Math.max(1, Math.round(quantizedAdvance))
  const availableInkWidth = Math.max(1, advanceY - boundaryGap * 2)
  return {
    advanceY,
    renderInlineScale: availableInkWidth / Math.max(1, ink.width),
    renderCrossScale,
    renderOffsetX,
    renderOffsetY,
    inkWidth: ink.width,
    inkHeight: ink.height,
    boundaryGap,
  }
}

/**
 * Resolve per-cell metrics for vertical layout.
 *
 * @param {Object} ctx
 * @param {string} text
 * @param {number} fontSize
 * @param {number} sw
 * @returns {{colWidth: number, defaultAdvanceY: number, colSpacing: number}}
 */
export function resolveVerticalCellMetrics(ctx, text, fontSize, sw) {
  const items = tokenizeVerticalText(text)
  let maxGlyphWidth = 0

  for (const item of items) {
    if (item.kind === 'sideways-run' || item.kind === 'tate-chu-yoko') {
      maxGlyphWidth = Math.max(maxGlyphWidth, fontSize)
      continue
    }
    const box = measureGlyphBox(ctx, item.displayText, fontSize)
    maxGlyphWidth = Math.max(maxGlyphWidth, box.width)
  }

  const defaultAdvanceY = resolveFontVerticalAdvance(ctx, fontSize)
  const safetyPadding = Math.max(1, Math.ceil(sw * 0.5))
  const colWidth = Math.ceil(Math.max(fontSize * 1.1, maxGlyphWidth + safetyPadding))
  const colSpacing = Math.max(1, Math.round(fontSize * verticalColumnSpacingRatio))

  return { colWidth, defaultAdvanceY, colSpacing }
}

/**
 * @param {number} columnCount
 * @param {{colWidth: number, colSpacing: number}} metrics
 * @returns {number}
 */
export function computeVerticalTotalWidth(columnCount, metrics) {
  if (columnCount <= 0) {
    return 0
  }
  return columnCount * metrics.colWidth + Math.max(0, columnCount - 1) * metrics.colSpacing
}

/**
 * @param {number[]} values
 * @returns {number|null}
 */
function medianNumber(values) {
  const finite = values.filter(v => Number.isFinite(v)).sort((a, b) => a - b)
  if (finite.length === 0) {
    return null
  }
  const middle = Math.floor(finite.length / 2)
  if (finite.length % 2 === 1) {
    return finite[middle]
  }
  return (finite[middle - 1] + finite[middle]) / 2
}

/**
 * @param {string} text
 * @returns {string}
 */
function normalizeGeometryText(text) {
  return text.replace(/\s+/g, '')
}

/**
 * @param {Object[]} lines
 * @returns {boolean}
 */
function isRightToLeftGeometryOrder(lines) {
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index].centerX > lines[index - 1].centerX + 1e-6) {
      return false
    }
  }
  return true
}

/**
 * @param {Object[]} lines
 * @returns {boolean}
 */
function isTopToBottomGeometryOrder(lines) {
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index].centerY < lines[index - 1].centerY - 1e-6) {
      return false
    }
  }
  return true
}

/**
 * @param {Object} region
 * @param {Object[]} sourceLines
 * @param {number} targetColumnCount
 * @param {Function} [isOrdered]
 * @returns {Object[]}
 */
function resolveSourceOrderedGeometryLines(region, sourceLines, targetColumnCount, isOrdered) {
  const orderCheck = isOrdered || isRightToLeftGeometryOrder
  const sourceColumns = resolveSourceColumns(region).map(normalizeGeometryText)
  if (sourceColumns.length !== targetColumnCount) {
    return []
  }

  const lineTexts = sourceLines.map(line => normalizeGeometryText(line.text))
  const directMatch = sourceColumns.every((text, index) => text === lineTexts[index])
  if (directMatch) {
    return orderCheck(sourceLines) ? sourceLines : []
  }

  const buckets = new Map()
  for (const line of sourceLines) {
    const key = normalizeGeometryText(line.text)
    const bucket = buckets.get(key)
    if (bucket) {
      bucket.push(line)
    } else {
      buckets.set(key, [line])
    }
  }

  const matched = sourceColumns.map(text => {
    const bucket = buckets.get(text)
    return bucket?.length === 1 ? bucket[0] : undefined
  })

  if (!matched.every(line => line !== undefined)) {
    return []
  }

  return orderCheck(matched)
    ? matched
    : []
}

/**
 * @param {number} columnCount
 * @param {number} contentWidth
 * @param {{colWidth: number, colSpacing: number}} metrics
 * @param {number} [padding=0]
 * @param {{contentCenterX: number}} [anchor]
 * @returns {Object}
 */
export function resolveVerticalColumnPositions(columnCount, contentWidth, metrics, padding, anchor) {
  padding = padding || 0
  const totalWidth = computeVerticalTotalWidth(columnCount, metrics)
  let contentCenterX = anchor?.contentCenterX ?? contentWidth / 2
  if (anchor && totalWidth > 0 && totalWidth <= contentWidth) {
    contentCenterX = clampNumber(
      contentCenterX,
      totalWidth / 2,
      contentWidth - totalWidth / 2
    )
  }
  const groupCenterX = padding + contentCenterX
  const groupLeftX = groupCenterX - totalWidth / 2
  const firstCenterX = groupLeftX + totalWidth - metrics.colWidth / 2
  const centers = Array.from({ length: Math.max(0, columnCount) }, (_, index) =>
    firstCenterX - index * (metrics.colWidth + metrics.colSpacing)
  )

  return {
    totalWidth,
    groupLeftX,
    groupCenterX,
    firstCenterX,
    centers,
  }
}

/**
 * @param {string} text
 * @param {Object} [measureCtx]
 * @param {string} [fontFamily]
 * @returns {number}
 */
function countSourceInlineUnits(text, measureCtx, fontFamily) {
  const graphemes = segmentVerticalGraphemes(text.trim())
  const fallbackUnits = graphemes.filter(g => !/^\s+$/u.test(g)).length
  if (fallbackUnits === 0) return 0
  if (!measureCtx || !fontFamily) return fallbackUnits

  const previousFont = measureCtx.font
  try {
    measureCtx.font = `100px ${fontFamily}`
    const cjkUnitWidth = measureCtx.measureText('国').width
    if (!Number.isFinite(cjkUnitWidth) || cjkUnitWidth <= 0) return fallbackUnits

    let units = 0
    let latinRun = ''
    const flushLatinRun = () => {
      if (!latinRun) return true
      const measuredWidth = measureCtx.measureText(latinRun).width
      latinRun = ''
      if (!Number.isFinite(measuredWidth) || measuredWidth <= 0) return false
      units += measuredWidth / cjkUnitWidth
      return true
    }

    for (const grapheme of graphemes) {
      if (latinGraphemePattern.test(grapheme)) {
        latinRun += grapheme
        continue
      }
      if (!flushLatinRun()) return fallbackUnits
      if (!/^\s+$/u.test(grapheme)) units += 1
    }
    if (!flushLatinRun()) return fallbackUnits
    return units > 0 ? units : fallbackUnits
  } finally {
    measureCtx.font = previousFont
  }
}

/**
 * @param {Object} region
 * @param {number} targetColumnCount
 * @param {Object} [measureCtx]
 * @param {string} [fontFamily]
 * @returns {Object|undefined}
 */
export function resolveVerticalSourceGeometryProfile(region, targetColumnCount, measureCtx, fontFamily) {
  const sourceLines = (region.sourceLineGeometries ?? [])
    .filter(line =>
      line.direction === 'v' &&
      Number.isFinite(line.centerX) &&
      Number.isFinite(line.centerY) &&
      Number.isFinite(line.width) &&
      Number.isFinite(line.height) &&
      line.width > 0 &&
      line.height > 0
    )

  if (
    targetColumnCount <= 0 ||
    sourceLines.length === 0 ||
    sourceLines.length !== targetColumnCount
  ) {
    return undefined
  }

  const spatialColumns = [...sourceLines].sort((a, b) => b.centerX - a.centerX)
  const widths = spatialColumns.map(line => line.width)
  const heights = spatialColumns.map(line => line.height)
  const medW = medianNumber(widths)
  const medH = medianNumber(heights)
  if (medW === null || medH === null) {
    return undefined
  }

  const pitches = []
  const gaps = []
  for (let index = 0; index < spatialColumns.length - 1; index += 1) {
    const right = spatialColumns[index]
    const left = spatialColumns[index + 1]
    const pitch = right.centerX - left.centerX
    if (!Number.isFinite(pitch) || pitch <= 1) {
      continue
    }
    pitches.push(pitch)
    gaps.push(pitch - (right.width + left.width) / 2)
  }

  const measuredMedianPitch = pitches.length > 0 ? medianNumber(pitches) : null
  const measuredMedianGap = gaps.length > 0 ? medianNumber(gaps) : null
  const medPitch = measuredMedianPitch
  const medGap = measuredMedianGap

  const leftEdge = Math.min(...spatialColumns.map(line => line.centerX - line.width / 2))
  const rightEdge = Math.max(...spatialColumns.map(line => line.centerX + line.width / 2))
  const sourceColumnStyles = spatialColumns.map(line => {
    const glyphCount = countTextGlyphs(line.text)
    const effectiveGlyphCount = Math.max(1, glyphCount)
    const effectiveFontSizeUnits = Math.max(
      1,
      countSourceInlineUnits(line.text, measureCtx, fontFamily)
    )
    const advance = line.height / effectiveFontSizeUnits
    const latinSizeCorrection = effectiveGlyphCount / effectiveFontSizeUnits
    const declaredFontSize = line.fontSize
    const crossSize = declaredFontSize !== undefined && Number.isFinite(declaredFontSize) && declaredFontSize > 0
      ? Math.min(line.width, declaredFontSize * Math.max(1, latinSizeCorrection))
      : line.width
    return {
      glyphCount,
      advance,
      fontSize: Math.min(crossSize, advance),
    }
  })
  const reliableSourceColumnStyles = sourceColumnStyles.filter(s => s.glyphCount >= 2)
  const fontSizeCandidates = reliableSourceColumnStyles.length > 0
    ? reliableSourceColumnStyles
    : sourceColumnStyles
  const sourceFontSize = medianNumber(fontSizeCandidates.map(s => s.fontSize))
  if (sourceFontSize === null || sourceFontSize <= 0) {
    return undefined
  }
  const medianAdvance = reliableSourceColumnStyles.length > 0
    ? medianNumber(reliableSourceColumnStyles.map(s => s.advance)) ?? sourceFontSize
    : sourceFontSize
  const sourcePitch = medPitch !== null
    ? Math.max(sourceFontSize, medPitch)
    : sourceFontSize * (1 + verticalColumnSpacingRatio)
  const sourceOrderedLines = resolveSourceOrderedGeometryLines(region, sourceLines, targetColumnCount)
  const perColumnAdvance = sourceOrderedLines.map(line => {
    const glyphCount = countTextGlyphs(line.text)
    const advanceUnits = countSourceInlineUnits(line.text, measureCtx, fontFamily)
    return glyphCount >= 2 && advanceUnits > 0
      ? line.height / advanceUnits
      : medianAdvance
  })
  const perColumnTopY = sourceOrderedLines.map(line => line.centerY - line.height / 2)

  return {
    columnCount: spatialColumns.length,
    groupCenterX: (leftEdge + rightEdge) / 2,
    sourceFontSize,
    sourcePitch,
    medianPitch: medPitch,
    medianGap: medGap,
    medianWidth: medW,
    medianHeight: medH,
    medianAdvance,
    perColumnAdvance,
    perColumnTopY,
  }
}

/**
 * @param {number[]} values
 * @returns {number}
 */
function valueRange(values) {
  if (values.length === 0) return Number.POSITIVE_INFINITY
  return Math.max(...values) - Math.min(...values)
}

/**
 * @param {Object[]} spatialLines
 * @param {number} medianHeight
 * @returns {string}
 */
function inferHorizontalAlignment(spatialLines, medianHeight) {
  if (spatialLines.length < 2) return 'unknown'

  const candidates = [
    {
      alignment: 'left',
      spread: valueRange(spatialLines.map(line => line.centerX - line.width / 2)),
    },
    {
      alignment: 'center',
      spread: valueRange(spatialLines.map(line => line.centerX)),
    },
    {
      alignment: 'right',
      spread: valueRange(spatialLines.map(line => line.centerX + line.width / 2)),
    },
  ]
  candidates.sort((a, b) => a.spread - b.spread)

  const best = candidates[0]
  const second = candidates[1]
  const tieTolerance = Math.max(1, medianHeight * 0.05)
  if (!best || !second || second.spread - best.spread <= tieTolerance) {
    return 'unknown'
  }
  return best.alignment
}

/**
 * @param {Object} region
 * @param {number} targetLineCount
 * @param {Object} [measureCtx]
 * @param {string} [fontFamily]
 * @returns {Object|undefined}
 */
export function resolveHorizontalSourceGeometryProfile(region, targetLineCount, measureCtx, fontFamily) {
  if (Math.abs(quadAngle(getRegionQuad(region))) > maxSourceGeometryAnchorAngleRad) {
    return undefined
  }
  const sourceLines = (region.sourceLineGeometries ?? [])
    .filter(line =>
      line.direction === 'h' &&
      Number.isFinite(line.centerX) &&
      Number.isFinite(line.centerY) &&
      Number.isFinite(line.width) &&
      Number.isFinite(line.height) &&
      line.width > 0 &&
      line.height > 0
    )

  if (
    targetLineCount <= 0 ||
    sourceLines.length === 0 ||
    sourceLines.length !== targetLineCount
  ) {
    return undefined
  }

  const spatialLines = [...sourceLines].sort((a, b) => a.centerY - b.centerY)
  const widths = spatialLines.map(line => line.width)
  const heights = spatialLines.map(line => line.height)
  const medW = medianNumber(widths)
  const medH = medianNumber(heights)
  if (medW === null || medH === null) {
    return undefined
  }

  const pitches = []
  const gaps = []
  for (let index = 0; index < spatialLines.length - 1; index += 1) {
    const upper = spatialLines[index]
    const lower = spatialLines[index + 1]
    const pitch = lower.centerY - upper.centerY
    if (!Number.isFinite(pitch) || pitch <= 1) continue
    pitches.push(pitch)
    gaps.push(pitch - (upper.height + lower.height) / 2)
  }

  const medPitch = pitches.length > 0 ? medianNumber(pitches) : null
  const medGap = gaps.length > 0 ? medianNumber(gaps) : null
  const sourceFontSizes = spatialLines.map(line => {
    const inlineUnits = Math.max(1, countSourceInlineUnits(line.text, measureCtx, fontFamily))
    const inlineAdvance = line.width / inlineUnits
    const declaredFontSize = line.fontSize
    if (declaredFontSize !== undefined && Number.isFinite(declaredFontSize) && declaredFontSize > 0) {
      return Math.min(line.height, declaredFontSize)
    }
    return Math.min(line.height, inlineAdvance)
  })
  const sourceFontSize = medianNumber(sourceFontSizes)
  if (sourceFontSize === null || sourceFontSize <= 0) {
    return undefined
  }

  const topEdge = Math.min(...spatialLines.map(line => line.centerY - line.height / 2))
  const bottomEdge = Math.max(...spatialLines.map(line => line.centerY + line.height / 2))
  const leftEdge = Math.min(...spatialLines.map(line => line.centerX - line.width / 2))
  const rightEdge = Math.max(...spatialLines.map(line => line.centerX + line.width / 2))
  const sourceOrderedLines = resolveSourceOrderedGeometryLines(
    region,
    sourceLines,
    targetLineCount,
    isTopToBottomGeometryOrder
  )
  const sourceOrderReliable = sourceOrderedLines.length === targetLineCount

  return {
    lineCount: spatialLines.length,
    groupCenterX: (leftEdge + rightEdge) / 2,
    groupCenterY: (topEdge + bottomEdge) / 2,
    sourceFontSize,
    sourcePitch: medPitch !== null
      ? Math.max(sourceFontSize, medPitch)
      : Math.max(sourceFontSize, medH),
    medianPitch: medPitch,
    medianGap: medGap,
    medianWidth: medW,
    medianHeight: medH,
    inferredAlignment: inferHorizontalAlignment(spatialLines, medH),
    sourceOrderReliable,
    perLineCentersY: sourceOrderReliable ? sourceOrderedLines.map(line => line.centerY) : [],
    perLineLeftX: sourceOrderReliable
      ? sourceOrderedLines.map(line => line.centerX - line.width / 2)
      : [],
    perLineRightX: sourceOrderReliable
      ? sourceOrderedLines.map(line => line.centerX + line.width / 2)
      : [],
    perLineHeights: sourceOrderReliable
      ? sourceOrderedLines.map(line => line.height)
      : [],
  }
}

/**
 * @param {Object} region
 * @param {number} boxPadding
 * @param {string[]} renderedLines
 * @param {Object} [profile]
 * @returns {Object[]|undefined}
 */
export function resolveHorizontalSourceLineLayouts(region, boxPadding, renderedLines, profile) {
  if (
    !profile ||
    !profile.sourceOrderReliable ||
    renderedLines.length !== profile.lineCount ||
    profile.perLineLeftX.length !== profile.lineCount ||
    profile.perLineRightX.length !== profile.lineCount ||
    profile.perLineHeights.length !== profile.lineCount
  ) {
    return undefined
  }

  const sourceLines = resolveSourceColumns(region)
  if (
    sourceLines.length !== renderedLines.length ||
    !renderedLines.every((line, index) => (
      normalizeGeometryText(line) === normalizeGeometryText(sourceLines[index] ?? '')
    ))
  ) {
    return undefined
  }

  const contentLeft = region.box.x + boxPadding
  const layouts = renderedLines.map((_, index) => {
    const left = profile.perLineLeftX[index]
    const right = profile.perLineRightX[index]
    const height = profile.perLineHeights[index]
    return {
      contentLeftX: left - contentLeft,
      targetWidth: right - left,
      targetHeight: height,
      advanceScale: 1,
    }
  })

  return layouts.every(layout => (
    Number.isFinite(layout.contentLeftX) &&
    Number.isFinite(layout.targetWidth) &&
    Number.isFinite(layout.targetHeight) &&
    layout.targetWidth > 0 &&
    layout.targetHeight > 0
  ))
    ? layouts
    : undefined
}

/**
 * @param {Object} region
 * @param {number} boxPadding
 * @param {Object} [profile]
 * @returns {Object|undefined}
 */
export function resolveHorizontalSourceLineAnchor(region, boxPadding, profile) {
  if (!profile) return undefined
  const angle = quadAngle(getRegionQuad(region))
  if (Math.abs(angle) > maxSourceGeometryAnchorAngleRad) return undefined
  const contentCenterY = profile.groupCenterY - region.box.y - boxPadding
  return Number.isFinite(contentCenterY) ? { contentCenterY } : undefined
}

/**
 * @param {Object} region
 * @param {number} boxPadding
 * @param {Object} [profile]
 * @returns {Object|undefined}
 */
export function resolveVerticalSourceColumnAnchor(region, boxPadding, profile) {
  if (!profile) {
    return undefined
  }
  const angle = quadAngle(getRegionQuad(region))
  if (Math.abs(angle) > maxSourceGeometryAnchorAngleRad) {
    return undefined
  }
  const contentCenterX = profile.groupCenterX - region.box.x - boxPadding
  if (!Number.isFinite(contentCenterX)) {
    return undefined
  }
  return { contentCenterX }
}

/**
 * @param {Object} region
 * @param {number} boxPadding
 * @param {number} renderedColumnCount
 * @param {Object} [profile]
 * @returns {number[]|undefined}
 */
export function resolveVerticalSourceColumnStartOffsets(region, boxPadding, renderedColumnCount, profile) {
  if (
    renderedColumnCount <= 1 ||
    !profile ||
    profile.perColumnTopY.length !== renderedColumnCount
  ) {
    return undefined
  }

  const angle = quadAngle(getRegionQuad(region))
  if (Math.abs(angle) > maxSourceGeometryAnchorAngleRad) {
    return undefined
  }

  const contentTopY = region.box.y + boxPadding
  const offsets = profile.perColumnTopY.map(topY => topY - contentTopY)
  if (!offsets.every(Number.isFinite)) {
    return undefined
  }

  return offsets.map(offset => Math.max(0, offset))
}

// ---------------------------------------------------------------------------
// Vertical calc
// ---------------------------------------------------------------------------

/**
 * Split text into columns for vertical rendering.
 *
 * @param {Object} ctx
 * @param {string} text
 * @param {number} maxHeight
 * @param {number} fontSize
 * @param {number} defaultAdvanceY
 * @param {number} [advanceScale=1]
 * @param {Function} [perColumnMaxHeight]
 * @param {number} [actualBoxScale]
 * @param {boolean} [useDefaultAdvanceBase=false]
 * @param {Function} [perColumnAdvanceScale]
 * @returns {Object[]}
 */
export function calcVertical(
  ctx,
  text,
  maxHeight,
  fontSize,
  defaultAdvanceY,
  advanceScale = 1,
  perColumnMaxHeight,
  actualBoxScale,
  useDefaultAdvanceBase = false,
  perColumnAdvanceScale
) {
  const tokens = tokenizeVerticalText(text)
  if (tokens.length === 0) return []

  const advanceCache = new Map()
  const getTokenMetrics = (token, columnIndex) => {
    const columnAdvanceScale = perColumnAdvanceScale?.(columnIndex) ?? advanceScale
    const cacheKey = `${columnAdvanceScale}:${token.kind}:${token.displayText}`
    const cached = advanceCache.get(cacheKey)
    if (cached !== undefined) {
      return cached
    }
    const resolved = resolveVerticalTokenMetrics(
      ctx,
      token,
      fontSize,
      defaultAdvanceY,
      columnAdvanceScale,
      actualBoxScale,
      useDefaultAdvanceBase
    )
    advanceCache.set(cacheKey, resolved)
    return resolved
  }

  const columns = []
  let col = []
  let colHeight = 0
  let colIndex = 0

  for (const token of tokens) {
    const tokenMetrics = getTokenMetrics(token, colIndex)
    const glyph = {
      ...token,
      ch: token.displayText,
      ...tokenMetrics,
    }

    const currentMaxHeight = perColumnMaxHeight ? perColumnMaxHeight(colIndex) : maxHeight
    if (colHeight + glyph.advanceY > currentMaxHeight && col.length > 0) {
      const firstSourceChar = Array.from(token.sourceText)[0] ?? token.sourceText
      if (KINSOKU_NSTART.has(firstSourceChar)) {
        col.push(glyph)
        colHeight += glyph.advanceY
        columns.push({ glyphs: col, height: colHeight })
        col = []
        colHeight = 0
        colIndex++
        continue
      }

      const lastInCol = col[col.length - 1]
      const lastSourceChars = Array.from(lastInCol.sourceText)
      const lastSourceChar = lastSourceChars[lastSourceChars.length - 1] ?? lastInCol.sourceText
      if (KINSOKU_NEND.has(lastSourceChar) && col.length > 1) {
        const carry = col.pop()
        columns.push({ glyphs: col, height: colHeight - carry.advanceY })
        col = [carry, glyph]
        colHeight = carry.advanceY + glyph.advanceY
        colIndex++
        continue
      }

      columns.push({ glyphs: col, height: colHeight })
      col = []
      colHeight = 0
      colIndex++
    }

    col.push(glyph)
    colHeight += glyph.advanceY
  }

  if (col.length > 0) {
    columns.push({ glyphs: col, height: colHeight })
  }
  return columns
}

/**
 * @param {Object} ctx
 * @param {string[]} preferredColumns
 * @param {Object[]|undefined} preferredColumnSources
 * @param {number} maxHeight
 * @param {number} fontSize
 * @param {number} defaultAdvanceY
 * @param {number} [advanceScale=1]
 * @param {Function} [perColumnMaxHeight]
 * @param {number} [actualBoxScale]
 * @param {boolean} [useDefaultAdvanceBase=false]
 * @param {Function} [perColumnAdvanceScale]
 * @returns {{columns: Object[], columnBreakReasons: string[], columnSegmentIds: number[], columnSegmentSources: Object[]}}
 */
export function calcVerticalFromColumns(
  ctx,
  preferredColumns,
  preferredColumnSources,
  maxHeight,
  fontSize,
  defaultAdvanceY,
  advanceScale = 1,
  perColumnMaxHeight,
  actualBoxScale,
  useDefaultAdvanceBase = false,
  perColumnAdvanceScale
) {
  const sourceGlyphCount = column =>
    column.glyphs.reduce((sum, glyph) => sum + glyph.sourceGlyphCount, 0)
  const mergeSegmentColumnsByMaxLength = (segmentColumns, segmentMaxGlyphCount) => {
    if (segmentColumns.length <= 1) {
      return segmentColumns
    }
    const merged = []
    for (let i = 0; i < segmentColumns.length; i += 1) {
      const current = segmentColumns[i]
      const previous = merged[merged.length - 1]
      if (!previous) {
        merged.push(current)
        continue
      }
      const mergedGlyphCount = sourceGlyphCount(previous) + sourceGlyphCount(current)
      const mergedHeight = previous.height + current.height
      const canMergeBySameSegmentMax = mergedGlyphCount <= segmentMaxGlyphCount
      if (canMergeBySameSegmentMax && mergedHeight <= maxHeight) {
        previous.glyphs.push(...current.glyphs)
        previous.height = mergedHeight
        continue
      }
      merged.push(current)
    }
    return merged
  }

  const columns = []
  const columnBreakReasons = []
  const columnSegmentIds = []
  const columnSegmentSources = []
  let hasOutput = false
  let previousSegmentOverflowed = false
  let segmentIndex = 0

  for (const source of preferredColumns) {
    const segment = source.trim()
    if (!segment) {
      continue
    }
    segmentIndex += 1
    const segmentSource = preferredColumnSources?.[segmentIndex - 1] ?? 'model'
    const segmentColumns = calcVertical(
      ctx,
      segment,
      maxHeight,
      fontSize,
      defaultAdvanceY,
      advanceScale,
      perColumnMaxHeight ? ci => perColumnMaxHeight(columns.length + ci) : undefined,
      actualBoxScale,
      useDefaultAdvanceBase,
      perColumnAdvanceScale ? ci => perColumnAdvanceScale(columns.length + ci) : undefined
    )
    const segmentMaxGlyphCount = Math.max(1, ...segmentColumns.map(sourceGlyphCount))
    if (segmentColumns.length === 0) {
      previousSegmentOverflowed = false
      continue
    }

    const canFollowPrevious = hasOutput &&
      columns.length > 0 &&
      (previousSegmentOverflowed || segmentSource === 'split')
    if (canFollowPrevious) {
      const lastColumn = columns[columns.length - 1]
      const firstColumn = segmentColumns[0]
      while (firstColumn.glyphs.length > 0) {
        const glyph = firstColumn.glyphs[0]
        const currentColMaxHeight = perColumnMaxHeight ? perColumnMaxHeight(columns.length - 1) : maxHeight
        if (lastColumn.height + glyph.advanceY > currentColMaxHeight) {
          break
        }
        firstColumn.glyphs.shift()
        lastColumn.glyphs.push(glyph)
        lastColumn.height += glyph.advanceY
      }
      if (firstColumn.glyphs.length === 0) {
        segmentColumns.shift()
      } else {
        firstColumn.height = firstColumn.glyphs.reduce((sum, glyph) => sum + glyph.advanceY, 0)
      }
    }

    const balancedSegmentColumns = mergeSegmentColumnsByMaxLength(segmentColumns, segmentMaxGlyphCount)

    for (let i = 0; i < balancedSegmentColumns.length; i += 1) {
      columns.push(balancedSegmentColumns[i])
      columnSegmentIds.push(segmentIndex)
      columnSegmentSources.push(segmentSource)
      if (!hasOutput && i === 0) {
        columnBreakReasons.push('start')
        hasOutput = true
        continue
      }
      if (i === 0) {
        columnBreakReasons.push(canFollowPrevious ? 'both' : 'model')
        hasOutput = true
        continue
      }
      columnBreakReasons.push('wrap')
    }

    previousSegmentOverflowed = balancedSegmentColumns.length > 1
  }
  return { columns, columnBreakReasons, columnSegmentIds, columnSegmentSources }
}

// ---------------------------------------------------------------------------
// Horizontal calc helpers
// ---------------------------------------------------------------------------

/**
 * @param {string} text
 * @returns {boolean}
 */
function hasLatinWords(text) {
  return /[a-zA-Z]{2,}/.test(text)
}

/**
 * @param {Object} ctx
 * @param {string} text
 * @param {number} letterSpacing
 * @returns {number}
 */
function measureHorizontalTextWidth(ctx, text, letterSpacing) {
  const chars = [...text]
  if (chars.length === 0) {
    return 0
  }

  if (chars.length === 1) {
    return ctx.measureText(chars[0]).width
  }

  let width = 0
  for (let i = 0; i < chars.length; i++) {
    width += ctx.measureText(chars[i]).width
    if (i < chars.length - 1) {
      width += letterSpacing
    }
  }
  return Math.max(0, width)
}

/**
 * CJK character-level horizontal line breaking with kinsoku shori.
 *
 * @param {Object} ctx
 * @param {string} text
 * @param {number} maxWidth
 * @param {number} letterSpacing
 * @returns {Array<{text: string, width: number}>}
 */
function calcHorizontalCjkSegment(ctx, text, maxWidth, letterSpacing) {
  const chars = [...text.replace(/\s+/g, '')]
  const lines = []
  let line = ''

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]
    const trial = line + ch
    const trialWidth = measureHorizontalTextWidth(ctx, trial, letterSpacing)

    if (trialWidth <= maxWidth) {
      line = trial
      continue
    }

    if (line.length > 0) {
      const lastChar = line[line.length - 1]
      const nextChar = ch

      if (KINSOKU_NSTART.has(nextChar) && line.length > 0) {
        line += ch
        lines.push({ text: line, width: measureHorizontalTextWidth(ctx, line, letterSpacing) })
        line = ''
        continue
      }

      if (KINSOKU_NEND.has(lastChar) && line.length > 1) {
        const carry = line[line.length - 1]
        line = line.slice(0, -1)
        lines.push({ text: line, width: measureHorizontalTextWidth(ctx, line, letterSpacing) })
        line = carry + ch
        continue
      }

      lines.push({ text: line, width: measureHorizontalTextWidth(ctx, line, letterSpacing) })
    }
    line = ch
  }

  if (line) {
    lines.push({ text: line, width: measureHorizontalTextWidth(ctx, line, letterSpacing) })
  }
  return lines
}

/**
 * Latin word-level horizontal line breaking.
 *
 * @param {Object} ctx
 * @param {string} text
 * @param {number} maxWidth
 * @param {number} letterSpacing
 * @returns {Array<{text: string, width: number}>}
 */
function calcHorizontalLatinSegment(ctx, text, maxWidth, letterSpacing) {
  const words = text.split(/\s+/)
  const lines = []
  let line = ''

  for (const word of words) {
    const trial = line ? line + ' ' + word : word
    const trialWidth = measureHorizontalTextWidth(ctx, trial, letterSpacing)

    if (trialWidth <= maxWidth) {
      line = trial
      continue
    }

    if (line) {
      lines.push({ text: line, width: measureHorizontalTextWidth(ctx, line, letterSpacing) })
      line = ''
    }

    if (measureHorizontalTextWidth(ctx, word, letterSpacing) > maxWidth) {
      const chars = [...word]
      let frag = ''
      for (const ch of chars) {
        const fragTrial = frag + ch
        if (measureHorizontalTextWidth(ctx, fragTrial, letterSpacing) > maxWidth && frag) {
          lines.push({ text: frag, width: measureHorizontalTextWidth(ctx, frag, letterSpacing) })
          frag = ch
        } else {
          frag = fragTrial
        }
      }
      line = frag
    } else {
      line = word
    }
  }

  if (line) {
    lines.push({ text: line, width: measureHorizontalTextWidth(ctx, line, letterSpacing) })
  }
  return lines
}

/**
 * Wrap a single text segment into horizontal lines.
 *
 * @param {Object} ctx
 * @param {string} text
 * @param {number} maxWidth
 * @param {number} letterSpacing
 * @returns {Array<{text: string, width: number}>}
 */
function wrapHorizontalSegment(ctx, text, maxWidth, letterSpacing) {
  const cleaned = text.replace(/\n+/g, ' ').trim()
  if (!cleaned) return []

  if (hasLatinWords(cleaned)) {
    return calcHorizontalLatinSegment(ctx, cleaned, maxWidth, letterSpacing)
  }
  return calcHorizontalCjkSegment(ctx, cleaned, maxWidth, letterSpacing)
}

/**
 * Split preferred line segments into horizontal lines with break-reason tracking.
 *
 * @param {Object} ctx
 * @param {Object[]} preferredLines
 * @param {number} maxWidth
 * @param {number} fontSize
 * @param {number} [letterSpacingScale=1]
 * @returns {{lines: Array<{text: string, width: number}>, lineBreakReasons: string[], lineSegmentIds: number[], lineSegmentSources: Object[]}}
 */
export function calcHorizontalFromLines(ctx, preferredLines, maxWidth, fontSize, letterSpacingScale = 1) {
  const letterSpacing = fontSize * horizontalLetterSpacingRatio * letterSpacingScale

  const mergeSegmentLinesByMaxCharCount = (segmentLines, segmentMaxCharCount) => {
    if (segmentLines.length <= 1) {
      return segmentLines
    }
    const merged = []
    for (let i = 0; i < segmentLines.length; i += 1) {
      const current = segmentLines[i]
      const previous = merged[merged.length - 1]
      if (!previous) {
        merged.push(current)
        continue
      }
      const mergedCharCount = [...previous.text].length + [...current.text].length
      const mergedWidth = measureHorizontalTextWidth(
        ctx,
        previous.text + current.text,
        letterSpacing
      )
      const canMergeBySameSegmentMax = mergedCharCount <= segmentMaxCharCount
      if (canMergeBySameSegmentMax && mergedWidth <= maxWidth) {
        previous.text += current.text
        previous.width = mergedWidth
        continue
      }
      merged.push(current)
    }
    return merged
  }

  const lines = []
  const lineBreakReasons = []
  const lineSegmentIds = []
  const lineSegmentSources = []
  let hasOutput = false
  let previousSegmentOverflowed = false
  let segmentIndex = 0

  for (const source of preferredLines) {
    const segment = source.text.trim()
    if (!segment) {
      continue
    }
    segmentIndex += 1
    const segmentSource = source.source
    const segmentLines = wrapHorizontalSegment(ctx, segment, maxWidth, letterSpacing)
    const segmentMaxCharCount = Math.max(1, ...segmentLines.map(l => [...l.text].length))

    if (segmentLines.length === 0) {
      previousSegmentOverflowed = false
      continue
    }

    const canFollowPrevious = hasOutput &&
      lines.length > 0 &&
      (previousSegmentOverflowed || segmentSource === 'split')
    if (canFollowPrevious) {
      const lastLine = lines[lines.length - 1]
      const firstLine = segmentLines[0]
      const combined = lastLine.text + firstLine.text
      const combinedWidth = measureHorizontalTextWidth(ctx, combined, letterSpacing)
      if (combinedWidth <= maxWidth) {
        lastLine.text = combined
        lastLine.width = combinedWidth
        segmentLines.shift()
      }
    }

    const balancedSegmentLines = mergeSegmentLinesByMaxCharCount(segmentLines, segmentMaxCharCount)

    for (let i = 0; i < balancedSegmentLines.length; i += 1) {
      lines.push(balancedSegmentLines[i])
      lineSegmentIds.push(segmentIndex)
      lineSegmentSources.push(segmentSource)
      if (!hasOutput && i === 0) {
        lineBreakReasons.push('start')
        hasOutput = true
        continue
      }
      if (i === 0) {
        lineBreakReasons.push(canFollowPrevious ? 'both' : 'model')
        hasOutput = true
        continue
      }
      lineBreakReasons.push('wrap')
    }

    previousSegmentOverflowed = balancedSegmentLines.length > 1
  }

  return { lines, lineBreakReasons, lineSegmentIds, lineSegmentSources }
}

// ---------------------------------------------------------------------------
// Stroke/padding
// ---------------------------------------------------------------------------

/**
 * Stroke width adaptive to font size (7% of fontSize, minimum 1px).
 *
 * @param {number} fontSize
 * @returns {number}
 */
export function strokeWidth(fontSize) {
  return Math.max(1, Math.round(fontSize * 0.07))
}

/**
 * @param {number} fontSize
 * @returns {number}
 */
export function resolveOffscreenGuardPadding(fontSize) {
  return Math.max(minOffscreenGuardPaddingPx, Math.round(fontSize * offscreenGuardPaddingByFontRatio))
}

/**
 * @param {Object} ctx
 * @param {Object[]} columns
 * @param {number} fontSize
 * @param {{colWidth: number}} metrics
 * @param {string} fontFamily
 * @returns {number}
 */
export function resolveVerticalRenderPadding(ctx, columns, fontSize, metrics, fontFamily) {
  if (columns.length === 0) {
    return strokeWidth(fontSize) + 2
  }

  ctx.font = `${fontSize}px ${fontFamily}`

  let maxOverflow = 0
  const halfColWidth = metrics.colWidth / 2

  for (const col of columns) {
    for (const glyph of col.glyphs) {
      const measured = ctx.measureText(glyph.ch)
      const left = metricAbs(measured.actualBoundingBoxLeft ?? 0)
      const right = metricAbs(measured.actualBoundingBoxRight ?? 0)
      const ascent = metricAbs(measured.actualBoundingBoxAscent ?? 0)
      const descent = metricAbs(measured.actualBoundingBoxDescent ?? 0)

      const halfAdvance = glyph.advanceY / 2
      const xOverflow = glyph.kind === 'sideways-run'
        ? Math.max(
          0,
          glyph.inkHeight * glyph.renderCrossScale / 2 - halfColWidth
        )
        : Math.max(0, left - halfColWidth, right - halfColWidth)
      const yOverflow = glyph.kind === 'sideways-run'
        ? Math.max(
          0,
          glyph.inkWidth * glyph.renderInlineScale / 2 - halfAdvance
        )
        : Math.max(0, ascent - halfAdvance, descent - halfAdvance)
      maxOverflow = Math.max(maxOverflow, xOverflow, yOverflow)
    }
  }

  const sw = strokeWidth(fontSize)
  const basePadding = sw + 2
  const fallbackPadding = Math.ceil(fontSize * 0.12)
  const overflowPadding = Math.max(Math.ceil(maxOverflow), fallbackPadding)
  return basePadding + overflowPadding + resolveOffscreenGuardPadding(fontSize)
}

// ---------------------------------------------------------------------------
// Vertical layout build
// ---------------------------------------------------------------------------

/**
 * @param {number} contentHeight
 * @param {number} columnHeight
 * @param {'left'|'center'|'right'} alignment
 * @param {number} padding
 * @param {number} [sourceStartOffset]
 * @returns {number}
 */
export function resolveVerticalStartY(contentHeight, columnHeight, alignment, padding, sourceStartOffset) {
  if (sourceStartOffset !== undefined && Number.isFinite(sourceStartOffset)) {
    const maxOffset = Math.max(0, contentHeight - columnHeight)
    return padding + clampNumber(sourceStartOffset, 0, maxOffset)
  }
  if (alignment === 'center') {
    return padding + (contentHeight - columnHeight) / 2
  }
  if (alignment === 'right') {
    return padding + contentHeight - columnHeight
  }
  return padding
}

/**
 * @param {Object[]} columns
 * @param {number} contentWidth
 * @param {number} contentHeight
 * @param {{colWidth: number, colSpacing: number}} metrics
 * @param {'left'|'center'|'right'} alignment
 * @param {number} padding
 * @param {Object} [ctx]
 * @param {number} [fontSize]
 * @param {{contentCenterX: number}} [anchor]
 * @param {number[]} [columnStartOffsets]
 * @returns {Array<{x: number, y: number, width: number, height: number}>}
 */
export function buildVerticalDebugColumnBoxes(columns, contentWidth, contentHeight, metrics, alignment, padding, ctx, fontSize, anchor, columnStartOffsets) {
  if (columns.length === 0) {
    return []
  }
  const positions = resolveVerticalColumnPositions(columns.length, contentWidth, metrics, padding, anchor)

  const boxes = []
  for (let c = 0; c < columns.length; c += 1) {
    const col = columns[c]
    const cx = positions.centers[c]
    const startY = resolveVerticalStartY(
      contentHeight,
      col.height,
      alignment,
      padding,
      columnStartOffsets?.[c]
    )
    let boxWidth = metrics.colWidth
    if (ctx && fontSize) {
      let maxW = 0
      for (const g of col.glyphs) {
        const visualWidth = g.kind === 'sideways-run'
          ? g.inkHeight * g.renderCrossScale
          : measureGlyphBox(ctx, g.ch, fontSize).width
        maxW = Math.max(maxW, visualWidth)
      }
      boxWidth = Math.ceil(Math.max(fontSize * 1.1, maxW))
    }
    boxes.push({
      x: cx - boxWidth / 2,
      y: startY,
      width: boxWidth,
      height: col.height,
    })
  }
  return boxes
}

// ---------------------------------------------------------------------------
// Alignment resolution
// ---------------------------------------------------------------------------

/**
 * Determine text alignment for a region.
 *
 * @param {Object} region
 * @param {number} lineCount
 * @returns {'left'|'center'|'right'}
 */
export function resolveAlignment(region, lineCount) {
  if (lineCount <= 1) return 'center'
  if (region.direction === 'v') return 'left'
  return 'center'
}

// ---------------------------------------------------------------------------
// Font size fitting
// ---------------------------------------------------------------------------

/**
 * Find the largest font size for vertical text that fits within content area.
 *
 * @param {Object} ctx
 * @param {string} text
 * @param {number} contentHeight
 * @param {number} fontSize
 * @param {string} fontFamily
 * @param {Object} [options]
 * @returns {Object}
 */
export function buildVerticalLayout(ctx, text, contentHeight, fontSize, fontFamily, options) {
  ctx.font = `${fontSize}px ${fontFamily}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const sw = strokeWidth(fontSize)
  const baseMetrics = resolveVerticalCellMetrics(ctx, text, fontSize, sw)
  const colSpacingScale = options?.colSpacingScale ?? 1
  const advanceScale = options?.advanceScale ?? 1
  const perColumnAdvanceScale = options?.perColumnAdvanceScale
  const actualBoxScale = options?.actualBoxScale
  const useDefaultAdvanceBase = options?.useDefaultAdvanceBase ?? false
  const scaledColSpacing = baseMetrics.colSpacing * colSpacingScale
  const minColSpacing = -baseMetrics.colWidth * maxVerticalSourceColumnOverlapRatio
  const metrics = {
    ...baseMetrics,
    colSpacing: Math.round(clampNumber(scaledColSpacing, minColSpacing, Number.MAX_SAFE_INTEGER)),
  }

  let columns, columnBreakReasons, columnSegmentIds, columnSegmentSources
  if (options?.preferredColumns && options.preferredColumns.length > 0) {
    const detailed = calcVerticalFromColumns(
      ctx,
      options.preferredColumns,
      options.preferredColumnSources,
      contentHeight,
      fontSize,
      metrics.defaultAdvanceY,
      advanceScale,
      options.perColumnMaxHeight,
      actualBoxScale,
      useDefaultAdvanceBase,
      perColumnAdvanceScale
    )
    columns = detailed.columns
    columnBreakReasons = detailed.columnBreakReasons
    columnSegmentIds = detailed.columnSegmentIds
    columnSegmentSources = detailed.columnSegmentSources
  } else {
    columns = calcVertical(
      ctx,
      text,
      contentHeight,
      fontSize,
      metrics.defaultAdvanceY,
      advanceScale,
      options?.perColumnMaxHeight,
      actualBoxScale,
      useDefaultAdvanceBase,
      perColumnAdvanceScale
    )
    columnBreakReasons = columns.map((_, index) => (index === 0 ? 'start' : 'wrap'))
    columnSegmentIds = columns.map(() => 1)
    columnSegmentSources = columns.map(() => 'model')
  }
  const requiredContentWidth = computeVerticalTotalWidth(columns.length, metrics)
  return { columns, columnBreakReasons, columnSegmentIds, columnSegmentSources, metrics, requiredContentWidth }
}

/**
 * @param {Object} layout
 * @returns {boolean}
 */
export function hasMinorOverflowWrap(layout) {
  if (layout.columns.length < 2) {
    return false
  }
  const tailIndex = layout.columns.length - 1
  const tailReason = layout.columnBreakReasons[tailIndex] ?? 'wrap'
  if (tailReason !== 'wrap' && tailReason !== 'both') {
    return false
  }
  const tailGlyphCount = layout.columns[tailIndex]?.glyphs.reduce(
    (sum, glyph) => sum + glyph.sourceGlyphCount,
    0
  ) ?? 0
  return tailGlyphCount >= 1 && tailGlyphCount <= minorOverflowMaxGlyphCount
}

/**
 * @param {Object} ctx
 * @param {string} text
 * @param {number} contentHeight
 * @param {number} initialFontSize
 * @param {Object} options
 * @param {Object} baseLayout
 * @param {string} fontFamily
 * @returns {{fontSize: number, layout: Object}}
 */
export function tryShrinkVerticalForMinorOverflow(ctx, text, contentHeight, initialFontSize, options, baseLayout, fontFamily) {
  if (!hasMinorOverflowWrap(baseLayout)) {
    return { fontSize: initialFontSize, layout: baseLayout }
  }

  const minAllowedFontSize = Math.max(
    minFontSafetySize,
    Math.ceil(initialFontSize * minorOverflowShrinkMinScale)
  )
  if (initialFontSize <= minAllowedFontSize) {
    return { fontSize: initialFontSize, layout: baseLayout }
  }

  for (let fontSize = initialFontSize - 1; fontSize >= minAllowedFontSize; fontSize -= 1) {
    const candidate = buildVerticalLayout(ctx, text, contentHeight, fontSize, fontFamily, options)
    if (candidate.columns.length < baseLayout.columns.length) {
      return { fontSize, layout: candidate }
    }
  }

  return { fontSize: initialFontSize, layout: baseLayout }
}

/**
 * Try to eliminate a minor horizontal overflow by shrinking font size.
 *
 * @param {Object} ctx
 * @param {string} text
 * @param {number} contentWidth
 * @param {number} initialFontSize
 * @param {string} fontFamily
 * @param {Array<{text: string, width: number}>} baseLines
 * @param {Function} calcLines
 * @returns {{fontSize: number, lines: Array<{text: string, width: number}>}}
 */
export function tryShrinkHorizontalForMinorOverflow(ctx, text, contentWidth, initialFontSize, fontFamily, baseLines, calcLines) {
  if (baseLines.length < 2) {
    return { fontSize: initialFontSize, lines: baseLines }
  }
  const tailLine = baseLines[baseLines.length - 1]
  const tailCharCount = [...tailLine.text].length
  if (tailCharCount < 1 || tailCharCount > minorOverflowMaxGlyphCount) {
    return { fontSize: initialFontSize, lines: baseLines }
  }

  const minAllowedFontSize = Math.max(
    minFontSafetySize,
    Math.ceil(initialFontSize * minorOverflowShrinkMinScale)
  )
  if (initialFontSize <= minAllowedFontSize) {
    return { fontSize: initialFontSize, lines: baseLines }
  }

  for (let fontSize = initialFontSize - 1; fontSize >= minAllowedFontSize; fontSize -= 1) {
    ctx.font = `${fontSize}px ${fontFamily}`
    const candidate = calcLines(ctx, text, contentWidth, fontSize)
    if (candidate.length < baseLines.length) {
      return { fontSize, lines: candidate }
    }
  }

  return { fontSize: initialFontSize, lines: baseLines }
}

/**
 * @param {Object} ctx
 * @param {Object} region
 * @param {string} text
 * @param {number} contentWidth
 * @param {number} contentHeight
 * @param {number} fontSize
 * @param {string} fontFamily
 * @param {string[]} [preferredColumns]
 * @param {number} [originalContentWidth]
 * @param {Object} [sourceGeometryProfile]
 * @returns {{advanceScale: number, perColumnAdvanceScale: number[]|undefined, colSpacingScale: number}}
 */
export function estimateVerticalPreferredProfile(
  ctx,
  region,
  text,
  contentWidth,
  contentHeight,
  fontSize,
  fontFamily,
  preferredColumns,
  originalContentWidth,
  sourceGeometryProfile
) {
  ctx.font = `${fontSize}px ${fontFamily}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const sw = strokeWidth(fontSize)
  const metrics = resolveVerticalCellMetrics(ctx, text, fontSize, sw)
  const sourceColumns = resolveSourceColumns(region)
  const translatedColumnTexts = preferredColumns ?? [text]
  const baseAdvance = Math.max(1, metrics.defaultAdvanceY * verticalAdvanceTightenRatio)
  const sourceStyleScale = sourceGeometryProfile
    ? fontSize / Math.max(1, sourceGeometryProfile.sourceFontSize)
    : 1

  let advanceScale
  let perColumnAdvanceScale
  if (sourceGeometryProfile) {
    const targetAdvance = sourceGeometryProfile.medianAdvance * sourceStyleScale
    advanceScale = targetAdvance / baseAdvance

    const sourceColumnIdentityMatches = (
      sourceGeometryProfile.perColumnAdvance.length === sourceColumns.length &&
      translatedColumnTexts.length === sourceColumns.length &&
      translatedColumnTexts.every((column, index) =>
        normalizeGeometryText(column) === normalizeGeometryText(sourceColumns[index] ?? '')
      )
    )
    if (sourceColumnIdentityMatches) {
      perColumnAdvanceScale = sourceGeometryProfile.perColumnAdvance.map(sourceAdvance =>
        sourceAdvance * sourceStyleScale / baseAdvance
      )
    }
  } else {
    const sourceLengths = sourceColumns.map(column => countTextGlyphs(column))
    const translatedLengths = translatedColumnTexts.map(column => countTextGlyphs(column))
    const baselineLength = Math.max(1, ...sourceLengths, ...translatedLengths)
    const targetAdvance = contentHeight / baselineLength
    advanceScale = clampNumber(
      targetAdvance / baseAdvance,
      minVerticalAdvanceScale,
      1.1
    )
  }

  const targetColumnCount = Math.max(
    1,
    sourceColumns.length,
    preferredColumns?.length ?? 0,
    region.originalLineCount ?? 0
  )
  let colSpacingScale = 1
  if (targetColumnCount > 1) {
    const spacingWidth = originalContentWidth ?? contentWidth
    const fallbackSpacing = (spacingWidth - targetColumnCount * metrics.colWidth) / (targetColumnCount - 1)
    const sourcePitch = sourceGeometryProfile?.medianPitch ?? undefined
    const sourceSpacing = sourcePitch !== undefined ? sourcePitch - metrics.colWidth : undefined
    const baseSpacing = Math.max(1, metrics.colSpacing)
    if (sourceSpacing !== undefined) {
      const minSourceSpacing = -metrics.colWidth * maxVerticalSourceColumnOverlapRatio
      const maxSourceSpacing = metrics.colWidth * 2.5
      const targetSpacing = clampNumber(sourceSpacing, minSourceSpacing, maxSourceSpacing)
      colSpacingScale = clampNumber(
        targetSpacing / baseSpacing,
        minSourceSpacing / baseSpacing,
        maxSourceSpacing / baseSpacing
      )
    } else {
      const targetSpacing = Math.max(0, fallbackSpacing)
      colSpacingScale = clampNumber(
        targetSpacing / baseSpacing,
        minVerticalColSpacingScale,
        2.5
      )
    }
  }

  return { advanceScale, perColumnAdvanceScale, colSpacingScale }
}

/**
 * @param {Object} ctx
 * @param {Object} region
 * @param {string} text
 * @param {number} contentWidth
 * @param {number} contentHeight
 * @param {number} fontSize
 * @param {string} fontFamily
 * @param {string[]} [preferredLines]
 * @param {number} [originalContentHeight]
 * @param {Object} [sourceGeometryProfile]
 * @returns {{letterSpacingScale: number, lineHeightScale: number}}
 */
export function estimateHorizontalPreferredProfile(
  ctx,
  region,
  text,
  contentWidth,
  contentHeight,
  fontSize,
  fontFamily,
  preferredLines,
  originalContentHeight,
  sourceGeometryProfile
) {
  ctx.font = `${fontSize}px ${fontFamily}`

  const defaultLetterSpacing = fontSize * -0.05
  const chars = [...text.replace(/\n+/g, ' ').trim()]
  let totalTextWidth = 0
  for (let i = 0; i < chars.length; i++) {
    totalTextWidth += ctx.measureText(chars[i]).width
    if (i < chars.length - 1) {
      totalTextWidth += defaultLetterSpacing
    }
  }
  totalTextWidth = Math.max(0, totalTextWidth)

  const neededLineCount = Math.max(1, Math.ceil(totalTextWidth / contentWidth))
  const targetLineCount = Math.max(
    1,
    region.originalLineCount ?? 0,
    preferredLines?.length ?? 0,
    sourceGeometryProfile?.lineCount ?? 0
  )

  const totalCapacity = contentWidth * targetLineCount
  const letterSpacingScale = totalTextWidth > totalCapacity
    ? clampNumber(totalTextWidth / totalCapacity, 1, maxHorizontalLetterSpacingScale)
    : 1

  const defaultLineHeight = Math.max(1, Math.round(fontSize * 0.93))
  const availableHeight = originalContentHeight ?? contentHeight
  const sourceStyleScale = sourceGeometryProfile
    ? fontSize / Math.max(1, sourceGeometryProfile.sourceFontSize)
    : 1
  const sourceLineHeightScale = sourceGeometryProfile
    ? clampNumber(
      sourceGeometryProfile.sourcePitch * sourceStyleScale / defaultLineHeight,
      minHorizontalLineHeightScale,
      1.5
    )
    : 1
  const targetTotalLineHeight = defaultLineHeight * targetLineCount * sourceLineHeightScale
  const lineHeightScale = targetTotalLineHeight > availableHeight
    ? clampNumber(
      availableHeight / Math.max(1, defaultLineHeight * targetLineCount),
      minHorizontalLineHeightScale,
      sourceLineHeightScale
    )
    : sourceLineHeightScale

  if (neededLineCount <= targetLineCount && !sourceGeometryProfile) {
    return { letterSpacingScale: 1, lineHeightScale: 1 }
  }

  return { letterSpacingScale, lineHeightScale }
}

// ---------------------------------------------------------------------------
// Region geometry — layout helpers
// ---------------------------------------------------------------------------

/**
 * @param {Object} _region
 * @returns {number}
 */
export function resolveBoxPadding(_region) {
  return 0
}

/**
 * @param {number} contentHeight
 * @param {number} fontSize
 * @returns {number}
 */
export function resolveVerticalContentHeight(contentHeight, fontSize) {
  const dynamicRatio = clampNumber(
    verticalContentHeightExpandBaseRatio + fontSize * verticalContentHeightExpandFontRatio,
    0.0,
    0.24
  )
  const dynamicMax = Math.max(14, Math.round(fontSize * 1.6))
  const extra = clampNumber(
    Math.round(contentHeight * dynamicRatio),
    minVerticalContentHeightExpandPx,
    dynamicMax
  )
  return contentHeight + extra
}

/**
 * Resolve content height for horizontal layout with stroke overflow compensation.
 *
 * @param {number} contentHeight
 * @param {number} fontSize
 * @returns {number}
 */
export function resolveHorizontalContentHeight(contentHeight, fontSize) {
  const dynamicRatio = clampNumber(
    verticalContentHeightExpandBaseRatio + fontSize * verticalContentHeightExpandFontRatio,
    0.0,
    0.24
  )
  const dynamicMax = Math.max(14, Math.round(fontSize * 1.6))
  const extra = clampNumber(
    Math.round(contentHeight * dynamicRatio),
    minVerticalContentHeightExpandPx,
    dynamicMax
  )
  return contentHeight + extra
}

/**
 * Compute the maximum content height available for horizontal layout
 * based on the bubble mask. If the bubble extends below the region box,
 * we can use the additional vertical space to accommodate more lines.
 *
 * @param {Object|undefined} bubbleMask
 * @param {Object} region
 * @param {number} contentHeight
 * @param {number} fontSize
 * @returns {number}
 */
export function resolveHorizontalMaskHeight(bubbleMask, region, contentHeight, fontSize) {
  if (!bubbleMask) {
    return contentHeight
  }

  const boxPadding = resolveBoxPadding(region)
  const sw = strokeWidth(fontSize)
  const safetyMargin = sw + 2

  const boxTop = region.box.y + boxPadding
  const boxLeft = region.box.x + boxPadding
  const boxRight = region.box.x + region.box.width - boxPadding

  const maskMaxY = queryMaskMaxY(bubbleMask, boxLeft, boxRight, boxTop)
  const maskContentHeight = Math.max(0, maskMaxY - boxTop - safetyMargin)

  return Math.max(contentHeight, maskContentHeight)
}

/**
 * @param {Object} measureCtx
 * @param {string} text
 * @param {number} contentWidth
 * @param {number} fontSize
 * @param {Function} calcHorizontalLineCount
 * @returns {number}
 */
export function countNeededRowsAtFontSize(measureCtx, text, contentWidth, fontSize, calcHorizontalLineCount) {
  return Math.max(1, calcHorizontalLineCount(measureCtx, text, contentWidth, fontSize))
}

/**
 * @param {Object} measureCtx
 * @param {string} text
 * @param {number} contentHeight
 * @param {number} fontSize
 * @param {string} fontFamily
 * @param {Object} [options]
 * @returns {number}
 */
export function countNeededColumnsAtFontSize(measureCtx, text, contentHeight, fontSize, fontFamily, options) {
  const layout = buildVerticalLayout(measureCtx, text, contentHeight, fontSize, fontFamily, {
    advanceScale: minVerticalAdvanceScale,
    colSpacingScale: minVerticalColSpacingScale,
    preferredColumns: options?.preferredColumns,
  })
  if (options?.targetColumnCount) {
    return Math.max(1, Math.max(layout.columns.length, options.targetColumnCount))
  }
  const columns = layout.columns
  return Math.max(1, columns.length)
}

/**
 * Query the maximum Y coordinate within a bubble mask where the mask is
 * still opaque across the given horizontal range. Used by
 * resolveHorizontalMaskHeight to determine how much vertical space the
 * bubble provides.
 *
 * The mask is a cropped, single-channel bitmap whose origin is at
 * `{x, y}` in source-image coordinates; xStart/xEnd/yStart are
 * full-image coordinates and are translated internally.
 *
 * @param {import('../../types.js').BubbleMask} mask
 * @param {number} xStart
 * @param {number} xEnd
 * @param {number} yStart
 * @returns {number}
 */
export function queryMaskMaxY(mask, xStart, xEnd, yStart) {
  const clampedXStart = Math.max(mask.x, Math.round(xStart))
  const clampedXEnd = Math.min(mask.x + mask.width - 1, Math.round(xEnd))
  const firstY = Math.round(yStart)
  const maxY = mask.y + mask.height - 1

  if (clampedXStart > clampedXEnd || firstY < mask.y || firstY > maxY) {
    return firstY
  }

  let lastValidY = firstY
  for (let y = firstY; y <= maxY; y++) {
    let allOutside = true
    for (let x = clampedXStart; x <= clampedXEnd; x++) {
      if (hasBubbleMaskPixel(mask, x, y)) {
        allOutside = false
        break
      }
    }
    if (allOutside) {
      return lastValidY
    }
    lastValidY = y
  }
  return lastValidY
}

/**
 * @param {Object} region
 * @param {string} text
 * @param {Object} measureCtx
 * @param {string} fontFamily
 * @param {Function} calcHorizontalLineCount
 * @returns {Object}
 */
export function expandRegionBeforeRender(region, text, measureCtx, fontFamily, calcHorizontalLineCount) {
  const expanded = cloneRegionForTypeset(region)
  const initialFontSize = resolveInitialFontSize(expanded)
  let targetFontSize = initialFontSize
  expanded.fontSize = targetFontSize

  const usedRowsOrCols = Math.max(1, expanded.originalLineCount ?? 1)
  const boxPadding = resolveBoxPadding(expanded)
  const expandedQuadDims = quadDimensions(getRegionQuad(expanded))
  const contentWidth = Math.max(20, expandedQuadDims.width - boxPadding * 2)
  const contentHeight = Math.max(20, expandedQuadDims.height - boxPadding * 2)

  const quad = getRegionQuad(expanded)
  const center = quadCenter(quad)
  const angle = quadAngle(quad)
  const unrotatedQuad = rotateQuad(quad, center.x, center.y, -angle)
  const unrotatedBounds = quadBounds(unrotatedQuad)

  let singleAxisExpanded = false

  if ((expanded.direction ?? 'h') === 'h') {
    const neededRows = countNeededRowsAtFontSize(measureCtx, text, contentWidth, initialFontSize, calcHorizontalLineCount)
    if (neededRows > usedRowsOrCols) {
      const yfact = ((neededRows - usedRowsOrCols) / usedRowsOrCols) + 1
      const scaledUnrotated = scaleQuadFromOrigin(
        unrotatedQuad,
        1,
        yfact,
        unrotatedBounds.minX,
        unrotatedBounds.minY
      )
      const scaled = rotateQuad(scaledUnrotated, center.x, center.y, angle)
      updateRegionGeometryFromQuad(expanded, scaled)
      singleAxisExpanded = true
    }
  } else {
    const neededCols = countNeededColumnsAtFontSize(
      measureCtx,
      text,
      contentHeight,
      initialFontSize,
      fontFamily,
      {
        targetColumnCount: Math.max(1, expanded.originalLineCount ?? 1),
        preferredColumns: expanded.translatedColumns,
      }
    )
    if (neededCols > usedRowsOrCols) {
      const xfact = ((neededCols - usedRowsOrCols) / usedRowsOrCols) + 1
      const originX = (unrotatedBounds.minX + unrotatedBounds.maxX) / 2
      const scaledUnrotated = scaleQuadFromOrigin(
        unrotatedQuad,
        xfact,
        1,
        originX,
        unrotatedBounds.minY
      )
      const scaled = rotateQuad(scaledUnrotated, center.x, center.y, angle)
      updateRegionGeometryFromQuad(expanded, scaled)
      singleAxisExpanded = true
    }
  }

  if (!singleAxisExpanded) {
    const sourceLength = countTextLength(expanded.sourceText)
    const translatedLength = countTextLength(text.trim())
    let targetScale = 1

    if (sourceLength > 0 && translatedLength > sourceLength) {
      const increasePercentage = (translatedLength - sourceLength) / sourceLength
      const fontIncreaseRatio = Math.min(1.5, Math.max(1.0, 1 + increasePercentage * 0.3))
      targetFontSize = Math.max(1, Math.round(targetFontSize * fontIncreaseRatio))
      targetScale = Math.max(1, Math.min(1 + increasePercentage * 0.3, 2))
    }

    const fontSizeScale = initialFontSize > 0
      ? (((targetFontSize - initialFontSize) / initialFontSize) * 0.4 + 1)
      : 1
    let finalScale = Math.max(fontSizeScale, targetScale)
    finalScale = Math.max(1, Math.min(finalScale, 1.1))

    if (finalScale > 1.001) {
      const bounds = quadBounds(unrotatedQuad)
      const originX = (bounds.minX + bounds.maxX) / 2
      const originY = (bounds.minY + bounds.maxY) / 2
      const scaledUnrotated = scaleQuadFromOrigin(
        unrotatedQuad,
        finalScale,
        finalScale,
        originX,
        originY
      )
      const scaled = rotateQuad(scaledUnrotated, center.x, center.y, angle)
      updateRegionGeometryFromQuad(expanded, scaled)
    }
  }

  expanded.fontSize = Math.max(1, Math.round(targetFontSize))
  return expanded
}
