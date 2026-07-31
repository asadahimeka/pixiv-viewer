import '../providers/siliconcloud.js'
import '../providers/deepseek.js'
import '../providers/openai.js'
import '../providers/glm.js'

import { translateWithFallback } from '../providers/index.js'

/**
 * Translate text regions using the configured LLM provider.
 *
 * @param {Array<import('./types').TextRegion>} regions - Regions with sourceText populated
 * @param {import('./types').PipelineConfig} config - Pipeline configuration
 * @param {Function} [onProgress] - Progress callback
 * @returns {Promise<Array<import('./types').TextRegion>>} Regions with translatedText populated
 */
export async function translateRegions(regions, config, onProgress) {
  if (!regions || regions.length === 0) {
    return []
  }

  if (onProgress) {
    onProgress({ stage: 'translate', detail: '正在翻译文本…', percent: 10 })
  }

  const textRegions = regions.filter(r => r.sourceText && r.sourceText.trim())

  if (textRegions.length === 0) {
    return regions.map(r => ({ ...r }))
  }

  const providerConfig = config.providers || {}

  // Add sourceLang/targetLang from pipeline config with defaults
  providerConfig.sourceLang = config.sourceLang || 'ja'
  providerConfig.targetLang = config.targetLang || 'zh-CN'

  if (!providerConfig.name) {
    console.warn('translate: No provider configured, skipping translation')
    return regions.map(r => ({ ...r }))
  }

  if (onProgress) {
    onProgress({ stage: 'translate', detail: `使用 ${providerConfig.name} 翻译…`, percent: 30 })
  }

  let result
  try {
    result = await translateWithFallback(
      textRegions,
      providerConfig,
      (providerName, stage) => {
        if (onProgress) {
          onProgress({
            stage: 'translate',
            detail: `使用 ${providerName} 翻译…`,
            percent: 50,
          })
        }
      }
    )
  } catch (err) {
    console.error('translate: All providers failed:', err.message)
    if (onProgress) {
      onProgress({ stage: 'error', detail: `翻译失败: ${err.message}`, percent: 0 })
    }
    return regions.map(r => ({
      ...r,
      translatedText: r.sourceText || '',
    }))
  }

  console.log(`translate: Used provider "${result.providerUsed}"`)

  if (onProgress) {
    onProgress({ stage: 'translate', detail: '正在合并翻译结果…', percent: 80 })
  }

  const translationMap = new Map()
  for (const translated of result.regions) {
    translationMap.set(translated.id, translated.translation)
  }

  const updatedRegions = regions.map(region => {
    const translation = translationMap.get(region.id)
    if (translation) {
      return { ...region, translatedText: translation }
    }
    return { ...region, translatedText: region.sourceText || '' }
  })

  if (onProgress) {
    const translatedCount = result.regions.length
    const totalCount = textRegions.length
    onProgress({
      stage: 'translate',
      detail: `翻译完成 (${translatedCount}/${totalCount} 项)`,
      percent: 100,
    })
  }

  return updatedRegions
}
