<template>
  <div
    v-show="visible"
    class="translate-toolbar"
    :class="{
      'translate-toolbar--desktop': isDesktop,
      'translate-toolbar--compact': isCompact,
      'translate-toolbar--hidden': isHidden
    }"
    @click="onToolbarClick"
    @touchstart="resetAutoHide"
  >
    <!-- Engine Mode Badge -->
    <span class="translate-toolbar__engine" :class="'translate-toolbar__engine--' + engine">
      {{ engineLabel }}
    </span>

    <!-- Progress / Status Area -->
    <div v-if="translating" class="translate-toolbar__status">
      <van-loading size="16px" />
      <span class="translate-toolbar__status-text">{{ statusText }}</span>
    </div>

    <!-- Result Mode Indicator (canvas vs text overlay) -->
    <div v-else-if="showTranslated" class="translate-toolbar__result">
      <van-icon :name="engine === 'shinobu' ? 'photo' : 'records'" />
      <span>{{ engine === 'shinobu' ? 'Canvas 结果' : '文本覆盖' }}</span>
    </div>

    <!-- Action Buttons -->
    <div class="translate-toolbar__actions">
      <!-- Cancel Translation (shinobu: AbortSignal) -->
      <van-button
        v-if="translating && engine === 'shinobu'"
        size="small"
        plain
        type="danger"
        icon="close"
        @click.stop="$emit('cancel-translate')"
      >
        <span v-if="!isCompact">{{ '取消' }}</span>
      </van-button>

      <!-- Toggle Original/Translated -->
      <van-button
        size="small"
        :icon="showTranslated ? 'eye-o' : 'closed-eye'"
        @click.stop="$emit('toggle-view')"
      >
        <span v-if="!isCompact">{{ showTranslated ? '原图' : '译图' }}</span>
      </van-button>

      <!-- Settings -->
      <van-button
        size="small"
        icon="setting-o"
        @click.stop="$emit('open-settings')"
      >
        <span v-if="!isCompact">{{ '设置' }}</span>
      </van-button>
    </div>

    <!-- Runtime Status Indicator -->
    <span class="runtime-indicator" :title="runtimeTooltip">
      <span class="runtime-dot" :class="runtimeDotClass"></span>
    </span>

    <!-- Error Badge -->
    <div v-if="errorCount > 0" class="translate-toolbar__error-badge">
      {{ errorCount }}
    </div>
  </div>
</template>

<script>
import { runRuntimeSelfCheck } from '@/utils/translate/shinobu/runtime/selfCheck.js'

export default {
  name: 'TranslateToolbar',
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
      isHidden: false,
      autoHideTimer: null,
      isDesktop: window.innerWidth >= 1000,
      isCompact: window.innerWidth < 600,
      runtimeStatus: null,
      runtimeChecking: true,
    }
  },
  computed: {
    engineLabel() {
      return this.engine === 'shinobu' ? 'shinobu' : 'vl-api'
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
      this.checkRuntime()
    },
  },
  mounted() {
    window.addEventListener('resize', this.onResize)
    this.resetAutoHide()
    this.checkRuntime()
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.onResize)
    if (this.autoHideTimer) clearTimeout(this.autoHideTimer)
  },
  methods: {
    resetAutoHide() {
      if (this.isDesktop) return
      if (this.autoHideTimer) clearTimeout(this.autoHideTimer)
      this.isHidden = false
      this.autoHideTimer = setTimeout(() => {
        this.isHidden = true
      }, 5000)
    },
    onToolbarClick() {
      if (this.isHidden) {
        this.isHidden = false
        this.resetAutoHide()
      }
    },
    onResize() {
      this.isDesktop = window.innerWidth >= 1000
      this.isCompact = window.innerWidth < 600
    },
    async checkRuntime() {
      // ONNX runtime indicator is only meaningful for the shinobu engine.
      // vl-api runs remotely — keep the dot unknown and do not probe.
      if (this.engine !== 'shinobu') {
        this.runtimeStatus = null
        this.runtimeChecking = false
        return
      }
      try {
        this.runtimeChecking = true
        // Re-wired to shinobu runtime self-check (T8): runRuntimeSelfCheck
        const report = await runRuntimeSelfCheck()
        const byId = {}
        for (const check of report.checks || []) byId[check.id] = check.status
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
$breakpoint-desktop = 1000px
$breakpoint-compact = 600px

.translate-toolbar
  position fixed
  bottom 0
  left 0
  right 0
  z-index 50
  display flex
  align-items center
  justify-content space-between
  padding 0.1rem 0.16rem
  background rgba(0, 0, 0, 0.85)
  backdrop-filter saturate(200%) blur(10PX)
  transition transform 0.3s cubic-bezier(.25, .8, .5, 1)
  gap 0.1rem

  &--hidden
    transform translateY(100%)

  &--desktop
    bottom 1.2rem
    left 0.2rem
    right auto
    width auto
    border-radius 0.12rem
    box-shadow 0 2PX 12PX rgba(0, 0, 0, 0.3)

  &--compact
    .van-button
      min-width auto
      padding 0 0.12rem

    .van-button__text
      display none

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
    align-items center
    padding 0 0.1rem
    height 0.32rem
    border-radius 0.16rem
    font-size 0.18rem
    font-weight bold
    letter-spacing 0.02rem
    white-space nowrap
    background rgba(255, 255, 255, 0.12)
    color #ccc

    &--shinobu
      background rgba(76, 175, 80, 0.2)
      color #4caf50

    &--vl-api
      background rgba(33, 150, 243, 0.2)
      color #2196f3

  &__result
    display flex
    align-items center
    gap 0.06rem
    color #8bc34a
    font-size 0.2rem
    white-space nowrap

  &__actions
    display flex
    align-items center
    gap 0.08rem
    flex-wrap nowrap

    ::v-deep .van-button
      height 0.56rem
      line-height 0.56rem
      font-size 0.22rem
      border-radius 0.08rem

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
  width 0.08rem
  height 0.08rem
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
    animation pulse 1.5s infinite

@keyframes pulse
  0%, 100%
    opacity 1
  50%
    opacity 0.3
</style>
