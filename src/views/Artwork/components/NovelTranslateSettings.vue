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
              <van-radio name="sc">AI翻译</van-radio>
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

    <van-cell-group title="AI 翻译模型">
      <van-cell
        title="AI 翻译模型"
        label="选择 AI 翻译模型"
        class="preset-model-cell"
      >
        <select v-model="aiModel" class="preset-model-select">
          <option v-for="(model, key) in aiModelMap" :key="key" :value="key">
            {{ model.split('/').pop() }}
          </option>
        </select>
      </van-cell>
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
import { aiModelMap, isNativeTranslatorSupported } from '@/utils/translate'

export default {
  name: 'NovelTranslateSettings',
  data() {
    return {
      aiModelMap,
      isNativeTranslatorSupported,
      clearingCache: false,
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
        if (val === 'sc') {
          const model = this.aiModel
          store.commit('setAppSetting', {
            novelDefTranslate: 'sc_' + model,
            novelDefAiModel: model,
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
        return store.state.appSetting.novelDefAiModel || 'hy_mt'
      },
      set(val) {
        window.umami?.track('set:novelDefAiModel', { val })
        store.commit('setAppSetting', {
          novelDefTranslate: 'sc_' + val,
          novelDefAiModel: val,
        })
      },
    },
  },
  methods: {
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
    font-size 0.26rem
    color #333

  ::v-deep .van-cell-group__title
    font-size 0.28rem
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
      font-size 0.24rem
      color #333
</style>
