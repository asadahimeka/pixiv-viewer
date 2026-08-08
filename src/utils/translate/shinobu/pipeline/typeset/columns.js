/**
 * Column splitting & rebalancing for the typeset pipeline — TS→JS mechanical conversion.
 *
 * Source: ShinobuTranslator `src/pipeline/typeset/columns.ts` (476 lines)
 *
 * Handles CJK punctuation substitution (horizontal→vertical), kinsoku shori
 * (line-start/line-end character rules), natural language split scoring,
 * source→translated column rebalancing for both vertical and horizontal text.
 */

/** @typedef {import('../../types.js').TextRegion} TextRegion */

// ---------------------------------------------------------------------------
// CJK Maps
// ---------------------------------------------------------------------------

/**
 * CJK horizontal-to-vertical punctuation substitution map.
 * Ported from manga-image-translator's CJK_H2V table.
 *
 * @type {Map<string, string>}
 */
export const CJK_H2V = new Map([
  ['‥', '︰'],
  ['_', '︳'],
  ['(', '︵'],
  [')', '︶'],
  ['（', '︵'],
  ['）', '︶'],
  ['{', '︷'],
  ['}', '︸'],
  ['〔', '︹'],
  ['〕', '︺'],
  ['【', '︻'],
  ['】', '︼'],
  ['《', '︽'],
  ['》', '︾'],
  ['〈', '︿'],
  ['〉', '﹀'],
  ['⟨', '︿'],
  ['⟩', '﹀'],
  ['「', '﹁'],
  ['」', '﹂'],
  ['『', '﹃'],
  ['』', '﹄'],
  ['[', '﹇'],
  [']', '﹈'],
  ['…', '⋮'],
  ['⋯', '︙'],
  ['\u201c', '﹁'], // LEFT DOUBLE QUOTATION MARK
  ['\u201d', '﹂'], // RIGHT DOUBLE QUOTATION MARK
  ['\u2018', '﹁'], // LEFT SINGLE QUOTATION MARK
  ['\u2019', '﹂'], // RIGHT SINGLE QUOTATION MARK
  ['!', '︕'],
  ['?', '︖'],
  ['.', '︒'],
  ['。', '︒'],
  [';', '︔'],
  ['；', '︔'],
  [':', '︓'],
  ['：', '︓'],
  [',', '︐'],
  ['，', '︐'],
  ['・', '·'],
])

/**
 * Characters that should NOT appear at the start of a line (kinsoku shori).
 * Closing brackets, punctuation marks, etc.
 *
 * @type {Set<string>}
 */
export const KINSOKU_NSTART = new Set([
  '。', '，', '、', '！', '？', '；', '：',
  '）', '」', '』', '】', '》', '〉', '﹀',
  '﹂', '﹄', '﹈', '︶', '︸', '︺', '︼',
  '︾', '︒', '︕', '︖', '︐', '︔', '︓',
  ')', ']', '}', '.', ',', '!', '?', ';', ':',
  '⋮', '︙',
])

/**
 * Characters that should NOT appear at the end of a line (kinsoku shori).
 * Opening brackets, etc.
 *
 * @type {Set<string>}
 */
export const KINSOKU_NEND = new Set([
  '（', '「', '『', '【', '《', '〈',
  '﹁', '﹃', '﹇', '︵', '︷', '︹', '︻', '︽', '︿',
  '(', '[', '{',
])

// ---------------------------------------------------------------------------
// Text length counting (ported from manga-image-translator)
// ---------------------------------------------------------------------------

/**
 * Small kana that count as half-width when measuring text length.
 * Ported from manga-image-translator's count_text_length().
 *
 * @type {Set<string>}
 */
export const halfWidthKana = new Set(['っ', 'ッ', 'ぁ', 'ぃ', 'ぅ', 'ぇ', 'ぉ'])

/**
 * Count text length where small kana characters count as 0.5 and all others
 * count as 1.0. Used for comparing source vs translated text length.
 *
 * @param {string} text
 * @returns {number}
 */
export function countTextLength(text) {
  let length = 0
  for (const ch of text.trim()) {
    length += halfWidthKana.has(ch) ? 0.5 : 1
  }
  return length
}

/**
 * Count glyphs (excluding whitespace).
 *
 * @param {string} text
 * @returns {number}
 */
export function countTextGlyphs(text) {
  return [...text.replace(/\s+/g, '')].length
}

/**
 * Get the length weight of a single character.
 *
 * @param {string} ch
 * @returns {number}
 */
export function charLength(ch) {
  return halfWidthKana.has(ch) ? 0.5 : 1
}

// ---------------------------------------------------------------------------
// Column types
// ---------------------------------------------------------------------------

/**
 * @typedef {'model'|'split'} ColumnSegmentSource
 */

/**
 * @typedef {Object} PreferredColumnSegment
 * @property {string} text
 * @property {ColumnSegmentSource} source
 */
export const PreferredColumnSegment = {}

// ---------------------------------------------------------------------------
// Column splitting
// ---------------------------------------------------------------------------

/**
 * Split text into columns by newline boundaries.
 *
 * @param {string} text
 * @returns {string[]}
 */
export function splitColumns(text) {
  return text
    .split(/\n+/)
    .map(segment => segment.trim())
    .filter(Boolean)
}

const strongSplitBoundaryChars = new Set([
  '。', '！', '？', '!', '?', '；', ';',
])

const softSplitBoundaryChars = new Set([
  '，', '、', ',', '：', ':', '…', '⋮', '︙',
])

const conversationalPauseChars = new Set([
  '啊', '呀', '吧', '呢', '吗', '啦', '哦', '喔', '嘛', '了', '呐', '哟',
])

/**
 * @typedef {Object} SplitCandidate
 * @property {number} index — character index where split occurs
 * @property {number} consumed — cumulative text length up to this index
 * @property {number} score — naturalness score (higher = more natural)
 */

/**
 * Score how natural a character is as a split point.
 *
 * @param {string} ch
 * @returns {number}
 */
function naturalSplitScore(ch) {
  if (strongSplitBoundaryChars.has(ch)) {
    return 3
  }
  if (softSplitBoundaryChars.has(ch)) {
    return 2
  }
  if (conversationalPauseChars.has(ch)) {
    return 1
  }
  return 0
}

/**
 * Find the most natural split index within maxLength.
 *
 * @param {string[]} chars — array of individual characters
 * @param {number} maxLength — maximum cumulative text length allowed
 * @returns {number|null} — split index, or null if no natural boundary found
 */
function findNaturalSplitIndex(chars, maxLength) {
  let consumed = 0
  /** @type {SplitCandidate|null} */
  let best = null

  for (let i = 0; i < chars.length; i++) {
    consumed += charLength(chars[i])
    if (consumed > maxLength) {
      break
    }

    const splitIndex = i + 1
    if (splitIndex >= chars.length) {
      continue
    }

    const ch = chars[i]
    const next = chars[splitIndex]
    if (KINSOKU_NEND.has(ch) || KINSOKU_NSTART.has(next)) {
      continue
    }

    const score = naturalSplitScore(ch)
    if (score === 0) {
      continue
    }

    if (!best || score > best.score || (score === best.score && consumed > best.consumed)) {
      best = {
        index: splitIndex,
        consumed,
        score,
      }
    }
  }

  return best?.index ?? null
}

/**
 * Split text by a maximum text-length budget.
 * Prefers natural boundaries (punctuation/pauses); falls back to hard cut.
 *
 * @param {string} text
 * @param {number} maxLength
 * @returns {{ kept: string, overflow: string }}
 */
export function splitByTextLength(text, maxLength) {
  const chars = [...text]
  let consumed = 0
  let splitIndex = chars.length

  for (let i = 0; i < chars.length; i++) {
    const next = consumed + charLength(chars[i])
    if (next > maxLength) {
      splitIndex = i
      break
    }
    consumed = next
  }

  if (splitIndex < chars.length) {
    splitIndex = findNaturalSplitIndex(chars, maxLength) ?? splitIndex
  }

  return {
    kept: chars.slice(0, splitIndex).join(''),
    overflow: chars.slice(splitIndex).join(''),
  }
}

/**
 * Resolve source columns from a region's sourceText.
 *
 * @param {TextRegion} region
 * @returns {string[]}
 */
export function resolveSourceColumns(region) {
  const fromText = splitColumns(region.sourceText)
  if (fromText.length > 0) {
    return fromText
  }
  const fallback = region.sourceText.trim()
  return fallback ? [fallback] : []
}

/**
 * Resolve translated columns from a region's translatedColumns or translatedText.
 *
 * @param {TextRegion} region
 * @param {string} translatedText
 * @returns {PreferredColumnSegment[]}
 */
export function resolveTranslatedColumns(region, translatedText) {
  if (region.translatedColumns && region.translatedColumns.length > 0) {
    return region.translatedColumns
      .map(column => column.trim())
      .filter(Boolean)
      .map(text => ({ text, source: 'model' }))
  }
  const fromText = splitColumns(translatedText)
  if (fromText.length > 0) {
    return fromText.map(text => ({ text, source: 'model' }))
  }
  const fallback = translatedText.trim()
  return fallback ? [{ text: fallback, source: 'model' }] : []
}

// ---------------------------------------------------------------------------
// Column rebalancing (vertical)
// ---------------------------------------------------------------------------

/**
 * Rebalance translated columns against source column lengths.
 * If a translated column is too long for its source counterpart, split it
 * and carry overflow to the next column.
 *
 * @param {string[]} sourceColumns
 * @param {PreferredColumnSegment[]} translatedColumns
 * @returns {{
 *   columns: PreferredColumnSegment[],
 *   sourceColumnLengths: number[],
 *   singleColumnMaxLength: number|null,
 * }}
 */
export function rebalanceVerticalColumns(sourceColumns, translatedColumns) {
  const sourceLengths = sourceColumns.map(column => countTextLength(column))
  const baselineLength = Math.max(1, ...sourceLengths)
  const normalizedTranslated = translatedColumns
    .map(column => ({ text: column.text.trim(), source: column.source }))
    .filter(column => column.text.length > 0)

  if (normalizedTranslated.length === 0) {
    return {
      columns: [],
      sourceColumnLengths: sourceLengths,
      singleColumnMaxLength: sourceLengths.length > 0 ? baselineLength : null,
    }
  }

  const targetColumns = Math.max(sourceLengths.length, normalizedTranslated.length, 1)
  /** @type {PreferredColumnSegment[]} */
  const output = []
  let carry = ''
  let carrySource = /** @type {ColumnSegmentSource} */ ('split')
  let columnIndex = 0

  while (columnIndex < targetColumns || carry.trim()) {
    const translatedItem = normalizedTranslated[columnIndex]
    const hadCarry = carry.trim().length > 0
    const current = `${carry}${translatedItem?.text ?? ''}`.trim()
    /** @type {ColumnSegmentSource} */
    const currentSource = hadCarry
      ? 'split'
      : translatedItem?.source ?? carrySource
    carry = ''

    if (!current) {
      output.push({ text: '', source: currentSource })
      columnIndex += 1
      continue
    }

    const sourceLength = sourceLengths[columnIndex] ??
      sourceLengths[sourceLengths.length - 1] ??
      baselineLength
    const currentLength = countTextLength(current)

    if (currentLength <= sourceLength) {
      output.push({ text: current, source: currentSource })
      columnIndex += 1
      continue
    }

    if (currentLength <= baselineLength) {
      output.push({ text: current, source: currentSource })
      columnIndex += 1
      continue
    }

    if (columnIndex >= targetColumns - 1) {
      output.push({ text: current, source: currentSource })
      carry = ''
      columnIndex += 1
      continue
    }

    const { kept, overflow } = splitByTextLength(current, baselineLength)
    output.push({ text: kept || current, source: currentSource })
    carry = overflow
    carrySource = 'split'
    columnIndex += 1
  }

  return {
    columns: output.filter(column => column.text.trim().length > 0),
    sourceColumnLengths: sourceLengths,
    singleColumnMaxLength: sourceLengths.length > 0 ? baselineLength : null,
  }
}

/**
 * @typedef {Object} VerticalPreferredColumnsResult
 * @property {PreferredColumnSegment[]} columns
 * @property {string[]} sourceColumns
 * @property {number[]} sourceColumnLengths
 * @property {number|null} singleColumnMaxLength
 */
export const VerticalPreferredColumnsResult = {}

/**
 * Resolve preferred columns for vertical text layout.
 *
 * @param {TextRegion} region
 * @param {string} translatedText
 * @returns {VerticalPreferredColumnsResult}
 */
export function resolveVerticalPreferredColumns(region, translatedText) {
  const sourceColumns = resolveSourceColumns(region)
  const translatedColumns = resolveTranslatedColumns(region, translatedText)
  if (translatedColumns.length === 0) {
    return {
      columns: [],
      sourceColumns,
      sourceColumnLengths: sourceColumns.map(column => countTextLength(column)),
      singleColumnMaxLength: sourceColumns.length > 0
        ? Math.max(...sourceColumns.map(column => countTextLength(column)))
        : null,
    }
  }
  const balanced = rebalanceVerticalColumns(sourceColumns, translatedColumns)
  return {
    columns: balanced.columns,
    sourceColumns,
    sourceColumnLengths: balanced.sourceColumnLengths,
    singleColumnMaxLength: balanced.singleColumnMaxLength,
  }
}

// ---------------------------------------------------------------------------
// Horizontal line rebalancing
// ---------------------------------------------------------------------------

/**
 * Rebalance translated lines against source line lengths.
 * Same algorithm as rebalanceVerticalColumns but for horizontal text.
 *
 * @param {string[]} sourceLines
 * @param {PreferredColumnSegment[]} translatedSegments
 * @returns {{
 *   lines: PreferredColumnSegment[],
 *   sourceLineLengths: number[],
 *   singleLineMaxLength: number|null,
 * }}
 */
export function rebalanceHorizontalLines(sourceLines, translatedSegments) {
  const sourceLengths = sourceLines.map(line => countTextLength(line))
  const totalSourceLength = sourceLengths.reduce((sum, len) => sum + len, 0)
  const baselineLength = sourceLengths.length > 0
    ? Math.max(1, totalSourceLength / sourceLengths.length)
    : 1
  const normalizedTranslated = translatedSegments
    .map(segment => ({ text: segment.text.trim(), source: segment.source }))
    .filter(segment => segment.text.length > 0)

  if (normalizedTranslated.length === 0) {
    return {
      lines: [],
      sourceLineLengths: sourceLengths,
      singleLineMaxLength: sourceLengths.length > 0 ? Math.max(...sourceLengths) : null,
    }
  }

  const targetLines = Math.max(sourceLengths.length, normalizedTranslated.length, 1)
  /** @type {PreferredColumnSegment[]} */
  const output = []
  let carry = ''
  let carrySource = /** @type {ColumnSegmentSource} */ ('split')
  let lineIndex = 0

  while (lineIndex < targetLines || carry.trim()) {
    const translatedItem = normalizedTranslated[lineIndex]
    const hadCarry = carry.trim().length > 0
    const current = `${carry}${translatedItem?.text ?? ''}`.trim()
    /** @type {ColumnSegmentSource} */
    const currentSource = hadCarry
      ? 'split'
      : translatedItem?.source ?? carrySource
    carry = ''

    if (!current) {
      output.push({ text: '', source: currentSource })
      lineIndex += 1
      continue
    }

    const sourceLength = sourceLengths[lineIndex] ??
      sourceLengths[sourceLengths.length - 1] ??
      baselineLength
    const currentLength = countTextLength(current)

    if (currentLength <= sourceLength) {
      output.push({ text: current, source: currentSource })
      lineIndex += 1
      continue
    }

    if (currentLength <= baselineLength) {
      output.push({ text: current, source: currentSource })
      lineIndex += 1
      continue
    }

    if (lineIndex >= targetLines - 1) {
      output.push({ text: current, source: currentSource })
      carry = ''
      lineIndex += 1
      continue
    }

    const { kept, overflow } = splitByTextLength(current, baselineLength)
    output.push({ text: kept || current, source: currentSource })
    carry = overflow
    carrySource = 'split'
    lineIndex += 1
  }

  return {
    lines: output.filter(line => line.text.trim().length > 0),
    sourceLineLengths: sourceLengths,
    singleLineMaxLength: sourceLengths.length > 0 ? Math.max(...sourceLengths) : null,
  }
}

/**
 * @typedef {Object} HorizontalPreferredLinesResult
 * @property {PreferredColumnSegment[]} lines
 * @property {string[]} sourceLines
 * @property {number[]} sourceLineLengths
 * @property {number|null} singleLineMaxLength
 */
export const HorizontalPreferredLinesResult = {}

/**
 * Resolve preferred lines for horizontal text layout.
 *
 * @param {TextRegion} region
 * @param {string} translatedText
 * @returns {HorizontalPreferredLinesResult}
 */
export function resolveHorizontalPreferredLines(region, translatedText) {
  const sourceLines = resolveSourceColumns(region)
  const translatedSegments = resolveTranslatedColumns(region, translatedText)
  if (translatedSegments.length === 0) {
    return {
      lines: [],
      sourceLines,
      sourceLineLengths: sourceLines.map(line => countTextLength(line)),
      singleLineMaxLength: sourceLines.length > 0
        ? Math.max(...sourceLines.map(line => countTextLength(line)))
        : null,
    }
  }
  const balanced = rebalanceHorizontalLines(sourceLines, translatedSegments)
  return {
    lines: balanced.lines,
    sourceLines,
    sourceLineLengths: balanced.sourceLineLengths,
    singleLineMaxLength: balanced.singleLineMaxLength,
  }
}
