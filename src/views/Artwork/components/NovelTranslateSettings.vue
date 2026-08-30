<template>
  <div class="novel-translate-settings">
    <van-cell-group title="默认翻译服务">
      <van-radio-group v-model="translationService">
        <van-cell-group class="engine-options">
          <van-cell>
            <template #title>
              <van-radio name="gg">谷歌翻译</van-radio>
            </template>
          </van-cell>
          <van-cell>
            <template #title>
              <van-radio name="ms">微软翻译</van-radio>
            </template>
          </van-cell>
          <van-cell>
            <template #title>
              <van-radio name="yd">有道翻译</van-radio>
            </template>
          </van-cell>
          <van-cell>
            <template #title>
              <van-radio name="sc">AI 翻译</van-radio>
            </template>
          </van-cell>
          <van-cell v-if="isNativeTranslatorSupported">
            <template #title>
              <van-radio name="native">Chrome 内置翻译</van-radio>
            </template>
          </van-cell>
          <van-cell>
            <template #title>
              <van-radio name="">不设置</van-radio>
            </template>
          </van-cell>
        </van-cell-group>
      </van-radio-group>
    </van-cell-group>

    <van-cell-group title="AI 翻译 API 配置">
      <van-field
        :value="novelConfig.baseUrl"
        label="Base URL"
        placeholder="https://api.siliconflow.cn/v1"
        clearable
        @change="onNovelBaseUrlChange"
      />
      <van-field
        :value="novelConfig.apiKey"
        type="password"
        label="API Key"
        placeholder="输入你的 API Key"
        clearable
        @change="onNovelApiKeyChange"
      />
      <llm-model-select
        v-model="novelModel"
        :base-url="novelConfig.baseUrl"
        :api-key="novelConfig.apiKey"
      />
      <div class="engine-help">
        <van-icon name="info-o" /> 默认翻译服务选「AI 翻译」时使用以上配置；API Key 仅存储在本机浏览器。
      </div>
      <div class="engine-help">
        <van-icon name="info-o" /> 可<a target="_blank" rel="noopener noreferrer" href="https://cloud.siliconflow.cn/i/F5UpdO0m">点击此处</a>前往 SiliconCloud 注册后使用免费模型。
      </div>
      <div class="test-connection-wrap">
        <van-button size="small" plain round :loading="testLoading" loading-text="测试中..." @click="testConnection">测试连接</van-button>
      </div>
      <div v-if="testResult" class="model-test-result" :class="testResult.ok ? 'is-ok' : 'is-fail'">
        <van-icon :name="testResult.ok ? 'success' : 'warning'" />
        <span>{{ testResult.message }}</span>
        <span v-if="testResult.durationMs != null" class="result-duration">{{ testResult.durationMs }}ms</span>
      </div>
    </van-cell-group>

    <van-cell-group title="缓存管理">
      <van-cell center title="清除翻译缓存" label="清除所有已缓存的小说翻译结果">
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
    </van-cell-group>
  </div>
</template>

<script>
import { Toast } from '@/lib/vant-apis'
import store from '@/store'
import localDb from '@/utils/storage/localDb'
import { isNativeTranslatorSupported } from '@/utils/translate'
import { testConnection } from '@/utils/translate/llmClient'
import LlmModelSelect from './LlmModelSelect.vue'

export default {
  name: 'NovelTranslateSettings',
  components: {
    LlmModelSelect,
  },
  data() {
    return {
      isNativeTranslatorSupported,
      clearingCache: false,
      testLoading: false,
      testResult: null,
    }
  },
  computed: {
    translationService: {
      get() {
        const v = store.state.appSetting.novelDefTranslate
        if (v && v.startsWith('sc_')) return 'sc'
        return v || ''
      },
      set(val) {
        window.umami?.track('set:novelDefTranslate', { val })
        store.commit('setAppSetting', { novelDefTranslate: val })
      },
    },
    novelConfig() {
      const mt = store.state.mangaTrans
      return mt.providers[mt.novelProvider] || {}
    },
    novelModel: {
      get() {
        return store.state.mangaTrans.novelModel
      },
      set(val) {
        store.commit('SET_MANGA_TRANS', { novelModel: val })
      },
    },
  },
  methods: {
    onNovelBaseUrlChange(e) {
      const name = e.target.value
      if (!name) return
      const current = store.state.mangaTrans.providers[name] || {}
      store.commit('SET_MANGA_TRANS', {
        novelProvider: name,
        providers: { [name]: { ...current, baseUrl: name } },
      })
    },
    onNovelApiKeyChange(e) {
      const name = store.state.mangaTrans.novelProvider
      const current = store.state.mangaTrans.providers[name] || {}
      store.commit('SET_MANGA_TRANS', {
        providers: { [name]: { ...current, apiKey: e.target.value } },
      })
    },
    async testConnection() {
      const { baseUrl, apiKey } = this.novelConfig
      const model = this.novelModel
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
    async clearTranslationCache() {
      this.clearingCache = true
      try {
        const keys = await localDb.keys()
        for (const key of keys) {
          if (key.startsWith('novel.translate.')) {
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
  },
}
</script>

<style lang="stylus" scoped>
.novel-translate-settings
  height 100%
  padding 0.8rem 0
  box-sizing border-box
  overflow-y auto

  .engine-options
    .van-cell
      padding 0.2rem 0.3rem

  .translator-options
    gap 0.3rem
    padding 0.2rem 0.3rem

    ::v-deep .van-radio--horizontal
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
