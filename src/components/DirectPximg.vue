<template>
  <img
    v-if="isDirectPximg"
    :class="{'fadeIn':!loading}"
    :src="directSrc"
    :style="bgStyle"
    :lazy="lazy"
    :alt="alt"
    @load="revokeURL"
  >
  <img
    v-else-if="isImgLazy"
    class="img3"
    loading="lazy"
    :style="bgStyle"
    :lazy="lazy"
    :alt="loading?'':alt"
    @load="loading=false"
  >
  <img
    v-else
    class="img3"
    loading="lazy"
    :src="src"
    :alt="alt"
    :style="bgStyle"
    :lazy="lazy"
    @load="loading=false"
  >
</template>

<script>
import { loadingSvg as loadSvg } from '@/icons'
import { randomBg } from '@/utils'
import store from '@/store'

const loadingSvg = loadSvg(localStorage.PXV_ACT_COLOR || '#38a9f5')
const defSrc = 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=='

const { isImgLazy, isDirectPximg } = store.state.appSetting

export default {
  name: 'DirectPximg',
  props: {
    src: {
      type: String,
      required: true,
    },
    alt: {
      type: String,
      default: '',
    },
    nobg: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      loading: true,
      localSrc: '',
      isImgLazy,
      isDirectPximg,
    }
  },
  computed: {
    lazy() {
      return this.nobg && this.loading ? 'loading' : 'loaded'
    },
    bgStyle() {
      return { background: !this.nobg && this.loading ? randomBg() : 'none' }
    },
    directSrc() {
      return this.loading
        ? (this.nobg ? loadingSvg : defSrc)
        : this.localSrc
    },
  },
  watch: {
    src() {
      if (this.$parent.playUgoira) {
        this.loading = true
      }
      if (this.isDirectPximg || this.isImgLazy) this.setImgSrc()
    },
  },
  mounted() {
    if (this.isDirectPximg || this.isImgLazy) {
      this.$nextTick(() => {
        requestAnimationFrame(() => {
          this.setObserver()
        })
      })
    }
  },
  methods: {
    setObserver() {
      const options = {
        rootMargin: '0px 50px 50px 0px',
        threshold: [0],
      }
      const ob = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting && this.loading) {
          this.setImgSrc()
          ob.disconnect()
        }
      }, options)
      ob.observe(this.$el)
    },
    revokeURL() {
      if (this.localSrc?.startsWith('blob:')) {
        URL.revokeObjectURL(this.localSrc)
      }
    },
    async setImgSrc() {
      try {
        if (this.isImgLazy && !this.isDirectPximg) {
          this.$el.src = this.src
          return
        }
        const url = new URL(this.src)
        if (url.host == 's.pximg.net') {
          this.localSrc = this.src
          this.loading = false
          return
        }
        url.protocol = 'http:'
        url.host = 'i1.pximg.net'
        const { data } = await window.__httpRequest__(url.href, JSON.stringify({
          responseType: 'blobUrl',
          headers: { Host: 'i.pximg.net', Referer: 'https://www.pixiv.net/' },
        }))
        this.localSrc = data
        this.loading = false
      } catch (error) {
        console.log('error: ', error)
      }
    },
  },
}
</script>
