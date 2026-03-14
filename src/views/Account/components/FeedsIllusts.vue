<template>
  <div class="feed-illusts">
    <div class="flex-c" style="margin: 0.2rem 0 0.4rem">
      <van-radio-group
        v-if="isAppLogin"
        v-model="restrict"
        direction="horizontal"
        @change="onRestrictChange"
      >
        <van-radio name="all">{{ $t('dR97TVmXFMlpOBpKF2bRL') }}</van-radio>
        <van-radio name="public">{{ $t('tMMgcuNAMSfxgPmaTDPuN') }}</van-radio>
        <van-radio name="private">{{ $t('WUegrN0Qk6zuHdl9EHUa-') }}</van-radio>
      </van-radio-group>
      <van-checkbox
        v-if="isAppLogin"
        :value="expandMulti"
        @click="onExpandMultiChange"
      >
        {{ $t('dDeCBvfHPUoQt48l5Gr3D') }}
      </van-checkbox>
      <span style="cursor: pointer;margin-left: 0.2rem;" @click="toggleSlide">
        <Icon name="swiper-symbol" scale="2.5" />
      </span>
    </div>
    <ImageList
      v-if="showImageList"
      list-class="artwork-list"
      item-key="_key"
      :force-layout="forceSlideLayout ? 'VirtualSlide' : ''"
      :list="artList"
      :loading="loading"
      :finished="finished"
      :error="error"
      :on-load-more="getRankList"
      :image-card-props="art => ({
        'data-last-seen-text': isLastSeen(art.id) ? $t('0r7KFznJTs3SQlvp4KQ84') : undefined,
        'class': { 'last-seen': isLastSeen(art.id) }
      })"
    />
    <van-loading v-show="loading" class="loading-fixed" size="50px" />
  </div>
</template>

<script>
import _ from '@/lib/lodash'
import store from '@/store'
import { localApi } from '@/api'
import { getFollowingIllusts } from '@/api/user'
import { getCache, setCache } from '@/utils/storage/siteCache'
import ImageList from '@/components/ImageList.vue'

export default {
  name: 'FeedsIllusts',
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
      lastId: null,
      isAppLogin: localApi.APP_CONFIG.useLocalAppApi,
      restrict: 'all',
      showImageList: true,
      forceSlideLayout: false,
    }
  },
  computed: {
    expandMulti() {
      return store.state.appSetting.isExpandMultiPArtwork
    },
  },
  async created() {
    this.lastId = await getCache('feeds.last.seen.id')
    this.getRankList()
  },
  beforeDestroy() {
    setCache('feeds.last.seen.id', this.artList[0]?.id)
  },
  methods: {
    isLastSeen(id) {
      return id != this.artList[0]?.id && id == this.lastId
    },
    onRestrictChange(val) {
      window.umami?.track('feed_illust_restrict', { val })
      this.curPage = 1
      this.artList = []
      this.loading = false
      this.finished = false
      this.getRankList()
    },
    onExpandMultiChange() {
      store.commit('setAppSetting', { isExpandMultiPArtwork: !this.expandMulti })
      window.umami?.track('feed_illust_expand_multi', { val: this.expandMulti })
      this.curPage = 1
      this.artList = []
      this.loading = false
      this.finished = false
      this.getRankList()
    },
    toggleSlide() {
      window.umami?.track('feed_img_list_toggle_slide')
      this.showImageList = false
      this.forceSlideLayout = !this.forceSlideLayout
      this.$nextTick(() => {
        this.showImageList = true
      })
    },
    getRankList: _.throttle(async function () {
      if (this.loading || this.finished) return
      this.loading = true
      const res = this.isAppLogin
        ? await localApi.illustFollow(this.curPage, this.restrict)
        : await getFollowingIllusts(this.curPage)
      if (res.status === 0) {
        let artList = res.data
        if (this.isAppLogin && this.expandMulti) {
          artList = artList.map(e => {
            if (e.images.length == 1 || e.images.length > 10) return e
            return e.images.map((img, i) => ({
              ...e,
              count: 1,
              images: [img],
              _key: `${e.id}_${i}`,
              _art: e,
            }))
          }).flat()
        }
        artList = artList.map(e => ({ ...e, _key: e._key || `${e.id}` }))
        console.log('artList: ', artList)

        this.artList = _.uniqBy([
          ...this.artList,
          ...artList,
        ], '_key')

        if (this.curPage == 1) {
          setCache('feeds.last.seen.id', this.artList[0]?.id)
        }

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

<style lang="stylus">
.image-card.last-seen::after
  content attr(data-last-seen-text)
  position absolute
  top 0
  left 0
  display flex
  justify-content center
  align-items center
  width 100%
  height 100%
  font-size 0.36rem
  background rgba(0,0,0,0.72)
  color white
  pointer-events none
.feed-illusts
  .vs-full-icon
    display none
  @media screen and (max-width: 500PX)
    .my-virtual-swiper
      height 80vh !important
</style>
