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
        <van-icon name="info-o" /> 服务端翻译: 由自建服务端完成完整翻译管线（检测 → OCR → 翻译 → 去字 → 排版），结果输出到画布。每次翻译可能需要较长时间(数分钟)，请耐心等待。
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
        v-longpress="onSrvTokenLongpress"
        label="鉴权 Token"
        type="password"
        clearable
      />
      <div class="engine-help">
        <van-icon name="info-o" />
        <a href="https://github.com/asadahimeka/shinobu-server" target="_blank" rel="noopener">点击前往 GitHub 查看部署与自建说明</a>
      </div>
    </van-cell-group>

    <van-cell-group v-if="translationEngine === 'vl-api'" title="VL API 配置">
      <van-field
        :value="vlConfig.baseUrl"
        label="Base URL"
        placeholder="https://api.siliconflow.cn/v1"
        clearable
        @change="onVlBaseUrlChange"
      />
      <van-field
        :value="vlConfig.apiKey"
        type="password"
        label="API Key"
        placeholder="输入你的 API Key"
        clearable
        @change="onVlApiKeyChange"
      />
      <llm-model-select
        v-model="translationVlModel"
        :sc-vl-model="isSiliconCloud"
        :base-url="vlConfig.baseUrl"
        :api-key="vlConfig.apiKey"
      />
      <div class="engine-help">
        <van-icon name="info-o" /> 支持 OpenAI 兼容接口。视觉翻译需选择支持图片输入的 VL 模型；API Key 仅存储在本机浏览器，请勿填入他人设备。
      </div>
      <div class="test-connection-wrap">
        <van-button size="small" plain round :loading="vlTestLoading" loading-text="测试中..." @click="testVlConnection">测试连接</van-button>
      </div>
      <div v-if="vlTestResult" class="model-test-result" :class="vlTestResult.ok ? 'is-ok' : 'is-fail'">
        <van-icon :name="vlTestResult.ok ? 'success' : 'warning'" />
        <span>{{ vlTestResult.message }}</span>
        <span v-if="vlTestResult.durationMs != null" class="result-duration">{{ vlTestResult.durationMs }}ms</span>
      </div>
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
        <div class="engine-help">
          <van-icon name="info-o" /> 如需在 Pixiv 原站阅读漫画，推荐安装 <a href="https://chromewebstore.google.com/detail/pgehhpbnifjlalmmnpiebkjhphojffef" target="_blank" rel="noreferrer">ShinobuTranslator 浏览器扩展</a>
        </div>
        <div class="engine-help">
          <van-icon name="info-o" /> Firefox 用户可前往 <a href="https://github.com/DonutShinobu/ShinobuTranslator" target="_blank" rel="noreferrer">GitHub Releases</a> 手动安装
        </div>
      </van-cell-group>

      <van-cell-group v-if="translationTranslator == 'llm'" title="翻译提供商" style="padding-bottom: 1px">
        <van-field
          :value="providerConfig.baseUrl"
          label="Base URL"
          placeholder="自定义 API 地址"
          @change="onBaseUrlChange"
        />
        <van-field
          v-longpress="onApiKeyLongpress"
          :value="providerConfig.apiKey"
          type="password"
          label="API Key"
          placeholder="输入你的 API Key"
          @change="onApiKeyChange"
        />
        <llm-model-select
          :value="providerConfig.model"
          :base-url="providerConfig.baseUrl"
          :api-key="providerConfig.apiKey"
          @input="onModelChange"
        />
        <div class="engine-help">
          <van-icon name="info-o" /> 支持 OpenAI 兼容接口。API Key 仅存储在本机浏览器，请勿填入他人设备。
        </div>
        <div class="test-connection-wrap">
          <van-button size="small" plain round :loading="testLoading" loading-text="测试中..." @click="testConnection">
            测试连接
          </van-button>
        </div>
        <div v-if="testResult" class="model-test-result" :class="testResult.ok ? 'is-ok' : 'is-fail'">
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
import { SILICON_CLOUD_BASR_URL } from '@/consts'
import { Toast } from '@/lib/vant-apis'
import localforage from 'localforage'
import store from '@/store'
import localDb from '@/utils/storage/localDb'
import { testConnection } from '@/utils/translate/llmClient'
import LlmModelSelect from './LlmModelSelect.vue'

export default {
  name: 'MangaTranslateSettings',
  components: {
    LlmModelSelect,
  },
  data() {
    return {
      testLoading: false,
      testResult: null,
      clearingCache: false,
      clearingModels: false,
      vlTestLoading: false,
      vlTestResult: null,
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
    vlConfig() {
      const mt = store.state.mangaTrans
      return mt.providers[mt.vlProvider] || {}
    },
    isSiliconCloud() {
      return this.providerConfig.baseUrl?.includes(SILICON_CLOUD_BASR_URL)
    },
  },
  methods: {
    onBaseUrlChange(e) {
      const name = e.target.value
      if (!name) return
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
      const name = this.providerConfig.baseUrl
      const current = this.translationProviders[name] || {}
      store.commit('SET_MANGA_TRANS', {
        providers: {
          [name]: { ...current, apiKey: val },
        },
      })
    },
    onModelChange(val) {
      const name = this.providerConfig.baseUrl
      const current = this.translationProviders[name] || {}
      store.commit('SET_MANGA_TRANS', {
        providers: {
          [name]: { ...current, model: val },
        },
      })
    },
    onVlBaseUrlChange(e) {
      const name = e.target.value
      const current = store.state.mangaTrans.providers[name] || {}
      store.commit('SET_MANGA_TRANS', {
        vlProvider: name,
        providers: { [name]: { ...current, baseUrl: name } },
      })
    },
    onVlApiKeyChange(e) {
      const name = store.state.mangaTrans.vlProvider
      const current = store.state.mangaTrans.providers[name] || {}
      store.commit('SET_MANGA_TRANS', {
        providers: { [name]: { ...current, apiKey: e.target.value } },
      })
    },
    async testVlConnection() {
      const { baseUrl, apiKey, model } = this.vlConfig
      if (!baseUrl || !apiKey || !model) {
        Toast('请输入 BaseURL、API Key 和模型')
        return
      }
      this.vlTestLoading = true
      const start = Date.now()
      const res = await testConnection({ baseUrl, apiKey, model })
      res.durationMs = Date.now() - start
      this.vlTestResult = res
      this.vlTestLoading = false
      setTimeout(() => {
        this.vlTestResult = null
      }, 2000)
    },
    async testConnection() {
      const { baseUrl, apiKey, model } = this.providerConfig
      if (!baseUrl || !apiKey || !model) {
        Toast('请输入 BaseURL、API Key 和模型')
        return
      }
      this.testLoading = true
      const start = Date.now()
      const res = await testConnection({ baseUrl, apiKey, model })
      res.durationMs = Date.now() - start
      this.testResult = res
      this.testLoading = false
      setTimeout(() => {
        this.testResult = null
      }, 2000)
    },
    onSrvTokenLongpress() {
      const value = prompt('鉴权 Token')
      if (value) this.serverTokenInput = value
    },
    onApiKeyLongpress() {
      const value = prompt('请输入 API Key')
      if (value) this.onApiKeyChange({ target: { value } })
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

  .model-test-result
    margin 0.1rem 0.3rem 0.2rem
    padding 0.15rem 0.2rem
    border 1px solid #eee
    border-radius 0.08rem
    text-align right
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
