/**
 * @file Color utilities (RGB→CIELAB, color distance, fg/bg resolution).
 *
 * Source: ShinobuTranslator `src/pipeline/typeset/color.ts` (78 lines)
 * Mechanical TS→JS conversion.
 */

// ---------------------------------------------------------------------------
// CIELAB color space conversion
// ---------------------------------------------------------------------------

/**
 * Convert sRGB [0,255] to CIELAB.
 * Uses D65 illuminant reference white.
 *
 * @param {number} r — red (0–255)
 * @param {number} g — green (0–255)
 * @param {number} b — blue (0–255)
 * @returns {[number, number, number]} — [L*, a*, b*]
 */
export function rgbToLab(r, g, b) {
  // sRGB -> linear
  let rl = r / 255
  let gl = g / 255
  let bl = b / 255
  rl = rl > 0.04045 ? ((rl + 0.055) / 1.055) ** 2.4 : rl / 12.92
  gl = gl > 0.04045 ? ((gl + 0.055) / 1.055) ** 2.4 : gl / 12.92
  bl = bl > 0.04045 ? ((bl + 0.055) / 1.055) ** 2.4 : bl / 12.92

  // Linear sRGB -> XYZ (D65)
  let x = (rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375) / 0.95047
  let y = rl * 0.2126729 + gl * 0.7151522 + bl * 0.0721750
  let z = (rl * 0.0193339 + gl * 0.1191920 + bl * 0.9503041) / 1.08883

  // XYZ -> Lab
  const f = t => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
  x = f(x)
  y = f(y)
  z = f(z)

  return [116 * y - 16, 500 * (x - y), 200 * (y - z)]
}

// ---------------------------------------------------------------------------
// Color difference
// ---------------------------------------------------------------------------

/**
 * CIE76 color difference (Euclidean distance in CIELAB space).
 *
 * @param {[number, number, number]} c1 — RGB tuple
 * @param {[number, number, number]} c2 — RGB tuple
 * @returns {number} — DeltaE (CIE76)
 */
export function colorDistance(c1, c2) {
  const lab1 = rgbToLab(c1[0], c1[1], c1[2])
  const lab2 = rgbToLab(c2[0], c2[1], c2[2])
  return Math.sqrt(
    (lab1[0] - lab2[0]) ** 2 +
    (lab1[1] - lab2[1]) ** 2 +
    (lab1[2] - lab2[2]) ** 2
  )
}

// ---------------------------------------------------------------------------
// Foreground/background color resolution
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} ResolvedColors
 * @property {string} fg — CSS color string (e.g. "rgb(17,17,17)")
 * @property {string} bg — CSS color string (e.g. "rgb(255,255,255)")
 * @property {[number, number, number]} fgRgb — foreground RGB
 * @property {[number, number, number]} bgRgb — background RGB
 */
export const ResolvedColors = {}

/**
 * Resolve foreground/background colors for a region.
 * Applies CIE76 contrast check — if fg and bg are too similar (DeltaE < 30),
 * force bg to white (if fg is dark) or black (if fg is light).
 * Ported from manga-image-translator's fg_bg_compare().
 *
 * @param {[number, number, number]} [fgColor] — detected foreground color
 * @param {[number, number, number]} [bgColor] — detected background color
 * @returns {ResolvedColors}
 */
export function resolveColors(fgColor, bgColor) {
  /** @type {[number, number, number]} */
  const fg = fgColor ? [...fgColor] : [17, 17, 17]
  /** @type {[number, number, number]} */
  let bg = bgColor ? [...bgColor] : [255, 255, 255]

  if (colorDistance(fg, bg) < 30) {
    const fgAvg = (fg[0] + fg[1] + fg[2]) / 3
    bg = fgAvg <= 127 ? [255, 255, 255] : [0, 0, 0]
  }

  return {
    fg: `rgb(${fg[0]},${fg[1]},${fg[2]})`,
    bg: `rgb(${bg[0]},${bg[1]},${bg[2]})`,
    fgRgb: fg,
    bgRgb: bg,
  }
}
