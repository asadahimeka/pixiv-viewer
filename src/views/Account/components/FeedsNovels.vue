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
    <masonry v-bind="$store.getters.novelMyProps">
      <NovelCard
        v-for="art in artList"
        :key="art.id"
        :artwork="art"
        @click-card="toArtwork($event)"
      />
    </masonry>
  </van-list>
</template>

<script>
import { localApi } from '@/api'
import NovelCard from '@/components/NovelCard'
import _ from '@/lib/lodash'

export default {
  name: 'FeedsNovels',
  components: {
    NovelCard,
  },
  data() {
    return {
      curPage: 1,
      artList: [],
      error: false,
      loading: false,
      finished: false,
    }
  },
  methods: {
    getRankList: _.throttle(async function () {
      this.loading = true
      const res = await localApi.novelFollow(this.curPage)
      if (res.status === 0) {
        this.artList = _.uniqBy([
          ...this.artList,
          ...res.data,
        ], 'id')

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
    toArtwork(id) {
      this.$router.push(`/novel/${id}`)
    },
  },
}
</script>

<style lang="stylus" scoped>
</style>
