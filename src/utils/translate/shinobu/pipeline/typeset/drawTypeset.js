/**
 * Main drawTypeset entry point — orchestrates horizontal/vertical layout and rendering.
 *
 * Source: ShinobuTranslator `src/pipeline/typeset/drawTypeset.ts` (363 lines)
 * TS→JS mechanical conversion. All logic preserved verbatim.
 */

import { resolveColors } from './color.js'
import {
  mapOffscreenPointToCanvas,
  mapOffscreenRectToCanvasQuad,
  cloneQuad,
  cloneRegionForTypeset,
} from './geometry.js'
import { segmentVerticalGraphemes } from './verticalOrientation.js'
import { computeFullVerticalTypeset } from './verticalLayout.js'
import { renderHorizontal } from './renderHorizontal.js'
import { buildHorizontalGlyphPlacements } from './horizontalFit.js'
import { renderVertical } from './renderVertical.js'
import { compositeRegion } from './composite.js'
import { drawTypesetDebugOverlay } from './debug.js'
import {
  computeFullHorizontalTypeset,
  resolveHorizontalLetterSpacing,
} from './horizontalLayout.js'

/** @typedef {import('../../types.js').TextDirection} TextDirection */
/** @typedef {import('../../types.js').TextRegion} TextRegion */
/** @typedef {import('../../types.js').PipelineTypesetDebugLog} PipelineTypesetDebugLog */
/** @typedef {import('../../types.js').TypesetDebugRegionLog} TypesetDebugRegionLog */
/** @typedef {import('../../runtime/platform.js').PipelineCanvas} PipelineCanvas */
/** @typedef {import('../../runtime/platform.js').PlatformProvider} PlatformProvider */
/** @typedef {import('./debug.js').RegionTypesetDebug} RegionTypesetDebug */
/** @typedef {import('./geometry.js').CompositeTransform} CompositeTransform */

// ---------------------------------------------------------------------------
// Constants (horizontal-only)
// ---------------------------------------------------------------------------

const defaultFontFamily = '"MTX-SourceHanSans-CN", "Noto Sans CJK SC", "PingFang SC", sans-serif'

/**
 * @param {string} [targetLang]
 * @returns {string}
 */
function resolveFontFamily(targetLang) {
  if (targetLang === 'zh-CHT') {
    return '"MTX-SourceHanSans-TW", "Noto Sans CJK TC", "PingFang TC", sans-serif'
  }
  return defaultFontFamily
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} DrawTypesetOptions
 * @property {boolean} [debugMode]
 * @property {boolean} [renderText]
 * @property {boolean} [collectDebugLog]
 */
export const DrawTypesetOptions = {}

/**
 * @typedef {Object} DrawTypesetResult
 * @property {PipelineCanvas} canvas
 * @property {PipelineTypesetDebugLog|null} debugLog
 */
export const DrawTypesetResult = {}

/**
 * @param {PipelineCanvas} canvas
 * @param {TextRegion[]} regions
 * @param {string} [targetLang]
 * @param {DrawTypesetOptions} [options]
 * @param {PlatformProvider} [platform]
 * @returns {Promise<DrawTypesetResult>}
 */
export async function drawTypeset(canvas, regions, targetLang, options, platform) {
  const debugMode = options?.debugMode === true
  const renderText = options?.renderText !== false
  const collectDebugLog = options?.collectDebugLog === true

  // Wait for fonts to be loaded before measuring/rendering
  const plat = platform
  if (plat?.waitForFonts) {
    await plat.waitForFonts()
  }

  const fontFamily = resolveFontFamily(targetLang)

  const out = plat.createCanvas(canvas.width, canvas.height)

  const ctx = out.getContext('2d')
  if (!ctx) {
    throw new Error('排版阶段无法获取画布上下文')
  }

  ctx.drawImage(canvas, 0, 0)

  // We need a scratch context for text measurement (shared across regions)
  const measureCanvas = plat.createCanvas(1, 1)
  measureCanvas.height = 1
  const measureCtx = measureCanvas.getContext('2d')

  const renderRegions = regions.map(cloneRegionForTypeset)
  /** @type {TypesetDebugRegionLog[]} */
  const debugRegions = []

  for (let regionIndex = 0; regionIndex < renderRegions.length; regionIndex += 1) {
    const inputRegion = renderRegions[regionIndex]
    const translatedRaw = inputRegion.translatedText
    const isVerticalInput = inputRegion.direction === 'v'

    let offCanvas = null
    /** @type {RegionTypesetDebug} */
    let debug
    let region
    let estimatedInitialFontSize
    let text
    let preferredColumns
    let sourceColumns
    let sourceColumnLengths
    let singleColumnMaxLength

    if (isVerticalInput) {
      const vResult = computeFullVerticalTypeset({
        region: inputRegion,
        fontFamily,
        measureCtx,
      })

      region = vResult.expandedRegion
      estimatedInitialFontSize = vResult.initialFontSize
      text = vResult.text
      preferredColumns = vResult.preferredColumns
      sourceColumns = vResult.sourceColumns
      sourceColumnLengths = vResult.sourceColumnLengths
      singleColumnMaxLength = vResult.singleColumnMaxLength

      if (!text.trim()) continue

      const colors = resolveColors(region.fgColor, region.bgColor)
      if (renderText) {
        offCanvas = renderVertical(
          vResult.columns,
          vResult.fittedFontSize,
          vResult.contentWidth,
          vResult.verticalContentHeight,
          colors,
          vResult.alignment,
          vResult.metrics,
          vResult.strokePadding,
          fontFamily,
          vResult.columnStartOffsets,
          vResult.columnAnchor,
          plat
        )
      }
      debug = {
        fittedFontSize: vResult.fittedFontSize,
        columnBoxes: vResult.debugColumnBoxes,
        columnGlyphCenters: vResult.columns.map((col, i) => {
          const box = vResult.debugColumnBoxes[i]
          if (!box) return []
          let penY = box.y
          return col.glyphs.flatMap(glyph => {
            const sourceGraphemes = segmentVerticalGraphemes(glyph.sourceText)
            const centers = sourceGraphemes.map((ch, sourceIndex) => ({
              ch,
              x: box.x + box.width / 2,
              y: penY + glyph.advanceY * (sourceIndex + 0.5) / sourceGraphemes.length,
            }))
            penY += glyph.advanceY
            return centers
          })
        }),
        columnVerticalItems: vResult.columns.map((col, i) => {
          const box = vResult.debugColumnBoxes[i]
          if (!box) return []
          let penY = box.y
          return col.glyphs.map(glyph => {
            const item = {
              sourceText: glyph.sourceText,
              displayText: glyph.displayText,
              kind: glyph.kind,
              orientation: glyph.orientation,
              unicodeOrientation: glyph.unicodeOrientation,
              policy: glyph.kind === 'tate-chu-yoko' ? glyph.policy : undefined,
              rotationDeg: glyph.kind === 'sideways-run' ? glyph.rotationDeg : undefined,
              sourceStart: glyph.sourceStart,
              sourceEnd: glyph.sourceEnd,
              sourceGlyphCount: glyph.sourceGlyphCount,
              x: box.x + box.width / 2,
              y: penY + glyph.advanceY / 2,
              advanceY: glyph.advanceY,
              inkWidth: glyph.inkWidth,
              inkHeight: glyph.inkHeight,
              renderInlineScale: glyph.renderInlineScale,
              renderCrossScale: glyph.renderCrossScale,
              renderOffsetX: glyph.renderOffsetX,
              renderOffsetY: glyph.renderOffsetY,
              boundaryGap: glyph.boundaryGap,
            }
            penY += glyph.advanceY
            return item
          })
        }),
        columnBreakReasons: vResult.columnBreakReasons,
        columnSegmentIds: vResult.columnSegmentIds,
        columnSegmentSources: vResult.columnSegmentSources,
        layoutDiagnostics: vResult.layoutDiagnostics,
        offscreenWidth: vResult.offscreenWidth,
        offscreenHeight: vResult.offscreenHeight,
        boxPadding: vResult.boxPadding,
        strokePadding: vResult.strokePadding,
      }
    } else {
      const horizontal = computeFullHorizontalTypeset({
        region: inputRegion,
        fontFamily,
        measureCtx,
      })
      if (!horizontal) continue

      region = horizontal.expandedRegion
      estimatedInitialFontSize = horizontal.initialFontSize
      text = horizontal.text
      preferredColumns = horizontal.preferredLines
      sourceColumns = horizontal.sourceLines
      sourceColumnLengths = horizontal.sourceLineLengths
      singleColumnMaxLength = horizontal.singleLineMaxLength

      const colors = resolveColors(region.fgColor, region.bgColor)
      measureCtx.font = `${horizontal.fittedFontSize}px ${fontFamily}`
      const horizontalGlyphPlacements = buildHorizontalGlyphPlacements(
        measureCtx,
        horizontal.lineBoxes,
        resolveHorizontalLetterSpacing(
          horizontal.fittedFontSize,
          horizontal.letterSpacingScale
        )
      )
      if (renderText) {
        offCanvas = renderHorizontal(
          horizontal.lineBoxes,
          horizontal.fittedFontSize,
          horizontal.contentWidth,
          horizontal.contentHeight,
          colors,
          horizontal.strokePadding,
          fontFamily,
          horizontal.letterSpacingScale,
          plat,
          horizontalGlyphPlacements
        )
      }
      debug = {
        fittedFontSize: horizontal.fittedFontSize,
        columnBoxes: horizontal.debugColumnBoxes,
        columnGlyphCenters: horizontalGlyphPlacements.map(line => (
          line
            .filter(glyph => !/^\s+$/u.test(glyph.ch))
            .map(glyph => ({
              ch: glyph.ch,
              x: glyph.centerX,
              y: glyph.centerY,
            }))
        )),
        columnBreakReasons: horizontal.lineBreakReasons,
        columnSegmentIds: horizontal.lineSegmentIds,
        columnSegmentSources: horizontal.lineSegmentSources,
        layoutDiagnostics: horizontal.layoutDiagnostics,
        offscreenWidth: horizontal.offscreenWidth,
        offscreenHeight: horizontal.offscreenHeight,
        boxPadding: horizontal.boxPadding,
        strokePadding: horizontal.strokePadding,
      }
    }

    let transform = null
    if (offCanvas) {
      transform = compositeRegion(
        ctx,
        offCanvas,
        region,
        debug.boxPadding,
        debug.strokePadding
      )
    }

    if (debugMode) {
      drawTypesetDebugOverlay(ctx, inputRegion, region, regionIndex, estimatedInitialFontSize, debug, transform)
    }

    if (collectDebugLog) {
      const columnCanvasQuads = debug.columnBoxes.map(box =>
        mapOffscreenRectToCanvasQuad(
          region,
          box,
          debug.offscreenWidth,
          debug.offscreenHeight,
          debug.boxPadding,
          debug.strokePadding,
          transform
        )
      )
      const columnGlyphCenters = (debug.columnGlyphCenters ?? []).map(column =>
        column.map(center => {
          const mapped = mapOffscreenPointToCanvas(
            region,
            center,
            debug.offscreenWidth,
            debug.offscreenHeight,
            debug.boxPadding,
            debug.strokePadding,
            transform
          )
          return {
            ch: center.ch,
            x: mapped.x,
            y: mapped.y,
          }
        })
      )
      const columnVerticalItems = (debug.columnVerticalItems ?? []).map(column =>
        column.map(item => {
          const mapped = mapOffscreenPointToCanvas(
            region,
            item,
            debug.offscreenWidth,
            debug.offscreenHeight,
            debug.boxPadding,
            debug.strokePadding,
            transform
          )
          return {
            ...item,
            x: mapped.x,
            y: mapped.y,
          }
        })
      )
      const direction = region.direction === 'h' ? 'h' : 'v'
      debugRegions.push({
        regionId: inputRegion.id,
        regionIndex,
        direction,
        sourceText: inputRegion.sourceText,
        translatedTextRaw: translatedRaw,
        translatedTextUsed: text,
        translatedColumnsRaw: inputRegion.translatedColumns ? [...inputRegion.translatedColumns] : [],
        preferredColumns: preferredColumns ? [...preferredColumns] : [],
        sourceColumns,
        sourceColumnLengths,
        singleColumnMaxLength,
        initialFontSize: estimatedInitialFontSize,
        fittedFontSize: debug.fittedFontSize,
        sourceBox: { ...inputRegion.box },
        expandedBox: { ...region.box },
        sourceQuad: inputRegion.quad ? cloneQuad(inputRegion.quad) : undefined,
        expandedQuad: region.quad ? cloneQuad(region.quad) : undefined,
        offscreenWidth: debug.offscreenWidth,
        offscreenHeight: debug.offscreenHeight,
        boxPadding: debug.boxPadding,
        strokePadding: debug.strokePadding,
        columnBreakReasons: [...debug.columnBreakReasons],
        columnSegmentIds: [...debug.columnSegmentIds],
        columnSegmentSources: [...debug.columnSegmentSources],
        layoutDiagnostics: debug.layoutDiagnostics ? { ...debug.layoutDiagnostics } : undefined,
        columnBoxes: debug.columnBoxes.map(box => ({ ...box })),
        columnCanvasQuads,
        columnGlyphCenters,
        columnVerticalItems,
      })
    }
  }

  const debugLog = collectDebugLog
    ? {
        generatedAt: new Date().toISOString(),
        regions: debugRegions,
      }
    : null

  return {
    canvas: out,
    debugLog,
  }
}
