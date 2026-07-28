/**
 * @file Pipeline orchestrator — connects all translation stages sequentially.
 *
 * runPipeline() is the main entry point. It:
 * 1. Loads and decodes image
 * 2. Runs text detection (ONNX)
 * 3. Runs OCR on detected regions (ONNX)
 * 4. Merges nearby text lines and sorts by reading order
 * 5. Translates text via LLM providers (can overlap with mask creation)
 * 6. Creates text removal mask + runs inpainting (ONNX)
 * 7. Renders translated text via canvas typesetting
 * 8. Returns PipelineArtifacts with resultCanvas
 */

import { detectTextRegions } from './detect.js'
import { runOcr } from './ocr.js'
import { mergeTextLines } from './merge.js'
import { sortRegionsForRender } from './readingOrder.js'
import { translateRegions } from './translate.js'
import { runInpaint } from './inpaint.js'
import { createMaskFromRegions } from './refineMask.js'
import { drawTypesetHorizontal, drawTypesetVertical } from './typeset.js'
import { createPipelineArtifacts } from './types.js'
import { createWorker, disposeWorker } from '../onnx/index.js'

/**
 * Structured pipeline stage error with available artifacts.
 */
class PipelineStageError extends Error {
  constructor(stage, message, artifacts, cause) {
    super(`[${stage}] ${message}`)
    this.name = 'PipelineStageError'
    this.stage = stage
    this.artifacts = artifacts || null
    this.cause = cause || null
  }
}

const STAGE_ERROR_MESSAGES = {
  'load-image': '图片加载失败',
  'init': '推理引擎初始化失败',
  'detect': '文本检测失败',
  'ocr': '文字识别失败',
  'translate': '翻译失败',
  'inpaint': '去字修复失败',
  'typeset': '排版渲染失败',
}

const artworkErrors = new Map()

export function getArtworkError(imageUrl) {
  return artworkErrors.get(imageUrl) || null
}

export function clearArtworkError(imageUrl) {
  artworkErrors.delete(imageUrl)
}

function setArtworkError(imageUrl, stage, message) {
  artworkErrors.set(imageUrl, { stage, message, timestamp: Date.now() })
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth || img.width
      canvas.height = img.naturalHeight || img.height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)
      resolve(canvas)
    }
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`))
    img.src = url
  })
}

function hasMaskContent(maskCanvas) {
  if (!maskCanvas) return false
  const ctx = maskCanvas.getContext('2d')
  const imageData = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height)
  const pixels = imageData.data
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i] > 0) return true
  }
  return false
}

function createAbortError() {
  const err = new Error('Pipeline cancelled')
  err.name = 'AbortError'
  return err
}

function abortIfRequested(signal) {
  if (signal?.aborted) throw createAbortError()
}

function copyCanvas(source) {
  const canvas = document.createElement('canvas')
  canvas.width = source.width
  canvas.height = source.height
  canvas.getContext('2d').drawImage(source, 0, 0)
  return canvas
}

function makeFallbackResult(artifacts) {
  if (!artifacts.resultCanvas && artifacts.originalCanvas) {
    artifacts.resultCanvas = copyCanvas(artifacts.originalCanvas)
  }
}

/**
 * Run the full manga translation pipeline.
 *
 * Orchestrates loading, detection, OCR, merging, translation, inpainting,
 * and typesetting into a single async flow with progress reporting and
 * cancellation support.
 *
 * @param {string} imageUrl - URL of the manga page image to translate
 * @param {import('./types.js').PipelineConfig} config - Pipeline configuration
 * @param {Function} [onProgress] - Progress callback receiving PipelineProgress
 * @param {AbortSignal} [signal] - Optional AbortSignal for cancellation
 * @returns {Promise<import('./types.js').PipelineArtifacts>}
 */
export async function runPipeline(imageUrl, config, onProgress, signal) {
  const artifacts = createPipelineArtifacts()
  const timings = []
  let worker

  function report(stage, detail, percent) {
    onProgress?.({
      stage,
      detail,
      percent,
      timing: timings.length > 0 ? [...timings] : undefined,
    })
  }

  function stageTiming(stage, label, start) {
    timings.push({
      stage,
      label,
      durationMs: Math.round(performance.now() - start),
    })
  }

  function handleStageError(stage, message, err) {
    console.warn(`[pipeline] Stage "${stage}" failed:`, err.message)
    setArtworkError(imageUrl, stage, message)
    makeFallbackResult(artifacts)
  }

  // Outer safety net — catches anything that escapes per-stage handling
  try {
    // ── Image Loading ─────────────────────────────────────────────
    try {
      abortIfRequested(signal)

      const stageLabel = '加载图片'
      const stageStart = performance.now()
      report('load-image', stageLabel, 5)

      artifacts.originalCanvas = await loadImage(imageUrl)

      stageTiming('load-image', stageLabel, stageStart)
      console.log(`[pipeline] Image loaded: ${artifacts.originalCanvas.width}x${artifacts.originalCanvas.height}`)
      report('load-image', '图片加载完成', 10)
    } catch (err) {
      if (err.name === 'AbortError') throw err
      handleStageError('load-image', STAGE_ERROR_MESSAGES['load-image'], err)
      report('error', STAGE_ERROR_MESSAGES['load-image'], 0)
      return artifacts
    }

    // ── ONNX Worker Creation ──────────────────────────────────────
    try {
      abortIfRequested(signal)
      report('init', '创建推理引擎…', 12)
      worker = createWorker()
      console.log('[pipeline] ONNX worker created')
    } catch (err) {
      if (err.name === 'AbortError') throw err
      handleStageError('init', STAGE_ERROR_MESSAGES['init'], err)
      report('error', STAGE_ERROR_MESSAGES['init'], 0)
      return artifacts
    }

    // ── Stage 1: Text Detection ──────────────────────────────────
    let detectedRegions = []
    try {
      abortIfRequested(signal)

      const stageLabel = '文本检测'
      const stageStart = performance.now()
      report('detect', stageLabel, 15)

      const result = await detectTextRegions(artifacts.originalCanvas, { worker, signal })
      detectedRegions = result.regions
      artifacts.detectedRegions = detectedRegions

      stageTiming('detect', stageLabel, stageStart)
      console.log(`[pipeline] Detection found ${detectedRegions.length} regions`)
      report(
        'detect',
        `检测到 ${detectedRegions.length} 个文本区域`,
        detectedRegions.length > 0 ? 30 : 100
      )
    } catch (err) {
      if (err.name === 'AbortError') throw err
      handleStageError('detect', STAGE_ERROR_MESSAGES['detect'], err)
      report('error', STAGE_ERROR_MESSAGES['detect'], 0)
      return artifacts
    }

    // If no text detected → skip remaining stages, return original image
    if (detectedRegions.length === 0) {
      console.log('[pipeline] No text detected, skipping OCR/translate/inpaint')
      artifacts.resultCanvas = copyCanvas(artifacts.originalCanvas)
      report('complete', '未检测到文字', 100)
      return artifacts
    }

    // ── Stage 2: OCR ──────────────────────────────────────────────
    let stageRegions = []
    try {
      abortIfRequested(signal)

      const stageLabel = '文字识别'
      const stageStart = performance.now()
      report('ocr', stageLabel, 35)

      stageRegions = await runOcr(artifacts.originalCanvas, detectedRegions, worker)
      artifacts.stageRegions = stageRegions

      stageTiming('ocr', stageLabel, stageStart)
      const recognizedCount = stageRegions.filter(r => r.sourceText && r.sourceText.trim()).length
      console.log(`[pipeline] OCR completed: ${recognizedCount}/${stageRegions.length} regions with text`)
      report('ocr', `文字识别完成 (${recognizedCount} 项)`, 50)
    } catch (err) {
      if (err.name === 'AbortError') throw err
      handleStageError('ocr', STAGE_ERROR_MESSAGES['ocr'], err)
      report('error', STAGE_ERROR_MESSAGES['ocr'], 0)
      return artifacts
    }

    // ── Stage 3: Merge + Sort ────────────────────────────────────
    let sortedRegions = []
    try {
      abortIfRequested(signal)

      const stageLabel = '文本合并与排序'
      const stageStart = performance.now()
      report('merge', stageLabel, 55)

      const w = artifacts.originalCanvas.width
      const h = artifacts.originalCanvas.height
      sortedRegions = sortRegionsForRender(mergeTextLines(stageRegions, w, h), w, h)

      stageTiming('merge', stageLabel, stageStart)
      console.log(`[pipeline] Merge + sort: ${sortedRegions.length} groups`)
      report('merge', `文本合并完成 (${sortedRegions.length} 组)`, 60)
    } catch (err) {
      // Merge/sort is non-fatal: if it fails, fall back to unsorted OCR regions
      console.warn(`[pipeline] Merge+sort failed, using raw OCR regions:`, err.message)
      sortedRegions = stageRegions
    }

    // ── Stage 4 + Stage 5a: Translation & Mask Creation (Parallel) ─
    let translatedRegions = []
    let maskCanvas = null
    let translationFailed = false
    let maskFailed = false
    {
      abortIfRequested(signal)

      const stageLabel = '翻译文本'
      const parallelStart = performance.now()
      report('translate', stageLabel, 65)

      const translatePromise = translateRegions(sortedRegions, config, (p) => {
        onProgress?.(p)
      })
        .then((result) => {
          translatedRegions = result
          return result
        })
        .catch((err) => {
          if (err.name === 'AbortError') throw err
          console.warn(`[pipeline] Translation failed:`, err.message)
          setArtworkError(imageUrl, 'translate', STAGE_ERROR_MESSAGES['translate'])
          translationFailed = true
          // Keep original text instead of translated
          translatedRegions = sortedRegions.map((r) => ({
            ...r,
            translatedText: r.sourceText || '',
          }))
          return translatedRegions
        })

      const maskPromise = Promise.resolve().then(() => {
        try {
          const w = artifacts.originalCanvas.width
          const h = artifacts.originalCanvas.height
          maskCanvas = createMaskFromRegions(sortedRegions, w, h)
          return maskCanvas
        } catch (err) {
          console.warn(`[pipeline] Mask creation failed:`, err.message)
          maskFailed = true
          maskCanvas = null
          return null
        }
      })

      await Promise.all([translatePromise, maskPromise])

      artifacts.translatedRegions = translatedRegions
      artifacts.maskCanvas = maskCanvas

      stageTiming('translate', stageLabel, parallelStart)
      if (translationFailed) {
        report('error', STAGE_ERROR_MESSAGES['translate'], 75)
      } else {
        console.log(`[pipeline] Translation completed (${translatedRegions.filter(r => r.translatedText).length} regions)`)
        report('translate', '翻译完成', 80)
      }
    }

    // ── Stage 5b: Inpainting ─────────────────────────────────────
    let inpaintedCanvas = null
    try {
      abortIfRequested(signal)

      const stageLabel = '去字修复'
      const stageStart = performance.now()
      report('inpaint', stageLabel, 85)

      if (!maskFailed && maskCanvas && hasMaskContent(maskCanvas)) {
        inpaintedCanvas = await runInpaint(artifacts.originalCanvas, maskCanvas, worker)
        artifacts.inpaintedCanvas = inpaintedCanvas
        console.log('[pipeline] Inpainting completed')
      } else {
        console.log('[pipeline] Mask empty or failed — skipping inpainting')
      }

      stageTiming('inpaint', stageLabel, stageStart)
      report('inpaint', inpaintedCanvas ? '去字完成' : '无需去字', 90)
    } catch (err) {
      if (err.name === 'AbortError') throw err
      // Inpainting failure is non-fatal: typeset on original image
      console.warn(`[pipeline] Inpainting failed, typesetting on original:`, err.message)
      setArtworkError(imageUrl, 'inpaint', STAGE_ERROR_MESSAGES['inpaint'])
      inpaintedCanvas = null
      artifacts.inpaintedCanvas = null
      report('inpaint', STAGE_ERROR_MESSAGES['inpaint'] + '，使用原图', 90)
    }

    // ── Stage 6: Typesetting ─────────────────────────────────────
    try {
      abortIfRequested(signal)

      const stageLabel = '排版渲染'
      const stageStart = performance.now()
      report('typeset', stageLabel, 92)

      const baseCanvas = inpaintedCanvas || artifacts.originalCanvas
      const resultCanvas = document.createElement('canvas')
      resultCanvas.width = baseCanvas.width
      resultCanvas.height = baseCanvas.height
      const ctx = resultCanvas.getContext('2d')
      ctx.drawImage(baseCanvas, 0, 0)

      let typesetCount = 0
      for (const region of translatedRegions) {
        if (!region.translatedText) continue
        try {
          if (region.direction === 'v') {
            drawTypesetVertical(ctx, region, region.translatedText)
          } else {
            drawTypesetHorizontal(ctx, region, region.translatedText)
          }
          typesetCount++
        } catch (regionErr) {
          console.warn(`[pipeline] Typeset skip region ${region.id}:`, regionErr.message)
        }
      }

      artifacts.resultCanvas = resultCanvas

      stageTiming('typeset', stageLabel, stageStart)
      console.log(`[pipeline] Typeset ${typesetCount}/${translatedRegions.length} regions`)
      report('typeset', `排版完成 (${typesetCount} 区域)`, 100)
    } catch (err) {
      if (err.name === 'AbortError') throw err
      // Typesetting failure: fall back to image without text overlay
      console.warn(`[pipeline] Typesetting failed entirely, returning cleaned image:`, err.message)
      setArtworkError(imageUrl, 'typeset', STAGE_ERROR_MESSAGES['typeset'])
      const baseCanvas = inpaintedCanvas || artifacts.originalCanvas
      artifacts.resultCanvas = copyCanvas(baseCanvas)
      report('typeset', STAGE_ERROR_MESSAGES['typeset'], 100)
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      console.log('[pipeline] Pipeline cancelled by user')
      makeFallbackResult(artifacts)
      report('error', '已取消', 0)
      throw err
    }

    // Unexpected errors that escaped per-stage handling
    console.warn('[pipeline] Unexpected pipeline error:', err.message)
    makeFallbackResult(artifacts)
    report('error', `处理失败: ${err.message}`, 0)
  } finally {
    if (worker) {
      try {
        await disposeWorker(worker)
        console.log('[pipeline] Worker disposed')
      } catch (e) {
        console.log('[pipeline] Worker dispose error:', e.message)
      }
    }
  }

  return artifacts
}
