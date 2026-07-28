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
          <van-cell clickable @click="onEngineChange('onnx-pipeline')">
            <template #title>
              <van-radio name="onnx-pipeline">ONNX 管线（高质量，需要下载模型）</van-radio>
            </template>
          </van-cell>
        </van-cell-group>
      </van-radio-group>
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
      <van-field
        :value="providerConfig.model"
        label="模型"
        placeholder="默认模型"
        @change="onModelChange"
      />
      <van-field
        :value="providerConfig.baseUrl"
        label="Base URL"
        placeholder="自定义 API 地址"
        @change="onBaseUrlChange"
      />
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
    </van-cell-group>

    <van-cell-group title="处理模式（ONNX 管线）">
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

    <van-cell-group>
      <van-cell center title="自动翻译">
        <template #right-icon>
          <van-switch :value="translationAutoTranslate" size="24" @change="onAutoTranslateChange" />
        </template>
      </van-cell>
    </van-cell-group>
  </div>
</template>

<script>
import { Toast } from 'vant'
import store from '@/store'
import { getAvailableProviders } from '@/utils/translate/providers'

// Import providers to ensure they are registered in the registry
import '@/utils/translate/providers/siliconcloud'
import '@/utils/translate/providers/openai'
import '@/utils/translate/providers/deepseek'
import '@/utils/translate/providers/glm'

export default {
  name: 'TranslateSettings',
  data() {
    return {
      testLoading: false,
    }
  },
  computed: {
    translationEngine: {
      get() {
        return store.state.translationEngine
      },
      set(val) {
        store.commit('SET_TRANSLATION_ENGINE', val)
      },
    },
    translationProvider: {
      get() {
        return store.state.translationProvider
      },
      set(val) {
        store.commit('SET_TRANSLATION_PROVIDER', val)
      },
    },
    translationProviders() {
      return store.state.translationProviders
    },
    translationProcessMode: {
      get() {
        return store.state.translationProcessMode
      },
      set(val) {
        store.commit('SET_TRANSLATION_PROCESS_MODE', val)
      },
    },
    translationAutoTranslate: {
      get() {
        return store.state.translationAutoTranslate
      },
      set(val) {
        store.commit('SET_TRANSLATION_AUTO_TRANSLATE', val)
      },
    },
    providerConfig() {
      const name = this.translationProvider
      return this.translationProviders[name] || {}
    },
    availableProviders() {
      return getAvailableProviders()
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
      store.commit('SET_TRANSLATION_PROVIDERS', {
        [name]: { ...current, apiKey: val },
      })
    },
    onModelChange(val) {
      const name = this.translationProvider
      const current = this.translationProviders[name] || {}
      store.commit('SET_TRANSLATION_PROVIDERS', {
        [name]: { ...current, model: val },
      })
    },
    onBaseUrlChange(val) {
      const name = this.translationProvider
      const current = this.translationProviders[name] || {}
      store.commit('SET_TRANSLATION_PROVIDERS', {
        [name]: { ...current, baseUrl: val },
      })
    },
    onProcessModeChange(val) {
      this.translationProcessMode = val
    },
    onAutoTranslateChange(val) {
      this.translationAutoTranslate = val
    },
    async testConnection() {
      const providerName = this.translationProvider
      const config = this.providerConfig
      const apiKey = config.apiKey || ''
      const model = config.model || ''
      const baseUrl = config.baseUrl || ''

      if (!apiKey) {
        Toast('请先输入 API Key')
        return
      }

      this.testLoading = true

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
          siliconcloud: 'Qwen/Qwen3-VL-32B-Instruct',
          openai: 'gpt-4o-mini',
          deepseek: 'deepseek-chat',
          glm: 'glm-4-plus',
        }

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
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

        Toast.success('连接成功')
      } catch (err) {
        console.log('testConnection err:', err)
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
</style>
