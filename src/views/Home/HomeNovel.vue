<template>
  <div class="Home">
    <div class="com_sel_tabs">
      <div class="com_sel_tab" @click="$router.replace('/')">{{ $t('common.illust') }}</div>
      <div class="com_sel_tab" @click="$router.replace('/home_manga')">{{ $t('common.manga') }}</div>
      <div class="com_sel_tab cur">{{ $t('common.novel') }}</div>
    </div>
    <div class="home-n">
      <NovelRankCard />
      <NovelRecommendCard v-if="isSelfHibi" />
      <lazy-component>
        <RandomNovel />
      </lazy-component>
      <lazy-component v-if="isSelfHibi">
        <LatestNovelCard />
      </lazy-component>
    </div>
  </div>
</template>

<script>
import { notSelfHibiApi } from '@/api/http'
import LatestNovelCard from './components/LatestNovelCard.vue'
import NovelRankCard from './components/NovelRankCard.vue'
import NovelRecommendCard from './components/NovelRecommendCard.vue'
import RandomNovel from './components/RandomNovel.vue'
import { i18n } from '@/i18n'

export default {
  name: 'HomeNovel',
  components: {
    NovelRankCard,
    NovelRecommendCard,
    RandomNovel,
    LatestNovelCard,
  },
  data() {
    return {
      isSelfHibi: !notSelfHibiApi,
    }
  },
  head: {
    title: i18n.t('common.novel'),
  },
}
</script>

<style lang="stylus" scoped>
.home-n
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
