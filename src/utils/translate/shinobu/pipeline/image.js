/**
 * @file Image loading & canvas helpers for the Shinobu translation pipeline.
 *
 * Mechanically converted from ShinobuTranslator `src/pipeline/image.ts`
 * (TS → JS): type-only imports → JSDoc import() references.
 */

/** @typedef {import('../runtime/platform.js').PlatformProvider} PlatformProvider */
/** @typedef {import('../runtime/platform.js').PipelineImage} PipelineImage */
/** @typedef {import('../runtime/platform.js').PipelineCanvas} PipelineCanvas */

/**
 * @param {File} file
 * @param {PlatformProvider} platform
 * @returns {Promise<PipelineImage>}
 */
export async function fileToImage(file, platform) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('图片读取失败'))
    reader.onload = () => resolve(String(reader.result))
    reader.readAsDataURL(file)
  })

  return platform.loadImage(dataUrl)
}

/**
 * @param {PipelineImage} image
 * @param {PlatformProvider} platform
 * @returns {PipelineCanvas}
 */
export function imageToCanvas(image, platform) {
  const canvas = platform.createCanvas(image.naturalWidth, image.naturalHeight)
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('无法创建 Canvas 上下文')
  }
  ctx.drawImage(image, 0, 0)
  return canvas
}

/**
 * @param {PipelineCanvas} src
 * @param {PlatformProvider} platform
 * @returns {PipelineCanvas}
 */
export function cloneCanvas(src, platform) {
  const canvas = platform.createCanvas(src.width, src.height)
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('无法克隆 Canvas')
  }
  ctx.drawImage(src, 0, 0)
  return canvas
}
