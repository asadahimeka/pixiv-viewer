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
    <wf-cont v-bind="$store.getters.wfProps">
      <ImageCard
        v-for="art in artList"
        :key="art.id"
        mode="all"
        :artwork="art"
        @click-card="toArtwork($event)"
      />
    </wf-cont>
  </van-list>
</template>

<script>
import { getNewIllusts } from '@/api/user'
import ImageCard from '@/components/ImageCard'
import _ from 'lodash'

export default {
  name: 'LatestAllSite',
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
      lastId: 0,
    }
  },
  methods: {
    getRankList: _.throttle(async function () {
      this.loading = true
      const res = await getNewIllusts(this.curPage, this.lastId)
      if (res.status === 0) {
        this.artList = _.uniqBy([
          ...this.artList,
          ...res.data,
        ], 'id')
        this.lastId = res.data._lastId || 0
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
      this.$store.dispatch('setGalleryList', this.artList)
      this.$router.push({
        name: 'Artwork',
        params: { id },
      })
    },
  },
}
</script>

<style lang="stylus" scoped>
</style>
