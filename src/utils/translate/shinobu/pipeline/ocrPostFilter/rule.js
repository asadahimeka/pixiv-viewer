/**
 * @file OCR post-filter evaluation rules.
 *
 * Mechanically converted from ShinobuTranslator
 * `src/pipeline/ocrPostFilter/rule.ts` (TS → JS).
 *
 * Core function: evaluateOcrPostFilterCandidate — applies the
 * danbooru-medium-v4 rule to decide whether an OCR region is a
 * false positive that should be discarded.
 */

/** @typedef {import('../../types.js').OcrPostFilterProtectionReason} OcrPostFilterProtectionReason */

export const OCR_POST_FILTER_RULE_ID = 'danbooru-medium-v4'

/**
 * @typedef {Object} OcrPostFilterVariant
 * @property {string} name
 * @property {string} text
 * @property {number} confidence
 * @property {boolean} accepted
 */

/**
 * @typedef {Object} OcrPostFilterMaskFeatures
 * @property {number} maskFillRatioInQuad
 * @property {number} componentCount
 * @property {number} largestComponentRatio
 * @property {number} boundaryPixelRatio
 */

/**
 * @typedef {Object} OcrPostFilterCandidate
 * @property {string} sourceText
 * @property {number} probability
 * @property {number} originalLineCount
 * @property {boolean} hasBubble
 * @property {number} relativeArea
 * @property {number} aspectRatio
 * @property {Array<OcrPostFilterVariant>} variants
 * @property {OcrPostFilterMaskFeatures} mask
 */

/**
 * @typedef {Object} OcrPostFilterRuleResult
 * @property {string} ruleId
 * @property {boolean} eligible
 * @property {boolean} shouldFilter
 * @property {string} normalizedSourceText
 * @property {number} graphemeCount
 * @property {boolean} majorityAgreement
 * @property {number} emptyVariantCount
 * @property {number} confidenceMean
 * @property {number} maximumNormalizedEditDistance
 * @property {boolean} variantScriptDrift
 * @property {boolean} nonEmptyScriptDrift
 * @property {number} originalVariantConfidence
 * @property {number} componentCountPerGrapheme
 * @property {number} maskSignalCount
 * @property {boolean} junkLikeSource
 * @property {boolean} poorConsensus
 * @property {OcrPostFilterProtectionReason|null} protectionReason
 */

/**
 * @typedef {Object} ScriptFeatures
 * @property {boolean} empty
 * @property {boolean} kana
 * @property {boolean} han
 * @property {boolean} latin
 * @property {boolean} digit
 * @property {boolean} punctuationOnly
 * @property {string} signature
 */

/**
 * @param {string} text
 * @returns {string}
 */
function normalizeText(text) {
  return text.normalize('NFKC').replace(/\s+/gu, '')
}

/**
 * @param {string} text
 * @returns {string}
 */
function normalizeJapaneseEvidenceText(text) {
  return text
    .normalize('NFKD')
    .replace(/[\u3099\u309A]/gu, '')
    .normalize('NFKC')
    .replace(/\s+/gu, '')
}

const KANA_PATTERN = /[\p{Script=Hiragana}\p{Script=Katakana}ー]/u
const HAN_PATTERN = /\p{Script=Han}/u
const JAPANESE_PATTERN = /(?:\p{Script=Han}|\p{Script=Hiragana}|\p{Script=Katakana}|ー)/u

/**
 * @param {string} text
 * @param {RegExp} pattern
 * @returns {Set<string>}
 */
function japaneseCharacterSet(text, pattern) {
  return new Set(
    Array.from(normalizeJapaneseEvidenceText(text)).filter(character => (
      pattern.test(character)
    ))
  )
}

/**
 * @param {string[]} texts
 * @param {RegExp} pattern
 * @returns {number}
 */
function maximumSharedCharacterCount(texts, pattern) {
  const characterSets = texts.map(text => japaneseCharacterSet(text, pattern))
  let maximum = 0
  for (let i = 0; i < characterSets.length; i += 1) {
    for (let j = i + 1; j < characterSets.length; j += 1) {
      maximum = Math.max(
        maximum,
        [...characterSets[i]].filter(character => (
          characterSets[j].has(character)
        )).length
      )
    }
  }
  return maximum
}

/**
 * @param {string} text
 * @returns {number}
 */
function countGraphemes(text) {
  if (typeof Intl.Segmenter === 'function') {
    return Array.from(
      new Intl.Segmenter('ja', { granularity: 'grapheme' }).segment(text)
    ).length
  }
  return Array.from(text).length
}

/**
 * @param {string} text
 * @returns {ScriptFeatures}
 */
function textScript(text) {
  const normalized = normalizeText(text)
  const kana = /[\p{Script=Hiragana}\p{Script=Katakana}ー]/u.test(normalized)
  const han = /\p{Script=Han}/u.test(normalized)
  const latin = /\p{Script=Latin}/u.test(normalized)
  const digit = /\p{Number}/u.test(normalized)
  const punctuationOnly = Boolean(normalized) &&
    /^[\p{Punctuation}\p{Symbol}]+$/u.test(normalized)
  const signature = [
    kana ? 'kana' : '',
    han ? 'han' : '',
    latin ? 'latin' : '',
    digit ? 'digit' : '',
    punctuationOnly ? 'punct' : '',
  ].filter(Boolean).join('+') || (normalized ? 'other' : 'empty')
  return {
    empty: !normalized,
    kana,
    han,
    latin,
    digit,
    punctuationOnly,
    signature,
  }
}

/**
 * Levenshtein edit distance for arrays.
 *
 * @param {string[]} left
 * @param {string[]} right
 * @returns {number}
 */
function levenshtein(left, right) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index)
  const current = new Array(right.length + 1)
  for (let i = 1; i <= left.length; i += 1) {
    current[0] = i
    for (let j = 1; j <= right.length; j += 1) {
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1)
      )
    }
    previous.splice(0, previous.length, ...current)
  }
  return previous[right.length]
}

/**
 * @param {string} left
 * @param {string} right
 * @returns {number}
 */
function normalizedEditDistance(left, right) {
  const leftChars = Array.from(left)
  const rightChars = Array.from(right)
  return levenshtein(leftChars, rightChars) /
    Math.max(1, leftChars.length, rightChars.length)
}

/**
 * Evaluate a single candidate region against the OCR post-filter rule.
 *
 * Reference: danbooru-medium-v4 (calibrated on Danbooru manga panels).
 *
 * @param {OcrPostFilterCandidate} candidate
 * @returns {OcrPostFilterRuleResult}
 */
export function evaluateOcrPostFilterCandidate(candidate) {
  const normalizedSourceText = normalizeText(candidate.sourceText)
  const graphemeCount = countGraphemes(normalizedSourceText)
  const script = textScript(normalizedSourceText)
  const normalizedVariants = candidate.variants.map(variant => (
    normalizeText(variant.text)
  ))
  const nonEmptyVariantTexts = normalizedVariants.filter(Boolean)
  const agreementCounts = new Map()
  for (const text of nonEmptyVariantTexts) {
    agreementCounts.set(text, (agreementCounts.get(text) ?? 0) + 1)
  }
  const majorityAgreement = Math.max(0, ...agreementCounts.values()) >= 2
  const emptyVariantCount = normalizedVariants.length - nonEmptyVariantTexts.length
  const confidences = candidate.variants.map(variant => variant.confidence)
  const confidenceMean = confidences.reduce((sum, value) => sum + value, 0) /
    Math.max(1, confidences.length)
  const variantLengths = normalizedVariants.map(countGraphemes)
  const graphemeCountRange = variantLengths.length > 0
    ? Math.max(...variantLengths) - Math.min(...variantLengths)
    : 0
  let maximumNormalizedEditDistance = 0
  for (let i = 0; i < normalizedVariants.length; i += 1) {
    for (let j = i + 1; j < normalizedVariants.length; j += 1) {
      maximumNormalizedEditDistance = Math.max(
        maximumNormalizedEditDistance,
        normalizedEditDistance(normalizedVariants[i], normalizedVariants[j])
      )
    }
  }
  const nonEmptySignatures = new Set(
    candidate.variants
      .map(variant => textScript(variant.text))
      .filter(value => !value.empty)
      .map(value => value.signature)
  )
  const nonEmptyScriptDrift = nonEmptySignatures.size > 1
  const variantScriptDrift = nonEmptyScriptDrift || emptyVariantCount > 0
  const originalVariantConfidence = candidate.variants.find(
    variant => variant.name === 'original'
  )?.confidence ?? 0
  const componentCountPerGrapheme = candidate.mask.componentCount /
    Math.max(1, graphemeCount)
  const maskSignalCount = [
    componentCountPerGrapheme >= 8,
    candidate.mask.boundaryPixelRatio >= 0.28,
    candidate.mask.maskFillRatioInQuad <= 0.13,
    candidate.mask.maskFillRatioInQuad >= 0.7,
    candidate.mask.largestComponentRatio <= 0.18,
    candidate.probability < 0.3,
  ].filter(Boolean).length
  const mixedJapaneseAndAscii = (
    (script.kana || script.han) &&
    (script.latin || script.digit)
  )
  const shortLatin = script.latin &&
    !script.kana &&
    !script.han &&
    graphemeCount <= 4
  const singleHanWithDrift = script.han &&
    !script.kana &&
    !script.latin &&
    !script.digit &&
    graphemeCount === 1 &&
    variantScriptDrift
  const junkLikeSource = !script.punctuationOnly && (
    mixedJapaneseAndAscii ||
    shortLatin ||
    singleHanWithDrift
  )
  const poorConsensus = !majorityAgreement && (
    maximumNormalizedEditDistance >= 0.67 ||
    emptyVariantCount > 0 ||
    graphemeCountRange >= 2 ||
    variantScriptDrift
  )
  let evidenceProtectionReason = (
    maximumSharedCharacterCount(normalizedVariants, KANA_PATTERN) >= 1 &&
    maskSignalCount <= 2
  )
    ? 'shared-kana'
    : null
  if (
    evidenceProtectionReason === null &&
    maximumSharedCharacterCount(normalizedVariants, HAN_PATTERN) >= 2 &&
    originalVariantConfidence >= 0.5 &&
    maskSignalCount <= 1
  ) {
    evidenceProtectionReason = 'shared-multi-han'
  }
  const sourceJapaneseCharacters = japaneseCharacterSet(
    normalizedSourceText,
    JAPANESE_PATTERN
  )
  if (
    evidenceProtectionReason === null &&
    KANA_PATTERN.test(normalizedSourceText) &&
    maskSignalCount <= 2 &&
    normalizedVariants.some(variantText => (
      [...japaneseCharacterSet(variantText, JAPANESE_PATTERN)].filter(
        character => sourceJapaneseCharacters.has(character)
      ).length >= 2
    ))
  ) {
    evidenceProtectionReason = 'source-kana-overlap'
  }
  if (
    evidenceProtectionReason === null &&
    maximumSharedCharacterCount(normalizedVariants, HAN_PATTERN) >= 1 &&
    candidate.relativeArea >= 0.12 &&
    originalVariantConfidence >= 0.5 &&
    maskSignalCount <= 1
  ) {
    evidenceProtectionReason = 'large-high-confidence-han'
  }
  if (
    evidenceProtectionReason === null &&
    /^\p{Number}+$/u.test(normalizedSourceText) &&
    confidenceMean >= 0.55 &&
    candidate.variants.some(variant => (
      variant.accepted &&
      variant.confidence >= 0.45 &&
      japaneseCharacterSet(variant.text, KANA_PATTERN).size >= 3
    ))
  ) {
    evidenceProtectionReason = 'strong-alternate-kana'
  }
  const eligible = (
    Boolean(normalizedSourceText) &&
    !candidate.hasBubble &&
    candidate.originalLineCount <= 1 &&
    graphemeCount <= 5 &&
    candidate.relativeArea >= 0.015 &&
    candidate.aspectRatio <= 2.6
  )
  const highPrecision = eligible &&
    poorConsensus &&
    (
      (
        junkLikeSource &&
        (
          maskSignalCount >= 2 ||
          (candidate.relativeArea >= 0.12 && maskSignalCount >= 1)
        )
      ) ||
      (
        variantScriptDrift &&
        !script.kana &&
        confidenceMean < 0.35 &&
        maskSignalCount >= 1
      )
    )
  const mediumV2 = highPrecision ||
    (
      eligible &&
      !majorityAgreement &&
      nonEmptyScriptDrift &&
      (maskSignalCount >= 1 || confidenceMean < 0.4)
    )
  const shouldFilterWithoutProtection = mediumV2 ||
    (
      eligible &&
      !majorityAgreement &&
      originalVariantConfidence < 0.5 &&
      maskSignalCount >= 1
    )
  const protectionReason = shouldFilterWithoutProtection
    ? evidenceProtectionReason
    : null
  const shouldFilter = shouldFilterWithoutProtection && protectionReason === null

  return {
    ruleId: OCR_POST_FILTER_RULE_ID,
    eligible,
    shouldFilter,
    normalizedSourceText,
    graphemeCount,
    majorityAgreement,
    emptyVariantCount,
    confidenceMean,
    maximumNormalizedEditDistance,
    variantScriptDrift,
    nonEmptyScriptDrift,
    originalVariantConfidence,
    componentCountPerGrapheme,
    maskSignalCount,
    junkLikeSource,
    poorConsensus,
    protectionReason,
  }
}
