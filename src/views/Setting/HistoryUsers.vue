<template>
  <div class="illusts">
    <wf-cont layout="Masonry">
      <div
        v-for="u in artList"
        :key="u.id"
        class="user_info"
        @click="toArtwork(u.id)"
      >
        <img class="user_avatar" :src="u.avatar" alt="">
        <div class="user_name">{{ u.name }}</div>
        <div
          class="cover"
          :class="{ nobg: !u.bgcover }"
          :style="{ background: `url(${u.bgcover || u.avatar}) no-repeat center 0 / cover` }"
        ></div>
      </div>
    </wf-cont>
    <van-empty v-if="!artList.length" :description="$t('tips.no_data')" />
  </div>
</template>

<script>
import { Dialog } from 'vant'
import { getCache, setCache } from '@/utils/storage/siteCache'

export default {
  name: 'SettingHistoryUsers',
  data() {
    return {
      artList: [],
    }
  },
  activated() {
    this.getHistory()
  },
  mounted() {
    this.getHistory()
  },
  methods: {
    toArtwork(id) {
      this.$router.push({
        name: 'Users',
        params: { id },
      })
    },
    async getHistory() {
      const list = await getCache('users.history')
      this.artList = list || []
    },
    clearHistory() {
      Dialog.confirm({
        message: this.$t('history.confirm.u'),
        cancelButtonText: this.$t('common.cancel'),
        confirmButtonText: this.$t('common.confirm'),
      }).then(async () => {
        this.artList = []
        await setCache('users.history', null)
      })
    },
  },
}
</script>

<style lang="stylus" scoped>
.af_title
  position relative
  margin-top 40px
  margin-bottom 60px
  text-align center
  font-size 28px

.illusts
  position relative
  padding 0 20px 40px

  ::v-deep .top-bar-wrap
    width 30%
    padding-top 20px
    background transparent

.illusts
  .user_avatar
    position relative
    z-index 10
    width 72px
    height 72px
    margin-bottom 10px
    border-radius 50%

  .user_name
    position relative
    z-index 10
    margin: 10px 0
    font-size: 30px
    line-height 1.5
    color #fff

  .user_info
    position: relative;
    display: flex;
    align-items: center
    justify-content flex-end
    flex-direction column
    overflow: hidden;
    background: #f5f5f5;
    min-height 240px
    padding: 0.26667rem;
    margin-bottom: 0.2rem;
    border-radius: 0.26667rem;
    border-bottom: 0.01333rem solid #ccc;
    cursor: pointer;
    .cover
      position absolute
      z-index 1
      top 0
      left 0
      width 100%
      height 100%
      filter: blur(1PX)
      &.nobg
        filter: blur(10PX)
    &::before
      position: absolute;
      content: '';
      z-index 5
      bottom: 0;
      width: 100%;
      height: 50%;
      background-image: linear-gradient(0deg, rgba(0,0,0,0.5) 0%, rgba(255,255,255,0) 100%);

</style>
