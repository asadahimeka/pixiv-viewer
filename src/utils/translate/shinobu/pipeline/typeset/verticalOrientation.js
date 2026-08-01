/**
 * Vertical text orientation & tokenization.
 *
 * Source: ShinobuTranslator `src/pipeline/typeset/verticalOrientation.ts` (258 lines)
 *
 * TS→JS mechanical conversion. All type annotations removed; logic preserved
 * verbatim. Exports segmentVerticalGraphemes, tokenizeVerticalText, and
 * orientation helpers used by fontFitCore and drawTypeset.
 */

import { CJK_H2V } from './columns.js'
import {
  verticalOrientationRanges,
  verticalOrientationUnicodeVersion,
} from './verticalOrientationData.js'

export { verticalOrientationUnicodeVersion }

/**
 * @typedef {'U'|'R'|'Tu'|'Tr'} UnicodeVerticalOrientation
 */
export const UnicodeVerticalOrientation = {}

/**
 * @typedef {'upright'|'sideways'|'transformed-upright'|'transformed-sideways'} VerticalItemOrientation
 */
export const VerticalItemOrientation = {}

/**
 * @typedef {'short-digits'|'terminal-punctuation'} TateChuYokoPolicy
 */
export const TateChuYokoPolicy = {}

/**
 * @typedef {Object} VerticalTokenBase
 * @property {string} sourceText
 * @property {string} displayText
 * @property {number} sourceStart
 * @property {number} sourceEnd
 * @property {number} sourceGlyphCount
 * @property {UnicodeVerticalOrientation} unicodeOrientation
 */
export const VerticalTokenBase = {}

/**
 * @typedef {Object} UprightVerticalToken
 * @property {'upright-glyph'} kind
 * @property {'upright'|'transformed-upright'} orientation
 * @property {string} sourceText
 * @property {string} displayText
 * @property {number} sourceStart
 * @property {number} sourceEnd
 * @property {number} sourceGlyphCount
 * @property {UnicodeVerticalOrientation} unicodeOrientation
 */
export const UprightVerticalToken = {}

/**
 * @typedef {Object} SidewaysVerticalToken
 * @property {'sideways-run'} kind
 * @property {'sideways'|'transformed-sideways'} orientation
 * @property {90} rotationDeg
 * @property {string} sourceText
 * @property {string} displayText
 * @property {number} sourceStart
 * @property {number} sourceEnd
 * @property {number} sourceGlyphCount
 * @property {UnicodeVerticalOrientation} unicodeOrientation
 */
export const SidewaysVerticalToken = {}

/**
 * @typedef {Object} TateChuYokoVerticalToken
 * @property {'tate-chu-yoko'} kind
 * @property {'upright'} orientation
 * @property {TateChuYokoPolicy} policy
 * @property {string} sourceText
 * @property {string} displayText
 * @property {number} sourceStart
 * @property {number} sourceEnd
 * @property {number} sourceGlyphCount
 * @property {UnicodeVerticalOrientation} unicodeOrientation
 */
export const TateChuYokoVerticalToken = {}

/**
 * @typedef {UprightVerticalToken|SidewaysVerticalToken|TateChuYokoVerticalToken} VerticalToken
 */
export const VerticalToken = {}

const orientationByCode = Object.freeze(['R', 'U', 'Tu', 'Tr'])
const latinGraphemePattern = /^\p{Script=Latin}\p{M}*$/u
const uppercaseLatinRunPattern = /^\p{Lu}+$/u
const decimalDigitPattern = /^\p{Nd}$/u
const terminalPunctuation = new Set(['!', '！', '?', '？'])
const terminalClosers = new Set([
  ')', ']', '}', '）', '］', '｝',
  '」', '』', '】', '》', '〉', '〕', '〗', '〙', '〛',
  '\'', '"', '’', '”', '〞', '〟',
])

let graphemeSegmenter

/**
 * @returns {Intl.Segmenter|undefined}
 */
function getGraphemeSegmenter() {
  if (graphemeSegmenter) return graphemeSegmenter
  if (typeof Intl.Segmenter !== 'function') return undefined
  graphemeSegmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
  return graphemeSegmenter
}

/**
 * @param {string} text
 * @returns {string[]}
 */
export function segmentVerticalGraphemes(text) {
  const segmenter = getGraphemeSegmenter()
  if (!segmenter) return Array.from(text)
  return Array.from(segmenter.segment(text), entry => entry.segment)
}

/**
 * @param {string} grapheme
 * @returns {UnicodeVerticalOrientation}
 */
export function resolveUnicodeVerticalOrientation(grapheme) {
  const codePoint = grapheme.codePointAt(0)
  if (codePoint === undefined) return 'R'

  let low = 0
  let high = verticalOrientationRanges.length - 1
  while (low <= high) {
    const middle = (low + high) >>> 1
    const [start, end, valueCode] = verticalOrientationRanges[middle]
    if (codePoint < start) {
      high = middle - 1
    } else if (codePoint > end) {
      low = middle + 1
    } else {
      return orientationByCode[valueCode] ?? 'R'
    }
  }
  return 'R'
}

/**
 * @param {string} grapheme
 * @returns {boolean}
 */
function isLatinGrapheme(grapheme) {
  return latinGraphemePattern.test(grapheme)
}

/**
 * @param {string} grapheme
 * @returns {boolean}
 */
function isDecimalDigit(grapheme) {
  return decimalDigitPattern.test(grapheme)
}

/**
 * @param {string} grapheme
 * @returns {boolean}
 */
function isWhitespaceGrapheme(grapheme) {
  return /^\s+$/u.test(grapheme)
}

/**
 * @param {readonly string[]} graphemes
 * @returns {number}
 */
function findTerminalContentEnd(graphemes) {
  let contentEnd = graphemes.length
  while (contentEnd > 0 && isWhitespaceGrapheme(graphemes[contentEnd - 1])) {
    contentEnd -= 1
  }
  while (contentEnd > 0 && terminalClosers.has(graphemes[contentEnd - 1])) {
    contentEnd -= 1
  }
  return contentEnd
}

/**
 * @param {readonly string[]} graphemes
 * @param {number} contentEnd
 * @returns {number|undefined}
 */
function findTerminalDoublePunctuationStart(graphemes, contentEnd) {
  let punctuationStart = contentEnd
  while (punctuationStart > 0 && terminalPunctuation.has(graphemes[punctuationStart - 1])) {
    punctuationStart -= 1
  }
  return contentEnd - punctuationStart === 2 ? punctuationStart : undefined
}

/**
 * @param {string} sourceText
 * @param {string} displayText
 * @param {number} sourceStart
 * @param {UnicodeVerticalOrientation} unicodeOrientation
 * @param {boolean} transformed
 * @returns {UprightVerticalToken}
 */
function createUprightToken(sourceText, displayText, sourceStart, unicodeOrientation, transformed) {
  return {
    kind: 'upright-glyph',
    sourceText,
    displayText,
    sourceStart,
    sourceEnd: sourceStart + 1,
    sourceGlyphCount: 1,
    unicodeOrientation,
    orientation: transformed ? 'transformed-upright' : 'upright',
  }
}

/**
 * @param {string} sourceText
 * @param {number} sourceStart
 * @param {number} sourceGlyphCount
 * @param {UnicodeVerticalOrientation} unicodeOrientation
 * @returns {SidewaysVerticalToken}
 */
function createSidewaysToken(sourceText, sourceStart, sourceGlyphCount, unicodeOrientation) {
  return {
    kind: 'sideways-run',
    sourceText,
    displayText: sourceText,
    sourceStart,
    sourceEnd: sourceStart + sourceGlyphCount,
    sourceGlyphCount,
    unicodeOrientation,
    orientation: unicodeOrientation === 'Tr' ? 'transformed-sideways' : 'sideways',
    rotationDeg: 90,
  }
}

/**
 * @param {string} sourceText
 * @param {number} sourceStart
 * @param {number} sourceGlyphCount
 * @param {TateChuYokoPolicy} policy
 * @returns {TateChuYokoVerticalToken}
 */
function createTateChuYokoToken(sourceText, sourceStart, sourceGlyphCount, policy) {
  return {
    kind: 'tate-chu-yoko',
    sourceText,
    displayText: sourceText.normalize('NFKC'),
    sourceStart,
    sourceEnd: sourceStart + sourceGlyphCount,
    sourceGlyphCount,
    unicodeOrientation: 'U',
    orientation: 'upright',
    policy,
  }
}

/**
 * @param {string} grapheme
 * @param {number} sourceStart
 * @returns {VerticalToken}
 */
function createSingleGraphemeToken(grapheme, sourceStart) {
  const unicodeOrientation = resolveUnicodeVerticalOrientation(grapheme)
  const verticalForm = CJK_H2V.get(grapheme)
  if (verticalForm) {
    return createUprightToken(grapheme, verticalForm, sourceStart, unicodeOrientation, true)
  }
  if (unicodeOrientation === 'U' || unicodeOrientation === 'Tu') {
    return createUprightToken(grapheme, grapheme, sourceStart, unicodeOrientation, false)
  }
  return createSidewaysToken(grapheme, sourceStart, 1, unicodeOrientation)
}

/**
 * @param {string} text
 * @returns {VerticalToken[]}
 */
export function tokenizeVerticalText(text) {
  const graphemes = segmentVerticalGraphemes(text)
  const terminalContentEnd = findTerminalContentEnd(graphemes)
  const terminalDoubleStart = findTerminalDoublePunctuationStart(graphemes, terminalContentEnd)
  const tokens = []

  for (let index = 0; index < graphemes.length;) {
    const grapheme = graphemes[index]
    if (isWhitespaceGrapheme(grapheme)) {
      index += 1
      continue
    }

    if (index === terminalDoubleStart) {
      const sourceText = graphemes.slice(index, index + 2).join('')
      tokens.push(createTateChuYokoToken(sourceText, index, 2, 'terminal-punctuation'))
      index += 2
      continue
    }

    if (isDecimalDigit(grapheme)) {
      let end = index + 1
      while (end < graphemes.length && isDecimalDigit(graphemes[end])) end += 1
      const sourceText = graphemes.slice(index, end).join('')
      const glyphCount = end - index
      tokens.push(glyphCount <= 2
        ? createTateChuYokoToken(sourceText, index, glyphCount, 'short-digits')
        : createSidewaysToken(sourceText, index, glyphCount, 'R'))
      index = end
      continue
    }

    if (isLatinGrapheme(grapheme)) {
      let end = index + 1
      while (end < graphemes.length && isLatinGrapheme(graphemes[end])) end += 1
      const sourceText = graphemes.slice(index, end).join('')
      const glyphCount = end - index
      const keepUpright = glyphCount === 1 ||
        (glyphCount <= 4 && uppercaseLatinRunPattern.test(sourceText))
      if (keepUpright) {
        for (let sourceIndex = index; sourceIndex < end; sourceIndex += 1) {
          tokens.push(createUprightToken(
            graphemes[sourceIndex],
            graphemes[sourceIndex],
            sourceIndex,
            resolveUnicodeVerticalOrientation(graphemes[sourceIndex]),
            false
          ))
        }
      } else {
        tokens.push(createSidewaysToken(sourceText, index, glyphCount, 'R'))
      }
      index = end
      continue
    }

    tokens.push(createSingleGraphemeToken(grapheme, index))
    index += 1
  }

  return tokens
}
