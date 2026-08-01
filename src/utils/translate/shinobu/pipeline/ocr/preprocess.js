/**
 * @file Image preprocessing for OCR — perspective correction, direction grouping,
 * normalization.
 *
 * Mechanically converted from ShinobuTranslator
 * `src/pipeline/ocr/preprocess.ts` (TS → JS).
 */

/** @typedef {import('../../types.js').TextRegion} TextRegion */
/** @typedef {import('../../runtime/platform.js').PlatformProvider} PlatformProvider */
/** @typedef {import('../../runtime/platform.js').PipelineCanvas} PipelineCanvas */
/** @typedef {import('../../runtime/platform.js').PipelineImage} PipelineImage */

/**
 * @typedef {'h'|'v'} Direction
 */
export const Direction = {}

/**
 * @typedef {Object} DirectedRegion
 * @property {TextRegion} region
 * @property {Direction} direction
 */
export const DirectedRegion = {}

/**
 * @typedef {Object} OcrInputData
 * @property {Float32Array} data
 * @property {Array<number>} dims
 * @property {number} resizedWidth
 */
export const OcrInputData = {}

// --- Quad helpers ---

/**
 * @param {TextRegion} region
 * @returns {[QuadPoint, QuadPoint, QuadPoint, QuadPoint]}
 */
function getRegionQuad(region) {
  if (region.quad && region.quad.length === 4) {
    return region.quad
  }
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
 * @param {[QuadPoint, QuadPoint, QuadPoint, QuadPoint]} points
 * @returns {[QuadPoint, QuadPoint, QuadPoint, QuadPoint]}
 */
function sortQuadPoints(points) {
  const pts = points.map(p => ({ x: p.x, y: p.y }))
  const sums = pts.map(p => p.x + p.y)
  const diffs = pts.map(p => p.x - p.y)
  const tl = pts[sums.indexOf(Math.min(...sums))]
  const br = pts[sums.indexOf(Math.max(...sums))]
  const tr = pts[diffs.indexOf(Math.max(...diffs))]
  const bl = pts[diffs.indexOf(Math.min(...diffs))]
  return [tl, tr, br, bl]
}

// --- Geometry helpers ---

function pointToSegmentDistance(px, py, ax, ay, bx, by) {
  const abx = bx - ax
  const aby = by - ay
  const apx = px - ax
  const apy = py - ay
  const denom = abx * abx + aby * aby
  if (denom <= 1e-6) {
    return Math.hypot(px - ax, py - ay)
  }
  const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / denom))
  const cx = ax + t * abx
  const cy = ay + t * aby
  return Math.hypot(px - cx, py - cy)
}

function quadDistance(a, b) {
  let best = Number.POSITIVE_INFINITY
  for (let i = 0; i < 4; i += 1) {
    const p = a[i]
    for (let j = 0; j < 4; j += 1) {
      const q1 = b[j]
      const q2 = b[(j + 1) % 4]
      best = Math.min(best, pointToSegmentDistance(p.x, p.y, q1.x, q1.y, q2.x, q2.y))
    }
  }
  for (let i = 0; i < 4; i += 1) {
    const p = b[i]
    for (let j = 0; j < 4; j += 1) {
      const q1 = a[j]
      const q2 = a[(j + 1) % 4]
      best = Math.min(best, pointToSegmentDistance(p.x, p.y, q1.x, q1.y, q2.x, q2.y))
    }
  }
  return best
}

// --- Direction inference ---

/**
 * @param {TextRegion} region
 * @returns {Direction}
 */
function inferDirectionFromBox(region) {
  if (region.direction === 'h' || region.direction === 'v') {
    return region.direction
  }
  const quad = getRegionQuad(region)
  const topMid = { x: (quad[0].x + quad[1].x) * 0.5, y: (quad[0].y + quad[1].y) * 0.5 }
  const botMid = { x: (quad[2].x + quad[3].x) * 0.5, y: (quad[2].y + quad[3].y) * 0.5 }
  const rightMid = { x: (quad[1].x + quad[2].x) * 0.5, y: (quad[1].y + quad[2].y) * 0.5 }
  const leftMid = { x: (quad[3].x + quad[0].x) * 0.5, y: (quad[3].y + quad[0].y) * 0.5 }
  const vLen = Math.hypot(botMid.x - topMid.x, botMid.y - topMid.y)
  const hLen = Math.hypot(rightMid.x - leftMid.x, rightMid.y - leftMid.y)
  return vLen >= hLen ? 'v' : 'h'
}

/**
 * @param {TextRegion} a
 * @param {TextRegion} b
 * @returns {boolean}
 */
function canMergeDirectionGroup(a, b) {
  const qa = getRegionQuad(a)
  const qb = getRegionQuad(b)
  const fa = Math.max(2, Math.min(a.box.width, a.box.height))
  const fb = Math.max(2, Math.min(b.box.width, b.box.height))
  const charSize = Math.max(2, Math.min(fa, fb))
  const dist = quadDistance(qa, qb)
  if (dist > 2 * charSize) {
    return false
  }
  if (Math.max(fa, fb) / charSize > 1.5) {
    return false
  }
  const arA = a.box.width / Math.max(1, a.box.height)
  const arB = b.box.width / Math.max(1, b.box.height)
  if (arA > 1 && arB < 1) {
    return false
  }
  if (arB > 1 && arA < 1) {
    return false
  }
  return true
}

/**
 * @param {Array<TextRegion>} regions
 * @returns {Array<DirectedRegion>}
 */
export function generateTextDirection(regions) {
  const n = regions.length
  if (n === 0) {
    return []
  }
  const graph = Array.from({ length: n }, () => [])
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      if (!canMergeDirectionGroup(regions[i], regions[j])) {
        continue
      }
      graph[i].push(j)
      graph[j].push(i)
    }
  }
  const visited = new Uint8Array(n)
  const output = []
  for (let i = 0; i < n; i += 1) {
    if (visited[i] === 1) {
      continue
    }
    const stack = [i]
    visited[i] = 1
    const component = []
    while (stack.length > 0) {
      const current = stack.pop()
      if (current === undefined) {
        break
      }
      component.push(current)
      for (const next of graph[current]) {
        if (visited[next] === 1) {
          continue
        }
        visited[next] = 1
        stack.push(next)
      }
    }

    let votesH = 0
    let votesV = 0
    for (const idx of component) {
      const d = inferDirectionFromBox(regions[idx])
      if (d === 'h') {
        votesH += 1
      } else {
        votesV += 1
      }
    }
    const majority = votesV > votesH ? 'v' : 'h'
    component.sort((ia, ib) => {
      const a = regions[ia].box
      const b = regions[ib].box
      if (majority === 'h') {
        return a.y + a.height / 2 - (b.y + b.height / 2)
      }
      return -(a.x + a.width) + (b.x + b.width)
    })
    for (const idx of component) {
      output.push({ region: regions[idx], direction: majority })
    }
  }
  return output
}

// --- Input building ---

/**
 * @param {PipelineImage} image
 * @param {TextRegion} region
 * @param {Direction} direction
 * @param {number} inputHeight
 * @param {number} inputWidth
 * @param {'zero_to_one'|'minus_one_to_one'} normalize
 * @param {PlatformProvider} platform
 * @returns {OcrInputData}
 */
export function buildOcrInput(
  image,
  region,
  direction,
  inputHeight,
  inputWidth,
  normalize,
  platform
) {
  const source = getTransformedRegion(image, region, direction, inputHeight, platform)
  const srcWidth = Math.max(1, source.width)
  const srcHeight = Math.max(1, source.height)
  const ratio = srcWidth / srcHeight
  const resizedWidth = Math.max(1, Math.min(inputWidth, Math.round(ratio * inputHeight)))
  const canvas = platform.createCanvas(inputWidth, inputHeight)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) {
    throw new Error('OCR ONNX 预处理阶段无法创建画布上下文')
  }
  ctx.fillStyle = 'black'
  ctx.fillRect(0, 0, inputWidth, inputHeight)
  ctx.drawImage(source, 0, 0, srcWidth, srcHeight, 0, 0, resizedWidth, inputHeight)
  const pixelData = ctx.getImageData(0, 0, inputWidth, inputHeight).data
  const area = inputWidth * inputHeight
  const input = new Float32Array(3 * area)
  for (let i = 0, p = 0; i < area; i += 1, p += 4) {
    const r = pixelData[p]
    const g = pixelData[p + 1]
    const b = pixelData[p + 2]
    if (normalize === 'minus_one_to_one') {
      input[i] = r / 127.5 - 1
      input[area + i] = g / 127.5 - 1
      input[2 * area + i] = b / 127.5 - 1
    } else {
      input[i] = r / 255
      input[area + i] = g / 255
      input[2 * area + i] = b / 255
    }
  }
  return {
    data: input,
    dims: [1, 3, inputHeight, inputWidth],
    resizedWidth,
  }
}

// --- Perspective transform ---

function solveLinear8(a, b) {
  const n = 8
  const mat = a.map((row, i) => [...row, b[i]])
  for (let col = 0; col < n; col += 1) {
    let pivot = col
    for (let row = col + 1; row < n; row += 1) {
      if (Math.abs(mat[row][col]) > Math.abs(mat[pivot][col])) {
        pivot = row
      }
    }
    if (Math.abs(mat[pivot][col]) < 1e-9) {
      return null
    }
    if (pivot !== col) {
      const tmp = mat[col]
      mat[col] = mat[pivot]
      mat[pivot] = tmp
    }
    const diag = mat[col][col]
    for (let k = col; k <= n; k += 1) {
      mat[col][k] /= diag
    }
    for (let row = 0; row < n; row += 1) {
      if (row === col) {
        continue
      }
      const factor = mat[row][col]
      if (Math.abs(factor) < 1e-12) {
        continue
      }
      for (let k = col; k <= n; k += 1) {
        mat[row][k] -= factor * mat[col][k]
      }
    }
  }
  return mat.map(row => row[n])
}

/**
 * @param {Array<{x: number, y: number}>} src
 * @param {Array<{x: number, y: number}>} dst
 * @returns {Array<number>|null}
 */
function computeHomography(src, dst) {
  const a = []
  const b = []
  for (let i = 0; i < 4; i += 1) {
    const x = src[i].x
    const y = src[i].y
    const u = dst[i].x
    const v = dst[i].y
    a.push([x, y, 1, 0, 0, 0, -u * x, -u * y])
    b.push(u)
    a.push([0, 0, 0, x, y, 1, -v * x, -v * y])
    b.push(v)
  }
  const solved = solveLinear8(a, b)
  if (!solved) {
    return null
  }
  return [
    solved[0], solved[1], solved[2],
    solved[3], solved[4], solved[5],
    solved[6], solved[7], 1,
  ]
}

/**
 * @param {Array<number>} m
 * @returns {Array<number>|null}
 */
function invert3x3(m) {
  const [a, b, c, d, e, f, g, h, i] = m
  const A = e * i - f * h
  const B = -(d * i - f * g)
  const C = d * h - e * g
  const D = -(b * i - c * h)
  const E = a * i - c * g
  const F = -(a * h - b * g)
  const G = b * f - c * e
  const H = -(a * f - c * d)
  const I = a * e - b * d
  const det = a * A + b * B + c * C
  if (Math.abs(det) < 1e-9) {
    return null
  }
  const invDet = 1 / det
  return [
    A * invDet, D * invDet, G * invDet,
    B * invDet, E * invDet, H * invDet,
    C * invDet, F * invDet, I * invDet,
  ]
}

/**
 * @param {Uint8ClampedArray} src
 * @param {number} width
 * @param {number} height
 * @param {number} x
 * @param {number} y
 * @returns {[number, number, number, number]}
 */
function sampleBilinear(src, width, height, x, y) {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const x1 = Math.min(width - 1, x0 + 1)
  const y1 = Math.min(height - 1, y0 + 1)
  const dx = x - x0
  const dy = y - y0
  const idx00 = (y0 * width + x0) * 4
  const idx10 = (y0 * width + x1) * 4
  const idx01 = (y1 * width + x0) * 4
  const idx11 = (y1 * width + x1) * 4
  const out = [0, 0, 0, 255]
  for (let c = 0; c < 4; c += 1) {
    const v00 = src[idx00 + c]
    const v10 = src[idx10 + c]
    const v01 = src[idx01 + c]
    const v11 = src[idx11 + c]
    const v0 = v00 * (1 - dx) + v10 * dx
    const v1 = v01 * (1 - dx) + v11 * dx
    out[c] = Math.round(v0 * (1 - dy) + v1 * dy)
  }
  return out
}

/**
 * @param {PipelineCanvas} sourceCanvas
 * @param {Array<{x: number, y: number}>} localQuad
 * @param {number} outW
 * @param {number} outH
 * @param {PlatformProvider} platform
 * @returns {PipelineCanvas|null}
 */
function warpPerspectiveRegion(sourceCanvas, localQuad, outW, outH, platform) {
  const dstQuad = [
    { x: 0, y: 0 },
    { x: outW - 1, y: 0 },
    { x: outW - 1, y: outH - 1 },
    { x: 0, y: outH - 1 },
  ]
  const h = computeHomography(localQuad, dstQuad)
  if (!h) {
    return null
  }
  const hinv = invert3x3(h)
  if (!hinv) {
    return null
  }

  const srcCtx = sourceCanvas.getContext('2d', { willReadFrequently: true })
  if (!srcCtx) {
    return null
  }
  const srcData = srcCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height).data
  const outCanvas = platform.createCanvas(outW, outH)
  const outCtx = outCanvas.getContext('2d')
  if (!outCtx) {
    return null
  }
  const outImage = outCtx.createImageData(outW, outH)
  for (let y = 0; y < outH; y += 1) {
    for (let x = 0; x < outW; x += 1) {
      const denom = hinv[6] * x + hinv[7] * y + hinv[8]
      if (Math.abs(denom) < 1e-9) {
        continue
      }
      const sx = (hinv[0] * x + hinv[1] * y + hinv[2]) / denom
      const sy = (hinv[3] * x + hinv[4] * y + hinv[5]) / denom
      if (sx < 0 || sy < 0 || sx >= sourceCanvas.width - 1 || sy >= sourceCanvas.height - 1) {
        continue
      }
      const [r, g, b, a] = sampleBilinear(srcData, sourceCanvas.width, sourceCanvas.height, sx, sy)
      const idx = (y * outW + x) * 4
      outImage.data[idx] = r
      outImage.data[idx + 1] = g
      outImage.data[idx + 2] = b
      outImage.data[idx + 3] = a
    }
  }
  outCtx.putImageData(outImage, 0, 0)
  return outCanvas
}

/**
 * @param {PipelineCanvas} source
 * @param {PlatformProvider} platform
 * @returns {PipelineCanvas}
 */
function rotate90CounterClockwise(source, platform) {
  const canvas = platform.createCanvas(source.height, source.width)
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return source
  }
  ctx.translate(0, canvas.height)
  ctx.rotate(-Math.PI / 2)
  ctx.drawImage(source, 0, 0)
  return canvas
}

/**
 * Apply perspective correction and rotation to a text region for OCR.
 * @param {PipelineImage} image
 * @param {TextRegion} region
 * @param {Direction} direction
 * @param {number} textHeight
 * @param {PlatformProvider} platform
 * @returns {PipelineCanvas}
 */
export function getTransformedRegion(image, region, direction, textHeight, platform) {
  const quad = sortQuadPoints(getRegionQuad(region))
  const imW = image.naturalWidth
  const imH = image.naturalHeight
  const minX = Math.max(0, Math.floor(Math.min(quad[0].x, quad[1].x, quad[2].x, quad[3].x)))
  const minY = Math.max(0, Math.floor(Math.min(quad[0].y, quad[1].y, quad[2].y, quad[3].y)))
  const maxX = Math.min(imW, Math.ceil(Math.max(quad[0].x, quad[1].x, quad[2].x, quad[3].x)))
  const maxY = Math.min(imH, Math.ceil(Math.max(quad[0].y, quad[1].y, quad[2].y, quad[3].y)))
  const cropW = Math.max(1, maxX - minX)
  const cropH = Math.max(1, maxY - minY)

  const source = platform.createCanvas(cropW, cropH)
  const sctx = source.getContext('2d')
  if (!sctx) {
    throw new Error('OCR 透视裁切阶段无法创建画布上下文')
  }
  sctx.drawImage(image, minX, minY, cropW, cropH, 0, 0, cropW, cropH)
  const localQuad = quad.map(p => ({ x: p.x - minX, y: p.y - minY }))

  const mid = [
    { x: (localQuad[0].x + localQuad[1].x) / 2, y: (localQuad[0].y + localQuad[1].y) / 2 },
    { x: (localQuad[1].x + localQuad[2].x) / 2, y: (localQuad[1].y + localQuad[2].y) / 2 },
    { x: (localQuad[2].x + localQuad[3].x) / 2, y: (localQuad[2].y + localQuad[3].y) / 2 },
    { x: (localQuad[3].x + localQuad[0].x) / 2, y: (localQuad[3].y + localQuad[0].y) / 2 },
  ]
  const vVec = { x: mid[2].x - mid[0].x, y: mid[2].y - mid[0].y }
  const hVec = { x: mid[1].x - mid[3].x, y: mid[1].y - mid[3].y }
  const normV = Math.hypot(vVec.x, vVec.y)
  const normH = Math.hypot(hVec.x, hVec.y)
  if (normV <= 1e-4 || normH <= 1e-4) {
    return source
  }
  const ratio = normV / normH

  let outW
  let outH
  if (direction === 'h') {
    outH = Math.max(2, Math.floor(textHeight))
    outW = Math.max(2, Math.round(textHeight / ratio))
  } else {
    outW = Math.max(2, Math.floor(textHeight))
    outH = Math.max(2, Math.round(textHeight * ratio))
  }

  const warped = warpPerspectiveRegion(source, localQuad, outW, outH, platform)
  if (!warped) {
    return source
  }
  if (direction === 'v') {
    return rotate90CounterClockwise(warped, platform)
  }
  return warped
}
