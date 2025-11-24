<template>
  <div class="search-tag-story">
    <TopBar style="background: none;" />
    <iframe v-if="showIFrame && iframeDoc" :srcdoc="iframeDoc" style="width: 100%;height: 100%;border: 0;"></iframe>
    <van-loading v-else :size="'50px'" style="padding: 200px 0;text-align: center" />
  </div>
</template>
<script>
import TopBar from '@/components/TopBar'
import api from '@/api'

export default {
  name: 'TagStory',
  components: {
    TopBar,
  },
  data() {
    return {
      showIFrame: false,
      iframeDoc: '',
    }
  },
  head() {
    return { title: this.$t('lsPtlBf66gm0GWyn_c6pj') }
  },
  activated() {
    this.init()
  },
  deactivated() {
    this.showIFrame = false
    this.iframeDoc = ''
  },
  methods: {
    async init() {
      const { tag, date } = this.$route.params
      if (!tag && !date) return
      localStorage.removeItem('amp-store:about:srcdoc')
      localStorage.removeItem('amp-story-state')
      this.iframeDoc = await api.getTagStoryPage(tag, date)
      this.showIFrame = true
    },
  },
}
</script>
<style lang="stylus" scoped>
.search-tag-story
  width 100%
  height 100vh
  height 100dvh
</style>
<style lang="stylus">
html:has(.search-tag-story)
  overflow hidden
.app-main:has(.search-tag-story)
  padding 0
</style>
