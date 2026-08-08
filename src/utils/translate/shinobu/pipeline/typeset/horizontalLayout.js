/**
 * Horizontal text layout and typesetting.
 *
 * Source: ShinobuTranslator `src/pipeline/typeset/horizontalLayout.ts` (791 lines)
 *
 * TS→JS mechanical conversion. All type annotations removed; logic preserved
 * verbatim. Bubble-constraint (bubbleMask) is passed through to
 * buildHorizontalLineBoxes on lines ~528, 566, 605, 634, 722.
 */

import {
  KINSOKU_NEND,
  KINSOKU_NSTART,
  resolveHorizontalPreferredLines,
} from './columns.js'

import { cloneRegionForTypeset, getRegionQuad, quadDimensions } from './geometry.js'

import {
  expandRegionBeforeRender,
  metricAbs,
  minFontSafetySize,
  resolveAlignment,
  resolveBoxPadding,
  resolveInitialFontSize,
  resolveOffscreenGuardPadding,
  strokeWidth,
} from './fontMetrics.js'

import {
  calcHorizontalFromLines,
  buildHorizontalLineBoxes,
  estimateHorizontalPreferredProfile,
  rebalanceHorizontalShortTailLines,
  resolveHorizontalContentHeight,
  resolveHorizontalMaskHeight,
} from './horizontalFit.js'

import {
  resolveHorizontalSourceGeometryProfile,
  resolveHorizontalSourceLineAnchor,
  resolveHorizontalSourceLineLayouts,
} from './sourceGeometry.js'

/**
 * @typedef {import('./horizontalFit.js').HLine} HLine
 * @typedef {import('./horizontalFit.js').HorizontalLineBox} HorizontalLineBox
 * @typedef {import('./fontMetrics.js').ColumnBreakReason} ColumnBreakReason
 * @typedef {import('./fontMetrics.js').DebugColumnBox} DebugColumnBox
 * @typedef {import('./columns.js').ColumnSegmentSource} ColumnSegmentSource
 * @typedef {import('./sourceGeometry.js').HorizontalLineAnchor} HorizontalLineAnchor
 * @typedef {import('./sourceGeometry.js').HorizontalSourceLineLayout} HorizontalSourceLineLayout
 * @typedef {import('../../types.js').TextRegion} TextRegion
 * @typedef {import('../../types.js').TypesetLayoutDiagnostics} TypesetLayoutDiagnostics
 * @typedef {import('../../runtime/platform.js').PipelineRenderingContext} PipelineRenderingContext
 */

export const horizontalLetterSpacingRatio = -0.05
export const horizontalLineHeightRatio = 0.93

// ---------------------------------------------------------------------------
// Horizontal layout
// ---------------------------------------------------------------------------

/**
 * Detect whether a string contains Latin word characters (needs word-level wrapping).
 * @param {string} text
 * @returns {boolean}
 */
function hasLatinWords(text) {
  return /[a-zA-Z]{2,}/.test(text)
}

/**
 * @param {number} fontSize
 * @param {number} [scale=1]
 * @returns {number}
 */
export function resolveHorizontalLetterSpacing(fontSize, scale = 1) {
  return fontSize * horizontalLetterSpacingRatio * scale
}

/**
 * @param {number} fontSize
 * @param {number} [scale=1]
 * @returns {number}
 */
export function resolveHorizontalLineHeight(fontSize, scale = 1) {
  return Math.max(1, Math.round(fontSize * horizontalLineHeightRatio * scale))
}

/**
 * @param {PipelineRenderingContext} ctx
 * @param {string} text
 * @param {number} fontSize
 * @param {number} [letterSpacingScale=1]
 * @returns {number}
 */
function measureHorizontalTextWidth(ctx, text, fontSize, letterSpacingScale = 1) {
  const chars = [...text]
  if (chars.length === 0) {
    return 0
  }

  if (chars.length === 1) {
    return ctx.measureText(chars[0]).width
  }

  const letterSpacing = resolveHorizontalLetterSpacing(fontSize, letterSpacingScale)
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
 * Split text into wrapped lines for horizontal rendering.
 * - For CJK: character-level wrapping with kinsoku shori punctuation rules.
 * - For Latin: word-level wrapping with character fallback for long words.
 *
 * @param {PipelineRenderingContext} ctx
 * @param {string} text
 * @param {number} maxWidth
 * @param {number} fontSize
 * @param {string} fontFamily
 * @param {number} [letterSpacingScale=1]
 * @returns {HLine[]}
 */
export function calcHorizontal(ctx, text, maxWidth, fontSize, fontFamily, letterSpacingScale = 1) {
  ctx.font = `${fontSize}px ${fontFamily}`
  const cleaned = text.replace(/\n+/g, ' ').trim()
  if (!cleaned) return []

  if (hasLatinWords(cleaned)) {
    return calcHorizontalLatin(ctx, cleaned, maxWidth, fontSize, letterSpacingScale)
  }
  return calcHorizontalCjk(ctx, cleaned, maxWidth, fontSize, letterSpacingScale)
}

/**
 * CJK character-level line breaking with kinsoku shori.
 * @param {PipelineRenderingContext} ctx
 * @param {string} text
 * @param {number} maxWidth
 * @param {number} fontSize
 * @param {number} [letterSpacingScale=1]
 * @returns {HLine[]}
 */
function calcHorizontalCjk(ctx, text, maxWidth, fontSize, letterSpacingScale = 1) {
  const chars = [...text.replace(/\s+/g, '')]
  const lines = []
  let line = ''

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]
    const trial = line + ch
    const trialWidth = measureHorizontalTextWidth(ctx, trial, fontSize, letterSpacingScale)

    if (trialWidth <= maxWidth) {
      line = trial
      continue
    }

    // Line is full — push current line, but apply kinsoku rules
    if (line.length > 0) {
      const lastChar = line[line.length - 1]
      const nextChar = ch

      // If next char can't start a line, keep it on current line
      if (KINSOKU_NSTART.has(nextChar) && line.length > 0) {
        line += ch
        lines.push({ text: line, width: measureHorizontalTextWidth(ctx, line, fontSize, letterSpacingScale) })
        line = ''
        continue
      }

      // If current line's last char can't end a line, move it to next line
      if (KINSOKU_NEND.has(lastChar) && line.length > 1) {
        const carry = line[line.length - 1]
        line = line.slice(0, -1)
        lines.push({ text: line, width: measureHorizontalTextWidth(ctx, line, fontSize, letterSpacingScale) })
        line = carry + ch
        continue
      }

      lines.push({ text: line, width: measureHorizontalTextWidth(ctx, line, fontSize, letterSpacingScale) })
    }
    line = ch
  }

  if (line) {
    lines.push({ text: line, width: measureHorizontalTextWidth(ctx, line, fontSize, letterSpacingScale) })
  }
  return lines
}

/**
 * Latin word-level line breaking. Falls back to character-level for long words.
 * @param {PipelineRenderingContext} ctx
 * @param {string} text
 * @param {number} maxWidth
 * @param {number} fontSize
 * @param {number} [letterSpacingScale=1]
 * @returns {HLine[]}
 */
function calcHorizontalLatin(ctx, text, maxWidth, fontSize, letterSpacingScale = 1) {
  const words = text.split(/\s+/)
  const lines = []
  let line = ''

  for (const word of words) {
    const trial = line ? line + ' ' + word : word
    const trialWidth = measureHorizontalTextWidth(ctx, trial, fontSize, letterSpacingScale)

    if (trialWidth <= maxWidth) {
      line = trial
      continue
    }

    // If current line is non-empty, push it
    if (line) {
      lines.push({ text: line, width: measureHorizontalTextWidth(ctx, line, fontSize, letterSpacingScale) })
      line = ''
    }

    // Check if the word itself exceeds maxWidth — character-break it
    if (measureHorizontalTextWidth(ctx, word, fontSize, letterSpacingScale) > maxWidth) {
      const chars = [...word]
      let frag = ''
      for (const ch of chars) {
        const fragTrial = frag + ch
        if (measureHorizontalTextWidth(ctx, fragTrial, fontSize, letterSpacingScale) > maxWidth && frag) {
          lines.push({ text: frag, width: measureHorizontalTextWidth(ctx, frag, fontSize, letterSpacingScale) })
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
    lines.push({ text: line, width: measureHorizontalTextWidth(ctx, line, fontSize, letterSpacingScale) })
  }
  return lines
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

/**
 * @param {PipelineRenderingContext} ctx
 * @param {HLine[]} lines
 * @param {number} fontSize
 * @param {string} fontFamily
 * @param {number} [letterSpacingScale=1]
 * @returns {number}
 */
export function resolveHorizontalRenderPadding(ctx, lines, fontSize, fontFamily, letterSpacingScale = 1) {
  if (lines.length === 0) {
    return strokeWidth(fontSize) + 2
  }

  ctx.font = `${fontSize}px ${fontFamily}`
  const letterSpacing = resolveHorizontalLetterSpacing(fontSize, letterSpacingScale)
  let maxOverflow = 0

  for (const line of lines) {
    const chars = [...line.text]
    if (chars.length === 0) {
      continue
    }

    let penX = 0
    let minX = 0
    let maxX = line.width

    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i]
      const metrics = ctx.measureText(ch)
      const left = metricAbs(metrics.actualBoundingBoxLeft ?? 0)
      const right = metricAbs(metrics.actualBoundingBoxRight ?? 0)

      minX = Math.min(minX, penX - left)
      maxX = Math.max(maxX, penX + right)

      if (i < chars.length - 1) {
        penX += metrics.width + letterSpacing
      }
    }

    const leftOverflow = Math.max(0, -minX)
    const rightOverflow = Math.max(0, maxX - line.width)
    maxOverflow = Math.max(maxOverflow, leftOverflow, rightOverflow)
  }

  const sw = strokeWidth(fontSize)
  const basePadding = sw + 2
  const fallbackPadding = Math.ceil(fontSize * 0.12)
  const overflowPadding = Math.max(Math.ceil(maxOverflow), fallbackPadding)
  return basePadding + overflowPadding + resolveOffscreenGuardPadding(fontSize)
}

/**
 * @param {number} lineWidth
 * @param {number} contentWidth
 * @param {number} padding
 * @param {'left'|'center'|'right'} alignment
 * @returns {number}
 */
export function computeAlignX(lineWidth, contentWidth, padding, alignment) {
  switch (alignment) {
    case 'left':
      return padding
    case 'right':
      return padding + contentWidth - lineWidth
    case 'center':
    default:
      return padding + (contentWidth - lineWidth) / 2
  }
}

/**
 * @param {HLine[]} lines
 * @param {number} contentWidth
 * @param {number} contentHeight
 * @param {number} fontSize
 * @param {'left'|'center'|'right'} alignment
 * @param {number} padding
 * @param {number} [lineHeightScale=1]
 * @returns {DebugColumnBox[]}
 */
export function buildHorizontalDebugColumnBoxes(lines, contentWidth, contentHeight, fontSize, alignment, padding, lineHeightScale = 1) {
  if (lines.length === 0) {
    return []
  }
  const lineHeight = resolveHorizontalLineHeight(fontSize, lineHeightScale)
  const totalTextH = lines.length * lineHeight
  const offsetY = padding + Math.max(0, (contentHeight - totalTextH) / 2)
  return lines.map((line, index) => ({
    x: computeAlignX(line.width, contentWidth, padding, alignment),
    y: offsetY + index * lineHeight,
    width: line.width,
    height: lineHeight,
  }))
}

/**
 * @typedef {Object} FullHorizontalTypesetInput
 * @property {TextRegion} region
 * @property {string} fontFamily
 * @property {PipelineRenderingContext} measureCtx
 */
export const FullHorizontalTypesetInput = {}

/**
 * @typedef {Object} FullHorizontalTypesetResult
 * @property {TextRegion} expandedRegion
 * @property {string} text
 * @property {string[]} [preferredLines]
 * @property {string[]} sourceLines
 * @property {number[]} sourceLineLengths
 * @property {?number} singleLineMaxLength
 * @property {number} initialFontSize
 * @property {number} fittedFontSize
 * @property {HLine[]} lines
 * @property {HorizontalLineBox[]} lineBoxes
 * @property {ColumnBreakReason[]} lineBreakReasons
 * @property {number[]} lineSegmentIds
 * @property {ColumnSegmentSource[]} lineSegmentSources
 * @property {number} contentWidth
 * @property {number} contentHeight
 * @property {'left'|'center'|'right'} alignment
 * @property {HorizontalLineAnchor} [horizontalAnchor]
 * @property {number} strokePadding
 * @property {number} letterSpacingScale
 * @property {number} lineHeightScale
 * @property {TypesetLayoutDiagnostics} layoutDiagnostics
 * @property {DebugColumnBox[]} debugColumnBoxes
 * @property {number} offscreenWidth
 * @property {number} offscreenHeight
 * @property {number} boxPadding
 */
export const FullHorizontalTypesetResult = {}

/**
 * @param {FullHorizontalTypesetInput} input
 * @returns {FullHorizontalTypesetResult|null}
 */
export function computeFullHorizontalTypeset(input) {
  const { region: inputRegion, fontFamily, measureCtx } = input
  const translated = inputRegion.translatedText || inputRegion.sourceText
  if (!translated.trim()) return null

  const horizontalPreferred = resolveHorizontalPreferredLines(inputRegion, translated)
  const preferredLineSegments = horizontalPreferred.lines
  const preferredLines = preferredLineSegments.length > 0
    ? preferredLineSegments.map(segment => segment.text)
    : undefined
  const sourceLines = horizontalPreferred.sourceLines
  const sourceLineLengths = horizontalPreferred.sourceLineLengths
  const singleLineMaxLength = horizontalPreferred.singleLineMaxLength
  const text = translated

  const targetLineCount = Math.max(
    1,
    sourceLines.length,
    preferredLines?.length ?? 0,
    inputRegion.originalLineCount ?? 0
  )
  const sourceGeometryProfile = resolveHorizontalSourceGeometryProfile(
    inputRegion,
    sourceLines.length,
    measureCtx,
    fontFamily
  )
  let estimatedInitialFontSize = sourceGeometryProfile
    ? Math.max(minFontSafetySize, sourceGeometryProfile.sourceFontSize)
    : Math.max(minFontSafetySize, Math.round(resolveInitialFontSize(inputRegion)))
  const inputQuadDims = quadDimensions(getRegionQuad(inputRegion))
  if (!sourceGeometryProfile && singleLineMaxLength && singleLineMaxLength > 0) {
    const boxPaddingEst = resolveBoxPadding(inputRegion)
    const availableWidth = Math.max(20, inputQuadDims.width - boxPaddingEst * 2)
    const maxFontByWidth = Math.floor(availableWidth / (singleLineMaxLength * 1.1))
    if (maxFontByWidth > 0 && maxFontByWidth < estimatedInitialFontSize) {
      estimatedInitialFontSize = Math.max(8, maxFontByWidth)
    }
  }

  const calcHorizontalLineCount = (context, candidateText, maxWidth, fontSize) => {
    if (preferredLineSegments.length > 0) {
      context.font = `${fontSize}px ${fontFamily}`
      return calcHorizontalFromLines(
        context,
        preferredLineSegments,
        maxWidth,
        fontSize
      ).lines.length
    }
    return calcHorizontal(
      context,
      candidateText,
      maxWidth,
      fontSize,
      fontFamily
    ).length
  }
  const expandedRegion = sourceGeometryProfile
    ? cloneRegionForTypeset(inputRegion)
    : expandRegionBeforeRender(
      inputRegion,
      text,
      measureCtx,
      fontFamily,
      calcHorizontalLineCount
    )
  const boxPadding = resolveBoxPadding(expandedRegion)
  const regionQuadDims = quadDimensions(getRegionQuad(expandedRegion))
  const contentWidth = Math.max(20, regionQuadDims.width - boxPadding * 2)
  const contentHeight = Math.max(20, regionQuadDims.height - boxPadding * 2)
  const originalContentHeight = Math.max(
    20,
    inputQuadDims.height - resolveBoxPadding(inputRegion) * 2
  )
  const horizontalAnchor = resolveHorizontalSourceLineAnchor(
    expandedRegion,
    boxPadding,
    sourceGeometryProfile
  )
  const sourceLineLayouts = resolveHorizontalSourceLineLayouts(
    expandedRegion,
    boxPadding,
    preferredLines ?? [],
    sourceGeometryProfile
  )
  const sourceLineIdentityMatched = sourceLineLayouts !== undefined
  let sourceLineLayoutEnabled = sourceLineIdentityMatched
  const alignment = sourceGeometryProfile?.inferredAlignment !== undefined &&
    sourceGeometryProfile.inferredAlignment !== 'unknown'
    ? sourceGeometryProfile.inferredAlignment
    : resolveAlignment(expandedRegion, targetLineCount)

  /**
   * @typedef {Object} HorizontalCandidate
   * @property {number} fontSize
   * @property {HLine[]} lines
   * @property {HorizontalLineBox[]} lineBoxes
   * @property {ColumnBreakReason[]} lineBreakReasons
   * @property {number[]} lineSegmentIds
   * @property {ColumnSegmentSource[]} lineSegmentSources
   * @property {number} contentHeight
   * @property {number} letterSpacingScale
   * @property {number} lineHeightScale
   * @property {boolean} reflowed
   */

  const wrapLines = (maxWidth, fontSize, letterSpacingScale) => {
    measureCtx.font = `${fontSize}px ${fontFamily}`
    if (preferredLineSegments.length > 0) {
      return calcHorizontalFromLines(
        measureCtx,
        preferredLineSegments,
        sourceLineLayoutEnabled ? Number.POSITIVE_INFINITY : maxWidth,
        fontSize,
        letterSpacingScale
      )
    }
    const lines = calcHorizontal(
      measureCtx,
      text,
      maxWidth,
      fontSize,
      fontFamily,
      letterSpacingScale
    )
    return {
      lines,
      lineBreakReasons: lines.map((_, index) => (index === 0 ? 'start' : 'wrap')),
      lineSegmentIds: lines.map(() => 1),
      lineSegmentSources: lines.map(() => 'model'),
    }
  }

  const scaleSourceLineLayouts = (fontSize, lines) => {
    if (!sourceLineLayouts || !sourceGeometryProfile || sourceLineLayouts.length !== lines.length) {
      return undefined
    }
    const scale = fontSize / sourceGeometryProfile.sourceFontSize
    return sourceLineLayouts.map((layout, index) => {
      const targetWidth = layout.targetWidth * scale
      const sourceCenterX = layout.contentLeftX + layout.targetWidth / 2
      const sourceRightX = layout.contentLeftX + layout.targetWidth
      let contentLeftX
      if (alignment === 'left') {
        contentLeftX = layout.contentLeftX
      } else if (alignment === 'right') {
        contentLeftX = sourceRightX - targetWidth
      } else {
        contentLeftX = sourceCenterX - targetWidth / 2
      }
      const naturalWidth = lines[index]?.width ?? targetWidth
      return {
        contentLeftX,
        targetWidth,
        targetHeight: layout.targetHeight * scale,
        advanceScale: naturalWidth > 0 ? targetWidth / naturalWidth : 1,
      }
    })
  }

  /**
   * @param {number} fontSize
   * @returns {HorizontalCandidate}
   */
  const buildCandidate = fontSize => {
    const horizontalContentHeight = resolveHorizontalMaskHeight(
      inputRegion.bubbleMask,
      expandedRegion,
      resolveHorizontalContentHeight(contentHeight, fontSize),
      fontSize
    )
    const preferredProfile = estimateHorizontalPreferredProfile(
      measureCtx,
      expandedRegion,
      text,
      contentWidth,
      horizontalContentHeight,
      fontSize,
      fontFamily,
      preferredLines,
      originalContentHeight,
      sourceGeometryProfile
    )
    const letterSpacingScale = Math.min(1.15, preferredProfile.letterSpacingScale)
    const lineHeightScale = preferredProfile.lineHeightScale
    const sourcePitch = sourceGeometryProfile
      ? sourceGeometryProfile.sourcePitch * fontSize / sourceGeometryProfile.sourceFontSize
      : resolveHorizontalLineHeight(fontSize, lineHeightScale)
    let wrapped = wrapLines(contentWidth, fontSize, letterSpacingScale)
    let candidateSourceLayouts = sourceLineLayoutEnabled
      ? scaleSourceLineLayouts(fontSize, wrapped.lines)
      : undefined
    let lineBoxes = buildHorizontalLineBoxes({
      ctx: measureCtx,
      lines: wrapped.lines,
      region: expandedRegion,
      contentWidth,
      contentHeight: horizontalContentHeight,
      fontSize,
      padding: 0,
      alignment,
      anchorContentCenterY: horizontalAnchor?.contentCenterY,
      sourcePitch,
      sourceLineLayouts: candidateSourceLayouts,
      bubbleMask: inputRegion.bubbleMask,
      boxPadding,
    })
    let reflowed = false

    if (
      candidateSourceLayouts &&
      lineBoxes.some(line => !line.sourceAnchored)
    ) {
      sourceLineLayoutEnabled = false
      return buildCandidate(fontSize)
    }

    if (!sourceLineLayoutEnabled) {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const overflowing = lineBoxes.some(line => line.width > line.maxWidth + 0.5)
        if (!overflowing || lineBoxes.length === 0) break
        const safeWrapWidth = Math.max(20, Math.min(...lineBoxes.map(line => line.maxWidth)))
        const nextWrapped = wrapLines(safeWrapWidth, fontSize, letterSpacingScale)
        if (
          nextWrapped.lines.length === wrapped.lines.length &&
          nextWrapped.lines.every((line, index) => line.text === wrapped.lines[index]?.text)
        ) {
          break
        }
        wrapped = nextWrapped
        reflowed = true
        candidateSourceLayouts = scaleSourceLineLayouts(fontSize, wrapped.lines)
        lineBoxes = buildHorizontalLineBoxes({
          ctx: measureCtx,
          lines: wrapped.lines,
          region: expandedRegion,
          contentWidth,
          contentHeight: horizontalContentHeight,
          fontSize,
          padding: 0,
          alignment,
          anchorContentCenterY: horizontalAnchor?.contentCenterY,
          sourcePitch,
          sourceLineLayouts: candidateSourceLayouts,
          bubbleMask: inputRegion.bubbleMask,
          boxPadding,
        })
      }
    }

    const balancedLines = sourceLineLayoutEnabled
      ? wrapped.lines
      : rebalanceHorizontalShortTailLines(
        measureCtx,
        wrapped.lines,
        lineBoxes.map(line => line.maxWidth),
        resolveHorizontalLetterSpacing(fontSize, letterSpacingScale)
      )
    if (balancedLines.some((line, index) => line.text !== wrapped.lines[index]?.text)) {
      reflowed = true
      wrapped = { ...wrapped, lines: balancedLines }
      candidateSourceLayouts = scaleSourceLineLayouts(fontSize, wrapped.lines)
      lineBoxes = buildHorizontalLineBoxes({
        ctx: measureCtx,
        lines: wrapped.lines,
        region: expandedRegion,
        contentWidth,
        contentHeight: horizontalContentHeight,
        fontSize,
        padding: 0,
        alignment,
        anchorContentCenterY: horizontalAnchor?.contentCenterY,
        sourcePitch,
        sourceLineLayouts: candidateSourceLayouts,
        bubbleMask: inputRegion.bubbleMask,
        boxPadding,
      })
    }

    return {
      fontSize,
      ...wrapped,
      lineBoxes,
      contentHeight: horizontalContentHeight,
      letterSpacingScale,
      lineHeightScale,
      reflowed,
    }
  }

  const candidateFits = candidate => {
    const visualBoundsFit = candidate.lineBoxes.every(line => (
      line.topY >= -boxPadding - 0.5 &&
      line.topY + line.visualHeight <= candidate.contentHeight + boxPadding + 0.5
    ))
    return candidate.lines.length <= targetLineCount &&
      candidate.lineBoxes.every(line => line.width <= line.maxWidth + 0.5) &&
      (sourceLineLayoutEnabled
        ? visualBoundsFit
        : candidate.lineBoxes.reduce((sum, line) => sum + line.lineHeight, 0) <= candidate.contentHeight + 0.5)
  }

  let candidate = buildCandidate(estimatedInitialFontSize)
  if (!candidateFits(candidate) && estimatedInitialFontSize > minFontSafetySize) {
    const minAllowed = Math.max(
      minFontSafetySize,
      Math.ceil(estimatedInitialFontSize * 0.3)
    )
    let lo = minAllowed
    let hi = estimatedInitialFontSize - 1
    let bestCandidate
    let smallestCandidate = candidate
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2)
      const current = buildCandidate(mid)
      if (current.fontSize < smallestCandidate.fontSize) smallestCandidate = current
      if (candidateFits(current)) {
        bestCandidate = current
        lo = mid + 1
      } else {
        hi = mid - 1
      }
    }
    candidate = bestCandidate ?? smallestCandidate
  }

  const {
    fontSize,
    lines,
    lineBreakReasons,
    lineSegmentIds,
    lineSegmentSources,
    contentHeight: horizontalContentHeight,
    letterSpacingScale,
    lineHeightScale,
  } = candidate
  measureCtx.font = `${fontSize}px ${fontFamily}`
  const strokePadding = resolveHorizontalRenderPadding(
    measureCtx,
    lines,
    fontSize,
    fontFamily,
    letterSpacingScale
  )
  const finalSourcePitch = sourceGeometryProfile
    ? sourceGeometryProfile.sourcePitch * fontSize / sourceGeometryProfile.sourceFontSize
    : resolveHorizontalLineHeight(fontSize, lineHeightScale)
  const finalSourceLineLayouts = sourceLineLayoutEnabled
    ? scaleSourceLineLayouts(fontSize, lines)
    : undefined
  const lineBoxes = buildHorizontalLineBoxes({
    ctx: measureCtx,
    lines,
    region: expandedRegion,
    contentWidth,
    contentHeight: horizontalContentHeight,
    fontSize,
    padding: strokePadding,
    alignment,
    anchorContentCenterY: horizontalAnchor?.contentCenterY,
    sourcePitch: finalSourcePitch,
    sourceLineLayouts: finalSourceLineLayouts,
    bubbleMask: inputRegion.bubbleMask,
    boxPadding,
  })
  const debugColumnBoxes = lineBoxes.map(line => ({
    x: line.x,
    y: line.topY,
    width: line.width,
    height: line.visualHeight,
  }))
  const layoutDiagnostics = {
    sourceGeometryProfileUsed: sourceGeometryProfile !== undefined,
    sourceFontSize: sourceGeometryProfile?.sourceFontSize,
    sourcePitch: sourceGeometryProfile?.sourcePitch,
    uniformScale: sourceGeometryProfile
      ? fontSize / sourceGeometryProfile.sourceFontSize
      : undefined,
    advanceScale: 1,
    colSpacingScale: 1,
    useDefaultAdvanceBase: false,
    layoutContentHeight: horizontalContentHeight,
    renderContentHeight: horizontalContentHeight,
    horizontalAlignment: sourceGeometryProfile?.inferredAlignment ?? alignment,
    horizontalAnchorContentCenterY: horizontalAnchor?.contentCenterY,
    horizontalSafeWidths: lineBoxes.map(line => line.maxWidth),
    horizontalSafeIntervals: lineBoxes.map(line => ({
      left: line.safeInterval.left,
      right: line.safeInterval.right,
      source: line.safeInterval.source,
    })),
    horizontalLetterSpacingScale: letterSpacingScale,
    horizontalLineHeightScale: lineHeightScale,
    horizontalReflowed: candidate.reflowed,
    horizontalSourceIdentityMatched: sourceLineIdentityMatched,
    horizontalSourceLineStartXs: lineBoxes.map(line => line.x - strokePadding),
    horizontalSourceLineTargetWidths: lineBoxes.map(line => line.width),
    horizontalSourceLineAdvanceScales: lineBoxes.map(line => line.sourceAdvanceScale ?? 1),
    horizontalSourceLineClampCount: lineBoxes.filter(line => line.sourceClamped).length,
    horizontalLineBaselines: lineBoxes.map(line => line.baselineY),
    horizontalLineInkAscents: lineBoxes.map(line => line.inkAscent),
    horizontalLineInkDescents: lineBoxes.map(line => line.inkDescent),
  }

  return {
    expandedRegion,
    text,
    preferredLines,
    sourceLines,
    sourceLineLengths,
    singleLineMaxLength,
    initialFontSize: estimatedInitialFontSize,
    fittedFontSize: fontSize,
    lines,
    lineBoxes,
    lineBreakReasons,
    lineSegmentIds,
    lineSegmentSources,
    contentWidth,
    contentHeight: horizontalContentHeight,
    alignment,
    horizontalAnchor,
    strokePadding,
    letterSpacingScale,
    lineHeightScale,
    layoutDiagnostics,
    debugColumnBoxes,
    offscreenWidth: Math.ceil(contentWidth + strokePadding * 2),
    offscreenHeight: Math.ceil(horizontalContentHeight + strokePadding * 2),
    boxPadding,
  }
}
