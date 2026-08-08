/**
 * @file PaddleOCR CTC greedy decoder.
 *
 * Mechanically converted from ShinobuTranslator
 * `src/pipeline/ocr/paddleocrDecode.ts` (TS → JS).
 */

/**
 * PaddleOCR CTC greedy 解码结果。
 * @typedef {Object} PaddleCtcResult
 * @property {string} text - 解码文本
 * @property {number} confidence - 置信度 (0-1)
 * @property {Array<number>} tokenIds - 解码 token ID 序列
 */
export const PaddleCtcResult = {}

/**
 * PaddleOCR CTC greedy 解码。
 *
 * logits: 2D Float32Array, shape [timeSteps, numClasses]，
 * 每行是 softmax 前的 logits 或概率。
 * charset: 索引 0 是 blank，其余是字符映射。
 *
 * @param {Float32Array} logits
 * @param {number} timeSteps
 * @param {number} numClasses
 * @param {Array<string>} charset
 * @returns {PaddleCtcResult}
 */
export function decodePaddleCtc(logits, timeSteps, numClasses, charset) {
  const tokenIds = []
  const probs = []
  let prevToken = -1

  for (let t = 0; t < timeSteps; t++) {
    // 找每步最大概率的 token
    let maxIdx = 0
    let maxProb = logits[t * numClasses]
    for (let c = 1; c < numClasses; c++) {
      const prob = logits[t * numClasses + c]
      if (prob > maxProb) {
        maxProb = prob
        maxIdx = c
      }
    }

    // CTC 规则:
    // blank (idx 0) → 跳过，但重置 prevToken 以允许后续重复字符
    // 连续相同 token 且中间无 blank → 合并为一个
    if (maxIdx === 0) {
      prevToken = -1
      continue
    }
    if (maxIdx === prevToken) {
      // 连续相同，不追加但保留更高概率
      continue
    }
    tokenIds.push(maxIdx)
    probs.push(maxProb)
    prevToken = maxIdx
  }

  const text = tokenIds.map(id => charset[id] ?? '').join('')
  // confidence = exp(avg(log(p))) 即几何平均
  const confidence = probs.length > 0
    ? Math.exp(probs.reduce((sum, p) => sum + Math.log(Math.max(p, 1e-10)), 0) / probs.length)
    : 0

  return { text, confidence, tokenIds }
}
