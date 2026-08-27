<template>
  <div class="llm-model-select">
    <van-field
      v-if="isManual"
      :value="value"
      label="模型"
      placeholder="请输入模型 ID，格式参照 API 平台文档"
      clearable
      @change="$emit('input', $event.target.value)"
    />
    <van-cell v-else title="模型" label="从 API 获取模型列表" class="model-cell" is-link @click="openPicker">
      <template #default>
        <span class="model-current">{{ value || '未选择' }}</span>
      </template>
    </van-cell>
    <van-cell center title="手动输入模型" label="关闭则从 API 拉取模型列表选择">
      <template #right-icon>
        <van-switch :value="isManual" size="24" @input="setManual" />
      </template>
    </van-cell>

    <van-popup v-model="showPicker" class="llm-model-select-popup" position="bottom" round closeable :overlay="false" get-container="body">
      <van-search v-model="keyword" placeholder="搜索模型 ID" />
      <div class="model-list">
        <van-cell
          v-for="id in filteredIds"
          :key="id"
          :title="id"
          clickable
          @click="pick(id)"
        >
          <template v-if="id == value" #right-icon>
            <van-icon name="success" />
          </template>
        </van-cell>
        <div v-if="!filteredIds.length" class="model-list-empty">
          {{ loading ? '加载中...' : error ? error : '列表为空，可开启「手动输入模型」直接填写' }}
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script>
import store from '@/store'
import { fetchModels } from '@/utils/translate/llmClient'
import { VL_MODELS } from '@/utils/translate/manga'
import { getCache, setCache } from '@/utils/storage/siteCache'

export default {
  name: 'LlmModelSelect',
  props: {
    value: { type: String, default: '' },
    baseUrl: { type: String, required: true },
    apiKey: { type: String, default: '' },
    scVlModel: { type: Boolean, default: false },
  },
  data() {
    return {
      showPicker: false,
      keyword: '',
      loading: false,
      error: '',
      cachedIds: [],
    }
  },
  computed: {
    isManual() {
      return store.state.mangaTrans.providers[this.baseUrl]?.modelSelMode === 'manual'
    },
    filteredIds() {
      const kw = this.keyword.trim().toLowerCase()
      return kw ? this.cachedIds.filter(id => id.toLowerCase().includes(kw)) : this.cachedIds
    },
  },
  methods: {
    setManual(val) {
      const provider = store.state.mangaTrans.providers[this.baseUrl] || {}
      store.commit('SET_MANGA_TRANS', {
        providers: {
          [this.baseUrl]: {
            ...provider,
            baseUrl: this.baseUrl,
            modelSelMode: val ? 'manual' : 'list',
          },
        },
      })
    },
    async openPicker() {
      this.showPicker = true
      if (this.scVlModel) {
        this.cachedIds = Object.values(VL_MODELS)
        return
      }
      const cacheKey = `model.list.${this.baseUrl}`
      const cached = await getCache(cacheKey)
      if (cached) {
        this.cachedIds = cached
        return
      }
      if (!this.apiKey) {
        this.$toast('请先填写 API Key')
        return
      }
      this.loading = true
      this.error = ''
      try {
        const ids = await fetchModels({ baseUrl: this.baseUrl, apiKey: this.apiKey })
        setCache(cacheKey, ids, 86400)
        this.cachedIds = ids
      } catch (err) {
        console.log('fetchModels err:', err)
        this.error = `获取模型列表失败: ${err.message}，可开启「手动输入模型」直接填写`
      } finally {
        this.loading = false
      }
    },
    pick(id) {
      this.$emit('input', id)
      this.showPicker = false
    },
  },
}
</script>

<style lang="stylus">
.llm-model-select-popup
  left: 50%
  width: 10rem
  height: 80%
  margin-left: -5rem
  overflow: hidden
  .model-cell
    .model-current
      font-size 13PX
      color #666
      word-break break-all
  .model-list
    height: 90%
    padding-bottom 0.3rem
    box-sizing: border-box
    overflow-y: auto
    .model-list-empty
      padding 0.4rem 0.3rem
      font-size 13PX
      color #999
      text-align center
  .van-field__clear
    display none
  .van-popup__close-icon--top-right
    right 0.6rem
</style>
