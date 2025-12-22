<template>
  <div
    ref="view"
    class="novel-view"
    :class="{
      censored,
      shrink: isShrink,
      loaded: artwork.images,
      vertical: textConfig.direction == 'v',
      'horizon-cols': textConfig.direction == 'hc'
    }"
    :style="{ backgroundColor: textConfig.bg }"
    @click="handleContClick"
    @wheel="handleWheel"
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
import { imgProxy } from '@/api'
import store, { novelTextConfig } from '@/store'
import _ from '@/lib/lodash'
import { fontFallback } from '@/utils/font'
import { COMMON_PROXY } from '@/consts'

const fontMap = {
  'inherit': 'inherit',
  'sans-serif': 'YuGothic, "Hiragino Kaku Gothic Pro", "Source Han Sans", "Source Han Sans JP", "Noto Sans CJK JP", "Avenir Next", Avenir, "Source Sans", "Noto Sans", Roboto, Verdana, "Pingfang SC", "Hiragino Sans GB", "Lantinghei SC", "Source Han Sans CN", "Noto Sans CJK SC", "Microsoft Yahei", DengXian, "Pingfang TC", "Pingfang HK", "Hiragino Sans CNS", "Lantinghei TC", "Source Han Sans TW", "Source Han Sans HK", "Noto Sans CJK TC", "Microsoft JhengHei", "Apple SD Gothic Neo", "Source Han Sans K", "Source Han Sans KR", "Noto Sans CJK KR", "Malgun Gothic", sans-serif',
  'serif': '"Source Serif Pro", "Source Serif", "Noto Serif", "Times New Roman", "Georgia Pro", Georgia, "Songti SC", "Source Han Serif SC", "Source Han Serif CN", "Noto Serif SC", Simsun, "Yu Mincho", YuMincho, "Hiragino Mincho ProN", "Hiragino Mincho Pro", "Source Han Serif", "Source Han Serif JP", "BIZ UDMincho Medium", "Noto Serif JP", "Songti TC", "Source Han Serif TC", "Source Han Serif TW", "Source Han Serif HK", "Noto Serif TC", PMingLiu, AppleMyungjo, "Source Han Serif K", "Source Han Serif KR", "Noto Serif KR", Batang, serif',
}

let startX = 0
let startY = 0
let endX = 0
let endY = 0

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
      let res = this.textObj.text
      if (!res) return ''
      res = this.textConfig.indent
        ? res.split(/\n/).map(e => `<p${e ? '' : ' style="padding: 1em 0"'}>${e}</p>`).join('')
        : res.replace(/\n/g, '<br>')
      res = res
        .replace(/\[newpage\]/g, '<hr style="margin: 1rem 0;font-weight: bold;font-size: 1.2em;">')
        .replace(/\[\[rb:([^>[\]]+) *> *([^>[\]]+)\]\]/g, '<ruby>$1<rp>(</rp><rt>$2</rt><rp>)</rp></ruby>')
        .replace(/\[\[jumpuri:([^>\s[\]]+) *> *([^>\s[\]]+)\]\]/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
        .replace(/\[pixivimage:([\d-]+)\]/g, '<img style="display:block;max-width:100%;margin:auto" src="https://pximg.cocomi.eu.org/-pid-/$1" alt>')
        .replace(/\[chapter: *([^[\]]+)\]/g, '<h2 style="margin: 1rem 0;font-weight:bold;font-size:1.5em">$1</h2>')
        .replace(/\[uploadedimage:(\d+)\]/g, (_, $1) => `<img style="display:block;max-width:100%;margin:auto" src="${this.getEmbedImg($1)}" alt>`)
        .replace(/若想浏览插图，还请使用网页版。/g, '-- 插图 --')
      return res
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
      if (this.artwork.seasonal_effect) return COMMON_PROXY + this.artwork.seasonal_effect
      const tagNames = this.artwork.tags?.map(t => t.name) || []
      const match = this.$store.state.seasonEffects?.find(e => tagNames.includes(e.tag))
      return match?.src || ''
    },
  },
  methods: {
    getEmbedImg(id) {
      const urls = this.textObj.embedImgs?.[id]?.urls
      return imgProxy(urls?.['1200x1200'] || urls?.original || '')
    },
    handleContClick: _.throttle(function (e) {
      if (this.isShrink) {
        this.$store.commit('setIsNovelViewShrink', false)
      }
      if (this.textConfig.direction == 'hc') {
        const w = this.$refs.view.offsetWidth
        const i = e.clientX > (w / 2) ? 1 : -1
        this.$refs.view.scrollLeft += w * i
      }
    }, 200),
    handleWheel: _.throttle(function (e) {
      if (store.state.isMobile) return
      if (this.textConfig.direction == 'h') return
      e.preventDefault()
      if (this.textConfig.direction == 'hc') {
        this.$refs.view.scrollLeft += this.$refs.view.clientWidth * (e.deltaY > 0 ? 1 : -1)
        return
      }
      this.$refs.view.scrollLeft += e.deltaY
    }, 200),
    handleTouchstart: _.throttle(function (e) {
      if (!store.state.isMobile) return
      const touch = e.touches[0]
      startX = touch.clientX
      startY = touch.clientY
    }, 200),
    handleTouchend: _.throttle(function (e) {
      if (!store.state.isMobile) return
      const touch = e.changedTouches[0]
      endX = touch.clientX
      endY = touch.clientY

      const deltaX = endX - startX
      const deltaY = endY - startY

      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 30) {
        this.$refs.view.scrollLeft += this.$refs.view.clientWidth * (deltaX > 0 ? -1 : 1)
      }
    }, 200),
  },
}
</script>

<style lang="stylus" scoped>
.season-effect
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
  animation-delay: 5s;

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
    @media screen and (max-width: 1200px)
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
    scroll-behavior: smooth
    .novel_text
      padding 0
      box-sizing border-box

  @media screen and (max-width: 1200px)
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
.artwork.novel .ia-cont
  height max-content
  .ia-right
    position: sticky;
    top: 0;
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
