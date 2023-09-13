<template>
  <div class="HomeRecommIllust illusts">
    <top-bar />
    <h3 class="af_title">{{ $t('iAH7adsXaqWMXEi3TOuwS') }}({{ $t('common.manga') }})</h3>
    <template v-if="detail">
      <img class="ss-cover" :src="detail.cover" alt="">
      <p class="ss-title">
        {{ detail.title }}
        <van-tag color="#ffe1e1" text-color="#ad0000" style="vertical-align: 0.06rem;">
          {{ detail.series_work_count }}
        </van-tag>
      </p>
      <p class="ss-author"><i>by</i> {{ detail.user.name }}</p>
      <p class="ss-caption">{{ detail.caption }}</p>
    </template>
    <van-list
      v-model="loading"
      :loading-text="$t('tips.loading')"
      :finished="finished"
      :finished-text="$t('tips.no_more')"
      :error.sync="error"
      :offset="800"
      :error-text="$t('tips.net_err')"
      @load="getArtList()"
    >
      <wf-cont layout="Grid">
        <ImageCard
          v-for="(art, i) in artList"
          :key="art.id"
          :index="getIndex(i)"
          mode="all"
          square
          :artwork="art"
          @click-card="toArtwork($event)"
        />
      </wf-cont>
    </van-list>
  </div>
</template>

<script>
import _ from 'lodash'
import TopBar from '@/components/TopBar'
import ImageCard from '@/components/ImageCard'
import api from '@/api'

export default {
  name: 'IllustSeries',
  components: {
    TopBar,
    ImageCard,
  },
  data() {
    return {
      curPage: 1,
      artList: [],
      error: false,
      loading: false,
      finished: false,
      detail: null,
    }
  },
  head() {
    return { title: this.$t('iAH7adsXaqWMXEi3TOuwS') }
  },
  watch: {
    $route() {
      if (
        this.$route.name == 'IllustSeries' &&
        this.$route.params.sid != this.detail?.id
      ) {
        this.curPage = 1
        this.artList = []
        this.error = false
        this.finished = false
        this.detail = null
        this.getArtList()
      }
    },
  },
  methods: {
    getIndex(i) {
      const len = this.detail?.series_work_count
      return len ? len - i : 0
    },
    toArtwork(id) {
      this.$store.dispatch('setGalleryList', this.artList)
      this.$router.push({
        name: 'Artwork',
        params: { id },
      })
    },
    getArtList: _.throttle(async function () {
      const { sid } = this.$route.params
      if (!sid) return
      this.loading = true
      const res = await api.getIllustSeries(sid, this.curPage)
      if (res.status === 0) {
        this.artList = _.uniqBy([
          ...this.artList,
          ...res.data,
        ], 'id')

        this.detail = res.data.detail
        this.loading = false
        if (res.data.next) {
          this.curPage++
        } else {
          this.finished = true
        }
      } else {
        this.$toast({
          message: res.msg,
          icon: require('@/icons/error.svg'),
        })
        this.loading = false
        this.error = true
      }
    }, 1500),
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
  padding 0 20px 40px

  .ss-cover
    display block
    max-width 100%
    margin 20px auto
    border-radius 20px
  .ss-title
    margin-bottom 20px
    font-size 28px
    font-weight bold
    text-align center
    color rgb(31, 31, 31)
  .ss-author
    margin-bottom 20px
    text-align center
    font-size 24px
    color rgb(31, 31, 31)
    i
      color rgb(92, 92, 92)
  .ss-caption
    margin-bottom 40px
    text-align center
    font-size 18px
    color rgb(92, 92, 92)

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

  ::v-deep .author-cont
    display none !important
  ::v-deep .meta
    &::before
      height 100% !important
      background-image: linear-gradient(0deg, rgba(0,0,0,0.7) 0%, rgba(255,255,255,0) 100%);
    .title
      display block !important

</style>
