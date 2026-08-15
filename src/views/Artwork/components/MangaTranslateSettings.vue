<template>
  <div class="translate-settings">
    <van-cell-group title="翻译引擎">
      <van-radio-group v-model="translationEngine">
        <van-cell-group class="engine-options">
          <van-cell>
            <template #title>
              <van-radio name="vl-api">VL API（默认，侧边栏显示翻译文本）</van-radio>
            </template>
          </van-cell>
          <van-cell>
            <template #title>
              <van-radio name="shinobu">Shinobu 管线（完整管线，画布输出）</van-radio>
            </template>
          </van-cell>
          <van-cell>
            <template #title>
              <van-radio name="server">服务端翻译（自建服务，画布输出）</van-radio>
            </template>
          </van-cell>
        </van-cell-group>
      </van-radio-group>
      <div v-if="translationEngine === 'vl-api'" class="engine-help">
        <van-icon name="info-o" /> VL API: 使用云端视觉语言模型翻译，文本在侧边栏面板显示，支持流式输出。
      </div>
      <div v-else-if="translationEngine === 'shinobu'" class="engine-help">
        <van-icon name="info-o" /> Shinobu 管线: 完整翻译管线（检测 → OCR → 翻译 → 去字 → 排版），结果直接输出到画布。首次使用需要下载模型文件。
      </div>
      <div v-else-if="translationEngine === 'server'" class="engine-help">
        <van-icon name="info-o" /> 服务端翻译: 由自建服务端完成完整翻译管线（检测 → OCR → 翻译 → 去字 → 排版），结果输出到画布。每次翻译可能需要较长时间，请耐心等待。
      </div>
    </van-cell-group>

    <van-cell-group v-if="translationEngine === 'server'" title="服务端配置">
      <van-field
        v-model="serverUrlInput"
        label="服务端地址"
        placeholder="https://hibiapi.cocomi.eu.org/manga"
        clearable
      />
      <van-field
        v-model="serverTokenInput"
        label="鉴权 Token"
        type="password"
        clearable
      />
      <div class="engine-help">
        <van-icon name="info-o" /> 留空使用构建时默认配置，<a href="https://github.com/asadahimeka/shinobu-server" target="_blank" rel="noopener">点击前往 GitHub 查看部署与自建说明</a>
      </div>
    </van-cell-group>

    <van-cell-group v-if="translationEngine === 'vl-api'" title="VL 模型">
      <van-cell
        title="视觉语言模型"
        label="选择云端 VL 模型进行漫画翻译"
        class="preset-model-cell"
      >
        <select v-model="translationVlModel" class="preset-model-select">
          <option v-for="(model, label) in vlModels" :key="label" :value="model">
            {{ label }}
          </option>
        </select>
      </van-cell>
    </van-cell-group>

    <template v-if="translationEngine === 'shinobu'">
      <van-cell-group title="翻译器">
        <van-radio-group
          v-model="translationTranslator"
          direction="horizontal"
          class="translator-options"
        >
          <van-radio name="llm">LLM（AI 翻译）</van-radio>
          <van-radio name="google_web">Google 翻译</van-radio>
        </van-radio-group>
        <div v-if="translationTranslator === 'google_web'" class="engine-help">
          <van-icon name="info-o" /> 使用 Google 翻译网页版接口，无需 API Key。<br><span style="margin-left:1.5em">需要能访问 translate.googleapis.com</span>
        </div>
      </van-cell-group>

      <div class="engine-help">
        <van-icon name="info-o" /> 如需在 Pixiv 原站阅读漫画，推荐安装 <a href="https://chromewebstore.google.com/detail/pgehhpbnifjlalmmnpiebkjhphojffef" target="_blank" rel="noreferrer">ShinobuTranslator 浏览器扩展</a>
      </div>
      <div class="engine-help">
        <van-icon name="info-o" /> Firefox 用户可前往 <a href="https://github.com/DonutShinobu/ShinobuTranslator" target="_blank" rel="noreferrer">GitHub Releases</a> 手动安装
      </div>

      <van-cell-group v-if="translationTranslator == 'llm'" title="翻译提供商" style="padding-bottom: 1px">
        <van-field
          :value="providerConfig.baseUrl"
          label="Base URL"
          placeholder="自定义 API 地址"
          @change="onBaseUrlChange"
        />
        <van-field
          :value="showPresetModelSel ? '' : providerConfig.apiKey"
          type="password"
          label="API Key"
          placeholder="输入 API Key，留空使用预设"
          @change="onApiKeyChange"
        />
        <van-cell
          v-if="showPresetModelSel"
          title="模型"
          label="请选择翻译模型"
          class="preset-model-cell"
        >
          <select :value="providerConfig.model" class="preset-model-select" @change="onPresetModelChange">
            <option v-for="model in presetModels" :key="model" :value="model">
              {{ model.split('/').pop() }}
            </option>
          </select>
        </van-cell>
        <van-field
          v-else
          :value="providerConfig.model"
          label="模型"
          placeholder="输入模型"
          @change="onModelChange"
        />
        <div class="test-connection-wrap">
          <van-button
            size="small"
            plain
            round
            :loading="testLoading"
            loading-text="测试中..."
            @click="testConnection"
          >
            测试连接
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

      <van-cell-group title="处理模式">
        <van-radio-group v-model="translationProcessMode">
          <van-cell-group class="engine-options">
            <van-cell>
              <template #title>
                <van-radio name="translate">翻译（完整管线）</van-radio>
              </template>
            </van-cell>
            <van-cell>
              <template #title>
                <van-radio name="erase">擦除（调试）</van-radio>
              </template>
            </van-cell>
            <van-cell>
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
            <van-switch v-model="translationBubble" size="24" />
          </template>
        </van-cell>
      </van-cell-group>

      <van-cell-group title="翻译语言">
        <van-field v-model="translationSourceLang" label="源语言" placeholder="ja" />
        <van-field v-model="translationTargetLang" label="目标语言" placeholder="zh-CN" />
      </van-cell-group>
    </template>

    <van-cell-group title="缓存管理">
      <van-cell center title="清除翻译缓存" label="清除所有已缓存的翻译结果">
        <template #right-icon>
          <van-button
            size="small"
            plain
            round
            :loading="clearingCache"
            loading-text="清除中..."
            style="min-width: 1.2rem"
            @click="clearTranslationCache"
          >
            清除
          </van-button>
        </template>
      </van-cell>
      <van-cell v-if="translationEngine === 'shinobu'" title="清除模型缓存" label="删除已下载的检测/OCR/去字模型（约 199MB），下次翻译时重新下载">
        <template #right-icon>
          <van-button size="small" plain round style="min-width: 1.2rem" :loading="clearingModels" @click="clearModelCache">清除</van-button>
        </template>
      </van-cell>
      <van-cell v-if="translationEngine === 'shinobu'" title="重置模型下载提醒" label="清除已同意的模型下载标记，下次翻译时重新询问">
        <template #right-icon>
          <van-button size="small" plain round style="min-width: 1.2rem" @click="resetModelConsent">重置</van-button>
        </template>
      </van-cell>
    </van-cell-group>
  </div>
</template>

<script>
import { SILICON_CLOUD_API_KEY, SILICON_CLOUD_BASR_URL } from '@/consts'
import { Toast } from '@/lib/vant-apis'
import localforage from 'localforage'
import store from '@/store'
import localDb from '@/utils/storage/localDb'
import { aiModelMap } from '@/utils/translate'
import { VL_MODELS } from '@/utils/translate/manga'

export default {
  name: 'MangaTranslateSettings',
  data() {
    return {
      testLoading: false,
      clearingCache: false,
      clearingModels: false,
      testResult: null,
      vlModels: VL_MODELS,
      presetModels: Object.values(aiModelMap),
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
    translationTranslator: {
      get() {
        return store.state.mangaTrans.translator || 'llm'
      },
      set(val) {
        store.commit('SET_MANGA_TRANS', { translator: val })
      },
    },
    translationProvider() {
      return store.state.mangaTrans.provider
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
    serverUrlInput: {
      get() {
        return store.state.mangaTrans.serverUrl
      },
      set(value) {
        store.commit('SET_MANGA_TRANS', { serverUrl: value })
      },
    },
    serverTokenInput: {
      get() {
        return store.state.mangaTrans.serverToken
      },
      set(value) {
        store.commit('SET_MANGA_TRANS', { serverToken: value })
      },
    },
    providerConfig() {
      return this.translationProviders[this.translationProvider] || {}
    },
    showPresetModelSel() {
      return (
        // this.translationProvider == SILICON_CLOUD_BASR_URL &&
        this.providerConfig.apiKey == SILICON_CLOUD_API_KEY
      )
    },
  },
  methods: {
    onBaseUrlChange(e) {
      const name = e.target.value
      const current = this.translationProviders[name] || {}
      store.commit('SET_MANGA_TRANS', {
        provider: name,
        providers: {
          [name]: { ...current, baseUrl: name },
        },
      })
    },
    onApiKeyChange(e) {
      const val = e.target.value
      if (!val && this.showPresetModelSel) return
      const name = this.providerConfig.baseUrl
      const current = this.translationProviders[name] || {}
      store.commit('SET_MANGA_TRANS', {
        providers: {
          [name]: { ...current, apiKey: val },
        },
      })
    },
    onPresetModelChange(e) {
      const model = e.target.value
      const name = SILICON_CLOUD_BASR_URL
      const current = this.translationProviders[name] || {}
      const patch = { ...current, model }
      store.commit('SET_MANGA_TRANS', {
        providers: {
          [name]: patch,
        },
      })
    },
    onModelChange(e) {
      const val = e.target.value
      const name = this.providerConfig.baseUrl
      const current = this.translationProviders[name] || {}
      store.commit('SET_MANGA_TRANS', {
        providers: {
          [name]: { ...current, model: val },
        },
      })
    },
    async clearTranslationCache() {
      this.clearingCache = true
      try {
        const keys = await localDb.keys()
        for (const key of keys) {
          if (key.startsWith('pic.translate.')) {
            await localDb.remove(key)
          }
        }
        Toast.success('缓存已清除')
      } catch (err) {
        Toast('清除缓存失败: ' + err.message)
      } finally {
        this.clearingCache = false
      }
    },
    resetModelConsent() {
      store.commit('SET_MANGA_TRANS', { shinobuModelConsent: false })
      Toast.success('已重置，下次翻译将重新询问')
    },
    async clearModelCache() {
      this.clearingModels = true
      try {
        const modelDb = localforage.createInstance({ name: 'shinobu-models', storeName: 'models' })
        await modelDb.clear()
        const { disposeAllModelSessions } = await import('@/utils/translate/shinobu/runtime/modelRegistry')
        await disposeAllModelSessions().catch(() => {})
        Toast.success('已清除模型缓存')
      } catch (err) {
        Toast('清除模型缓存失败: ' + err.message)
      } finally {
        this.clearingModels = false
      }
    },
    async testConnection() {
      const config = this.providerConfig
      const apiKey = config.apiKey || ''
      const model = config.model || ''

      if (!apiKey) {
        this.testResult = { ok: false, message: '请先输入 API Key' }
        Toast('请先输入 API Key')
        return
      }

      window.umami?.track('llm-test-connection', { val: config.baseUrl })

      this.testLoading = true
      const start = Date.now()

      try {
        // BaseURL 识别：追加 /chat/completions（若未以该后缀结尾）
        const baseUrl = (config.baseUrl || SILICON_CLOUD_BASR_URL).replace(/\/$/, '')
        const url = baseUrl.endsWith('/chat/completions')
          ? baseUrl
          : `${baseUrl}/chat/completions`

        // 按域名模式推断默认模型，不匹配时兜底 gpt-4o-mini
        const defaultModel = /siliconflow\.cn/.test(baseUrl)
          ? 'Qwen/Qwen3-8B'
          : /openai\.com/.test(baseUrl)
            ? 'gpt-4o-mini'
            : /deepseek\.com/.test(baseUrl)
              ? 'deepseek-chat'
              : 'gpt-4o-mini'

        const authMode = config.authMode || 'api_key'
        const headers = { 'Content-Type': 'application/json' }
        if (authMode === 'bearer_token') {
          headers.Authorization = apiKey
        } else if (authMode === 'custom_header') {
          headers[config.customHeaderName || 'X-API-Key'] = config.customHeaderValue || apiKey
        } else {
          headers.Authorization = `Bearer ${apiKey}`
        }

        const body = JSON.stringify({
          model: model || defaultModel,
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 5,
        })

        if (window.__httpRequest__) {
          const resp = await window.__httpRequest__(url, JSON.stringify({
            method: 'POST',
            headers,
            data: body,
          }))
          if (resp.data) {
            this.testResult = { ok: true, message: '连接成功', durationMs: Date.now() - start }
            Toast.success('连接成功')
          }
        } else {
          const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              model: model || defaultModel,
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
        }
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
  height 100%
  padding 0.8rem 0
  box-sizing border-box
  overflow-y auto

  .engine-options
    .van-cell
      padding 0.2rem 0.3rem

  .translator-options
    padding 0.2rem 0.3rem

    ::v-deep .van-radio--horizontal
      margin-right 0.3rem

    ::v-deep .van-radio--horizontal:last-child
      margin-right 0

  .test-connection-wrap
    padding 0.2rem 0.3rem
    display flex
    justify-content flex-end

  ::v-deep .van-radio
    display flex
    align-items center

  ::v-deep .van-radio__label
    font-size 14PX
    color #333

  ::v-deep .van-cell-group__title
    font-size 13PX
    font-weight bold
    padding 0.3rem 0.3rem 0.1rem
    color #555

  .engine-help
    font-size 12PX
    color #666
    padding 0.1rem 0.3rem 0.2rem
    line-height 1.5

    .van-icon
      vertical-align middle
      margin-right 0.06rem

  .preset-model-cell
    ::v-deep .van-cell__value
      display flex
      align-items center
      justify-content flex-end

    .preset-model-select
      width 3.5rem
      padding 0.08rem 0.2rem
      border 1px solid #ddd
      border-radius 0.08rem
      background #fff
      font-size 13PX
      color #333

  .model-test-result
    margin 0.1rem 0.3rem 0.2rem
    padding 0.15rem 0.2rem
    border 1px solid #eee
    border-radius 0.08rem
    font-size 13PX
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
      font-size 12PX
      color #999
</style>
