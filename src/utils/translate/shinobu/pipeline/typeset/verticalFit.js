/**
 * Vertical layout fit barrel.
 *
 * Source: ShinobuTranslator `src/pipeline/typeset/verticalFit.ts` (32 lines)
 *
 * Re-exports vertical layout utilities from fontFitCore.js.
 */

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
} from './fontFitCore.js'
