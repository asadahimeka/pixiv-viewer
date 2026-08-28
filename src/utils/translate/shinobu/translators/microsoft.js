/**
 * @file Microsoft Edge Translation — free edge.microsoft.com endpoint.
 *
 * Adapted from kiss-translator's fix for the retired auth endpoint
 * (https://github.com/fishjar/kiss-translator/commit/0c5df0e8875f579f1c38fdc6a82100fd0417d766)
 * and https://www.ankio.net/research/technology/microsoft-edge-translate-api
 *
 * Old flow (now 404): GET https://edge.microsoft.com/translate/auth → Bearer token
 *   → POST https://api-edge.cognitive.microsofttranslator.com/translate
 * New flow (no auth): POST https://edge.microsoft.com/translate/translatetext
 *   ?from=&to=&isEnterpriseClient=false
 *   Body: JSON.stringify(["text"])
 *   Response: [{ detectedLanguage? , translations: [{ text, to }] }]
 *
 * CORS: verified 2026-08-28 — endpoint returns `Access-Control-Allow-Origin: *`
 * and correct CORS preflight (OPTIONS 204). Direct fetch works in browser.
 * Still falls back via window.__httpRequest__ (Tampermonkey GM_xmlhttpRequest,
 * no CORS) and COMMON_PROXY (for mainland China / blocked networks),
 * mirroring googleWeb.js's 3-layer strategy.
 */

import { COMMON_PROXY } from '@/consts'

function normalizeMicrosoftLang(code) {
  const raw = code.trim()
  if (!raw || raw.toLowerCase() === 'auto' || raw.toLowerCase() === 'auto-detect') {
    return ''
  }
  const lower = raw.toLowerCase()
  if (lower === 'ja' || lower === 'jp') return 'ja'
  if (lower === 'en' || lower === 'en-us' || lower === 'en_us') return 'en'
  if (lower === 'zh' || lower === 'zh-cn' || lower === 'zh_cn' || lower === 'zh-chs' || lower === 'zh_hans' || lower === 'zh-hans') return 'zh-Hans'
  if (lower === 'zh-tw' || lower === 'zh_tw' || lower === 'zh-cht' || lower === 'zh_hant' || lower === 'zh-hant' || lower === 'zh-hk' || lower === 'zh-mo') return 'zh-Hant'
  // Keep already-canonical codes (e.g. zh-Hans, fr-CA, pt-PT) as-is but normalized casing
  if (raw.includes('-')) {
    const parts = raw.split('-')
    return `${parts[0].toLowerCase()}-${parts.slice(1).join('-')}`
  }
  return lower
}

function parseMicrosoftResponse(data) {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('Microsoft 翻译响应格式异常')
  }
  const first = data[0]
  const translations = first && first.translations
  if (!Array.isArray(translations) || translations.length === 0) {
    throw new Error('Microsoft 翻译响应格式异常')
  }
  const text = translations[0] && translations[0].text
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error('Microsoft 翻译响应为空')
  }
  return text.trim()
}

/**
 * Translates text via Microsoft Edge's public translate endpoint.
 *
 * @param {string} text
 * @param {string} from - Source language code (e.g. 'ja', 'auto')
 * @param {string} to - Target language code (e.g. 'zh-CN')
 * @returns {Promise<string>}
 */
export async function microsoftTranslate(text, from, to) {
  const source = normalizeMicrosoftLang(from)
  const target = normalizeMicrosoftLang(to) || 'zh-Hans'
  const params = new URLSearchParams({
    from: source,
    to: target,
    isEnterpriseClient: 'false',
  })
  const endpoint = `https://edge.microsoft.com/translate/translatetext?${params.toString()}`
  const body = JSON.stringify([text])

  if (window.__httpRequest__) {
    const config = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      data: JSON.parse(body),
    }
    try {
      const resp = await window.__httpRequest__(endpoint, JSON.stringify(config))
      return parseMicrosoftResponse(resp.data)
    } catch (e) {
      // On failure, fall through to proxy/direct fetch
    }
  }

  if (COMMON_PROXY) {
    try {
      const proxyRes = await fetch(COMMON_PROXY + endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body,
        cache: 'no-store',
      })
      if (proxyRes.ok) {
        const proxyPayload = await proxyRes.json()
        return parseMicrosoftResponse(proxyPayload)
      }
    } catch (e) {
      // Proxy failure → fall through
    }
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body,
    cache: 'no-store',
  })
  if (!response.ok) {
    throw new Error(`Microsoft 翻译请求失败: ${response.status}`)
  }
  const payload = await response.json()
  return parseMicrosoftResponse(payload)
}
