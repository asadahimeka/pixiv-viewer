/**
 * @file Load and cache the dictionary character set used by Paddle CTC recognizer.
 *
 * Mechanically converted from ShinobuTranslator
 * `src/pipeline/ocr/ocrShared.ts` (TS → JS).
 *
 * Browser-only — the Node branch (ocrSharedNode.ts) has been removed per plan.
 * pixiv-viewer is a browser-only webpack app; dict files are fetched via
 * fetch() from `public/models/` or CDN (resolved by modelRegistry).
 */

/** @type {Map<string, Promise<Array<string>|null>>} */
const charsetCache = new Map()

/**
 * Load and cache the character set from a dictionary URL.
 * @param {string} [dictUrl] - Dictionary file URL (e.g., './models/paddleocr_v6_dict.txt')
 * @returns {Promise<Array<string>|null>} Array of characters, or null on failure
 */
export async function loadCharset(dictUrl) {
  if (!dictUrl) {
    return null
  }
  const cached = charsetCache.get(dictUrl)
  if (cached) {
    return cached
  }
  const promise = (async () => {
    const response = await fetch(dictUrl, { method: 'GET' })
    if (!response.ok) {
      return null
    }
    const text = await response.text()
    const lines = text
      .split(/\r?\n/g)
      .filter(line => line.length > 0)
    return lines.length > 0 ? lines : null
  })()
  charsetCache.set(dictUrl, promise)
  return promise
}
