/**
 * @file PaddleOCR v6 Medium CTC recognizer — ONNX inference provider.
 *
 * Mechanically converted from ShinobuTranslator
 * `src/pipeline/ocr/paddleocrProvider.ts` (TS → JS).
 *
 * Uses onnxBridge.runInference (T7) for ONNX session runs,
 * modelRegistry.getModel/getModelSession (T4) for model discovery/caching.
 */

import { getModel, getModelSession } from '../../runtime/modelRegistry.js'
import { serializeOnnxSessionOptions } from '../../runtime/onnxSessionOptions.js'
import { buildPaddleOcrInput } from './paddleocrPreprocess.js'
import { decodePaddleCtc } from './paddleocrDecode.js'
import { loadCharset } from './ocrShared.js'
import { runInference } from '../../runtime/onnxBridge.js'

/** @typedef {import('./provider.js').OcrProvider} OcrProvider */
/** @typedef {import('./provider.js').OcrRecognizeOutput} OcrRecognizeOutput */
/** @typedef {import('./provider.js').OcrRecognizeResult} OcrRecognizeResult */
/** @typedef {import('../../types.js').OcrRunDebugChunk} OcrRunDebugChunk */
/** @typedef {import('../../types.js').OcrRunDebugInfo} OcrRunDebugInfo */
/** @typedef {import('../../types.js').PaddleOcrInferenceDebug} PaddleOcrInferenceDebug */
/** @typedef {import('../../types.js').PaddleOcrRunDebug} PaddleOcrRunDebug */
/** @typedef {import('../../types.js').TextRegion} TextRegion */
/** @typedef {import('../../types.js').QuadPoint} QuadPoint */
/** @typedef {import('../../runtime/platform.js').PlatformProvider} PlatformProvider */
/** @typedef {import('../../runtime/platform.js').PipelineImage} PipelineImage */
/** @typedef {import('../../runtime/onnxTypes.js').RuntimeProvider} RuntimeProvider */
/** @typedef {import('../../runtime/onnxTypes.js').WebNnDeviceType} WebNnDeviceType */
/** @typedef {import('../../runtime/onnxSessionOptions.js').OnnxSessionOptions} OnnxSessionOptions */
/** @typedef {import('../../runtime/onnxWorkerTypes.js').TensorTransport} TensorTransport */
/** @typedef {import('./paddleocrPreprocess.js').PaddleOcrInputData} PaddleOcrInputData */
/** @typedef {import('./paddleocrDecode.js').PaddleCtcResult} PaddleCtcResult */
/** @typedef {import('./preprocess.js').Direction} Direction */
/** @typedef {import('../../runtime/modelRegistry.js').ModelName} ModelName */
/** @typedef {Extract<ModelName, 'paddleocr_v6_medium_rec'>} PaddleOcrModelName */

/**
 * @typedef {Object} PreparedPaddleRegion
 * @property {number} index
 * @property {TextRegion} region
 * @property {Direction} direction
 * @property {PaddleOcrInputData} inputData
 * @property {number} inputBytes
 */

/**
 * @typedef {Object} PaddleBatchDecodeOutput
 * @property {Array<PaddleCtcResult>} decoded
 * @property {number} timeSteps
 * @property {number} numClasses
 */

/**
 * @typedef {Object} PreparedPaddleRuntime
 * @property {string} modelName
 * @property {ModelName} model
 * @property {import('../../runtime/onnxWorkerTypes.js').WorkerSessionHandle} sessionHandle
 * @property {Array<string>} ctcCharset
 * @property {number} inputHeight
 * @property {number} maxInputWidth
 * @property {'zero_to_one'|'minus_one_to_one'} normalize
 * @property {'rgb'|'bgr'} channelOrder
 * @property {OnnxSessionOptions} [sessionOptions]
 * @property {{ modelLoadMs: number, sessionLoadMs: number, charsetLoadMs: number }} timings
 */

/**
 * @typedef {Object} PaddleOcrWarmupResult
 * @property {string} modelName
 * @property {RuntimeProvider} provider
 * @property {WebNnDeviceType} [webnnDeviceType]
 * @property {Array<number>} inputDims
 * @property {Array<number>} [outputDims]
 * @property {number} sessionLoadMs
 * @property {number} charsetLoadMs
 * @property {number} runMs
 * @property {number} outputBytes
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PADDLEOCR_CONFIDENCE_THRESHOLD = 0.2
const PADDLEOCR_BATCH_BUCKET_WIDTH = 32
const warmedPaddleSessionIds = new Set()

/**
 * @typedef {typeof globalThis & {
 *   __shinobuPaddleOcrWidthBucketBatch?: boolean,
 *   __shinobuPaddleOcrProviders?: Array<RuntimeProvider>,
 *   __shinobuPaddleOcrColdFirstSerial?: boolean,
 *   __shinobuPaddleOcrModelName?: string,
 *   __shinobuPaddleOcrSessionOptions?: OnnxSessionOptions,
 *   __shinobuPaddleOcrFixedInputWidth?: number,
 * }} PaddleOcrRuntimeFlags
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * @param {TextRegion} region
 * @returns {Direction}
 */
function inferDirection(region) {
  if (region.direction) return region.direction
  return region.box.height > region.box.width ? 'v' : 'h'
}

/**
 * @param {TensorTransport|undefined} tensor
 * @returns {number}
 */
function tensorByteLength(tensor) {
  return tensor?.data.byteLength ?? 0
}

/**
 * @param {RuntimeProvider} provider
 * @param {WebNnDeviceType} [webnnDeviceType]
 * @returns {boolean}
 */
function shouldUsePaddleWidthBucketBatch(provider, webnnDeviceType) {
  const configured = /** @type {PaddleOcrRuntimeFlags} */ (globalThis).__shinobuPaddleOcrWidthBucketBatch
  if (configured !== undefined) {
    return configured
  }
  return provider === 'webgpu' || provider === 'cuda' || (provider === 'webnn' && webnnDeviceType !== 'cpu')
}

/**
 * @param {RuntimeProvider} provider
 * @param {string} sessionId
 * @returns {boolean}
 */
function shouldUsePaddleColdFirstSerial(provider, sessionId) {
  const configured = /** @type {PaddleOcrRuntimeFlags} */ (globalThis).__shinobuPaddleOcrColdFirstSerial
  if (configured !== undefined) {
    return configured
  }
  return provider === 'webgpu' && !warmedPaddleSessionIds.has(sessionId)
}

/**
 * @param {string} defaultModelName
 * @returns {string}
 */
function resolvePaddleOcrModelName(defaultModelName) {
  const configured = /** @type {PaddleOcrRuntimeFlags} */ (globalThis).__shinobuPaddleOcrModelName
  return configured === 'paddleocr_v6_medium_rec' ? configured : defaultModelName
}

/**
 * @returns {OnnxSessionOptions|undefined}
 */
function resolvePaddleSessionOptions() {
  const configured = /** @type {PaddleOcrRuntimeFlags} */ (globalThis).__shinobuPaddleOcrSessionOptions
  if (!configured) {
    return undefined
  }
  return {
    enableGraphCapture: configured.enableGraphCapture,
    preferredOutputLocation: configured.preferredOutputLocation,
    freeDimensionOverrides: configured.freeDimensionOverrides
      ? { ...configured.freeDimensionOverrides }
      : undefined,
  }
}

/**
 * @param {number} maxInputWidth
 * @returns {number|undefined}
 */
function resolvePaddleFixedInputWidth(maxInputWidth) {
  const configured = /** @type {PaddleOcrRuntimeFlags} */ (globalThis).__shinobuPaddleOcrFixedInputWidth
  if (typeof configured !== 'number' || !Number.isFinite(configured) || configured <= 0) {
    return undefined
  }
  return Math.max(1, Math.min(maxInputWidth, Math.round(configured)))
}

/**
 * @param {Array<RuntimeProvider>|undefined} modelRuntime
 * @returns {Array<RuntimeProvider>}
 */
function resolvePaddleRuntimeProviders(modelRuntime) {
  const configured = /** @type {PaddleOcrRuntimeFlags} */ (globalThis).__shinobuPaddleOcrProviders
  if (configured && configured.length > 0) {
    return configured
  }
  return modelRuntime ?? ['webgpu', 'webnn', 'wasm']
}

// ---------------------------------------------------------------------------
// preparePaddleOcrRuntime & warmupPaddleOcrRuntime
// ---------------------------------------------------------------------------

/**
 * @param {string} [defaultModelName]
 * @returns {Promise<PreparedPaddleRuntime>}
 */
export async function preparePaddleOcrRuntime(defaultModelName) {
  const modelName = resolvePaddleOcrModelName(defaultModelName ?? 'paddleocr_v6_medium_rec')
  const modelT0 = performance.now()
  const model = await getModel(modelName)
  const modelLoadMs = performance.now() - modelT0
  const sessionOptions = resolvePaddleSessionOptions()
  const sessionT0 = performance.now()
  const sessionHandle = await getModelSession(
    modelName,
    resolvePaddleRuntimeProviders(model.runtime),
    sessionOptions
  )
  const sessionLoadMs = performance.now() - sessionT0
  const charsetT0 = performance.now()
  const charset = await loadCharset(model.dictUrl)
  const charsetLoadMs = performance.now() - charsetT0
  if (!charset) {
    throw new Error('PaddleOCR 字典加载失败')
  }

  return {
    modelName,
    model,
    sessionHandle,
    ctcCharset: ['', ...charset, ' '],
    inputHeight: Number.isFinite(model.input?.[0]) ? model.input[0] : 48,
    maxInputWidth: Number.isFinite(model.input?.[1]) ? model.input[1] : 320,
    normalize: model.normalize ?? 'minus_one_to_one',
    channelOrder: model.channelOrder ?? 'rgb',
    sessionOptions,
    timings: {
      modelLoadMs,
      sessionLoadMs,
      charsetLoadMs,
    },
  }
}

/**
 * @param {{ inputWidth?: number, batchSize?: number }} [options]
 * @returns {Promise<PaddleOcrWarmupResult>}
 */
export async function warmupPaddleOcrRuntime(options) {
  const opts = options ?? {}
  const runtime = await preparePaddleOcrRuntime()
  const inputWidth = Math.max(1, Math.min(runtime.maxInputWidth, Math.round(opts.inputWidth ?? runtime.maxInputWidth)))
  const batchSize = Math.max(1, Math.round(opts.batchSize ?? 1))
  const imageInputName = runtime.sessionHandle.inputNames[0]
  const outputName = runtime.sessionHandle.outputNames[0]
  if (!imageInputName) {
    throw new Error('PaddleOCR 模型缺少输入名称')
  }
  const inputDims = [batchSize, 3, runtime.inputHeight, inputWidth]
  const inputData = new Float32Array(batchSize * 3 * runtime.inputHeight * inputWidth)
  const runT0 = performance.now()
  const inferenceResult = await runInference(runtime.sessionHandle.sessionId, {
    [imageInputName]: {
      data: inputData,
      dims: inputDims,
      type: 'float32',
    },
  })
  const runMs = performance.now() - runT0
  if (inferenceResult.error) {
    throw new Error(inferenceResult.error)
  }
  warmedPaddleSessionIds.add(runtime.sessionHandle.sessionId)
  const output = outputName ? inferenceResult.outputs[outputName] : Object.values(inferenceResult.outputs)[0]
  return {
    modelName: runtime.modelName,
    provider: runtime.sessionHandle.provider,
    webnnDeviceType: runtime.sessionHandle.webnnDeviceType,
    inputDims,
    outputDims: output ? [...output.dims] : undefined,
    sessionLoadMs: runtime.timings.sessionLoadMs,
    charsetLoadMs: runtime.timings.charsetLoadMs,
    runMs,
    outputBytes: tensorByteLength(output),
  }
}

// ---------------------------------------------------------------------------
// Batch packing & decoding
// ---------------------------------------------------------------------------

/**
 * @param {TextRegion} region
 * @returns {[QuadPoint, QuadPoint, QuadPoint, QuadPoint]}
 */
function makeRegionQuad(region) {
  return region.quad ?? [
    { x: region.box.x, y: region.box.y },
    { x: region.box.x + region.box.width, y: region.box.y },
    { x: region.box.x + region.box.width, y: region.box.y + region.box.height },
    { x: region.box.x, y: region.box.y + region.box.height },
  ]
}

/**
 * @param {number} resizedWidth
 * @param {number} maxInputWidth
 * @returns {number}
 */
function resolvePaddleBucketWidth(resizedWidth, maxInputWidth) {
  return Math.max(
    1,
    Math.min(maxInputWidth, Math.ceil(resizedWidth / PADDLEOCR_BATCH_BUCKET_WIDTH) * PADDLEOCR_BATCH_BUCKET_WIDTH)
  )
}

/**
 * @param {Array<PreparedPaddleRegion>} items
 * @param {number} inputHeight
 * @param {number} width
 * @returns {Float32Array}
 */
function packPaddleBatch(items, inputHeight, width) {
  const batchData = new Float32Array(items.length * 3 * inputHeight * width)
  for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
    const input = items[itemIndex].inputData
    const srcWidth = input.resizedWidth
    for (let channel = 0; channel < 3; channel += 1) {
      const srcChannelOffset = channel * inputHeight * srcWidth
      const dstChannelOffset = itemIndex * 3 * inputHeight * width + channel * inputHeight * width
      for (let y = 0; y < inputHeight; y += 1) {
        batchData.set(
          input.data.subarray(srcChannelOffset + y * srcWidth, srcChannelOffset + y * srcWidth + srcWidth),
          dstChannelOffset + y * width
        )
      }
    }
  }
  return batchData
}

/**
 * @param {Array<PreparedPaddleRegion>} items
 * @param {number} inputHeight
 * @param {number} width
 * @returns {Float32Array}
 */
function buildPaddleGroupInput(items, inputHeight, width) {
  if (items.length === 1 && items[0].inputData.resizedWidth === width) {
    return items[0].inputData.data
  }
  return packPaddleBatch(items, inputHeight, width)
}

/**
 * @param {TensorTransport} output
 * @param {number} batchSize
 * @param {Array<string>} ctcCharset
 * @returns {PaddleBatchDecodeOutput|null}
 */
function decodePaddleBatchOutput(output, batchSize, ctcCharset) {
  const logitsData = /** @type {Float32Array} */ (output.data)
  const logitsDims = output.dims
  if (logitsDims.length === 3) {
    const outputBatchSize = logitsDims[0]
    const timeSteps = logitsDims[1]
    const numClasses = logitsDims[2]
    if (outputBatchSize < batchSize) {
      return null
    }
    const itemStride = timeSteps * numClasses
    const decoded = Array.from({ length: batchSize }, (_, index) => {
      const logits = logitsData.subarray(index * itemStride, (index + 1) * itemStride)
      return decodePaddleCtc(logits, timeSteps, numClasses, ctcCharset)
    })
    return { decoded, timeSteps, numClasses }
  }
  if (logitsDims.length === 2 && batchSize === 1) {
    const timeSteps = logitsDims[0]
    const numClasses = logitsDims[1]
    return {
      decoded: [decodePaddleCtc(logitsData, timeSteps, numClasses, ctcCharset)],
      timeSteps,
      numClasses,
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Debug info
// ---------------------------------------------------------------------------

/**
 * @param {string} modelName
 * @param {number} inputHeight
 * @param {number} maxInputWidth
 * @param {'zero_to_one'|'minus_one_to_one'} normalize
 * @param {'rgb'|'bgr'} channelOrder
 * @param {{ modelLoadMs: number, sessionLoadMs: number, charsetLoadMs: number }} timings
 * @param {{ fixedInputWidth?: number, sessionOptionsKey?: string }} [options]
 * @returns {{ debugInfo: OcrRunDebugInfo, paddleDebug: PaddleOcrRunDebug }}
 */
function createPaddleDebugInfo(
  modelName,
  inputHeight,
  maxInputWidth,
  normalize,
  channelOrder,
  timings,
  options
) {
  const opts = options ?? {}
  const paddleDebug = /** @type {PaddleOcrRunDebug} */ ({
    modelName,
    batchMode: 'serial',
    inputHeight,
    maxInputWidth,
    fixedInputWidth: opts.fixedInputWidth,
    sessionOptionsKey: opts.sessionOptionsKey,
    normalize,
    channelOrder,
    modelLoadMs: timings.modelLoadMs,
    sessionLoadMs: timings.sessionLoadMs,
    charsetLoadMs: timings.charsetLoadMs,
    preprocessTotalMs: 0,
    inferenceTotalMs: 0,
    decodeTotalMs: 0,
    inputBytesTotal: 0,
    outputBytesTotal: 0,
    acceptedCount: 0,
    rejectedCount: 0,
    missingOutputCount: 0,
    regions: [],
    inferenceRuns: [],
  })
  const debugInfo = /** @type {OcrRunDebugInfo} */ ({
    mode: 'ctc',
    candidateCount: 0,
    preparedCount: 0,
    preprocessTotalMs: 0,
    preprocessPerRegionMs: [],
    chunkBatchSize: 1,
    chunks: [],
    colorDecodeMode: 'none',
    colorBatchSize: 0,
    colorSessionRunCount: 0,
    colorSessionRunTotalMs: 0,
    colorTotalMs: 0,
    colorFallbackRegions: [],
    fallbackTriggerCount: 0,
    totalSessionRunCount: 0,
    totalSessionRunMs: 0,
    paddle: paddleDebug,
  })
  return { debugInfo, paddleDebug }
}

/**
 * @param {OcrRunDebugInfo} debugInfo
 * @param {number} runIndex
 * @param {Array<string>} regionIds
 * @param {number} durationMs
 * @param {number} acceptedCount
 */
function addPaddleChunk(debugInfo, runIndex, regionIds, durationMs, acceptedCount) {
  const chunk = /** @type {OcrRunDebugChunk} */ ({
    chunkIndex: runIndex,
    chunkSize: regionIds.length,
    regionIds,
    decodeMode: 'batch',
    decodeAccepted: acceptedCount,
    decodeSessionRunCount: 1,
    decodeSessionRunTotalMs: durationMs,
    decodeSteps: [{
      step: runIndex,
      activeCount: regionIds.length,
      batchSize: regionIds.length,
      durationMs,
    }],
    fallbackRegions: [],
  })
  debugInfo.chunks.push(chunk)
  debugInfo.totalSessionRunCount += 1
  debugInfo.totalSessionRunMs += durationMs
}

// ---------------------------------------------------------------------------
// createPaddleOcrProvider
// ---------------------------------------------------------------------------

/**
 * Factory that creates a PaddleOCR provider closure.
 * @param {string} name - Provider registration name
 * @param {string} modelName - Model name key in the manifest
 * @returns {OcrProvider}
 */
function createPaddleOcrProvider(name, modelName) {
  return {
    name,

    /**
     * @param {PipelineImage} image
     * @param {Array<TextRegion>} regions
     * @param {PlatformProvider} [platform]
     * @returns {Promise<OcrRecognizeOutput>}
     */
    async recognize(image, regions, platform) {
      if (!platform) {
        throw new Error('PaddleOCR 需要可用的运行平台')
      }
      const runtime = await preparePaddleOcrRuntime(modelName)
      const {
        modelName: resolvedModelName,
        sessionHandle,
        ctcCharset,
        inputHeight,
        maxInputWidth,
        normalize,
        channelOrder,
        sessionOptions,
        timings,
      } = runtime
      const requestedFixedInputWidth = resolvePaddleFixedInputWidth(maxInputWidth)
      const { debugInfo, paddleDebug } = createPaddleDebugInfo(
        resolvedModelName,
        inputHeight,
        maxInputWidth,
        normalize,
        channelOrder,
        timings,
        {
          fixedInputWidth: requestedFixedInputWidth,
          sessionOptionsKey: serializeOnnxSessionOptions(sessionOptions),
        }
      )
      debugInfo.candidateCount = regions.length
      paddleDebug.provider = sessionHandle.provider
      paddleDebug.webnnDeviceType = sessionHandle.webnnDeviceType

      const imageInputName = sessionHandle.inputNames[0]
      if (!imageInputName) {
        return { results: [], provider: sessionHandle.provider, webnnDeviceType: sessionHandle.webnnDeviceType, debug: debugInfo }
      }

      const preparedRegions = /** @type {Array<PreparedPaddleRegion>} */ ([])
      const resultsByIndex = Array.from({ length: regions.length }, () => null)
      const debugRegionById = new Map()
      for (const [index, region] of regions.entries()) {
        const direction = inferDirection(region)
        const preprocessT0 = performance.now()
        const inputData = buildPaddleOcrInput(
          image,
          region,
          direction,
          inputHeight,
          maxInputWidth,
          normalize,
          platform,
          channelOrder
        )
        const preprocessMs = performance.now() - preprocessT0
        const inputBytes = inputData.data.byteLength
        debugInfo.preparedCount += 1
        debugInfo.preprocessTotalMs += preprocessMs
        debugInfo.preprocessPerRegionMs.push({ regionId: region.id, durationMs: preprocessMs })
        paddleDebug.preprocessTotalMs += preprocessMs
        const regionDebug = {
          regionId: region.id,
          direction,
          box: { ...region.box },
          inputDims: [...inputData.dims],
          resizedWidth: inputData.resizedWidth,
          inputBytes,
          preprocessMs,
        }
        paddleDebug.regions.push(regionDebug)
        debugRegionById.set(region.id, regionDebug)
        preparedRegions.push({ index, region, direction, inputData, inputBytes })
      }

      const fixedInputWidth = requestedFixedInputWidth === undefined
        ? undefined
        : Math.max(requestedFixedInputWidth, ...preparedRegions.map(item => item.inputData.resizedWidth))
      if (fixedInputWidth !== requestedFixedInputWidth) {
        paddleDebug.fixedInputWidth = fixedInputWidth
      }

      let inferenceRunIndex = 0

      /**
       * @param {Array<PreparedPaddleRegion>} group
       * @param {number} inputWidth
       * @param {boolean} allowFallback
       * @returns {Promise<void>}
       */
      const runPreparedGroup = async (group, inputWidth, allowFallback) => {
        const currentRunIndex = inferenceRunIndex
        inferenceRunIndex += 1
        const regionIds = group.map(item => item.region.id)
        const batchInput = buildPaddleGroupInput(group, inputHeight, inputWidth)
        const inputDims = [group.length, 3, inputHeight, inputWidth]
        const inputBytes = batchInput.byteLength
        const runDebug = /** @type {PaddleOcrInferenceDebug} */ ({
          runIndex: currentRunIndex,
          regionIds,
          inputDims,
          inputBytes,
          outputBytes: 0,
          durationMs: 0,
          decodeMs: 0,
          accepted: false,
          acceptedCount: 0,
          rejectedCount: 0,
        })

        const feeds = {
          [imageInputName]: {
            data: batchInput,
            dims: inputDims,
            type: 'float32',
          },
        }

        const inferenceT0 = performance.now()
        let inferenceResult
        try {
          inferenceResult = await runInference(sessionHandle.sessionId, feeds)
        } catch (error) {
          const inferenceMs = performance.now() - inferenceT0
          runDebug.durationMs = inferenceMs
          runDebug.error = error instanceof Error ? error.message : String(error)
          paddleDebug.inferenceTotalMs += inferenceMs
          paddleDebug.inputBytesTotal += inputBytes
          paddleDebug.inferenceRuns.push(runDebug)
          addPaddleChunk(debugInfo, currentRunIndex, regionIds, inferenceMs, 0)
          if (allowFallback && group.length > 1) {
            for (const item of group) {
              await runPreparedGroup([item], item.inputData.resizedWidth, false)
            }
            return
          }
          throw error
        }
        const inferenceMs = performance.now() - inferenceT0
        runDebug.durationMs = inferenceMs
        paddleDebug.inferenceTotalMs += inferenceMs
        paddleDebug.inputBytesTotal += inputBytes
        if (inferenceResult.error) {
          runDebug.error = inferenceResult.error
          paddleDebug.inferenceRuns.push(runDebug)
          addPaddleChunk(debugInfo, currentRunIndex, regionIds, inferenceMs, 0)
          if (allowFallback && group.length > 1) {
            for (const item of group) {
              await runPreparedGroup([item], item.inputData.resizedWidth, false)
            }
            return
          }
          throw new Error(inferenceResult.error)
        }

        const logitsOutput = inferenceResult.outputs[sessionHandle.outputNames[0]]
        if (!logitsOutput) {
          paddleDebug.missingOutputCount += group.length
          runDebug.error = '模型未返回 logits 输出'
          paddleDebug.inferenceRuns.push(runDebug)
          addPaddleChunk(debugInfo, currentRunIndex, regionIds, inferenceMs, 0)
          if (allowFallback && group.length > 1) {
            for (const item of group) {
              await runPreparedGroup([item], item.inputData.resizedWidth, false)
            }
          }
          return
        }

        const logitsDims = logitsOutput.dims
        const outputBytes = tensorByteLength(logitsOutput)
        paddleDebug.outputBytesTotal += outputBytes
        runDebug.outputBytes = outputBytes
        runDebug.outputDims = [...logitsDims]
        const decodeT0 = performance.now()
        const decodedOutput = decodePaddleBatchOutput(logitsOutput, group.length, ctcCharset)
        const decodeMs = performance.now() - decodeT0
        runDebug.decodeMs = decodeMs
        paddleDebug.decodeTotalMs += decodeMs
        if (!decodedOutput) {
          runDebug.error = `不支持的 logits 维度: ${logitsDims.join('x')}`
          paddleDebug.inferenceRuns.push(runDebug)
          addPaddleChunk(debugInfo, currentRunIndex, regionIds, inferenceMs, 0)
          if (allowFallback && group.length > 1) {
            for (const item of group) {
              await runPreparedGroup([item], item.inputData.resizedWidth, false)
            }
          }
          return
        }

        let acceptedCount = 0
        let rejectedCount = 0
        const texts = []
        for (let itemIndex = 0; itemIndex < group.length; itemIndex += 1) {
          const item = group[itemIndex]
          const decoded = decodedOutput.decoded[itemIndex]
          const accepted = (
            decoded.confidence >= PADDLEOCR_CONFIDENCE_THRESHOLD &&
            decoded.text.trim() !== ''
          )
          const regionDebug = debugRegionById.get(item.region.id)
          if (regionDebug) {
            regionDebug.decodedText = decoded.text
            regionDebug.confidence = decoded.confidence
            regionDebug.accepted = accepted
          }
          texts.push(decoded.text)
          if (!accepted) {
            rejectedCount += 1
            continue
          }
          acceptedCount += 1
          resultsByIndex[item.index] = {
            regionId: item.region.id,
            text: decoded.text,
            confidence: decoded.confidence,
            quad: makeRegionQuad(item.region),
          }
        }
        paddleDebug.acceptedCount += acceptedCount
        paddleDebug.rejectedCount += rejectedCount
        runDebug.accepted = acceptedCount > 0
        runDebug.acceptedCount = acceptedCount
        runDebug.rejectedCount = rejectedCount
        runDebug.timeSteps = decodedOutput.timeSteps
        runDebug.numClasses = decodedOutput.numClasses
        runDebug.texts = texts
        if (group.length === 1) {
          const decoded = decodedOutput.decoded[0]
          runDebug.text = decoded.text
          runDebug.confidence = decoded.confidence
        }
        paddleDebug.inferenceRuns.push(runDebug)
        addPaddleChunk(debugInfo, currentRunIndex, regionIds, inferenceMs, acceptedCount)
      }

      const useWidthBucketBatch = shouldUsePaddleWidthBucketBatch(sessionHandle.provider, sessionHandle.webnnDeviceType)
      paddleDebug.batchMode = useWidthBucketBatch ? 'width-bucket' : 'serial'
      if (useWidthBucketBatch) {
        paddleDebug.batchBucketWidth = PADDLEOCR_BATCH_BUCKET_WIDTH
        const useColdFirstSerial = preparedRegions.length > 1 &&
          shouldUsePaddleColdFirstSerial(sessionHandle.provider, sessionHandle.sessionId)
        paddleDebug.coldFirstSerial = useColdFirstSerial
        let bucketCandidates = preparedRegions
        if (useColdFirstSerial) {
          warmedPaddleSessionIds.add(sessionHandle.sessionId)
          const [firstRegion, ...remainingRegions] = preparedRegions
          await runPreparedGroup([firstRegion], fixedInputWidth ?? firstRegion.inputData.resizedWidth, false)
          bucketCandidates = remainingRegions
        }
        const groups = new Map()
        for (const item of bucketCandidates) {
          const bucketWidth = fixedInputWidth ?? resolvePaddleBucketWidth(item.inputData.resizedWidth, maxInputWidth)
          const group = groups.get(bucketWidth)
          if (group) {
            group.push(item)
          } else {
            groups.set(bucketWidth, [item])
          }
        }
        debugInfo.chunkBatchSize = Math.max(1, ...Array.from(groups.values(), group => group.length))
        for (const [bucketWidth, group] of groups) {
          await runPreparedGroup(group, bucketWidth, true)
        }
      } else {
        warmedPaddleSessionIds.add(sessionHandle.sessionId)
        for (const item of preparedRegions) {
          await runPreparedGroup([item], fixedInputWidth ?? item.inputData.resizedWidth, false)
        }
      }

      warmedPaddleSessionIds.add(sessionHandle.sessionId)
      const results = resultsByIndex.filter(result => result !== null)
      return { results, provider: sessionHandle.provider, webnnDeviceType: sessionHandle.webnnDeviceType, debug: debugInfo }
    },
  }
}

// ---------------------------------------------------------------------------
// Singleton provider instance
// ---------------------------------------------------------------------------

export const paddleocrV6MediumProvider = createPaddleOcrProvider('paddleocr_v6_medium', 'paddleocr_v6_medium_rec')
