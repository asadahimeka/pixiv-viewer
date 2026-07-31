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
      activeSections: ['model', 'timings'],
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
      return this.artifacts?.stageRegions || []
    },
    translatedRegions() {
      return this.artifacts?.translatedRegions || []
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
  mounted() {
    const params = new URLSearchParams(window.location.search)
    if (params.get('translatedebug') === '1') {
      this.$emit('enable')
    }
  },
  methods: {
    formatBox(box) {
      if (!box) return 'N/A'
      return `[x:${box.x}, y:${box.y}, w:${box.width}, h:${box.height}]`
    },
    sanitizeArtifacts(artifacts) {
      if (!artifacts) return {}
      const result = {}
      for (const [key, val] of Object.entries(artifacts)) {
        if (val instanceof HTMLCanvasElement || val instanceof OffscreenCanvas) {
          result[key] = `[Canvas ${val.width}x${val.height}]`
        } else if (val instanceof Uint8Array) {
          result[key] = `[Uint8Array ${val.length} bytes]`
        } else if (Array.isArray(val)) {
          result[key] = val.map(item => {
            if (typeof item === 'object' && item !== null) {
              const cleaned = { ...item }
              if (cleaned.bubbleMask) cleaned.bubbleMask = `[Uint8Array ${cleaned.bubbleMask.length} bytes]`
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
          }))
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
