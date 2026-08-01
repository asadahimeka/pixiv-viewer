/**
 * @file Geometry & text utilities for the Shinobu translation pipeline.
 *
 * Mechanically converted from ShinobuTranslator `src/pipeline/utils.ts`
 * (TS → JS): type-only imports → JSDoc import() references.
 */

/** @typedef {import('../types.js').Rect} Rect */
/** @typedef {import('../types.js').QuadPoint} QuadPoint */

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

/**
 * @param {Array<{ x: number, y: number }>} points
 * @returns {number}
 */
export function polygonSignedArea(points) {
  let area = 0
  const n = points.length
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    area += points[i].x * points[j].y
    area -= points[j].x * points[i].y
  }
  return area / 2
}

/**
 * @param {Array<{ x: number, y: number }>} points
 * @returns {number}
 */
export function polygonArea(points) {
  if (points.length < 3) {
    return 0
  }
  return Math.abs(polygonSignedArea(points))
}

/**
 * @param {Rect} a
 * @param {Rect} b
 * @returns {number}
 */
export function rectIou(a, b) {
  const x1 = Math.max(a.x, b.x)
  const y1 = Math.max(a.y, b.y)
  const x2 = Math.min(a.x + a.width, b.x + b.width)
  const y2 = Math.min(a.y + a.height, b.y + b.height)
  if (x2 <= x1 || y2 <= y1) {
    return 0
  }
  const inter = (x2 - x1) * (y2 - y1)
  const union = a.width * a.height + b.width * b.height - inter
  return union <= 0 ? 0 : inter / union
}

/**
 * @typedef {Object} ScoredBox
 * @property {Rect} box
 * @property {number} score
 * @property {number} [index]
 */
export const ScoredBox = {}

/**
 * Non-maximum suppression: sorts candidates by score desc and drops
 * lower-scored boxes whose IoU with a kept box exceeds the threshold.
 * Logic preserved verbatim from Shinobu source.
 *
 * @param {Array<ScoredBox>} items
 * @param {number} iouThreshold
 * @returns {Array<ScoredBox>}
 */
export function nmsBoxes(items, iouThreshold) {
  const sorted = [...items].sort((a, b) => b.score - a.score)
  const suppressed = new Set()
  const kept = []
  for (let i = 0; i < sorted.length; i += 1) {
    if (suppressed.has(i)) {
      continue
    }
    const current = sorted[i]
    for (let j = i + 1; j < sorted.length; j += 1) {
      if (suppressed.has(j)) {
        continue
      }
      if (rectIou(current.box, sorted[j].box) > iouThreshold) {
        suppressed.add(j)
      }
    }
    kept.push(current)
  }
  return kept
}

/**
 * @param {string} text
 * @returns {string}
 */
export function normalizeTextDeep(text) {
  return text.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * @param {string} text
 * @returns {string}
 */
export function normalizeTextLight(text) {
  return text.trim()
}

/**
 * @param {Array<QuadPoint>} points
 * @returns {Array<QuadPoint>}
 */
export function convexHull(points) {
  if (points.length <= 1) {
    return points.map(point => ({ ...point }))
  }
  const unique = [...new Map(points.map(point => [`${point.x},${point.y}`, point])).values()].sort(
    (a, b) => a.x - b.x || a.y - b.y
  )
  if (unique.length <= 2) {
    return unique
  }

  const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)
  const lower = []
  for (const point of unique) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) {
      lower.pop()
    }
    lower.push(point)
  }
  const upper = []
  for (let i = unique.length - 1; i >= 0; i -= 1) {
    const point = unique[i]
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) {
      upper.pop()
    }
    upper.push(point)
  }

  lower.pop()
  upper.pop()
  return [...lower, ...upper]
}

/**
 * @param {Array<{ x: number, y: number }>} points
 * @returns {number}
 */
export function convexHullArea(points) {
  if (points.length < 3) {
    return 0
  }
  return polygonArea(convexHull(points))
}

/**
 * Disjoint-set union-find with union by rank + path halving.
 */
export class UnionFind {
  /**
   * @param {number} n
   */
  constructor(n) {
    this.parent = Array.from({ length: n }, (_, i) => i)
    this.rank = new Array(n).fill(0)
  }

  /**
   * @param {number} x
   * @returns {number}
   */
  find(x) {
    while (this.parent[x] !== x) {
      this.parent[x] = this.parent[this.parent[x]]
      x = this.parent[x]
    }
    return x
  }

  /**
   * @param {number} a
   * @param {number} b
   * @returns {boolean}
   */
  union(a, b) {
    const ra = this.find(a)
    const rb = this.find(b)
    if (ra === rb) {
      return false
    }
    if (this.rank[ra] < this.rank[rb]) {
      this.parent[ra] = rb
    } else if (this.rank[ra] > this.rank[rb]) {
      this.parent[rb] = ra
    } else {
      this.parent[rb] = ra
      this.rank[ra]++
    }
    return true
  }
}
