/**
 * OCR recognition module using PP-OCRv6.
 * Handles width-bucket batching, preprocessing, inference, decoding, and post-filtering.
 */

import { runInference, loadModel, getModelSession } from '../onnx/index.js'
import { getModelUrl, getModel } from '../onnx/modelRegistry.js'
import { buildPaddleOcrInput } from './ocrPreprocess.js'
import { loadCharset, decodePaddleCtc, ocrPostFilter } from './ocrDecode.js'

/**
 * Group regions by similar width for batch inference.
 * Buckets: <48px, 48-64px, 64-96px, 96-128px, 128-160px, 160-192px, 192-256px, 256-320px, >320px
 * @param {Array} regions
 * @returns {Map<string, Array<{region: object, index: number}>>}
 */
function bucketByWidth(regions) {
  const buckets = new Map()
  const bucketKeys = ['0-48', '48-64', '64-96', '96-128', '128-160', '160-192', '192-256', '256-320', '320+']

  for (const key of bucketKeys) buckets.set(key, [])

  const getBucketKey = w => {
    if (w <= 48) return '0-48'
    if (w <= 64) return '48-64'
    if (w <= 96) return '64-96'
    if (w <= 128) return '96-128'
    if (w <= 160) return '128-160'
    if (w <= 192) return '160-192'
    if (w <= 256) return '192-256'
    if (w <= 320) return '256-320'
    return '320+'
  }

  regions.forEach((region, index) => {
    const key = getBucketKey(region.box.width)
    buckets.get(key).push({ region, index })
  })

  return buckets
}

/**
 * Run OCR on detected regions using PP-OCRv6.
 * For each region: extract sub-image → preprocess → ONNX inference → CTC decode
 * Uses width-bucket batching for efficiency.
 *
 * @param {HTMLImageElement|HTMLCanvasElement} image - Source manga page
 * @param {import('./types.js').TextRegion[]} regions - Detected text regions
 * @param {Worker} worker - ONNX inference worker
 * @returns {Promise<import('./types.js').TextRegion[]>} Regions with sourceText populated
 */
export async function runOcr(image, regions, worker) {
  if (!regions || regions.length === 0) return []

  const modelUrl = await getModelUrl('paddleocr_v6_medium_rec')
  await getModelSession('paddleocr_v6_medium_rec', modelUrl)

  const modelConfig = await getModel('paddleocr_v6_medium_rec')
  const dictUrl = modelConfig.dictUrl
    ? modelConfig.baseUrl + modelConfig.dictUrl
    : await getDictUrlFromManifest()
  const charset = await loadCharset(dictUrl)

  const buckets = bucketByWidth(regions)
  const allResults = []

  for (const [, bucket] of buckets) {
    if (bucket.length === 0) continue

    // Collect all valid preprocessed inputs in this bucket
    const batchInputs = []
    let maxW = 0

    for (const { region, index } of bucket) {
      try {
        const input = buildPaddleOcrInput(image, region.box)
        if (!input) {
          allResults[index] = null
          continue
        }
        // input: { tensor: { data: Float32Array, dims: [1, 3, 48, W] }, width: W }
        batchInputs.push({ data: input.tensor.data, width: input.width, index, region })
        if (input.width > maxW) maxW = input.width
      } catch (err) {
        console.debug(`[ocr] Region ${index} failed:`, err.message)
        allResults[index] = null
      }
    }

    if (batchInputs.length === 0) continue

    // Stack into batch tensor [N, 3, 48, maxW], padding narrower regions
    const N = batchInputs.length
    const C = 3
    const H = 48 // PP-OCRv6 fixed input height
    const batchData = new Float32Array(N * C * H * maxW)

    for (let i = 0; i < N; i++) {
      const { data, width } = batchInputs[i]
      if (width === maxW) {
        batchData.set(data, i * C * H * maxW)
      } else {
        // Pad to maxW: copy row by row within each channel
        for (let c = 0; c < C; c++) {
          for (let h = 0; h < H; h++) {
            const srcOff = c * H * width + h * width
            const dstOff = i * C * H * maxW + c * H * maxW + h * maxW
            batchData.set(data.subarray(srcOff, srcOff + width), dstOff)
          }
        }
      }
    }

    // Single batch inference call
    const outputs = await runInference(worker, {
      input: { data: batchData, dims: [N, C, H, maxW], type: 'float32' },
    })

    const outputName = Object.keys(outputs)[0]
    const output = outputs[outputName]
    const dims = output.dims
    const timesteps = dims[1] || 1
    const numClasses = dims[2] || output.data.length / (N * timesteps)
    const outputStride = timesteps * numClasses

    // Split batch output and decode each region
    for (let i = 0; i < N; i++) {
      const { index, region } = batchInputs[i]
      const outputSlice = output.data.subarray(i * outputStride, (i + 1) * outputStride)

      const { text, confidence } = decodePaddleCtc(
        outputSlice,
        timesteps,
        numClasses,
        charset
      )

      console.debug(`[ocr] Region ${index} (w=${Math.round(region.box.width)}): "${text}" (conf=${confidence.toFixed(3)})`)

      allResults[index] = { region, text, confidence, index }
    }
  }

  const validResults = ocrPostFilter(allResults.filter(r => r !== null))

  for (const result of validResults) {
    const r = regions[result.index]
    if (r) {
      r.sourceText = result.text
      r.prob = result.confidence
    }
  }

  return regions
}

/**
 * Get dictionary URL from model manifest.
 * @returns {Promise<string>}
 */
async function getDictUrlFromManifest() {
  const model = await getModel('paddleocr_v6_medium_rec')
  const baseUrl = model.baseUrl || 'https://huggingface.co/zyddnys/manga-image-translator/resolve/main/models/'
  return baseUrl + 'paddleocr_v6_dict.txt'
}
