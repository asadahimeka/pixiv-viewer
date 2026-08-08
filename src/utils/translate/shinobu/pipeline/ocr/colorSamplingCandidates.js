/**
 * @file Unified pixel candidate sampler for OCR text colors.
 *
 * Mechanically converted from ShinobuTranslator
 * `src/pipeline/ocr/colorSamplingCandidates.ts` (TS → JS).
 *
 * The main sampler separates up to three pixel candidates: image background,
 * text fill, and outline/stroke. This avoids treating colorful speech bubbles
 * as text color when white text has a dark or red outline.
 */

import { grayAt, sampleCornerBgColor } from './colorSamplingShared.js'

/** @typedef {import('./colorSamplingShared.js').RgbColor} RgbColor */

/**
 * @typedef {Object} PixelCandidate
 * @property {number} peak
 * @property {RgbColor} color
 * @property {number} count
 * @property {number} ratio
 * @property {number} borderShare
 * @property {number} edgeRatio
 * @property {number} cornerDistance
 * @property {number} backgroundContactRatio
 * @property {number} textContactRatio
 */

const SOBEL_THRESHOLD = 30
const MAX_TEXT_COLOR_CANDIDATES = 3
const MIN_PEAK_GAP = 24
const PEAK_SAMPLE_RADIUS = 16
const SATURATED_EDGE_THRESHOLD = 45
const SATURATED_EDGE_BACKGROUND_GAP = 56
const BRIGHT_FILL_MAX_STROKE_RATIO = 1.15

const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1]
const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1]

function clampByte(value) {
  return Math.min(255, Math.max(0, Math.round(value)))
}

function rgbDistance(a, b) {
  return Math.sqrt(
    (a[0] - b[0]) ** 2 +
    (a[1] - b[1]) ** 2 +
    (a[2] - b[2]) ** 2
  )
}

function computeGrayValues(pixelData, pixelCount) {
  const values = new Float32Array(pixelCount)
  for (let i = 0; i < pixelCount; i += 1) {
    values[i] = grayAt(pixelData, i * 4)
  }
  return values
}

function computeGrayHistogram(grayValues) {
  const bins = new Float64Array(256)
  for (const value of grayValues) {
    const gray = Math.round(value)
    bins[Math.min(255, Math.max(0, gray))] += 1
  }
  return Array.from(bins)
}

function smoothHistogram(hist) {
  const smoothed = new Float64Array(hist.length)
  for (let i = 0; i < hist.length; i += 1) {
    const prev = i > 0 ? hist[i - 1] : 0
    const next = i < hist.length - 1 ? hist[i + 1] : 0
    smoothed[i] = (prev + hist[i] + next) / 3
  }
  return Array.from(smoothed)
}

function computeEdgeMask(grayValues, width, height) {
  const edgeMask = new Uint8Array(width * height)
  if (width < 3 || height < 3) {
    return edgeMask
  }

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      let gx = 0
      let gy = 0
      for (let ky = -1; ky <= 1; ky += 1) {
        for (let kx = -1; kx <= 1; kx += 1) {
          const gray = grayValues[(y + ky) * width + (x + kx)]
          const ki = (ky + 1) * 3 + (kx + 1)
          gx += gray * sobelX[ki]
          gy += gray * sobelY[ki]
        }
      }
      if (Math.sqrt(gx * gx + gy * gy) >= SOBEL_THRESHOLD) {
        edgeMask[y * width + x] = 1
      }
    }
  }

  return edgeMask
}

function computeEdgeHistogram(grayValues, edgeMask) {
  const bins = new Float64Array(256)
  for (let i = 0; i < grayValues.length; i += 1) {
    if (edgeMask[i] === 0) {
      continue
    }
    const gray = Math.round(grayValues[i])
    bins[Math.min(255, Math.max(0, gray))] += 1
  }
  return Array.from(bins)
}

function computeSaturatedEdgeHistogram(
  pixelData,
  grayValues,
  edgeMask
) {
  const bins = new Float64Array(256)
  for (let i = 0; i < grayValues.length; i += 1) {
    if (edgeMask[i] === 0) {
      continue
    }

    const idx = i * 4
    const maxChannel = Math.max(pixelData[idx], pixelData[idx + 1], pixelData[idx + 2])
    const minChannel = Math.min(pixelData[idx], pixelData[idx + 1], pixelData[idx + 2])
    if (maxChannel - minChannel < SATURATED_EDGE_THRESHOLD) {
      continue
    }

    const gray = Math.round(grayValues[i])
    bins[Math.min(255, Math.max(0, gray))] += 1
  }
  return Array.from(bins)
}

function pushSeparatedPeak(peaks, bin) {
  if (peaks.every(peak => Math.abs(peak - bin) >= MIN_PEAK_GAP)) {
    peaks.push(bin)
    return true
  }
  return false
}

function findCandidatePeaks(
  hist,
  edgeHist,
  saturatedEdgeHist,
  pixelCount
) {
  const rankedByArea = hist
    .map((count, bin) => ({ bin, count }))
    .sort((a, b) => b.count - a.count)
  const rankedByEdge = edgeHist
    .map((count, bin) => ({ bin, count }))
    .sort((a, b) => b.count - a.count)
  const minCount = Math.max(2, pixelCount * 0.003)
  const peaks = []

  const dominant = rankedByArea[0]
  if (dominant && dominant.count >= minCount) {
    pushSeparatedPeak(peaks, dominant.bin)
  }
  const backgroundPeak = dominant?.bin ?? 128
  const rankedBySaturatedEdge = saturatedEdgeHist
    .map((count, bin) => {
      const backgroundGap = Math.abs(bin - backgroundPeak)
      return {
        bin,
        count,
        score: count * (1 + Math.min(3, backgroundGap / 32)),
      }
    })
    .sort((a, b) => b.score - a.score)
  for (const item of rankedByEdge) {
    if (item.count <= 0) break
    if (pushSeparatedPeak(peaks, item.bin)) break
  }
  for (const item of rankedBySaturatedEdge) {
    if (item.count <= 0) break
    if (Math.abs(item.bin - backgroundPeak) < SATURATED_EDGE_BACKGROUND_GAP) continue
    if (pushSeparatedPeak(peaks, item.bin)) break
    if (peaks.length >= MAX_TEXT_COLOR_CANDIDATES) break
  }

  const rankedByCombined = hist
    .map((count, bin) => ({ bin, count, score: count + edgeHist[bin] * 4 }))
    .sort((a, b) => b.score - a.score)
  for (const item of rankedByCombined) {
    if (item.count < minCount) break
    pushSeparatedPeak(peaks, item.bin)
    if (peaks.length >= MAX_TEXT_COLOR_CANDIDATES) break
  }

  return peaks
}

function nearestPeakIndex(value, peaks) {
  let nearest = -1
  let nearestDistance = Number.POSITIVE_INFINITY
  for (let i = 0; i < peaks.length; i += 1) {
    const distance = Math.abs(value - peaks[i])
    if (distance < nearestDistance) {
      nearest = i
      nearestDistance = distance
    }
  }
  return nearestDistance <= PEAK_SAMPLE_RADIUS ? nearest : -1
}

function buildPixelCandidates(
  pixelData,
  width,
  height,
  grayValues,
  edgeMask,
  peaks
) {
  const pixelCount = width * height
  const assignments = new Int8Array(pixelCount)
  assignments.fill(-1)
  const sums = peaks.map(() => ({
    r: 0,
    g: 0,
    b: 0,
    count: 0,
    borderCount: 0,
    edgeCount: 0,
  }))
  const borderBand = Math.max(1, Math.min(4, Math.floor(Math.min(width, height) * 0.08)))
  let borderPixelCount = 0

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixelIndex = y * width + x
      const borderPixel =
        x < borderBand ||
        y < borderBand ||
        x >= width - borderBand ||
        y >= height - borderBand
      if (borderPixel) borderPixelCount += 1

      const candidateIndex = nearestPeakIndex(grayValues[pixelIndex], peaks)
      if (candidateIndex < 0) continue

      const idx = pixelIndex * 4
      assignments[pixelIndex] = candidateIndex
      sums[candidateIndex].r += pixelData[idx]
      sums[candidateIndex].g += pixelData[idx + 1]
      sums[candidateIndex].b += pixelData[idx + 2]
      sums[candidateIndex].count += 1
      if (borderPixel) sums[candidateIndex].borderCount += 1
      if (edgeMask[pixelIndex] > 0) sums[candidateIndex].edgeCount += 1
    }
  }

  const cornerColor = sampleCornerBgColor(pixelData, width, height)
  const candidates = sums
    .map((sum, index) => {
      if (sum.count === 0) return null
      const color = [
        clampByte(sum.r / sum.count),
        clampByte(sum.g / sum.count),
        clampByte(sum.b / sum.count),
      ]
      return {
        peak: peaks[index],
        color,
        count: sum.count,
        ratio: sum.count / pixelCount,
        borderShare: borderPixelCount > 0 ? sum.borderCount / borderPixelCount : 0,
        edgeRatio: sum.edgeCount / sum.count,
        cornerDistance: rgbDistance(color, cornerColor),
        backgroundContactRatio: 0,
        textContactRatio: 0,
      }
    })
    .filter(candidate => candidate !== null)

  return { candidates, assignments }
}

function scoreBackgroundCandidate(candidate) {
  const cornerSimilarity = 1 - Math.min(1, candidate.cornerDistance / 180)
  return candidate.ratio * 1.45 +
    candidate.borderShare * 1.0 +
    cornerSimilarity * 0.35 -
    candidate.edgeRatio * 0.3
}

function scoreStrokeCandidate(candidate) {
  const smallCandidateBonus = 1 - Math.min(1, candidate.ratio * 4)
  return candidate.backgroundContactRatio * 0.75 +
    candidate.textContactRatio * 0.45 +
    candidate.edgeRatio * 0.65 +
    smallCandidateBonus * 0.15
}

function scoreFillCandidate(candidate, stroke) {
  return rgbDistance(candidate.color, stroke.color) * 0.006 +
    candidate.ratio * 0.35 -
    candidate.backgroundContactRatio * 0.2
}

function scoreRolePair(fill, stroke, background) {
  let score = scoreStrokeCandidate(stroke) + scoreFillCandidate(fill, stroke)
  if (
    fill.peak >= 220 &&
    stroke.peak <= fill.peak - 40 &&
    fill.backgroundContactRatio < stroke.backgroundContactRatio &&
    fill.ratio <= stroke.ratio * BRIGHT_FILL_MAX_STROKE_RATIO
  ) {
    score += 1.4
  }
  if (
    stroke.peak >= 220 &&
    fill.peak <= stroke.peak - 40 &&
    stroke.backgroundContactRatio > fill.backgroundContactRatio
  ) {
    score += 1.2
  }
  if (
    fill.peak >= 220 &&
    stroke.peak <= fill.peak - 40 &&
    (
      fill.backgroundContactRatio >= stroke.backgroundContactRatio ||
      fill.ratio > stroke.ratio * BRIGHT_FILL_MAX_STROKE_RATIO
    )
  ) {
    score -= 1.2
  }
  if (fill.peak <= 80 && background.peak >= 180 && stroke.peak >= fill.peak + 40) score += 0.35
  if (fill.ratio >= stroke.ratio) score += 0.2
  if (stroke.backgroundContactRatio > fill.backgroundContactRatio) score += 0.35
  return score
}

function addCandidateContacts(
  candidates,
  assignments,
  width,
  height,
  backgroundIndex
) {
  const backgroundContacts = new Array(candidates.length).fill(0)
  const textContacts = new Array(candidates.length).fill(0)

  const visitPair = (a, b) => {
    if (a < 0 || b < 0 || a === b) return
    if (a === backgroundIndex) {
      backgroundContacts[b] += 1
      return
    }
    if (b === backgroundIndex) {
      backgroundContacts[a] += 1
      return
    }
    textContacts[a] += 1
    textContacts[b] += 1
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const current = assignments[y * width + x]
      if (x + 1 < width) visitPair(current, assignments[y * width + x + 1])
      if (y + 1 < height) visitPair(current, assignments[(y + 1) * width + x])
    }
  }

  for (let i = 0; i < candidates.length; i += 1) {
    const count = Math.max(1, candidates[i].count)
    candidates[i].backgroundContactRatio = backgroundContacts[i] / count
    candidates[i].textContactRatio = textContacts[i] / count
  }
}

function chooseOutlinedBrightFill(textCandidates, background) {
  const brightFill = textCandidates.find(candidate => candidate.peak >= 220)
  const outlineCandidates = brightFill && background.peak < 220
    ? textCandidates.filter(candidate => (
      candidate !== brightFill &&
        candidate.peak <= brightFill.peak - 40
    ))
    : []
  if (!brightFill || outlineCandidates.length === 0) return null

  let stroke = outlineCandidates[0]
  let strokeScore = Number.NEGATIVE_INFINITY
  for (const candidate of outlineCandidates) {
    const score = scoreStrokeCandidate(candidate)
    if (score > strokeScore) {
      strokeScore = score
      stroke = candidate
    }
  }
  if (brightFill.backgroundContactRatio >= stroke.backgroundContactRatio) {
    return null
  }
  if (brightFill.ratio > stroke.ratio * BRIGHT_FILL_MAX_STROKE_RATIO) {
    return null
  }
  return { fill: brightFill, stroke }
}

function chooseTextRoles(textCandidates, background) {
  const outlinedBright = chooseOutlinedBrightFill(textCandidates, background)
  if (outlinedBright) return outlinedBright

  let fill = textCandidates[0]
  let stroke = textCandidates[1]
  let bestPairScore = Number.NEGATIVE_INFINITY
  for (const fillCandidate of textCandidates) {
    for (const strokeCandidate of textCandidates) {
      if (fillCandidate === strokeCandidate) continue
      const score = scoreRolePair(fillCandidate, strokeCandidate, background)
      if (score > bestPairScore) {
        bestPairScore = score
        fill = fillCandidate
        stroke = strokeCandidate
      }
    }
  }
  return { fill, stroke }
}

function chooseStrokeOutput(
  fill,
  stroke,
  background
) {
  if (
    background.peak >= 220 &&
    fill.peak <= 200 &&
    rgbDistance(fill.color, background.color) >= 80
  ) {
    return background
  }
  return stroke
}

/**
 * Unified pixel candidate sampler for OCR text colors.
 * Returns text fill as fgColor and outline/background stroke as bgColor.
 * @param {Uint8ClampedArray} pixelData
 * @param {number} width
 * @param {number} height
 * @returns {{ fgColor: RgbColor, bgColor: RgbColor } | null}
 */
export function sampleTextColors(pixelData, width, height) {
  const pixelCount = width * height
  if (pixelCount < 8) return null

  const grayValues = computeGrayValues(pixelData, pixelCount)
  const edgeMask = computeEdgeMask(grayValues, width, height)
  const rawHist = computeGrayHistogram(grayValues)
  const smoothed = smoothHistogram(smoothHistogram(rawHist))
  const edgeHist = computeEdgeHistogram(grayValues, edgeMask)
  const saturatedEdgeHist = computeSaturatedEdgeHistogram(pixelData, grayValues, edgeMask)
  const peaks = findCandidatePeaks(smoothed, edgeHist, saturatedEdgeHist, pixelCount)
  if (peaks.length < 2) return null

  const { candidates, assignments } = buildPixelCandidates(
    pixelData,
    width,
    height,
    grayValues,
    edgeMask,
    peaks
  )
  if (candidates.length < 2) return null

  let backgroundIndex = 0
  let backgroundScore = Number.NEGATIVE_INFINITY
  for (let i = 0; i < candidates.length; i += 1) {
    const score = scoreBackgroundCandidate(candidates[i])
    if (score > backgroundScore) {
      backgroundScore = score
      backgroundIndex = i
    }
  }

  addCandidateContacts(candidates, assignments, width, height, backgroundIndex)

  const background = candidates[backgroundIndex]
  const textCandidates = candidates.filter((_, index) => index !== backgroundIndex)
  if (textCandidates.length === 0) return null
  if (textCandidates.length === 1) {
    return { fgColor: textCandidates[0].color, bgColor: background.color }
  }

  const { fill, stroke } = chooseTextRoles(textCandidates, background)
  const strokeOutput = chooseStrokeOutput(fill, stroke, background)
  return { fgColor: fill.color, bgColor: strokeOutput.color }
}
