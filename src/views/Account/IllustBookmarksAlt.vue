<template>
  <div class="my-bookmark-illusts">
    <iframe v-if="showIFrame && iframeSrc" :src="iframeSrc" style="width: 100%;height: 100%;border: 0;"></iframe>
  </div>
</template>
<script>
import { BASE_URL } from '@/consts'
import { localApi } from '@/api'
import { get } from '@/api/http'

export default {
  name: 'IllustBookmarksAlt',
  data() {
    return {
      showIFrame: false,
      iframeSrc: '',
    }
  },
  head() {
    return { title: this.$t('user.fav_title') }
  },
  activated() {
    this.init()
  },
  deactivated() {
    this.showIFrame = false
  },
  methods: {
    async init() {
      if (!window.APP_CONFIG.useLocalAppApi) return
      if (this.iframeSrc) {
        this.showIFrame = true
        return
      }
      const user = await localApi.me().catch(() => null)
      if (!user) return
      const ctx = this
      window.__pxcl = {
        routerPush: to => ctx.$router.push(to),
        routerBack: () => ctx.$router.back(),
        toggleFullscreen: () => {
          if (document.fullscreenElement) {
            document.exitFullscreen()
          } else {
            document.documentElement.requestFullscreen()
          }
        },
        fetchUserBookmarks: maxBookmarkId => get('/favorite', {
          id: user.id,
          max_bookmark_id: maxBookmarkId,
          _t: Date.now(),
        }, {
          headers: { 'cache-control': 'no-cache' },
        }),
      }
      this.iframeSrc = `${BASE_URL}pxcl/index.html?userId=${user.id}`
      this.showIFrame = true
    },
  },
}
</script>
<style lang="stylus" scoped>
.my-bookmark-illusts
  width 100%
  height 99vh
</style>
<style lang="stylus">
.app-main:has(.my-bookmark-illusts)
  padding 0
</style>
