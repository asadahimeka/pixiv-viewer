<template>
  <div v-show="showOverlay" class="translate-overlay">
    <canvas ref="overlayCanvas" class="overlay-canvas"></canvas>
    <div v-if="loading" class="loading-overlay">
      <van-loading type="spinner" />
      <div class="progress-detail">{{ progress.detail }}</div>
      <MangaTranslateProgress
        v-if="translationEngine == 'shinobu' || translationEngine == 'server'"
        :progress="progress"
        :stage-timings="stageTimings"
        class="translate-progress-embed"
      />
    </div>
    <div v-if="showToggleBtn" class="toggle-btn" @click.stop="$emit('toggle')">
      {{ showTranslated ? '原图' : '译图' }}
    </div>
  </div>
</template>

<script>
import MangaTranslateProgress from './MangaTranslateProgress'

export default {
  name: 'MangaTranslateOverlay',
  components: {
    MangaTranslateProgress,
  },
  props: {
    pageIndex: {
      type: Number,
      default: 0,
    },
    translatedCanvas: {
      type: HTMLCanvasElement,
      default: null,
    },
    showTranslated: {
      type: Boolean,
      default: false,
    },
    loading: {
      type: Boolean,
      default: false,
    },
    progress: {
      type: Object,
      default: () => ({ stage: '', detail: '', percent: 0 }),
    },
    stageTimings: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    return {
      observer: null,
    }
  },
  computed: {
    showOverlay() {
      return this.loading || this.showTranslated
    },
    showToggleBtn() {
      return !this.loading && !!this.translatedCanvas
    },
    translationEngine() {
      return this.$store.state.mangaTrans.engine
    },
  },
  watch: {
    showTranslated(val) {
      if (val) {
        this.drawTranslated()
      } else {
        this.clearCanvas()
      }
    },
    loading(val) {
      if (!val && !this.showTranslated) {
        this.clearCanvas()
      }
    },
  },
  beforeDestroy() {
    // Clear canvas context and release resources
    this.clearCanvas()
  },
  methods: {
    drawTranslated() {
      const canvas = this.$refs.overlayCanvas
      if (!canvas || !this.translatedCanvas) return
      canvas.width = this.translatedCanvas.width
      canvas.height = this.translatedCanvas.height
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(this.translatedCanvas, 0, 0, canvas.width, canvas.height)
    },
    clearCanvas() {
      const canvas = this.$refs.overlayCanvas
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    },
  },
}
</script>

<style lang="stylus" scoped>
.translate-overlay
  position absolute
  top 0
  left 0
  width 100%
  height 100%
  z-index 5
  pointer-events none
  transition opacity 0.2s ease

.overlay-canvas
  width 100%
  height 100%
  object-fit contain

.loading-overlay
  position absolute
  top 0
  left 0
  width 100%
  height 100%
  display flex
  flex-direction column
  align-items center
  justify-content center
  background rgba(0, 0, 0, 0.6)
  pointer-events auto
  z-index 1

.progress-detail
  color #fff
  font-size 0.26rem
  margin-top 0.2rem

.translate-progress-embed
  width 72%
  margin-top 0.15rem
  max-height 72%
  overflow-y auto
  scrollbar-width thin

.toggle-btn
  position absolute
  bottom 1rem
  right 0.2rem
  z-index 10
  width 0.6rem
  padding 0.1rem 0.16rem
  color #fff
  background rgba(0, 0, 0, 0.55)
  font-size 0.22rem
  text-align center
  border-radius 0.06rem
  cursor pointer
  pointer-events auto
  user-select none
  transition background 0.15s ease
  &:active
    background rgba(0, 0, 0, 0.75)
</style>
