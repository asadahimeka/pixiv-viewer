<template>
  <div class="illusts">
    <top-bar />
    <h3 class="af_title">{{ $t('setting.recomm.title') }}</h3>
    <div style="max-width: 10rem;margin: 0 auto;">
      <van-tabs v-model="activeTab" class="h-tabs" animated swipeable color="#F2C358">
        <van-tab :title="$t('setting.recomm.site')" name="site">
          <RecommendLink />
        </van-tab>
        <van-tab :title="$t('setting.recomm.app')" name="app">
          <RecommendApp />
        </van-tab>
        <van-tab :title="$t('setting.recomm.tm')" name="tm">
          <RecommendUserscript />
        </van-tab>
      </van-tabs>
    </div>
  </div>
</template>

<script>
import TopBar from '@/components/TopBar'
import RecommendApp from './RecommendApp.vue'
import RecommendLink from './RecommendLink.vue'
import RecommendUserscript from './RecommendUserscript.vue'

export default {
  name: 'SettingHistory',
  components: {
    TopBar,
    RecommendLink,
    RecommendApp,
    RecommendUserscript,
  },
  data() {
    return {
      activeTab: 'site',
    }
  },
  head() {
    return { title: this.$t('setting.recomm.title') }
  },
  methods: {
    openLink(link) {
      window.umami?.track('open_link', { link: link.replace('https://', '') })
      window.open(link, '_blank', 'noopener')
    },
  },
}
</script>

<style lang="stylus" scoped>
.h-tabs
  ::v-deep .van-tabs__content
    margin-top 10px

.af_title
  position relative
  margin-top 40px
  margin-bottom 40px
  text-align center
  font-size 28px

.illusts
  ::v-deep .top-bar-wrap
    width 10%
    height 1.2rem
    padding-top 20px
    background transparent
</style>
