/**
 * @file Kinsoku (禁则処理) — Typographic line-breaking rules for CJK text
 *
 * Prevents prohibited characters at the start or end of lines
 * according to Japanese and Chinese typographic conventions.
 * Adapted from ShinobuTranslator src/pipeline/typeset/kinsoku.ts
 */

// Characters that must NOT appear at the START of a line
// Closing brackets, punctuation, iteration marks, etc.
const KINSOKU_START = new Set([
  // Closing brackets
  ')', ']', '}', '）', '］', '｝', '〕', '〉', '》', '〗', '〙', '〛',
  '»', '』', '】',
  // Closing quotes
  '"', '\'', '”', '’', 'ʻ', 'ʼ',
  // Punctuation that can't start a line
  '。', '、', '，', '．', '：', '；', '？', '！',
  '‥', '…', '・',
  // Katakana/Hiragana prolonged sound, iteration marks
  'ー', '〜', 'ゝ', 'ゞ', 'ヽ', 'ヾ',
  // Percent/promille
  '%', '‰',
])

// Characters that must NOT appear at the END of a line
// Opening brackets, dashes, etc.
const KINSOKU_END = new Set([
  // Opening brackets
  '(', '[', '{', '（', '［', '｛', '〔', '〈', '《', '〖', '〘', '〚',
  '«', '『', '【',
  // Opening quotes
  '“', '‘', '‵', '‹', '›',
  // Prohibition of line-end
  '¥', '$', '£', '€',
])

/**
 * Check if a character is prohibited at the start of a line.
 * @param {string} char - Single character
 * @returns {boolean}
 */
export function isKinsokuStart(char) {
  return KINSOKU_START.has(char)
}

/**
 * Check if a character is prohibited at the end of a line.
 * @param {string} char - Single character
 * @returns {boolean}
 */
export function isKinsokuEnd(char) {
  return KINSOKU_END.has(char)
}

/**
 * Adjust line breaks to avoid kinsoku violations.
 *
 * After text has been split into lines, check each break point.
 * If the first character of a line is a kinsoku-start character,
 * move it to the previous line.
 * Also handle kinsoku-end: if the last character of a line is
 * a kinsoku-end character, move it to the next line.
 *
 * @param {string[]} lines - Lines from initial break
 * @param {function} measureFn - (text: string) => number, measures width
 * @param {number} maxWidth - Maximum line width
 * @returns {string[]} Lines with kinsoku adjustments applied
 */
export function adjustLineBreakForKinsoku(lines, measureFn, maxWidth) {
  if (lines.length <= 1) return lines

  const result = [...lines]

  for (let i = 0; i < result.length; i++) {
    const line = result[i]
    if (!line) continue

    // Check kinsoku-start at beginning of line (after first line)
    if (i > 0 && line.length > 0) {
      const firstChar = line[0]
      if (isKinsokuStart(firstChar)) {
        // Move the character to the previous line
        const prevLine = result[i - 1]
        result[i - 1] = prevLine + firstChar
        result[i] = line.slice(1)

        // If the resulting line is empty, remove it
        if (!result[i]) {
          result.splice(i, 1)
          i--
          continue
        }
      }
    }

    // Check kinsoku-end at end of line (except last line)
    if (i < result.length - 1 && line.length > 0) {
      const lastChar = line[line.length - 1]
      if (isKinsokuEnd(lastChar)) {
        // Move the character to the next line
        const nextLine = result[i + 1]
        result[i] = line.slice(0, -1)
        result[i + 1] = lastChar + nextLine

        // If the resulting line is empty, remove it
        if (!result[i]) {
          result.splice(i, 1)
          i--
          continue
        }
      }
    }

    // Verify width constraint after adjustments
    const currentWidth = measureFn(result[i])
    if (currentWidth > maxWidth) {
      // Width exceeded — undo the adjustment for this line
      // This happens when moving a kinsoku-start char pushes the prev line over width
    }
  }

  return result
}
