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
    }
  },
  head() {
    return { title: this.$t('Oz0zZHqnxZoCjYysARbO1') }
  },
  created() {
    this.getRankList()
  },
  methods: {
    toggleSlide() {
      this.showImageList = false
      this.forceSlideLayout = !this.forceSlideLayout
      this.$nextTick(() => {
        this.showImageList = true
      })
    },
    getRankList: _.throttle(async function () {
      this.loading = true
      const res = await api.getPopularIllusts(this.curPage)
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
