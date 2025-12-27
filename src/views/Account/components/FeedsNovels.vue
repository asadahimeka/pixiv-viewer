<template>
  <div>
    <van-radio-group
      v-model="restrict"
      direction="horizontal"
      style="margin: 0.2rem 0 0.4rem;justify-content: center;"
      @change="onRestrictChange"
    >
      <van-radio name="all">{{ $t('dR97TVmXFMlpOBpKF2bRL') }}</van-radio>
      <van-radio name="public">{{ $t('tMMgcuNAMSfxgPmaTDPuN') }}</van-radio>
      <van-radio name="private">{{ $t('WUegrN0Qk6zuHdl9EHUa-') }}</van-radio>
    </van-radio-group>
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
  </div>
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
      restrict: 'all',
    }
  },
  methods: {
    onRestrictChange(val) {
      window.umami?.track('feed_novel_restrict', { val })
      this.curPage = 1
      this.artList = []
      this.loading = false
      this.finished = false
      this.getRankList()
    },
    getRankList: _.throttle(async function () {
      this.loading = true
      const res = await localApi.novelFollow(this.curPage, this.restrict)
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
