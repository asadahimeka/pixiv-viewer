<template>
  <div class="HomeRecommIllust illusts">
    <top-bar />
    <h3 class="af_title">
      {{ $t('common.random_view') }}
      <div class="clear-ih" @click="toggleSlide">
        <Icon name="swiper-symbol" scale="1.5" />
      </div>
    </h3>
    <ImageList
      v-if="showImageList"
      list-class="artwork-list"
      :force-layout="forceSlideLayout ? 'VirtualSlide' : ''"
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
import dayjs from 'dayjs'
import _ from '@/lib/lodash'
import api from '@/api'
import { filterHomeIllust } from '@/utils/filter'
import TopBar from '@/components/TopBar'
import ImageList from '@/components/ImageList.vue'
import { SessionStorage } from '@/utils/storage'

export default {
  name: 'RandomIllustPage',
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
      curPage: 1,
      artList: [],
      error: false,
      loading: false,
      finished: false,
      rankModes: ['day', 'week', 'month', 'week_original', 'day_male'],
      isFromDetail: false,
      showImageList: true,
      forceSlideLayout: false,
    }
  },
  head() {
    return { title: this.$t('common.random_view') }
  },
  activated() {
    this.init()
  },
  methods: {
    toggleSlide() {
      this.showImageList = false
      this.forceSlideLayout = !this.forceSlideLayout
      this.$nextTick(() => {
        this.showImageList = true
      })
    },
    getRankList: async function () {
      if (this.loading || this.finished) return
      this.loading = true
      const mode = _.sample(this.rankModes)
      const date = dayjs().subtract(_.random(2, 14), 'days').format('YYYY-MM-DD')
      const res = await api.getRankList(mode, this.curPage, date, true)
      if (res.status === 0) {
        this.artList = _.uniqBy([
          ...this.artList,
          ..._.shuffle(res.data),
        ].filter(filterHomeIllust), 'id')

        this.loading = false
        this.curPage++
        if (this.curPage > 9) this.finished = true
      } else {
        this.$toast({
          message: res.msg,
        })
        this.loading = false
        this.error = true
      }
    },
    async init() {
      if (this.isFromDetail && this.artList.length) return
      this.artList = []
      await this.$nextTick()
      const list = SessionStorage.get('random.illust')
      console.log('list: ', list)
      if (list) {
        this.artList = list
      } else {
        this.getRankList()
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
    right 0
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

</style>
