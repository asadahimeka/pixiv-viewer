// SPDX-License-Identifier: GPL-3.0-only
// Derived from ShinobuTranslator (https://github.com/DonutShinobu/ShinobuTranslator), GPL-3.0.
/**
 * @file Shinobu translation pipeline orchestrator — 12-stage `runPipeline`.
 *
 * Mechanically converted from ShinobuTranslator `src/pipeline/orchestrator.ts`
 * (TS → JS, 979 lines). Types → JSDoc @typedef + doc-only import() refs.
 *
 * Stages (preserved verbatim from source):
 *   load → preload(detector) → detect → bubble → ocr → merge →
 *   bubble-matching → ocr_postfilter → order →
 *   translate ╷
 *   mask+inpaint ╵ (parallel via Promise.all) →
 *   typeset → done
 *
 * Degradation (non-fail-fast, as confirmed with user):
 *   - preload / detect / ocr  → throw PipelineStageError (as source)
 *   - bubble                  → catch + warn + empty bubbles + continue
 *   - ocr_postfilter          → catch + warn + keep all regions (Shinobu L688–709)
 *   - inpaint                 → catch + degrade to original canvas
 *   - typeset                 → catch + skip region, use previous canvas
 *
 * Key features preserved:
 *   - Runtime probing (background preload of OCR/inpaint/bubble during detect)
 *   - `Promise.all([translateTask, eraseTask])` strict parallel
 *   - `stopAfterOrder` early-exit
 *   - `PipelineStageError` with stage / detail / artifacts / cause
 *   - `cb({ stage, detail })` progress callback + `stageTimings[]`
 *   - `report()` and `throwIfCancelled()` helpers
 *
 * Adapted for pixiv-viewer (no chrome.runtime):
 *   - `diagnosticLogClient` / `diagnosticLog` → stubbed (no-op in webapp)
 *   - `createCancelledError` → inlined
 *   - `browserPlatform` → `./runtime/browserPlatform.js`
 */

// ---------------------------------------------------------------------------
// Runtime imports
// ---------------------------------------------------------------------------

import { fileToImage, imageToCanvas } from './pipeline/image.js'
import { detectTextRegionsWithMask } from './pipeline/detect/index.js'
import { runOcr } from './pipeline/ocr/index.js'
import { preparePaddleOcrRuntime, warmupPaddleOcrRuntime } from './pipeline/ocr/paddleocrProvider.js'
import { runTranslate } from './pipeline/translate.js'
import { runInpaint } from './pipeline/inpaint.js'
import { drawTypeset } from './pipeline/typeset/index.js'
import { drawRegions } from './pipeline/visualize.js'
import { mergeTextLines } from './pipeline/textlineMerge/index.js'
import { filterOcrRegions } from './pipeline/ocrPostFilter/index.js'
import { OCR_POST_FILTER_RULE_ID } from './pipeline/ocrPostFilter/rule.js'
import { refineTextMask } from './pipeline/maskRefinement/index.js'
import { sortRegionsForRender } from './pipeline/readingOrder.js'
import { detectBubbles, matchRegionsToBubbles } from './pipeline/bubbleDetect.js'
import { getModelSession } from './runtime/modelRegistry.js'
import { browserPlatform } from './runtime/browserPlatform.js'

// ---------------------------------------------------------------------------
// Doc-only type imports — zero runtime impact
// ---------------------------------------------------------------------------

/** @typedef {import('./types.js').PipelineArtifacts} PipelineArtifacts */
/** @typedef {import('./types.js').PipelineConfig} PipelineConfig */
/** @typedef {import('./types.js').PipelineProgress} PipelineProgress */
/** @typedef {import('./types.js').PipelineStageRegions} PipelineStageRegions */
/** @typedef {import('./types.js').PipelineTypesetDebugLog} PipelineTypesetDebugLog */
/** @typedef {import('./types.js').RuntimeStageStatus} RuntimeStageStatus */
/** @typedef {import('./types.js').StageTiming} StageTiming */
/** @typedef {import('./types.js').TextRegion} TextRegion */
/** @typedef {import('./types.js').TranslationDebugInfo} TranslationDebugInfo */
/** @typedef {import('./types.js').MaskDebugLayers} MaskDebugLayers */

/** @typedef {import('./runtime/platform.js').PlatformProvider} PlatformProvider */
/** @typedef {import('./runtime/platform.js').PipelineCanvas} PipelineCanvas */

/** @typedef {import('./runtime/onnxWorkerTypes.js').WorkerSessionHandle} WorkerSessionHandle */

// ---------------------------------------------------------------------------
// PipelineStageError
// ---------------------------------------------------------------------------

export class PipelineStageError extends Error {
  /** @type {string} */
  stage
  /** @type {PipelineArtifacts} */
  artifacts
  /** @type {string} */
  code = 'PIPELINE_STAGE_FAILED'

  /**
   * @param {string} stage
   * @param {string} detail
   * @param {PipelineArtifacts} artifacts
   * @param {unknown} [cause]
   */
  constructor(stage, detail, artifacts, cause) {
    super(`${stage}失败: ${detail}`, cause === undefined ? undefined : { cause })
    this.name = 'PipelineStageError'
    this.stage = stage
    this.artifacts = artifacts
  }
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} PipelineRunOptions
 * @property {AbortSignal} [signal]
 * @property {'order'} [stopAfter]
 */

// ---------------------------------------------------------------------------
// Runtime probe scheduling types
// ---------------------------------------------------------------------------

/** @typedef {'legacy'|'prepare'|'warmup'} PaddleOcrRuntimeProbeMode */
/** @typedef {'detect-start'|'after-detect'|'bubble-start'|'after-bubble'|'ocr-start'} PaddleOcrRuntimeProbeSchedule */
/** @typedef {'current'|'detect-start'|'after-detect'|'bubble-start'|'after-bubble'|'ocr-start'} InpaintRuntimeProbeSchedule */
/** @typedef {'current'|'detect-start'|'after-detect'} BubbleRuntimeProbeSchedule */

// ---------------------------------------------------------------------------
// Helpers — inlined from Shinobu shared modules (not yet converted for pixiv-viewer)
// ---------------------------------------------------------------------------

/**
 * Inlined from `../shared/localPipelineProtocol.js` — not yet converted.
 * @param {string} [reason]
 * @returns {DOMException}
 */
function createCancelledError(reason) {
  return new DOMException(reason ?? 'Pipeline cancelled', 'AbortError')
}

/**
 * Inlined from `../shared/diagnosticLog.js` — not yet converted.
 * @param {unknown} error
 * @returns {{ message: string, name: string }}
 */
function toDiagnosticError(error) {
  if (error instanceof Error) {
    return { message: error.message, name: error.name }
  }
  return { message: String(error), name: 'UnknownError' }
}

/**
 * Diagnostic log entry point — restores the user-added `console.table` output.
 * Dev-only: terser `drop_console` (vue.config.js) strips all console.* calls in
 * production builds, so this has zero production impact.
 * @param {Object} _entry
 * @param {string} _entry.runId
 * @param {string} _entry.level
 * @param {string} _entry.category
 * @param {Object} _entry.source
 * @param {string} _entry.message
 * @param {Object} [_entry.data]
 * @param {Object} [_entry.error]
 */
function emitDiagnosticLog(_entry) {
  // Diagnostic logging — dev-only (terser drop_console strips in production).
  console.log(_entry)
}

/** @typedef {'pipeline.detect'|'pipeline.bubble'|'pipeline.ocr'|'pipeline.inpaint'|'pipeline.typeset'} DiagnosticLogCategory */

/**
 * Log a pipeline stage event to the diagnostic system (no-op in pixiv-viewer).
 * @param {PipelineConfig} config
 * @param {DiagnosticLogCategory} category
 * @param {string} message
 * @param {Record<string, unknown>} [data]
 * @param {unknown} [error]
 */
function logPipelineStage(config, category, message, data, error) {
  if (!config.diagnosticRunId) return
  emitDiagnosticLog({
    runId: config.diagnosticRunId,
    level: error === undefined ? 'info' : 'error',
    category,
    source: { context: 'offscreen', module: 'orchestrator.ts' },
    message,
    data,
    error: error === undefined ? undefined : toDiagnosticError(error),
  })
}

/**
 * @param {unknown} error
 * @returns {string}
 */
function toErrorDetail(error) {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}

// ---------------------------------------------------------------------------
// Region cloning helpers (Shinobu L269–308)
// ---------------------------------------------------------------------------

/** @typedef {NonNullable<TextRegion['quad']>} RegionQuad */
/** @typedef {NonNullable<TextRegion['bubbleMask']>} RegionBubbleMask */

/**
 * @param {RegionQuad} quad
 * @returns {RegionQuad}
 */
function cloneRegionQuad(quad) {
  return quad.map(point => ({ ...point }))
}

/**
 * @param {Array<TextRegion>} regions
 * @returns {Array<TextRegion>}
 */
function cloneTextRegions(regions) {
  const clonedMasks = new Map()
  return regions.map(region => {
    let bubbleMask
    if (region.bubbleMask) {
      bubbleMask = clonedMasks.get(region.bubbleMask)
      if (!bubbleMask) {
        bubbleMask = {
          width: region.bubbleMask.width,
          height: region.bubbleMask.height,
          data: new Uint8ClampedArray(region.bubbleMask.data),
        }
        clonedMasks.set(region.bubbleMask, bubbleMask)
      }
    }

    return {
      ...region,
      box: { ...region.box },
      quad: region.quad ? cloneRegionQuad(region.quad) : undefined,
      fgColor: region.fgColor ? [...region.fgColor] : undefined,
      bgColor: region.bgColor ? [...region.bgColor] : undefined,
      translatedColumns: region.translatedColumns ? [...region.translatedColumns] : undefined,
      sourceLineGeometries: region.sourceLineGeometries?.map(geometry => ({
        ...geometry,
        box: { ...geometry.box },
        quad: geometry.quad ? cloneRegionQuad(geometry.quad) : undefined,
      })),
      bubbleBox: region.bubbleBox ? { ...region.bubbleBox } : undefined,
      bubbleMask,
    }
  })
}

// ---------------------------------------------------------------------------
// Runtime probe flags (globalThis — as Shinobu source L49–72)
// ---------------------------------------------------------------------------

/**
 * @typedef {typeof globalThis & {
 *   __shinobuPaddleOcrRuntimeProbe?: PaddleOcrRuntimeProbeMode,
 *   __shinobuPaddleOcrRuntimeProbeSchedule?: PaddleOcrRuntimeProbeSchedule,
 *   __shinobuInpaintRuntimeProbeSchedule?: InpaintRuntimeProbeSchedule,
 *   __shinobuBubbleRuntimeProbeSchedule?: BubbleRuntimeProbeSchedule,
 *   __shinobuPaddleOcrWarmupInputWidth?: number,
 *   __shinobuPaddleOcrWarmupBatchSize?: number,
 * }} PipelineRuntimeFlags
 */

/** @returns {PaddleOcrRuntimeProbeMode} */
function getPaddleOcrRuntimeProbeMode() {
  return /** @type {PipelineRuntimeFlags} */ (globalThis).__shinobuPaddleOcrRuntimeProbe ?? 'legacy'
}

/** @returns {PaddleOcrRuntimeProbeSchedule} */
function getPaddleOcrRuntimeProbeSchedule() {
  return /** @type {PipelineRuntimeFlags} */ (globalThis).__shinobuPaddleOcrRuntimeProbeSchedule ?? 'detect-start'
}

/** @returns {InpaintRuntimeProbeSchedule} */
function getInpaintRuntimeProbeSchedule() {
  return /** @type {PipelineRuntimeFlags} */ (globalThis).__shinobuInpaintRuntimeProbeSchedule ?? 'current'
}

/** @returns {BubbleRuntimeProbeSchedule} */
function getBubbleRuntimeProbeSchedule() {
  return /** @type {PipelineRuntimeFlags} */ (globalThis).__shinobuBubbleRuntimeProbeSchedule ?? 'current'
}

// ---------------------------------------------------------------------------
// Runtime probes (Shinobu L74–106, L323–358)
// ---------------------------------------------------------------------------

/**
 * @returns {Promise<RuntimeStageStatus>}
 */
async function probePaddleOcrRuntime() {
  const mode = getPaddleOcrRuntimeProbeMode()
  if (mode === 'warmup') {
    const flags = /** @type {PipelineRuntimeFlags} */ (globalThis)
    const warmup = await warmupPaddleOcrRuntime({
      inputWidth: flags.__shinobuPaddleOcrWarmupInputWidth,
      batchSize: flags.__shinobuPaddleOcrWarmupBatchSize,
    })
    const providerLabel = warmup.provider === 'webnn'
      ? `${warmup.provider}/${warmup.webnnDeviceType ?? 'default'}`
      : warmup.provider
    return {
      model: 'ocr',
      enabled: true,
      provider: warmup.provider,
      webnnDeviceType: warmup.provider === 'webnn' ? warmup.webnnDeviceType ?? 'default' : undefined,
      detail: `Paddle OCR warmup 完成 (${providerLabel}, ${warmup.inputDims.join('x')}, run=${Math.round(warmup.runMs)}ms)`,
    }
  }

  const runtime = await preparePaddleOcrRuntime()
  const webnnDeviceType = runtime.sessionHandle.provider === 'webnn' ? runtime.sessionHandle.webnnDeviceType ?? 'default' : undefined
  const providerLabel = runtime.sessionHandle.provider === 'webnn'
    ? `${runtime.sessionHandle.provider}/${webnnDeviceType}`
    : runtime.sessionHandle.provider
  return {
    model: 'ocr',
    enabled: true,
    provider: runtime.sessionHandle.provider,
    webnnDeviceType,
    detail: `Paddle OCR 模型已加载 (${runtime.modelName}, ${providerLabel})`,
  }
}

/**
 * @param {'detector'|'bubble'|'ocr'|'inpaint'} model
 * @returns {Promise<RuntimeStageStatus>}
 */
async function probeRuntime(model) {
  try {
    let handle
    if (model === 'ocr') {
      if (getPaddleOcrRuntimeProbeMode() !== 'legacy') {
        return await probePaddleOcrRuntime()
      }
      const paddleRuntime = await preparePaddleOcrRuntime()
      handle = paddleRuntime.sessionHandle
    } else {
      handle = await getModelSession(model)
    }
    const webnnDeviceType = handle.provider === 'webnn' ? handle.webnnDeviceType ?? 'default' : undefined
    const providerLabel = handle.provider === 'webnn' ? `${handle.provider}/${webnnDeviceType}` : handle.provider
    return {
      model,
      enabled: true,
      provider: handle.provider,
      webnnDeviceType,
      detail: `${model} 模型已加载 (${providerLabel})`,
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    const stageDetail =
      model === 'ocr'
        ? `${model} 模型未启用，OCR 阶段已禁用回退: ${detail}`
        : model === 'bubble'
          ? `${model} 模型未启用，气泡检测无法继续: ${detail}`
          : `${model} 模型未启用，使用检测回退流程: ${detail}`
    return {
      model,
      enabled: false,
      detail: stageDetail,
    }
  }
}

// ---------------------------------------------------------------------------
// Debug canvas builder (Shinobu L108–231)
// ---------------------------------------------------------------------------

/**
 * @param {PipelineCanvas} originalCanvas
 * @param {MaskDebugLayers} debugLayers
 * @param {PlatformProvider} platform
 * @param {PipelineCanvas} [baseCanvas]
 * @returns {PipelineCanvas}
 */
function buildEraseDebugCanvas(originalCanvas, debugLayers, platform, baseCanvas) {
  const { refinedMask, perRegionDilated, globalDilated, scaledWidth, scaledHeight } = debugLayers
  const width = originalCanvas.width
  const height = originalCanvas.height

  const canvas = platform.createCanvas(width, height)
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return canvas
  }
  ctx.drawImage(baseCanvas ?? originalCanvas, 0, 0)

  const toScaledCanvas = mask => {
    const src = platform.createCanvas(scaledWidth, scaledHeight)
    const srcCtx = src.getContext('2d')
    if (!srcCtx) {
      return src
    }
    const imageData = srcCtx.createImageData(scaledWidth, scaledHeight)
    for (let i = 0, p = 0; i < mask.length; i += 1, p += 4) {
      const v = mask[i] > 0 ? 255 : 0
      imageData.data[p] = v
      imageData.data[p + 1] = v
      imageData.data[p + 2] = v
      imageData.data[p + 3] = 255
    }
    srcCtx.putImageData(imageData, 0, 0)

    const dst = platform.createCanvas(width, height)
    const dstCtx = dst.getContext('2d')
    if (!dstCtx) {
      return dst
    }
    dstCtx.imageSmoothingEnabled = true
    dstCtx.drawImage(src, 0, 0, width, height)
    return dst
  }

  const greenCanvas = toScaledCanvas(refinedMask)
  const yellowRaw = new Uint8Array(scaledWidth * scaledHeight)
  const redRaw = new Uint8Array(scaledWidth * scaledHeight)
  for (let i = 0; i < refinedMask.length; i += 1) {
    const isRefined = refinedMask[i] > 0
    const isPerRegion = perRegionDilated[i] > 0
    const isGlobal = globalDilated[i] > 0
    if (isRefined) {
      // Green layer (refinedMask base) — skip, already in green canvas
    } else if (isPerRegion) {
      yellowRaw[i] = 1
    } else if (isGlobal) {
      redRaw[i] = 1
    }
  }
  const yellowCanvas = toScaledCanvas(yellowRaw)
  const redCanvas = toScaledCanvas(redRaw)

  ctx.globalAlpha = 0.5
  ctx.globalCompositeOperation = 'source-over'

  const colorizeAndDraw = (layerCanvas, r, g, b) => {
    const data = layerCanvas.getContext('2d')?.getImageData(0, 0, width, height)
    if (!data) return
    for (let p = 0; p < data.data.length; p += 4) {
      if (data.data[p] > 127) {
        data.data[p] = r
        data.data[p + 1] = g
        data.data[p + 2] = b
        data.data[p + 3] = 128
      } else {
        data.data[p + 3] = 0
      }
    }
    layerCanvas.getContext('2d')?.putImageData(data, 0, 0)
    ctx.drawImage(layerCanvas, 0, 0)
  }

  colorizeAndDraw(greenCanvas, 0, 255, 0)
  colorizeAndDraw(yellowCanvas, 255, 255, 0)
  colorizeAndDraw(redCanvas, 255, 0, 0)

  ctx.globalAlpha = 1
  return canvas
}

// ---------------------------------------------------------------------------
// Progress & cancellation helpers (Shinobu L233–242)
// ---------------------------------------------------------------------------

/**
 * @typedef {function(PipelineProgress): void} ProgressCallback
 */

/**
 * Fixed per-stage percentage anchors (11 pipeline stages).
 * Mirrors the shinobuStageDefs stage keys consumed by TranslateProgress.
 * Values approximate each stage's share of the whole pipeline.
 */
const STAGE_PERCENT = {
  load: 5,
  preload: 15,
  detect: 25,
  bubble: 35,
  ocr: 45,
  merge: 55,
  ocr_postfilter: 62,
  order: 70,
  parallel: 85,
  typeset: 95,
  done: 100,
}

/**
 * @param {ProgressCallback} cb
 * @param {string} stage
 * @param {string} detail
 */
function report(cb, stage, detail) {
  const percent = STAGE_PERCENT[stage]
  const progress = { stage, detail, ...(percent !== undefined ? { percent } : {}) }
  cb(progress)
}

/**
 * @param {AbortSignal} [signal]
 */
function throwIfCancelled(signal) {
  if (!signal?.aborted) return
  if (signal.reason instanceof Error) throw signal.reason
  throw createCancelledError(typeof signal.reason === 'string' ? signal.reason : undefined)
}

// ---------------------------------------------------------------------------
// runPipeline — 12-stage orchestrator (Shinobu L360–979)
// ---------------------------------------------------------------------------

/**
 * Execute the full Shinobu translation pipeline.
 *
 * @param {File} file - Source image file
 * @param {PipelineConfig} config - Pipeline configuration
 * @param {ProgressCallback} onProgress - Progress callback
 * @param {PipelineRunOptions} [options] - Run options
 * @returns {Promise<PipelineArtifacts>}
 */
export async function runPipeline(file, config, onProgress, options = {}) {
  const platform = browserPlatform
  /** @type {Array<StageTiming>} */
  const stageTimings = []
  const signal = options.signal
  const stopAfterOrder = options.stopAfter === 'order'

  // ---- load ----
  throwIfCancelled(signal)
  report(onProgress, 'load', '加载图片')
  const loadT0 = performance.now()
  const image = await fileToImage(file, platform)
  throwIfCancelled(signal)
  const originalCanvas = imageToCanvas(image, platform)
  stageTimings.push({ stage: 'load', label: '加载图片', durationMs: performance.now() - loadT0 })

  /** @type {Array<RuntimeStageStatus>} */
  const runtimeStages = []
  /** @type {PipelineStageRegions} */
  const stageRegions = {
    detected: [],
    ocr: [],
    merged: [],
    ordered: [],
  }

  /** @type {Array<TextRegion>} */
  let latestRegions = []
  /** @type {PipelineCanvas} */
  let detectionCanvas = originalCanvas
  /** @type {PipelineCanvas} */
  let ocrCanvas = originalCanvas
  /** @type {PipelineCanvas|null} */
  let segmentationCanvas = null
  /** @type {PipelineCanvas} */
  let cleanedCanvas = originalCanvas
  /** @type {PipelineCanvas} */
  let resultCanvas = originalCanvas
  /** @type {PipelineCanvas|null} */
  let debugOriginalCanvas = null
  /** @type {PipelineCanvas|null} */
  let eraseDebugCanvas = null
  /** @type {PipelineTypesetDebugLog|null} */
  let typesetDebugLog = null
  /** @type {TranslationDebugInfo|null} */
  let translationDebug = null
  /** @type {PipelineArtifacts['ocrDebug']} */
  let ocrDebug = null
  /** @type {PipelineArtifacts['ocrPostFilterDebug']} */
  let ocrPostFilterDebug = null
  /** @type {PipelineCanvas|null} */
  let detectionMaskCanvas = null
  /** @type {PipelineCanvas|null} */
  let refinedMaskCanvas = null
  /** @type {MaskDebugLayers|null} */
  let debugLayers = null

  /** @returns {PipelineArtifacts} */
  const buildArtifacts = () => ({
    original: image,
    detectedRegions: latestRegions,
    stageRegions,
    detectionCanvas,
    ocrCanvas,
    segmentationCanvas,
    cleanedCanvas,
    resultCanvas,
    debugOriginalCanvas,
    typesetDebugLog,
    translationDebug,
    ocrDebug,
    ocrPostFilterDebug,
    runtimeStages,
    stageTimings,
  })

  /**
   * @param {RuntimeStageStatus} status
   */
  const setRuntimeStage = status => {
    const index = runtimeStages.findIndex(stage => stage.model === status.model)
    if (index >= 0) runtimeStages[index] = status
    else runtimeStages.push(status)
  }

  /**
   * @param {RuntimeStageStatus['model']} model
   * @returns {RuntimeStageStatus|undefined}
   */
  const getRuntimeStage = model =>
    runtimeStages.find(stage => stage.model === model)

  // ---- preload (detector) ----
  throwIfCancelled(signal)
  report(onProgress, 'preload', '加载检测模型')
  const preloadT0 = performance.now()
  setRuntimeStage(await probeRuntime('detector'))
  throwIfCancelled(signal)
  stageTimings.push({ stage: 'preload', label: '加载检测模型', durationMs: performance.now() - preloadT0 })

  // ---- runtime probing setup ----
  /** @type {Promise<RuntimeStageStatus>|null} */
  let ocrRuntimeProbePromise = null
  /** @type {Promise<RuntimeStageStatus>|null} */
  let inpaintRuntimeProbePromise = null
  /** @type {Promise<RuntimeStageStatus>|null} */
  let bubbleRuntimeProbePromise = null
  const ocrRuntimeProbeSchedule = getPaddleOcrRuntimeProbeSchedule()
  const inpaintRuntimeProbeSchedule = getInpaintRuntimeProbeSchedule()
  const bubbleRuntimeProbeSchedule = getBubbleRuntimeProbeSchedule()

  /** @returns {Promise<RuntimeStageStatus>} */
  const startOcrRuntimeProbe = () => {
    if (!ocrRuntimeProbePromise) {
      ocrRuntimeProbePromise = probeRuntime('ocr')
    }
    return ocrRuntimeProbePromise
  }

  /** @returns {Promise<RuntimeStageStatus>} */
  const startInpaintRuntimeProbe = () => {
    if (!inpaintRuntimeProbePromise) {
      inpaintRuntimeProbePromise = probeRuntime('inpaint')
    }
    return inpaintRuntimeProbePromise
  }

  /** @returns {Promise<RuntimeStageStatus>} */
  const startBubbleRuntimeProbe = () => {
    if (!bubbleRuntimeProbePromise) {
      bubbleRuntimeProbePromise = probeRuntime('bubble')
    }
    return bubbleRuntimeProbePromise
  }

  // ---- detect ----
  throwIfCancelled(signal)
  report(onProgress, 'detect', '文本检测')
  try {
    if (ocrRuntimeProbeSchedule === 'detect-start') {
      startOcrRuntimeProbe()
    }
    if (!stopAfterOrder && inpaintRuntimeProbeSchedule === 'detect-start') {
      startInpaintRuntimeProbe()
    }
    if (bubbleRuntimeProbeSchedule === 'detect-start') {
      startBubbleRuntimeProbe()
    }
    const t0 = performance.now()
    const detected = await detectTextRegionsWithMask(image, platform)
    throwIfCancelled(signal)
    latestRegions = detected.regions
    stageRegions.detected = cloneTextRegions(latestRegions)
    detectionMaskCanvas = detected.rawMaskCanvas
    segmentationCanvas = detected.rawMaskCanvas
    detectionCanvas = drawRegions(originalCanvas, detected.regions, '文本检测', () => '文本框', platform)
    ocrCanvas = detectionCanvas
    cleanedCanvas = ocrCanvas
    resultCanvas = cleanedCanvas
    const detectorRuntime = getRuntimeStage('detector')
    if (detected.engine !== 'onnx') {
      setRuntimeStage({
        model: 'detector',
        enabled: true,
        engine: detected.engine,
        detail: `detector 已回退到 ${detected.engine ?? 'unknown'}: ${detected.fallbackReason ?? '未提供原因'}`,
      })
    } else if (detected.actualProvider && detected.actualProvider !== detectorRuntime?.provider) {
      const providerLabel = detected.actualProvider === 'webnn'
        ? `${detected.actualProvider}/${detected.actualWebnnDeviceType ?? 'default'}`
        : detected.actualProvider
      setRuntimeStage({
        model: 'detector',
        enabled: true,
        engine: 'onnx',
        provider: detected.actualProvider,
        webnnDeviceType: detected.actualWebnnDeviceType,
        detail: `detector 推理已回退到 (${providerLabel})`,
      })
    } else if (detectorRuntime) {
      setRuntimeStage({ ...detectorRuntime, engine: 'onnx' })
    }
    const durationMs = performance.now() - t0
    stageTimings.push({ stage: 'detect', label: '文本检测', durationMs })
    logPipelineStage(config, 'pipeline.detect', '文本检测完成', {
      engine: detected.engine,
      fallbackReason: detected.fallbackReason,
      provider: detected.actualProvider,
      webnnDeviceType: detected.actualWebnnDeviceType,
      regionCount: detected.regions.length,
      durationMs,
    })
    if (ocrRuntimeProbeSchedule === 'after-detect') {
      startOcrRuntimeProbe()
    }
    if (!stopAfterOrder && inpaintRuntimeProbeSchedule === 'after-detect') {
      startInpaintRuntimeProbe()
    }
    if (bubbleRuntimeProbeSchedule === 'after-detect') {
      startBubbleRuntimeProbe()
    }
  } catch (error) {
    logPipelineStage(config, 'pipeline.detect', '文本检测失败', undefined, error)
    throw new PipelineStageError('文本检测', toErrorDetail(error), buildArtifacts(), error)
  }

  // ---- bubble ----
  /** @type {Array<import('./types.js').BubbleDetection>} */
  let detectedBubbles = []
  throwIfCancelled(signal)
  try {
    if (ocrRuntimeProbeSchedule === 'bubble-start') {
      startOcrRuntimeProbe()
    }
    if (!stopAfterOrder && inpaintRuntimeProbeSchedule === 'bubble-start') {
      startInpaintRuntimeProbe()
    }
    report(onProgress, 'bubble', '气泡检测')
    if (bubbleRuntimeProbeSchedule !== 'current') {
      const bubblePreloadT0 = performance.now()
      setRuntimeStage(await startBubbleRuntimeProbe())
      throwIfCancelled(signal)
      stageTimings.push({
        stage: 'preload_bubble',
        label: '加载气泡模型',
        durationMs: performance.now() - bubblePreloadT0,
      })
    }
    const t0 = performance.now()
    const bubbleResult = await detectBubbles(image, platform)
    throwIfCancelled(signal)
    detectedBubbles = bubbleResult.bubbles
    const bubbleProviderLabel = bubbleResult.actualProvider === 'webnn'
      ? `${bubbleResult.actualProvider}/${bubbleResult.actualWebnnDeviceType ?? 'default'}`
      : bubbleResult.actualProvider
    setRuntimeStage({
      model: 'bubble',
      enabled: true,
      provider: bubbleResult.actualProvider,
      webnnDeviceType: bubbleResult.actualWebnnDeviceType,
      detail: `bubble 模型已运行 (${bubbleProviderLabel})`,
    })
    const durationMs = performance.now() - t0
    stageTimings.push({ stage: 'bubble', label: '气泡检测', durationMs })
    logPipelineStage(config, 'pipeline.bubble', '气泡检测完成', {
      bubbleCount: bubbleResult.bubbles.length,
      provider: bubbleResult.actualProvider,
      webnnDeviceType: bubbleResult.actualWebnnDeviceType,
      durationMs,
    })
    if (ocrRuntimeProbeSchedule === 'after-bubble') {
      startOcrRuntimeProbe()
    }
    if (!stopAfterOrder && inpaintRuntimeProbeSchedule === 'after-bubble') {
      startInpaintRuntimeProbe()
    }
  } catch (error) {
    // Degradation (non-fail-fast): bubble failure → empty bubbles + continue
    logPipelineStage(config, 'pipeline.bubble', '气泡检测失败，降级继续', undefined, error)
    console.warn(`[bubble] 气泡检测失败，降级继续（无气泡信息）: ${toErrorDetail(error)}`)
    detectedBubbles = []
  }

  // ---- ocr ----
  throwIfCancelled(signal)
  report(onProgress, 'ocr', 'OCR 日文识别')
  try {
    if (!stopAfterOrder && inpaintRuntimeProbeSchedule === 'ocr-start') {
      startInpaintRuntimeProbe()
    }
    const t0 = performance.now()
    setRuntimeStage(await startOcrRuntimeProbe())
    throwIfCancelled(signal)
    if (!stopAfterOrder && inpaintRuntimeProbeSchedule === 'current') {
      startInpaintRuntimeProbe()
    }
    const ocrResult = await runOcr(image, latestRegions, config.ocrEngine, platform, {
      compactActiveBatch: config.ocrCompactActiveBatch,
    })
    throwIfCancelled(signal)
    latestRegions = ocrResult.regions
    stageRegions.ocr = cloneTextRegions(latestRegions)
    ocrDebug = ocrResult.debug
    ocrCanvas = drawRegions(originalCanvas, ocrResult.regions, 'OCR 识别', region => region.sourceText, platform)
    cleanedCanvas = ocrCanvas
    resultCanvas = cleanedCanvas
    const ocrRuntime = getRuntimeStage('ocr')
    if (ocrResult.actualProvider !== ocrRuntime?.provider) {
      const providerLabel = ocrResult.actualProvider === 'webnn'
        ? `${ocrResult.actualProvider}/${ocrResult.actualWebnnDeviceType ?? 'default'}`
        : ocrResult.actualProvider
      setRuntimeStage({
        model: 'ocr',
        enabled: true,
        provider: ocrResult.actualProvider,
        webnnDeviceType: ocrResult.actualWebnnDeviceType,
        detail: `ocr 推理已回退到 (${providerLabel})`,
      })
    }
    const ocrDurationMs = performance.now() - t0
    stageTimings.push({ stage: 'ocr', label: 'OCR 日文识别', durationMs: ocrDurationMs })
    logPipelineStage(config, 'pipeline.ocr', 'OCR 识别完成', {
      engine: config.ocrEngine,
      provider: ocrResult.actualProvider,
      webnnDeviceType: ocrResult.actualWebnnDeviceType,
      regionCount: ocrResult.regions.length,
      durationMs: ocrDurationMs,
      debug: ocrResult.debug,
    })
    if (!stopAfterOrder) {
      const inpaintPreloadT0 = performance.now()
      setRuntimeStage(await startInpaintRuntimeProbe())
      throwIfCancelled(signal)
      stageTimings.push({
        stage: 'preload_inpaint',
        label: '加载去字模型',
        durationMs: performance.now() - inpaintPreloadT0,
      })
    }
  } catch (error) {
    logPipelineStage(config, 'pipeline.ocr', 'OCR 识别失败', undefined, error)
    throw new PipelineStageError('OCR', toErrorDetail(error), buildArtifacts(), error)
  }

  // ---- merge ----
  throwIfCancelled(signal)
  report(onProgress, 'merge', '合并文本行')
  try {
    const t0 = performance.now()
    latestRegions = mergeTextLines(latestRegions, image.naturalWidth, image.naturalHeight)
    stageRegions.merged = cloneTextRegions(latestRegions)
    stageTimings.push({ stage: 'merge', label: '合并文本行', durationMs: performance.now() - t0 })
  } catch (error) {
    throw new PipelineStageError('文本行合并', toErrorDetail(error), buildArtifacts(), error)
  }

  // ---- bubble-matching ----
  if (detectedBubbles.length > 0) {
    const matchResult = matchRegionsToBubbles(latestRegions, detectedBubbles)
    if (matchResult.unmatchedCount > 0) {
      console.warn(
        `[bubble] ${matchResult.unmatchedCount} 个文字区域未匹配到气泡:`,
        matchResult.unmatchedRegionIds
      )
    }
  }

  // ---- ocr_postfilter ----
  if ((config.ocrPostFilter ?? 'balanced') === 'off') {
    ocrPostFilterDebug = {
      mode: 'off',
      ruleId: OCR_POST_FILTER_RULE_ID,
      candidateCount: 0,
      filteredCount: 0,
      filteredRegionIds: [],
      decisions: [],
      durationMs: 0,
      skippedReason: 'disabled',
    }
  } else if (!detectionMaskCanvas) {
    ocrPostFilterDebug = {
      mode: 'balanced',
      ruleId: OCR_POST_FILTER_RULE_ID,
      candidateCount: 0,
      filteredCount: 0,
      filteredRegionIds: [],
      decisions: [],
      durationMs: 0,
      skippedReason: 'no-mask',
    }
  } else {
    throwIfCancelled(signal)
    report(onProgress, 'ocr_postfilter', '过滤 OCR 误识别')
    const t0 = performance.now()
    try {
      const result = await filterOcrRegions(
        image,
        detectionMaskCanvas,
        latestRegions,
        {
          platform,
          providerName: config.ocrEngine,
        }
      )
      throwIfCancelled(signal)
      latestRegions = result.regions
      ocrPostFilterDebug = result.debug
      logPipelineStage(config, 'pipeline.ocr', 'OCR 后处理完成', {
        ruleId: result.debug.ruleId,
        candidateCount: result.debug.candidateCount,
        filteredCount: result.debug.filteredCount,
        filteredRegionIds: result.debug.filteredRegionIds,
        durationMs: result.debug.durationMs,
      })
    } catch (error) {
      // Degradation (Shinobu native L688–709): catch + warn + keep all regions
      const detail = toErrorDetail(error)
      console.warn(`[ocr-postfilter] 后处理失败，保留全部区域: ${detail}`)
      ocrPostFilterDebug = {
        mode: 'balanced',
        ruleId: OCR_POST_FILTER_RULE_ID,
        candidateCount: 0,
        filteredCount: 0,
        filteredRegionIds: [],
        decisions: [],
        durationMs: performance.now() - t0,
        skippedReason: 'error',
        error: detail,
      }
      logPipelineStage(
        config,
        'pipeline.ocr',
        'OCR 后处理失败，已保留全部区域',
        undefined,
        error
      )
    } finally {
      stageTimings.push({
        stage: 'ocr_postfilter',
        label: '过滤 OCR 误识别',
        durationMs: performance.now() - t0,
      })
    }
  }

  // ---- order ----
  throwIfCancelled(signal)
  report(onProgress, 'order', '文本顺序排序')
  try {
    const t0 = performance.now()
    latestRegions = sortRegionsForRender(latestRegions, originalCanvas, platform)
    stageRegions.ordered = cloneTextRegions(latestRegions)
    stageTimings.push({ stage: 'order', label: '文本顺序排序', durationMs: performance.now() - t0 })
  } catch (error) {
    throw new PipelineStageError('顺序排序', toErrorDetail(error), buildArtifacts(), error)
  }

  const orderedRegions = latestRegions

  // ---- stopAfterOrder early-exit (Shinobu L757-761) ----
  if (stopAfterOrder) {
    report(onProgress, 'done', '完成')
    return buildArtifacts()
  }

  // ---- parallel: translate + erase (Shinobu L762-925) ----
  /** @typedef {'pending'|'running'|'done'} ParallelTranslateStatus */
  /** @typedef {'pending'|'mask_refine'|'inpaint'|'done'} ParallelEraseStatus */

  /** @type {ParallelTranslateStatus} */
  let parallelTranslateStatus = 'pending'
  /** @type {ParallelEraseStatus} */
  let parallelEraseStatus = 'pending'
  /** @type {StageTiming|null} */
  let translateTiming = null
  /** @type {StageTiming|null} */
  let maskRefineTiming = null
  /** @type {StageTiming|null} */
  let inpaintTiming = null
  let parallelTimingsFlushed = false

  const flushParallelTimings = () => {
    if (parallelTimingsFlushed) {
      return
    }
    if (translateTiming) {
      stageTimings.push(translateTiming)
    }
    if (maskRefineTiming) {
      stageTimings.push(maskRefineTiming)
    }
    if (inpaintTiming) {
      stageTimings.push(inpaintTiming)
    }
    parallelTimingsFlushed = true
  }

  const getTranslateDetail = () => {
    if (parallelTranslateStatus === 'running') {
      return '\u7ffb\u8bd1\u4e2d'
    }
    if (parallelTranslateStatus === 'done') {
      return '\u7ffb\u8bd1\u5b8c\u6210'
    }
    return '\u7ffb\u8bd1\u5f85\u6267\u884c'
  }

  const getEraseDetail = () => {
    if (parallelEraseStatus === 'mask_refine') {
      return '\u7ec6\u5316\u906e\u7f69\u4e2d'
    }
    if (parallelEraseStatus === 'inpaint') {
      return '\u53bb\u5b57\u4e2d'
    }
    if (parallelEraseStatus === 'done') {
      return '\u53bb\u5b57\u5b8c\u6210'
    }
    return '\u53bb\u5b57\u5f85\u6267\u884c'
  }

  const reportParallel = () => {
    report(onProgress, 'parallel', `${getTranslateDetail()} | ${getEraseDetail()}`)
  }

  reportParallel()
  const parallelT0 = performance.now()

  const shouldSkipTranslate = config.processMode === 'erase' || config.processMode === 'original' || config.eraseDebug

  // ---- translate task ----
  const translateTask = shouldSkipTranslate
    ? Promise.resolve(orderedRegions)
    : (async () => {
        throwIfCancelled(signal)
        parallelTranslateStatus = 'running'
        reportParallel()
        try {
          const t0 = performance.now()
          const translated = await runTranslate(orderedRegions, config)
          throwIfCancelled(signal)
          const translatedRegions = translated.regions
          translateTiming = { stage: 'translate', label: '\u7ffb\u8bd1\u4e3a\u4e2d\u6587', durationMs: performance.now() - t0 }
          translationDebug = translated.translationDebug
          parallelTranslateStatus = 'done'
          reportParallel()
          return translatedRegions
        } catch (error) {
          throw new PipelineStageError('\u7ffb\u8bd1', toErrorDetail(error), buildArtifacts(), error)
        }
      })()

  // ---- erase task ----
  const eraseTask = (async () => {
    throwIfCancelled(signal)
    if (!detectionMaskCanvas) {
      throw new PipelineStageError('\u906e\u7f69\u7ec6\u5316', '\u68c0\u6d4b\u9636\u6bb5\u672a\u63d0\u4f9b\u539f\u59cb mask\uff0c\u5df2\u7981\u7528\u6587\u672c\u6846\u906e\u7f69\u56de\u9000', buildArtifacts())
    }

    parallelEraseStatus = 'mask_refine'
    reportParallel()
    try {
      const t0 = performance.now()
      const regionsWithText = orderedRegions.filter(r => r.sourceText.trim() !== '')
      const refineResult = refineTextMask(originalCanvas, regionsWithText, detectionMaskCanvas, platform, {
        method: 'fit_text',
        kernelSize: 3,
      }, config.eraseDebug)
      throwIfCancelled(signal)
      refinedMaskCanvas = refineResult.refinedMaskCanvas
      if (refineResult.debugLayers) {
        debugLayers = refineResult.debugLayers
        eraseDebugCanvas = buildEraseDebugCanvas(originalCanvas, refineResult.debugLayers, platform, undefined)
      }
      maskRefineTiming = { stage: 'mask_refine', label: '\u7ec6\u5316\u53bb\u5b57\u906e\u7f69', durationMs: performance.now() - t0 }
    } catch (error) {
      throw new PipelineStageError('\u906e\u7f69\u7ec6\u5316', toErrorDetail(error), buildArtifacts(), error)
    }

    parallelEraseStatus = 'inpaint'
    reportParallel()
    try {
      const t0 = performance.now()
      if (!refinedMaskCanvas) {
        throw new Error('\u53bb\u5b57\u524d\u7f3a\u5c11 refined mask\uff0c\u5df2\u7981\u7528\u6587\u672c\u6846\u906e\u7f69\u56de\u9000')
      }
      const inpaintResult = await runInpaint(originalCanvas, refinedMaskCanvas, platform)
      throwIfCancelled(signal)
      const inpaintDurationMs = performance.now() - t0
      inpaintTiming = { stage: 'inpaint', label: '\u53bb\u5b57', durationMs: inpaintDurationMs }
      const inpaintRuntime = getRuntimeStage('inpaint')
      if (inpaintResult.actualProvider !== inpaintRuntime?.provider) {
        const providerLabel = inpaintResult.actualProvider === 'webnn'
          ? `${inpaintResult.actualProvider}/${inpaintResult.actualWebnnDeviceType ?? 'default'}`
          : inpaintResult.actualProvider
        setRuntimeStage({
          model: 'inpaint',
          enabled: true,
          provider: inpaintResult.actualProvider,
          webnnDeviceType: inpaintResult.actualWebnnDeviceType,
          detail: `inpaint \u63a8\u7406\u5df2\u56de\u9000\u5230 (${providerLabel})`,
        })
      }
      logPipelineStage(config, 'pipeline.inpaint', '去字推理完成', {
        provider: inpaintResult.actualProvider,
        webnnDeviceType: inpaintResult.actualWebnnDeviceType,
        durationMs: inpaintDurationMs,
      })
      parallelEraseStatus = 'done'
      reportParallel()
      return inpaintResult.canvas
    } catch (error) {
      // Degradation (non-fail-fast): inpaint failure → use original canvas
      logPipelineStage(config, 'pipeline.inpaint', '去字推理失败，降级使用原图', undefined, error)
      console.warn(`[inpaint] 去字推理失败，降级使用原图: ${toErrorDetail(error)}`)
      parallelEraseStatus = 'done'
      reportParallel()
      return originalCanvas
    }
  })()

  // ---- Promise.all strict parallel (Shinobu L906) ----
  try {
    const [translatedRegions, inpaintedCanvas] = await Promise.all([translateTask, eraseTask])
    throwIfCancelled(signal)
    latestRegions = translatedRegions
    cleanedCanvas = inpaintedCanvas
    resultCanvas = cleanedCanvas
    flushParallelTimings()
    const parallelLabel = shouldSkipTranslate ? '去字' : '并行处理(翻译 + 去字)'
    stageTimings.push({
      stage: 'parallel',
      label: parallelLabel,
      durationMs: performance.now() - parallelT0,
    })
  } catch (error) {
    await Promise.allSettled([translateTask, eraseTask])
    flushParallelTimings()
    if (error instanceof PipelineStageError) {
      throw error
    }
    throw new PipelineStageError('并行处理', toErrorDetail(error), buildArtifacts(), error)
  }

  // ---- typeset ----
  if (config.processMode === 'erase') {
    if (config.eraseDebug && debugLayers) {
      resultCanvas = buildEraseDebugCanvas(originalCanvas, debugLayers, platform, cleanedCanvas)
    } else {
      resultCanvas = cleanedCanvas
    }
  } else {
    throwIfCancelled(signal)
    const typesetLabel = config.processMode === 'original' ? '排版原文' : '排版和嵌字'
    report(onProgress, 'typeset', typesetLabel)
    try {
      const t0 = performance.now()
      const typesetResult = await drawTypeset(cleanedCanvas, latestRegions, config.targetLang, {
        debugMode: config.typesetDebug,
        renderText: true,
        collectDebugLog: false,
      }, platform)
      throwIfCancelled(signal)
      resultCanvas = typesetResult.canvas
      if (config.eraseDebug && eraseDebugCanvas) {
        resultCanvas = eraseDebugCanvas
      }
      if (config.collectDebugLog) {
        const debugOriginalTypeset = await drawTypeset(originalCanvas, latestRegions, config.targetLang, {
          debugMode: true,
          renderText: false,
          collectDebugLog: true,
        }, platform)
        throwIfCancelled(signal)
        debugOriginalCanvas = debugOriginalTypeset.canvas
        typesetDebugLog = debugOriginalTypeset.debugLog
      } else {
        debugOriginalCanvas = null
        typesetDebugLog = null
      }
      const durationMs = performance.now() - t0
      stageTimings.push({ stage: 'typeset', label: typesetLabel, durationMs })
      logPipelineStage(config, 'pipeline.typeset', '排版完成', {
        mode: config.processMode,
        regionCount: latestRegions.length,
        durationMs,
        debugRegionCount: typesetDebugLog?.regions.length,
      })
    } catch (error) {
      // Degradation (non-fail-fast): typeset failure → skip, use previous canvas
      logPipelineStage(config, 'pipeline.typeset', '排版失败，跳过并保留上一阶段结果', undefined, error)
      console.warn(`[typeset] 排版失败，跳过并保留上一阶段结果: ${toErrorDetail(error)}`)
      // resultCanvas already holds cleanedCanvas (or erase debug canvas) — keep it
    }
  }

  // ---- done ----
  throwIfCancelled(signal)
  report(onProgress, 'done', '完成')
  return buildArtifacts()
}
