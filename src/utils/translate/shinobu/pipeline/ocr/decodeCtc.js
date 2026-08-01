/**
 * @file CTC greedy decoder — logits → token indices → text.
 *
 * Mechanically converted from ShinobuTranslator
 * `src/pipeline/ocr/decodeCtc.ts` (TS → JS).
 */

/**
 * CTC greedy decode: for each time step, pick the class with the highest logit.
 * Skip blank (class 0) and merge consecutive identical tokens.
 * @param {Float32Array} logits - Flat logits array, shape [steps, classes]
 * @param {number} steps - Number of time steps
 * @param {number} classes - Number of character classes
 * @returns {Array<number>} Decoded token indices (1-based charset index)
 */
function decodeCtcGreedy(logits, steps, classes) {
  const indices = []
  let prev = -1
  for (let t = 0; t < steps; t += 1) {
    let best = 0
    let bestVal = Number.NEGATIVE_INFINITY
    const offset = t * classes
    for (let c = 0; c < classes; c += 1) {
      const v = logits[offset + c]
      if (v > bestVal) {
        bestVal = v
        best = c
      }
    }
    if (best !== 0 && best !== prev) {
      indices.push(best)
    }
    prev = best
  }
  return indices
}

/**
 * Map a CTC token index to its character, using the charset.
 * @param {number} token - 1-based token index
 * @param {Array<string>|null} charset - Character set
 * @returns {string} Character or empty string
 */
function tokenToText(token, charset) {
  if (!charset) {
    return ''
  }
  const idx = token - 1
  if (idx < 0 || idx >= charset.length) {
    return ''
  }
  return charset[idx]
}

export { decodeCtcGreedy, tokenToText }
