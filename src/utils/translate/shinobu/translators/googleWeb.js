/**
 * @file Google Web Translation — direct translate.googleapis.com client.
 *
 * Converted from ShinobuTranslator `src/translators/googleWeb.ts` (TS → JS).
 * Preserved verbatim: lang code normalization, response parsing,
 * URL construction.
 *
 * Key adaptation: uses `window.__httpRequest__` (Tampermonkey
 * GM_xmlhttpRequest) when available for environments where the Google
 * translate endpoint is blocked (e.g. mainland China). Falls back to
 * `fetch()` for standard environments.
 */

/**
 * @typedef {[string?, string?, unknown?, unknown?]} GoogleTranslateSegment
 */

function normalizeLangCode(code) {
  const normalized = code.trim().toLowerCase()
  if (!normalized) {
    return 'auto'
  }
  if (normalized === 'jp') {
    return 'ja'
  }
  if (normalized === 'zh' || normalized === 'zh-chs' || normalized === 'zh_cn' || normalized === 'zh-cn') {
    return 'zh-CN'
  }
  if (normalized === 'zh-cht' || normalized === 'zh_tw' || normalized === 'zh-tw') {
    return 'zh-TW'
  }
  if (normalized === 'en-us') {
    return 'en'
  }
  return normalized
}

/**
 * @param {unknown} data
 * @returns {string}
 */
function parseGoogleTranslateResponse(data) {
  if (!Array.isArray(data) || !Array.isArray(data[0])) {
    throw new Error('Google 翻译响应格式异常')
  }
  const segments = /** @type {Array<GoogleTranslateSegment>} */ (data[0])
  const translated = segments
    .map(segment => (Array.isArray(segment) && typeof segment[0] === 'string' ? segment[0] : ''))
    .join('')
    .trim()
  if (!translated) {
    throw new Error('Google 翻译响应为空')
  }
  return translated
}

/**
 * Translates text via Google's public web translate API.
 *
 * @param {string} text
 * @param {string} from - Source language code
 * @param {string} to - Target language code
 * @returns {Promise<string>}
 */
export async function googleWebTranslate(text, from, to) {
  const source = normalizeLangCode(from)
  const target = normalizeLangCode(to)
  const params = new URLSearchParams({
    client: 'gtx',
    sl: source,
    tl: target,
    dt: 't',
    q: text,
  })
  const endpoint = `https://translate.googleapis.com/translate_a/single?${params.toString()}`

  if (window.__httpRequest__) {
    const config = {
      method: 'GET',
      headers: {},
    }
    try {
      const resp = await window.__httpRequest__(endpoint, JSON.stringify(config))
      return parseGoogleTranslateResponse(resp.data)
    } catch (e) {
      // On failure, fall through to fetch
    }
  }

  const response = await fetch(endpoint, {
    method: 'GET',
    cache: 'no-store',
  })
  if (!response.ok) {
    throw new Error(`Google 翻译请求失败: ${response.status}`)
  }

  const payload = await response.json()
  return parseGoogleTranslateResponse(payload)
}
