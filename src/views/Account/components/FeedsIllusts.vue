<template>
  <div>
    <van-radio-group
      v-if="isAppLogin"
      v-model="restrict"
      direction="horizontal"
      style="margin: 0.2rem 0 0.4rem;justify-content: center;"
      @change="onRestrictChange"
    >
      <van-radio name="all">{{ $t('dR97TVmXFMlpOBpKF2bRL') }}</van-radio>
      <van-radio name="public">{{ $t('tMMgcuNAMSfxgPmaTDPuN') }}</van-radio>
      <van-radio name="private">{{ $t('WUegrN0Qk6zuHdl9EHUa-') }}</van-radio>
    </van-radio-group>
    <ImageList
      list-class="artwork-list"
      :list="artList"
      :loading="loading"
      :finished="finished"
      :error="error"
      :on-load-more="getRankList"
      :image-card-props="art => ({
        'data-last-seen-text': isLastSeen(art.id) ? $t('0r7KFznJTs3SQlvp4KQ84') : undefined,
        'class': { 'last-seen': isLastSeen(art.id) }
      })"
    />
    <van-loading v-show="loading" class="loading-fixed" size="50px" />
  </div>
</template>

<script>
import { localApi } from '@/api'
import { getFollowingIllusts } from '@/api/user'
import ImageList from '@/components/ImageList.vue'
import _ from '@/lib/lodash'
import { getCache, setCache } from '@/utils/storage/siteCache'

export default {
  name: 'FeedsIllusts',
  components: {
    ImageList,
  },
  data() {
    return {
      curPage: 1,
      artList: [],
      error: false,
      loading: false,
      finished: false,
      lastId: null,
      isAppLogin: window.APP_CONFIG.useLocalAppApi,
      restrict: 'all',
    }
  },
  async created() {
    this.lastId = await getCache('feeds.last.seen.id')
    this.getRankList()
  },
  beforeDestroy() {
    setCache('feeds.last.seen.id', this.artList[0]?.id)
  },
  methods: {
    isLastSeen(id) {
      return id != this.artList[0]?.id && id == this.lastId
    },
    onRestrictChange() {
      this.curPage = 1
      this.artList = []
      this.loading = false
      this.finished = false
      this.getRankList()
    },
    getRankList: _.throttle(async function () {
      if (this.loading || this.finished) return
      this.loading = true
      const res = this.isAppLogin
        ? await localApi.illustFollow(this.curPage, this.restrict)
        : await getFollowingIllusts(this.curPage)
      if (res.status === 0) {
        this.artList = _.uniqBy([
          ...this.artList,
          ...res.data,
        ], 'id')

        if (this.curPage == 1) {
          setCache('feeds.last.seen.id', this.artList[0]?.id)
        }

        this.loading = false
        this.curPage++
        if (!res.data?.length) this.finished = true
      } else {
        this.$toast({
          message: res.msg,
        })
        this.loading = false
        this.error = true
      }
    }, 1500),
  },
}
</script>

<style lang="stylus">
.image-card.last-seen::after
  content attr(data-last-seen-text)
  position absolute
  top 0
  left 0
  display flex
  justify-content center
  align-items center
  width 100%
  height 100%
  font-size 0.36rem
  background rgba(0,0,0,0.72)
  color white
  pointer-events none
</style>
