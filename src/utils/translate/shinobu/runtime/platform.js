/**
 * @file Platform abstraction layer for pipeline Canvas/Image operations.
 *
 * Pipeline code uses ~20 methods from the Canvas API and a handful
 * of image/font helpers. Rather than mirroring the full HTML Canvas
 * interface (50+ methods), we define structural types covering only
 * the methods pipeline actually uses. This keeps the Node
 * implementation lightweight.
 *
 * Mechanically converted from ShinobuTranslator `src/runtime/platform.ts`
 * (TS → JS): interfaces → JSDoc @typedef + placeholder exports.
 */

// ---------------------------------------------------------------------------
// Structural types — only what pipeline uses
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} PipelineCanvas
 * @property {number} width
 * @property {number} height
 * @property {function('2d', Object=): PipelineRenderingContext|null} getContext - Get 2D rendering context
 * @property {function(string=): string} toDataURL - Serialize canvas to data URL
 */
export const PipelineCanvas = {}

/**
 * @typedef {Object} PipelineRenderingContext
 * @property {function(any, ...number): void} drawImage - Draw image
 * @property {function(string, number, number, number=): void} fillText - Fill text
 * @property {function(string, number, number): void} strokeText - Stroke text
 * @property {function(PipelineImageData, number, number): void} putImageData - Put image data
 * @property {function(number, number, number, number): PipelineImageData} getImageData - Get image data
 * @property {function(number, number): PipelineImageData} createImageData - Create image data
 * @property {function(number, number, number, number): void} fillRect - Fill rect
 * @property {function(number, number, number, number): void} clearRect - Clear rect
 * @property {function(number, number, number, number): void} strokeRect - Stroke rect
 * @property {function(): void} beginPath - Begin path
 * @property {function(number, number): void} moveTo - Move to
 * @property {function(number, number): void} lineTo - Line to
 * @property {function(): void} closePath - Close path
 * @property {function(number, number, number, number): void} rect - Add rect path
 * @property {function(): void} fill - Fill path
 * @property {function(): void} stroke - Stroke path
 * @property {function(): void} save - Save state
 * @property {function(): void} restore - Restore state
 * @property {function(number, number): void} translate - Translate
 * @property {function(number): void} rotate - Rotate
 * @property {function(number, number): void} scale - Scale
 * @property {function(Array<number>): void} setLineDash - Set line dash
 * @property {function(string): PipelineTextMetrics} measureText - Measure text
 * @property {string|CanvasGradient|CanvasPattern} fillStyle
 * @property {string|CanvasGradient|CanvasPattern} strokeStyle
 * @property {string} globalCompositeOperation
 * @property {number} lineWidth
 * @property {string} font
 * @property {number} globalAlpha
 * @property {string} textAlign
 * @property {string} textBaseline
 * @property {string} lineJoin
 * @property {number} miterLimit
 * @property {boolean} imageSmoothingEnabled
 */
export const PipelineRenderingContext = {}

/**
 * @typedef {Object} PipelineTextMetrics
 * @property {number} width
 * @property {number} [actualBoundingBoxLeft] - browser: actualBoundingBox*; node-canvas: only width. Optional so node-canvas (which only returns width) still satisfies the structural type without extra stubs.
 * @property {number} [actualBoundingBoxRight]
 * @property {number} [actualBoundingBoxAscent]
 * @property {number} [actualBoundingBoxDescent]
 * @property {number} [fontBoundingBoxAscent]
 * @property {number} [fontBoundingBoxDescent]
 */
export const PipelineTextMetrics = {}

/**
 * @typedef {Object} PipelineImageData
 * @property {number} width
 * @property {number} height
 * @property {Uint8ClampedArray} data
 */
export const PipelineImageData = {}

/**
 * @typedef {Object} PipelineImage
 * @property {string} src
 * @property {number} naturalWidth
 * @property {number} naturalHeight
 * @property {?function(any): any} onload
 * @property {?function(any): any} onerror
 */
export const PipelineImage = {}

// ---------------------------------------------------------------------------
// PlatformProvider — factory interface
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} PlatformProvider
 * @property {function(number, number): PipelineCanvas} createCanvas - Create an empty canvas with the given dimensions.
 * @property {function(): PipelineImage} createImage - Create an empty image object. Set src, then wait for onload.
 * @property {function(string): Promise<PipelineImage>} loadImage - Load an image from a source (data URL, file path, etc.).
 * @property {function(number, number): PipelineImageData} createImageData - Create an ImageData object with the given dimensions.
 * @property {function(string, string): void} registerFont - Register a font for canvas rendering.
 * @property {function(): Promise<void>} waitForFonts - Wait for all registered fonts to be ready for rendering.
 */
export const PlatformProvider = {}
