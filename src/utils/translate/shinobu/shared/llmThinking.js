/**
 * @file LlmThinkingLevel type definition.
 *
 * Mechanically extracted from ShinobuTranslator `src/shared/llmThinking.ts`.
 * Used as a doc-only type reference by translators/llm.js and types.js.
 */

/**
 * @typedef {'none'|'low'|'medium'|'high'|'xhigh'|'max'} LlmThinkingLevel
 *   - 'none' / 'low' / 'medium' / 'high' / 'xhigh' / 'max': reasoning_effort levels
 *   - Added by plan T16 context: thinking level controls reasoning_effort field
 *     on OpenAI-compatible chat completion requests.
 */
export const LlmThinkingLevel = {}
