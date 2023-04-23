<template>
  <div class="Following">
    <van-tabs v-if="isLogin" v-model="activeTab" sticky animated swipeable color="#F2C358">
      <van-tab :title="$t('follow.timeline')" name="1">
        <LatestConcerned v-if="activeTab == 1" />
      </van-tab>
      <van-tab :title="$t('follow.fav')" name="2">
        <MyBookmarks v-if="activeTab == 2" />
      </van-tab>
      <van-tab :title="$t('follow.user')" name="3">
        <FollowedUsers v-if="activeTab == 3" />
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
import LatestConcerned from './components/LatestConcerned.vue'
import MyBookmarks from './MyBookmarks.vue'

export default {
  name: 'Following',
  components: { LatestConcerned, FollowedUsers, LatestAllSite, MyBookmarks },
  data() {
    return {
      activeTab: '1',
    }
  },
  computed: {
    ...mapState(['user']),
    isLogin() {
      return !!this.user
    },
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
    justify-content center
    padding-bottom 0
    background: rgba(255,255,255,0.8)
    backdrop-filter: saturate(200%) blur(0.08rem)
  .van-tab
    flex unset
    margin 0 0.1rem
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

</style>
