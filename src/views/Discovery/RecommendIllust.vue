<template>
  <div class="HomeRecommIllust illusts">
    <top-bar />
    <h3 class="af_title">{{ $t('common.recomm_art') }}</h3>
    <wf-cont>
      <ImageCard v-for="art in artList" :key="art.id" mode="all" :artwork="art" @click-card="toArtwork(art)" />
    </wf-cont>
    <van-loading v-if="!showLoadMoreBtn && loading" class="loading" :size="'50px'" />
    <van-empty v-if="!loading && !artList.length" :description="$t('tips.no_data')" />
    <div v-if="showLoadMoreBtn && !finished" class="flex-c" style="margin: .5rem 0;">
      <van-button
        size="small"
        loading-size="1em"
        :loading-text="$t('tips.loading')"
        :loading="loading"
        @click="loadMore"
      >
        {{ $t('tips.load_more') }}
      </van-button>
    </div>
  </div>
</template>

<script>
import _ from '@/lib/lodash'
import api from '@/api'
import { filterRecommIllust, filterCensoredIllust } from '@/utils/filter'
import { tryURL } from '@/utils'
import TopBar from '@/components/TopBar'
import ImageCard from '@/components/ImageCard'
import { SessionStorage } from '@/utils/storage'

export default {
  name: 'RecommendIllust',
  components: {
    TopBar,
    ImageCard,
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
    }
  },
  head() {
    return { title: this.$t('common.recomm_art') }
  },
  activated() {
    this.init()
  },
  methods: {
    toArtwork(art) {
      this.$store.dispatch('setGalleryList', this.artList)
      this.$router.push({
        name: 'Artwork',
        params: { id: art.id, art },
      })
    },
    async loadMore() {
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
