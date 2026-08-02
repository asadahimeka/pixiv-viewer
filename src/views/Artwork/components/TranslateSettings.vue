<template>
  <div class="translate-settings">
    <van-cell-group title="翻译引擎">
      <van-radio-group :value="translationEngine" @change="onEngineChange">
        <van-cell-group class="engine-options">
          <van-cell clickable @click="onEngineChange('vl-api')">
            <template #title>
              <van-radio name="vl-api">VL API（默认，快速，侧边栏显示）</van-radio>
            </template>
          </van-cell>
          <van-cell clickable @click="onEngineChange('shinobu')">
            <template #title>
              <van-radio name="shinobu">Shinobu 管线（完整管线，画布输出）</van-radio>
            </template>
          </van-cell>
        </van-cell-group>
      </van-radio-group>
      <div v-if="translationEngine === 'vl-api'" class="engine-help">
        <van-icon name="info-o" /> VL API: 使用云端视觉语言模型翻译，速度快，无需下载模型。文本在侧边栏面板显示，支持流式输出。
      </div>
      <div v-else class="engine-help">
        <van-icon name="info-o" /> Shinobu 管线: 完整翻译管线（检测 → OCR → 翻译 → 去字 → 排版），结果直接输出到画布。首次使用需要下载模型文件。
      </div>
    </van-cell-group>

    <van-cell-group v-if="translationEngine === 'vl-api'" title="VL 模型">
      <van-cell
        title="视觉语言模型"
        label="选择云端 VL 模型进行漫画翻译"
        class="preset-model-cell"
      >
        <template #value>
          <select
            :value="translationVlModel"
            class="preset-model-select"
            @change="onVlModelChange($event.target.value)"
          >
            <option
              v-for="(model, label) in vlModels"
              :key="label"
              :value="model"
            >
              {{ label }} · {{ model.split('/').pop() }}
            </option>
          </select>
        </template>
      </van-cell>
    </van-cell-group>

    <van-cell-group title="翻译提供商">
      <van-field
        :value="translationProvider"
        label="提供商"
        placeholder="siliconcloud"
        @change="onProviderChange"
      />
      <van-field
        :value="providerConfig.apiKey"
        type="password"
        label="API Key"
        placeholder="输入 API Key"
        @change="onApiKeyChange"
      />
      <van-cell
        v-if="isSiliconCloud && !hasCustomKey"
        title="预设模型"
        label="未自定义 API Key 时，模型从预设中选择"
        class="preset-model-cell"
      >
        <template #value>
          <select
            :value="currentPresetKey"
            class="preset-model-select"
            @change="onPresetModelChange($event.target.value)"
          >
            <option value="" disabled>选择预设模型</option>
            <option
              v-for="(model, key) in presetModels"
              :key="key"
              :value="key"
            >
              {{ key }} · {{ model.split('/').pop() }}
            </option>
          </select>
        </template>
      </van-cell>
      <van-field
        :value="providerConfig.model"
        label="模型"
        :placeholder="isSiliconCloud ? '选择预设模型或输入自定义模型' : '默认模型'"
        :disabled="isSiliconCloud && !hasCustomKey"
        @change="onModelChange"
      />
      <van-field
        :value="providerConfig.baseUrl"
        label="Base URL"
        placeholder="自定义 API 地址"
        @change="onBaseUrlChange"
      />
      <van-field
        :value="providerConfig.authMode || 'api_key'"
        label="认证方式"
        placeholder="api_key"
        @change="onAuthModeChange"
      />
      <div class="auth-helper">
        api_key: Authorization: Bearer &lt;key&gt;<br>
        bearer_token: 直接使用 key 作为 Authorization 头<br>
        custom_header: 自定义 Header 名称 + 值
      </div>
      <template v-if="(providerConfig.authMode || 'api_key') === 'custom_header'">
        <van-field
          :value="providerConfig.customHeaderName"
          label="Header 名称"
          placeholder="X-API-Key"
          @change="onCustomHeaderNameChange"
        />
        <van-field
          :value="providerConfig.customHeaderValue"
          type="password"
          label="Header 值"
          placeholder="..."
          @change="onCustomHeaderValueChange"
        />
      </template>
      <div class="test-connection-wrap">
        <van-button
          size="small"
          type="primary"
          :loading="testLoading"
          @click="testConnection"
        >
          {{ testLoading ? '测试中...' : '测试连接' }}
        </van-button>
      </div>
      <div
        v-if="testResult"
        class="model-test-result"
        :class="testResult.ok ? 'is-ok' : 'is-fail'"
      >
        <van-icon :name="testResult.ok ? 'success' : 'warning'" />
        <span>{{ testResult.message }}</span>
        <span v-if="testResult.durationMs != null" class="result-duration">{{ testResult.durationMs }}ms</span>
      </div>
    </van-cell-group>

    <van-cell-group title="处理模式（Shinobu 管线）">
      <van-radio-group :value="translationProcessMode" @change="onProcessModeChange">
        <van-cell-group class="engine-options">
          <van-cell clickable @click="onProcessModeChange('translate')">
            <template #title>
              <van-radio name="translate">翻译（完整管线）</van-radio>
            </template>
          </van-cell>
          <van-cell clickable @click="onProcessModeChange('erase')">
            <template #title>
              <van-radio name="erase">擦除（调试）</van-radio>
            </template>
          </van-cell>
          <van-cell clickable @click="onProcessModeChange('original')">
            <template #title>
              <van-radio name="original">原文（仅排版）</van-radio>
            </template>
          </van-cell>
        </van-cell-group>
      </van-radio-group>
    </van-cell-group>

    <van-cell-group title="气泡检测">
      <van-cell center title="气泡文字检测" label="检测漫画气泡区域，将翻译文本排版进气泡内">
        <template #right-icon>
          <van-switch :value="translationBubble" size="24" @change="onBubbleChange" />
        </template>
      </van-cell>
    </van-cell-group>

    <van-cell-group title="翻译语言（Shinobu 管线）">
      <van-field
        :value="translationSourceLang"
        label="源语言"
        placeholder="ja"
        @change="onSourceLangChange"
      />
      <van-field
        :value="translationTargetLang"
        label="目标语言"
        placeholder="zh-CN"
        @change="onTargetLangChange"
      />
    </van-cell-group>

    <van-cell-group>
      <van-cell center title="自动翻译">
        <template #right-icon>
          <van-switch :value="translationAutoTranslate" size="24" @change="onAutoTranslateChange" />
        </template>
      </van-cell>
    </van-cell-group>

    <van-cell-group title="缓存管理">
      <van-cell center title="清除翻译缓存" label="清除所有已缓存的翻译结果">
        <template #right-icon>
          <van-button
            size="small"
            plain
            type="danger"
            :loading="clearingCache"
            @click="clearTranslationCache"
          >
            {{ clearingCache ? '清除中...' : '清除' }}
          </van-button>
        </template>
      </van-cell>
    </van-cell-group>
  </div>
</template>

<script>
import { Toast } from 'vant'
import store from '@/store'
import localDb from '@/utils/storage/localDb'
import { aiModelMap } from '@/utils/translate'
import { VL_MODELS } from '@/utils/translate/manga'

export default {
  name: 'TranslateSettings',
  data() {
    return {
      testLoading: false,
      clearingCache: false,
      testResult: null,
    }
  },
  computed: {
    translationEngine: {
      get() {
        return store.state.mangaTrans.engine
      },
      set(val) {
        store.commit('SET_MANGA_TRANS', { engine: val })
      },
    },
    translationProvider: {
      get() {
        return store.state.mangaTrans.provider
      },
      set(val) {
        store.commit('SET_MANGA_TRANS', { provider: val })
      },
    },
    translationProviders() {
      return store.state.mangaTrans.providers
    },
    translationProcessMode: {
      get() {
        return store.state.mangaTrans.processMode
      },
      set(val) {
        store.commit('SET_MANGA_TRANS', { processMode: val })
      },
    },
    translationAutoTranslate: {
      get() {
        return store.state.mangaTrans.autoTranslate
      },
      set(val) {
        store.commit('SET_MANGA_TRANS', { autoTranslate: val })
      },
    },
    translationBubble: {
      get() {
        return store.state.mangaTrans.bubble
      },
      set(val) {
        store.commit('SET_MANGA_TRANS', { bubble: val })
      },
    },
    translationSourceLang: {
      get() {
        return store.state.mangaTrans.sourceLang
      },
      set(val) {
        store.commit('SET_MANGA_TRANS', { sourceLang: val })
      },
    },
    translationTargetLang: {
      get() {
        return store.state.mangaTrans.targetLang
      },
      set(val) {
        store.commit('SET_MANGA_TRANS', { targetLang: val })
      },
    },
    translationVlModel: {
      get() {
        return store.state.mangaTrans.vlModel
      },
      set(val) {
        store.commit('SET_MANGA_TRANS', { vlModel: val })
      },
    },
    vlModels() {
      return VL_MODELS
    },
    providerConfig() {
      const name = this.translationProvider
      return this.translationProviders[name] || {}
    },
    isSiliconCloud() {
      return this.translationProvider === 'siliconcloud'
    },
    hasCustomKey() {
      const cfg = this.translationProviders.siliconcloud
      return !!(cfg && cfg.apiKey)
    },
    presetModels() {
      return aiModelMap
    },
    currentPresetKey() {
      const model = this.providerConfig.model
      if (!model) return ''
      const entry = Object.entries(aiModelMap).find(([, m]) => m === model)
      return entry ? entry[0] : ''
    },
  },
  methods: {
    onEngineChange(val) {
      this.translationEngine = val
    },
    onProviderChange(val) {
      this.translationProvider = val
    },
    onApiKeyChange(val) {
      const name = this.translationProvider
      const current = this.translationProviders[name] || {}
      store.commit('SET_MANGA_TRANS', {
        providers: {
          [name]: { ...current, apiKey: val },
        },
      })
    },
    onPresetModelChange(key) {
      if (!aiModelMap[key]) return
      const name = this.translationProvider
      const current = this.translationProviders[name] || {}
      const patch = { ...current, model: aiModelMap[key] }
      if (!patch.baseUrl) {
        patch.baseUrl = 'https://api.siliconflow.cn/v1/'
      }
      store.commit('SET_MANGA_TRANS', {
        providers: {
          [name]: patch,
        },
      })
    },
    onModelChange(val) {
      const name = this.translationProvider
      const current = this.translationProviders[name] || {}
      store.commit('SET_MANGA_TRANS', {
        providers: {
          [name]: { ...current, model: val },
        },
      })
    },
    onBaseUrlChange(val) {
      const name = this.translationProvider
      const current = this.translationProviders[name] || {}
      store.commit('SET_MANGA_TRANS', {
        providers: {
          [name]: { ...current, baseUrl: val },
        },
      })
    },
    onProcessModeChange(val) {
      this.translationProcessMode = val
    },
    onAutoTranslateChange(val) {
      this.translationAutoTranslate = val
    },
    onBubbleChange(val) {
      this.translationBubble = val
    },
    onSourceLangChange(val) {
      this.translationSourceLang = val
    },
    onTargetLangChange(val) {
      this.translationTargetLang = val
    },
    onVlModelChange(val) {
      this.translationVlModel = val
    },
    onAuthModeChange(val) {
      const name = this.translationProvider
      const current = this.translationProviders[name] || {}
      store.commit('SET_MANGA_TRANS', {
        providers: {
          [name]: { ...current, authMode: val },
        },
      })
    },
    onCustomHeaderNameChange(val) {
      const name = this.translationProvider
      const current = this.translationProviders[name] || {}
      store.commit('SET_MANGA_TRANS', {
        providers: {
          [name]: { ...current, customHeaderName: val },
        },
      })
    },
    onCustomHeaderValueChange(val) {
      const name = this.translationProvider
      const current = this.translationProviders[name] || {}
      store.commit('SET_MANGA_TRANS', {
        providers: {
          [name]: { ...current, customHeaderValue: val },
        },
      })
    },
    async clearTranslationCache() {
      this.clearingCache = true
      try {
        await localDb.clear()
        Toast.success('缓存已清除')
      } catch (err) {
        Toast('清除缓存失败: ' + err.message)
      } finally {
        this.clearingCache = false
      }
    },
    async testConnection() {
      const providerName = this.translationProvider
      const config = this.providerConfig
      const apiKey = config.apiKey || ''
      const model = config.model || ''
      const baseUrl = config.baseUrl || ''

      if (!apiKey) {
        this.testResult = { ok: false, message: '请先输入 API Key' }
        Toast('请先输入 API Key')
        return
      }

      this.testLoading = true
      const start = Date.now()

      try {
        // Determine endpoint from provider conventions
        const endpoints = {
          siliconcloud: 'https://api.siliconflow.cn/v1/chat/completions',
          openai: 'https://api.openai.com/v1/chat/completions',
          deepseek: 'https://api.deepseek.com/v1/chat/completions',
          glm: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
        }

        const url = baseUrl
          ? `${baseUrl.replace(/\/+$/, '')}/chat/completions`
          : (endpoints[providerName] || `${baseUrl}/chat/completions`)

        const defaultModels = {
          siliconcloud: 'Qwen/Qwen3-8B',
          openai: 'gpt-4o-mini',
          deepseek: 'deepseek-chat',
          glm: 'glm-4-plus',
        }

        const authMode = config.authMode || 'api_key'
        const headers = { 'Content-Type': 'application/json' }
        if (authMode === 'bearer_token') {
          headers.Authorization = apiKey
        } else if (authMode === 'custom_header') {
          headers[config.customHeaderName || 'X-API-Key'] = config.customHeaderValue || apiKey
        } else {
          headers.Authorization = `Bearer ${apiKey}`
        }

        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: model || defaultModels[providerName] || 'gpt-4o-mini',
            messages: [{ role: 'user', content: 'Hi' }],
            max_tokens: 5,
          }),
        })

        if (!response.ok) {
          const errText = await response.text().catch(() => '')
          throw new Error(`${response.status} ${response.statusText}${errText ? ': ' + errText : ''}`)
        }

        this.testResult = { ok: true, message: '连接成功', durationMs: Date.now() - start }
        Toast.success('连接成功')
      } catch (err) {
        console.log('testConnection err:', err)
        this.testResult = { ok: false, message: `连接失败: ${err.message}`, durationMs: Date.now() - start }
        Toast(`连接失败: ${err.message}`)
      } finally {
        this.testLoading = false
      }
    },
  },
}
</script>

<style lang="stylus" scoped>
.translate-settings
  padding 0.2rem 0

  .engine-options
    .van-cell
      padding 0.2rem 0.3rem

  .test-connection-wrap
    padding 0.2rem 0.3rem
    display flex
    justify-content flex-end

  ::v-deep .van-radio
    display flex
    align-items center

  ::v-deep .van-radio__label
    font-size 0.26rem
    color #333

  ::v-deep .van-cell-group__title
    font-size 0.28rem
    font-weight bold
    padding 0.3rem 0.3rem 0.1rem
    color #555

  .engine-help
    font-size 0.24rem
    color #666
    padding 0.1rem 0.3rem 0.2rem
    line-height 1.5

    .van-icon
      vertical-align middle
      margin-right 0.06rem

  .auth-helper
    font-size 0.22rem
    color #999
    padding 0 0.3rem 0.1rem
    line-height 1.6

  .preset-model-cell
    ::v-deep .van-cell__value
      display flex
      align-items center
      justify-content flex-end

    .preset-model-select
      max-width 4.5rem
      padding 0.08rem 0.2rem
      border 1px solid #ddd
      border-radius 0.08rem
      background #fff
      font-size 0.24rem
      color #333
      text-align right

  .model-test-result
    margin 0.1rem 0.3rem 0.2rem
    padding 0.15rem 0.2rem
    border 1px solid #eee
    border-radius 0.08rem
    font-size 0.24rem
    line-height 1.8
    color #555

    .van-icon
      vertical-align middle
      margin-right 0.06rem

    &.is-ok
      border-color #07c160
      color #07c160
      background rgba(7, 193, 96, 0.08)

    &.is-fail
      border-color #ee0a24
      color #ee0a24
      background rgba(238, 10, 36, 0.08)

    .result-duration
      margin-left 0.1rem
      font-size 0.22rem
      color #999
</style>
