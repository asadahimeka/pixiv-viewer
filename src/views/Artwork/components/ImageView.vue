<template>
  <div
    ref="view"
    class="image-view"
    :class="{ shrink: isShrink, loaded: artwork.images, censored }"
    @click="showFull"
  >
    <div
      v-for="(url, index) in artwork.images"
      :key="index"
      class="image-box"
      :style="index==0&&artworkRatio>0.6?`--ratio:${artworkRatio}`:''"
    >
      <!-- :style="index === 0 ? { width: `${displayWidth}px`, height: `${displayWidth / (artwork.width / artwork.height)}px` } : null" -->
      <!-- :style="{height: `${(375/artwork.width*artwork.height).toFixed(2)}px`}" -->
      <!-- <van-button
        v-if="artwork.illust_ai_type != 2 && maybeAiAuthor"
        class="check-ai-btn"
        color="linear-gradient(to right, #ff758c 0%, #ff7eb3 100%)"
        size="mini"
        @click="checkAI(url.l)"
      >
        AI Check
      </van-button> -->
      <!-- v-if="lazy" -->
      <Pximg
        v-longpress="isLongpressDL?e => downloadArtwork(e, index):()=>{}"
        :src="getImgUrl(url)"
        :alt="`${artwork.title} - Page ${index + 1}`"
        :style="isLargeWebp && index==0 ? 'view-transition-name: artwork-cover' : ''"
        class="image"
        nobg
        @click.native.stop="view(index)"
        @contextmenu.native="preventContext"
      />
      <div v-if="seasonEffectSrc" class="season-effect" :style="`--bg:url(${seasonEffectSrc})`"></div>
      <!-- <img
        v-else
        :src="getImgUrl(url)"
        :alt="`${artwork.title} - Page ${index + 1}`"
        class="image"
        :style="{ width: displayWidth, height: ((artwork.width / displayWidth) * artwork.height) * (artwork.width / artwork.height) }"
        @click.stop="view(index, isCensored(artwork))"
      > -->
      <canvas
        v-if="artwork.type === 'ugoira'"
        id="ugoira"
        ref="ugoira"
        class="ugoira"
        :width="artwork.width"
        :height="artwork.height"
        @click="openDownloadPanel()"
      ></canvas>
    </div>
    <Icon v-if="isShrink" class="dropdown" name="dropdown" scale="4" />
    <div v-if="artwork.type === 'ugoira'" class="ugoira-controls">
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
import axios from 'axios'
// import JSZip from 'jszip'
// import GIF from 'gif.js'
// import tsWhammy from 'ts-whammy'
// import { encode as encodeMP4 } from 'modern-mp4'
import api from '@/api'
import { BASE_URL } from '@/consts'
import { sleep, fancyboxShow, loadScript, downloadFile } from '@/utils'
import store from '@/store'
import { getArtworkFileName } from '@/store/actions/filename'

const { isLongpressDL, imgReso, autoPlayUgoira } = store.state.appSetting

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
    }
  },
  computed: {
    original() {
      return this.artwork.images.map(url => url.o)
    },
    ...mapGetters(['isCensored']),
    censored() {
      return this.isCensored(this.artwork)
    },
    artworkRatio() {
      return this.artwork.width / this.artwork.height
    },
    seasonEffectSrc() {
      const tagNames = this.artwork.tags?.map(t => t.name) || []
      const match = this.$store.state.seasonEffects?.find(e => tagNames.includes(e.tag))
      return match?.src || ''

      // let src = ''
      // this.artwork.tags?.some(t => {
      //   const act = effects?.find(e => e.tag == t.name)
      //   if (!act) return false
      //   src = act.src
      //   return true
      // })
      // return src
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
      if (this.isShrink) this.isShrink = false
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
    async ugoiraMetadata() {
      const res = await api.ugoiraMetadata(this.artwork.id)
      if (res.status === 0) {
        return Object.freeze(res.data)
      } else {
        this.$toast({
          message: res.msg,
        })
      }
    },
    async playUgoira() {
      if (this.progressShow) return

      if (this.ugoira) {
        this.drawCanvas('play')
        return
      }

      const ugoira = await this.ugoiraMetadata()
      this.ugoira = {
        zip: ugoira.zip,
        frames: ugoira.frames.reduce((res, frame) => {
          res[frame.file] = frame
          return res
        }, {}),
      }

      try {
        this.progressShow = true
        const resp = await axios.get(ugoira.zip, {
          responseType: 'blob',
          timeout: 1000 * 60,
          onDownloadProgress: progress => {
            this.progress = progress.loaded / progress.total
          },
        })
        const { default: JSZip } = await import('jszip')
        const jszip = new JSZip()
        const zip = await jszip.loadAsync(resp.data)
        const files = Object.keys(zip.files)
        await Promise.all(files.map(async name => {
          const blob = await zip.file(name).async('blob')
          const bmp = await createImageBitmap(blob)
          this.ugoira.frames[name].blob = blob
          this.ugoira.frames[name].bmp = bmp
        }))
        console.info('Frames loaded:', `frames ${files.length}`, `size ${resp.data.size}`)
        this.progressShow = false
        this.drawCanvas('play')
      } catch (err) {
        this.resetUgoira()
        this.$toast({
          message: err.message,
        })
      }
    },
    drawCanvas(action) {
      const ctx = this.$refs.ugoira[0].getContext('2d')
      // console.log(ctx);
      const { width, height } = this.artwork

      const frames = Object.values(this.ugoira.frames)

      const draw = () => {
        this.curIndex++
        setTimeout(
          () => {
            if (!this.ugoira || !this.ugoiraPlaying) return

            // const imgUri = URL.createObjectURL(frames[this.curIndex - 1].data);
            // const imgData = new Image();
            // imgData.onload = () => {
            ctx.clearRect(0, 0, width, height)
            ctx.drawImage(frames[this.curIndex - 1].bmp, 0, 0, width, height)

            if (this.curIndex >= frames.length) this.curIndex = 0
            draw()
            // };
            // imgData.src = imgUri;
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
    async downloadZIP() {
      await downloadFile(this.ugoira.zip, `${getArtworkFileName(this.artwork)}.zip`, { subDir: 'ugoira' })
    },
    // ref: https://github.com/xuejianxianzun/PixivBatchDownloader/blob/master/src/ts/ConvertUgoira/ToAPNG.ts
    async downloadAPNG() {
      this.$toast(this.$t('tip.down_wait'))

      if (!window.UPNG) {
        await loadScript(`${BASE_URL}static/js/pako_deflate.min.js`)
        await loadScript(`${BASE_URL}static/js/UPNG.min.js`)
      }

      await sleep(200)

      const { width, height } = this.artwork
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d', { willReadFrequently: true })

      let images = []
      const delays = []
      Object.values(this.ugoira.frames).forEach(frame => {
        ctx.drawImage(frame.bmp, 0, 0)
        images.push(ctx.getImageData(0, 0, width, height).data.buffer)
        delays.push(frame.delay)
      })

      const pngFile = window.UPNG.encode(images, width, height, 0, delays)
      const blob = new Blob([pngFile], { type: 'image/vnd.mozilla.apng' })

      images = null

      await downloadFile(blob, `${getArtworkFileName(this.artwork)}.apng`, { subDir: 'ugoira' })
    },
    async downloadWebM() {
      this.$toast(this.$t('tip.down_wait'))
      await sleep(200)

      const { width, height } = this.artwork

      const cacheCanvas = document.createElement('canvas')
      cacheCanvas.width = width
      cacheCanvas.height = height
      const ctx = cacheCanvas.getContext('2d')

      // const encoder = new global.Whammy.Video()
      // Object.values(this.ugoira.frames).forEach(frame => {
      //   ctx.clearRect(0, 0, width, height)
      //   ctx.drawImage(frame.bmp, 0, 0, width, height)
      //   encoder.add(ctx, frame.delay)
      // })
      // const webm = encoder.compile()

      const images = []
      let duration = 0
      Object.values(this.ugoira.frames).forEach(frame => {
        ctx.clearRect(0, 0, width, height)
        ctx.drawImage(frame.bmp, 0, 0, width, height)
        images.push(ctx.canvas.toDataURL('image/webp'))
        duration += frame.delay
      })

      const { default: tsWhammy } = await import('ts-whammy')
      const webm = tsWhammy.fromImageArrayWithOptions(images, { duration: duration / 1000 })

      await downloadFile(webm, `${getArtworkFileName(this.artwork)}.webm`, { subDir: 'ugoira' })
    },
    async downloadGIF() {
      this.$toast(this.$t('tip.down_wait'))

      let images = Object.values(this.ugoira.frames)
      let offset = 1
      if (images.length >= 100) {
        // 抽帧间隔
        offset = 2
        images = images.filter((_, idx) => idx % offset === 0) // 抽帧
        // .map(frame => URL.createObjectURL(frame.blob));
      }

      const { width, height } = this.artwork

      const cacheCanvas = document.createElement('canvas')
      cacheCanvas.width = width
      cacheCanvas.height = height
      const ctx = cacheCanvas.getContext('2d')

      const { default: GIF } = await import('gif.js')
      const gif = new GIF({
        workers: 10,
        quality: 10,
        width,
        height,
        workerScript: `${BASE_URL}static/js/gif.worker.js`,
      })
      Object.values(images).forEach(frame => {
        ctx.clearRect(0, 0, width, height)
        ctx.drawImage(frame.bmp, 0, 0, width, height)
        gif.addFrame(ctx, { copy: true, delay: frame.delay * offset })
      })
      gif.on('progress', percent => {
        this.$toast(this.$t('tip.down_wait') + ': ' + (percent * 100).toFixed(2) + '%')
      })
      gif.on('finished', async blob => {
        this.$toast.clear(true)
        await downloadFile(blob, `${getArtworkFileName(this.artwork)}.gif`, { subDir: 'ugoira' })
      })
      gif.render()
    },
    // ref: https://github.com/FreeNowOrg/PixivNow/blob/master/src/utils/UgoiraPlayer.ts#L195
    async downloadMP4() {
      this.$toast(this.$t('tip.down_wait'))

      const { width, height } = this.artwork
      let frames = Object.values(this.ugoira.frames).map(frame => ({
        data: frame.bmp,
        duration: frame.delay,
      }))
      this.resetUgoira()
      const { encode } = await import('modern-mp4')
      const videoBitrate = parseInt(store.state.appSetting.ugoiraMp4Bitrate) * 1e6
      const mp4File = await encode({ frames, width, height, audio: false, videoBitrate })
      const blob = new Blob([mp4File], { type: 'video/mp4' })
      frames = null
      await downloadFile(blob, `${getArtworkFileName(this.artwork)}.mp4`, { subDir: 'ugoira' })
    },
    download(type) {
      if (this.progressShow) {
        this.$toast(this.$t('tips.loading'))
        return
      }
      const needPlay = !['MP4(Server)', 'Other'].includes(type)
      if (!this.ugoira && needPlay) {
        this.$toast(this.$t('artwork.download.ugoira.tip'))
        return
      }
      window.umami?.track('download_ugoira', { dl_type: type })
      const actions = {
        'ZIP': () => this.downloadZIP(),
        'GIF': () => this.downloadGIF(),
        'WebM': () => this.downloadWebM(),
        'APNG': () => this.downloadAPNG(),
        'MP4(Browser)': () => this.downloadMP4(),
        'MP4(Server)': () => window.open(`https://ugoira-mp4-dl.cocomi.eu.org/${this.artwork.id}`, '_blank', 'noopener'),
        'Other': () => window.open(`https://ugoira.cocomi.eu.org/?id=${this.artwork.id}`, '_blank', 'noopener'),
      }
      try {
        actions[type]?.()
      } catch (err) {
        window.umami?.track('download_ugoira_err', { error: err.message })
        this.$toast({
          message: this.$t('H_rYWoPA0uI7TU4YCbIz0'),
        })
      }
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
    init() {
      this.resetUgoira()
      this.$nextTick(() => {
        // this.displayWidth = document.getElementById('app').getBoundingClientRect().width
        // this.displayHeight = this.displayWidth / (this.artwork.width / this.artwork.height)
        setTimeout(() => {
          if (this.artwork.images && this.artwork.images.length >= 3) {
            this.isShrink = true
          } else {
            this.isShrink = false
          }

          if (this.artwork.type == 'ugoira' && autoPlayUgoira) {
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
  background: var(--bg) no-repeat center center / contain;
}
@media screen and (max-width: 600px) {
  .ia-cont .ia-left .image-box {
    aspect-ratio: var(--ratio);
  }
}
</style>
