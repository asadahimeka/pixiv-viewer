/**
 * Horizontal text rendering (offscreen canvas).
 *
 * Source: ShinobuTranslator `src/pipeline/typeset/renderHorizontal.ts` (76 lines)
 * TS→JS mechanical conversion. Rendering logic preserved verbatim.
 */

import { strokeWidth } from './fontMetrics.js'
import { buildHorizontalGlyphPlacements } from './horizontalFit.js'
import { resolveHorizontalLetterSpacing } from './horizontalLayout.js'

/** @typedef {import('./horizontalFit.js').HorizontalGlyphPlacement} HorizontalGlyphPlacement */
/** @typedef {import('./horizontalFit.js').HorizontalLineBox} HorizontalLineBox */
/** @typedef {import('../../runtime/platform.js').PipelineCanvas} PipelineCanvas */
/** @typedef {import('../../runtime/platform.js').PipelineRenderingContext} PipelineRenderingContext */
/** @typedef {import('../../runtime/platform.js').PlatformProvider} PlatformProvider */
/** @typedef {import('./color.js').ResolvedColors} ResolvedColors */

/**
 * @param {PipelineRenderingContext} ctx
 * @param {readonly HorizontalGlyphPlacement[]} glyphs
 * @param {'stroke'|'fill'} mode
 */
function drawHorizontalGlyphLine(ctx, glyphs, mode) {
  for (const glyph of glyphs) {
    if (mode === 'stroke') {
      ctx.strokeText(glyph.ch, glyph.x, glyph.baselineY)
    } else {
      ctx.fillText(glyph.ch, glyph.x, glyph.baselineY)
    }
  }
}

/**
 * Render horizontal text onto an offscreen canvas with two-layer stroke.
 * Returns the offscreen canvas sized to fit the rendered text.
 *
 * @param {HorizontalLineBox[]} lines
 * @param {number} fontSize
 * @param {number} contentWidth
 * @param {number} contentHeight
 * @param {ResolvedColors} colors
 * @param {number} padding
 * @param {string} fontFamily
 * @param {number} [letterSpacingScale=1]
 * @param {PlatformProvider} [platform]
 * @param {readonly (readonly HorizontalGlyphPlacement[])[]} [glyphPlacements]
 * @returns {PipelineCanvas}
 */
export function renderHorizontal(
  lines,
  fontSize,
  contentWidth,
  contentHeight,
  colors,
  padding,
  fontFamily,
  letterSpacingScale = 1,
  platform,
  glyphPlacements
) {
  const sw = strokeWidth(fontSize)

  const canvasW = Math.ceil(contentWidth + padding * 2)
  const canvasH = Math.ceil(contentHeight + padding * 2)

  const off = platform.createCanvas(canvasW, canvasH)
  const ctx = off.getContext('2d')

  ctx.font = `${fontSize}px ${fontFamily}`
  ctx.textBaseline = 'alphabetic'
  const renderGlyphs = glyphPlacements ?? buildHorizontalGlyphPlacements(
    ctx,
    lines,
    resolveHorizontalLetterSpacing(fontSize, letterSpacingScale)
  )

  // Pass 1: stroke (background color)
  ctx.lineWidth = sw * 2
  ctx.strokeStyle = colors.bg
  ctx.lineJoin = 'round'
  ctx.miterLimit = 2

  for (const line of renderGlyphs) {
    drawHorizontalGlyphLine(ctx, line, 'stroke')
  }

  // Pass 2: fill (foreground color)
  ctx.fillStyle = colors.fg
  for (const line of renderGlyphs) {
    drawHorizontalGlyphLine(ctx, line, 'fill')
  }

  return off
}
