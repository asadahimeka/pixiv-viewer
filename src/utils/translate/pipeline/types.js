/**
 * @file Manga translation pipeline type definitions
 *
 * This module defines the core data structures used throughout the
 * manga image translation pipeline. All types are documented via
 * JSDoc for IDE autocompletion support.
 */

/**
 * @typedef {Object} TextRegion
 * @property {string} id - Unique region identifier (e.g., 'r0', 'r1')
 * @property {{x: number, y: number, width: number, height: number}} box - Bounding box in original image coordinates
 * @property {Array<{x: number, y: number}>} [quad] - Four corner points for rotated text (optional)
 * @property {'h'|'v'} direction - Text direction: horizontal or vertical
 * @property {number} prob - Detection confidence (0-1)
 * @property {string} [sourceText] - Original text recognized by OCR (populated after OCR stage)
 * @property {string} [translatedText] - Translated text (populated after translation stage)
 * @property {Array<string>} [translatedColumns] - Multi-column translated text (for vertical text)
 * @property {string} [fgColor] - Foreground text color hex (e.g., '#000000')
 * @property {string} [bgColor] - Background color hex (e.g., '#FFFFFF')
 * @property {{x: number, y: number, width: number, height: number}} [bubbleBox] - Speech bubble bounding box (optional, may extend beyond text)
 * @property {Uint8Array} [bubbleMask] - Binary mask of speech bubble area (optional)
 */

/**
 * @typedef {Object} PipelineConfig
 * @property {'translate'|'erase'|'original'} processMode - Processing mode
 * @property {string} [sourceLang='ja'] - Source language code (e.g., 'ja', 'en', 'ko')
 * @property {string} [targetLang='zh-CN'] - Target language code (e.g., 'zh-CN', 'en', 'ja')
 * @property {'paddleocr'} ocrEngine - OCR engine to use
 * @property {Object} providers - LLM provider config
 * @property {string} providers.name - Provider name (e.g., 'siliconcloud', 'deepseek')
 * @property {string} providers.apiKey - API key for the provider
 * @property {string} [providers.model] - Model name override
 * @property {string} [providers.baseUrl] - Base URL override for API endpoint
 * @property {Array<string>} [providers.fallback] - Ordered fallback provider names
 * @property {boolean} [useCache=true] - Whether to use/save cached results
 * @property {number} [pageIndex] - Current page index in multi-page manga
 */

/**
 * @typedef {Object} PipelineProgress
 * @property {string} stage - Current stage name: 'load-image'|'detect'|'ocr'|'translate'|'inpaint'|'typeset'|'complete'|'error'
 * @property {string} detail - Human-readable detail message (Chinese)
 * @property {number} [percent] - Progress percentage 0-100 (optional, for stages with measured progress)
 * @property {Array<{stage: string, label: string, durationMs: number}>} [timing] - Timing data for completed stages
 */

/**
 * @typedef {Object} PipelineArtifacts
 * @property {HTMLCanvasElement|OffscreenCanvas} originalCanvas - Original image as canvas
 * @property {Array<TextRegion>} detectedRegions - Regions after text detection
 * @property {Array<TextRegion>} stageRegions - Regions after OCR (with sourceText populated)
 * @property {Array<TextRegion>} translatedRegions - Regions after LLM translation (with translatedText)
 * @property {HTMLCanvasElement} [maskCanvas] - Mask canvas for inpainting (if inpaint stage ran)
 * @property {HTMLCanvasElement} [inpaintedCanvas] - Inpainted canvas (text removed, if inpaint stage ran)
 * @property {HTMLCanvasElement} resultCanvas - Final canvas with translated text rendered over original/inpainted image
 * @property {Array<PipelineProgress>} progressLog - Full progress log of the pipeline run
 * @property {{ stage: string, message: string }} [error] - Error info if a pipeline stage failed (sets fallback result)
 * @property {Object} [debug] - Debug information (model versions, timing breakdown)
 */

/**
 * @typedef {Object} LLMTranslationResult
 * @property {Array<{id: string, translation: string, columns?: string[]}>} regions - Translated regions
 */

/**
 * Create a TextRegion with default values, merging any provided overrides.
 *
 * @param {Partial<TextRegion>} [overrides={}] - Properties to override defaults
 * @returns {TextRegion}
 */
export function createTextRegion(overrides = {}) {
  const { box: boxOverrides, ...rest } = overrides
  return {
    id: '',
    box: { x: 0, y: 0, width: 0, height: 0 },
    direction: 'h',
    prob: 0,
    ...rest,
    box: { x: 0, y: 0, width: 0, height: 0, ...(boxOverrides || {}) },
  }
}

/**
 * Create a PipelineArtifacts with empty/default values.
 *
 * @returns {PipelineArtifacts}
 */
export function createPipelineArtifacts() {
  return {
    originalCanvas: null,
    detectedRegions: [],
    stageRegions: [],
    translatedRegions: [],
    maskCanvas: null,
    inpaintedCanvas: null,
    resultCanvas: null,
    progressLog: [],
    debug: null,
    error: null,
  }
}
