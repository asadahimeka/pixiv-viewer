/**
 * @file Minimal geometry helpers needed by the ONNX detection path.
 *
 * Extracted from ShinobuTranslator `src/pipeline/typeset/geometry.ts`:
 * only `minAreaRect` and `sortMiniBoxPoints` are kept — these are the two
 * functions that `onnxDetect.js` depends on. The rest of the typeset geometry
 * module (quadAngle, cloneRegionForTypeset, etc.) is unused by detect and
 * will be ported separately when the typeset pipeline is migrated.
 *
 * Mechanically converted (TS → JS): Quad type → JSDoc @typedef.
 */

import { convexHull } from '../utils.js'

// ---------------------------------------------------------------------------
// Types — JSDoc @typedef + placeholder export
// ---------------------------------------------------------------------------

/** @typedef {import('../../types.js').QuadPoint} QuadPoint */

/**
 * @typedef {[QuadPoint, QuadPoint, QuadPoint, QuadPoint]} Quad
 */
export const Quad = {}

// ---------------------------------------------------------------------------
// Mini-box sorting
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

// ---------------------------------------------------------------------------
// Minimum-area rotated rectangle (Rotating Calipers)
// ---------------------------------------------------------------------------

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
