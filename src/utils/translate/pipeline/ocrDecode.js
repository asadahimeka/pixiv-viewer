/**
 * CTC decoder for PaddleOCR output.
 * Decodes logits tensor to text using a character dictionary.
 */

let charsetCache = null
let charsetUrlCache = ''

/**
 * Load character dictionary from CDN URL.
 * @param {string} url - URL to paddleocr_v6_dict.txt
 * @returns {Promise<string[]>} Array of characters (index → char)
 */
export async function loadCharset(url) {
  if (charsetCache && charsetUrlCache === url) return charsetCache
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to load charset: ${res.status}`)
  const text = await res.text()
  const chars = text.split('\n').map(line => line.trim()).filter(line => line.length > 0)
  charsetCache = ['[blank]', ...chars]
  charsetUrlCache = url
  return charsetCache
}

/**
 * Decode CTC output logits to text.
 * PP-OCRv6 output: [1, T, numClasses] logits
 *
 * CTC decoding:
 * 1. Take argmax over classes per timestep
 * 2. Collapse consecutive identical class IDs
 * 3. Remove blank labels (class ID 0)
 *
 * @param {Float32Array|number[]} logits - Flattened logits [T * numClasses]
 * @param {number} timesteps - T (sequence length)
 * @param {number} numClasses - Number of character classes (including blank)
 * @param {string[]} charset - Character dictionary
 * @returns {{ text: string, confidence: number }}
 */
export function decodePaddleCtc(logits, timesteps, numClasses, charset) {
  if (!logits || logits.length === 0 || timesteps === 0) {
    return { text: '', confidence: 0 }
  }

  const chars = []
  const probs = []
  let prevClassId = -1

  for (let t = 0; t < timesteps; t++) {
    let maxProb = -Infinity
    let maxIdx = 0

    for (let c = 0; c < numClasses; c++) {
      const prob = logits[t * numClasses + c]
      if (prob > maxProb) {
        maxProb = prob
        maxIdx = c
      }
    }

    // Skip blank (class ID 0)
    if (maxIdx === 0) {
      prevClassId = -1
      continue
    }

    // Collapse consecutive identical (CTC merge)
    if (maxIdx === prevClassId) continue

    prevClassId = maxIdx
    const charIdx = maxIdx - 1
    const char = charIdx >= 0 && charIdx < charset.length ? charset[charIdx] : '?'
    chars.push(char || '?')
    probs.push(maxProb)
  }

  const avgConfidence = probs.length > 0
    ? probs.reduce((a, b) => a + b, 0) / probs.length
    : 0

  const confidence = 1 / (1 + Math.exp(-avgConfidence))

  return {
    text: chars.join(''),
    confidence,
  }
}

/**
 * Post-filter OCR results — removes low-quality regions.
 * @param {Array<{ region: object, text: string, confidence: number }>} results
 * @returns {Array<{ region: object, text: string, confidence: number }>}
 */
export function ocrPostFilter(results) {
  return results.filter(r => {
    if (r.confidence < 0.2) return false

    if (!r.text || r.text.trim().length === 0) return false

    const specialCount = (r.text.match(/[^\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7afa-zA-Z0-9]/g) || []).length
    if (specialCount > r.text.length * 0.5) return false

    return true
  })
}
