<template>
  <div class="HomeRecommIllust illusts">
    <top-bar />
    <div class="af_title">
      <div class="discovery-tabs">
        <div class="com_sel_tab cur">{{ $t('Oz0zZHqnxZoCjYysARbO1') }}</div>
        <div class="com_sel_tab" @click="$router.push('/discovery/anonymous')">{{ $t('common.discovery') }}</div>
        <div class="com_sel_tab" @click="$router.push('/discovery/pollution')">{{ $t('qLlCQvCG0kXud25b-hKEv') }}</div>
      </div>
    </div>
    <van-list
      v-model="loading"
      class="artwork-list"
      :loading-text="$t('tips.loading')"
      :finished="finished"
      :finished-text="$t('tips.no_more')"
      :error.sync="error"
      :offset="800"
      :error-text="$t('tips.net_err')"
      @load="getRankList"
    >
      <wf-cont layout="Grid">
        <ImageCard
          v-for="art in artList"
          :key="art.id"
          mode="all"
          square
          :artwork="art"
          @click-card="toArtwork(art)"
        />
      </wf-cont>
    </van-list>
    <van-loading v-show="loading" class="loading-fixed" size="50px" />
  </div>
</template>

<script>
import _ from '@/lib/lodash'
import api from '@/api'
import TopBar from '@/components/TopBar'
import ImageCard from '@/components/ImageCard.vue'

export default {
  name: 'PopularIllust',
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
    }
  },
  head() {
    return { title: this.$t('Oz0zZHqnxZoCjYysARbO1') }
  },
  methods: {
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
    toArtwork(art) {
      this.$store.dispatch('setGalleryList', this.artList)
      this.$router.push({
        name: 'Artwork',
        params: { id: art.id, art },
      })
    },
  },
}
</script>

<style lang="stylus" scoped>
.af_title
  position relative
  margin-top 0.25rem
  margin-bottom 40px
  text-align center
  font-size 28px

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

</style>
