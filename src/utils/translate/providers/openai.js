import { ProviderError, registerProvider } from './index'
import { parseStructuredResponse, anySignal } from './parseResponse.js'

export const name = 'openai'

const DEFAULT_BASE_URL = 'https://api.openai.com/v1'
const DEFAULT_MODEL = 'gpt-4o-mini'

const SYSTEM_PROMPT = '你是专业漫画本地化译者和中文润色编辑。\n你的目标是把台词改写成自然、口语化、符合中文漫画阅读习惯的译文。\n不要保留日语倒装语序。只输出译文，不输出解释。'

const LANG_NAMES = {
  'ja': '日文',
  'zh-CN': '简体中文',
  'zh-TW': '繁体中文',
  'en': '英文',
  'ko': '韩文',
  'fr': '法文',
  'de': '德文',
  'ru': '俄文',
  'es': '西班牙文',
  'it': '意大利文',
  'pt': '葡萄牙文',
  'th': '泰文',
  'vi': '越南文',
}

function getLangName(code) {
  return LANG_NAMES[code] || code
}

/**
 * @param {Array} regions
 * @param {string} [sourceLang]
 * @param {string} [targetLang]
 * @returns {string}
 */
function buildUserPrompt(regions, sourceLang, targetLang) {
  const sourceName = getLangName(sourceLang || 'ja')
  const targetName = getLangName(targetLang || 'zh-CN')
  const textItems = regions
    .filter(r => r.sourceText && r.sourceText.trim())
    .map(r => `[${r.id}] ${r.sourceText}`)
    .join('\n')

  return `请把以下文本从 ${sourceName} 翻译成 ${targetName}。
如果原文包含换行，它可能只是漫画竖排或横排的视觉断列；
请把它当作同一段语义处理，不要逐行逐列直译。
只输出最终译文，不要输出注释。

文本内容：
${textItems}`
}

/**
 * @param {Array} regions
 * @param {Object} config
 * @param {string} config.apiKey
 * @param {string} [config.model]
 * @param {string} [config.baseUrl]
 * @returns {Promise<{regions: Array<{id: string, translation: string}>}>}
 */
export async function translate(regions, config) {
  const apiKey = config.apiKey

  if (!apiKey) {
    throw new ProviderError(
      'OpenAI API key is required. Provide apiKey in config.',
      'INVALID_API_KEY'
    )
  }

  const model = config.model || DEFAULT_MODEL
  const baseUrl = (config.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '')
  const textItems = regions.filter(r => r.sourceText && r.sourceText.trim())

  if (textItems.length === 0) {
    return { regions: [] }
  }

  const userPrompt = buildUserPrompt(regions, config.sourceLang, config.targetLang)

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
    // 60s timeout
    const timeoutSignal = AbortSignal.timeout(60000)
    // Merge with any external signal from config
    const combinedSignal = config.signal
      ? anySignal([config.signal, timeoutSignal])
      : timeoutSignal

    response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: combinedSignal,
    })
  } catch (err) {
    throw new ProviderError(
      `Network error calling OpenAI-compatible API: ${err.message}`,
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
      `OpenAI-compatible API returned status ${response.status}: ${errorBody || response.statusText}`,
      response.status === 401 ? 'INVALID_API_KEY' : 'API_ERROR',
      { status: response.status, body: errorBody }
    )
  }

  let json
  try {
    json = await response.json()
  } catch (err) {
    throw new ProviderError(
      `Failed to parse API response: ${err.message}`,
      'MALFORMED_RESPONSE',
      { originalError: err.message }
    )
  }

  const content = json.choices?.[0]?.message?.content
  if (!content) {
    throw new ProviderError(
      'API returned empty response content',
      'MALFORMED_RESPONSE',
      { rawResponse: json }
    )
  }

  return parseStructuredResponse(content, regions)
}

registerProvider({ name, translate })
