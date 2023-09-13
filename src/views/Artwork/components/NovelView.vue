<template>
  <div
    ref="view"
    class="novel-view"
    :class="{ shrink: isShrink, loaded: artwork.images, censored: isCensored(artwork) }"
    :style="{ backgroundColor: textConfig.bg }"
    @click="showFull"
  >
    <div class="image-box">
      <img v-lazy="getImgUrl" :alt="artwork.title" class="image">
    </div>
    <div
      class="novel_text"
      :class="{ vertical: textConfig.direction=='v' }"
      :style="novelStyle"
      v-html="novelText"
    >
    </div>
    <Icon v-if="isShrink" class="dropdown" name="dropdown" scale="4" />
  </div>
</template>

<script>
import { mapGetters } from 'vuex'

const fontMap = {
  'inherit': '"LXGW WenKai Screen", -apple-system, BlinkMacSystemFont, Segoe UI, PingFang SC, Hiragino Sans GB, Source Han Sans SC, Source Han Sans CN, Microsoft YaHei, Helvetica Neue, Helvetica, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol',
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
    textConfig: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      isShrink: this.textConfig.direction == 'h',
    }
  },
  computed: {
    ...mapGetters(['isCensored']),
    getImgUrl() {
      return this.artwork.images?.[0]?.m || ''
    },
    novelText() {
      return this.textObj.text
        ?.replace(/\n/g, '<br>')
        ?.replace(/\[newpage\]/g, '<hr style="margin: 1rem 0;font-weight: bold;font-size: 1.2em;">')
        ?.replace(/\[\[rb:([^>[\]]+) *> *([^>[\]]+)\]\]/g, '<ruby>$1<rt>$2</rt></ruby>')
        ?.replace(/\[\[jumpuri:([^>\s[\]]+) *> *([^>\s[\]]+)\]\]/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
        ?.replace(/\[pixivimage:([\d-]+)\]/g, '<img style="max-width:100%" src="https://pixiv.re/$1.png" alt>')
        ?.replace(/\[chapter: *([^[\]]+)\]/g, '<h2 style="margin: 1rem 0;font-weight:bold;font-size:1.5em">$1</h3>')
        ?.replace(/若想浏览插图，还请使用网页版。/g, '-- 插图 --')
    },
    novelStyle() {
      return {
        fontSize: this.textConfig.size + 'px',
        lineHeight: this.textConfig.height,
        fontWeight: this.textConfig.weight,
        fontFamily: fontMap[this.textConfig.font],
        color: this.textConfig.color,
      }
    },
  },
  methods: {
    showFull() {
      if (this.isShrink) this.isShrink = false
    },
  },
}
</script>

<style lang="stylus" scoped>
.novel_text
  width 900px
  margin 40px auto
  line-height 2
  white-space pre-wrap
  font-feature-settings: normal;
  overflow-wrap: break-word;
  text-align: justify;
  user-select text !important

  &.vertical
    width 90%
    height 75vh
    padding 10px 20px 40px
    overflow-x: auto;
    writing-mode: vertical-rl;

.novel-view {
  position: relative;
  width 100%
  min-height: 600px;
  margin-top 40px

  &.censored {
    pointer-events: none;
  }

  &.loaded {
    min-height: unset;
  }

  &.shrink {
    max-height: 1000px;
    overflow: hidden;

    &::after {
      content: '';
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
      background: linear-gradient(to top, rgb(255, 255, 255), rgba(#fff, 0));
    }

    .dropdown {
      position: absolute;
      bottom: 26px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 1;
      color: #fafafa;
      filter: drop-shadow(1px 4px 8px rgba(0, 0, 0, 0.2));
      animation: ani-dropdown 2s ease-in-out infinite;
    }

    @keyframes ani-dropdown {
      0%, 100% {
        transform: translate(-50%, 0);
      }

      50% {
        transform: translate(-50%, 6px);
      }
    }
  }

  .image-box {
    position: relative;
    // background: #fafafa;

    &:nth-of-type(n+2) {
      min-height: 600px;
      // max-height: 1000px;
    }

    .image {
      display: block;
      width: 100%;
      height: 100%;
      // min-height: 600px;
      // max-height: 1000px;
      object-fit: cover;

      &[lazy="loading"] {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 120px !important;
        height: 120px !important;
        min-height: auto;
      }
    }
  }

}
</style>
