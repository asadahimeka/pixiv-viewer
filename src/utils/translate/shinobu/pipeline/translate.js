/**
 * @file Pipeline translation stage — orchestrates LLM / Google Web translation.
 *
 * Converted from ShinobuTranslator `src/pipeline/translate.ts` (TS → JS).
 * Preserved verbatim: batch→fallback strategy, tweet context length
 * retry, google_web single-translate path.
 *
 * Key adaptation: imports from local translators (not Shinobu shared
 * messages), no extension runtime dependency. The `apiKey` field is added to
 * LLM call options (in Shinobu the key lives in the background service
 * worker's settings store).
 */

import {
  LlmColumnsParseError,
  LlmThinkingConfigError,
  llmTranslate,
  llmTranslateRegions,
} from '../translators/llm.js'
import { googleWebTranslate } from '../translators/googleWeb.js'

/**
 * @typedef {import('../types.js').TextRegion} TextRegion
 * @typedef {import('../types.js').TranslationDebugInfo} TranslationDebugInfo
 * @typedef {import('../types.js').PipelineConfig} PipelineConfig
 */

/**
 * @typedef {Object} LlmRegionRequest
 * @property {string} id
 * @property {string} text
 * @property {'h'|'v'} direction
 * @property {number} [targetColumns]
 * @property {number} [targetLines]
 */

/**
 * @typedef {Object} StructuredTranslationResult
 * @property {string} translatedText
 * @property {Array<string>} [translatedColumns]
 */

/**
 * @param {PipelineConfig} config
 * @returns {boolean}
 */
function requiresPipelineLlmApiKey(config) {
  return config.llmProvider !== 'gemini' && !(config.llmProvider === 'openai' && config.llmAuthMode === 'openai_oauth')
}

/**
 * @param {PipelineConfig} config
 */
function assertTextTranslationProvider(config) {
  if (config.llmProvider === 'gemini') {
    throw new Error('Nano Banana 使用端到端译图流程，不支持 OCR 文本翻译流程')
  }
}

/**
 * @param {unknown} error
 * @returns {boolean}
 */
function isTweetContextLengthError(error) {
  const message = error instanceof Error ? error.message : String(error)
  return (
    /\bHTTP\s*413\b/iu.test(message) ||
    /context[_\s-]*(?:length|window)/iu.test(message) ||
    /(?:prompt|request|payload)(?:\s+entity)?\s+(?:is\s+)?too\s+large/iu.test(message) ||
    /prompt\s+(?:is\s+)?too\s+long/iu.test(message) ||
    /too\s+many\s+(?:input\s+)?tokens?/iu.test(message) ||
    /(?:input|prompt).{0,40}tokens?.{0,40}(?:exceed|limit|maximum)/iu.test(message) ||
    /上下文(?:长度|窗口).*(?:超|限制|过长|最大)/u.test(message) ||
    /(?:输入|提示词|请求).*(?:token|令牌).*(?:超|过多|限制)/iu.test(message)
  )
}

/**
 * @param {TextRegion} region
 * @returns {LlmRegionRequest}
 */
function buildLlmRegionRequest(region) {
  const direction = region.direction ?? 'h'
  return {
    id: region.id,
    text: region.sourceText,
    direction,
    targetColumns: direction === 'v' ? Math.max(1, region.originalLineCount ?? 1) : undefined,
    targetLines: direction === 'h' ? Math.max(1, region.originalLineCount ?? 1) : undefined,
  }
}

/**
 * @param {string} text
 * @param {PipelineConfig} config
 * @returns {Promise<string>}
 */
async function translateOne(text, config) {
  if (!text.trim()) {
    return ''
  }

  if (config.translator === 'google_web') {
    return googleWebTranslate(text, config.sourceLang, config.targetLang)
  }

  assertTextTranslationProvider(config)

  if (requiresPipelineLlmApiKey(config) && !config.llmApiKey.trim()) {
    throw new Error('LLM 模式需要填写 API Key')
  }

  return llmTranslate({
    provider: config.llmProvider,
    authMode: config.llmAuthMode,
    baseUrl: config.llmBaseUrl,
    apiKey: config.llmApiKey,
    model: config.llmModel,
    useCustomModel: config.llmUseCustomModel === true,
    thinkingLevel: config.llmUseCustomModel ? undefined : config.llmThinkingLevel,
    from: config.sourceLang,
    to: config.targetLang,
    text,
    translationContext: config.translationContext,
    diagnosticRunId: config.diagnosticRunId,
  })
}

/**
 * @param {TextRegion} region
 * @param {PipelineConfig} config
 * @returns {Promise<StructuredTranslationResult>}
 */
async function translateOneStructured(region, config) {
  const result = await llmTranslateRegions({
    provider: config.llmProvider,
    authMode: config.llmAuthMode,
    baseUrl: config.llmBaseUrl,
    apiKey: config.llmApiKey,
    model: config.llmModel,
    useCustomModel: config.llmUseCustomModel === true,
    thinkingLevel: config.llmUseCustomModel ? undefined : config.llmThinkingLevel,
    from: config.sourceLang,
    to: config.targetLang,
    regions: [buildLlmRegionRequest(region)],
    translationContext: config.translationContext,
    diagnosticRunId: config.diagnosticRunId,
  })
  const translated = result.byId.get(region.id)
  if (!translated?.translatedText) {
    throw new Error('LLM 单框结构化翻译未返回译文')
  }
  return translated
}

/**
 * @typedef {Object} RunTranslateResult
 * @property {Array<TextRegion>} regions
 * @property {TranslationDebugInfo|null} translationDebug
 */

/**
 * Translates all text regions in a page. For LLM mode, attempts a batched
 * request first, then falls back to per-region single-translate for any
 * regions missed by the batch.
 *
 * @param {Array<TextRegion>} regions
 * @param {PipelineConfig} config
 * @returns {Promise<RunTranslateResult>}
 */
export async function runTranslate(regions, config) {
  if (regions.length === 0) {
    return {
      regions: [],
      translationDebug: null,
    }
  }

  if (config.translator === 'llm') {
    assertTextTranslationProvider(config)

    if (requiresPipelineLlmApiKey(config) && !config.llmApiKey.trim()) {
      throw new Error('LLM 模式需要填写 API Key')
    }

    let activeConfig = config
    let tweetContextLengthFallback = false
    /**
     * @template T
     * @param {(requestConfig: PipelineConfig) => Promise<T>} request
     * @returns {Promise<T>}
     */
    const runLlmRequest = async request => {
      try {
        return await request(activeConfig)
      } catch (error) {
        if (
          !tweetContextLengthFallback &&
          activeConfig.translationContext &&
          isTweetContextLengthError(error)
        ) {
          activeConfig = {
            ...activeConfig,
            translationContext: undefined,
          }
          tweetContextLengthFallback = true
          return request(activeConfig)
        }
        throw error
      }
    }

    let batched = new Map()
    const translationDebug = {
      llmBatchRequestedRegionCount: regions.length,
      llmBatchFailed: false,
    }
    try {
      const batchedResult = await runLlmRequest(requestConfig => llmTranslateRegions({
        provider: requestConfig.llmProvider,
        authMode: requestConfig.llmAuthMode,
        baseUrl: requestConfig.llmBaseUrl,
        apiKey: requestConfig.llmApiKey,
        model: requestConfig.llmModel,
        useCustomModel: requestConfig.llmUseCustomModel === true,
        thinkingLevel: requestConfig.llmUseCustomModel ? undefined : requestConfig.llmThinkingLevel,
        from: requestConfig.sourceLang,
        to: requestConfig.targetLang,
        regions: regions.map(buildLlmRegionRequest),
        translationContext: requestConfig.translationContext,
        diagnosticRunId: requestConfig.diagnosticRunId,
      }))
      batched = batchedResult.byId
      translationDebug.llmBatchRawResponse = batchedResult.rawContent
    } catch (error) {
      if (error instanceof LlmThinkingConfigError) {
        throw error
      }
      batched = new Map()
      translationDebug.llmBatchFailed = true
      translationDebug.llmBatchError = error instanceof Error ? error.message : String(error)
      if (error instanceof LlmColumnsParseError) {
        translationDebug.llmBatchRawResponse = error.rawContent
        translationDebug.llmBatchParseError = error.message
      }
    }

    const next = []
    let llmBatchHitRegionCount = 0
    let llmFallbackRegionCount = 0
    let llmFallbackRequestCount = 0
    for (const region of regions) {
      const result = batched.get(region.id)
      if (result?.translatedText) {
        llmBatchHitRegionCount += 1
        next.push({
          ...region,
          translatedText: result.translatedText,
          translatedColumns: result.translatedColumns,
        })
        continue
      }

      llmFallbackRegionCount += 1
      if (region.sourceText.trim()) {
        llmFallbackRequestCount += 1
        try {
          const translated = await runLlmRequest(
            requestConfig => translateOneStructured(region, requestConfig)
          )
          next.push({
            ...region,
            translatedText: translated.translatedText,
            translatedColumns: translated.translatedColumns,
          })
          continue
        } catch (error) {
          if (error instanceof LlmThinkingConfigError) {
            throw error
          }
          llmFallbackRequestCount += 1
        }
      }
      const translatedText = await runLlmRequest(
        requestConfig => translateOne(region.sourceText, requestConfig)
      )
      next.push({ ...region, translatedText, translatedColumns: undefined })
    }
    translationDebug.llmBatchHitRegionCount = llmBatchHitRegionCount
    translationDebug.llmFallbackRegionCount = llmFallbackRegionCount
    translationDebug.llmFallbackRequestCount = llmFallbackRequestCount
    translationDebug.llmFallbackUsed = llmFallbackRegionCount > 0
    if (tweetContextLengthFallback) {
      translationDebug.tweetContextLengthFallback = true
    }
    return {
      regions: next,
      translationDebug,
    }
  }

  // Google Web (or other non-batched translators)
  const next = []
  for (const region of regions) {
    const translatedText = await translateOne(region.sourceText, config)
    next.push({ ...region, translatedText })
  }
  return {
    regions: next,
    translationDebug: null,
  }
}
