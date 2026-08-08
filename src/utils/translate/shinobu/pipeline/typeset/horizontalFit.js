/**
 * Horizontal layout fit barrel with additional line-metrics and placement helpers.
 *
 * Source: ShinobuTranslator `src/pipeline/typeset/horizontalFit.ts` (442 lines)
 *
 * Re-exports 11 core functions from fontFitCore.js, plus defines horizontal
 * line-box construction, glyph placement, safe-interval resolution, and
 * rebalancing helpers.
 */

import { getRegionQuad, quadAngle } from './geometry.js'
import { maxSourceGeometryAnchorAngleRad } from './fontFitCore.js'
import { hasBubbleMaskPixel } from '../bubbleMask.js'

// ---- Re-exports from fontFitCore.js ----

export {
  calcHorizontalFromLines,
  countNeededRowsAtFontSize,
  estimateHorizontalPreferredProfile,
  horizontalLetterSpacingRatio,
  horizontalLineHeightRatio,
  maxHorizontalLetterSpacingScale,
  minHorizontalLetterSpacingScale,
  minHorizontalLineHeightScale,
  resolveHorizontalContentHeight,
  resolveHorizontalMaskHeight,
  tryShrinkHorizontalForMinorOverflow,
} from './fontFitCore.js'

// ---- Local helpers ----

/**
 * @param {number|undefined} value
 * @returns {number}
 */
function finiteMetric(value) {
  return value !== undefined && Number.isFinite(value) ? Math.abs(value) : 0
}

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

// ---- Line metrics ----

/**
 * Resolve per-line metrics (ascent, descent, ink bounds, line height) for
 * a horizontal text span.
 *
 * @param {Object} ctx
 * @param {string} text
 * @param {number} fontSize
 * @param {number} [sourcePitch]
 * @returns {{ascent: number, descent: number, inkAscent: number, inkDescent: number, inkHeight: number, lineHeight: number}}
 */
export function resolveHorizontalLineMetrics(ctx, text, fontSize, sourcePitch) {
  ctx.textBaseline = 'alphabetic'
  const measured = ctx.measureText(text || '国')
  const actualAscent = finiteMetric(measured.actualBoundingBoxAscent)
  const actualDescent = finiteMetric(measured.actualBoundingBoxDescent)
  const fontAscent = finiteMetric(measured.fontBoundingBoxAscent)
  const fontDescent = finiteMetric(measured.fontBoundingBoxDescent)
  const ascent = fontAscent > 0 ? fontAscent : actualAscent > 0 ? actualAscent : fontSize * 0.8
  const descent = fontDescent > 0 ? fontDescent : actualDescent > 0 ? actualDescent : fontSize * 0.2
  const inkAscent = actualAscent > 0 ? actualAscent : ascent
  const inkDescent = actualDescent > 0 ? actualDescent : descent
  const inkHeight = inkAscent + inkDescent
  const naturalLineHeight = Math.max(fontSize, ascent + descent)
  const lineHeight = Math.max(1, naturalLineHeight, sourcePitch ?? 0)
  return { ascent, descent, inkAscent, inkDescent, inkHeight, lineHeight }
}

// ---- Safe interval ----

/**
 * @param {number} contentWidth
 * @returns {{left: number, right: number, width: number, source: string}}
 */
function contentInterval(contentWidth) {
  return {
    left: 0,
    right: contentWidth,
    width: contentWidth,
    source: 'content',
  }
}

/**
 * Resolve the safe horizontal interval for a line within a bubble mask.
 * Scans the mask row-by-row to find where the bubble is opaque (safe), then
 * selects the run closest to the preferred x position.
 *
 * The mask is a cropped single-channel bitmap (`{x, y, width, height, data}`
 * with 0/1 values), but all coordinates here are full-image coordinates;
 * `hasBubbleMaskPixel` performs the offset translation.
 *
 * @param {{ mask?: import('../../types.js').BubbleMask, region: Object, contentWidth: number, localTopY: number, localBottomY: number, preferredContentX: number, safetyMargin: number, boxPadding?: number }} input
 * @returns {{left: number, right: number, width: number, source: string}}
 */
export function resolveHorizontalSafeInterval(input) {
  const {
    mask,
    region,
    contentWidth,
    localTopY,
    localBottomY,
    preferredContentX,
    safetyMargin,
    boxPadding = 0,
  } = input
  const fallback = contentInterval(contentWidth)
  if (!mask || Math.abs(quadAngle(getRegionQuad(region))) > maxSourceGeometryAnchorAngleRad) {
    return fallback
  }

  const contentImageX = Math.round(region.box.x + boxPadding)
  const imageXStart = Math.max(mask.x, contentImageX)
  const imageXEnd = Math.min(mask.x + mask.width - 1, Math.round(contentImageX + contentWidth))
  const imageYStart = Math.floor(region.box.y + boxPadding + localTopY)
  const imageYEnd = Math.ceil(region.box.y + boxPadding + localBottomY) - 1
  const maskYEnd = mask.y + mask.height - 1
  if (imageYStart < mask.y || imageYEnd > maskYEnd) return fallback
  if (imageXStart > imageXEnd || imageYStart > imageYEnd) return fallback

  /** @type {Array<{left: number, right: number}>} */
  const runs = []
  let runStart
  for (let x = imageXStart; x <= imageXEnd; x += 1) {
    let safe = true
    for (let y = imageYStart; y <= imageYEnd; y += 1) {
      if (!hasBubbleMaskPixel(mask, x, y)) {
        safe = false
        break
      }
    }
    if (safe && runStart === undefined) runStart = x
    if (!safe && runStart !== undefined) {
      runs.push({ left: runStart, right: x - 1 })
      runStart = undefined
    }
  }
  if (runStart !== undefined) runs.push({ left: runStart, right: imageXEnd })
  if (runs.length === 0) return fallback

  const preferredImageX = contentImageX + preferredContentX
  const selected = runs.find(run => preferredImageX >= run.left && preferredImageX <= run.right) ??
    [...runs].sort((a, b) => (b.right - b.left) - (a.right - a.left))[0]
  if (!selected) return fallback

  const left = selected.left - contentImageX + safetyMargin
  const right = selected.right - contentImageX - safetyMargin
  if (!Number.isFinite(left) || !Number.isFinite(right) || right <= left) return fallback
  return { left, right, width: right - left, source: 'mask' }
}

// ---- Line box construction ----

/**
 * @param {number} lineWidth
 * @param {{left: number, right: number, width: number, source: string}} interval
 * @param {number} padding
 * @param {'left'|'center'|'right'} alignment
 * @returns {number}
 */
function alignedLineX(lineWidth, interval, padding, alignment) {
  if (alignment === 'left') return padding + interval.left
  if (alignment === 'right') return padding + interval.right - lineWidth
  return padding + interval.left + (interval.width - lineWidth) / 2
}

/**
 * Build complete horizontal line boxes from wrapped text lines. For each line
 * it resolves font metrics, safe intervals (bubble mask), alignment x, and
 * source-anchored positioning.
 *
 * @param {Object} input
 * @param {Object} input.ctx
 * @param {Array<{text: string, width: number}>} input.lines
 * @param {Object} input.region
 * @param {number} input.contentWidth
 * @param {number} input.contentHeight
 * @param {number} input.fontSize
 * @param {number} input.padding
 * @param {'left'|'center'|'right'} input.alignment
 * @param {number} [input.anchorContentCenterY]
 * @param {number} [input.sourcePitch]
 * @param {Object[]} [input.sourceLineLayouts]
 * @param {Object} [input.bubbleMask]
 * @param {number} [input.boxPadding]
 * @returns {Object[]}
 */
export function buildHorizontalLineBoxes(input) {
  const {
    ctx,
    lines,
    region,
    contentWidth,
    contentHeight,
    fontSize,
    padding,
    alignment,
    anchorContentCenterY,
    sourcePitch,
    sourceLineLayouts,
    bubbleMask,
    boxPadding = 0,
  } = input
  if (lines.length === 0) return []

  const resolvedSourceLayouts = sourceLineLayouts?.length === lines.length
    ? sourceLineLayouts
    : undefined

  const metricsByLine = lines.map(line => (
    resolveHorizontalLineMetrics(ctx, line.text, fontSize, sourcePitch)
  ))
  const lineHeight = resolvedSourceLayouts
    ? Math.max(1, sourcePitch ?? fontSize)
    : Math.max(...metricsByLine.map(m => m.lineHeight))
  const centerOffsets = lines.map((_, i) => (
    (i - (lines.length - 1) / 2) * lineHeight
  ))
  const visualHeights = lines.map((_, i) => (
    resolvedSourceLayouts?.[i]?.targetHeight ?? lineHeight
  ))
  const topOffset = Math.min(...centerOffsets.map((offset, i) => (
    offset - visualHeights[i] / 2
  )))
  const bottomOffset = Math.max(...centerOffsets.map((offset, i) => (
    offset + visualHeights[i] / 2
  )))
  const minCenterY = -topOffset
  const maxCenterY = Math.max(minCenterY, contentHeight - bottomOffset)
  const contentCenterY = clampNumber(
    anchorContentCenterY ?? contentHeight / 2,
    minCenterY,
    maxCenterY
  )
  const safetyMargin = Math.max(0, Math.ceil(fontSize * 0.08))

  return lines.map((line, index) => {
    const metrics = metricsByLine[index]
    const sourceLayout = resolvedSourceLayouts?.[index]
    const visualHeight = visualHeights[index]
    const lineCenterY = contentCenterY + centerOffsets[index]
    const localTopY = lineCenterY - visualHeight / 2
    const measuredSafeInterval = resolveHorizontalSafeInterval({
      mask: bubbleMask,
      region,
      contentWidth,
      localTopY,
      localBottomY: localTopY + visualHeight,
      preferredContentX: sourceLayout
        ? sourceLayout.contentLeftX + sourceLayout.targetWidth / 2
        : contentWidth / 2,
      safetyMargin,
      boxPadding,
    })
    const safeInterval = sourceLayout
      ? (() => {
          const left = Math.max(
            -boxPadding,
            measuredSafeInterval.left - safetyMargin - boxPadding
          )
          const right = Math.min(
            contentWidth + boxPadding,
            measuredSafeInterval.right + safetyMargin + boxPadding
          )
          return {
            left,
            right,
            width: Math.max(0, right - left),
            source: measuredSafeInterval.source,
          }
        })()
      : measuredSafeInterval
    const targetWidth = sourceLayout?.targetWidth ?? line.width
    const sourceFits = sourceLayout !== undefined && targetWidth <= safeInterval.width + 0.5
    const desiredLeft = sourceLayout?.contentLeftX ?? 0
    const clampedLeft = sourceFits
      ? clampNumber(desiredLeft, safeInterval.left, safeInterval.right - targetWidth)
      : desiredLeft
    const sourceClamped = sourceFits && Math.abs(clampedLeft - desiredLeft) > 0.5
    const leadingTop = Math.max(0, (lineHeight - metrics.ascent - metrics.descent) / 2)
    const baselineY = sourceLayout
      ? padding + lineCenterY + (metrics.inkAscent - metrics.inkDescent) / 2
      : padding + localTopY + leadingTop + metrics.ascent
    return {
      ...line,
      ...metrics,
      width: targetWidth,
      lineHeight,
      x: sourceLayout
        ? padding + clampedLeft
        : alignedLineX(line.width, safeInterval, padding, alignment),
      topY: padding + localTopY,
      baselineY,
      maxWidth: safeInterval.width,
      safeInterval,
      naturalWidth: line.width,
      visualHeight,
      sourceAdvanceScale: sourceFits ? sourceLayout.advanceScale : undefined,
      sourceAnchored: sourceFits,
      sourceClamped,
    }
  })
}

// ---- Glyph placement ----

/**
 * Build per-glyph placement info for each line box. For source-anchored lines,
 * glyphs are stretched to fit the allocated target width; otherwise they flow
 * naturally at the resolved (letter-spaced) x position.
 *
 * @param {Object} ctx
 * @param {Object[]} lines
 * @param {number} letterSpacing
 * @returns {Object[][]}
 */
export function buildHorizontalGlyphPlacements(ctx, lines, letterSpacing) {
  ctx.textBaseline = 'alphabetic'
  return lines.map(line => {
    if (line.sourceAnchored) {
      const chars = [...line.text]
      const measurements = chars.map(ch => ctx.measureText(ch))
      const widths = measurements.map(m => m.width)
      const naturalAdvances = widths.map((w, i) => (
        w + (i < chars.length - 1 ? letterSpacing : 0)
      ))
      const naturalTotal = naturalAdvances.reduce((sum, a) => sum + a, 0)
      const advanceScale = naturalTotal > 0 ? line.width / naturalTotal : 1
      let penX = line.x
      return chars.map((ch, i) => {
        const width = widths[i]
        const m = measurements[i]
        const glyphAscent = finiteMetric(m.actualBoundingBoxAscent) || line.inkAscent
        const glyphDescent = finiteMetric(m.actualBoundingBoxDescent) || line.inkDescent
        const allocatedAdvance = naturalAdvances[i] * advanceScale
        const centerX = penX + allocatedAdvance / 2
        const placement = {
          ch,
          x: centerX - width / 2,
          baselineY: line.baselineY,
          centerX,
          centerY: line.baselineY + (glyphDescent - glyphAscent) / 2,
          width,
        }
        penX += allocatedAdvance
        return placement
      })
    }

    let penX = line.x
    const chars = [...line.text]
    return chars.map((ch, i) => {
      const m = ctx.measureText(ch)
      const width = m.width
      const glyphAscent = finiteMetric(m.actualBoundingBoxAscent) || line.inkAscent
      const glyphDescent = finiteMetric(m.actualBoundingBoxDescent) || line.inkDescent
      const placement = {
        ch,
        x: penX,
        baselineY: line.baselineY,
        centerX: penX + width / 2,
        centerY: line.baselineY + (glyphDescent - glyphAscent) / 2,
        width,
      }
      if (i < chars.length - 1) {
        penX += width + letterSpacing
      }
      return placement
    })
  })
}

// ---- Rebalance ----

/**
 * @param {Object} ctx
 * @param {string} text
 * @param {number} letterSpacing
 * @returns {number}
 */
function measureSpacedTextWidth(ctx, text, letterSpacing) {
  const chars = [...text]
  return chars.reduce((width, ch, i) => (
    width + ctx.measureText(ch).width + (i < chars.length - 1 ? letterSpacing : 0)
  ), 0)
}

/**
 * Rebalance horizontal lines so that short "orphan" tail lines (fewer than
 * `minTailGlyphCount` glyphs) are merged back into the previous line when it
 * fits within the max-width constraints.
 *
 * @param {Object} ctx
 * @param {Array<{text: string, width: number}>} inputLines
 * @param {number[]} maxWidths
 * @param {number} letterSpacing
 * @param {number} [minTailGlyphCount=3]
 * @returns {Array<{text: string, width: number}>}
 */
export function rebalanceHorizontalShortTailLines(ctx, inputLines, maxWidths, letterSpacing, minTailGlyphCount = 3) {
  if (inputLines.length < 2) return inputLines
  const lines = inputLines.map(l => ({ ...l }))

  for (let lineIndex = lines.length - 1; lineIndex > 0; lineIndex -= 1) {
    const previous = lines[lineIndex - 1]
    const tail = lines[lineIndex]
    if ([...tail.text.trim()].length >= minTailGlyphCount) continue
    const previousMaxWidth = maxWidths[lineIndex - 1] ?? Number.POSITIVE_INFINITY
    const tailMaxWidth = maxWidths[lineIndex] ?? Number.POSITIVE_INFINITY

    const previousWords = previous.text.trim().split(/\s+/).filter(Boolean)
    if (previousWords.length > 1) {
      const moved = previousWords.pop()
      if (moved) {
        const candidatePrevious = previousWords.join(' ')
        const candidateTail = `${moved} ${tail.text.trim()}`.trim()
        const previousWidth = measureSpacedTextWidth(ctx, candidatePrevious, letterSpacing)
        const tailWidth = measureSpacedTextWidth(ctx, candidateTail, letterSpacing)
        if (candidatePrevious && previousWidth <= previousMaxWidth && tailWidth <= tailMaxWidth) {
          previous.text = candidatePrevious
          previous.width = previousWidth
          tail.text = candidateTail
          tail.width = tailWidth
          continue
        }
      }
    }

    if (/\s/.test(previous.text) || /\s/.test(tail.text)) continue
    const previousGlyphs = [...previous.text]
    const tailGlyphs = [...tail.text]
    while (tailGlyphs.length < minTailGlyphCount && previousGlyphs.length > minTailGlyphCount) {
      const moved = previousGlyphs.pop()
      if (!moved) break
      const candidatePrevious = previousGlyphs.join('')
      const candidateTail = `${moved}${tailGlyphs.join('')}`
      const previousWidth = measureSpacedTextWidth(ctx, candidatePrevious, letterSpacing)
      const tailWidth = measureSpacedTextWidth(ctx, candidateTail, letterSpacing)
      if (!candidatePrevious || previousWidth > previousMaxWidth || tailWidth > tailMaxWidth) {
        previousGlyphs.push(moved)
        break
      }
      tailGlyphs.unshift(moved)
      previous.text = candidatePrevious
      previous.width = previousWidth
      tail.text = candidateTail
      tail.width = tailWidth
    }
  }
  return lines
}
