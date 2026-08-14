<template>
  <div v-show="visible" class="translate-toolbar">
    <!-- Engine Mode Badge -->
    <span
      class="translate-toolbar__engine"
      :class="'translate-toolbar__engine--' + engine"
      :title="engine != 'shinobu' ? '' : (runtimeStatus ? runtimeTooltip: '点击检测运行环境')"
      @click="checkRuntime"
    >
      {{ engineLabel }}
      <!-- Runtime Status Indicator -->
      <span v-if="engine === 'shinobu'" class="runtime-indicator" :title="runtimeTooltip">
        <span class="runtime-dot" :class="runtimeDotClass"></span>
      </span>
    </span>

    <!-- Progress / Status Area -->
    <div v-if="translating" class="translate-toolbar__status">
      <van-loading size="16px" />
      <span class="translate-toolbar__status-text">{{ statusText }}</span>
    </div>

    <!-- Error Badge -->
    <div v-if="errorCount > 0" class="translate-toolbar__error-badge">
      {{ errorCount }}
    </div>

    <!-- Action Buttons -->
    <div class="translate-toolbar__actions">
      <!-- Cancel Translation (shinobu & server: AbortController/fetch signal) -->
      <van-button
        v-if="translating && (engine === 'shinobu' || engine === 'server')"
        plain
        type="danger"
        icon="close"
        @click.stop="$emit('cancel-translate')"
      >
        <span>取消</span>
      </van-button>

      <!-- Toggle Original/Translated -->
      <!-- <van-button
        v-if="engine === 'shinobu'"
        :icon="showTranslated ? 'eye-o' : 'closed-eye'"
        @click.stop="$emit('toggle-view')"
      >
        <span>{{ showTranslated ? '原图' : '译图' }}</span>
      </van-button> -->

      <!-- Settings -->
      <van-button
        icon="setting-o"
        @click.stop="$emit('open-settings')"
      >
        <span>翻译设置</span>
      </van-button>
    </div>
  </div>
</template>

<script>
import { Dialog } from '@/lib/vant-apis'

export default {
  name: 'MangaTranslateToolbar',
  props: {
    visible: { type: Boolean, default: false },
    translating: { type: Boolean, default: false },
    showTranslated: { type: Boolean, default: false },
    statusText: { type: String, default: '' },
    pageCount: { type: Number, default: 0 },
    currentPage: { type: Number, default: 0 },
    errorCount: { type: Number, default: 0 },
    engine: { type: String, default: 'vl-api' },
  },
  data() {
    return {
      runtimeStatus: null,
      runtimeChecking: false,
      runtimeCheckRes: null,
    }
  },
  computed: {
    engineLabel() {
      if (this.engine === 'shinobu') return 'Shinobu'
      if (this.engine === 'server') return 'Server'
      return 'VL'
    },
    runtimeDotClass() {
      if (this.runtimeChecking) return 'checking'
      if (!this.runtimeStatus) return 'unknown'
      if (this.runtimeStatus.webgpu === 'available') return 'webgpu'
      if (this.runtimeStatus.wasm === 'available') return 'wasm'
      return 'unavailable'
    },
    runtimeTooltip() {
      if (this.runtimeChecking) return '检测运行环境中…'
      if (!this.runtimeStatus) return '运行时状态未知'
      const parts = []
      parts.push('引擎: ' + this.engineLabel)
      parts.push('WebGPU: ' + this.runtimeStatus.webgpu)
      parts.push('WASM: ' + this.runtimeStatus.wasm)
      parts.push('WebNN: ' + this.runtimeStatus.webnn)
      parts.push('推荐: ' + this.runtimeStatus.recommended)
      return parts.join(' | ')
    },
  },
  watch: {
    engine() {
      this.runtimeStatus = null
      this.runtimeCheckRes = null
      this.runtimeChecking = false
    },
  },
  methods: {
    async checkRuntime() {
      // ONNX runtime indicator is only meaningful for the shinobu engine.
      // vl-api runs remotely — keep the dot unknown and do not probe.
      if (this.engine !== 'shinobu') {
        this.runtimeStatus = null
        this.runtimeCheckRes = null
        this.runtimeChecking = false
        return
      }
      if (!this.runtimeChecking && this.runtimeCheckRes) {
        Dialog.alert({
          title: '诊断信息',
          width: '9rem',
          message: JSON.stringify(this.runtimeCheckRes, null, 2),
          messageAlign: 'left',
        })
        return
      }
      try {
        this.runtimeChecking = true
        // Re-wired to shinobu runtime self-check (T8): runRuntimeSelfCheck
        const { runRuntimeSelfCheck } = await import('@/utils/translate/shinobu/runtime/selfCheck')
        const report = await runRuntimeSelfCheck()
        const byId = {}
        for (const check of report.checks || []) byId[check.id] = check.status
        this.runtimeCheckRes = report
        this.runtimeStatus = {
          webgpu: byId['webgpu.api'] === 'pass' ? 'available' : 'unavailable',
          wasm: byId['wasm.api'] === 'pass' ? 'available' : 'unavailable',
          webnn: byId['webnn.api'] === 'pass' ? 'available' : 'unavailable',
          recommended: report.summary?.effectiveRuntime || 'wasm',
        }
      } catch (err) {
        console.warn('[TranslateToolbar] Runtime check failed:', err.message)
        this.runtimeStatus = { webgpu: 'error', wasm: 'unknown', webnn: 'unknown', recommended: 'wasm' }
      } finally {
        this.runtimeChecking = false
      }
    },
  },
}
</script>

<style lang="stylus" scoped>
.translate-toolbar
  display flex
  align-items center
  flex-wrap wrap
  gap 0.1rem
  width auto
  margin -0.2rem 0.1rem 0
  padding 0.1rem 0.16rem
  border-radius 0.12rem

  &__status
    display flex
    align-items center
    gap 0.08rem
    color #ccc
    font-size 0.22rem
    white-space nowrap

  &__status-text
    margin-left 0.06rem

  &__engine
    display inline-flex
    justify-content center
    align-items center
    padding 0 0.1rem
    min-width 0.5rem
    height 0.5rem
    border-radius 4PX
    font-size 0.18rem
    font-weight bold
    letter-spacing 0.02rem
    white-space nowrap
    background rgba(255, 255, 255, 0.12)
    color #ccc
    cursor pointer

    &--shinobu
      background rgba(76, 175, 80, 0.2)
      color #4caf50

    &--vl-api
      background rgba(33, 150, 243, 0.2)
      color #2196f3

    &--server
      background rgba(156, 39, 176, 0.2)
      color #9c27b0

  &__actions
    display flex
    align-items center
    gap 0.08rem
    flex-wrap nowrap

    ::v-deep .van-button
      height 0.56rem
      line-height 0.56rem
      font-size 0.22rem
      border-radius 8PX

      .van-icon
        font-size 0.28rem

  &__error-badge
    position absolute
    top -0.06rem
    right -0.06rem
    min-width 0.28rem
    height 0.28rem
    padding 0 0.06rem
    background #ee0a24
    color #fff
    font-size 0.18rem
    font-weight bold
    line-height 0.28rem
    text-align center
    border-radius 0.14rem
    pointer-events none

.runtime-indicator
  display inline-flex
  align-items center
  margin-left 0.08rem
  cursor help

.runtime-dot
  width 6PX
  height 6PX
  border-radius 50%
  display inline-block

  &.webgpu
    background-color #4caf50
    box-shadow 0 0 0.04rem #4caf50

  &.wasm
    background-color #ff9800
    box-shadow 0 0 0.04rem #ff9800

  &.unavailable
    background-color #f44336

  &.checking,
  &.unknown
    background-color #9e9e9e

  &.checking
    animation pulse 1.5s infinite

@keyframes pulse
  0%, 100%
    opacity 1
  50%
    opacity 0.3
</style>
