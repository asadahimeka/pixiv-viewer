/**
 * @file Font metrics re-export barrel.
 *
 * Source: ShinobuTranslator `src/pipeline/typeset/fontMetrics.ts` (31 lines)
 *
 * Re-exports from fontFitCore.js. Exports are no longer stubs — real
 * implementations are in fontFitCore.js.
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
} from './fontFitCore.js'
