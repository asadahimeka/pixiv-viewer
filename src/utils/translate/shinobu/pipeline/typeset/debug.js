/**
 * Typeset debug overlay rendering.
 *
 * Source: ShinobuTranslator `src/pipeline/typeset/debug.ts` (140 lines)
 * TS→JS mechanical conversion. Debug visualization logic preserved verbatim.
 */

import {
  mapOffscreenPointToCanvas,
  mapOffscreenRectToCanvasQuad,
} from './geometry.js'

/** @typedef {import('../../types.js').QuadPoint} QuadPoint */
/** @typedef {import('../../types.js').TextRegion} TextRegion */
/** @typedef {import('../../runtime/platform.js').PipelineRenderingContext} PipelineRenderingContext */
/** @typedef {import('./geometry.js').CompositeTransform} CompositeTransform */

/**
 * Debug info passed from the typeset step to the overlay.
 *
 * @typedef {Object} RegionTypesetDebug
 * @property {number} fittedFontSize
 * @property {Array<{x: number, y: number, width: number, height: number}>} columnBoxes
 * @property {Array<Array<{ch: string, x: number, y: number}>>} [columnGlyphCenters]
 * @property {Array<Array<Object>>} [columnVerticalItems]
 * @property {string[]} columnBreakReasons
 * @property {number[]} columnSegmentIds
 * @property {string[]} columnSegmentSources
 * @property {Object} [layoutDiagnostics]
 * @property {number} offscreenWidth
 * @property {number} offscreenHeight
 * @property {number} boxPadding
 * @property {number} strokePadding
 */
export const RegionTypesetDebug = {}

/**
 * @param {PipelineRenderingContext} ctx
 * @param {TextRegion} region
 */
function traceRegionPath(ctx, region) {
  if (region.quad && region.quad.length === 4) {
    ctx.beginPath()
    ctx.moveTo(region.quad[0].x, region.quad[0].y)
    ctx.lineTo(region.quad[1].x, region.quad[1].y)
    ctx.lineTo(region.quad[2].x, region.quad[2].y)
    ctx.lineTo(region.quad[3].x, region.quad[3].y)
    ctx.closePath()
    return
  }
  ctx.beginPath()
  ctx.rect(region.box.x, region.box.y, region.box.width, region.box.height)
}

/**
 * @param {PipelineRenderingContext} ctx
 * @param {QuadPoint[]} quad
 */
function drawQuadPath(ctx, quad) {
  if (quad.length !== 4) {
    return
  }
  ctx.beginPath()
  ctx.moveTo(quad[0].x, quad[0].y)
  ctx.lineTo(quad[1].x, quad[1].y)
  ctx.lineTo(quad[2].x, quad[2].y)
  ctx.lineTo(quad[3].x, quad[3].y)
  ctx.closePath()
}

/**
 * @param {PipelineRenderingContext} ctx
 * @param {TextRegion} sourceRegion
 * @param {TextRegion} expandedRegion
 * @param {number} regionIndex
 * @param {number} initialFontSize
 * @param {RegionTypesetDebug} debug
 * @param {CompositeTransform|null} transform
 */
export function drawTypesetDebugOverlay(
  ctx,
  sourceRegion,
  expandedRegion,
  regionIndex,
  initialFontSize,
  debug,
  transform
) {
  ctx.save()

  // source region (before expand)
  traceRegionPath(ctx, sourceRegion)
  ctx.strokeStyle = 'rgba(30, 136, 229, 0.95)'
  ctx.lineWidth = 1.5
  ctx.stroke()

  // expanded region (used for typeset)
  traceRegionPath(ctx, expandedRegion)
  ctx.strokeStyle = 'rgba(0, 184, 212, 0.95)'
  ctx.lineWidth = 1
  ctx.setLineDash([4, 3])
  ctx.stroke()
  ctx.setLineDash([])

  ctx.font = '12px "MTX-SourceHanSans-CN", "Noto Sans CJK SC", sans-serif'
  ctx.textBaseline = 'top'
  const label = `#${regionIndex + 1} init:${initialFontSize}px fit:${debug.fittedFontSize}px cols:${debug.columnBoxes.length}`
  const labelX = Math.max(0, sourceRegion.box.x)
  const labelY = Math.max(0, sourceRegion.box.y - 18)
  const textWidth = ctx.measureText(label).width
  ctx.fillStyle = 'rgba(8, 15, 29, 0.86)'
  ctx.fillRect(labelX, labelY, textWidth + 10, 16)
  ctx.fillStyle = '#d6fbff'
  ctx.fillText(label, labelX + 5, labelY + 2)

  ctx.strokeStyle = 'rgba(255, 152, 0, 0.92)'
  ctx.fillStyle = 'rgba(255, 152, 0, 0.14)'
  ctx.lineWidth = 1
  for (let i = 0; i < debug.columnBoxes.length; i += 1) {
    const boxQuad = mapOffscreenRectToCanvasQuad(
      expandedRegion,
      debug.columnBoxes[i],
      debug.offscreenWidth,
      debug.offscreenHeight,
      debug.boxPadding,
      debug.strokePadding,
      transform
    )
    drawQuadPath(ctx, boxQuad)
    ctx.fill()
    ctx.stroke()

    const reason = debug.columnBreakReasons[i] ?? 'wrap'
    const reasonLabel = reason === 'both'
      ? '并'
      : reason === 'model'
        ? '模'
        : reason === 'wrap'
          ? '溢'
          : '首'
    const reasonX = Math.min(boxQuad[0].x, boxQuad[1].x, boxQuad[2].x, boxQuad[3].x)
    const reasonY = Math.max(0, Math.min(boxQuad[0].y, boxQuad[1].y, boxQuad[2].y, boxQuad[3].y) - 14)
    const reasonWidth = ctx.measureText(reasonLabel).width
    ctx.fillStyle = 'rgba(8, 15, 29, 0.86)'
    ctx.fillRect(reasonX, reasonY, reasonWidth + 8, 13)
    ctx.fillStyle = '#ffd59a'
    ctx.fillText(reasonLabel, reasonX + 4, reasonY + 1)

    const segId = debug.columnSegmentIds[i] ?? 1
    const segSource = debug.columnSegmentSources[i] ?? 'model'
    const segLabel = `${segId}${segSource === 'split' ? '裂' : '模'}`
    const segX = reasonX
    const segY = Math.max(boxQuad[0].y, boxQuad[1].y, boxQuad[2].y, boxQuad[3].y) + 2
    const segWidth = ctx.measureText(segLabel).width
    ctx.fillStyle = 'rgba(8, 15, 29, 0.86)'
    ctx.fillRect(segX, segY, segWidth + 8, 13)
    ctx.fillStyle = '#9ad6ff'
    ctx.fillText(segLabel, segX + 4, segY + 1)

    ctx.fillStyle = 'rgba(255, 152, 0, 0.14)'
  }

  for (const column of debug.columnVerticalItems ?? []) {
    for (const item of column) {
      const point = mapOffscreenPointToCanvas(
        expandedRegion,
        item,
        debug.offscreenWidth,
        debug.offscreenHeight,
        debug.boxPadding,
        debug.strokePadding,
        transform
      )
      ctx.fillStyle = item.kind === 'sideways-run'
        ? 'rgba(233, 30, 99, 0.95)'
        : item.kind === 'tate-chu-yoko'
          ? 'rgba(76, 175, 80, 0.95)'
          : 'rgba(255, 193, 7, 0.95)'
      ctx.fillRect(point.x - 2, point.y - 2, 4, 4)
    }
  }

  ctx.restore()
}
