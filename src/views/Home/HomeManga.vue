<template>
  <div class="Home">
    <div class="com_sel_tabs">
      <div class="com_sel_tab" @click="$router.replace('/')">{{ $t('common.illust') }}</div>
      <div class="com_sel_tab cur">{{ $t('common.manga') }}</div>
      <div class="com_sel_tab" @click="$router.replace('/home_novel')">{{ $t('common.novel') }}</div>
      <div v-t="'g4JWYmBbfeweCBkRSgGNw'" class="com_sel_tab" @click="$router.push('/lives')"></div>
    </div>
    <div class="home-m">
      <MangaRankCard />
      <MangaRecommendCard v-if="isSelfHibi" />
      <RandomManga />
      <LatestMangaCard v-if="isSelfHibi" />
    </div>
  </div>
</template>

<script>
import { notSelfHibiApi } from '@/consts'
import LatestMangaCard from './components/LatestMangaCard.vue'
import MangaRankCard from './components/MangaRankCard.vue'
import MangaRecommendCard from './components/MangaRecommendCard.vue'
import RandomManga from './components/RandomManga.vue'

export default {
  name: 'HomeIllust',
  components: {
    MangaRankCard,
    MangaRecommendCard,
    RandomManga,
    LatestMangaCard,
  },
  data() {
    return {
      isSelfHibi: !notSelfHibiApi,
    }
  },
  head() {
    return {
      title: this.$t('common.manga'),
    }
  },
}
</script>

<style lang="stylus" scoped>
.home-m
  position relative
  z-index 2
  padding-bottom 100px
  background #fff

  ::v-deep .cell .title
    font-size 36px

  ::v-deep .image-slide
    background #f9ba48

  ::v-deep .image-slide:not(:has(.d-loading))
    background none

  ::v-deep .svg-icon
    margin-right 10px
    vertical-align -0.15rem

</style>
