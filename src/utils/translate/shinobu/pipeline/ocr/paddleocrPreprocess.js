/**
 * @file PaddleOCR-specific preprocessing — builds normalized NCHW input tensor
 * from a cropped text region.
 *
 * Mechanically converted from ShinobuTranslator
 * `src/pipeline/ocr/paddleocrPreprocess.ts` (TS → JS).
 */

import { getTransformedRegion } from './preprocess.js'

/** @typedef {import('../../types.js').TextRegion} TextRegion */
/** @typedef {import('../../runtime/platform.js').PlatformProvider} PlatformProvider */
/** @typedef {import('../../runtime/platform.js').PipelineImage} PipelineImage */
/** @typedef {import('./preprocess.js').Direction} Direction */

/**
 * @typedef {Object} PaddleOcrInputData
 * @property {Float32Array} data
 * @property {Array<number>} dims
 * @property {number} resizedWidth
 */
export const PaddleOcrInputData = {}

/**
 * @typedef {'rgb'|'bgr'} PaddleOcrChannelOrder
 */
export const PaddleOcrChannelOrder = {}

/**
 * 从 image 裁剪 region 区域，对竖排文字做透视变换+90度旋转，
 * resize 到 inputHeight 高度，宽度按比例缩放（不超过 maxInputWidth），
 * 归一化后输出 NCHW Float32Array。
 *
 * @param {PipelineImage} image
 * @param {TextRegion} region
 * @param {Direction} direction
 * @param {number} inputHeight
 * @param {number} maxInputWidth
 * @param {'zero_to_one'|'minus_one_to_one'} normalize
 * @param {PlatformProvider} platform
 * @param {PaddleOcrChannelOrder} [channelOrder]
 * @returns {PaddleOcrInputData}
 */
export function buildPaddleOcrInput(
  image,
  region,
  direction,
  inputHeight,
  maxInputWidth,
  normalize,
  platform,
  channelOrder
) {
  const order = channelOrder ?? 'rgb'
  // 使用 getTransformedRegion 处理透视变换和竖排旋转
  const source = getTransformedRegion(image, region, direction, inputHeight, platform)
  const srcWidth = Math.max(1, source.width)
  const srcHeight = Math.max(1, source.height)

  // Resize 到 inputHeight，宽度按比例
  const ratio = srcWidth / srcHeight
  const resizedWidth = Math.max(1, Math.min(maxInputWidth, Math.round(ratio * inputHeight)))

  const resizeCanvas = platform.createCanvas(resizedWidth, inputHeight)
  const resizeCtx = resizeCanvas.getContext('2d')
  resizeCtx.drawImage(source, 0, 0, srcWidth, srcHeight, 0, 0, resizedWidth, inputHeight)

  // 提取像素并归一化
  const imageData = resizeCtx.getImageData(0, 0, resizedWidth, inputHeight)
  const pixels = imageData.data
  const pixelCount = resizedWidth * inputHeight

  const floatData = new Float32Array(3 * pixelCount)
  for (let i = 0; i < pixelCount; i++) {
    const srcIdx = i * 4
    const r = pixels[srcIdx]
    const g = pixels[srcIdx + 1]
    const b = pixels[srcIdx + 2]
    const first = order === 'bgr' ? b : r
    const third = order === 'bgr' ? r : b

    if (normalize === 'minus_one_to_one') {
      floatData[i] = first / 127.5 - 1
      floatData[pixelCount + i] = g / 127.5 - 1
      floatData[2 * pixelCount + i] = third / 127.5 - 1
    } else {
      floatData[i] = first / 255
      floatData[pixelCount + i] = g / 255
      floatData[2 * pixelCount + i] = third / 255
    }
  }

  return {
    data: floatData,
    dims: [1, 3, inputHeight, resizedWidth],
    resizedWidth,
  }
}
