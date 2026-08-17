<template>
  <div class="translate-progress">
    <!-- Overall Progress Bar -->
    <div class="translate-progress__bar">
      <van-progress
        :percentage="overallPercent"
        :stroke-width="6"
        :pivot-text="overallPercent + '%'"
        :color="'var(--accent-color)'"
      />
    </div>

    <!-- Stage List (panel mode only) -->
    <div class="translate-progress__stages">
      <div
        v-for="(stageDef, index) in shinobuStageDefs"
        :key="stageDef.key"
        class="translate-progress__stage"
        :class="getStageClass(stageDef.key)"
        :style="{ transitionDelay: index * 0.04 + 's' }"
      >
        <!-- Status Icon -->
        <div class="translate-progress__stage-icon">
          <template v-if="getShinobuStatus(stageDef.key) === 'done'">
            <van-icon name="success" class="status-done" />
          </template>
          <template v-else-if="getShinobuStatus(stageDef.key) === 'error'">
            <van-icon name="fail" class="status-error" />
          </template>
          <template v-else-if="getShinobuStatus(stageDef.key) === 'running'">
            <div class="status-pulse"></div>
          </template>
          <template v-else>
            <div class="status-pending"></div>
          </template>
        </div>

        <!-- Stage Connector Line -->
        <div v-if="index < shinobuStageDefs.length - 1" class="translate-progress__stage-line"></div>

        <!-- Label -->
        <span class="translate-progress__stage-label">{{ stageDef.label }}</span>

        <!-- Duration (for completed stages) -->
        <span v-if="getShinobuStatus(stageDef.key) === 'done'" class="translate-progress__stage-duration">
          {{ getStageDuration(stageDef.key) }}ms
        </span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'MangaTranslateProgress',
  props: {
    // shinobu mode: single { stage, detail, percent } from cb({stage, detail})
    progress: {
      type: Object,
      default: null,
    },
    // shinobu mode (optional, debug view): array of { stage, label, durationMs }
    stageTimings: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    return {
      // Shinobu 12-stage pipeline stage keys → display labels.
      // Mirrors the report()/stageTimings stage names in shinobu/index.js.
      shinobuStageDefs: [
        { key: 'load', label: '加载图片' },
        { key: 'preload', label: '加载检测模型' },
        { key: 'detect', label: '文本检测' },
        { key: 'bubble', label: '气泡检测' },
        { key: 'ocr', label: '文字识别' },
        { key: 'merge', label: '合并文本行' },
        { key: 'ocr_postfilter', label: '过滤误识别' },
        { key: 'order', label: '文本顺序排序' },
        { key: 'parallel', label: '翻译+去字' },
        { key: 'typeset', label: '排版' },
        { key: 'done', label: '完成' },
      ],
    }
  },
  computed: {
    overallPercent() {
      // cb({stage, detail}) carries no percent — prefer explicit percent
      // (e.g. from T20's starting-state seed), otherwise derive from stage order.
      if (typeof this.progress.percent === 'number') {
        return Math.min(Math.max(Math.round(this.progress.percent), 0), 100)
      }
      const total = this.shinobuStageDefs.length
      const idx = this.shinobuStageDefs.findIndex(s => s.key === this.progress.stage)
      if (this.progress.stage === 'done') return 100
      if (idx < 0) return 0
      const base = (idx / total) * 100
      return Math.min(Math.round(base + (1 / total) * 50), 100)
    },
  },
  methods: {
    // Order position of a shinobu stage (for status derivation).
    shinobuStageIndex(key) {
      return this.shinobuStageDefs.findIndex(s => s.key === key)
    },
    // Derive status from cb() progress stream:
    // stages before current → done, current → running, rest → pending.
    getShinobuStatus(key) {
      const current = this.progress.stage
      if (current === 'done') return 'done'
      const keyIdx = this.shinobuStageIndex(key)
      if (keyIdx < 0) return 'pending'
      const curIdx = this.shinobuStageIndex(current)
      // current stage not in the stream (e.g. 'starting' seed) → nothing started
      if (curIdx < 0) return 'pending'
      if (keyIdx < curIdx) return 'done'
      if (keyIdx === curIdx) return 'running'
      return 'pending'
    },
    getStageDuration(key) {
      const timing = this.stageTimings.find(t => t.stage === key)
      return timing ? timing.durationMs || 0 : 0
    },
    getStageClass(key) {
      return 'translate-progress__stage--' + this.getShinobuStatus(key)
    },
  },
}
</script>

<style lang="stylus" scoped>
$accent = var(--accent-color, #1989fa)
$color-done = #07c160
$color-error = #ee0a24
$color-pending = #999
$color-text = #ccc
$color-text-dark = #999
$bg-dark = rgba(0, 0, 0, 0.85)
$border-radius = 0.08rem

.translate-progress
  font-size 0.22rem
  color $color-text
  transition opacity 0.5s ease, transform 0.5s ease

  &__bar
    padding 0.08rem 0

    ::v-deep .van-progress
      background rgba(255, 255, 255, 0.15)
      border-radius 0.03rem

      .van-progress__pivot
        font-size 0.18rem
        padding 0 0.06rem
        min-width 0.4rem
        text-align center
        background var(--accent-color, #1989fa)
        color #fff
        border-radius 0.03rem

  &__stages
    display flex
    flex-direction column
    gap 0.02rem
    padding 0.04rem 0

  &__timings
    display flex
    flex-direction column
    gap 0.02rem
    padding 0.04rem 0
    margin-top 0.06rem
    border-top 0.01rem solid rgba(255, 255, 255, 0.1)

  &__timings-title
    display flex
    align-items center
    gap 0.06rem
    font-size 0.2rem
    color $color-text-dark
    padding 0.04rem 0.08rem

  &__timing
    display flex
    justify-content space-between
    align-items center
    padding 0.04rem 0.08rem
    font-size 0.2rem
    color $color-text

  &__timing-label
    color $color-text-dark

  &__timing-duration
    font-variant-numeric tabular-nums
    color $color-text

  &__stage
    display grid
    grid-template-columns 0.32rem 1fr auto
    grid-template-rows auto auto
    column-gap 0.1rem
    align-items center
    padding 0.06rem 0.08rem
    position relative
    border-radius $border-radius
    transition background 0.3s ease, opacity 0.3s ease

    &:hover
      background rgba(255, 255, 255, 0.06)

    &--done
      opacity 0.85

    &--error
      .translate-progress__stage-label
        color $color-error

    &--running
      .translate-progress__stage-label
        color var(--accent-color, #1989fa)

  &__stage-icon
    grid-row 1 / 3
    display flex
    align-items center
    justify-content center
    width 0.32rem
    height 0.32rem
    position relative

  // Connector line between stages
  &__stage-line
    position absolute
    left 0.24rem
    top 0.24rem
    width 0.02rem
    height 0.4rem
    background rgba(255, 255, 255, 0.1)
    border-radius 0.01rem
    pointer-events none

  &__stage-label
    grid-column 2
    font-size 0.22rem
    white-space nowrap
    overflow hidden
    text-overflow ellipsis
    transition color 0.3s ease

  &__stage-duration
    grid-column 3
    font-size 0.18rem
    color $color-text-dark
    font-variant-numeric tabular-nums
    white-space nowrap

  &__stage-error
    grid-column 2 / 4
    font-size 0.18rem
    color $color-error
    overflow hidden
    text-overflow ellipsis
    white-space nowrap
    margin-top 0.02rem

// ----- Status Indicators -----
.status-done
  font-size 0.24rem
  color $color-done

.status-error
  font-size 0.24rem
  color $color-error

.status-pulse
  width 0.12rem
  height 0.12rem
  margin-top -0.15rem
  background var(--accent-color, #1989fa)
  border-radius 50%
  animation translate-progress-pulse 1.4s ease-in-out infinite

.status-pending
  width 0.1rem
  height 0.1rem
  background $color-pending
  border-radius 50%
  opacity 0.4

@keyframes translate-progress-pulse
  0%, 100%
    opacity 0.4
    transform scale(0.7)
  50%
    opacity 1
    transform scale(1.15)

// ----- Dark mode overrides -----
.dark .translate-progress
  &__stage--done
    .translate-progress__stage-label
      color $color-done

</style>
