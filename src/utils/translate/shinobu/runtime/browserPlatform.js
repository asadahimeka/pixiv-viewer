/**
 * @file Browser PlatformProvider — uses native DOM APIs.
 *
 * All methods are trivial wrappers around document.createElement, etc.
 * The DOM types (HTMLCanvasElement, HTMLImageElement) structurally
 * satisfy PipelineCanvas / PipelineImage, so we return them directly.
 *
 * Mechanically converted from ShinobuTranslator `src/runtime/browserPlatform.ts`
 * (TS → JS). The PlatformProvider typedef lives in ./platform.js; the import
 * below is doc-only.
 */

/** @typedef {import('./platform.js').PlatformProvider} PlatformProvider */

/**
 * Browser PlatformProvider: native canvas / Image / ImageData via DOM APIs.
 *
 * @type {PlatformProvider}
 */
export const browserPlatform = {
  createCanvas(width, height) {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    return canvas
  },

  createImage() {
    return new Image()
  },

  loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = src
    })
  },

  createImageData(width, height) {
    return new ImageData(width, height)
  },

  registerFont(_path, _family) {
    // Browser loads fonts via CSS; no manual registration needed.
  },

  waitForFonts() {
    return document.fonts.ready.then(() => {})
  },
}
