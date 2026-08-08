/**
 * Vertical text layout and typesetting.
 *
 * Source: ShinobuTranslator `src/pipeline/typeset/verticalLayout.ts` (419 lines)
 *
 * TS→JS mechanical conversion. All type annotations removed; logic preserved
 * verbatim. Bubble-constraint (bubbleMask) is passed through in
 * `queryMaskMaxY` on lines ~211-264.
 */

import { resolveVerticalPreferredColumns, resolveSourceColumns, countTextLength, countTextGlyphs } from './columns.js'
import { quadDimensions, getRegionQuad, cloneRegionForTypeset } from './geometry.js'
import {
  resolveInitialFontSize,
  resolveBoxPadding,
  expandRegionBeforeRender,
  strokeWidth,
  resolveAlignment,
  minFontSafetySize,
} from './fontMetrics.js'
import {
  resolveVerticalContentHeight,
  estimateVerticalPreferredProfile,
  buildVerticalLayout,
  tryShrinkVerticalForMinorOverflow,
  queryMaskMaxY,
  resolveVerticalRenderPadding,
  buildVerticalDebugColumnBoxes,
  resolveVerticalColumnPositions,
} from './verticalFit.js'
import {
  resolveVerticalSourceColumnAnchor,
  resolveVerticalSourceColumnStartOffsets,
  resolveVerticalSourceGeometryProfile,
  sourceGeometryActualBoxScale,
} from './sourceGeometry.js'

/** @typedef {import('../../types.js').TextRegion} TextRegion */
/** @typedef {import('../../types.js').TypesetLayoutDiagnostics} TypesetLayoutDiagnostics */
/** @typedef {import('../../runtime/platform.js').PipelineRenderingContext} PipelineRenderingContext */
/** @typedef {import('./verticalFit.js').VColumn} VColumn */
/** @typedef {import('./verticalFit.js').VerticalColumnAnchor} VerticalColumnAnchor */
/** @typedef {import('./verticalFit.js').VerticalColumnPositions} VerticalColumnPositions */
/** @typedef {import('./fontMetrics.js').ColumnBreakReason} ColumnBreakReason */
/** @typedef {import('./fontMetrics.js').DebugColumnBox} DebugColumnBox */
/** @typedef {import('./fontMetrics.js').VerticalCellMetrics} VerticalCellMetrics */
/** @typedef {import('./columns.js').ColumnSegmentSource} ColumnSegmentSource */

/**
 * @typedef {Object} FullVerticalTypesetInput
 * @property {TextRegion} region
 * @property {string} fontFamily
 * @property {PipelineRenderingContext} measureCtx
 */
export const FullVerticalTypesetInput = {}

/**
 * @typedef {Object} FullVerticalTypesetResult
 * @property {TextRegion} expandedRegion
 * @property {string} text
 * @property {string[]} [preferredColumns]
 * @property {ColumnSegmentSource[]} [preferredColumnSources]
 * @property {string[]} sourceColumns
 * @property {number[]} sourceColumnLengths
 * @property {?number} singleColumnMaxLength
 * @property {number} initialFontSize
 * @property {number} fittedFontSize
 * @property {VColumn[]} columns
 * @property {ColumnBreakReason[]} columnBreakReasons
 * @property {number[]} columnSegmentIds
 * @property {ColumnSegmentSource[]} columnSegmentSources
 * @property {VerticalCellMetrics} metrics
 * @property {DebugColumnBox[]} debugColumnBoxes
 * @property {number} offscreenWidth
 * @property {number} offscreenHeight
 * @property {number} boxPadding
 * @property {number} strokePadding
 * @property {number} contentWidth
 * @property {number} verticalContentHeight
 * @property {'left'|'center'|'right'} alignment
 * @property {VerticalColumnAnchor} [columnAnchor]
 * @property {number[]} [columnStartOffsets]
 * @property {TypesetLayoutDiagnostics} layoutDiagnostics
 */
export const FullVerticalTypesetResult = {}

/**
 * @param {FullVerticalTypesetInput} input
 * @returns {FullVerticalTypesetResult}
 */
export function computeFullVerticalTypeset(input) {
  const { region: inputRegion, fontFamily: ff, measureCtx } = input

  const translatedRaw = inputRegion.translatedText
  const translated = translatedRaw || inputRegion.sourceText

  const verticalPreferred = resolveVerticalPreferredColumns(inputRegion, translated)
  const preferredColumnSegments = verticalPreferred?.columns
  const preferredColumns = preferredColumnSegments?.map(segment => segment.text)
  const preferredColumnSources = preferredColumnSegments?.map(segment => segment.source)

  const cloned = cloneRegionForTypeset(inputRegion)
  if (preferredColumns && preferredColumns.length > 0) {
    cloned.translatedColumns = preferredColumns
  }

  const text = (preferredColumns && preferredColumns.length > 0)
    ? preferredColumns.join('')
    : translated

  const sourceColumns = verticalPreferred?.sourceColumns ?? resolveSourceColumns(inputRegion)
  const sourceColumnLengths = verticalPreferred?.sourceColumnLengths ?? sourceColumns.map(column => countTextLength(column))
  const singleColumnMaxLength = verticalPreferred?.singleColumnMaxLength ??
    (sourceColumnLengths.length > 0 ? Math.max(...sourceColumnLengths) : null)

  const targetColumnCount = Math.max(
    1,
    sourceColumns.length,
    preferredColumns?.length ?? 0,
    inputRegion.originalLineCount ?? 0
  )
  const sourceGeometryProfile = resolveVerticalSourceGeometryProfile(
    cloned,
    sourceColumns.length,
    measureCtx,
    ff
  )

  let estimatedInitialFontSize = sourceGeometryProfile
    ? Math.max(8, Math.floor(sourceGeometryProfile.sourceFontSize))
    : Math.max(8, Math.round(resolveInitialFontSize(cloned)))

  // Use quad's real dimensions (edge lengths) instead of AABB so that
  // the layout space matches the actual rendering target.  When the quad
  // is tilted its AABB is larger than the true width/height, which would
  // cause the offscreen canvas to be oversized and then get scaled down
  // during compositing, shrinking the rendered text.
  const clonedQuadDims = quadDimensions(getRegionQuad(cloned))

  if (!sourceGeometryProfile) {
    const heightFitLength = Math.max(
      singleColumnMaxLength ?? 0,
      ...sourceColumns.map(column => countTextGlyphs(column)),
      ...(preferredColumns ?? []).map(column => countTextGlyphs(column))
    )
    if (heightFitLength > 0) {
      const boxPaddingEst = resolveBoxPadding(cloned)
      const availableHeight = Math.max(20, clonedQuadDims.height - boxPaddingEst * 2)
      const maxFontByHeight = Math.round(availableHeight / heightFitLength)
      if (maxFontByHeight > 0 && maxFontByHeight < estimatedInitialFontSize) {
        estimatedInitialFontSize = Math.max(8, maxFontByHeight)
      }
    }

    if (targetColumnCount > 1) {
      const boxPaddingEst = resolveBoxPadding(cloned)
      const availableWidth = Math.max(20, clonedQuadDims.width - boxPaddingEst * 2)
      const maxFontByWidth = Math.floor(availableWidth / (targetColumnCount * 1.05))
      if (maxFontByWidth > 0 && maxFontByWidth < estimatedInitialFontSize) {
        estimatedInitialFontSize = Math.max(8, maxFontByWidth)
      }
    }
  }

  const noopHLineCount = () => 1
  const originalContentWidth = Math.max(20, clonedQuadDims.width - resolveBoxPadding(cloned) * 2)
  const region = sourceGeometryProfile
    ? cloned
    : expandRegionBeforeRender(cloned, text, measureCtx, ff, noopHLineCount)

  const boxPadding = resolveBoxPadding(region)
  const regionQuadDims = quadDimensions(getRegionQuad(region))
  const contentWidth = Math.max(20, regionQuadDims.width - boxPadding * 2)
  const contentHeight = Math.max(20, regionQuadDims.height - boxPadding * 2)
  const verticalContentHeight = resolveVerticalContentHeight(contentHeight, estimatedInitialFontSize)

  const columnAnchor = resolveVerticalSourceColumnAnchor(region, boxPadding, sourceGeometryProfile)

  const preferredProfile = estimateVerticalPreferredProfile(
    measureCtx,
    region,
    text,
    contentWidth,
    verticalContentHeight,
    estimatedInitialFontSize,
    ff,
    region.translatedColumns,
    originalContentWidth,
    sourceGeometryProfile
  )
  let activePerColumnAdvanceScales = preferredProfile.perColumnAdvanceScale

  /** @type {import('./verticalFit.js').BuildVerticalLayoutOptions} */
  const verticalLayoutOptions = {
    colSpacingScale: preferredProfile.colSpacingScale,
    advanceScale: preferredProfile.advanceScale,
    perColumnAdvanceScale: preferredProfile.perColumnAdvanceScale
      ? columnIndex => preferredProfile.perColumnAdvanceScale?.[columnIndex]
      : undefined,
    actualBoxScale: sourceGeometryProfile ? sourceGeometryActualBoxScale : undefined,
    useDefaultAdvanceBase: Boolean(sourceGeometryProfile),
    columnAnchor,
    preferredColumns: region.translatedColumns,
    preferredColumnSources,
  }

  const baseLayout = buildVerticalLayout(measureCtx, text, verticalContentHeight, estimatedInitialFontSize, ff, verticalLayoutOptions)
  let fontSize = estimatedInitialFontSize
  let layout = baseLayout
  let layoutContentHeight = verticalContentHeight
  let renderContentHeight = verticalContentHeight
  /** @type {((columnIndex: number) => number)|undefined} */
  let perColumnMaxHeight
  const baseHeightOverflow = baseLayout.columns.some(
    column => column.height > layoutContentHeight + 0.5
  )
  const hasTargetOverflow = (candidate, candidateFontSize) => {
    const columnPitch = candidate.metrics.colWidth + candidate.metrics.colSpacing
    const paintedGroupWidth = candidateFontSize + Math.max(0, candidate.columns.length - 1) * columnPitch
    const hasHeightOverflow = candidate.columns.some((column, columnIndex) => (
      column.height > (perColumnMaxHeight?.(columnIndex) ?? layoutContentHeight) + 0.5
    ))
    return (
      candidate.columns.length > targetColumnCount ||
      (Boolean(sourceGeometryProfile) && paintedGroupWidth > contentWidth + 0.5) ||
      hasHeightOverflow
    )
  }

  if (
    (baseLayout.columns.length > targetColumnCount || baseHeightOverflow) &&
    inputRegion.bubbleMask
  ) {
    const mask = inputRegion.bubbleMask
    const boxTop = region.box.y + boxPadding
    const boxLeft = region.box.x + boxPadding
    const sw = strokeWidth(estimatedInitialFontSize)
    const safetyMargin = sw + 2

    const positions = resolveVerticalColumnPositions(
      layout.columns.length,
      contentWidth,
      layout.metrics,
      0,
      verticalLayoutOptions.columnAnchor
    )

    const perColMaxHeights = []
    for (let c = 0; c < layout.columns.length; c++) {
      const localCx = positions.centers[c]
      const colHalfW = layout.metrics.colWidth / 2 + sw
      const imageXStart = boxLeft + localCx - colHalfW
      const imageXEnd = boxLeft + localCx + colHalfW
      const maskMaxY = queryMaskMaxY(mask, imageXStart, imageXEnd, boxTop)
      perColMaxHeights.push(Math.max(verticalContentHeight, maskMaxY - boxTop - safetyMargin))
    }

    layoutContentHeight = Math.max(verticalContentHeight, ...perColMaxHeights)
    renderContentHeight = layoutContentHeight
    perColumnMaxHeight = ci => perColMaxHeights[ci] ?? verticalContentHeight

    const extendedProfile = estimateVerticalPreferredProfile(
      measureCtx, region, text, contentWidth, layoutContentHeight,
      estimatedInitialFontSize, ff, region.translatedColumns,
      originalContentWidth,
      sourceGeometryProfile
    )
    const extendedOptions = {
      ...verticalLayoutOptions,
      colSpacingScale: extendedProfile.colSpacingScale,
      advanceScale: extendedProfile.advanceScale,
      perColumnAdvanceScale: extendedProfile.perColumnAdvanceScale
        ? columnIndex => extendedProfile.perColumnAdvanceScale?.[columnIndex]
        : undefined,
      perColumnMaxHeight,
    }
    const extendedLayout = buildVerticalLayout(
      measureCtx, text, layoutContentHeight, estimatedInitialFontSize, ff, extendedOptions
    )
    layout = extendedLayout
    verticalLayoutOptions.colSpacingScale = extendedOptions.colSpacingScale
    verticalLayoutOptions.advanceScale = extendedOptions.advanceScale
    verticalLayoutOptions.perColumnAdvanceScale = extendedOptions.perColumnAdvanceScale
    verticalLayoutOptions.perColumnMaxHeight = perColumnMaxHeight
    activePerColumnAdvanceScales = extendedProfile.perColumnAdvanceScale
  }

  if (!sourceGeometryProfile) {
    const shrunk = tryShrinkVerticalForMinorOverflow(
      measureCtx,
      text,
      layoutContentHeight,
      estimatedInitialFontSize,
      verticalLayoutOptions,
      layout,
      ff
    )
    fontSize = shrunk.fontSize
    layout = shrunk.layout
  }

  if (hasTargetOverflow(layout, fontSize) && fontSize > minFontSafetySize) {
    const minAllowed = Math.max(minFontSafetySize, Math.ceil(estimatedInitialFontSize * 0.3))
    let lo = minAllowed
    let hi = fontSize - 1
    let bestFs = fontSize
    let bestLayout = layout
    /** @type {ReturnType<typeof estimateVerticalPreferredProfile>|undefined} */
    let bestProfile
    if (sourceGeometryProfile) {
      bestFs = minAllowed
      bestProfile = estimateVerticalPreferredProfile(
        measureCtx, region, text, contentWidth, layoutContentHeight, minAllowed, ff, region.translatedColumns,
        originalContentWidth,
        sourceGeometryProfile
      )
      const minOptions = {
        ...verticalLayoutOptions,
        colSpacingScale: bestProfile.colSpacingScale,
        advanceScale: bestProfile.advanceScale,
        perColumnAdvanceScale: bestProfile.perColumnAdvanceScale
          ? columnIndex => bestProfile?.perColumnAdvanceScale?.[columnIndex]
          : undefined,
        perColumnMaxHeight,
      }
      bestLayout = buildVerticalLayout(
        measureCtx,
        text,
        layoutContentHeight,
        minAllowed,
        ff,
        minOptions
      )
    }
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2)
      const profile = estimateVerticalPreferredProfile(
        measureCtx, region, text, contentWidth, layoutContentHeight, mid, ff, region.translatedColumns,
        originalContentWidth,
        sourceGeometryProfile
      )
      const opts = {
        ...verticalLayoutOptions,
        colSpacingScale: profile.colSpacingScale,
        advanceScale: profile.advanceScale,
        perColumnAdvanceScale: profile.perColumnAdvanceScale
          ? columnIndex => profile.perColumnAdvanceScale?.[columnIndex]
          : undefined,
        perColumnMaxHeight,
      }
      const candidate = buildVerticalLayout(measureCtx, text, layoutContentHeight, mid, ff, opts)
      if (!hasTargetOverflow(candidate, mid)) {
        bestFs = mid
        bestLayout = candidate
        bestProfile = profile
        lo = mid + 1
      } else {
        hi = mid - 1
      }
    }
    if (bestFs !== fontSize) {
      fontSize = bestFs
      layout = bestLayout
      if (bestProfile) {
        verticalLayoutOptions.colSpacingScale = bestProfile.colSpacingScale
        verticalLayoutOptions.advanceScale = bestProfile.advanceScale
        verticalLayoutOptions.perColumnAdvanceScale = bestProfile.perColumnAdvanceScale
          ? columnIndex => bestProfile?.perColumnAdvanceScale?.[columnIndex]
          : undefined
        activePerColumnAdvanceScales = bestProfile.perColumnAdvanceScale
      }
    }
  }

  const { columns, columnBreakReasons, columnSegmentIds, columnSegmentSources, metrics } = layout
  const strokePadding = resolveVerticalRenderPadding(measureCtx, columns, fontSize, metrics, ff)
  const alignment = resolveAlignment(region, columns.length)
  const columnStartOffsets = resolveVerticalSourceColumnStartOffsets(
    region,
    boxPadding,
    columns.length,
    sourceGeometryProfile
  )

  measureCtx.font = `${fontSize}px ${ff}`
  const debugColumnBoxes = buildVerticalDebugColumnBoxes(
    columns,
    contentWidth,
    renderContentHeight,
    metrics,
    alignment,
    strokePadding,
    measureCtx,
    fontSize,
    verticalLayoutOptions.columnAnchor,
    columnStartOffsets
  )

  return {
    expandedRegion: region,
    text,
    preferredColumns: preferredColumns && preferredColumns.length > 0 ? preferredColumns : undefined,
    preferredColumnSources,
    sourceColumns,
    sourceColumnLengths,
    singleColumnMaxLength,
    initialFontSize: estimatedInitialFontSize,
    fittedFontSize: fontSize,
    columns,
    columnBreakReasons,
    columnSegmentIds,
    columnSegmentSources,
    metrics,
    debugColumnBoxes,
    offscreenWidth: Math.ceil(contentWidth + strokePadding * 2),
    offscreenHeight: Math.ceil(renderContentHeight + strokePadding * 2),
    boxPadding,
    strokePadding,
    contentWidth,
    verticalContentHeight: renderContentHeight,
    alignment,
    columnAnchor: verticalLayoutOptions.columnAnchor,
    columnStartOffsets,
    layoutDiagnostics: {
      sourceGeometryProfileUsed: Boolean(sourceGeometryProfile),
      sourceFontSize: sourceGeometryProfile?.sourceFontSize,
      sourceAdvance: sourceGeometryProfile?.medianAdvance,
      sourcePitch: sourceGeometryProfile?.sourcePitch,
      uniformScale: sourceGeometryProfile
        ? fontSize / Math.max(1, sourceGeometryProfile.sourceFontSize)
        : undefined,
      advanceScale: verticalLayoutOptions.advanceScale ?? 1,
      perColumnAdvanceScales: activePerColumnAdvanceScales,
      colSpacingScale: verticalLayoutOptions.colSpacingScale ?? 1,
      actualBoxScale: verticalLayoutOptions.actualBoxScale,
      useDefaultAdvanceBase: verticalLayoutOptions.useDefaultAdvanceBase ?? false,
      layoutContentHeight,
      renderContentHeight,
    },
  }
}
