<template>
  <div
    ref="view"
    class="image-view"
    :class="{
      shrink: isShrink,
      loaded: !!artwork.images,
      overlong,
      censored,
      'horizon-scroll': isHorizonScroll,
    }"
    @click="showFull"
    @wheel="handleWheel"
  >
    <swiper v-if="isImgViewSwiper" ref="mySwiper" :options="swiperOption">
      <swiper-slide v-for="(url, index) in artwork.images" :key="index" class="image-box">
        <Pximg
          :src="getImgUrl(url)"
          :alt="`${artwork.title} - Page ${index + 1}`"
          :style="isLargeWebp && index==0 ? 'view-transition-name: artwork-cover' : ''"
          class="image"
          @click.native.stop="view(index)"
        />
      </swiper-slide>
      <div slot="pagination" class="swiper-pagination"></div>
      <div slot="button-prev" class="swiper-button-prev"></div>
      <div slot="button-next" class="swiper-button-next"></div>
    </swiper>
    <template v-else>
      <div
        v-for="(url, index) in artwork.images"
        :key="index"
        class="image-box"
        :style="index == 0 && artworkRatio > 0.6 ? `--ratio:${artworkRatio}` : ''"
      >
        <!-- <van-button
          v-if="artwork.illust_ai_type != 2 && maybeAiAuthor"
          class="check-ai-btn"
          color="linear-gradient(to right, #ff758c 0%, #ff7eb3 100%)"
          size="mini"
          @click="checkAI(url.l)"
        >
          AI Check
        </van-button> -->
        <Pximg
          v-longpress="isLongpressDL ? e => downloadArtwork(e, index) : () => {}"
          :src="getImgUrl(url)"
          :alt="`${artwork.title} - Page ${index + 1}`"
          :style="isLargeWebp && index==0 ? 'view-transition-name: artwork-cover' : ''"
          class="image"
          nobg
          @click.native.stop="view(index)"
          @contextmenu.native="preventContext"
        />
        <div v-if="seasonEffectSrc" class="season-effect" :style="`--bg:url(${seasonEffectSrc})`"></div>
        <canvas
          v-if="showUgoiraControl"
          id="ugoira"
          ref="ugoira"
          class="ugoira"
          :width="artwork.width"
          :height="artwork.height"
          @click="openDownloadPanel()"
        ></canvas>
      </div>
    </template>
    <Icon v-if="isShrink" class="dropdown" name="dropdown" scale="4" />
    <div v-if="showUgoiraControl" class="ugoira-controls">
      <div v-if="ugoiraPlaying" class="btn-pause" @click="drawCanvas('pause')">
        <Icon class="pause" name="pause" scale="6" />
      </div>
      <div v-else-if="progressShow" class="loading"></div>
      <div v-else class="btn-play" @click="playUgoira()">
        <Icon class="play" name="play" scale="6" />
      </div>
      <div v-if="progressShow" class="progress-bar" :style="{ width: `${progress * 100}%` }">
        <div class="background"></div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import { Dialog, ImagePreview } from 'vant'
import store from '@/store'
import { COMMON_IMAGE_PROXY, ugoiraAvifSrc } from '@/consts'
import { fancyboxShow, downloadFile } from '@/utils'
import { getArtworkFileName } from '@/store/actions/filename'
import { downloadUgoira, loadUgoira } from '@/utils/ugoira'

const { isLongpressDL, imgReso, autoPlayUgoira, isUgoiraAvifSrc } = store.state.appSetting

export default {
  props: {
    artwork: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      isShrink: false,
      ugoira: null,
      ugoiraPlaying: false,
      curIndex: 0,
      progressShow: false,
      progress: 0,
      isLongpressDL,
      isLargeWebp: imgReso == 'Large(WebP)',
      isUgoiraAvifSrc,
      swiperOption: {
        mousewheel: true,
        keyboard: true,
        touchMoveStopPropagation: true,
        pagination: {
          el: '.image-view .swiper-pagination',
          dynamicBullets: true,
          clickable: true,
        },
        navigation: {
          nextEl: '.image-view .swiper-button-next',
          prevEl: '.image-view .swiper-button-prev',
        },
      },
    }
  },
  computed: {
    ...mapGetters(['isCensored']),
    censored() {
      return this.isCensored(this.artwork)
    },
    original() {
      return this.artwork.images.map(url => url.o)
    },
    artworkRatio() {
      return this.artwork.width / this.artwork.height
    },
    seasonEffectSrc() {
      const tagNames = this.artwork.tags?.map(t => t.name) || []
      const match = store.state.seasonEffects?.find(e => tagNames.includes(e.tag))
      if (match?.src) return match.src
      if (this.artwork.seasonal_effect) return COMMON_IMAGE_PROXY + this.artwork.seasonal_effect
      return ''
    },
    showUgoiraControl() {
      return this.artwork.type === 'ugoira' && !isUgoiraAvifSrc
    },
    overlong() {
      return this.artwork?.images?.length > 2 && !this.isHorizonScroll && !this.isImgViewSwiper
    },
    isHorizonScroll() {
      return this.artwork?.images?.length > 1 &&
        !this.showUgoiraControl &&
        store.state.appSetting.imgViewHorizonScroll &&
        !store.state.appSetting.imgViewHorizonSwiper
    },
    isImgViewSwiper() {
      return this.artwork?.images?.length > 1 &&
        !this.showUgoiraControl &&
        store.state.appSetting.imgViewHorizonSwiper &&
        !store.state.appSetting.imgViewHorizonScroll
    },
  },
  watch: {
    artwork(val) {
      if (val.images && val.images.length > 0) {
        this.init()
      }
    },
  },
  mounted() {
    this.init()
  },
  deactivated() {
    this.resetUgoira()
  },
  methods: {
    getImgUrl(urls) {
      if (this.artwork.type == 'ugoira' && isUgoiraAvifSrc) {
        return ugoiraAvifSrc(this.artwork.id)
      }
      const urlMap = {
        'Medium': urls.l,
        'Large(WebP)': urls.l.replace(/\/c\/\d+x\d+(_\d+)?\//g, '/c/1200x1200_90_webp/'),
        'Large': urls.l.replace(/\/c\/\d+x\d+(_\d+)?\//g, '/'),
        'Original': urls.o,
      }
      return urlMap[imgReso] || urls.l
    },
    async view(index) {
      if (this.censored) {
        this.$toast({
          message: this.$t('common.content.hide'),
          icon: require('@/icons/ban-view.svg'),
        })
        return
      }
      if (this.artwork.type == 'ugoira' && isUgoiraAvifSrc) {
        ImagePreview({
          className: 'image-preview',
          images: [ugoiraAvifSrc(this.artwork.id)],
          startPosition: 0,
          closeOnPopstate: true,
          closeable: true,
        })
        return
      }
      if (store.state.appSetting.isUseFancybox) {
        fancyboxShow(this.artwork, index)
      } else {
        ImagePreview({
          className: 'image-preview',
          images: this.original,
          startPosition: index,
          closeOnPopstate: true,
          closeable: true,
        })
      }
    },
    preventContext(/** @type {Event} */ event) {
      if (!this.isLongpressDL) return true
      event.preventDefault()
      event.stopPropagation()
      return false
    },
    async downloadArtwork(/** @type {Event} */ ev, index) {
      console.log('ev: ', ev)
      if (!this.isLongpressDL || this.artwork.type == 'ugoira') {
        return
      }
      ev.preventDefault()
      const src = this.artwork.images[index].o
      const fileName = `${getArtworkFileName(this.artwork, index)}.${src.split('.').pop()}`
      const res = await Dialog.confirm({
        title: this.$t('wuh4SsMnuqgjHpaOVp2rB'),
        message: fileName,
        closeOnPopstate: true,
        lockScroll: false,
        cancelButtonText: this.$t('common.cancel'),
        confirmButtonText: this.$t('common.confirm'),
      }).catch(() => 'cancel')
      if (res != 'confirm') return
      window.umami?.track('download_artwork_longpress')
      await this.$nextTick()
      await downloadFile(src, fileName, { subDir: store.state.appSetting.dlSubDirByAuthor ? this.artwork.author.name : undefined })
    },
    showFull() {
      if (this.isShrink) {
        this.isShrink = false
        this.$nextTick(() => {
          this.$refs.view?.scrollTo({ top: 0 })
        })
      }
    },
    // async checkAI(url) {
    //   const loading = this.$toast.loading({
    //     message: this.$t('tips.loading'),
    //     forbidClick: true,
    //   })
    //   try {
    //     const resp = await fetch(`https://hibiapi.cocomi.eu.org/api/ai-image-detect?url=${url}`)
    //     const json = await resp.json()
    //     loading.clear()
    //     Dialog.alert({
    //       title: this.$t('bJ1fo_0HLdA1bWDIic_CT'),
    //       message: this.$t('fSITk3ygQ7rxjm0lDUoSV', [(json.data.probability * 100).toFixed(1)]),
    //       theme: 'round-button',
    //     })
    //   } catch (err) {
    //     loading.clear()
    //     this.$toast('Error: ' + err.message)
    //   }
    // },
    async playUgoira(action) {
      const dontPlay = action == 'dontPlay'
      if (this.progressShow) return
      if (this.ugoira) {
        !dontPlay && this.drawCanvas('play')
        return
      }
      if (dontPlay) {
        this.$toast.loading({
          message: this.$t('tips.loading'),
          duration: 0,
          forbidClick: true,
        })
      }

      try {
        this.progressShow = true
        const meta = await loadUgoira(this.artwork.id, progress => {
          this.progress = progress.loaded / progress.total
        })
        this.ugoira = meta
        this.progressShow = false
        dontPlay ? this.$toast.clear(true) : this.drawCanvas('play')
      } catch (err) {
        this.progressShow = false
        this.resetUgoira()
        this.$toast({
          message: err.message,
        })
      }
    },
    drawCanvas(action) {
      const ctx = this.$refs.ugoira[0].getContext('2d')
      const { width, height } = this.artwork
      const frames = Object.values(this.ugoira.frames)
      const draw = () => {
        this.curIndex++
        setTimeout(
          () => {
            if (!this.ugoira || !this.ugoiraPlaying) return
            ctx.clearRect(0, 0, width, height)
            ctx.drawImage(frames[this.curIndex - 1].bmp, 0, 0, width, height)
            if (this.curIndex >= frames.length) this.curIndex = 0
            draw()
          },
          this.curIndex === 0 ? 0 : frames[this.curIndex - 1].delay
        )
      }
      if (action === 'play') {
        this.ugoiraPlaying = true
        draw()
      } else if (action === 'pause') {
        this.ugoiraPlaying = false
      }
    },
    async downloadUgoira(type) {
      if (this.progressShow) {
        this.$toast(this.$t('tips.loading'))
        return
      }
      if (isUgoiraAvifSrc) {
        await this.playUgoira('dontPlay')
      }
      const needPlay = !['MP4(Server)', 'AVIF', 'Other'].includes(type)
      if (!this.ugoira && needPlay) {
        this.$toast(this.$t('artwork.download.ugoira.tip'))
        return
      }
      await downloadUgoira(type, this.ugoira, this.artwork, () => this.resetUgoira())
    },
    openDownloadPanel() {
      if (this.progressShow) return
      if (this.ugoira) {
        this.$emit('open-download')
      } else {
        this.playUgoira()
      }
    },
    resetUgoira() {
      this.ugoira = null
      this.ugoiraPlaying = false
      this.curIndex = 0
      this.progress = 0
      this.progressShow = false
    },
    handleWheel(e) {
      if (!this.isHorizonScroll || store.state.isMobile) return
      e.preventDefault()
      e.stopPropagation()
      this.$refs.view.scrollLeft += e.deltaY * 2
    },
    init() {
      if (this.artwork.images && this.artwork.images.length >= 3 && !this.isHorizonScroll && !this.isImgViewSwiper) {
        this.isShrink = true
      } else {
        this.isShrink = false
      }
      if (this.isHorizonScroll && this.$refs.view) {
        this.$refs.view.scrollLeft = 0
      }
      if (this.isImgViewSwiper) {
        this.$refs.mySwiper?.$swiper?.slideTo(0)
      }
      this.resetUgoira()
      this.$nextTick(() => {
        setTimeout(() => {
          if (this.artwork.type == 'ugoira' && autoPlayUgoira && !isUgoiraAvifSrc) {
            this.playUgoira()
          }
        }, 0)
      })
    },
  },
}
</script>

<style lang="stylus" scoped>
.image-view {
  position: relative;
  min-height: 600px;
  // background-color: #fafafa;

  ::v-deep .swiper-container {
    padding-bottom 0.2rem
    .swiper-button-prev, .swiper-button-next {
      background none
    }
    .swiper-pagination-bullets {
      bottom 0
    }
  }

  &.censored {
    pointer-events: none;
  }

  &.loaded {
    width: 100%;
    min-height: unset;
  }

  &.shrink {
    max-height: 1000px;
    overflow: hidden;
    overflow: clip;

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
      transition transform 0.5s
      transform none

      &[lazy="loading"] {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 120px !important;
        height: 120px !important;
        margin-left: -60px !important;
        margin-top: -60px !important;
        min-height: auto;
        transform: scale(0.9);
      }
    }

    .ugoira {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: auto;
      max-width: 100%;
      height: auto;
      max-height 100%
    }

    .check-ai-btn {
      position absolute
      bottom 0.1rem
      right 0.1rem
      font-weight bold
    }
  }

  .ugoira-controls {
    position: absolute;
    bottom: 0;
    width: 100%;

    .btn-play, .btn-pause {
      position: absolute;
      right: 16px;
      bottom: 16px;
      color: rgba(122, 172, 208, 0.9);
    }

    .loading {
      position: absolute;
      right: 16px;
      bottom: 16px;
      width: 6em;
      height: 6em;
      background: rgba(122, 172, 208, 0.45) url('~@/icons/loading.svg');
      background-size: 100%;
      border-radius 50%
    }

    .progress-bar {
      position: absolute;
      bottom: 0;
      width: 0;
      height: 4px;
      overflow: hidden;
      transition: width 0.1s;

      .background {
        position: absolute;
        bottom: 0;
        width: 100%;
        height: 4px;
        background: linear-gradient(to right, #3fffa2 0%, #1a9be0 100%);
      }
    }
  }
}
</style>
<style scoped>
.image-view.loaded .image[lazy="loaded"] + .season-effect {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 99;
  transform: translate(-50%, -50%);
  width: 100%;
  height: 100%;
  pointer-events: none;
  background: var(--bg) no-repeat center center / cover;
}
@media screen and (max-width: 600px) {
  .ia-cont .ia-left .image-view.loaded.overlong:not(.shrink) {
    height: 80vh;
    max-height: 80vh;
    overflow-y: auto;
  }
  .ia-cont .ia-left .image-box:first-child {
    aspect-ratio: var(--ratio);
  }
}
</style>
