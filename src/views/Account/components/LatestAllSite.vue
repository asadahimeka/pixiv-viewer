<template>
  <div>
    <van-radio-group
      v-model="restrict"
      direction="horizontal"
      style="margin: 0.2rem 0 0.4rem;justify-content: center;"
      @change="onRestrictChange"
    >
      <van-radio name="safe">{{ $t('q3dZB--IevljTdxWdrQMC') }}</van-radio>
      <van-radio name="r18">R18</van-radio>
    </van-radio-group>
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
      restrict: 'safe',
    }
  },
  created() {
    this.getRankList()
  },
  methods: {
    onRestrictChange(val) {
      window.umami?.track('new_illust_restrict', { val })
      this.curPage = 1
      this.lastId = 0
      this.artList = []
      this.loading = false
      this.finished = false
      this.getRankList()
    },
    getRankList: _.throttle(async function () {
      if (this.loading || this.finished) return
      this.loading = true
      const res = await getNewIllusts(this.curPage, this.lastId, this.restrict)
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
