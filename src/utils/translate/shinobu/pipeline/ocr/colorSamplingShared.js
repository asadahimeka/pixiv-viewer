/**
 * @file Shared color sampling utilities for OCR text regions.
 *
 * Mechanically converted from ShinobuTranslator
 * `src/pipeline/ocr/colorSamplingShared.ts` (TS → JS).
 */

/**
 * RGB color triplet [R, G, B] in [0, 255].
 * @typedef {[number, number, number]} RgbColor
 */
export const RgbColor = {}

/**
 * Grayscale value at pixel index using weighted formula.
 * @param {Uint8ClampedArray} data - Pixel data
 * @param {number} idx - Start index of the pixel (4 × pixel offset)
 * @returns {number} Grayscale value [0, 255]
 */
export function grayAt(data, idx) {
  return 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]
}

/**
 * Sample background color by averaging the four corner pixels.
 * Always returns a valid color.
 * @param {Uint8ClampedArray} pixelData
 * @param {number} width
 * @param {number} height
 * @returns {RgbColor}
 */
export function sampleCornerBgColor(pixelData, width, height) {
  const corners = [
    (0 * width + 0) * 4,
    (0 * width + (width - 1)) * 4,
    ((height - 1) * width + 0) * 4,
    ((height - 1) * width + (width - 1)) * 4,
  ]

  let sumR = 0
  let sumG = 0
  let sumB = 0
  for (const idx of corners) {
    sumR += pixelData[idx]
    sumG += pixelData[idx + 1]
    sumB += pixelData[idx + 2]
  }

  return [Math.round(sumR / 4), Math.round(sumG / 4), Math.round(sumB / 4)]
}
