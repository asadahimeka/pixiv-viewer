<template>
  <div class="translate-overlay" v-show="showOverlay">
    <canvas ref="overlayCanvas" class="overlay-canvas"></canvas>
    <div v-if="loading" class="loading-overlay">
      <van-loading type="spinner" />
      <div class="progress-detail">{{ progress.detail }}</div>
      <div class="progress-bar-wrap">
        <div class="progress-bar-fill" :style="{ width: progress.percent + '%' }"></div>
      </div>
    </div>
  </div>
</template>

<script>
import { Loading } from 'vant'

export default {
  name: 'TranslateOverlay',
  components: {
    VanLoading: Loading,
  },
  props: {
    artworkId: {
      type: [String, Number],
      required: true,
    },
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
  },
  watch: {
    translatedCanvas() {
      this.redrawCanvas()
    },
    showTranslated(val) {
      if (val) {
        this.redrawCanvas()
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
  mounted() {
    this.initObserver()
    this.$nextTick(() => {
      this.positionOverlay()
    })
  },
  activated() {
    this.initObserver()
    this.$nextTick(() => {
      this.positionOverlay()
    })
  },
  deactivated() {
    this.disconnectObserver()
  },
  beforeDestroy() {
    this.disconnectObserver()
    this.clearCanvas()
  },
  methods: {
    initObserver() {
      this.disconnectObserver()
      const parent = this.$el?.parentElement
      if (!parent) return
      this.observer = new ResizeObserver(() => {
        this.positionOverlay()
      })
      this.observer.observe(parent)
    },
    disconnectObserver() {
      if (this.observer) {
        this.observer.disconnect()
        this.observer = null
      }
    },
    positionOverlay() {
      const parent = this.$el?.parentElement
      if (!parent) return
      const img = parent.querySelector('.image') || parent.querySelector('img')
      if (!img) return
      const canvas = this.$refs.overlayCanvas
      if (!canvas) return
      const rect = img.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      canvas.width = rect.width
      canvas.height = rect.height
      if (this.showTranslated && this.translatedCanvas) {
        this.drawTranslated(canvas)
      } else {
        this.clearCanvas()
      }
    },
    redrawCanvas() {
      const canvas = this.$refs.overlayCanvas
      if (!canvas) return
      if (this.showTranslated && this.translatedCanvas) {
        this.drawTranslated(canvas)
      } else {
        this.clearCanvas()
      }
    },
    drawTranslated(canvas) {
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
  background rgba(0, 0, 0, 0.4)
  pointer-events auto
  z-index 1

.progress-detail
  color #fff
  font-size 0.26rem
  margin-top 0.2rem

.progress-bar-wrap
  width 60%
  height 0.08rem
  background rgba(255, 255, 255, 0.3)
  border-radius 0.04rem
  margin-top 0.15rem
  overflow hidden

.progress-bar-fill
  height 100%
  background linear-gradient(90deg, #667eea, #764ba2)
  border-radius 0.04rem
  transition width 0.3s ease
</style>