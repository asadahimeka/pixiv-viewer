/**
 * Vertical text rendering (offscreen canvas).
 *
 * Source: ShinobuTranslator `src/pipeline/typeset/renderVertical.ts` (138 lines)
 * TS→JS mechanical conversion. Rendering logic preserved verbatim.
 */

import {
  resolveVerticalColumnPositions,
  resolveVerticalStartY,
} from './verticalFit.js'
import { strokeWidth } from './fontMetrics.js'

/** @typedef {import('./verticalFit.js').VColumn} VColumn */
/** @typedef {import('./verticalFit.js').VerticalColumnAnchor} VerticalColumnAnchor */
/** @typedef {import('./fontMetrics.js').VerticalCellMetrics} VerticalCellMetrics */
/** @typedef {import('./fontMetrics.js').VerticalGlyph} VerticalGlyph */
/** @typedef {import('../../runtime/platform.js').PipelineCanvas} PipelineCanvas */
/** @typedef {import('../../runtime/platform.js').PipelineRenderingContext} PipelineRenderingContext */
/** @typedef {import('../../runtime/platform.js').PlatformProvider} PlatformProvider */
/** @typedef {import('./color.js').ResolvedColors} ResolvedColors */

/**
 * @param {PipelineRenderingContext} ctx
 * @param {VerticalGlyph} glyph
 * @param {number} centerX
 * @param {number} centerY
 * @param {number} fontSize
 * @param {'stroke'|'fill'} pass
 */
function renderVerticalGlyph(ctx, glyph, centerX, centerY, fontSize, pass) {
  const draw = (x = 0, y = 0) => {
    if (pass === 'stroke') {
      ctx.strokeText(glyph.ch, x, y)
    } else {
      ctx.fillText(glyph.ch, x, y)
    }
  }

  ctx.save()
  ctx.translate(centerX, centerY)
  if (glyph.kind === 'sideways-run') {
    ctx.rotate(Math.PI / 2)
    ctx.scale(glyph.renderInlineScale, glyph.renderCrossScale)
    draw(glyph.renderOffsetX, glyph.renderOffsetY)
  } else if (glyph.kind === 'tate-chu-yoko') {
    const measuredWidth = Math.max(1, ctx.measureText(glyph.ch).width)
    const scaleX = Math.min(1, fontSize * 0.9 / measuredWidth)
    ctx.scale(scaleX, 1)
    draw(glyph.renderOffsetX)
  } else {
    draw(glyph.renderOffsetX)
  }
  ctx.restore()
}

/**
 * @param {VColumn[]} columns
 * @param {number} fontSize
 * @param {number} contentWidth
 * @param {number} contentHeight
 * @param {ResolvedColors} colors
 * @param {'left'|'center'|'right'} alignment
 * @param {VerticalCellMetrics} metrics
 * @param {number} padding
 * @param {string} fontFamily
 * @param {readonly number[]} [columnStartOffsets]
 * @param {VerticalColumnAnchor} [columnAnchor]
 * @param {PlatformProvider} [platform]
 * @returns {PipelineCanvas}
 */
export function renderVertical(
  columns,
  fontSize,
  contentWidth,
  contentHeight,
  colors,
  alignment,
  metrics,
  padding,
  fontFamily,
  columnStartOffsets,
  columnAnchor,
  platform
) {
  const sw = strokeWidth(fontSize)

  const canvasW = Math.ceil(contentWidth + padding * 2)
  const canvasH = Math.ceil(contentHeight + padding * 2)

  const off = platform.createCanvas(canvasW, canvasH)
  const ctx = off.getContext('2d')

  ctx.font = `${fontSize}px ${fontFamily}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const positions = resolveVerticalColumnPositions(columns.length, contentWidth, metrics, padding, columnAnchor)

  // Pass 1: stroke
  ctx.lineWidth = sw * 2
  ctx.strokeStyle = colors.bg
  ctx.lineJoin = 'round'
  ctx.miterLimit = 2

  for (let c = 0; c < columns.length; c++) {
    const col = columns[c]
    const cx = positions.centers[c]

    const startY = resolveVerticalStartY(
      contentHeight,
      col.height,
      alignment,
      padding,
      columnStartOffsets?.[c]
    )

    let penY = startY
    for (const glyph of col.glyphs) {
      renderVerticalGlyph(ctx, glyph, cx, penY + glyph.advanceY / 2, fontSize, 'stroke')
      penY += glyph.advanceY
    }
  }

  // Pass 2: fill
  ctx.fillStyle = colors.fg
  for (let c = 0; c < columns.length; c++) {
    const col = columns[c]
    const cx = positions.centers[c]

    const startY = resolveVerticalStartY(
      contentHeight,
      col.height,
      alignment,
      padding,
      columnStartOffsets?.[c]
    )

    let penY = startY
    for (const glyph of col.glyphs) {
      renderVerticalGlyph(ctx, glyph, cx, penY + glyph.advanceY / 2, fontSize, 'fill')
      penY += glyph.advanceY
    }
  }

  return off
}

// ---------------------------------------------------------------------------
// Quad / rotation compositing
// ---------------------------------------------------------------------------

/**
 * Composite an offscreen-rendered text canvas onto the main canvas,
 * applying affine transform for rotation if the region has a rotated quad.
 */
