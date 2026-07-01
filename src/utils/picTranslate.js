import { SILICON_CLOUD_API_KEY } from '@/consts'
import { getCache, setCache } from '@/utils/storage/siteCache'

/**
 * @typedef {Object} PicTranslationEntry
 * @property {string} frame - e.g. "第1格"
 * @property {string} position - e.g. "右上", "左", "中"
 * @property {string} original - Original Japanese text
 * @property {string} translated - Translated Chinese text
 */

/**
 * Get cached translation for a manga page
 * @param {string|number} artworkId
 * @param {number} pageIndex
 * @returns {Promise<PicTranslationEntry[]|null>}
 */
export async function getCachedTranslation(artworkId, pageIndex) {
  const key = `pic.translate.${artworkId}.${pageIndex}`
  const cached = await getCache(key, null)
  return cached
}

/**
 * Call SiliconCloud multimodal API to translate manga image
 * @param {string} imageUrl
 * @returns {Promise<string>}
 */
export async function callMultimodalAPI(imageUrl) {
  const url = 'https://api.siliconflow.cn/v1/chat/completions'
  const body = {
    model: 'Qwen/Qwen3.5-4B',
    messages: [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: imageUrl } },
        { type: 'text', text: '请把这张漫画翻译为中文，以JSON数组格式输出，每个元素包含 frame(第几格)、position(位置如右上/左上/中)、original(原文)、translated(译文)，不附加任何解释。' },
      ],
    }],
  }

  let response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${SILICON_CLOUD_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    })
  } catch (err) {
    throw new Error(`Network error calling SiliconCloud API: ${err.message}`)
  }

  if (!response.ok) {
    throw new Error(`SiliconCloud API returned status ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  const content = data?.choices?.[0]?.message?.content || ''
  return content
}

/**
 * Parse multimodal API response into structured translation entries
 * @param {string} rawText
 * @returns {PicTranslationEntry[]}
 */
export function parseTranslationResult(rawText) {
  if (!rawText || !rawText.trim()) {
    return []
  }

  let parsed
  try {
    parsed = JSON.parse(rawText)
  } catch (err) {
    console.warn('picTranslate: failed to parse API response as JSON', err.message)
    return []
  }

  if (!Array.isArray(parsed)) {
    console.warn('picTranslate: API response is not an array')
    return []
  }

  const requiredFields = ['frame', 'position', 'original', 'translated']
  const result = []

  for (const entry of parsed) {
    if (!entry || typeof entry !== 'object') {
      console.warn('picTranslate: invalid entry skipped', entry)
      continue
    }

    const valid = requiredFields.every(field => {
      const val = entry[field]
      return typeof val === 'string' && val.trim().length > 0
    })

    if (!valid) {
      console.warn('picTranslate: entry missing required fields', entry)
      continue
    }

    result.push({
      frame: entry.frame,
      position: entry.position,
      original: entry.original,
      translated: entry.translated,
    })
  }

  return result
}

/**
 * Translate a manga page image — checks cache first, calls API if needed
 * @param {string} imageUrl
 * @param {string|number} artworkId
 * @param {number} pageIndex
 * @returns {Promise<PicTranslationEntry[]|null>}
 */
export async function translateMangaPage(imageUrl, artworkId, pageIndex) {
  const key = `pic.translate.${artworkId}.${pageIndex}`

  const cached = await getCachedTranslation(artworkId, pageIndex)
  if (cached) {
    return cached
  }

  let rawText
  try {
    rawText = await callMultimodalAPI(imageUrl)
  } catch (err) {
    console.warn('picTranslate: API call failed', err.message)
    return null
  }

  const result = parseTranslationResult(rawText)

  if (result.length > 0) {
    await setCache(key, result)
    return result
  }

  return null
}
