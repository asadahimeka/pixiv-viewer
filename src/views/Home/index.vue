<template>
  <div class="Home">
    <div class="com_sel_tabs">
      <div v-t="'common.illust'" class="com_sel_tab cur"></div>
      <div v-t="'common.manga'" class="com_sel_tab" @click="$router.replace('/home_manga')"></div>
      <div v-t="'common.novel'" class="com_sel_tab" @click="$router.replace('/home_novel')"></div>
    </div>
    <div class="home-i">
      <RankCard />
      <SpotlightCard />
      <RecommendCard v-if="isSelfHibi" />
      <lazy-component>
        <RandomIllust />
      </lazy-component>
      <lazy-component v-if="isSelfHibi">
        <LatestIllustCard />
      </lazy-component>
    </div>
  </div>
</template>

<script>
import RankCard from './components/RankCard.vue'
import SpotlightCard from '../Spotlights/SpotlightCard.vue'
import RecommendCard from '../Discovery/RecommendCard.vue'
import RandomIllust from './components/RandomIllust.vue'
import LatestIllustCard from '../Discovery/LatestIllustCard.vue'
import { notSelfHibiApi } from '@/api/http'

export default {
  name: 'HomeIllust',
  components: {
    RankCard,
    RandomIllust,
    RecommendCard,
    SpotlightCard,
    LatestIllustCard,
  },
  data() {
    return {
      isSelfHibi: !notSelfHibiApi,
    }
  },
}
</script>

<style lang="stylus" scoped>
.home-i
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

  ::v-deep .discovery-icon
    font-size: 0.8rem
    vertical-align: -0.2rem

</style>
