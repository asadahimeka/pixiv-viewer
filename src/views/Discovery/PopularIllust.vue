<template>
  <div class="HomeRecommIllust illusts">
    <top-bar />
    <div class="af_title">
      <div class="discovery-tabs">
        <div class="com_sel_tab cur">{{ $t('Oz0zZHqnxZoCjYysARbO1') }}</div>
        <div class="com_sel_tab" @click="$router.push('/discovery/pollution')">{{ $t('qLlCQvCG0kXud25b-hKEv') }}</div>
        <div class="com_sel_tab" @click="$router.push('/discovery/anonymous')">{{ $t('common.discovery') }}</div>
      </div>
      <div class="clear-ih" @click="toggleSlide">
        <Icon name="swiper-symbol" scale="1.5" />
      </div>
    </div>
    <div class="discovery_restrict nifs-list-cont">
      <van-radio-group v-model="illustType" direction="horizontal">
        <van-radio name="">{{ $t('common.illust') }}</van-radio>
        <van-radio name="manga">{{ $t('common.manga') }}</van-radio>
        <van-radio name="ugoira">{{ $t('common.ugoira') }}</van-radio>
      </van-radio-group>
      <van-radio-group v-if="isR18On" v-model="restrict" direction="horizontal">
        <van-radio name="safe">{{ $t('q3dZB--IevljTdxWdrQMC') }}</van-radio>
        <van-radio name="r18">R18</van-radio>
      </van-radio-group>
    </div>
    <ImageList
      v-if="showImageList"
      list-class="artwork-list"
      :force-layout="forceSlideLayout ? 'VirtualSlide' : 'Grid'"
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
import { mapGetters } from 'vuex'
import _ from '@/lib/lodash'
import api from '@/api'
import TopBar from '@/components/TopBar'
import ImageList from '@/components/ImageList.vue'

export default {
  name: 'PopularIllust',
  components: {
    TopBar,
    ImageList,
  },
  data() {
    return {
      curPage: 1,
      artList: [],
      error: false,
      loading: false,
      finished: false,
      showImageList: true,
      forceSlideLayout: false,
      restrict: 'safe',
      illustType: '',
    }
  },
  head() {
    return { title: this.$t('Oz0zZHqnxZoCjYysARbO1') }
  },
  computed: {
    ...mapGetters(['isR18On']),
  },
  watch: {
    restrict(val) {
      window.umami?.track('popular_illust_restrict', { val })
      this.curPage = 1
      this.artList = []
      this.finished = false
      this.loading = false
      this.getRankList()
    },
    illustType(val) {
      window.umami?.track('popular_illust_type', { val })
      this.curPage = 1
      this.artList = []
      this.finished = false
      this.loading = false
      this.getRankList()
    },
  },
  created() {
    this.getRankList()
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
    getRankList: _.throttle(async function () {
      this.loading = true
      const res = await api.getPopularIllusts(this.curPage, this.restrict, this.illustType)
      if (res.status === 0) {
        if (res.data.length) {
          this.artList = _.uniqBy([
            ...this.artList,
            ...res.data,
          ], 'id')

          this.curPage++
        } else {
          this.finished = true
        }
        this.loading = false
      } else {
        this.$toast({
          message: res.msg,
        })
        this.loading = false
        this.error = true
      }
    }, 800),
  },
}
</script>

<style lang="stylus" scoped>
.af_title
  position relative
  margin-top 0.3rem
  margin-bottom 40px
  text-align center
  font-size 28px

  .clear-ih
    position absolute
    top 50%
    right 20px
    transform translateY(-50%)
    cursor pointer

.discovery_restrict
  display flex
  justify-content: space-between
  margin: 0.2rem 0 0.4rem
  padding 0 0.5rem

.discovery-tabs
  display flex
  justify-content center
  align-items center
  gap 10px
  width 100%

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

  ::v-deep .bookmark
    display none

</style>
