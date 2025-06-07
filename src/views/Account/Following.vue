<template>
  <div class="Following">
    <van-tabs v-if="isLogin" v-model="activeTab" :ellipsis="false" swipe-threshold="3" sticky animated color="#F2C358">
      <van-tab :title="$t('follow.timeline')" name="1">
        <FeedsIllusts v-if="activeTab == 1" />
      </van-tab>
      <van-tab v-if="isLocalApi" :title="`${$t('follow.timeline')}(${$t('common.novel')})`" name="5">
        <FeedsNovels v-if="activeTab == 5" />
      </van-tab>
      <van-tab :title="$t('follow.fav')" name="2">
        <MyBookmarks v-if="activeTab == 2" />
      </van-tab>
      <van-tab :title="`${$t('follow.fav')}(${$t('common.novel')})`" name="7">
        <MyBookmarksNovel v-if="activeTab == 7" />
      </van-tab>
      <van-tab :title="$t('follow.user')" name="3">
        <FollowedUsers v-if="activeTab == 3" />
      </van-tab>
      <van-tab :title="$t('iHxoO4eLVL-CHSVMoVynN')" name="6">
        <RecommUser v-if="activeTab == 6" />
      </van-tab>
      <van-tab :title="$t('follow.latest')" name="4">
        <LatestAllSite v-if="activeTab == 4" />
      </van-tab>
    </van-tabs>
    <van-loading v-else size="1rem" style="width: 1rem;margin: 2.5rem auto;" />
  </div>
</template>

<script>
import { mapState } from 'vuex'
import FollowedUsers from './components/FollowedUsers.vue'
import LatestAllSite from './components/LatestAllSite.vue'
import FeedsIllusts from './components/FeedsIllusts.vue'
import FeedsNovels from './components/FeedsNovels.vue'
import MyBookmarks from './MyBookmarks.vue'
import RecommUser from '../Search/components/RecommUser.vue'
import MyBookmarksNovel from './MyBookmarksNovel.vue'

export default {
  name: 'Following',
  components: {
    FeedsIllusts,
    FeedsNovels,
    FollowedUsers,
    LatestAllSite,
    MyBookmarks,
    RecommUser,
    MyBookmarksNovel,
  },
  data() {
    return {
      activeTab: this.$route.params?.tab || '1',
      isLocalApi: window.APP_CONFIG.useLocalAppApi,
    }
  },
  head() {
    return {
      title: this.$t('follow.timeline'),
    }
  },
  computed: {
    ...mapState(['user']),
    isLogin() {
      return !!this.user
    },
  },
  activated() {
    const act = this.$route.params?.tab
    if (act) this.activeTab = act
  },
}
</script>

<style lang="stylus">
.app-main:has(.Following)
  padding-top 0

.Following
  .van-tabs--line .van-tabs__wrap
    height 60px
  .van-tabs__nav
    padding-bottom 0
    background: rgba(255,255,255,0.8)
    backdrop-filter: saturate(200%) blur(10PX)
  .van-tab
    margin 0 0.1rem
    padding 0
  .van-tab__text
    height: 0.8rem;
    padding: 0 0.21333rem;
    line-height: 0.8rem;
    text-align center;
    font-size: 0.37333rem;
    border-radius: 0.13333rem;
    color: #333;
    background: #eee;
    box-sizing: border-box;
    cursor: pointer;
  .van-tab--active .van-tab__text
    cursor: auto
    background: #f2c358
  .van-tabs__line
    display none
  .van-tabs__content
    margin 0.1rem 0 0.6rem

@media screen and (min-width: 769px)
  .Following
    .van-tabs__nav
      justify-content center
    .van-tab
      flex unset
      padding 0 4PX

</style>
