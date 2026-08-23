// src/utils/translate/llmClient.js
// 统一 LLM 请求层：OpenAI 兼容端点。
// 请求链路：流式 fetch → (网络级失败且油猴可用) GM_xmlhttpRequest 整包 → 报引导错误。
// 注意：本文件禁止 import '@/...'，保持可被 node --test 直接加载。

const HELPER_HINT = '未检测到 HTTP Helper 用户脚本，且该 API 地址不允许浏览器直连（CORS）。请安装/更新 Pxve HTTP Helper 用户脚本，或改用支持浏览器直连的服务商（如 SiliconCloud / DeepSeek / OpenRouter）。'

export class LlmApiError extends Error {
  /**
   * @param {string} message
   * @param {'auth'|'rate_limit'|'server'|'no_helper'} kind
   */
  constructor(message, kind) {
    super(message)
    this.name = 'LlmApiError'
    this.kind = kind
  }
}

/**
 * 解析 SSE 文本块为 JSON 对象数组，跳过 [DONE]、空行与不可解析行
 * @param {string} text
 * @returns {Array<object>}
 */
export function parseSseLines(text) {
  const out = []
  for (let line of text.split('\n')) {
    line = line.replace(/^data:\s*/, '').trim()
    if (!line || line === '[DONE]') continue
    try {
      out.push(JSON.parse(line))
    } catch (_) {
      // 非 JSON 行（如注释/心跳），跳过
    }
  }
  return out
}

/**
 * 区分 fetch 失败类型：网络/CORS 异常 vs 已收到 HTTP 响应的错误
 * @param {Error} err
 * @returns {'network'|'api'}
 */
export function classifyFetchFailure(err) {
  return err instanceof TypeError ? 'network' : 'api'
}

export function isHelperAvailable() {
  return typeof window !== 'undefined' && typeof window.__httpRequest__ === 'function'
}

/**
 * 通过油猴脚本发请求（无 CORS 限制，仅整包响应）
 * @param {string} url
 * @param {{ method?: string, headers?: object, data?: any }} config
 * @returns {Promise<any>} resp.data
 */
export async function helperRequest(url, config) {
  if (!isHelperAvailable()) throw new LlmApiError(HELPER_HINT, 'no_helper')
  const resp = await window.__httpRequest__(url, JSON.stringify(config))
  return resp.data
}

function normalizeBaseUrl(baseUrl) {
  return (baseUrl || '').replace(/\/$/, '')
}

function buildEndpoint(baseUrl, path) {
  const base = normalizeBaseUrl(baseUrl)
  if (base.endsWith(path)) return base
  return `${base}${path}`
}

/**
 * 统一错误抛出：按 HTTP 状态归类，解析响应体里的 error.message
 * @param {Response} resp
 * @returns {Promise<never>}
 */
async function throwHttpError(resp) {
  const errText = await resp.text().catch(() => '')
  let detail = ''
  try {
    detail = JSON.parse(errText)?.error?.message || ''
  } catch (_) {
    detail = errText.slice(0, 200)
  }
  const msg = `LLM 请求失败 HTTP ${resp.status} ${resp.statusText}${detail ? ': ' + detail : ''}`
  const kind = resp.status === 401 || resp.status === 403 ? 'auth' : resp.status === 429 ? 'rate_limit' : 'server'
  throw new LlmApiError(msg, kind)
}

/**
 * 流式 chat/completions。
 * 收到 HTTP 状态码（401 等）说明 CORS 已通，直接抛 ApiError，不走油猴重试；
 * 仅当 fetch 抛网络异常（TypeError）时才降级油猴整包返回。
 *
 * @param {{ baseUrl: string, apiKey: string, body: object, onRead: (c: {content: string, done: boolean}) => void, signal?: AbortSignal }} opts
 */
export async function chatCompletionStream({ baseUrl, apiKey, body, onRead, signal }) {
  const endpoint = buildEndpoint(baseUrl, '/chat/completions')
  const headers = {
    'authorization': `Bearer ${apiKey}`,
    'content-type': 'application/json',
  }
  let response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal,
    })
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    if (classifyFetchFailure(err) === 'network' && isHelperAvailable()) {
      // 油猴兜底：整包返回后一次性输出
      const data = await helperRequest(endpoint, { method: 'POST', headers, data: body })
      const content = data?.choices?.[0]?.message?.content || ''
      if (content) onRead({ content, done: false })
      onRead({ content: '', done: true })
      return
    }
    if (classifyFetchFailure(err) === 'network') throw new LlmApiError(HELPER_HINT, 'no_helper')
    throw err
  }

  if (!response.ok) await throwHttpError(response)

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    for (const json of parseSseLines(decoder.decode(value, { stream: true }))) {
      const delta = json.choices?.[0]?.delta || {}
      const content = delta.content || ''
      if (content) onRead({ content, done: false })
    }
  }
  onRead({ content: '', done: true })
}

/**
 * 拉取模型列表 GET {baseUrl}/models，同样的降级链路
 * @param {{ baseUrl: string, apiKey: string }} opts
 * @returns {Promise<string[]>}
 */
export async function fetchModels({ baseUrl, apiKey }) {
  const endpoint = buildEndpoint(baseUrl, '/models')
  const headers = { 'authorization': `Bearer ${apiKey}` }
  let data
  try {
    const resp = await fetch(endpoint, { headers })
    if (!resp.ok) await throwHttpError(resp)
    data = await resp.json()
  } catch (err) {
    if (err instanceof LlmApiError) throw err
    if (classifyFetchFailure(err) === 'network' && isHelperAvailable()) {
      data = await helperRequest(endpoint, { method: 'GET', headers })
    } else {
      throw err
    }
  }
  const ids = (data?.data || []).map(m => m.id).filter(Boolean)
  return [...new Set(ids)].sort()
}
