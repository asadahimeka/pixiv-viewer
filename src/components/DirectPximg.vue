<template>
  <img v-if="direct" :class="{'fadeIn':!loading}" :src="directSrc" :style="bgStyle" :lazy="lazy" :alt="alt" @load="revokeURL">
  <img v-else-if="isVLazy" v-lazy="src" :alt="alt">
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
      isVLazy: isImgLazy,
      direct: isDirectPximg,
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
      if (!this.isVLazy && this.$parent.playUgoira) {
        this.loading = true
      }
      if (isDirectPximg) this.setImgSrc()
    },
  },
  mounted() {
    if (this.direct) this.setObserver()
  },
  methods: {
    revokeURL() {
      if (this.localSrc?.startsWith('blob:')) {
        URL.revokeObjectURL(this.localSrc)
      }
    },
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
    async setImgSrc() {
      try {
        const url = new URL(this.src)
        if (!window.__httpRequest__ || url.host == 's.pximg.net') {
          this.localSrc = this.src
          this.loading = false
          return
        }
        url.protocol = 'http:'
        url.host = '210.140.139.130'
        const { data } = await window.__httpRequest__(url.href, JSON.stringify({
          responseType: 'blob',
          headers: { Host: 'i.pximg.net', Referer: 'https://www.pixiv.net/' },
        }))
        this.localSrc = URL.createObjectURL(data)
        this.loading = false
      } catch (error) {
        console.log('error: ', error)
      }
    },
  },
}
</script>
