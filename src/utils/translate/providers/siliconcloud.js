import { SILICON_CLOUD_API_KEY } from '@/consts'
import { ProviderError } from './index'
import { registerProvider } from './index'

export const name = 'siliconcloud'

const BASE_URL = 'https://api.siliconflow.cn/v1'
const DEFAULT_MODEL = 'Qwen/Qwen3-VL-32B-Instruct'

const SYSTEM_PROMPT = '你是专业漫画本地化译者和中文润色编辑。\n你的目标是把台词改写成自然、口语化、符合中文漫画阅读习惯的译文。\n不要保留日语倒装语序。只输出译文，不输出解释。'

/**
 * @param {Array<import('../pipeline/types').TextRegion>} regions
 * @returns {string}
 */
function buildUserPrompt(regions) {
  const textItems = regions
    .filter(r => r.sourceText && r.sourceText.trim())
    .map(r => `[${r.id}] ${r.sourceText}`)
    .join('\n')

  return `请把以下文本从 日文 翻译成 简体中文。
如果原文包含换行，它可能只是漫画竖排或横排的视觉断列；
请把它当作同一段语义处理，不要逐行逐列直译。
只输出最终译文，不要输出注释。

文本内容：
${textItems}`
}

/**
 * Translate text regions via SiliconCloud API.
 *
 * @param {Array<import('../pipeline/types').TextRegion>} regions
 * @param {Object} config
 * @param {string} [config.apiKey]
 * @param {string} [config.model]
 * @returns {Promise<{regions: Array<{id: string, translation: string}>}>}
 */
export async function translate(regions, config) {
  const apiKey = config.apiKey || SILICON_CLOUD_API_KEY

  if (!apiKey) {
    throw new ProviderError(
      'SiliconCloud API key is not configured. Set VUE_APP_SILICON_CLOUD_API_KEY in .env or provide apiKey in config.',
      'INVALID_API_KEY'
    )
  }

  const model = config.model || DEFAULT_MODEL
  const textItems = regions.filter(r => r.sourceText && r.sourceText.trim())

  if (textItems.length === 0) {
    return { regions: [] }
  }

  const userPrompt = buildUserPrompt(regions)

  const body = {
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
  }

  let response
  try {
    response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    })
  } catch (err) {
    throw new ProviderError(
      `Network error calling SiliconCloud API: ${err.message}`,
      'NETWORK_ERROR',
      { originalError: err.message }
    )
  }

  if (!response.ok) {
    let errorBody = ''
    try {
      errorBody = await response.text()
    } catch (_) { /* ignore */ }
    throw new ProviderError(
      `SiliconCloud API returned status ${response.status}: ${errorBody || response.statusText}`,
      response.status === 401 ? 'INVALID_API_KEY' : 'API_ERROR',
      { status: response.status, body: errorBody }
    )
  }

  let json
  try {
    json = await response.json()
  } catch (err) {
    throw new ProviderError(
      `Failed to parse SiliconCloud API response: ${err.message}`,
      'MALFORMED_RESPONSE',
      { originalError: err.message }
    )
  }

  const content = json.choices?.[0]?.message?.content
  if (!content) {
    throw new ProviderError(
      'SiliconCloud API returned empty response content',
      'MALFORMED_RESPONSE',
      { rawResponse: json }
    )
  }

  return parseStructuredResponse(content, regions)
}

/**
 * @param {string} content
 * @param {Array<import('../pipeline/types').TextRegion>} originalRegions
 * @returns {{regions: Array<{id: string, translation: string}>}}
 */
function parseStructuredResponse(content, originalRegions) {
  let jsonStr = content.trim()

  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim()
  }

  const objectMatch = jsonStr.match(/\{[\s\S]*\}/)
  if (objectMatch) {
    jsonStr = objectMatch[0]
  }

  try {
    const parsed = JSON.parse(jsonStr)
    if (parsed.regions && Array.isArray(parsed.regions)) {
      return { regions: parsed.regions }
    }
    if (parsed.translations && Array.isArray(parsed.translations)) {
      return { regions: parsed.translations }
    }
    if (parsed.results && Array.isArray(parsed.results)) {
      return { regions: parsed.results }
    }
  } catch (_) {
  }

  const idMap = {}
  for (const r of originalRegions) {
    if (r.id) idMap[r.id] = true
  }

  const fallbackRegions = []
  const lines = content.split('\n')
  for (const line of lines) {
    const match = line.match(/^\s*(?:\[)?(r\d+)(?:\])?\s*[:：]\s*(.+)/)
    if (match) {
      const id = match[1]
      const translation = match[2].trim()
      if (idMap[id]) {
        fallbackRegions.push({ id, translation })
      }
    }
  }

  if (fallbackRegions.length > 0) {
    return { regions: fallbackRegions }
  }

  if (originalRegions.length > 0 && content.trim()) {
    return {
      regions: [{ id: originalRegions[0].id, translation: content.trim() }],
    }
  }

  return { regions: [] }
}

registerProvider({ name, translate })
