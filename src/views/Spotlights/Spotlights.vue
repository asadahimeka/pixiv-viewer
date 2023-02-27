<template>
  <div class="illusts">
    <top-bar />
    <h3 class="af_title">{{ $t('sp.title') }}</h3>
    <template v-if="rankList.length && recomList.length">
      <masonry v-bind="recomMasonryProps">
        <SpotlightsRecom :title="$t('sp.rank')" icon="spec_rank" :list="rankList" />
        <SpotlightsRecom :title="$t('sp.recomm_4u')" icon="rec_heart" :list="recomList" />
      </masonry>
    </template>
    <van-cell v-if="artList.length" class="overview" :border="false">
      <template #title>
        <Icon class="icon" name="spec_list" />
        <span class="title">{{ $t('sp.all') }}</span>
      </template>
    </van-cell>
    <van-list
      v-model="loading"
      :loading-text="$t('tips.loading')"
      :finished="finished"
      :finished-text="$t('tips.no_more')"
      :error.sync="error"
      :immediate-check="false"
      :offset="800"
      :error-text="$t('tips.net_err')"
      @load="getArtList"
    >
      <masonry v-bind="masonryProps">
        <SpCard v-for="art in artList" :key="art.id" :artwork="art" @click.native="toArtwork(art.id)" />
      </masonry>
    </van-list>
    <van-loading v-show="loading" class="loading" :size="'50px'" />
    <van-empty v-if="!loading && !artList.length" :description="$t('tips.no_data')" />
  </div>
</template>

<script>
import TopBar from '@/components/TopBar'
import SpCard from '@/components/SpCard.vue'
import api from '@/api'
import _ from 'lodash'
import SpotlightsRecom from './SpotlightsRecom.vue'

export default {
  name: 'Spotlights',
  components: {
    TopBar,
    SpCard,
    SpotlightsRecom,
  },
  beforeRouteEnter(to, from, next) {
    next(vm => {
      vm.notFromDetail = from.name !== 'Spotlight'
    })
  },
  data() {
    return {
      curPage: 1,
      error: false,
      loading: false,
      finished: false,
      artList: [],
      rankList: [],
      recomList: [],
      notFromDetail: true,
      recomMasonryProps: {
        gutter: '8px',
        cols: {
          700: 1,
          default: 2,
        },
      },
      masonryProps: {
        gutter: '8px',
        cols: {
          700: 1,
          1000: 2,
          default: 3,
        },
      },
    }
  },
  activated() {
    this.init()
  },
  methods: {
    toArtwork(id) {
      this.$router.push({
        name: 'Spotlight',
        params: { id },
      })
    },
    getArtList: _.throttle(async function () {
      this.loading = true
      const res = await api.getSpotlights(this.curPage == 1 ? undefined : this.curPage)
      if (res.status === 0) {
        this.artList = _.uniqBy([
          ...this.artList,
          ...res.data.articles,
        ], 'id')
        if (this.curPage == 1) {
          this.rankList = res.data.rank
          this.recomList = res.data.recommend
        }
        this.loading = false
        this.curPage++
        if (this.curPage > 5) this.finished = true
      } else {
        this.$toast({
          message: res.msg,
          icon: require('@/icons/error.svg'),
        })
        this.loading = false
        this.error = true
      }
    }, 1500),
    init() {
      const { list } = this.$route.params
      if (list) {
        this.artList = list.articles
        this.rankList = list.rank
        this.recomList = list.recommend
        this.curPage++
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
  margin-bottom 60px
  text-align center
  font-size 28px

  .clear-ih
    position absolute
    top -10px
    right 20px

    ::v-deep .svg-icon
      font-size 0.6rem !important

.overview
  margin-bottom 10px
  .title
    font-size 26px
  .svg-icon
    margin-right 8px
    font-size 38px

.illusts
  position relative
  padding 0 20px 40px

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
