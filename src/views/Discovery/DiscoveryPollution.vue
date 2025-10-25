<template>
  <div class="Discovery illusts">
    <top-bar />
    <h3 class="af_title">
      {{ $t('qLlCQvCG0kXud25b-hKEv') }}
      <div class="clear-ih">
        <span @click="toggleSlide">
          <Icon name="swiper-symbol" />
        </span>
        <span @click="getArtList">
          <Icon name="random" scale="2" />
        </span>
      </div>
    </h3>
    <ImageList
      v-if="showImageList"
      list-class="artwork-list"
      :force-layout="forceSlideLayout ? 'VirtualSlide' : 'Grid'"
      :list="artList"
      :loading="loading"
      :finished="true"
      :error="false"
      :on-load-more="() => {}"
    />
    <!-- <wf-cont layout="Grid">
      <ImageCard v-for="art in artList" :key="art.id" mode="all" square :artwork="art" @click-card="toArtwork(art)" />
    </wf-cont> -->
    <van-loading v-show="loading" class="loading" :size="'50px'" />
    <van-empty v-if="!loading && !artList.length" :description="$t('tips.no_data')" />
  </div>
</template>

<script>
import api from '@/api'
import TopBar from '@/components/TopBar'
import ImageList from '@/components/ImageList.vue'

export default {
  name: 'DiscoveryPollution',
  components: {
    TopBar,
    ImageList,
  },
  data() {
    return {
      loading: false,
      artList: [],
      showImageList: true,
      forceSlideLayout: false,
    }
  },
  head() {
    return { title: this.$t('common.discovery') }
  },
  mounted() {
    this.getArtList()
  },
  methods: {
    toggleSlide() {
      this.showImageList = false
      this.forceSlideLayout = !this.forceSlideLayout
      this.$nextTick(() => {
        this.showImageList = true
      })
    },
    async getArtList() {
      this.loading = true
      this.artList = []
      const res = await api.getDiscoveryArtworks('safe')
      if (res.status === 0) {
        this.artList = res.data
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
.af_title
  position relative
  margin-top 40px
  margin-bottom 40px
  text-align center
  font-size 28px

  .clear-ih
    position absolute
    top -10px
    right 20px

    ::v-deep .svg-icon
      font-size 0.6rem !important

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
  ::v-deep .van-list__finished-text
    display none

  .card-box
    padding: 0 12px
    display: flex
    flex-direction: row

    .image-card
      max-height: 360px
      margin: 4px 2px

</style>
