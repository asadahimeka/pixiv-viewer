<template>
  <div class="panel-content">
    <div class="ptp-header">
      <span class="ptp-title">📖 翻译</span>
      <span class="ptp-close" @click="$emit('close')">×</span>
    </div>
    <div v-if="!translations" class="ptp-empty-wrap">
      <van-loading v-if="loading" class="ptp-loading" size="30px" />
      <div v-else class="ptp-empty">
        <p class="ptp-empty-text">暂无翻译结果</p>
        <van-button size="small" type="primary" @click="$emit('retry')">重试</van-button>
      </div>
    </div>
    <div v-else class="ptp-text-content" :class="{ 'ptp-streaming-active': loading }">
      {{ translations }}
      <div v-if="loading" class="ptp-streaming-bar">
        <span class="ptp-streaming-dot"></span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PanelContent',
  props: {
    loading: {
      type: Boolean,
      default: false,
    },
    translations: {
      type: String,
      default: null,
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

.ptp-empty-wrap
  padding 0 0.3rem

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

.ptp-text-content
  padding 0.2rem 0.3rem
  overflow-y auto
  flex 1
  font-size 0.26rem
  line-height 1.6
  white-space pre-wrap
  word-wrap break-word
  color #333

  &.ptp-streaming-active
    animation ptp-fade-in 0.15s ease-out

.ptp-streaming-bar
  display flex
  align-items center
  padding 0.15rem 0

.ptp-streaming-dot
  width 0.1rem
  height 0.1rem
  background var(--accent-color, #1989fa)
  border-radius 50%
  animation ptp-pulse 1.2s ease-in-out infinite

@keyframes ptp-pulse
  0%, 100%
    opacity 0.3
    transform scale(0.8)
  50%
    opacity 1
    transform scale(1.2)

@keyframes ptp-fade-in
  from
    opacity 0
  to
    opacity 1
</style>
