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

    <van-cell-group v-if="isScProvider" title="AI 翻译模型">
      <van-cell title="选择 AI 翻译模型" class="preset-model-cell">
        <select v-model="aiModel" class="preset-model-select">
          <option v-for="(model, key) in modelMap" :key="key" :value="key">
            {{ model.split('/').pop() }}
          </option>
        </select>
      </van-cell>
    </van-cell-group>

    <van-cell-group title="AI 翻译 API 配置（BYOK）">
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
import { aiModelMap, freeAiModels, isNativeTranslatorSupported, resolveNovelModel } from '@/utils/translate'
import LlmModelSelect from './LlmModelSelect.vue'

export default {
  name: 'NovelTranslateSettings',
  components: {
    LlmModelSelect,
  },
  data() {
    return {
      aiModelMap,
      isNativeTranslatorSupported,
      clearingCache: false,
    }
  },
  computed: {
    modelMap() {
      const map = {}
      Object.keys(aiModelMap).forEach(k => {
        const model = aiModelMap[k]
        if (store.getters.isLoggedIn || freeAiModels.includes(model)) {
          map[k] = model
        }
      })
      return map
    },
    translationService: {
      get() {
        const v = store.state.appSetting.novelDefTranslate
        if (v && v.startsWith('sc_')) return 'sc'
        return v || ''
      },
      set(val) {
        if (val === 'sc') {
          const model = this.aiModel
          store.commit('setAppSetting', {
            novelDefTranslate: 'sc_' + model,
            novelDefTransAiModel: model,
          })
        } else {
          window.umami?.track('set:novelDefTranslate', { val })
          store.commit('setAppSetting', { novelDefTranslate: val })
        }
      },
    },
    aiModel: {
      get() {
        const v = store.state.appSetting.novelDefTranslate
        if (v && v.startsWith('sc_')) {
          const k = v.slice(3)
          if (k in aiModelMap) return k
        }
        return store.state.appSetting.novelDefTransAiModel || 'hy_mt'
      },
      set(val) {
        window.umami?.track('set:novelDefTransAiModel', { val })
        store.commit('setAppSetting', {
          novelDefTranslate: 'sc_' + val,
          novelDefTransAiModel: val,
        })
        store.commit('SET_MANGA_TRANS', { novelModel: aiModelMap[val] || val })
      },
    },
    novelConfig() {
      const mt = store.state.mangaTrans
      return mt.providers[mt.novelProvider] || {}
    },
    isScProvider() {
      return /siliconflow\.cn/.test(this.novelConfig.baseUrl || '')
    },
    novelModel: {
      get() {
        return resolveNovelModel(store.state.mangaTrans.novelModel || store.state.appSetting.novelDefTransAiModel)
      },
      set(val) {
        store.commit('SET_MANGA_TRANS', { novelModel: val })
      },
    },
  },
  methods: {
    onNovelBaseUrlChange(e) {
      const name = e.target.value
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
</style>
