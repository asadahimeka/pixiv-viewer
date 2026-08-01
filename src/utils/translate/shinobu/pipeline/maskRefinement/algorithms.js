/**
 * @file Mask refinement algorithms.
 *
 * Mechanically converted from ShinobuTranslator `src/pipeline/maskRefinement/algorithms.ts`
 * (TS → JS). All contour/polygon/connected-components logic preserved verbatim.
 * Types → JSDoc @typedef + doc-only import() references.
 */

import { clamp, polygonArea } from '../utils.js'

// ---------------------------------------------------------------------------
// Doc-only type imports — referenced in JSDoc, zero runtime impact
// ---------------------------------------------------------------------------

/** @typedef {import('../../types.js').Rect} Rect */
/** @typedef {import('../../types.js').TextRegion} TextRegion */
/** @typedef {import('../../runtime/platform.js').PlatformProvider} PlatformProvider */
/** @typedef {import('../../runtime/platform.js').PipelineCanvas} PipelineCanvas */

// ---------------------------------------------------------------------------
// Types — JSDoc @typedef + placeholder export (T2/T3 convention)
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} Point
 * @property {number} x
 * @property {number} y
 */

/**
 * @typedef {'fit_text'} MaskRefinementMethod
 */
export const MaskRefinementMethod = {}

/**
 * @typedef {Object} MaskRefinementOptions
 * @property {MaskRefinementMethod} [method]
 * @property {number} [dilationOffset]
 * @property {number} [kernelSize]
 * @property {number} [keepThreshold]
 */
export const MaskRefinementOptions = {}

/**
 * @typedef {Object} RegionMaskInfo
 * @property {Rect} box
 * @property {Array<Point>} polygon
 * @property {number} area
 * @property {number} textSize
 */
export const RegionMaskInfo = {}

/**
 * @typedef {Object} Component
 * @property {Int32Array} pixels
 * @property {Rect} rect
 * @property {number} area
 * @property {Point} center
 */
export const Component = {}

/**
 * @typedef {Object} AssignedExtent
 * @property {number} minX
 * @property {number} minY
 * @property {number} maxX
 * @property {number} maxY
 */
export const AssignedExtent = {}

// ---------------------------------------------------------------------------
// Canvas utilities
// ---------------------------------------------------------------------------

/**
 * @param {number} width
 * @param {number} height
 * @param {PlatformProvider} platform
 * @returns {PipelineCanvas}
 */
export function makeCanvas(width, height, platform) {
  const canvas = platform.createCanvas(width, height)
  return canvas
}

/**
 * @param {PipelineCanvas} canvas
 * @param {number} width
 * @param {number} height
 * @param {PlatformProvider} platform
 * @returns {Uint8Array}
 */
export function readBinaryMask(canvas, width, height, platform) {
  const resized = makeCanvas(width, height, platform)
  const ctx = resized.getContext('2d', { willReadFrequently: true })
  if (!ctx) {
    throw new Error('Mask refinement 读取遮罩失败：无法创建画布上下文')
  }
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(canvas, 0, 0, width, height)
  const data = ctx.getImageData(0, 0, width, height).data
  const out = new Uint8Array(width * height)
  for (let i = 0, p = 0; i < out.length; i += 1, p += 4) {
    out[i] = data[p] > 0 ? 1 : 0
  }
  return out
}

/**
 * @param {PipelineCanvas} canvas
 * @param {number} width
 * @param {number} height
 * @param {PlatformProvider} platform
 * @returns {Uint8Array}
 */
export function readGrayImage(canvas, width, height, platform) {
  const resized = makeCanvas(width, height, platform)
  const ctx = resized.getContext('2d', { willReadFrequently: true })
  if (!ctx) {
    throw new Error('Mask refinement 读取图像失败：无法创建画布上下文')
  }
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(canvas, 0, 0, width, height)
  const data = ctx.getImageData(0, 0, width, height).data
  const out = new Uint8Array(width * height)
  for (let i = 0, p = 0; i < out.length; i += 1, p += 4) {
    out[i] = Math.round(data[p] * 0.299 + data[p + 1] * 0.587 + data[p + 2] * 0.114)
  }
  return out
}

/**
 * @param {Uint8Array} mask
 * @param {number} width
 * @param {number} height
 * @param {Rect} rect
 * @returns {void}
 */
export function drawRectOutline(mask, width, height, rect) {
  const x0 = clamp(Math.floor(rect.x), 0, width - 1)
  const y0 = clamp(Math.floor(rect.y), 0, height - 1)
  const x1 = clamp(Math.floor(rect.x + rect.width), x0, width - 1)
  const y1 = clamp(Math.floor(rect.y + rect.height), y0, height - 1)

  for (let x = x0; x <= x1; x += 1) {
    mask[y0 * width + x] = 0
    mask[y1 * width + x] = 0
  }
  for (let y = y0; y <= y1; y += 1) {
    mask[y * width + x0] = 0
    mask[y * width + x1] = 0
  }
}

// ---------------------------------------------------------------------------
// Polygon geometry
// ---------------------------------------------------------------------------

/**
 * @param {Point} point
 * @param {Array<Point>} polygon
 * @returns {boolean}
 */
export function pointInPolygon(point, polygon) {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const pi = polygon[i]
    const pj = polygon[j]
    const intersect =
      (pi.y > point.y) !== (pj.y > point.y) &&
      point.x < ((pj.x - pi.x) * (point.y - pi.y)) / (pj.y - pi.y + 1e-12) + pi.x
    if (intersect) {
      inside = !inside
    }
  }
  return inside
}

/**
 * @param {Point} p
 * @param {Point} a
 * @param {Point} b
 * @returns {number}
 */
function distancePointToSegment(p, a, b) {
  const abx = b.x - a.x
  const aby = b.y - a.y
  const apx = p.x - a.x
  const apy = p.y - a.y
  const abLen2 = abx * abx + aby * aby
  if (abLen2 <= 1e-12) {
    return Math.hypot(apx, apy)
  }
  const t = clamp((apx * abx + apy * aby) / abLen2, 0, 1)
  const cx = a.x + abx * t
  const cy = a.y + aby * t
  return Math.hypot(p.x - cx, p.y - cy)
}

/**
 * @param {Array<Point>} polygon
 * @param {Point} point
 * @returns {number}
 */
export function polygonDistanceToPoint(polygon, point) {
  if (polygon.length < 2) {
    return Number.POSITIVE_INFINITY
  }
  if (pointInPolygon(point, polygon)) {
    return 0
  }
  let minDist = Number.POSITIVE_INFINITY
  for (let i = 0; i < polygon.length; i += 1) {
    const a = polygon[i]
    const b = polygon[(i + 1) % polygon.length]
    minDist = Math.min(minDist, distancePointToSegment(point, a, b))
  }
  return minDist
}

/**
 * Sutherland–Hodgman clip edge.
 * @param {Array<Point>} polygon
 * @param {(p: Point) => boolean} inside
 * @param {(a: Point, b: Point) => Point} intersect
 * @returns {Array<Point>}
 */
function clipEdge(polygon, inside, intersect) {
  if (polygon.length === 0) {
    return []
  }
  const out = []
  for (let i = 0; i < polygon.length; i += 1) {
    const current = polygon[i]
    const prev = polygon[(i + polygon.length - 1) % polygon.length]
    const currentInside = inside(current)
    const prevInside = inside(prev)
    if (currentInside) {
      if (!prevInside) {
        out.push(intersect(prev, current))
      }
      out.push(current)
    } else if (prevInside) {
      out.push(intersect(prev, current))
    }
  }
  return out
}

/**
 * @param {Array<Point>} polygon
 * @param {Rect} rect
 * @returns {Array<Point>}
 */
export function clipPolygonToRect(polygon, rect) {
  const xMin = rect.x
  const yMin = rect.y
  const xMax = rect.x + rect.width
  const yMax = rect.y + rect.height

  let clipped = [...polygon]
  clipped = clipEdge(
    clipped,
    p => p.x >= xMin,
    (a, b) => {
      const t = (xMin - a.x) / (b.x - a.x + 1e-12)
      return { x: xMin, y: a.y + (b.y - a.y) * t }
    }
  )
  clipped = clipEdge(
    clipped,
    p => p.x <= xMax,
    (a, b) => {
      const t = (xMax - a.x) / (b.x - a.x + 1e-12)
      return { x: xMax, y: a.y + (b.y - a.y) * t }
    }
  )
  clipped = clipEdge(
    clipped,
    p => p.y >= yMin,
    (a, b) => {
      const t = (yMin - a.y) / (b.y - a.y + 1e-12)
      return { x: a.x + (b.x - a.x) * t, y: yMin }
    }
  )
  clipped = clipEdge(
    clipped,
    p => p.y <= yMax,
    (a, b) => {
      const t = (yMax - a.y) / (b.y - a.y + 1e-12)
      return { x: a.x + (b.x - a.x) * t, y: yMax }
    }
  )
  return clipped
}

/**
 * @param {Array<Point>} polygon
 * @param {Rect} rect
 * @returns {number}
 */
export function polygonRectIntersectionArea(polygon, rect) {
  const clipped = clipPolygonToRect(polygon, rect)
  return polygonArea(clipped)
}

// ---------------------------------------------------------------------------
// Region scaling
// ---------------------------------------------------------------------------

/**
 * @param {TextRegion} region
 * @param {number} scale
 * @returns {Array<Point>}
 */
export function scaleRegionPolygon(region, scale) {
  if (region.quad && region.quad.length === 4) {
    return region.quad.map(p => ({ x: p.x * scale, y: p.y * scale }))
  }
  const x0 = region.box.x * scale
  const y0 = region.box.y * scale
  const x1 = (region.box.x + region.box.width) * scale
  const y1 = (region.box.y + region.box.height) * scale
  return [
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: y1 },
    { x: x0, y: y1 },
  ]
}

/**
 * @param {Array<Point>} points
 * @param {number} maxW
 * @param {number} maxH
 * @returns {Rect}
 */
export function polygonToBox(points, maxW, maxH) {
  const minX = clamp(Math.floor(Math.min(...points.map(p => p.x))), 0, maxW - 1)
  const minY = clamp(Math.floor(Math.min(...points.map(p => p.y))), 0, maxH - 1)
  const maxX = clamp(Math.ceil(Math.max(...points.map(p => p.x))), minX + 1, maxW)
  const maxY = clamp(Math.ceil(Math.max(...points.map(p => p.y))), minY + 1, maxH)
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

/**
 * @param {Array<TextRegion>} regions
 * @param {number} scale
 * @param {number} maxW
 * @param {number} maxH
 * @returns {Array<RegionMaskInfo>}
 */
export function scaleRegions(regions, scale, maxW, maxH) {
  return regions.map(region => {
    const scaledPolygon = scaleRegionPolygon(region, scale).map(p => ({
      x: clamp(p.x, 0, maxW),
      y: clamp(p.y, 0, maxH),
    }))
    const box = polygonToBox(scaledPolygon, maxW, maxH)
    const area = Math.max(1, polygonArea(scaledPolygon))
    const textSize = region.fontSize && region.fontSize > 0
      ? Math.max(1, Math.round(region.fontSize * scale))
      : Math.max(1, Math.min(box.width, box.height))
    return {
      box,
      polygon: scaledPolygon,
      area,
      textSize,
    }
  })
}

// ---------------------------------------------------------------------------
// Connected components (BFS flood-fill, 8-connectivity)
// ---------------------------------------------------------------------------

/**
 * @param {Uint8Array} mask
 * @param {number} width
 * @param {number} height
 * @returns {Array<Component>}
 */
export function connectedComponents(mask, width, height) {
  const total = width * height
  const visited = new Uint8Array(total)
  const queue = new Int32Array(total)
  const out = []

  for (let i = 0; i < total; i += 1) {
    if (mask[i] === 0 || visited[i] === 1) {
      continue
    }

    let head = 0
    let tail = 0
    queue[tail] = i
    tail += 1
    visited[i] = 1

    const pixels = []
    let minX = width
    let minY = height
    let maxX = 0
    let maxY = 0

    while (head < tail) {
      const current = queue[head]
      head += 1
      pixels.push(current)

      const x = current % width
      const y = Math.floor(current / width)
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)

      const xStart = Math.max(0, x - 1)
      const xEnd = Math.min(width - 1, x + 1)
      const yStart = Math.max(0, y - 1)
      const yEnd = Math.min(height - 1, y + 1)
      for (let ny = yStart; ny <= yEnd; ny += 1) {
        for (let nx = xStart; nx <= xEnd; nx += 1) {
          if (nx === x && ny === y) {
            continue
          }
          const next = ny * width + nx
          if (visited[next] === 1 || mask[next] === 0) {
            continue
          }
          visited[next] = 1
          queue[tail] = next
          tail += 1
        }
      }
    }

    const compWidth = maxX - minX + 1
    const compHeight = maxY - minY + 1
    const area = pixels.length
    if (area <= 9 || compWidth <= 0 || compHeight <= 0) {
      continue
    }

    out.push({
      pixels: Int32Array.from(pixels),
      rect: {
        x: minX,
        y: minY,
        width: compWidth,
        height: compHeight,
      },
      area,
      center: {
        x: minX + compWidth * 0.5,
        y: minY + compHeight * 0.5,
      },
    })
  }

  return out
}

// ---------------------------------------------------------------------------
// Morphological operations
// ---------------------------------------------------------------------------

/**
 * @param {number} size
 * @returns {Array<{ dx: number, dy: number }>}
 */
function ellipseOffsets(size) {
  const radius = Math.floor(size / 2)
  const out = []
  const r2 = radius * radius + 0.25
  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      if (dx * dx + dy * dy <= r2) {
        out.push({ dx, dy })
      }
    }
  }
  return out
}

/**
 * @param {Uint8Array} mask
 * @param {number} width
 * @param {number} height
 * @param {number} kernelSize
 * @returns {Uint8Array}
 */
export function dilate(mask, width, height, kernelSize) {
  if (kernelSize <= 1) {
    return mask.slice()
  }
  const out = new Uint8Array(mask.length)
  const offsets = ellipseOffsets(kernelSize)
  for (let y = 0; y < height; y += 1) {
    const row = y * width
    for (let x = 0; x < width; x += 1) {
      if (mask[row + x] === 0) {
        continue
      }
      for (const { dx, dy } of offsets) {
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
          continue
        }
        out[ny * width + nx] = 1
      }
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// Canvas output
// ---------------------------------------------------------------------------

/**
 * @param {number} rawMaskHeight
 * @param {number} imageHeight
 * @returns {number}
 */
export function computeScaleFactor(rawMaskHeight, imageHeight) {
  if (rawMaskHeight <= 0 || imageHeight <= 0) {
    return 1
  }
  return Math.max(Math.min((rawMaskHeight - imageHeight / 3) / rawMaskHeight, 1), 0.5)
}

/**
 * @param {Uint8Array} mask
 * @param {number} width
 * @param {number} height
 * @param {number} outW
 * @param {number} outH
 * @param {PlatformProvider} platform
 * @returns {PipelineCanvas}
 */
export function toMaskCanvas(mask, width, height, outW, outH, platform) {
  const src = makeCanvas(width, height, platform)
  const srcCtx = src.getContext('2d')
  if (!srcCtx) {
    throw new Error('Mask refinement 输出失败：无法创建源画布上下文')
  }
  const imageData = srcCtx.createImageData(width, height)
  for (let i = 0, p = 0; i < mask.length; i += 1, p += 4) {
    const v = mask[i] > 0 ? 255 : 0
    imageData.data[p] = v
    imageData.data[p + 1] = v
    imageData.data[p + 2] = v
    imageData.data[p + 3] = 255
  }
  srcCtx.putImageData(imageData, 0, 0)

  const out = makeCanvas(outW, outH, platform)
  const outCtx = out.getContext('2d', { willReadFrequently: true })
  if (!outCtx) {
    throw new Error('Mask refinement 输出失败：无法创建目标画布上下文')
  }
  outCtx.imageSmoothingEnabled = true
  outCtx.drawImage(src, 0, 0, outW, outH)
  const outData = outCtx.getImageData(0, 0, outW, outH)
  for (let p = 0; p < outData.data.length; p += 4) {
    const v = outData.data[p] > 127 ? 255 : 0
    outData.data[p] = v
    outData.data[p + 1] = v
    outData.data[p + 2] = v
    outData.data[p + 3] = 255
  }
  outCtx.putImageData(outData, 0, 0)
  return out
}

// ---------------------------------------------------------------------------
// Sub-mask operations
// ---------------------------------------------------------------------------

/**
 * @param {Uint8Array} mask
 * @returns {boolean}
 */
export function hasForeground(mask) {
  for (let i = 0; i < mask.length; i += 1) {
    if (mask[i] > 0) {
      return true
    }
  }
  return false
}

/**
 * @param {Uint8Array} mask
 * @param {number} width
 * @param {Rect} rect
 * @returns {Uint8Array}
 */
export function extractSubMask(mask, width, rect) {
  const out = new Uint8Array(rect.width * rect.height)
  for (let y = 0; y < rect.height; y += 1) {
    const srcRow = (rect.y + y) * width + rect.x
    const dstRow = y * rect.width
    out.set(mask.subarray(srcRow, srcRow + rect.width), dstRow)
  }
  return out
}

/**
 * @param {Uint8Array} mask
 * @param {number} width
 * @param {Rect} rect
 * @param {Uint8Array} sub
 * @returns {void}
 */
export function replaceSubMask(mask, width, rect, sub) {
  for (let y = 0; y < rect.height; y += 1) {
    const dstRow = (rect.y + y) * width + rect.x
    const srcRow = y * rect.width
    mask.set(sub.subarray(srcRow, srcRow + rect.width), dstRow)
  }
}

/**
 * @param {Uint8Array} mask
 * @param {number} width
 * @param {Rect} rect
 * @param {Uint8Array} sub
 * @returns {void}
 */
export function orSubMask(mask, width, rect, sub) {
  for (let y = 0; y < rect.height; y += 1) {
    const dstRow = (rect.y + y) * width + rect.x
    const srcRow = y * rect.width
    for (let x = 0; x < rect.width; x += 1) {
      if (sub[srcRow + x] > 0) {
        mask[dstRow + x] = 1
      }
    }
  }
}

/**
 * @param {Uint8Array} gray
 * @param {number} width
 * @param {Rect} rect
 * @returns {Uint8Array}
 */
export function extractSubGray(gray, width, rect) {
  const out = new Uint8Array(rect.width * rect.height)
  for (let y = 0; y < rect.height; y += 1) {
    const srcRow = (rect.y + y) * width + rect.x
    const dstRow = y * rect.width
    out.set(gray.subarray(srcRow, srcRow + rect.width), dstRow)
  }
  return out
}

// ---------------------------------------------------------------------------
// Otsu thresholding
// ---------------------------------------------------------------------------

/**
 * @param {Uint8Array} gray
 * @returns {number}
 */
export function otsuThreshold(gray) {
  const hist = new Uint32Array(256)
  for (let i = 0; i < gray.length; i += 1) {
    hist[gray[i]] += 1
  }
  const total = gray.length
  let sumAll = 0
  for (let i = 0; i < 256; i += 1) {
    sumAll += i * hist[i]
  }

  let sumB = 0
  let wB = 0
  let maxVar = -1
  let threshold = 127
  for (let t = 0; t < 256; t += 1) {
    wB += hist[t]
    if (wB === 0) {
      continue
    }
    const wF = total - wB
    if (wF === 0) {
      break
    }
    sumB += t * hist[t]
    const mB = sumB / wB
    const mF = (sumAll - sumB) / wF
    const between = wB * wF * (mB - mF) * (mB - mF)
    if (between > maxVar) {
      maxVar = between
      threshold = t
    }
  }
  return threshold
}

/**
 * @param {Uint8Array} a
 * @param {Uint8Array} b
 * @returns {number}
 */
export function xorCost(a, b) {
  let cost = 0
  for (let i = 0; i < a.length; i += 1) {
    if ((a[i] > 0) !== (b[i] > 0)) {
      cost += 1
    }
  }
  return cost
}

/**
 * Refine a region mask by fitting to dark pixels (Otsu threshold) and choosing
 * the binary pattern (thresholded or its inverse) that best matches the seed mask.
 *
 * @param {Uint8Array} gray - Grayscale sub-image
 * @param {Uint8Array} seedMask - Seed mask from connected components
 * @returns {Uint8Array} Refined binary mask
 */
export function refineRegionMask(gray, seedMask) {
  if (!hasForeground(seedMask)) {
    return seedMask.slice()
  }
  const threshold = otsuThreshold(gray)
  const candidate = new Uint8Array(gray.length)
  const inverse = new Uint8Array(gray.length)
  for (let i = 0; i < gray.length; i += 1) {
    const isDark = gray[i] <= threshold ? 1 : 0
    candidate[i] = isDark
    inverse[i] = isDark === 1 ? 0 : 1
  }
  const costCandidate = xorCost(candidate, seedMask)
  const costInverse = xorCost(inverse, seedMask)
  const chosen = costCandidate <= costInverse ? candidate : inverse
  if (!hasForeground(chosen)) {
    return seedMask.slice()
  }
  return chosen
}

// ---------------------------------------------------------------------------
// Outline width detection
// ---------------------------------------------------------------------------

const BRIGHT_THRESHOLD = 40
const OUTLINE_RATIO_THRESHOLD = 0.5

/**
 * Detect the width of text outline (furigana/decoration strokes) around the mask.
 *
 * Scans outward from mask boundary pixels in 4 directions, looking for bright
 * pixels (above background median + BRIGHT_THRESHOLD). Returns the median
 * outline distance if enough boundary pixels show outline behavior.
 *
 * @param {Uint8Array} gray
 * @param {Uint8Array} mask
 * @param {number} width
 * @param {number} height
 * @param {Rect} regionRect
 * @param {number} textSize
 * @returns {number}
 */
export function detectOutlineWidth(gray, mask, width, height, regionRect, textSize) {
  const rx0 = Math.max(0, Math.floor(regionRect.x))
  const ry0 = Math.max(0, Math.floor(regionRect.y))
  const rx1 = Math.min(width - 1, Math.floor(regionRect.x + regionRect.width))
  const ry1 = Math.min(height - 1, Math.floor(regionRect.y + regionRect.height))

  const outsideGray = []
  for (let y = ry0; y <= ry1; y += 1) {
    for (let x = rx0; x <= rx1; x += 1) {
      if (mask[y * width + x] === 0) {
        outsideGray.push(gray[y * width + x])
      }
    }
  }
  if (outsideGray.length === 0) {
    return 0
  }
  outsideGray.sort((a, b) => a - b)
  const bgMedian = outsideGray[Math.floor(outsideGray.length * 0.25)]

  const boundaryPixels = []
  for (let y = ry0; y <= ry1; y += 1) {
    for (let x = rx0; x <= rx1; x += 1) {
      if (mask[y * width + x] === 0) {
        continue
      }
      const hasOutsideNeighbor =
        (x > 0 && mask[y * width + x - 1] === 0) ||
        (x < width - 1 && mask[y * width + x + 1] === 0) ||
        (y > 0 && mask[(y - 1) * width + x] === 0) ||
        (y < height - 1 && mask[(y + 1) * width + x] === 0) ||
        (x > 0 && y > 0 && mask[(y - 1) * width + x - 1] === 0) ||
        (x < width - 1 && y > 0 && mask[(y - 1) * width + x + 1] === 0) ||
        (x > 0 && y < height - 1 && mask[(y + 1) * width + x - 1] === 0) ||
        (x < width - 1 && y < height - 1 && mask[(y + 1) * width + x + 1] === 0)
      if (hasOutsideNeighbor) {
        boundaryPixels.push({ x, y })
      }
    }
  }
  if (boundaryPixels.length === 0) {
    return 0
  }

  const maxScanDist = Math.max(4, Math.floor(textSize * 0.3))
  const directions = [
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 },
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 },
  ]
  const outlineDists = []

  for (const bp of boundaryPixels) {
    let maxDist = 0
    for (const dir of directions) {
      let dist = 0
      let reachedBright = false
      let cx = bp.x + dir.dx
      let cy = bp.y + dir.dy
      while (dist < maxScanDist) {
        if (cx < 0 || cx >= width || cy < 0 || cy >= height) {
          break
        }
        const idx = cy * width + cx
        if (mask[idx] !== 0) {
          break
        }
        if (gray[idx] > bgMedian + BRIGHT_THRESHOLD) {
          reachedBright = true
        } else if (gray[idx] <= bgMedian) {
          break
        }
        dist += 1
        cx += dir.dx
        cy += dir.dy
      }
      if (reachedBright) {
        maxDist = Math.max(maxDist, dist)
      }
    }
    if (maxDist > 0) {
      outlineDists.push(maxDist)
    }
  }

  const outlineRatio = outlineDists.length / boundaryPixels.length
  if (outlineRatio < OUTLINE_RATIO_THRESHOLD) {
    return 0
  }

  outlineDists.sort((a, b) => a - b)
  return outlineDists[Math.floor(outlineDists.length / 2)]
}

// ---------------------------------------------------------------------------
// Rect extension
// ---------------------------------------------------------------------------

/**
 * @param {Rect} rect
 * @param {number} maxX
 * @param {number} maxY
 * @param {number} extendSize
 * @returns {Rect}
 */
export function extendRect(rect, maxX, maxY, extendSize) {
  const x = Math.max(Math.floor(rect.x - extendSize), 0)
  const y = Math.max(Math.floor(rect.y - extendSize), 0)
  const width = Math.min(Math.floor(rect.width + extendSize * 2), maxX - x - 1)
  const height = Math.min(Math.floor(rect.height + extendSize * 2), maxY - y - 1)
  return {
    x,
    y,
    width: Math.max(1, width),
    height: Math.max(1, height),
  }
}
