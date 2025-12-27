<template>
  <div class="HomeRecommIllust illusts">
    <top-bar />
    <h3 class="af_title">
      {{ $t('common.random_view') }}
      <div class="clear-ih" @click="toggleSlide">
        <Icon name="swiper-symbol" scale="1.5" />
      </div>
    </h3>
    <div v-if="isR18On" style="display:flex;justify-content:flex-end;margin:0.2rem 0 0.4rem">
      <van-radio-group v-model="restrict" direction="horizontal">
        <van-radio name="safe">{{ $t('q3dZB--IevljTdxWdrQMC') }}</van-radio>
        <van-radio name="r18">R18</van-radio>
      </van-radio-group>
    </div>
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
import { mapGetters } from 'vuex'
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
      isFromDetail: false,
      showImageList: true,
      forceSlideLayout: false,
      restrict: 'safe',
    }
  },
  head() {
    return { title: this.$t('common.random_view') }
  },
  computed: {
    ...mapGetters(['isR18On']),
    rankModes() {
      return this.restrict == 'r18'
        ? ['day_r18', 'day_male_r18', 'week_r18']
        : ['day', 'week', 'month', 'week_original', 'day_male']
    },
  },
  watch: {
    restrict(val) {
      window.umami?.track('random_illust_restrict', { val })
      this.curPage = 1
      this.artList = []
      this.finished = false
      this.loading = false
      this.getRankList()
    },
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

</style>
