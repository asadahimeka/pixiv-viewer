<template>
  <div class="image-view">
    <iframe
      v-if="artwork && artwork.html"
      :srcdoc="artwork.html"
      sandbox="allow-scripts"
      style="width: 100%;height: 100%;border: 0;"
    ></iframe>
  </div>
</template>

<script>
export default {
  name: 'CollectionView',
  props: {
    artwork: {
      type: Object,
      required: true,
    },
  },
  activated() {
    window.addEventListener('message', this.onMsg)
  },
  deactivated() {
    window.removeEventListener('message', this.onMsg)
  },
  methods: {
    onMsg(e) {
      if (e.origin !== 'null') return
      const data = e.data
      if (data?.token !== this.artwork._token) return
      if (data.action === 'push') {
        const url = data.payload
        console.log('url: ', url)
        if (typeof url != 'string') return
        if (url.includes('/jump.php?url=')) {
          const jumpLink = new URL(url).searchParams.get('url')
          window.open(jumpLink, '_blank', 'noreferrer')
          return
        }
        if (url.includes(location.origin)) {
          this.$router.push(url.replace(location.origin, ''))
          return
        }
        if (url.includes('https://www.pixiv.net/users/') || url.includes('https://www.pixiv.net/artworks/')) {
          this.$router.push(url.replace('https://www.pixiv.net', ''))
          return
        }
        window.open(url, '_blank', 'noreferrer')
      }
    },
  },
}
</script>

<style lang="stylus" scoped>
.image-view
  width 100%
  height 99vh
  height 99dvh
  @media screen and (max-width: 600px)
    height 91vh
    height 91dvh
</style>
