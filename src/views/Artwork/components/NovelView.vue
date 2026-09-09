<template>
  <div
    ref="view"
    class="novel-view"
    :class="{
      censored,
      shrink: isShrink,
      loaded: artwork.images && novelText,
      vertical: textConfig.direction == 'v',
      'horizon-cols': textConfig.direction == 'hc'
    }"
    :style="{ backgroundColor: textConfig.bg }"
    @click="handleContClick"
    @wheel="handleWheel"
    @scroll.passive="handleScroll"
    @touchstart.passive="handleTouchstart"
    @touchend.passive="handleTouchend"
  >
    <div v-if="seasonEffectSrc" class="season-effect" :style="`--bg:url(${seasonEffectSrc})`"></div>
    <div class="image-box">
      <Pximg :src="getImgUrl" nobg :alt="artwork.title" class="image" />
    </div>
    <div
      class="novel_text"
      :class="{ vertical: textConfig.direction == 'v' }"
      :style="novelStyle"
      v-html="novelText"
    >
    </div>
    <Icon v-show="isShrink" class="dropdown" name="dropdown" scale="4" />
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import store, { novelTextConfig } from '@/store'
import { COMMON_IMAGE_PROXY } from '@/consts'
import { fontFallback } from '@/utils/font'
import { parseNovelTextToHtml } from '@/utils/novel'
import { getCache } from '@/utils/storage/siteCache'

const fontMap = {
  'inherit': 'inherit',
  'sans-serif': 'YuGothic, "Hiragino Kaku Gothic Pro", "Source Han Sans", "Source Han Sans JP", "Noto Sans CJK JP", "Avenir Next", Avenir, "Source Sans", "Noto Sans", Roboto, Verdana, "Pingfang SC", "Hiragino Sans GB", "Lantinghei SC", "Source Han Sans CN", "Noto Sans CJK SC", "Microsoft Yahei", DengXian, "Pingfang TC", "Pingfang HK", "Hiragino Sans CNS", "Lantinghei TC", "Source Han Sans TW", "Source Han Sans HK", "Noto Sans CJK TC", "Microsoft JhengHei", "Apple SD Gothic Neo", "Source Han Sans K", "Source Han Sans KR", "Noto Sans CJK KR", "Malgun Gothic", sans-serif',
  'serif': '"Source Serif Pro", "Source Serif", "Noto Serif", "Times New Roman", "Georgia Pro", Georgia, "Songti SC", "Source Han Serif SC", "Source Han Serif CN", "Noto Serif SC", Simsun, "Yu Mincho", YuMincho, "Hiragino Mincho ProN", "Hiragino Mincho Pro", "Source Han Serif", "Source Han Serif JP", "BIZ UDMincho Medium", "Noto Serif JP", "Songti TC", "Source Han Serif TC", "Source Han Serif TW", "Source Han Serif HK", "Noto Serif TC", PMingLiu, AppleMyungjo, "Source Han Serif K", "Source Han Serif KR", "Noto Serif KR", Batang, serif',
}

export default {
  name: 'NovelView',
  props: {
    artwork: {
      type: Object,
      required: true,
    },
    textObj: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      startX: 0,
      startY: 0,
      endX: 0,
      endY: 0,
    }
  },
  computed: {
    ...mapGetters(['isCensored']),
    textConfig() {
      return novelTextConfig
    },
    isShrink() {
      if (this.textConfig.direction != 'h') return false
      return this.$store.state.isNovelViewShrink
    },
    censored() {
      return this.isCensored(this.artwork)
    },
    getImgUrl() {
      return this.artwork.images?.[0]?.m || ''
    },
    novelText() {
      return parseNovelTextToHtml(this.textObj, this.textConfig)
    },
    novelStyle() {
      return {
        fontSize: this.textConfig.size + 'px',
        lineHeight: this.textConfig.height,
        fontWeight: this.textConfig.weight,
        fontFamily: fontMap[this.textConfig.font] || `'${this.textConfig.font}', ${fontFallback}`,
        color: this.textConfig.color,
        ...(this.textConfig.indent ? { textIndent: '2em' } : {}),
      }
    },
    seasonEffectSrc() {
      if (this.artwork.seasonal_effect) return COMMON_IMAGE_PROXY + this.artwork.seasonal_effect
      const tagNames = this.artwork.tags?.map(t => t.name) || []
      const match = this.$store.state.seasonEffects?.find(e => tagNames.includes(e.tag))
      return match?.src || ''
    },
  },
  watch: {
    'textConfig.direction'(val) {
      if (val == 'hc') {
        this.$nextTick(() => this.syncPageIndex())
      }
    },
  },
  created() {
    this._pageIdx = 0
  },
  activated() {
    console.log('++++++ novel view activated')
    this.$nextTick(() => {
      this.restoreScrollPosition()
    })
  },
  mounted() {
    console.log('++++++ novel view mounted')
    this.$nextTick(() => {
      this.restoreScrollPosition()
    })
    this.initResizeObserver()
  },
  beforeDestroy() {
    if (this._resizeObserver) {
      this._resizeObserver.disconnect()
      this._resizeObserver = null
    }
    clearTimeout(this._resizeTimer)
    clearTimeout(this._scrollSyncTimer)
  },
  methods: {
    async restoreScrollPosition() {
      try {
        if (!this.artwork.id || (this.textConfig.direction == 'h' && this.isShrink)) {
          return
        }
        const position = await getCache(`novel.scroll.${this.artwork.id}`)
        console.log('restoreScrollPosition: ', position)
        if (!position) return
        if (this.textConfig.direction == 'h') {
          document.documentElement.scrollTop = position
        } else if (this.textConfig.direction == 'hc') {
          const m = this.getHcMetrics()
          const pos = Number(position)
          if (m && Number.isFinite(pos)) {
            const left = Math.min(Math.round(Math.min(Math.max(pos, 0), m.maxScroll) / m.w) * m.w, m.maxScroll)
            m.el.scrollTo({ left, behavior: 'auto' })
            this._pageIdx = Math.round(left / m.w)
          }
        } else {
          this.$refs.view.scrollLeft = position
        }
      } finally {
        this._restoreReady = true
      }
    },
    // hc 模式: 列宽即容器内容宽度, 页宽/最大滚动距离/末页索引都由此推导
    getHcMetrics() {
      if (this.textConfig.direction != 'hc') return null
      const el = this.$refs.view
      const w = el && el.clientWidth
      if (!el || !w) return null
      const maxScroll = Math.max(el.scrollWidth - w, 0)
      return { el, w, maxScroll, maxPage: Math.round(maxScroll / w) }
    },
    // 按页码索引绝对定位, 而非 scrollLeft += 相对累加:
    // 平滑滚动动画进行中再次翻页时按页码累加, 落点始终对齐列边界, 不会残留半页偏移
    flipPage(dir) {
      const m = this.getHcMetrics()
      if (!m) return
      this._pageIdx = Math.min(Math.max(this._pageIdx + dir, 0), m.maxPage)
      m.el.scrollTo({ left: Math.min(this._pageIdx * m.w, m.maxScroll), behavior: 'smooth' })
    },
    // 滚动停稳后从实际位置反推页码, 兜底覆盖外部滚动(跳转链接/查找/自由拖动等)
    syncPageIndex() {
      const m = this.getHcMetrics()
      if (!m) return
      this._pageIdx = Math.min(Math.max(Math.round(m.el.scrollLeft / m.w), 0), m.maxPage)
    },
    handleScroll() {
      if (this.textConfig.direction != 'hc') return
      clearTimeout(this._scrollSyncTimer)
      this._scrollSyncTimer = setTimeout(() => this.syncPageIndex(), 150)
    },
    // 容器尺寸变化(旋转屏幕/折叠信息栏/窗口缩放)会使旧偏移脱离列边界, 需按页码重新对齐
    initResizeObserver() {
      if (typeof ResizeObserver === 'undefined' || !this.$refs.view) return
      this._resizeObserver = new ResizeObserver(() => {
        clearTimeout(this._resizeTimer)
        this._resizeTimer = setTimeout(() => {
          const m = this.getHcMetrics()
          if (!m || !this._restoreReady) return
          m.el.scrollTo({ left: Math.min(this._pageIdx * m.w, m.maxScroll), behavior: 'auto' })
        }, 100)
      })
      this._resizeObserver.observe(this.$refs.view)
    },
    handleContClick(e) {
      if (this.isShrink) {
        this.$store.commit('setIsNovelViewShrink', false)
        this.textConfig.direction == 'h' && this.$nextTick(() => {
          getCache(`novel.scroll.${this.artwork.id}`).then(position => {
            if (position) document.documentElement.scrollTop = position
          })
        })
      }
      if (this.textConfig.direction == 'hc') {
        const w = this.$refs.view.clientWidth
        this.flipPage(e.clientX > (w / 2) ? 1 : -1)
      }
    },
    handleWheel(e) {
      if (store.state.isMobile) return
      if (this.textConfig.direction == 'h') return
      e.preventDefault()
      e.stopPropagation()
      if (this.textConfig.direction == 'hc') {
        // 触控板惯性一次手势会触发大量 wheel 事件, 加时间闸保证一次手势只翻一页
        const now = Date.now()
        if (now - (this._lastWheelFlipAt || 0) > 250) {
          this._lastWheelFlipAt = now
          this.flipPage(e.deltaY > 0 ? 1 : -1)
        }
        return
      }
      this.$refs.view.scrollLeft += e.deltaY * 2
    },
    handleTouchstart(e) {
      if (!store.state.isMobile || this.textConfig.direction != 'hc') return
      const touch = e.touches[0]
      this.startX = touch.clientX
      this.startY = touch.clientY
    },
    handleTouchend(e) {
      if (!store.state.isMobile || this.textConfig.direction != 'hc') return
      const touch = e.changedTouches[0]
      this.endX = touch.clientX
      this.endY = touch.clientY

      const deltaX = this.endX - this.startX
      const deltaY = this.endY - this.startY

      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 30) {
        this.flipPage(deltaX > 0 ? -1 : 1)
      }
    },
  },
}
</script>

<style lang="stylus" scoped>
.novel-view.loaded .season-effect
  position: absolute
  top: 0
  left: 0
  z-index: 99
  width: 100%
  height: 100%
  max-height: 90vh
  pointer-events: none
  background: var(--bg) no-repeat center center / cover
  animation: fadeAndShrink 1s ease forwards
  animation-delay: 8s;

@keyframes fadeAndShrink
  0%
    opacity: 1;
    transform: scale(1);
  100%
    opacity: 0;
    transform: scale(0.8);
    height: 0;
    margin: 0;
    padding: 0;
    visibility: hidden;
    overflow: hidden;
    pointer-events: none;

.novel_text
  width 900px
  margin 40px auto
  line-height 2
  white-space pre-wrap
  font-feature-settings: normal;
  overflow-wrap: break-word;
  text-align: justify;
  user-select text !important

  &:not(.vertical)
    padding-bottom 100px

  &.vertical
    width auto
    height 82.5vh
    padding 10px 20px 40px 150px
    @media screen and (max-width: 1120px)
      height auto

.novel-view
  position: relative;
  width 100%
  min-height: 600px;
  padding-top 40px

  &.horizon-cols
    height: 98vh
    overflow: auto
    columns: auto 1
    column-gap: 0
    padding-bottom 40px
    box-sizing border-box
    .novel_text
      padding 0
      box-sizing border-box

  @media screen and (max-width: 1120px)
    border-radius: 0;
    &.horizon-cols
      width 100vw
      height 100vh
      padding 2.1rem 0 1rem
      overflow hidden
      .novel_text
        width 100% !important
        margin 40px 0 0
        padding 0 30PX 0 28PX

  &.censored
    pointer-events: none;

  &.loaded
    min-height: unset;

  &.shrink
    max-height: 1000px;
    overflow: hidden;

    &::after
      content: '';
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
      background: linear-gradient(to top, rgb(255, 255, 255), rgba(#fff, 0));

    .dropdown
      position: absolute;
      bottom: 26px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 1;
      color: #fafafa;
      filter: drop-shadow(1px 4px 8px rgba(0, 0, 0, 0.2));
      animation: ani-dropdown 2s ease-in-out infinite;

    @keyframes ani-dropdown
      0%, 100%
        transform: translate(-50%, 0);
      50%
        transform: translate(-50%, 10PX);

  .image-box
    position: relative;

    &:nth-of-type(n+2)
      min-height: 600px;

    .image
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;

      &[lazy="loading"]
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 120px !important;
        height: 120px !important;
        min-height: auto

</style>
<style lang="stylus">
html:has(.isCollapseMeta .horizon-cols)
  overflow hidden
  overflow clip
.artwork.novel .ia-cont:not(.isSafari)
  .ia-right
    position: sticky;
    top: 0;
.artwork.novel .ia-cont
  height max-content
  .novel_text
    hr[data-index]
      position relative
      &::after
        content: attr(data-index);
        position: absolute
        top: -0.3em
        right: 0
        font-size: 0.9em
        letter-spacing: 3px
        text-transform: uppercase
.artwork.novel .ia-cont.isCollapseMeta
  &:has(.shrink),
  &:has(.vertical)
    height 100vh
  .ia-left
    margin-top 0
    padding-left 0
    padding-right 0
  .novel-view
    border-radius 0
    &.horizon-cols
      width 100vw
      height 100vh
      padding-bottom: 40px
  .novel_text
    height auto
.artwork.novel .ia-cont .ia-left .novel-view.vertical
  position relative
  padding-right 4.5rem
  overflow-x: auto
  writing-mode: vertical-rl
  .image-box
    position absolute
    top 50%
    right 0
    transform translateY(-50%)
    width 4rem !important
    height auto !important
    margin-bottom 0 !important
    padding-right 0.5rem
</style>
