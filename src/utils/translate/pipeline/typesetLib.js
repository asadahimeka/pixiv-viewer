/**
 * @file Typesetting library — font measurement and text fitting utilities
 *
 * Provides low-level Canvas-based text metrics and CJK-aware line breaking.
 * All font sizes are in pixels; font strings use the CSS font shorthand.
 */

import { adjustLineBreakForKinsoku } from './typesetKinsoku.js'

/** Default font stack for CJK text rendering (system fonts only) */
export const FONT_STACK = [
  '"Noto Sans SC"',
  '"Microsoft YaHei"',
  '"Hiragino Sans GB"',
  '"Source Han Sans SC"',
  'sans-serif',
]

const DEFAULT_FONT_FAMILY = FONT_STACK.join(', ')

// ── CJK detection ──────────────────────────────────────────────

/**
 * Check if a character belongs to CJK (Chinese / Japanese / Korean) scripts
 * or fullwidth forms that should be treated as atomic break candidates.
 * @param {string} char - Single character
 * @returns {boolean}
 */
function isCJK(char) {
  const code = char.charCodeAt(0)
  return (
    (code >= 0x2E80 && code <= 0x2EFF) || // CJK Radicals
    (code >= 0x3000 && code <= 0x303F) || // CJK Symbols and Punctuation
    (code >= 0x3040 && code <= 0x309F) || // Hiragana
    (code >= 0x30A0 && code <= 0x30FF) || // Katakana
    (code >= 0x3400 && code <= 0x4DBF) || // CJK Unified Extension A
    (code >= 0x4E00 && code <= 0x9FFF) || // CJK Unified Ideographs
    (code >= 0xF900 && code <= 0xFAFF) || // CJK Compatibility
    (code >= 0xAC00 && code <= 0xD7AF) || // Hangul Syllables
    (code >= 0xFF00 && code <= 0xFFEF) // Fullwidth Forms
  )
}

// ── Canvas helpers ─────────────────────────────────────────────

/**
 * Obtain a throwaway Canvas2D context for measurement.
 * Cached after first call to avoid repeated element creation.
 * @returns {CanvasRenderingContext2D}
 */
let _measureCtx = null
function getMeasureCtx() {
  if (!_measureCtx) {
    _measureCtx = document.createElement('canvas').getContext('2d')
  }
  return _measureCtx
}

/**
 * Measure the width of text when rendered with a given CSS font string.
 * Creates an offscreen canvas context for measurement.
 *
 * @param {string} text - Text to measure
 * @param {string} font - CSS font shorthand (e.g. '14px "Noto Sans SC"')
 * @returns {number} Width in pixels
 */
export function measureTextWidth(text, font) {
  const ctx = getMeasureCtx()
  ctx.font = font
  return ctx.measureText(text).width
}

/**
 * Build a CSS font shorthand string from size and optional family override.
 *
 * @param {number} sizePx - Font size in pixels
 * @param {string} [fontFamily] - Font family override (defaults to FONT_STACK)
 * @returns {string}
 */
export function buildFontString(sizePx, fontFamily) {
  const family = fontFamily || DEFAULT_FONT_FAMILY
  return `${sizePx}px ${family}`
}

/**
 * Estimate a font size that fits the given region height for a target number of lines.
 * Uses an 85% fill ratio so text doesn't press against region edges.
 *
 * @param {number} regionHeight - Available height in pixels
 * @param {number} [targetLineCount=1] - Number of lines expected
 * @returns {number} Font size in px (floored to integer)
 */
export function calcFontSize(regionHeight, targetLineCount = 1) {
  const lineCount = Math.max(1, targetLineCount)
  return Math.floor((regionHeight / lineCount) * 0.85)
}

/**
 * Fit text to a maximum width by word-wrapping, CJK-aware.
 *
 * Rules:
 *  - CJK characters are treated as individual break opportunities.
 *  - Latin text breaks at word boundaries (spaces).
 *  - If a single character exceeds maxWidth it is allowed to overflow
 *    (prevents empty lines / infinite loops).
 *
 * @param {string} text - Text to fit
 * @param {number} maxWidth - Maximum line width in px
 * @param {string} font - CSS font string for measurement
 * @returns {string[]} Array of lines
 */
export function fitTextToWidth(text, maxWidth, font) {
  if (!text) return []

  const lines = []
  let currentLine = ''

  for (const char of text) {
    const testLine = currentLine + char
    const testWidth = measureTextWidth(testLine, font)

    if (testWidth <= maxWidth) {
      currentLine = testLine
      continue
    }

    // Line would overflow — decide where to break
    if (currentLine === '') {
      // Single character is already too wide — allow it
      lines.push(char)
      continue
    }

    // For non-CJK text, try breaking at last word boundary
    if (!isCJK(char) && char !== ' ') {
      const lastSpace = currentLine.lastIndexOf(' ')
      if (lastSpace >= 0) {
        lines.push(currentLine.substring(0, lastSpace))
        currentLine = currentLine.substring(lastSpace + 1) + char
        continue
      }
    }

    // Default: break before current character (natural for CJK)
    lines.push(currentLine)
    currentLine = char
  }

  // Flush remaining line
  if (currentLine) {
    lines.push(currentLine)
  }

  // Apply kinsoku adjustments — fix prohibited line-start/end characters
  return adjustLineBreakForKinsoku(lines, text => measureTextWidth(text, font), maxWidth)
}

// Binary search font fitting adapted from ShinobuTranslator src/pipeline/typeset/renderHorizontal.ts
/**
 * Binary search for the largest font size that fits text in the given width and height.
 *
 * Measures text width at each candidate size, splits into lines using
 * the existing fitTextToWidth, and checks total height against maxHeight.
 *
 * @param {string} text - Text to measure
 * @param {number} maxWidth - Maximum line width in pixels
 * @param {number} maxHeight - Maximum total text height in pixels
 * @param {string} fontFamily - Font family string
 * @param {Object} [options]
 * @param {number} [options.minSize=6] - Minimum font size to try
 * @param {number} [options.maxSize=96] - Maximum font size to try
 * @param {number} [options.lineHeight=1.2] - Line height multiplier
 * @param {number} [options.precision=1] - Precision in pixels (stop when range < this)
 * @returns {number} Best font size in pixels
 */
export function binarySearchFontSize(text, maxWidth, maxHeight, fontFamily, options = {}) {
  const {
    minSize = 6,
    maxSize = 96,
    lineHeight = 1.2,
    precision = 1,
  } = options

  let low = minSize
  let high = maxSize
  let best = minSize

  while (high - low > precision) {
    const mid = Math.floor((low + high) / 2)
    const font = buildFontString(mid, fontFamily)
    const lines = fitTextToWidth(text, maxWidth, font)
    if (lines.length === 0) {
      high = mid
      continue
    }
    const totalHeight = lines.length * mid * lineHeight
    if (totalHeight <= maxHeight) {
      best = mid
      low = mid
    } else {
      high = mid
    }
  }

  return best
}
