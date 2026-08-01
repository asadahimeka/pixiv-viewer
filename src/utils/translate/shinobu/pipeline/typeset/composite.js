/**
 * @file Composite (render to main canvas) — TS→JS mechanical conversion.
 *
 * Source: ShinobuTranslator `src/pipeline/typeset/composite.ts` (67 lines)
 */

import { quadAngle, quadDimensions } from './geometry.js'

/** @typedef {import('../../types.js').TextRegion} TextRegion */
/** @typedef {import('../../runtime/platform.js').PipelineCanvas} PipelineCanvas */
/** @typedef {import('../../runtime/platform.js').PipelineRenderingContext} PipelineRenderingContext */
/** @typedef {import('./geometry.js').CompositeTransform} CompositeTransform */

/**
 * Composite the offscreen text canvas back onto the main image canvas.
 *
 * For non-rotated quads this is a simple drawImage.
 * For rotated quads (>0.052 rad) an affine transform (translate + rotate + scale)
 * is applied so the text follows the original text region's rotation.
 *
 * @param {PipelineRenderingContext} mainCtx — target canvas 2D context
 * @param {PipelineCanvas} offCanvas — offscreen canvas with rendered text
 * @param {TextRegion} region — target text region
 * @param {number} boxPadding — padding added around the region box
 * @param {number} strokePadding — padding reserved for text stroke
 * @param {number} [contentOffsetX=0] — horizontal content offset
 * @param {number} [contentOffsetY=0] — vertical content offset
 * @returns {CompositeTransform|null} — transform info (null if non-rotated)
 */
export function compositeRegion(
  mainCtx,
  offCanvas,
  region,
  boxPadding,
  strokePadding,
  contentOffsetX = 0,
  contentOffsetY = 0
) {
  const drawX = region.box.x + boxPadding - strokePadding - contentOffsetX
  const drawY = region.box.y + boxPadding - strokePadding - contentOffsetY

  const quad = region.quad
  if (!quad) {
    mainCtx.drawImage(offCanvas, drawX, drawY)
    return null
  }

  const angle = quadAngle(quad)
  const isRotated = Math.abs(angle) > 0.052

  if (!isRotated) {
    mainCtx.drawImage(offCanvas, drawX, drawY)
    return null
  }

  // Rotated quad — affine transform
  const { width: qw, height: qh } = quadDimensions(quad)

  // Center of the quad
  const cx = (quad[0].x + quad[1].x + quad[2].x + quad[3].x) / 4
  const cy = (quad[0].y + quad[1].y + quad[2].y + quad[3].y) / 4

  // Uniform scale to preserve character aspect ratio.
  // Use content-area dimensions (offCanvas minus padding) as the scaling
  // denominator so that the rendered text maps 1:1 to the quad, not the
  // padded offscreen canvas.  The old formula (qw / offCanvas.width)
  // included strokePadding in the denominator but not in qw, causing
  // s < 1 and shrinking text — especially for narrow vertical columns
  // where strokePadding is a large fraction of quad width.
  const contentW = offCanvas.width - boxPadding * 2 - strokePadding * 2
  const contentH = offCanvas.height - boxPadding * 2 - strokePadding * 2
  const sx = qw / Math.max(1, contentW)
  const sy = qh / Math.max(1, contentH)
  const s = Math.min(sx, sy)

  mainCtx.save()
  mainCtx.translate(cx, cy)
  mainCtx.rotate(angle)
  mainCtx.scale(s, s)
  mainCtx.drawImage(
    offCanvas,
    -offCanvas.width / 2,
    -offCanvas.height / 2
  )
  mainCtx.restore()

  return { s, cx, cy, angle }
}
