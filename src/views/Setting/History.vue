<template>
  <div class="illusts">
    <top-bar />
    <h3 class="af_title">
      {{ $t('common.history') }}
      <div class="clear-ih" @click="clearHistory">
        <Icon name="del" scale="2" />
      </div>
    </h3>
    <van-tabs v-model="activeTab" class="h-tabs" sticky animated swipeable color="#F2C358">
      <van-tab :title="$t('common.illust_manga')" name="i">
        <HistoryIllust v-if="activeTab == 'i'" ref="hi" />
      </van-tab>
      <van-tab :title="$t('common.novel')" name="n">
        <HistoryNovel v-if="activeTab == 'n'" ref="hn" />
      </van-tab>
      <van-tab :title="$t('common.user')" name="u">
        <HistoryUsers v-if="activeTab == 'u'" ref="hu" />
      </van-tab>
    </van-tabs>
  </div>
</template>

<script>
import TopBar from '@/components/TopBar'
import HistoryIllust from './HistoryIllust.vue'
import HistoryNovel from './HistoryNovel.vue'
import HistoryUsers from './HistoryUsers.vue'

export default {
  name: 'SettingHistory',
  components: {
    TopBar,
    HistoryIllust,
    HistoryNovel,
    HistoryUsers,
  },
  data() {
    return {
      activeTab: 'i',
    }
  },
  head() {
    return { title: this.$t('common.history') }
  },
  methods: {
    clearHistory() {
      this.$refs[`h${this.activeTab}`]?.clearHistory()
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

  .clear-ih
    position absolute
    top -10px
    right 20px

    ::v-deep .svg-icon
      font-size 0.6rem !important

.illusts
  ::v-deep .top-bar-wrap
    width 10%
    height 1.2rem
    padding-top 20px
    background transparent
</style>
