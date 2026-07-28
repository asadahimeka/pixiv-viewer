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
    <!-- Progress / Status Area -->
    <div v-if="translating" class="translate-toolbar__status">
      <van-loading size="16px" />
      <span class="translate-toolbar__status-text">{{ statusText }}</span>
    </div>

    <!-- Action Buttons -->
    <div class="translate-toolbar__actions">
      <!-- Translate Current Page -->
      <van-button
        v-if="!translating"
        size="small"
        type="primary"
        icon="scan"
        :loading="translating"
        @click.stop="$emit('translate-current')"
      >
        <span v-if="!isCompact">{{ $t('artwork.translate.translatePage') || '翻译当前' }}</span>
      </van-button>

      <!-- Translate All Pages (multi-page only) -->
      <van-button
        v-if="!translating && pageCount > 1"
        size="small"
        plain
        type="primary"
        icon="replay"
        @click.stop="$emit('translate-all')"
      >
        <span v-if="!isCompact">{{ $t('artwork.translate.translateAll') || '全部翻译' }}</span>
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
        <span v-if="!isCompact">{{ $t('common.settings') || '设置' }}</span>
      </van-button>
    </div>

    <!-- Error Badge -->
    <div v-if="errorCount > 0" class="translate-toolbar__error-badge">
      {{ errorCount }}
    </div>
  </div>
</template>

<script>
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
  },
  data() {
    return {
      isHidden: false,
      autoHideTimer: null,
      isDesktop: window.innerWidth >= 1000,
      isCompact: window.innerWidth < 600,
    }
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
  },
  mounted() {
    window.addEventListener('resize', this.onResize)
    this.resetAutoHide()
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.onResize)
    if (this.autoHideTimer) clearTimeout(this.autoHideTimer)
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
</style>
