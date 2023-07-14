<template>
  <div class="illusts">
    <top-bar />
    <h3 class="af_title">{{ $t('iAH7adsXaqWMXEi3TOuwS') }}({{ $t('common.novel') }})</h3>
    <div style="max-width: 16rem;margin: 0 auto;padding: 0 0.2rem;">
      <template v-if="artList.detail">
        <img class="ss-cover" :src="artList.detail.cover" alt="">
        <p class="ss-title">
          {{ artList.detail.title }}
        </p>
        <p class="ss-author"><i>by</i> {{ artList.detail.user.name }}</p>
        <p class="ss-caption">{{ artList.detail.caption }}</p>
        <p style="text-align: center;margin: -0.2rem auto 0.4rem;">
          <van-tag color="#ffe1e1" text-color="#ad0000">
            <van-icon name="orders-o" style="margin-right: 2px;" />
            {{ artList.detail.content_count }}
          </van-tag>
          <van-tag color="#cdeefe" text-color="#0b6aaf">{{ artList.detail.total_character_count }}{{ $t('common.words') }}</van-tag>
        </p>
      </template>
      <NovelCard
        v-for="(art,i) in artList"
        :key="art.id"
        mode="all"
        :index="i+1"
        :artwork="art"
        @click-card="toArtwork($event)"
      />
    </div>
    <van-loading v-show="loading" class="loading" :size="'50px'" />
    <van-empty v-if="!loading && !artList.length" :description="$t('tips.no_data')" />
  </div>
</template>

<script>
import TopBar from '@/components/TopBar'
import NovelCard from '@/components/NovelCard.vue'
import api from '@/api'

export default {
  name: 'NovelSeries',
  components: {
    TopBar,
    NovelCard,
  },
  data() {
    return {
      loading: false,
      artList: [],
      series: {},
    }
  },
  watch: {
    $route() {
      if (
        this.$route.name == 'NovelSeries' &&
        this.$route.params.id != this.artList.detail.id
      ) {
        this.getArtList()
      }
    },
  },
  created() {
    this.getArtList()
  },
  methods: {
    toArtwork(id) {
      this.$router.push({
        name: 'NovelDetail',
        params: { id },
      })
    },
    async getArtList() {
      const { id } = this.$route.params
      if (!id) return
      this.loading = true
      this.artList = []
      const res = await api.getNovelSeries(id)
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

.illusts
  position relative
  padding-bottom 40px

  ::v-deep .novel-card
    .series, .img-cont, .author
      display none !important

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
