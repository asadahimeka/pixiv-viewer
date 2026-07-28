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
import { createMaskFromRegions, refineTextMask } from './refineMask.js'
import { drawTypesetHorizontal, drawTypesetVertical } from './typeset.js'
import { createPipelineArtifacts } from './types.js'
import { createWorker, disposeWorker } from '../onnx/index.js'

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

  try {
    // ── Image Loading ─────────────────────────────────────────────
    {
      if (signal?.aborted) throw createAbortError()

      const stageLabel = '加载图片'
      const stageStart = performance.now()
      report('load-image', stageLabel, 5)

      const imageCanvas = await loadImage(imageUrl)
      artifacts.originalCanvas = imageCanvas

      timings.push({
        stage: 'load-image',
        label: stageLabel,
        durationMs: Math.round(performance.now() - stageStart),
      })
      console.log(`[pipeline] Image loaded: ${imageCanvas.width}x${imageCanvas.height}`)
      report('load-image', '图片加载完成', 10)
    }

    // ── ONNX Worker Creation ──────────────────────────────────────
    {
      if (signal?.aborted) throw createAbortError()
      report('init', '创建推理引擎…', 12)
      worker = createWorker()
      console.log('[pipeline] ONNX worker created')
    }

    // ── Stage 1: Text Detection ──────────────────────────────────
    let detectedRegions = []
    {
      if (signal?.aborted) throw createAbortError()

      const stageLabel = '文本检测'
      const stageStart = performance.now()
      report('detect', stageLabel, 15)

      const result = await detectTextRegions(artifacts.originalCanvas, { worker, signal })
      detectedRegions = result.regions
      artifacts.detectedRegions = detectedRegions

      timings.push({
        stage: 'detect',
        label: stageLabel,
        durationMs: Math.round(performance.now() - stageStart),
      })
      console.log(`[pipeline] Detection found ${detectedRegions.length} regions`)
      report(
        'detect',
        `检测到 ${detectedRegions.length} 个文本区域`,
        detectedRegions.length > 0 ? 30 : 100
      )
    }

    // If no text detected → skip remaining stages, return original image
    if (detectedRegions.length === 0) {
      console.log('[pipeline] No text detected, skipping OCR/translate/inpaint')
      // Copy original as result
      const canvas = document.createElement('canvas')
      canvas.width = artifacts.originalCanvas.width
      canvas.height = artifacts.originalCanvas.height
      canvas.getContext('2d').drawImage(artifacts.originalCanvas, 0, 0)
      artifacts.resultCanvas = canvas
      report('complete', '未检测到文字', 100)
      return artifacts
    }

    // ── Stage 2: OCR ──────────────────────────────────────────────
    let stageRegions = []
    {
      if (signal?.aborted) throw createAbortError()

      const stageLabel = '文字识别'
      const stageStart = performance.now()
      report('ocr', stageLabel, 35)

      stageRegions = await runOcr(artifacts.originalCanvas, detectedRegions, worker)
      artifacts.stageRegions = stageRegions

      timings.push({
        stage: 'ocr',
        label: stageLabel,
        durationMs: Math.round(performance.now() - stageStart),
      })
      const recognizedCount = stageRegions.filter(r => r.sourceText && r.sourceText.trim()).length
      console.log(`[pipeline] OCR completed: ${recognizedCount}/${stageRegions.length} regions with text`)
      report('ocr', `文字识别完成 (${recognizedCount} 项)`, 50)
    }

    // ── Stage 3: Merge + Sort ────────────────────────────────────
    let sortedRegions = []
    {
      if (signal?.aborted) throw createAbortError()

      const stageLabel = '文本合并与排序'
      const stageStart = performance.now()
      report('merge', stageLabel, 55)

      const w = artifacts.originalCanvas.width
      const h = artifacts.originalCanvas.height
      const mergedRegions = mergeTextLines(stageRegions, w, h)
      sortedRegions = sortRegionsForRender(mergedRegions, w, h)

      timings.push({
        stage: 'merge',
        label: stageLabel,
        durationMs: Math.round(performance.now() - stageStart),
      })
      console.log(`[pipeline] Merge + sort: ${sortedRegions.length} groups`)
      report('merge', `文本合并完成 (${sortedRegions.length} 组)`, 60)
    }

    // ── Stage 4 + Stage 5a: Translation & Mask Creation (Parallel) ─
    let translatedRegions = []
    let maskCanvas = null
    {
      if (signal?.aborted) throw createAbortError()

      const stageLabel = '翻译文本'
      const parallelStart = performance.now()
      report('translate', stageLabel, 65)

      const translatePromise = translateRegions(sortedRegions, config, (p) => {
        onProgress?.(p)
      }).then((result) => {
        translatedRegions = result
        return result
      })

      const maskPromise = Promise.resolve().then(() => {
        const w = artifacts.originalCanvas.width
        const h = artifacts.originalCanvas.height
        maskCanvas = createMaskFromRegions(sortedRegions, w, h)
        return maskCanvas
      })

      await Promise.all([translatePromise, maskPromise])

      artifacts.translatedRegions = translatedRegions
      artifacts.maskCanvas = maskCanvas

      timings.push({
        stage: 'translate',
        label: stageLabel,
        durationMs: Math.round(performance.now() - parallelStart),
      })
      console.log(`[pipeline] Translation + mask done in ${Math.round(performance.now() - parallelStart)}ms`)
      report('translate', '翻译完成', 80)
    }

    // ── Stage 5b: Inpainting ─────────────────────────────────────
    let inpaintedCanvas = null
    {
      if (signal?.aborted) throw createAbortError()

      const stageLabel = '去字修复'
      const stageStart = performance.now()
      report('inpaint', stageLabel, 85)

      if (maskCanvas && hasMaskContent(maskCanvas)) {
        inpaintedCanvas = await runInpaint(artifacts.originalCanvas, maskCanvas, worker)
        artifacts.inpaintedCanvas = inpaintedCanvas
        console.log('[pipeline] Inpainting completed')
      } else {
        console.log('[pipeline] Mask empty — skipping inpainting')
      }

      timings.push({
        stage: 'inpaint',
        label: stageLabel,
        durationMs: Math.round(performance.now() - stageStart),
      })
      report('inpaint', inpaintedCanvas ? '去字完成' : '无需去字', 90)
    }

    // ── Stage 6: Typesetting ─────────────────────────────────────
    {
      if (signal?.aborted) throw createAbortError()

      const stageLabel = '排版渲染'
      const stageStart = performance.now()
      report('typeset', stageLabel, 92)

      // Start from inpainted canvas if available, otherwise original
      const baseCanvas = inpaintedCanvas || artifacts.originalCanvas
      const resultCanvas = document.createElement('canvas')
      resultCanvas.width = baseCanvas.width
      resultCanvas.height = baseCanvas.height
      const ctx = resultCanvas.getContext('2d')
      ctx.drawImage(baseCanvas, 0, 0)

      // Typeset each region with translated text
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
        } catch (err) {
          console.log(`[pipeline] Typesetting failed for region ${region.id}:`, err.message)
        }
      }

      artifacts.resultCanvas = resultCanvas

      timings.push({
        stage: 'typeset',
        label: stageLabel,
        durationMs: Math.round(performance.now() - stageStart),
      })
      console.log(`[pipeline] Typeset ${typesetCount}/${translatedRegions.length} regions`)
      report('typeset', `排版完成 (${typesetCount} 区域)`, 100)
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      console.log('[pipeline] Pipeline cancelled by user')
      // Ensure we have at least the original as result
      if (!artifacts.resultCanvas && artifacts.originalCanvas) {
        const fallback = document.createElement('canvas')
        fallback.width = artifacts.originalCanvas.width
        fallback.height = artifacts.originalCanvas.height
        fallback.getContext('2d').drawImage(artifacts.originalCanvas, 0, 0)
        artifacts.resultCanvas = fallback
      }
      report('error', '已取消', 0)
      throw err
    }

    // Graceful degradation on unexpected errors
    console.log('[pipeline] Pipeline error:', err.message)
    if (!artifacts.resultCanvas && artifacts.originalCanvas) {
      const fallback = document.createElement('canvas')
      fallback.width = artifacts.originalCanvas.width
      fallback.height = artifacts.originalCanvas.height
      fallback.getContext('2d').drawImage(artifacts.originalCanvas, 0, 0)
      artifacts.resultCanvas = fallback
    }
    report('error', `处理失败: ${err.message}`, 0)
  } finally {
    // Clean up ONNX worker regardless of success or failure
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
