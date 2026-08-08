/**
 * Font-fit barrel — main entry point for typeset layout.
 *
 * Source: ShinobuTranslator `src/pipeline/typeset/fontFit.ts` (94 lines)
 *
 * Re-exports from the sub-barrels (fontMetrics, sourceGeometry, verticalFit,
 * horizontalFit) which each draw from fontFitCore.js.
 */

export {
  clampNumber,
  expandRegionBeforeRender,
  maxSidewaysLatinOpticalScale,
  measureGlyphBox,
  metricAbs,
  minFontSafetySize,
  minOffscreenGuardPaddingPx,
  minSidewaysLatinOpticalScale,
  minorOverflowMaxGlyphCount,
  minorOverflowShrinkMinScale,
  offscreenGuardPaddingByFontRatio,
  resolveAlignment,
  resolveBoxPadding,
  resolveFontVerticalAdvance,
  resolveGlyphVerticalAdvance,
  resolveInitialFontSize,
  resolveOffscreenGuardPadding,
  resolveVerticalCellMetrics,
  resolveVerticalTokenMetrics,
  strokeWidth,
} from './fontMetrics.js'
export {
  maxSourceGeometryAnchorAngleRad,
  maxVerticalSourceColumnOverlapRatio,
  minSourceGeometryAdvanceScale,
  resolveHorizontalSourceGeometryProfile,
  resolveHorizontalSourceLineAnchor,
  resolveHorizontalSourceLineLayouts,
  resolveVerticalSourceColumnAnchor,
  resolveVerticalSourceColumnStartOffsets,
  resolveVerticalSourceGeometryProfile,
  sourceGeometryActualBoxScale,
  sourceGeometryAdvanceQuantizationBiasPx,
} from './sourceGeometry.js'
export {
  buildVerticalDebugColumnBoxes,
  buildVerticalLayout,
  calcVertical,
  calcVerticalFromColumns,
  computeVerticalTotalWidth,
  countNeededColumnsAtFontSize,
  estimateVerticalPreferredProfile,
  hasMinorOverflowWrap,
  minVerticalAdvanceScale,
  minVerticalColSpacingScale,
  minVerticalContentHeightExpandPx,
  queryMaskMaxY,
  resolveVerticalColumnPositions,
  resolveVerticalContentHeight,
  resolveVerticalRenderPadding,
  resolveVerticalStartY,
  tryShrinkVerticalForMinorOverflow,
  verticalAdvanceTightenRatio,
  verticalColumnSpacingRatio,
  verticalContentHeightExpandBaseRatio,
  verticalContentHeightExpandFontRatio,
} from './verticalFit.js'
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
} from './horizontalFit.js'
