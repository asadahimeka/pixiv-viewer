<template>
  <div class="illusts">
    <van-cell class="cell" :border="false">
      <template #title>
        <Icon class="icon" name="rec_heart" />
        <span class="title">{{ $t('sp.recomm_4u') }}</span>
      </template>
      <template #right-icon>
        <span style="cursor:pointer" @click="toggleSlide">
          <Icon class="icon" name="swiper-symbol" />
        </span>
      </template>
    </van-cell>
    <ImageList
      v-if="showImageList"
      vwtf-no-top
      :force-layout="forceSlideLayout ? 'VirtualSlide' : ''"
      :list="artList"
      :loading="loading"
      :finished="finished"
      :on-load-more="loadMore"
    />
    <van-loading v-show="loading" class="loading-fixed" size="50px" />
  </div>
</template>

<script>
import _ from '@/lib/lodash'
import api from '@/api'
import { filterRecommIllust, filterCensoredIllust } from '@/utils/filter'
import { tryURL } from '@/utils'
import ImageList from '@/components/ImageList.vue'

export default {
  name: 'RecommendIllustHome',
  components: {
    ImageList,
  },
  data() {
    return {
      loading: false,
      artList: [],
      finished: false,
      nextUrl: null,
      showLoadMoreBtn: window.APP_CONFIG.useLocalAppApi,
      showImageList: true,
      forceSlideLayout: false,
    }
  },
  created() {
    this.getArtList()
  },
  methods: {
    toggleSlide() {
      window.umami?.track('img_list_toggle_slide')
      this.showImageList = false
      this.forceSlideLayout = !this.forceSlideLayout
      this.$nextTick(() => {
        this.showImageList = true
      })
    },
    async loadMore() {
      console.log('load-more')
      if (!this.showLoadMoreBtn) {
        this.finished = true
        return
      }
      if (this.loading || this.finished) return
      console.log('this.nextUrl: ', this.nextUrl)
      const params = {}
      const u = tryURL(this.nextUrl)
      if (u) {
        u.searchParams.forEach((v, k) => {
          params[k] = v
        })
      }
      this.loading = true
      const res = await api.getRecommendedIllust(JSON.stringify(params))
      if (res.status === 0) {
        if (res.data.length) {
          this.artList = _.uniqBy([
            ...this.artList,
            ...res.data.filter(filterCensoredIllust),
          ], 'id')
          this.nextUrl = res.data.nextUrl
        } else {
          this.finished = true
        }
      } else {
        this.$toast({
          message: res.msg,
        })
      }
      this.loading = false
    },
    async getArtList() {
      if (this.loading || this.finished) return
      this.loading = true
      this.artList = []
      const res = await api.getRecommendedIllust()
      if (res.status === 0) {
        this.artList = res.data.filter(this.showLoadMoreBtn ? filterCensoredIllust : filterRecommIllust)
        this.nextUrl = res.data.nextUrl
      } else {
        this.$toast({
          message: res.msg,
          icon: require('@/icons/error.svg'),
        })
      }
      this.loading = false
    },
  },
}
</script>

<style lang="stylus" scoped>
.illusts
  position relative
  padding: 0 14px 40px

  .loading
    margin-top: 2rem
    text-align: center

</style>
