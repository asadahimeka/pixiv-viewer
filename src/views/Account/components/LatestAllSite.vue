<template>
  <div>
    <ImageList
      list-class="artwork-list"
      :list="artList"
      :loading="loading"
      :finished="finished"
      :error="error"
      :on-load-more="getRankList"
    />
    <van-loading v-show="loading" class="loading-fixed" size="50px" />
  </div>
</template>

<script>
import _ from '@/lib/lodash'
import { getNewIllusts } from '@/api/user'
import ImageList from '@/components/ImageList.vue'

export default {
  name: 'LatestAllSite',
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
      lastId: 0,
    }
  },
  created() {
    this.getRankList()
  },
  methods: {
    getRankList: _.throttle(async function () {
      if (this.loading || this.finished) return
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
  },
}
</script>

<style lang="stylus" scoped>
</style>
