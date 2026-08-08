/**
 * @fileoverview Merge predicates, MST splitting, internal quad types, direction voting,
 * and all predicate/matching functions for textline merge.
 *
 * @typedef {import('../../types.js').TextRegion} TextRegion
 * @typedef {import('../../types.js').TextDirection} TextDirection
 */

import { polygonArea, convexHullArea, UnionFind } from '../utils.js'

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

/**
 * @typedef {{x: number, y: number}} Point2D
 */

/**
 * @typedef {Object} InternalQuad
 * @property {[Point2D, Point2D, Point2D, Point2D]} pts - Sorted quad points: TL, TR, BR, BL
 * @property {TextDirection} direction
 * @property {string} text
 * @property {number} prob
 * @property {[number, number, number]} fgColor
 * @property {[number, number, number]} bgColor
 * @property {[Point2D, Point2D, Point2D, Point2D]} structure - Four edge midpoints: top-mid, bottom-mid, right-mid, left-mid
 * @property {number} fontSize - min(||structure vec v||, ||structure vec h||)
 * @property {number} aspectRatio - ||h_vec|| / ||v_vec||
 * @property {number} angle - angle of the vertical structure vector relative to x-axis
 * @property {number} cosAngle
 * @property {Point2D} centroid
 * @property {number} area
 * @property {boolean} isApproximateAxisAligned
 * @property {number} originalIndex - Original region index (bookkeeping only)
 */

/**
 * @typedef {Object} MergedGroup
 * @property {InternalQuad[]} quads
 * @property {[number, number, number]} fgColor
 * @property {[number, number, number]} bgColor
 */

/**
 * @typedef {{u: number, v: number, weight: number}} WeightedEdge
 */

// ---------------------------------------------------------------------------
// Geometry utilities
// ---------------------------------------------------------------------------

/**
 * @param {Point2D} v
 * @returns {number}
 */
function vec2Norm(v) {
  return Math.hypot(v.x, v.y)
}

/**
 * @param {Point2D} a
 * @param {Point2D} b
 * @returns {Point2D}
 */
function vec2Sub(a, b) {
  return { x: a.x - b.x, y: a.y - b.y }
}

/**
 * @param {Point2D} a
 * @param {Point2D} b
 * @returns {number}
 */
function vec2Dot(a, b) {
  return a.x * b.x + a.y * b.y
}

/**
 * Sort 4 quad points following the reference sort_pnts logic.
 * Returns [sorted_pts, is_vertical].
 *
 * The longer structure vector (mean of the two long-side vectors) determines
 * whether the quad is vertical or horizontal.
 *
 * @param {Point2D[]} pts
 * @returns {{sorted: [Point2D, Point2D, Point2D, Point2D], isVertical: boolean}}
 */
function sortPoints(pts) {
  if (pts.length !== 4) {
    throw new Error('sortPoints 需要正好 4 个点')
  }

  // Compute all 16 pairwise vectors and their norms
  /** @type {number[]} */
  const pairwiseNorms = []
  /** @type {Point2D[]} */
  const pairwiseVecs = []
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const v = vec2Sub(pts[i], pts[j])
      pairwiseVecs.push(v)
      pairwiseNorms.push(vec2Norm(v))
    }
  }

  // Find the two longest sides (indices 8 and 10 in argsort of norms)
  const indices = Array.from({ length: 16 }, (_, i) => i)
  indices.sort((a, b) => pairwiseNorms[a] - pairwiseNorms[b])
  const longSideIds = [indices[8], indices[10]]

  const lv0 = pairwiseVecs[longSideIds[0]]
  /** @type {Point2D} */
  let lv1 = pairwiseVecs[longSideIds[1]]

  // Make sure both long-side vectors point roughly the same direction
  if (vec2Dot(lv0, lv1) < 0) {
    lv1 = { x: -lv1.x, y: -lv1.y }
  }

  const strucVec = { x: Math.abs((lv0.x + lv1.x) / 2), y: Math.abs((lv0.y + lv1.y) / 2) }
  const isVertical = strucVec.x <= strucVec.y

  // Copy points for sorting
  const p = pts.map(pt => ({ x: pt.x, y: pt.y }))

  if (isVertical) {
    // Sort by y ascending
    p.sort((a, b) => a.y - b.y)
    // Top two: sort by x ascending
    const top = p.slice(0, 2).sort((a, b) => a.x - b.x)
    // Bottom two: sort by x descending
    const bot = p.slice(2, 4).sort((a, b) => b.x - a.x)
    return {
      sorted: [top[0], top[1], bot[0], bot[1]],
      isVertical: true,
    }
  } else {
    // Sort by x ascending
    p.sort((a, b) => a.x - b.x)
    const left = [p[0], p[1]].sort((a, b) => a.y - b.y)
    const right = [p[2], p[3]].sort((a, b) => a.y - b.y)
    return {
      sorted: [left[0], right[0], right[1], left[1]],
      isVertical: false,
    }
  }
}

/**
 * Distance from point p to line segment (a, b).
 * @param {Point2D} p
 * @param {Point2D} a
 * @param {Point2D} b
 * @returns {number}
 */
function pointToSegmentDist(p, a, b) {
  const abx = b.x - a.x
  const aby = b.y - a.y
  const apx = p.x - a.x
  const apy = p.y - a.y
  const denom = abx * abx + aby * aby
  if (denom <= 1e-10) {
    return Math.hypot(p.x - a.x, p.y - a.y)
  }
  const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / denom))
  return Math.hypot(p.x - (a.x + t * abx), p.y - (a.y + t * aby))
}

/**
 * Minimum distance between two convex polygons (edge-vertex approach).
 * @param {Point2D[]} polyA
 * @param {Point2D[]} polyB
 * @returns {number}
 */
function polygonMinDistance(polyA, polyB) {
  let best = Number.POSITIVE_INFINITY
  const edgeDist = (poly1, poly2) => {
    const n = poly1.length
    const m = poly2.length
    for (let i = 0; i < n; i++) {
      const a = poly1[i]
      const b = poly1[(i + 1) % n]
      for (let j = 0; j < m; j++) {
        best = Math.min(best, pointToSegmentDist(poly2[j], a, b))
      }
    }
  }
  edgeDist(polyA, polyB)
  edgeDist(polyB, polyA)
  return best
}

/**
 * Euclidean distance between two points.
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @returns {number}
 */
function dist(x1, y1, x2, y2) {
  return Math.hypot(x1 - x2, y1 - y2)
}

// ---------------------------------------------------------------------------
// InternalQuad construction — aligned with Quadrilateral class
// ---------------------------------------------------------------------------

/**
 * @param {[Point2D, Point2D, Point2D, Point2D]} pts
 * @returns {[Point2D, Point2D, Point2D, Point2D]}
 */
function computeStructure(pts) {
  const p1 = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 } // top-mid
  const p2 = { x: (pts[2].x + pts[3].x) / 2, y: (pts[2].y + pts[3].y) / 2 } // bottom-mid
  const p3 = { x: (pts[1].x + pts[2].x) / 2, y: (pts[1].y + pts[2].y) / 2 } // right-mid
  const p4 = { x: (pts[3].x + pts[0].x) / 2, y: (pts[3].y + pts[0].y) / 2 } // left-mid
  return [p1, p2, p3, p4]
}

/**
 * @param {[Point2D, Point2D, Point2D, Point2D]} pts
 * @returns {{x: number, y: number, w: number, h: number}}
 */
function quadBbox(pts) {
  const xs = pts.map(p => p.x)
  const ys = pts.map(p => p.y)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  return { x: minX, y: minY, w: Math.max(...xs) - minX, h: Math.max(...ys) - minY }
}

/**
 * @param {TextRegion} region
 * @param {number} index
 * @returns {InternalQuad}
 */
export function buildInternalQuad(region, index) {
  // Get quad points from region
  /** @type {Point2D[]} */
  const rawPts = region.quad
    ? region.quad.map(p => ({ x: p.x, y: p.y }))
    : [
        { x: region.box.x, y: region.box.y },
        { x: region.box.x + region.box.width, y: region.box.y },
        { x: region.box.x + region.box.width, y: region.box.y + region.box.height },
        { x: region.box.x, y: region.box.y + region.box.height },
      ]

  const { sorted: pts, isVertical } = sortPoints(rawPts)
  /** @type {TextDirection} */
  const direction = isVertical ? 'v' : 'h'

  const structure = computeStructure(pts)
  const [p1, p2, p3, p4] = structure

  // v1 = p2 - p1 (vertical structure vector)
  const v1 = vec2Sub(p2, p1)
  // v2 = p3 - p4 (horizontal structure vector)
  const v2 = vec2Sub(p3, p4)

  const normV = vec2Norm(v1)
  const normH = vec2Norm(v2)

  const fontSize = Math.min(normV, normH)
  const aspectRatio = normV > 1e-6 ? normH / normV : 1

  // cosAngle: dot(v1 / ||v1||, [1, 0])
  const cosAngle = normV > 1e-6 ? v1.x / normV : 0
  const angle = ((Math.acos(Math.max(-1, Math.min(1, cosAngle))) + Math.PI) % Math.PI)

  const centroid = {
    x: (pts[0].x + pts[1].x + pts[2].x + pts[3].x) / 4,
    y: (pts[0].y + pts[1].y + pts[2].y + pts[3].y) / 4,
  }

  // Polygon area via shoelace
  const area = polygonArea(pts)

  // isApproximateAxisAligned: check if v1 or v2 is nearly axis-aligned
  const e1 = { x: 0, y: 1 }
  const e2 = { x: 1, y: 0 }
  const uv1 = normV > 1e-6 ? { x: v1.x / normV, y: v1.y / normV } : { x: 0, y: 0 }
  const uv2 = normH > 1e-6 ? { x: v2.x / normH, y: v2.y / normH } : { x: 0, y: 0 }
  const isApproximateAxisAligned =
    Math.abs(vec2Dot(uv1, e1)) < 0.05 ||
    Math.abs(vec2Dot(uv1, e2)) < 0.05 ||
    Math.abs(vec2Dot(uv2, e1)) < 0.05 ||
    Math.abs(vec2Dot(uv2, e2)) < 0.05

  return {
    pts,
    direction: region.direction ?? direction,
    text: region.sourceText,
    prob: region.prob ?? 1,
    fgColor: region.fgColor ?? [0, 0, 0],
    bgColor: region.bgColor ?? [255, 255, 255],
    structure,
    fontSize,
    aspectRatio,
    angle,
    cosAngle,
    centroid,
    area,
    isApproximateAxisAligned,
    originalIndex: index,
  }
}

// ---------------------------------------------------------------------------
// Polygon distance for InternalQuad — replaces Shapely Polygon().distance()
// ---------------------------------------------------------------------------

/**
 * @param {InternalQuad} a
 * @param {InternalQuad} b
 * @returns {number}
 */
function quadPolyDistance(a, b) {
  return polygonMinDistance(
    [a.pts[0], a.pts[1], a.pts[2], a.pts[3]],
    [b.pts[0], b.pts[1], b.pts[2], b.pts[3]]
  )
}

// ---------------------------------------------------------------------------
// Direction-aware distance — aligned with Quadrilateral.distance()
//
// NOTE: In the reference, assigned_direction is set during OCR region warping.
// In textline_merge, it may be unset (None), which causes the code to fall
// through to the 'v_top' branch. We replicate this: default to "v" when
// direction is uncertain.
// ---------------------------------------------------------------------------

/**
 * @param {InternalQuad} a
 * @param {InternalQuad} b
 * @param {number} [rho=0.5]
 * @returns {number}
 */
function quadDirectionalDistance(a, b, rho) {
  const dir = a.direction // may be "h" or "v"
  const fs = Math.max(a.fontSize, b.fontSize)

  if (dir === 'h') {
    // Compute three candidate distances and pick the best alignment pattern
    const poly1Area = convexHullArea([a.pts[0], a.pts[3], b.pts[0], b.pts[3]])
    const poly2Area = convexHullArea([a.pts[2], a.pts[1], b.pts[2], b.pts[1]])
    const poly3Area = convexHullArea([a.structure[0], a.structure[1], b.structure[0], b.structure[1]])
    const dist1 = poly1Area / Math.max(1, fs)
    const dist2 = poly2Area / Math.max(1, fs)
    const dist3 = poly3Area / Math.max(1, fs)

    let pattern = 'h_left'
    if (dist1 < fs * rho) {
      pattern = 'h_left'
    }
    if (dist2 < fs * rho && dist2 < dist1) {
      pattern = 'h_right'
    }
    if (dist3 < fs * rho && dist3 < dist1 && dist3 < dist2) {
      pattern = 'h_middle'
    }

    if (pattern === 'h_left') {
      return dist(a.pts[0].x, a.pts[0].y, b.pts[0].x, b.pts[0].y)
    } else if (pattern === 'h_right') {
      return dist(a.pts[1].x, a.pts[1].y, b.pts[1].x, b.pts[1].y)
    } else {
      return dist(a.structure[0].x, a.structure[0].y, b.structure[0].x, b.structure[0].y)
    }
  } else {
    // "v" or default
    const poly1Area = convexHullArea([a.pts[0], a.pts[1], b.pts[0], b.pts[1]])
    const poly2Area = convexHullArea([a.pts[2], a.pts[3], b.pts[2], b.pts[3]])
    const dist1 = poly1Area / Math.max(1, fs)
    const dist2 = poly2Area / Math.max(1, fs)

    let pattern = 'v_top'
    if (dist1 < fs * rho) {
      pattern = 'v_top'
    }
    if (dist2 < fs * rho && dist2 < dist1) {
      pattern = 'v_bottom'
    }

    if (pattern === 'v_top') {
      return dist(a.pts[0].x, a.pts[0].y, b.pts[0].x, b.pts[0].y)
    } else {
      return dist(a.pts[2].x, a.pts[2].y, b.pts[2].x, b.pts[2].y)
    }
  }
}

// ---------------------------------------------------------------------------
// Merge predicate — aligned with quadrilateral_can_merge_region()
// ---------------------------------------------------------------------------

/**
 * @param {InternalQuad} a
 * @param {InternalQuad} b
 * @param {Object} [opts]
 * @param {number} [opts.ratio=1.9]
 * @param {number} [opts.discardConnectionGap=2]
 * @param {number} [opts.charGapTolerance=0.6]
 * @param {number} [opts.charGapTolerance2=1.5]
 * @param {number} [opts.fontSizeRatioTol=1.5]
 * @param {number} [opts.aspectRatioTol=2]
 * @returns {boolean}
 */
export function canMergeRegion(a, b, opts) {
  const {
    ratio = 1.9,
    discardConnectionGap = 2,
    charGapTolerance = 0.6,
    charGapTolerance2 = 1.5,
    fontSizeRatioTol = 1.5,
    aspectRatioTol = 2,
  } = opts || {}

  const charSize = Math.min(a.fontSize, b.fontSize)

  // Polygon distance (replaces Shapely Polygon.distance)
  const polyDist = quadPolyDistance(a, b)
  if (polyDist > discardConnectionGap * charSize) {
    return false
  }

  if (Math.max(a.fontSize, b.fontSize) / Math.max(1e-6, charSize) > fontSizeRatioTol) {
    return false
  }

  // Aspect ratio compatibility check
  if (a.aspectRatio > aspectRatioTol && b.aspectRatio < 1 / aspectRatioTol) {
    return false
  }
  if (b.aspectRatio > aspectRatioTol && a.aspectRatio < 1 / aspectRatioTol) {
    return false
  }

  const aAA = a.isApproximateAxisAligned
  const bAA = b.isApproximateAxisAligned

  if (aAA && bAA) {
    const bb1 = quadBbox(a.pts)
    const bb2 = quadBbox(b.pts)
    const { x: x1, y: y1, w: w1, h: h1 } = bb1
    const { x: x2, y: y2, w: w2, h: h2 } = bb2

    if (polyDist < charSize * charGapTolerance) {
      if (Math.abs(x1 + w1 / 2 - (x2 + w2 / 2)) < charGapTolerance2) {
        return true
      }
      if (w1 > h1 * ratio && h2 > w2 * ratio) {
        return false
      }
      if (w2 > h2 * ratio && h1 > w1 * ratio) {
        return false
      }
      if (w1 > h1 * ratio || w2 > h2 * ratio) {
        // horizontal
        return (
          Math.abs(x1 - x2) < charSize * charGapTolerance2 ||
          Math.abs(x1 + w1 - (x2 + w2)) < charSize * charGapTolerance2
        )
      } else if (h1 > w1 * ratio || h2 > w2 * ratio) {
        // vertical
        return (
          Math.abs(y1 - y2) < charSize * charGapTolerance2 ||
          Math.abs(y1 + h1 - (y2 + h2)) < charSize * charGapTolerance2
        )
      }
      return false
    } else {
      return false
    }
  }

  // Non-axis-aligned (or mixed) — angle-based check
  if (Math.abs(a.angle - b.angle) < (15 * Math.PI) / 180) {
    const fs = Math.min(a.fontSize, b.fontSize)
    if (quadPolyDistance(a, b) > fs * charGapTolerance2) {
      return false
    }
    if (Math.abs(a.fontSize - b.fontSize) / Math.max(1e-6, fs) > 0.25) {
      return false
    }
    return true
  }

  return false
}

// ---------------------------------------------------------------------------
// Graph utilities — replaces NetworkX
// ---------------------------------------------------------------------------

/**
 * @param {number} n
 * @param {[number, number][]} edges
 * @returns {Set<number>[]}
 */
function findConnectedComponents(n, edges) {
  const uf = new UnionFind(n)
  for (const [u, v] of edges) {
    uf.union(u, v)
  }
  /** @type {Map<number, Set<number>>} */
  const groups = new Map()
  for (let i = 0; i < n; i++) {
    const root = uf.find(i)
    if (!groups.has(root)) {
      groups.set(root, new Set())
    }
    groups.get(root).add(i)
  }
  return Array.from(groups.values())
}

/**
 * Kruskal MST on a subset of nodes. Returns edges sorted by weight ascending.
 * @param {number[]} nodeIndices
 * @param {function(number, number): number} weightFn
 * @returns {WeightedEdge[]}
 */
function kruskalMST(nodeIndices, weightFn) {
  // Build all edges among node indices
  /** @type {WeightedEdge[]} */
  const edges = []
  for (let i = 0; i < nodeIndices.length; i++) {
    for (let j = i + 1; j < nodeIndices.length; j++) {
      edges.push({ u: nodeIndices[i], v: nodeIndices[j], weight: weightFn(nodeIndices[i], nodeIndices[j]) })
    }
  }
  edges.sort((a, b) => a.weight - b.weight)

  // Map node indices to contiguous 0..n-1
  /** @type {Map<number, number>} */
  const indexMap = new Map()
  nodeIndices.forEach((idx, i) => indexMap.set(idx, i))

  const uf = new UnionFind(nodeIndices.length)
  /** @type {WeightedEdge[]} */
  const mstEdges = []

  for (const edge of edges) {
    const mu = indexMap.get(edge.u)
    const mv = indexMap.get(edge.v)
    if (uf.find(mu) !== uf.find(mv)) {
      uf.union(mu, mv)
      mstEdges.push(edge)
    }
  }

  return mstEdges
}

// ---------------------------------------------------------------------------
// splitTextRegion — aligned with split_text_region()
// ---------------------------------------------------------------------------

/**
 * @param {InternalQuad[]} quads
 * @param {number[]} regionIndices
 * @param {number} _width
 * @param {number} _height
 * @param {number} [gamma=0.5]
 * @param {number} [sigma=2]
 * @returns {number[][]}
 */
export function splitTextRegion(quads, regionIndices, _width, _height, gamma, sigma) {
  const g = gamma ?? 0.5
  const s = sigma ?? 2

  // Case 1: single element
  if (regionIndices.length === 1) {
    return [regionIndices]
  }

  // Case 2: two elements
  if (regionIndices.length === 2) {
    const idx0 = regionIndices[0]
    const idx1 = regionIndices[1]
    const fs = Math.max(quads[idx0].fontSize, quads[idx1].fontSize)
    const d = quadDirectionalDistance(quads[idx0], quads[idx1])
    const angleDiff = Math.abs(quads[idx0].angle - quads[idx1].angle)
    if (d < (1 + g) * fs && angleDiff < 0.2 * Math.PI) {
      return [regionIndices]
    } else {
      return [[idx0], [idx1]]
    }
  }

  // Case 3: three or more — use MST
  const mstEdges = kruskalMST(regionIndices, (u, v) => quadDirectionalDistance(quads[u], quads[v]))

  // Sort MST edges by weight descending
  const edgesSorted = [...mstEdges].sort((a, b) => b.weight - a.weight)
  const distances = edgesSorted.map(e => e.weight)

  const fontsize = regionIndices.reduce((sum, idx) => sum + quads[idx].fontSize, 0) / regionIndices.length
  const mean = distances.reduce((sum, d) => sum + d, 0) / distances.length
  const stdVal = Math.sqrt(distances.reduce((sum, d) => sum + (d - mean) * (d - mean), 0) / distances.length)
  const stdThreshold = Math.max(0.3 * fontsize + 5, 5)

  // Polygon distance and centroid alignment for the largest-distance edge pair
  const b1 = quads[edgesSorted[0].u]
  const b2 = quads[edgesSorted[0].v]
  const maxPolyDistance = quadPolyDistance(b1, b2)
  const maxCentroidAlignment = Math.min(
    Math.abs(b1.centroid.x - b2.centroid.x),
    Math.abs(b1.centroid.y - b2.centroid.y)
  )

  const shouldKeep =
    (distances[0] <= mean + stdVal * s || distances[0] <= fontsize * (1 + g)) &&
    (stdVal < stdThreshold || (maxPolyDistance === 0 && maxCentroidAlignment < 5))

  if (shouldKeep) {
    return [regionIndices]
  } else {
    // Remove the largest edge and find connected components of remaining MST
    const remainingEdges = edgesSorted.slice(1)
    const subComponents = findConnectedComponents(
      quads.length,
      remainingEdges.map(e => [e.u, e.v])
    )

    // Only keep components that contain nodes from our regionIndices
    const regionSet = new Set(regionIndices)
    /** @type {number[][]} */
    const result = []
    for (const comp of subComponents) {
      const relevant = Array.from(comp).filter(n => regionSet.has(n))
      if (relevant.length > 0) {
        result.push(...splitTextRegion(quads, relevant, _width, _height, g, s))
      }
    }
    return result
  }
}

// ---------------------------------------------------------------------------
// mergeTextRegions — aligned with merge_bboxes_text_region()
// ---------------------------------------------------------------------------

/**
 * @param {InternalQuad[]} quads
 * @param {number} width
 * @param {number} height
 * @returns {MergedGroup[]}
 */
export function mergeTextRegions(quads, width, height) {
  const n = quads.length
  if (n === 0) {
    return []
  }

  // Step 1: build graph — edges where canMergeRegion is true
  /** @type {[number, number][]} */
  const edges = []
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (
        canMergeRegion(quads[i], quads[j], {
          aspectRatioTol: 1.3,
          fontSizeRatioTol: 2,
          charGapTolerance: 1,
          charGapTolerance2: 3,
        })
      ) {
        edges.push([i, j])
      }
    }
  }

  // Step 2: find connected components
  const components = findConnectedComponents(n, edges)

  // Step 3: split each component using MST analysis
  /** @type {number[][]} */
  const regionGroups = []
  for (const comp of components) {
    const indices = Array.from(comp)
    regionGroups.push(...splitTextRegion(quads, indices, width, height))
  }

  // Step 4: post-process each group
  /** @type {MergedGroup[]} */
  const results = []
  for (const group of regionGroups) {
    if (group.length === 0) {
      continue
    }

    const txtlns = group.map(i => quads[i])

    // Average fg/bg colors
    const fgR = Math.round(txtlns.reduce((s, q) => s + q.fgColor[0], 0) / txtlns.length)
    const fgG = Math.round(txtlns.reduce((s, q) => s + q.fgColor[1], 0) / txtlns.length)
    const fgB = Math.round(txtlns.reduce((s, q) => s + q.fgColor[2], 0) / txtlns.length)
    const bgR = Math.round(txtlns.reduce((s, q) => s + q.bgColor[0], 0) / txtlns.length)
    const bgG = Math.round(txtlns.reduce((s, q) => s + q.bgColor[1], 0) / txtlns.length)
    const bgB = Math.round(txtlns.reduce((s, q) => s + q.bgColor[2], 0) / txtlns.length)

    // Majority vote for direction
    let hCount = 0
    let vCount = 0
    for (const q of txtlns) {
      if (q.direction === 'h') {
        hCount++
      } else {
        vCount++
      }
    }

    /** @type {TextDirection} */
    let majorityDir
    if (hCount !== vCount) {
      majorityDir = hCount > vCount ? 'h' : 'v'
    } else {
      // Tie-break: use the direction of the quad with highest aspect ratio
      let maxAR = -Infinity
      majorityDir = 'h'
      for (const q of txtlns) {
        if (q.aspectRatio > maxAR) {
          maxAR = q.aspectRatio
          majorityDir = q.direction
        }
        if (1 / q.aspectRatio > maxAR) {
          maxAR = 1 / q.aspectRatio
          majorityDir = q.direction
        }
      }
    }

    // Sort textlines by reading order
    /** @type {number[]} */
    let sortedIndices
    if (majorityDir === 'h') {
      sortedIndices = [...group].sort((a, b) => quads[a].centroid.y - quads[b].centroid.y)
    } else {
      sortedIndices = [...group].sort((a, b) => -quads[a].centroid.x + quads[b].centroid.x)
    }

    const sortedQuads = sortedIndices.map(i => quads[i])

    results.push({
      quads: sortedQuads,
      fgColor: [fgR, fgG, fgB],
      bgColor: [bgR, bgG, bgB],
    })
  }

  return results
}
