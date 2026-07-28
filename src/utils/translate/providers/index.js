/**
 * @file Multi-provider LLM translation registry
 *
 * Manages provider registration, lookup, and fallback translation logic.
 * Each provider module calls registerProvider() on import to register itself.
 */

/** @type {Object<string, {name: string, translate: Function}>} */
export const providers = {}

/**
 * Register a translation provider.
 * @param {{name: string, translate: (regions: Array, config: Object) => Promise<{regions: Array}>}} provider
 */
export function registerProvider(provider) {
  providers[provider.name] = provider
}

/**
 * Get a registered provider by name.
 * @param {string} name
 * @returns {{name: string, translate: Function}|undefined}
 */
export function getProvider(name) {
  return providers[name]
}

/**
 * Get names of all available providers.
 * @returns {Array<string>}
 */
export function getAvailableProviders() {
  return Object.keys(providers)
}

/**
 * Translate regions using primary provider with fallback chain.
 *
 * @param {Array<import('../pipeline/types').TextRegion>} regions - Regions with sourceText populated
 * @param {Object} config - PipelineConfig.providers
 * @param {Function} [onProgress] - Progress callback (providerName, stage)
 * @returns {Promise<{regions: Array<{id: string, translation: string}>, providerUsed: string}>}
 * @throws {ProviderError} If all providers fail
 */
export async function translateWithFallback(regions, config, onProgress) {
  const primaryName = config.name
  const fallbackNames = config.fallback || []

  // Build ordered provider chain: primary + fallbacks
  const chain = [primaryName, ...fallbackNames].filter(Boolean)

  /** @type {Array<{name: string, error: Error}>} */
  const errors = []

  for (const name of chain) {
    const provider = getProvider(name)
    if (!provider) {
      errors.push({ name, error: new ProviderError(`Provider "${name}" is not registered`, 'PROVIDER_NOT_FOUND') })
      continue
    }

    if (onProgress) onProgress(name, 'translate')

    try {
      const result = await provider.translate(regions, config)
      console.log(`translate: Provider "${name}" succeeded`)
      return { regions: result.regions, providerUsed: name }
    } catch (err) {
      console.warn(`translate: Provider "${name}" failed: ${err.message}`)
      errors.push({ name, error: err })
    }
  }

  // All providers failed — aggregate error
  const messages = errors.map(e => `[${e.name}] ${e.error.message}`).join('; ')
  throw new ProviderError(`All translation providers failed: ${messages}`, 'ALL_PROVIDERS_FAILED', { errors })
}

/**
 * Custom error class for provider-level failures.
 */
export class ProviderError extends Error {
  /**
   * @param {string} message
   * @param {string} [code='UNKNOWN']
   * @param {Object} [details={}]
   */
  constructor(message, code = 'UNKNOWN', details = {}) {
    super(message)
    this.name = 'ProviderError'
    this.code = code
    this.details = details
  }
}
