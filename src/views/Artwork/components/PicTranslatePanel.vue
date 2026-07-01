<template>
  <div class="pic-translate-wrapper">
    <!-- Desktop: right-side popup without overlay -->
    <van-popup
      :value="visible"
      class="pic-translate-popup"
      position="right"
      :overlay="false"
      :lock-scroll="false"
      get-container="body"
      @close="$emit('close')"
    >
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
    </van-popup>

    <!-- Mobile: bottom fixed semi-transparent panel -->
    <div v-show="visible" class="pic-translate-mobile" @click.stop>
      <div class="ptm-handle"></div>
      <div class="ptm-header">
        <span class="ptm-title">📖 翻译  Qwen3.5-4B</span>
        <span class="ptm-close" @click="$emit('close')">×</span>
      </div>
      <div class="ptm-body">
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
    </div>
  </div>
</template>

<script>
import { Popup, Loading, Button } from 'vant'

export default {
  name: 'PicTranslatePanel',
  components: {
    VanPopup: Popup,
    VanLoading: Loading,
    VanButton: Button,
  },
  props: {
    visible: {
      type: Boolean,
      default: false,
    },
    translations: {
      type: Array,
      default: () => null,
    },
    currentPage: {
      type: Number,
      default: 0,
    },
    loading: {
      type: Boolean,
      default: false,
    },
  },
}
</script>

<style lang="stylus" scoped>
$breakpoint-mobile = 1120px

// --- Shared styles ---
.ptp-header,
.ptm-header
  display flex
  align-items center
  justify-content space-between
  padding 0.2rem 0.3rem
  border-bottom 1px solid #eee

.ptp-title,
.ptm-title
  font-size 0.3rem
  font-weight bold
  white-space nowrap
  overflow hidden
  text-overflow ellipsis

.ptp-close,
.ptm-close
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

// --- Desktop: right-side popup ---
.pic-translate-popup
  width 5rem

@media (max-width: $breakpoint-mobile)
  .pic-translate-popup
    display none !important

// --- Mobile: bottom fixed panel ---
.pic-translate-mobile
  position fixed
  bottom 0
  left 0
  right 0
  z-index 100
  background rgba(255, 255, 255, 0.85)
  border-radius 0.2rem 0.2rem 0 0
  max-height 50vh
  display flex
  flex-direction column

.ptm-handle
  width 0.6rem
  height 0.06rem
  background #ccc
  border-radius 0.03rem
  margin 0.1rem auto
  flex-shrink 0

.ptm-body
  flex 1
  overflow-y auto
  -webkit-overflow-scrolling touch

@media (min-width: ($breakpoint-mobile + 1))
  .pic-translate-mobile
    display none !important
</style>
