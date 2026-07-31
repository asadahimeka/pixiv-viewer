/**
 * @file Canvas typesetting engine for manga translation pipeline
 *
 * Provides vertical text rendering, reading order sorting,
 * and text color detection for typesetting translated text
 * onto manga images.
 */

import { calcFontSize, buildFontString, fitTextToWidth, measureTextWidth, binarySearchFontSize } from './typesetLib.js'

/**
 * Default gap between vertical columns in pixels
 */
const DEFAULT_COLUMN_GAP = 4

/**
 * Minimum font size threshold — skip rendering below this
 */
const MIN_FONT_SIZE = 6

/**
 * Draw vertical translated text (top-to-bottom, right-to-left column progression).
 *
 * Characters are arranged one-per-line in vertical columns.
 * Columns progress right-to-left (manga style).
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('./types').TextRegion} region
 * @param {string} translatedText
 * @param {Object} [options]
 * @param {number} [options.fontSize] - Font size in px
 * @param {number} [options.columnGap] - Gap between columns in px (default: 4)
 */
export function drawTypesetVertical(ctx, region, translatedText, options = {}) {
  if (!translatedText || translatedText.length === 0) return

  const {
    fontSize: explicitFontSize,
    columnGap = DEFAULT_COLUMN_GAP,
  } = options

  const { textColor: resolvedColor, bgColor: resolvedBg } = resolveTextColors(region)

  const { box } = region
  const padding = 4

  const availWidth = box.width - padding * 2
  const availHeight = box.height - padding * 2

  if (availWidth <= 0 || availHeight <= 0) return

  // For vertical text, the constraint is height (characters stack vertically)
  // Each character occupies approximately fontSize x fontSize space
  let fontSize
  if (explicitFontSize) {
    fontSize = explicitFontSize
  } else {
    // Estimate: fit characters vertically based on height
    fontSize = Math.min(
      availHeight / translatedText.length,
      availWidth,
      48
    )
    fontSize = Math.max(MIN_FONT_SIZE, Math.floor(fontSize))
  }

  if (fontSize < MIN_FONT_SIZE) return

  const font = buildFontString(fontSize)

  // Draw background for readability
  if (resolvedBg) {
    ctx.save()
    ctx.fillStyle = resolvedBg
    ctx.fillRect(box.x, box.y, box.width, box.height)
    ctx.restore()
  }

  ctx.save()
  ctx.font = font
  ctx.fillStyle = resolvedColor
  ctx.textBaseline = 'top'
  ctx.textAlign = 'center'

  // Setup stroke (outline) for readability — drawn before fill
  ctx.strokeStyle = resolvedBg && isColorDark(resolvedBg) ? '#000000' : '#FFFFFF'
  ctx.lineWidth = fontSize * 0.07
  ctx.lineJoin = 'round'

  // Calculate layout
  const charHeight = fontSize * 1.1 // line height with slight spacing
  const charsPerColumn = Math.floor(availHeight / charHeight)
  if (charsPerColumn < 1) {
    ctx.restore()
    return
  }

  const columnWidth = fontSize + columnGap
  const totalColumns = Math.ceil(translatedText.length / charsPerColumn)

  // Start position: rightmost column (right-to-left progression)
  // Center the text block horizontally within the region
  const startX = box.x + box.width - padding - columnWidth / 2
  const startY = box.y + padding

  for (let col = 0; col < totalColumns; col++) {
    const colStartIdx = col * charsPerColumn
    const colEndIdx = Math.min(colStartIdx + charsPerColumn, translatedText.length)
    const colText = translatedText.slice(colStartIdx, colEndIdx)

    // X position: right-to-left, so column 0 is rightmost
    const colX = startX - col * columnWidth

    for (let row = 0; row < colText.length; row++) {
      const char = colText[row]
      const charY = startY + row * charHeight
      ctx.strokeText(char, colX, charY)
      ctx.fillText(char, colX, charY)
    }
  }

  ctx.restore()
}

/**
 * Draw horizontal translated text onto a canvas within a text region.
 *
 * Renders white text on a dark semi-transparent background rect for
 * readability. Font size auto-fits to the region; text wraps CJK-aware.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('./types').TextRegion} region
 * @param {string} translatedText
 * @param {Object} [options]
 * @param {string} [options.fontFamily] - Font family override
 * @param {'left'|'center'} [options.align] - Text alignment (default: 'center')
 * @param {number} [options.fontSize] - Explicit font size (auto-calc if not set)
 * @param {number} [options.lineHeight] - Line height multiplier (default: 1.2)
 * @param {number} [options.padding] - Padding inside region (default: 2)
 */
export function drawTypesetHorizontal(ctx, region, translatedText, options = {}) {
  if (!translatedText || translatedText.length === 0) return

  const {
    fontFamily,
    align = 'center',
    fontSize: explicitFontSize,
    lineHeight = 1.2,
    padding = 2,
  } = options

  const { textColor: resolvedColor, bgColor: resolvedBg } = resolveTextColors(region)

  const { box } = region
  const contentWidth = box.width - padding * 2
  const contentHeight = box.height - padding * 2

  if (contentWidth <= 0 || contentHeight <= 0) return

  // ── Determine font size ─────────────────────────────────────

  let currentFontSize
  if (explicitFontSize) {
    currentFontSize = explicitFontSize
  } else {
    // Estimate line count from text length vs average char width (~14px at 16px font)
    const avgCharWidth = 14
    const estCharsPerLine = Math.max(1, Math.floor(contentWidth / avgCharWidth))
    const estimatedLines = Math.max(1, Math.ceil(translatedText.length / estCharsPerLine))
    currentFontSize = calcFontSize(contentHeight, estimatedLines)
  }

  // ── Fit text with binary search font sizing ─────────────────
  currentFontSize = binarySearchFontSize(
    translatedText,
    contentWidth,
    contentHeight,
    fontFamily,
    { minSize: MIN_FONT_SIZE, maxSize: currentFontSize, lineHeight }
  )
  const font = buildFontString(currentFontSize, fontFamily)
  const lines = fitTextToWidth(translatedText, contentWidth, font)

  if (currentFontSize < MIN_FONT_SIZE || lines.length === 0) return

  // ── Render ──────────────────────────────────────────────────

  ctx.save()
  ctx.font = font
  ctx.textBaseline = 'top'

  // Draw background for readability
  if (resolvedBg) {
    ctx.fillStyle = resolvedBg
    ctx.fillRect(box.x, box.y, box.width, box.height)
  }

  // Calculate vertical start position (centered)
  const totalTextHeight = lines.length * currentFontSize * lineHeight
  const startY = box.y + padding + (contentHeight - totalTextHeight) / 2

  // Draw each line
  ctx.fillStyle = resolvedColor

  // Setup stroke (outline) for readability — drawn before fill
  ctx.strokeStyle = resolvedBg && isColorDark(resolvedBg) ? '#000000' : '#FFFFFF'
  ctx.lineWidth = currentFontSize * 0.07
  ctx.lineJoin = 'round'

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    let x
    if (align === 'left') {
      x = box.x + padding
    } else {
      // center
      const lineWidth = measureTextWidth(line, font)
      x = box.x + padding + (contentWidth - lineWidth) / 2
    }
    const y = startY + i * currentFontSize * lineHeight
    ctx.strokeText(line, x, y)
    ctx.fillText(line, x, y)
  }

  ctx.restore()
}

/**
 * Determine text color and background for a region.
 *
 * Uses OCR-provided colors when available, otherwise falls back
 * to readable contrast defaults.
 *
 * @param {import('./types').TextRegion} region
 * @returns {{ textColor: string, bgColor: string }}
 */
export function resolveTextColors(region) {
  const { fgColor, bgColor } = region

  if (fgColor && bgColor) {
    // Use OCR-provided colors
    const isBgDark = isColorDark(bgColor)
    return {
      textColor: isBgDark ? '#FFFFFF' : '#000000',
      bgColor,
    }
  }

  if (fgColor) {
    const isFgDark = isColorDark(fgColor)
    return {
      textColor: fgColor,
      bgColor: isFgDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
    }
  }

  if (bgColor) {
    const isBgDark = isColorDark(bgColor)
    return {
      textColor: isBgDark ? '#FFFFFF' : '#000000',
      bgColor,
    }
  }

  // Default fallback: white text on dark semi-transparent background
  return {
    textColor: '#FFFFFF',
    bgColor: 'rgba(0,0,0,0.6)',
  }
}

/**
 * Check if a CSS color string represents a dark color.
 *
 * Supports hex (#RGB, #RRGGBB) and rgba() formats.
 *
 * @param {string} color - CSS color string
 * @returns {boolean} True if the color is dark
 */
function isColorDark(color) {
  if (!color) return true

  let r = 0; let g = 0; let b = 0

  if (color.startsWith('#')) {
    const hex = color.slice(1)
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16)
      g = parseInt(hex[1] + hex[1], 16)
      b = parseInt(hex[2] + hex[2], 16)
    } else if (hex.length >= 6) {
      r = parseInt(hex.slice(0, 2), 16)
      g = parseInt(hex.slice(2, 4), 16)
      b = parseInt(hex.slice(4, 6), 16)
    }
  } else if (color.startsWith('rgba') || color.startsWith('rgb')) {
    const matches = color.match(/\d+/g)
    if (matches && matches.length >= 3) {
      r = parseInt(matches[0], 10)
      g = parseInt(matches[1], 10)
      b = parseInt(matches[2], 10)
    }
  }

  // Relative luminance approximation
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance < 0.5
}

/**
 * Ensure system fonts are loaded before typesetting.
 *
 * Waits for `document.fonts.ready` to guarantee font metrics
 * are available for measurement. No-op for built-in system fonts
 * but ensures they are fully loaded before rendering.
 *
 * @returns {Promise<void>}
 */
export async function registerFonts() {
  if (typeof document !== 'undefined' && document.fonts) {
    await document.fonts.ready
  }
}
