/**
 * Shared LLM response parser for manga translation providers.
 * Replaces duplicate parseStructuredResponse() in each provider.
 * Adapted from ShinobuTranslator src/translators/llm.ts (extractJsonObject)
 */

/**
 * Extract JSON string from LLM response text.
 * Handles fenced code blocks (```json ... ```) and raw JSON.
 * @param {string} text
 * @returns {string}
 */
function extractJsonObject(text) {
  // 1. Try fenced code block ```json ... ```
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced?.[1]) return fenced[1].trim()
  // 2. Fall back to first '{' and last '}'
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) return text.trim()
  return text.slice(start, end + 1).trim()
}

/**
 * Custom error class for LLM parse failures.
 * Carries the raw content for debugging.
 */
export class LlmParseError extends Error {
  /**
   * @param {string} message
   * @param {string} rawContent
   */
  constructor(message, rawContent) {
    super(message)
    this.name = 'LlmParseError'
    this.rawContent = rawContent
  }
}

/**
 * Parse structured translation response from LLM output.
 * @param {string} content - Raw LLM response text
 * @param {Array} originalRegions - Original regions for reference (unused, kept for API compat)
 * @returns {{regions: Array}}
 */
export function parseStructuredResponse(content, originalRegions) {
  try {
    const jsonStr = extractJsonObject(content)
    const parsed = JSON.parse(jsonStr)
    // Accept regions, translations, or results as the regions array key
    const regions = parsed.regions || parsed.translations || parsed.results || []
    return { regions }
  } catch (e) {
    // Don't throw — return empty regions so pipeline continues gracefully
    return { regions: [] }
  }
}

/**
 * Combine multiple AbortSignals into one.
 * If any signal is aborted, the combined signal aborts.
 * @param {Array<AbortSignal>} signals
 * @returns {AbortSignal}
 */
export function anySignal(signals) {
  const controller = new AbortController()
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason)
      return controller.signal
    }
    signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true })
  }
  return controller.signal
}
