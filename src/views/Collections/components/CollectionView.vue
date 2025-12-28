<template>
  <div class="image-view">
    <iframe v-if="artwork && artwork.html" :srcdoc="artwork.html"></iframe>
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
      if (e.origin !== location.origin) return
      const data = e.data
      if (!data?.token || data.token !== this.artwork._token) return
      console.log('data: ', data)
      if (data.action === 'push') {
        const url = data.payload
        if (typeof url != 'string') return
        if (url.includes('/jump.php?url=')) {
          const jump = new URL(url).searchParams.get('url')
          window.open(jump, '_blank', 'noreferrer')
          return
        }
        const to = this.$router.resolve(url.replace(location.origin, '').replace('https://www.pixiv.net', ''))
        console.log('to: ', to)
        if (to.route.name == 'NotFound') {
          window.open(url, '_blank', 'noreferrer')
        } else {
          this.$router.push(to.href)
        }
      }
    },
  },
}
</script>

<style lang="stylus" scoped>
.image-view
  width 100%
  max-width 1000PX
  height 97vh
  @media screen and (max-width: 600px)
    height 80vh
  iframe
    width: 100%
    height: 100%
    border: 0
</style>
