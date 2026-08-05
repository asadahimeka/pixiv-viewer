import { SILICON_CLOUD_API_KEY, SILICON_CLOUD_BASR_URL } from '@/consts'
import { getCache, setCache } from '@/utils/storage/siteCache'

/**
 * SiliconCloud VL models available for manga page translation
 * key = display label, value = API model id
 */
export const VL_MODELS = {
  'Nex-N2-Pro': 'nex-agi/Nex-N2-Pro',
  'Kimi-K2.7-Code': 'moonshotai/Kimi-K2.7-Code',
  'Kimi-K2.6': 'Pro/moonshotai/Kimi-K2.6',
  'GLM-4.5V': 'zai-org/GLM-4.5V',
  'Qwen3.6-35B-A3B': 'Qwen/Qwen3.6-35B-A3B',
  'Qwen3.6-27B': 'Qwen/Qwen3.6-27B',
  'Qwen3.5-122B-A10B': 'Qwen/Qwen3.5-122B-A10B',
  'Qwen3.5-35B-A3B': 'Qwen/Qwen3.5-35B-A3B',
  'Qwen3.5-27B': 'Qwen/Qwen3.5-27B',
  'Qwen3-VL-32B': 'Qwen/Qwen3-VL-32B-Instruct',
  'Qwen3-VL-8B': 'Qwen/Qwen3-VL-8B-Instruct',
  'Qwen3-VL-30B': 'Qwen/Qwen3-VL-30B-A3B-Instruct',
  'Qwen3.5-9B': 'Qwen/Qwen3.5-9B',
  'Qwen3.5-4B': 'Qwen/Qwen3.5-4B',
}

const DEFAULT_VL_MODEL = 'nex-agi/Nex-N2-Pro'

/**
 * Resolve a stored VL model id — if it's not a known candidate (e.g. a stale
 * localStorage value from a removed/renamed model), fall back to the default.
 * @param {string} model
 * @returns {string}
 */
export function resolveVlModel(model) {
  return Object.values(VL_MODELS).includes(model) ? model : DEFAULT_VL_MODEL
}

/**
 * Get cached translation for a manga page
 * @param {string|number} artworkId
 * @param {number} pageIndex
 * @param {string} model - SiliconCloud model id — key is model-scoped so switching VL models never serves stale results
 * @returns {Promise<string|null>}
 */
export async function getCachedTranslation(artworkId, pageIndex, model) {
  const key = `pic.translate.${artworkId}.${pageIndex}.${model}`
  const cached = await getCache(key, null)
  return cached
}

/**
 * Call SiliconCloud multimodal API with SSE streaming
 * @param {string} imageSrc
 * @param {function} onRead - callback({ content: string, done: boolean })
 * @param {string} [model] - SiliconCloud model id, defaults to Nex-N2-Pro
 */
export async function callMultimodalAPIStream(imageSrc, onRead, model = 'nex-agi/Nex-N2-Pro') {
  const url = `${SILICON_CLOUD_BASR_URL}/chat/completions`
  const imageUrl = new URL(imageSrc)
  imageUrl.protocol = 'https:'
  imageUrl.hostname = 'img.rika.club'
  imageUrl.port = ''
  const body = {
    enable_thinking: false,
    stream: true,
    model,
    messages: [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: imageUrl } },
        { type: 'text', text: '请把这张漫画翻译为中文，按照从右到左、从上到下的顺序输出文本位置(比如第几格左或右)、文本原文、文本翻译后的中文，不附加任何解释。被隔断的文本可能只是漫画竖排或横排的视觉断列，请把它当作同一段语义处理，不要逐行逐列直译' },
      ],
    }],
  }

  let response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${SILICON_CLOUD_API_KEY}`,
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

  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { value, done } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value, { stream: true })
    const jsonLines = chunk.split('\n').filter(line => line.trim() !== '')

    for (let jsonLine of jsonLines) {
      jsonLine = jsonLine.replace(/^data: /, '')
      if (jsonLine === '[DONE]') {
        onRead({ content: '', done: true })
        return
      }

      let content = ''
      try {
        const json = JSON.parse(jsonLine)
        content = json.choices[0].delta.content || ''
      } catch (e) {
        continue
      }

      if (content) {
        content = content.replace(/<\|begin_of_box\||<\|end_of_box\|>|^>+\s*/g, '')
        if (content) {
          onRead({ content, done: false })
        }
      }
    }
  }

  onRead({ content: '', done: true })
}

/**
 * Translate a manga page image — checks cache first, streams API if needed
 * @param {string} imageUrl
 * @param {string|number} artworkId
 * @param {number} pageIndex
 * @param {function} onRead - callback({ content: string, done: boolean, error?: string })
 * @param {string} [model] - SiliconCloud model id, defaults to Nex-N2-Pro
 * @returns {Promise<string|null>}
 */
export async function translateMangaPage(imageUrl, artworkId, pageIndex, onRead, model = 'nex-agi/Nex-N2-Pro') {
  const key = `pic.translate.${artworkId}.${pageIndex}.${model}`

  const cached = await getCachedTranslation(artworkId, pageIndex, model)
  if (cached) {
    onRead({ content: cached, done: true })
    return cached
  }

  // Non-streaming: collect full text, callback once
  if (!onRead) {
    let fullText = ''
    try {
      await callMultimodalAPIStream(imageUrl, ({ content, done }) => {
        fullText += content
      }, model)
    } catch (err) {
      console.warn('picTranslate: API call failed', err.message)
      return null
    }
    if (fullText.trim()) {
      await setCache(key, fullText)
      return fullText
    }
    return null
  }

  // Streaming mode
  let fullText = ''
  try {
    await callMultimodalAPIStream(imageUrl, ({ content, done }) => {
      fullText += content
      onRead({ content, done })
    }, model)
  } catch (err) {
    console.warn('picTranslate: API call failed', err.message)
    onRead({ content: '', done: true, error: err.message })
    return null
  }

  if (fullText.trim()) {
    await setCache(key, fullText)
    return fullText
  }

  return null
}
