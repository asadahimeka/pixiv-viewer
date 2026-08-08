/**
 * Geometry helpers for the typeset pipeline — TS→JS mechanical conversion.
 *
 * Source: ShinobuTranslator `src/pipeline/typeset/geometry.ts` (371 lines)
 *
 * This is the FULL typeset geometry module. The `pipeline/detect/geometry.js`
 * contains only the subset (minAreaRect/sortMiniBoxPoints) needed by ONNX
 * detection; both are independent and do not conflict.
 */

import { convexHull as convexHullImpl } from '../utils.js'

/** @typedef {import('../../types.js').QuadPoint} QuadPoint */
/** @typedef {import('../../types.js').TextRegion} TextRegion */

// ---------------------------------------------------------------------------
// Quad type
// ---------------------------------------------------------------------------

/**
 * @typedef {[QuadPoint, QuadPoint, QuadPoint, QuadPoint]} Quad
 */
export const Quad = {}

/**
 * Transform parameters returned by compositeRegion for rotated quads.
 * Debug overlay reuses these so the debug box scale always matches the
 * actual rendered text — no independent scale computation that can drift.
 *
 * @typedef {Object} CompositeTransform
 * @property {number} s — uniform scale factor
 * @property {number} cx — center x of the quad
 * @property {number} cy — center y of the quad
 * @property {number} angle — rotation angle in radians
 */
export const CompositeTransform = {}

// ---------------------------------------------------------------------------
// Convex hull re-export
// ---------------------------------------------------------------------------

export const convexHull = convexHullImpl

// ---------------------------------------------------------------------------
// Mini-box sorting & minimum-area rectangle
// ---------------------------------------------------------------------------

/**
 * Sort 4 convex hull points into clockwise quad order (TL, TR, BR, BL).
 *
 * @param {Array<QuadPoint>} points
 * @returns {Quad}
 */
export function sortMiniBoxPoints(points) {
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y)
  let index1 = 0
  let index2 = 1
  let index3 = 2
  let index4 = 3

  if (sorted[1].y > sorted[0].y) {
    index1 = 0
    index4 = 1
  } else {
    index1 = 1
    index4 = 0
  }
  if (sorted[3].y > sorted[2].y) {
    index2 = 2
    index3 = 3
  } else {
    index2 = 3
    index3 = 2
  }

  return [
    { x: sorted[index1].x, y: sorted[index1].y },
    { x: sorted[index2].x, y: sorted[index2].y },
    { x: sorted[index3].x, y: sorted[index3].y },
    { x: sorted[index4].x, y: sorted[index4].y },
  ]
}

/**
 * Compute the minimum-area rotated rectangle enclosing a set of points.
 * Returns the enclosing quad and its shortest side length.
 *
 * @param {Array<QuadPoint>} points
 * @returns {{ box: Quad, shortSide: number } | null}
 */
export function minAreaRect(points) {
  if (points.length === 0) {
    return null
  }

  const hull = convexHull(points)
  if (hull.length === 0) {
    return null
  }
  if (hull.length === 1) {
    const p = hull[0]
    /** @type {Quad} */
    const box = [
      { x: p.x, y: p.y },
      { x: p.x + 1, y: p.y },
      { x: p.x + 1, y: p.y + 1 },
      { x: p.x, y: p.y + 1 },
    ]
    return { box, shortSide: 1 }
  }

  let bestArea = Number.POSITIVE_INFINITY
  let bestWidth = 0
  let bestHeight = 0
  /** @type {Quad|null} */
  let bestBox = null

  for (let i = 0; i < hull.length; i += 1) {
    const a = hull[i]
    const b = hull[(i + 1) % hull.length]
    const edgeX = b.x - a.x
    const edgeY = b.y - a.y
    const edgeNorm = Math.hypot(edgeX, edgeY)
    if (edgeNorm <= 1e-6) {
      continue
    }

    const ux = edgeX / edgeNorm
    const uy = edgeY / edgeNorm
    const vx = -uy
    const vy = ux

    let minU = Number.POSITIVE_INFINITY
    let maxU = Number.NEGATIVE_INFINITY
    let minV = Number.POSITIVE_INFINITY
    let maxV = Number.NEGATIVE_INFINITY

    for (const point of hull) {
      const pu = point.x * ux + point.y * uy
      const pv = point.x * vx + point.y * vy
      minU = Math.min(minU, pu)
      maxU = Math.max(maxU, pu)
      minV = Math.min(minV, pv)
      maxV = Math.max(maxV, pv)
    }

    const width = maxU - minU
    const height = maxV - minV
    const area = width * height
    if (area >= bestArea) {
      continue
    }

    bestArea = area
    bestWidth = width
    bestHeight = height
    bestBox = sortMiniBoxPoints([
      { x: ux * minU + vx * minV, y: uy * minU + vy * minV },
      { x: ux * maxU + vx * minV, y: uy * maxU + vy * minV },
      { x: ux * maxU + vx * maxV, y: uy * maxU + vy * maxV },
      { x: ux * minU + vx * maxV, y: uy * minU + vy * maxV },
    ])
  }

  if (!bestBox) {
    return null
  }
  return {
    box: bestBox,
    shortSide: Math.min(bestWidth, bestHeight),
  }
}

// ---------------------------------------------------------------------------
// Quad helpers
// ---------------------------------------------------------------------------

/**
 * Compute rotation angle from quad's top edge.
 * Returns angle in radians.
 *
 * @param {Quad} quad
 * @returns {number}
 */
export function quadAngle(quad) {
  return Math.atan2(quad[1].y - quad[0].y, quad[1].x - quad[0].x)
}

/**
 * Compute the width and height of the quad (from its edges).
 *
 * @param {Quad} quad
 * @returns {{ width: number, height: number }}
 */
export function quadDimensions(quad) {
  const topW = Math.hypot(quad[1].x - quad[0].x, quad[1].y - quad[0].y)
  const botW = Math.hypot(quad[2].x - quad[3].x, quad[2].y - quad[3].y)
  const leftH = Math.hypot(quad[3].x - quad[0].x, quad[3].y - quad[0].y)
  const rightH = Math.hypot(quad[2].x - quad[1].x, quad[2].y - quad[1].y)
  return { width: (topW + botW) / 2, height: (leftH + rightH) / 2 }
}

/**
 * Deep-clone a quad.
 *
 * @param {Quad} quad
 * @returns {Quad}
 */
export function cloneQuad(quad) {
  return [
    { x: quad[0].x, y: quad[0].y },
    { x: quad[1].x, y: quad[1].y },
    { x: quad[2].x, y: quad[2].y },
    { x: quad[3].x, y: quad[3].y },
  ]
}

/**
 * Deep-clone a text region for typesetting (quad + source geometries).
 *
 * @param {TextRegion} region
 * @returns {TextRegion}
 */
export function cloneRegionForTypeset(region) {
  return {
    ...region,
    box: { ...region.box },
    quad: region.quad ? cloneQuad(region.quad) : undefined,
    sourceLineGeometries: region.sourceLineGeometries?.map(line => ({
      ...line,
      box: { ...line.box },
      quad: line.quad ? cloneQuad(line.quad) : undefined,
    })),
  }
}

/**
 * Convert a region's axis-aligned box to a quad.
 *
 * @param {TextRegion} region
 * @returns {Quad}
 */
export function boxToQuad(region) {
  const x0 = region.box.x
  const y0 = region.box.y
  const x1 = region.box.x + region.box.width
  const y1 = region.box.y + region.box.height
  return [
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: y1 },
    { x: x0, y: y1 },
  ]
}

/**
 * Get the quad for a region; falls back to box-derived quad if none set.
 *
 * @param {TextRegion} region
 * @returns {Quad}
 */
export function getRegionQuad(region) {
  if (region.quad) {
    return cloneQuad(region.quad)
  }
  return boxToQuad(region)
}

/**
 * Compute the centroid of a quad.
 *
 * @param {Quad} quad
 * @returns {{ x: number, y: number }}
 */
export function quadCenter(quad) {
  return {
    x: (quad[0].x + quad[1].x + quad[2].x + quad[3].x) / 4,
    y: (quad[0].y + quad[1].y + quad[2].y + quad[3].y) / 4,
  }
}

/**
 * Rotate a point around (cx, cy) by angle (radians).
 *
 * @param {QuadPoint} point
 * @param {number} cx
 * @param {number} cy
 * @param {number} angle
 * @returns {QuadPoint}
 */
export function rotatePoint(point, cx, cy, angle) {
  const dx = point.x - cx
  const dy = point.y - cy
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  return {
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos,
  }
}

/**
 * Rotate all four points of a quad.
 *
 * @param {Quad} quad
 * @param {number} cx
 * @param {number} cy
 * @param {number} angle
 * @returns {Quad}
 */
export function rotateQuad(quad, cx, cy, angle) {
  return [
    rotatePoint(quad[0], cx, cy, angle),
    rotatePoint(quad[1], cx, cy, angle),
    rotatePoint(quad[2], cx, cy, angle),
    rotatePoint(quad[3], cx, cy, angle),
  ]
}

/**
 * Compute axis-aligned bounding box of a quad.
 *
 * @param {Quad} quad
 * @returns {{ minX: number, minY: number, maxX: number, maxY: number }}
 */
export function quadBounds(quad) {
  const minX = Math.min(quad[0].x, quad[1].x, quad[2].x, quad[3].x)
  const minY = Math.min(quad[0].y, quad[1].y, quad[2].y, quad[3].y)
  const maxX = Math.max(quad[0].x, quad[1].x, quad[2].x, quad[3].x)
  const maxY = Math.max(quad[0].y, quad[1].y, quad[2].y, quad[3].y)
  return { minX, minY, maxX, maxY }
}

/**
 * Scale a quad relative to an origin point.
 *
 * @param {Quad} quad
 * @param {number} xfact
 * @param {number} yfact
 * @param {number} originX
 * @param {number} originY
 * @returns {Quad}
 */
export function scaleQuadFromOrigin(quad, xfact, yfact, originX, originY) {
  return [
    {
      x: originX + (quad[0].x - originX) * xfact,
      y: originY + (quad[0].y - originY) * yfact,
    },
    {
      x: originX + (quad[1].x - originX) * xfact,
      y: originY + (quad[1].y - originY) * yfact,
    },
    {
      x: originX + (quad[2].x - originX) * xfact,
      y: originY + (quad[2].y - originY) * yfact,
    },
    {
      x: originX + (quad[3].x - originX) * xfact,
      y: originY + (quad[3].y - originY) * yfact,
    },
  ]
}

/**
 * Update a region's quad and axis-aligned bounding box.
 *
 * @param {TextRegion} region
 * @param {Quad} quad
 * @returns {void}
 */
export function updateRegionGeometryFromQuad(region, quad) {
  const bounds = quadBounds(quad)
  const x = Math.floor(bounds.minX)
  const y = Math.floor(bounds.minY)
  const right = Math.ceil(bounds.maxX)
  const bottom = Math.ceil(bounds.maxY)
  region.quad = quad
  region.box = {
    x,
    y,
    width: Math.max(1, right - x),
    height: Math.max(1, bottom - y),
  }
}

// ---------------------------------------------------------------------------
// Offscreen-to-canvas coordinate mapping
// ---------------------------------------------------------------------------

/**
 * Map a point from offscreen (typeset) coordinates to canvas coordinates.
 *
 * @param {TextRegion} region
 * @param {QuadPoint} point
 * @param {number} offscreenWidth
 * @param {number} offscreenHeight
 * @param {number} boxPadding
 * @param {number} strokePadding
 * @param {CompositeTransform|null} [transform=null]
 * @returns {QuadPoint}
 */
export function mapOffscreenPointToCanvas(
  region,
  point,
  offscreenWidth,
  offscreenHeight,
  boxPadding,
  strokePadding,
  transform = null
) {
  const drawX = region.box.x + boxPadding - strokePadding
  const drawY = region.box.y + boxPadding - strokePadding
  const quad = region.quad
  if (!quad) {
    return { x: drawX + point.x, y: drawY + point.y }
  }

  if (!transform) {
    return { x: drawX + point.x, y: drawY + point.y }
  }

  const { s, cx, cy, angle } = transform
  const localX = (point.x - offscreenWidth / 2) * s
  const localY = (point.y - offscreenHeight / 2) * s
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  return {
    x: cx + localX * cos - localY * sin,
    y: cy + localX * sin + localY * cos,
  }
}

/**
 * Map an offscreen rect to a canvas-space quad (four corners).
 *
 * @param {TextRegion} region
 * @param {{ x: number, y: number, width: number, height: number }} box
 * @param {number} offscreenWidth
 * @param {number} offscreenHeight
 * @param {number} boxPadding
 * @param {number} strokePadding
 * @param {CompositeTransform|null} [transform=null]
 * @returns {Quad}
 */
export function mapOffscreenRectToCanvasQuad(
  region,
  box,
  offscreenWidth,
  offscreenHeight,
  boxPadding,
  strokePadding,
  transform = null
) {
  const p0 = mapOffscreenPointToCanvas(
    region,
    { x: box.x, y: box.y },
    offscreenWidth,
    offscreenHeight,
    boxPadding,
    strokePadding,
    transform
  )
  const p1 = mapOffscreenPointToCanvas(
    region,
    { x: box.x + box.width, y: box.y },
    offscreenWidth,
    offscreenHeight,
    boxPadding,
    strokePadding,
    transform
  )
  const p2 = mapOffscreenPointToCanvas(
    region,
    { x: box.x + box.width, y: box.y + box.height },
    offscreenWidth,
    offscreenHeight,
    boxPadding,
    strokePadding,
    transform
  )
  const p3 = mapOffscreenPointToCanvas(
    region,
    { x: box.x, y: box.y + box.height },
    offscreenWidth,
    offscreenHeight,
    boxPadding,
    strokePadding,
    transform
  )
  return [p0, p1, p2, p3]
}
