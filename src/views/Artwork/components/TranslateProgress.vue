<template>
  <div
    class="translate-progress"
    :class="{
      'translate-progress--inline': inline,
      'translate-progress--dismissed': dismissed
    }"
  >
    <!-- Overall Progress Bar -->
    <div class="translate-progress__bar">
      <van-progress
        :percentage="overallPercent"
        :stroke-width="inline ? 4 : 6"
        :pivot-text="inline ? '' : overallPercent + '%'"
        :color="'var(--accent-color)'"
      />
    </div>

    <!-- Stage List (panel mode only) -->
    <div v-if="!inline" class="translate-progress__stages">
      <div
        v-for="(stageDef, index) in stageDefs"
        :key="stageDef.key"
        class="translate-progress__stage"
        :class="getStageClass(stageDef.key)"
        :style="{ transitionDelay: index * 0.04 + 's' }"
      >
        <!-- Status Icon -->
        <div class="translate-progress__stage-icon">
          <template v-if="getStageStatus(stageDef.key) === 'done'">
            <van-icon name="success" class="status-done" />
          </template>
          <template v-else-if="getStageStatus(stageDef.key) === 'error'">
            <van-icon name="fail" class="status-error" />
          </template>
          <template v-else-if="getStageStatus(stageDef.key) === 'running'">
            <div class="status-pulse" />
          </template>
          <template v-else>
            <div class="status-pending" />
          </template>
        </div>

        <!-- Stage Connector Line -->
        <div v-if="index < stageDefs.length - 1" class="translate-progress__stage-line" />

        <!-- Label -->
        <span class="translate-progress__stage-label">{{ stageDef.label }}</span>

        <!-- Duration (for completed stages) -->
        <span v-if="getStageStatus(stageDef.key) === 'done'" class="translate-progress__stage-duration">
          {{ getStageDuration(stageDef.key) }}ms
        </span>

        <!-- Error message -->
        <span v-if="getStageStatus(stageDef.key) === 'error'" class="translate-progress__stage-error">
          {{ getStageError(stageDef.key) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script>
import { Progress, Icon } from 'vant'

export default {
  name: 'TranslateProgress',
  components: {
    VanProgress: Progress,
    VanIcon: Icon,
  },
  props: {
    stages: {
      type: Array,
      default: () => [],
    },
    inline: {
      type: Boolean,
      default: false,
    },
    dismissed: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      stageDefs: [
        { key: 'load-image', label: '加载图片' },
        { key: 'detect', label: '文本检测' },
        { key: 'ocr', label: '文字识别' },
        { key: 'translate', label: '翻译中' },
        { key: 'inpaint', label: '去字' },
        { key: 'typeset', label: '排版' },
      ],
    }
  },
  computed: {
    overallPercent() {
      if (!this.stages || this.stages.length === 0) return 0
      const total = this.stageDefs.length
      const done = this.stages.filter(s => s.status === 'done' || s.status === 'error').length
      const running = this.stages.filter(s => s.status === 'running').length
      const base = (done / total) * 100
      const bonus = running > 0 ? (1 / total) * 50 : 0
      return Math.min(Math.round(base + bonus), 100)
    },
  },
  methods: {
    getStageStatus(key) {
      const stage = this.stages.find(s => s.stage === key)
      return stage ? stage.status : 'pending'
    },
    getStageDuration(key) {
      const stage = this.stages.find(s => s.stage === key)
      return stage ? stage.durationMs || 0 : 0
    },
    getStageError(key) {
      const stage = this.stages.find(s => s.stage === key)
      return stage ? stage.error || '' : ''
    },
    getStageClass(key) {
      return 'translate-progress__stage--' + this.getStageStatus(key)
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

  &--dismissed
    opacity 0
    transform scale(0.8)
    pointer-events none

  &--inline
    .translate-progress__bar
      padding 0

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

  &__stage
    display grid
    grid-template-columns 0.32rem 1fr auto
    grid-template-rows auto auto
    column-gap 0.1rem
    align-items center
    padding 0.06rem 0.08rem
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
    left 0.15rem
    top 0.32rem
    width 0.02rem
    height 0.32rem
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
