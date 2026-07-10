import { SILICON_CLOUD_API_KEY } from '@/consts'
import { getCache, setCache } from '@/utils/storage/siteCache'

/**
 * Get cached translation for a manga page
 * @param {string|number} artworkId
 * @param {number} pageIndex
 * @returns {Promise<string|null>}
 */
export async function getCachedTranslation(artworkId, pageIndex) {
  const key = `pic.translate.${artworkId}.${pageIndex}`
  const cached = await getCache(key, null)
  return cached
}

/**
 * Call SiliconCloud multimodal API with SSE streaming
 * @param {string} imageSrc
 * @param {function} onRead - callback({ content: string, done: boolean })
 */
export async function callMultimodalAPIStream(imageSrc, onRead) {
  const url = 'https://api.siliconflow.cn/v1/chat/completions'
  const imageUrl = new URL(imageSrc)
  imageUrl.protocol = 'https:'
  imageUrl.hostname = 'img.rika.club'
  imageUrl.port = ''
  const body = {
    enable_thinking: false,
    stream: true,
    model: 'nex-agi/Nex-N2-Pro',
    // model: 'moonshotai/Kimi-K2.7-Code',
    // model: 'Pro/moonshotai/Kimi-K2.6',
    // model: 'zai-org/GLM-4.5V',
    // model: 'Qwen/Qwen3.6-35B-A3B',
    // model: 'Qwen/Qwen3.6-27B',
    // model: 'Qwen/Qwen3.5-122B-A10B',
    // model: 'Qwen/Qwen3.5-35B-A3B',
    // model: 'Qwen/Qwen3.5-27B',
    // model: 'Qwen/Qwen3-VL-32B-Instruct',
    // model: 'Qwen/Qwen3-VL-8B-Instruct',
    // model: 'Qwen/Qwen3-VL-30B-A3B-Instruct',
    // model: 'Qwen/Qwen3.5-9B',
    // model: 'Qwen/Qwen3.5-4B',
    messages: [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: imageUrl } },
        { type: 'text', text: '请把这张漫画翻译为中文，按照从右到左、从上到下的顺序输出文本位置(比如第几格左或右)、文本原文、文本翻译后的中文，不附加任何解释。' },
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
 * @returns {Promise<string|null>}
 */
export async function translateMangaPage(imageUrl, artworkId, pageIndex, onRead) {
  const key = `pic.translate.${artworkId}.${pageIndex}`

  const cached = await getCachedTranslation(artworkId, pageIndex)
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
      })
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
    })
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
