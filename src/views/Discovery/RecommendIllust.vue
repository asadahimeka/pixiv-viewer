<template>
  <div class="HomeRecommIllust illusts">
    <top-bar />
    <h3 class="af_title">{{ $t('common.recomm_art') }}</h3>
    <wf-cont layout="Grid">
      <ImageCard v-for="art in artList" :key="art.id" mode="all" square :artwork="art" @click-card="toArtwork($event)" />
    </wf-cont>
    <van-loading v-show="loading" class="loading" :size="'50px'" />
    <van-empty v-if="!loading && !artList.length" :description="$t('tips.no_data')" />
  </div>
</template>

<script>
import TopBar from '@/components/TopBar'
import ImageCard from '@/components/ImageCard'
import api from '@/api'
import { filterRecommIllust } from '@/utils/filter'
import _ from 'lodash'

export default {
  name: 'RecommendIllust',
  components: {
    TopBar,
    ImageCard,
  },
  beforeRouteEnter(to, from, next) {
    next(vm => {
      vm.notFromDetail = from.name !== 'Artwork'
    })
  },
  data() {
    return {
      loading: false,
      artList: [],
      notFromDetail: true,
    }
  },
  head() {
    return { title: this.$t('common.recomm_art') }
  },
  activated() {
    // document.querySelector('.app-main')?.scrollTo({ top: 0 })
    this.init()
  },
  methods: {
    toArtwork(id) {
      this.$store.dispatch('setGalleryList', this.artList)
      this.$router.push({
        name: 'Artwork',
        params: { id },
      })
    },
    async getArtList() {
      this.loading = true
      this.artList = []
      const res = await api.getRecommendedIllust()
      if (res.status === 0) {
        this.artList = _.shuffle(res.data.filter(filterRecommIllust))
      } else {
        this.$toast({
          message: res.msg,
          icon: require('@/icons/error.svg'),
        })
      }
      this.loading = false
    },
    init() {
      const { list } = this.$route.params
      if (list) {
        this.artList = list
      } else if (this.notFromDetail) {
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
