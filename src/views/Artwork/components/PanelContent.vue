<template>
  <div class="panel-content">
    <div class="ptp-header">
      <span class="ptp-title">📖 翻译  Qwen3.5-4B</span>
      <span class="ptp-close" @click="$emit('close')">×</span>
    </div>
    <van-loading v-if="loading" class="ptp-loading" size="30px" />
    <div v-else-if="!translations || translations.length === 0" class="ptp-empty">
      <p class="ptp-empty-text">暂无翻译结果</p>
      <van-button size="small" type="primary" @click="$emit('retry')">重试</van-button>
    </div>
    <div v-else class="ptp-entries">
      <div v-for="(item, index) in translations" :key="index" class="ptp-entry">
        <div class="entry-header">{{ item.frame }} ▸ {{ item.position }}</div>
        <div class="entry-original">{{ item.original }}</div>
        <div class="entry-translated">{{ item.translated }}</div>
      </div>
    </div>
  </div>
</template>

<script>
import { Loading, Button } from 'vant'

export default {
  name: 'PanelContent',
  components: {
    VanLoading: Loading,
    VanButton: Button,
  },
  props: {
    loading: {
      type: Boolean,
      default: false,
    },
    translations: {
      type: Array,
      default: () => null,
    },
  },
}
</script>

<style lang="stylus" scoped>
.panel-content
  height 100%
  display flex
  flex-direction column

.ptp-header
  display flex
  align-items center
  justify-content space-between
  padding 0.2rem 0.3rem
  border-bottom 1px solid #eee

.ptp-title
  font-size 0.3rem
  font-weight bold
  white-space nowrap
  overflow hidden
  text-overflow ellipsis

.ptp-close
  font-size 0.4rem
  line-height 1
  cursor pointer
  padding 0 0.05rem
  color #666
  &:hover
    color #333

.ptp-loading
  display flex
  justify-content center
  align-items center
  padding 0.5rem 0

.ptp-empty
  display flex
  flex-direction column
  align-items center
  justify-content center
  padding 0.5rem
  gap 0.2rem

.ptp-empty-text
  color #999
  font-size 0.26rem
  margin 0

.ptp-entries
  padding 0.1rem 0
  overflow-y auto
  flex 1

.ptp-entry
  padding 0.2rem 0.3rem
  & + .ptp-entry
    border-top 1px solid #f0f0f0

.entry-header
  font-weight bold
  font-size 0.26rem
  margin-bottom 0.08rem
  color #555

.entry-original
  color #999
  font-size 0.24rem
  margin-bottom 0.06rem
  line-height 1.4

.entry-translated
  color var(--accent-color, #1989fa)
  font-size 0.26rem
  line-height 1.4
</style>
