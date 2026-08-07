<template>
  <div v-if="isDev" v-show="visible" class="translate-debug">
    <div class="translate-debug__header">
      <span class="translate-debug__title">🔧 Pipeline Debug</span>
      <van-icon name="cross" class="translate-debug__close" @click="$emit('close')" />
    </div>

    <van-collapse v-model="activeSections" :accordion="false">
      <!-- Model Info -->
      <van-collapse-item title="Model Info" name="model">
        <div class="translate-debug__section">
          <van-icon name="copy" class="translate-debug__copy" @click="copySection('model')" />
          <div class="translate-debug__grid">
            <div v-for="(val, key) in modelInfo" :key="key" class="translate-debug__row">
              <span class="translate-debug__label">{{ key }}</span>
              <span class="translate-debug__value">{{ val }}</span>
            </div>
            <div v-if="Object.keys(modelInfo).length === 0" class="translate-debug__empty">
              No model info available
            </div>
          </div>
        </div>
      </van-collapse-item>

      <!-- Stage Timings -->
      <van-collapse-item title="Stage Timings" name="timings">
        <div class="translate-debug__section">
          <van-icon name="copy" class="translate-debug__copy" @click="copySection('timings')" />
          <div v-if="stageTimings.length > 0" class="translate-debug__table">
            <div class="translate-debug__table-header">
              <span class="translate-debug__table-col--stage">Stage</span>
              <span class="translate-debug__table-col--ms">Duration</span>
            </div>
            <div
              v-for="(timing, idx) in stageTimings"
              :key="idx"
              class="translate-debug__table-row"
            >
              <span class="translate-debug__table-col--stage">{{ timing.stage || timing.label || timing.name }}</span>
              <span class="translate-debug__table-col--ms">{{ timing.durationMs || timing.duration || 0 }}ms</span>
            </div>
            <div class="translate-debug__table-total">
              <span class="translate-debug__table-col--stage">Total</span>
              <span class="translate-debug__table-col--ms">{{ totalDuration }}ms</span>
            </div>
          </div>
          <div v-else class="translate-debug__empty">No timing data available</div>
        </div>
      </van-collapse-item>

      <!-- Detection Results -->
      <van-collapse-item title="Detection Results" name="detection">
        <div class="translate-debug__section">
          <van-icon name="copy" class="translate-debug__copy" @click="copySection('detection')" />
          <div v-if="detectedRegions.length > 0">
            <div
              v-for="(region, idx) in detectedRegions"
              :key="region.id || idx"
              class="translate-debug__region"
            >
              <div class="translate-debug__region-header">
                <span class="translate-debug__region-id">{{ region.id || `#${idx}` }}</span>
                <span class="translate-debug__region-prob">{{ (region.prob * 100).toFixed(1) }}%</span>
                <span class="translate-debug__region-dir">{{ region.direction === 'v' ? 'Vertical' : 'Horizontal' }}</span>
              </div>
              <div class="translate-debug__region-box">
                Box: {{ formatBox(region.box) }}
              </div>
            </div>
          </div>
          <div v-else class="translate-debug__empty">No detection data available</div>
        </div>
      </van-collapse-item>

      <!-- Bubble Detection -->
      <van-collapse-item title="Bubble Detection" name="bubble">
        <div class="translate-debug__section">
          <van-icon name="copy" class="translate-debug__copy" @click="copySection('bubble')" />

          <div v-if="bubbleRuntime" class="translate-debug__grid">
            <div class="translate-debug__row">
              <span class="translate-debug__label">Model</span>
              <span class="translate-debug__value">bubble</span>
            </div>
            <div class="translate-debug__row">
              <span class="translate-debug__label">Enabled</span>
              <span class="translate-debug__value">{{ bubbleRuntime.enabled }}</span>
            </div>
            <div class="translate-debug__row">
              <span class="translate-debug__label">Provider</span>
              <span class="translate-debug__value">{{ bubbleRuntime.provider || bubbleRuntime.engine || '—' }}</span>
            </div>
            <div class="translate-debug__row">
              <span class="translate-debug__label">Detail</span>
              <span class="translate-debug__value">{{ bubbleRuntime.detail || '—' }}</span>
            </div>
          </div>

          <div v-if="bubbleStats" class="translate-debug__grid">
            <div class="translate-debug__row">
              <span class="translate-debug__label">Bubbles</span>
              <span class="translate-debug__value">{{ bubbleStats.bubbleCount }}</span>
            </div>
            <div class="translate-debug__row">
              <span class="translate-debug__label">Regions (in bubble)</span>
              <span class="translate-debug__value">{{ bubbleStats.matchedRegionCount }}</span>
            </div>
            <div class="translate-debug__row">
              <span class="translate-debug__label">Regions (unmatched)</span>
              <span class="translate-debug__value">{{ bubbleStats.unmatchedRegionCount }}</span>
            </div>
          </div>

          <div v-if="bubbles.length > 0">
            <div
              v-for="(bubble, idx) in bubbles"
              :key="idx"
              class="translate-debug__region"
            >
              <div class="translate-debug__region-header">
                <span class="translate-debug__region-id">Bubble #{{ idx }}</span>
                <span class="translate-debug__region-prob">score {{ (bubble.score * 100).toFixed(1) }}%</span>
                <span class="translate-debug__region-dir">{{ bubble.matchedRegionIds.length }} regions</span>
              </div>
              <div class="translate-debug__region-box">Box: {{ formatBox(bubble.box) }}</div>
              <div class="translate-debug__region-box">Mask: {{ bubble.maskDims }}</div>
              <div class="translate-debug__region-text">
                Regions: {{ bubble.matchedRegionIds.join(', ') || '—' }}
              </div>
            </div>
            <div class="translate-debug__note">
              score = mask 不透明度占比（原始 detector score 未包含在 artifacts 中）
            </div>
          </div>

          <div v-if="bubbleOverlayUrl" class="translate-debug__overlay">
            <div class="translate-debug__overlay-actions">
              <label class="translate-debug__overlay-toggle">
                <van-checkbox v-model="showBubbleMasks" @change="updateBubbleOverlay">show masks</van-checkbox>
              </label>
            </div>
            <img :src="bubbleOverlayUrl" class="translate-debug__overlay-img" alt="bubble overlay">
          </div>

          <div
            v-if="!bubbleRuntime && bubbles.length === 0"
            class="translate-debug__empty"
          >
            No bubble data available
          </div>
        </div>
      </van-collapse-item>

      <!-- OCR Results -->
      <van-collapse-item title="OCR Results" name="ocr">
        <div class="translate-debug__section">
          <van-icon name="copy" class="translate-debug__copy" @click="copySection('ocr')" />
          <div v-if="ocrRegions.length > 0">
            <div
              v-for="(region, idx) in ocrRegions"
              :key="region.id || idx"
              class="translate-debug__region"
            >
              <div class="translate-debug__region-header">
                <span class="translate-debug__region-id">{{ region.id || `#${idx}` }}</span>
                <span class="translate-debug__region-prob">{{ (region.prob * 100).toFixed(1) }}%</span>
              </div>
              <div class="translate-debug__region-text">
                {{ region.sourceText || '(empty)' }}
              </div>
            </div>
          </div>
          <div v-else class="translate-debug__empty">No OCR data available</div>
        </div>
      </van-collapse-item>

      <!-- Translation Results -->
      <van-collapse-item title="Translation Results" name="translation">
        <div class="translate-debug__section">
          <van-icon name="copy" class="translate-debug__copy" @click="copySection('translation')" />
          <div v-if="translatedRegions.length > 0">
            <div
              v-for="(region, idx) in translatedRegions"
              :key="region.id || idx"
              class="translate-debug__region"
            >
              <div class="translate-debug__region-header">
                <span class="translate-debug__region-id">{{ region.id || `#${idx}` }}</span>
              </div>
              <div class="translate-debug__region-pair">
                <div class="translate-debug__region-source">
                  <span class="translate-debug__region-label">Source:</span>
                  {{ region.sourceText || '(empty)' }}
                </div>
                <div class="translate-debug__region-target">
                  <span class="translate-debug__region-label">Target:</span>
                  {{ region.translatedText || '(empty)' }}
                </div>
              </div>
            </div>
          </div>
          <div v-else class="translate-debug__empty">No translation data available</div>
        </div>
      </van-collapse-item>

      <!-- Raw Artifacts -->
      <van-collapse-item title="Raw Artifacts" name="raw">
        <div class="translate-debug__section">
          <van-icon name="copy" class="translate-debug__copy" @click="copySection('raw')" />
          <pre class="translate-debug__json">{{ rawArtifactsJSON }}</pre>
        </div>
      </van-collapse-item>
    </van-collapse>
  </div>
</template>

<script>
export default {
  name: 'TranslateDebug',
  props: {
    visible: {
      type: Boolean,
      default: false,
    },
    artifacts: {
      type: Object,
      default: () => null,
    },
    stageTimings: {
      type: Array,
      default: () => [],
    },
    modelInfo: {
      type: Object,
      default: () => ({}),
    },
  },
  data() {
    return {
      activeSections: ['model', 'timings', 'bubble'],
      showBubbleMasks: false,
      bubbleOverlayUrl: '',
    }
  },
  computed: {
    isDev() {
      return process.env.NODE_ENV !== 'production'
    },
    detectedRegions() {
      return this.artifacts?.detectedRegions || []
    },
    ocrRegions() {
      return this.artifacts?.stageRegions?.ocr || []
    },
    translatedRegions() {
      // buildArtifacts() 不返回 translatedRegions；翻译后的文本在 detectedRegions 的 translatedText 字段上
      return (this.artifacts?.detectedRegions || []).filter(r => r.translatedText) || []
    },
    bubbleRuntime() {
      const stages = this.artifacts?.runtimeStages || []
      return stages.find(s => s.model === 'bubble') || null
    },
    bubbleRegions() {
      return this.detectedRegions.filter(r => r.bubbleBox)
    },
    unmatchedBubbleRegions() {
      return this.detectedRegions.filter(r => !r.bubbleBox)
    },
    bubbles() {
      const map = new Map()
      this.bubbleRegions.forEach((region, idx) => {
        const box = region.bubbleBox
        const key = `${box.x},${box.y},${box.width},${box.height}`
        let bubble = map.get(key)
        if (!bubble) {
          bubble = { box, score: 0, maskDims: '', matchedRegionIds: [] }
          map.set(key, bubble)
        }
        bubble.matchedRegionIds.push(region.id || `#${idx}`)
        if (region.bubbleMask) {
          bubble.score = Math.max(bubble.score, this.maskCoverage(region.bubbleMask))
          if (!bubble.maskDims) {
            bubble.maskDims = `${region.bubbleMask.width}x${region.bubbleMask.height}`
          }
        }
      })
      return Array.from(map.values())
    },
    bubbleStats() {
      if (!this.artifacts) return null
      return {
        bubbleCount: this.bubbles.length,
        matchedRegionCount: this.bubbleRegions.length,
        unmatchedRegionCount: this.unmatchedBubbleRegions.length,
      }
    },
    totalDuration() {
      return this.stageTimings.reduce((sum, t) => {
        return sum + (t.durationMs || t.duration || 0)
      }, 0)
    },
    rawArtifactsJSON() {
      if (!this.artifacts) return '{}'
      const sanitized = this.sanitizeArtifacts(this.artifacts)
      return JSON.stringify(sanitized, null, 2)
    },
  },
  watch: {
    visible(val) {
      if (val) this.updateBubbleOverlay()
    },
    artifacts: {
      deep: true,
      handler() {
        this.updateBubbleOverlay()
      },
    },
  },
  mounted() {
    const params = new URLSearchParams(window.location.search)
    if (params.get('translatedebug') === '1') {
      this.$emit('enable')
    }
    this.updateBubbleOverlay()
  },
  methods: {
    formatBox(box) {
      if (!box) return 'N/A'
      return `[x:${box.x}, y:${box.y}, w:${box.width}, h:${box.height}]`
    },
    maskCoverage(mask) {
      if (!mask || !mask.data || !mask.width || !mask.height) return 0
      const total = mask.width * mask.height
      if (total === 0) return 0
      const data = mask.data
      let opaque = 0
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] > 0) opaque += 1
      }
      return opaque / total
    },
    async buildBubbleOverlay() {
      const artifacts = this.artifacts
      if (!artifacts) {
        this.bubbleOverlayUrl = ''
        return
      }
      if (this.detectedRegions.length === 0 && this.bubbles.length === 0) {
        this.bubbleOverlayUrl = ''
        return
      }

      const { browserPlatform } = await import('@/utils/translate/shinobu/runtime/browserPlatform')

      // Base: pipeline's drawRegions output if present, else drawRegions on original
      let base = artifacts.detectionCanvas || artifacts.ocrCanvas
      if (!base) {
        const img = artifacts.original
        if (!img || !img.naturalWidth) {
          this.bubbleOverlayUrl = ''
          return
        }
        const canvas = browserPlatform.createCanvas(img.naturalWidth, img.naturalHeight)
        canvas.getContext('2d')?.drawImage(img, 0, 0)
        const { drawRegions } = await import('@/utils/translate/shinobu/pipeline/visualize')
        base = drawRegions(canvas, this.detectedRegions, '气泡调试', r => r.sourceText, browserPlatform)
      }

      const canvas = browserPlatform.createCanvas(base.width, base.height)
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        this.bubbleOverlayUrl = ''
        return
      }
      ctx.drawImage(base, 0, 0)

      // Bubble boxes (cyan dashed) — visualize.js drawRegions already colors
      // region boxes red when matched to a bubble; the dashed boxes show the
      // actual bubble bounds (which may extend beyond the region box).
      if (this.bubbles.length > 0) {
        ctx.save()
        ctx.strokeStyle = '#00e5ff'
        ctx.lineWidth = 2
        ctx.setLineDash([6, 4])
        for (const bubble of this.bubbles) {
          const { x, y, width, height } = bubble.box
          ctx.strokeRect(x, y, width, height)
        }
        ctx.restore()
      }

      // Bubble mask overlays (translucent green tint)
      if (this.showBubbleMasks) {
        ctx.save()
        ctx.globalAlpha = 0.5
        for (const region of this.bubbleRegions) {
          const mask = region.bubbleMask
          if (!mask) continue
          const maskCanvas = browserPlatform.createCanvas(mask.width, mask.height)
          const maskCtx = maskCanvas.getContext('2d')
          if (!maskCtx) continue
          maskCtx.putImageData(mask, 0, 0)

          const tint = browserPlatform.createCanvas(mask.width, mask.height)
          const tintCtx = tint.getContext('2d')
          if (!tintCtx) continue
          tintCtx.fillStyle = '#39ff14'
          tintCtx.fillRect(0, 0, mask.width, mask.height)
          tintCtx.globalCompositeOperation = 'source-in'
          tintCtx.drawImage(maskCanvas, 0, 0)

          ctx.drawImage(tint, 0, 0, canvas.width, canvas.height)
        }
        ctx.restore()
      }

      this.bubbleOverlayUrl = canvas.toDataURL('image/png')
    },
    updateBubbleOverlay() {
      this.buildBubbleOverlay()
    },
    sanitizeArtifacts(artifacts) {
      if (!artifacts) return {}
      const sanitizeMask = mask => {
        if (!mask) return undefined
        if (mask.data) return `[Mask ${mask.width}x${mask.height}, ${mask.data.length} bytes]`
        return '[Mask]'
      }
      const result = {}
      for (const [key, val] of Object.entries(artifacts)) {
        if (val instanceof HTMLCanvasElement || val instanceof OffscreenCanvas) {
          result[key] = `[Canvas ${val.width}x${val.height}]`
        } else if (val instanceof Uint8Array) {
          result[key] = `[Uint8Array ${val.length} bytes]`
        } else if (val && val.data && typeof val.data.length === 'number') {
          result[key] = sanitizeMask(val)
        } else if (Array.isArray(val)) {
          result[key] = val.map(item => {
            if (typeof item === 'object' && item !== null) {
              const cleaned = { ...item }
              if (cleaned.bubbleMask) cleaned.bubbleMask = sanitizeMask(cleaned.bubbleMask)
              return cleaned
            }
            return item
          })
        } else {
          result[key] = val
        }
      }
      return result
    },
    getSectionData(section) {
      switch (section) {
        case 'model':
          return this.modelInfo
        case 'timings':
          return {
            stages: this.stageTimings,
            totalMs: this.totalDuration,
          }
        case 'detection':
          return this.detectedRegions.map(r => ({
            id: r.id,
            box: r.box,
            prob: r.prob,
            direction: r.direction,
            bubbleBox: r.bubbleBox,
          }))
        case 'bubble':
          return {
            runtime: this.bubbleRuntime,
            stats: this.bubbleStats,
            bubbles: this.bubbles.map(b => ({
              box: b.box,
              score: b.score,
              maskDims: b.maskDims,
              matchedRegionIds: b.matchedRegionIds,
            })),
            unmatchedRegions: this.unmatchedBubbleRegions.map(r => r.id),
          }
        case 'ocr':
          return this.ocrRegions.map(r => ({
            id: r.id,
            prob: r.prob,
            sourceText: r.sourceText,
          }))
        case 'translation':
          return this.translatedRegions.map(r => ({
            id: r.id,
            sourceText: r.sourceText,
            translatedText: r.translatedText,
          }))
        case 'raw':
          return JSON.parse(this.rawArtifactsJSON)
        default:
          return {}
      }
    },
    copySection(section) {
      const data = this.getSectionData(section)
      const text = JSON.stringify(data, null, 2)
      navigator.clipboard.writeText(text).then(() => {
        this.$toast('已复制到剪贴板')
      }).catch(() => {
        this.$toast('复制失败')
      })
    },
  },
}
</script>

<style lang="stylus" scoped>
$bg = rgba(0, 0, 0, 0.92)
$bg-section = rgba(255, 255, 255, 0.04)
$border = rgba(255, 255, 255, 0.1)
$text = #ccc
$text-dim = #888
$text-bright = #eee
$accent = var(--accent-color, #1989fa)
$font-mono = 'SF Mono', 'Fira Code', 'Consolas', monospace

.translate-debug
  position fixed
  top 0
  right 0
  width 4.2rem
  max-width 90vw
  height 100vh
  background $bg
  z-index 9999
  overflow-y auto
  font-size 0.2rem
  color $text
  border-left 1px solid $border
  box-shadow -0.04rem 0 0.2rem rgba(0, 0, 0, 0.5)

  &__header
    display flex
    align-items center
    justify-content space-between
    padding 0.16rem 0.2rem
    border-bottom 1px solid $border
    position sticky
    top 0
    background $bg
    z-index 1

  &__title
    font-size 0.24rem
    font-weight 600
    color $text-bright

  &__close
    font-size 0.32rem
    color $text-dim
    cursor pointer
    padding 0.04rem

    &:active
      opacity 0.6

  // Collapse overrides
  ::v-deep .van-collapse-item
    border-bottom 1px solid $border

    &__title
      background transparent
      color $text-bright
      font-size 0.22rem
      padding 0.12rem 0.16rem

      .van-collapse-item__title-text
        color $text-bright

      .van-icon
        color $text-dim

    &__content
      background $bg-section
      color $text

  &__section
    position relative
    padding 0.08rem 0.12rem

  &__copy
    position absolute
    top 0.04rem
    right 0.04rem
    font-size 0.24rem
    color $accent
    cursor pointer
    padding 0.04rem
    z-index 1

    &:active
      opacity 0.6

  &__empty
    color $text-dim
    font-style italic
    padding 0.08rem 0
    font-size 0.2rem

  // Grid for model info
  &__grid
    display flex
    flex-direction column
    gap 0.04rem

  &__row
    display flex
    justify-content space-between
    align-items center
    padding 0.04rem 0
    border-bottom 1px solid rgba(255, 255, 255, 0.05)

    &:last-child
      border-bottom none

  &__label
    color $text-dim
    font-size 0.2rem
    flex-shrink 0
    margin-right 0.12rem

  &__value
    color $text-bright
    font-size 0.2rem
    text-align right
    word-break break-all

  // Table for timings
  &__table
    display flex
    flex-direction column
    gap 0.02rem

  &__table-header
    display flex
    justify-content space-between
    padding 0.04rem 0
    border-bottom 1px solid $border
    color $text-dim
    font-size 0.18rem
    font-weight 600

  &__table-row
    display flex
    justify-content space-between
    padding 0.04rem 0
    font-size 0.2rem
    font-variant-numeric tabular-nums

    &:hover
      background rgba(255, 255, 255, 0.03)

  &__table-total
    display flex
    justify-content space-between
    padding 0.06rem 0
    border-top 1px solid $border
    font-weight 600
    color $text-bright
    font-size 0.2rem

  &__table-col--stage
    flex 1

  &__table-col--ms
    text-align right
    font-family $font-mono
    min-width 0.8rem

  // Region cards
  &__region
    padding 0.08rem
    margin-bottom 0.06rem
    background rgba(255, 255, 255, 0.03)
    border-radius 0.04rem
    border 1px solid rgba(255, 255, 255, 0.06)

  &__region-header
    display flex
    align-items center
    gap 0.08rem
    margin-bottom 0.04rem

  &__region-id
    font-weight 600
    color $accent
    font-size 0.2rem

  &__region-prob
    font-size 0.18rem
    color $text-dim
    font-family $font-mono

  &__region-dir
    font-size 0.18rem
    color $text-dim

  &__region-box
    font-size 0.18rem
    color $text-dim
    font-family $font-mono

  &__region-text
    font-size 0.2rem
    color $text-bright
    padding 0.04rem 0
    word-break break-all

  &__region-pair
    display flex
    flex-direction column
    gap 0.04rem

  &__region-source
    font-size 0.2rem
    color $text
    word-break break-all

  &__region-target
    font-size 0.2rem
    color $accent
    word-break break-all

  &__region-label
    font-size 0.18rem
    color $text-dim
    margin-right 0.04rem

  // Bubble section extras
  &__note
    font-size 0.16rem
    color $text-dim
    font-style italic
    padding 0.06rem 0

  &__overlay
    margin-top 0.08rem

  &__overlay-actions
    display flex
    align-items center
    margin-bottom 0.04rem

  &__overlay-toggle
    font-size 0.18rem
    color $text-dim
    display flex
    align-items center

    ::v-deep .van-checkbox__label
      color $text-dim
      font-size 0.18rem

  &__overlay-img
    display block
    width 100%
    border 1px solid $border
    border-radius 0.04rem
    background rgba(0, 0, 0, 0.3)

  // JSON viewer
  &__json
    font-family $font-mono
    font-size 0.16rem
    line-height 1.5
    color $text
    white-space pre-wrap
    word-break break-all
    max-height 4rem
    overflow-y auto
    padding 0.08rem
    background rgba(0, 0, 0, 0.3)
    border-radius 0.04rem
    margin 0

// Scrollbar styling
.translate-debug
  &::-webkit-scrollbar
    width 0.04rem

  &::-webkit-scrollbar-track
    background transparent

  &::-webkit-scrollbar-thumb
    background rgba(255, 255, 255, 0.15)
    border-radius 0.02rem
</style>
