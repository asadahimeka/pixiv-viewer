<template>
  <div class="HomeRecommIllust illusts">
    <top-bar />
    <h3 class="af_title">
      {{ $t('common.recomm_art') }}
      <div class="clear-ih" @click="toggleSlide">
        <Icon name="swiper-symbol" scale="1.5" />
      </div>
    </h3>
    <ImageList
      v-if="showImageList"
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
import TopBar from '@/components/TopBar'
import ImageList from '@/components/ImageList.vue'
import { SessionStorage } from '@/utils/storage'

export default {
  name: 'RecommendIllust',
  components: {
    TopBar,
    ImageList,
  },
  beforeRouteEnter(to, from, next) {
    next(vm => {
      vm.isFromDetail = ['Artwork', 'Users'].includes(from.name)
    })
  },
  data() {
    return {
      loading: false,
      artList: [],
      isFromDetail: false,
      finished: false,
      nextUrl: null,
      showLoadMoreBtn: window.APP_CONFIG.useLocalAppApi,
      showImageList: true,
      forceSlideLayout: false,
    }
  },
  head() {
    return { title: this.$t('common.recomm_art') }
  },
  activated() {
    this.$nextTick(() => {
      requestAnimationFrame(() => {
        this.init()
      })
    })
  },
  methods: {
    toggleSlide() {
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
    init() {
      if (this.isFromDetail && this.artList.length) return
      this.artList = []
      const list = SessionStorage.get('recommended.illust')
      console.log('list: ', list)
      if (list) {
        this.artList = list
        this.nextUrl = list.nextUrl
      } else {
        this.getArtList()
      }
    },
  },
}
</script>

<style lang="stylus" scoped>
.af_title
  position relative
  margin-top 40px
  margin-bottom 40px
  text-align center
  font-size 28px

  .clear-ih
    position absolute
    top 50%
    right 20px
    transform translateY(-50%)
    cursor pointer

.illusts
  position relative
  padding-bottom 40px

  .loading
    margin-top: 2rem;
    text-align: center;

  ::v-deep .top-bar-wrap
    width 30%
    padding-top 20px
    background transparent

  .card-box
    padding: 0 12px
    display: flex
    flex-direction: row

    .image-card
      max-height: 360px
      margin: 4px 2px

</style>
