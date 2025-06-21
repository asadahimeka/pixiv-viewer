<template>
  <van-list
    v-model="loading"
    class="artwork-list"
    :loading-text="$t('tips.loading')"
    :finished="finished"
    :finished-text="$t('tips.no_more')"
    :error.sync="error"
    :offset="800"
    :error-text="$t('tips.net_err')"
    @load="getRankList"
  >
    <wf-cont>
      <ImageCard
        v-for="art in artList"
        :key="art.id"
        :artwork="art"
        :data-last-seen-text="isLastSeen(art.id)?$t('0r7KFznJTs3SQlvp4KQ84'):undefined"
        :class="{'last-seen': isLastSeen(art.id)}"
        mode="all"
        @click-card="toArtwork(art)"
      />
    </wf-cont>
  </van-list>
</template>

<script>
import { localApi } from '@/api'
import { getFollowingIllusts } from '@/api/user'
import ImageCard from '@/components/ImageCard'
import _ from '@/lib/lodash'
import { getCache, setCache } from '@/utils/storage/siteCache'

export default {
  name: 'FeedsIllusts',
  components: {
    ImageCard,
  },
  data() {
    return {
      curPage: 1,
      artList: [],
      error: false,
      loading: false,
      finished: false,
      lastId: null,
    }
  },
  async created() {
    this.lastId = await getCache('feeds.last.seen.id')
  },
  destroyed() {
    setCache('feeds.last.seen.id', this.artList[0]?.id)
  },
  methods: {
    isLastSeen(id) {
      return id != this.artList[0]?.id && id == this.lastId
    },
    getRankList: _.throttle(async function () {
      this.loading = true
      const res = window.APP_CONFIG.useLocalAppApi
        ? await localApi.illustFollow(this.curPage)
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
    toArtwork(art) {
      this.$store.dispatch('setGalleryList', this.artList)
      this.$router.push({
        name: 'Artwork',
        params: { id: art.id, art },
      })
    },
  },
}
</script>

<style lang="stylus" scoped>
.last-seen::after
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
