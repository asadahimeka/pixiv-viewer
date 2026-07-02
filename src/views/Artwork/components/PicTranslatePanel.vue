<template>
  <div class="pic-translate-wrapper">
    <van-popup
      v-if="isWideScreen"
      :value="visible"
      class="pic-translate-popup"
      position="right"
      :overlay="false"
      :lock-scroll="false"
      get-container="body"
      @close="$emit('close')"
    >
      <PanelContent
        :loading="loading"
        :translations="translations"
        @close="$emit('close')"
        @retry="$emit('retry')"
      />
    </van-popup>
    <div
      v-else
      v-show="visible"
      class="pic-translate-mobile"
      @click.stop
    >
      <div class="ptm-handle"></div>
      <div class="ptm-body">
        <PanelContent
          :loading="loading"
          :translations="translations"
          @close="$emit('close')"
          @retry="$emit('retry')"
        />
      </div>
    </div>
  </div>
</template>

<script>
import { Popup } from 'vant'
import PanelContent from './PanelContent.vue'

export default {
  name: 'PicTranslatePanel',
  components: {
    VanPopup: Popup,
    PanelContent,
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
  computed: {
    isWideScreen() {
      return window.innerWidth > 1120
    },
  },
}
</script>

<style lang="stylus" scoped>
$breakpoint-mobile = 1120px

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
