<template>
  <div class="Home">
    <div class="com_sel_tabs">
      <div v-t="'common.illust'" class="com_sel_tab cur"></div>
      <div v-t="'common.manga'" class="com_sel_tab" @click="$router.replace('/home_manga')"></div>
      <div v-t="'common.novel'" class="com_sel_tab" @click="$router.replace('/home_novel')"></div>
    </div>
    <div class="home-i">
      <div class="rec-cards">
        <RankCard />
        <SpotlightCard />
      </div>
      <template v-if="isLogin">
        <Recomm4U />
      </template>
      <template v-else>
        <div v-if="isSelfHibi" class="rec-cards">
          <RecommendIllustCard />
          <DiscoveryCard />
        </div>
        <lazy-component>
          <RandomIllust />
        </lazy-component>
        <lazy-component v-if="isSelfHibi">
          <LatestIllustCard />
        </lazy-component>
      </template>
    </div>
  </div>
</template>

<script>
import RankCard from './components/RankCard.vue'
import SpotlightCard from '../Spotlights/SpotlightCard.vue'
import DiscoveryCard from '../Discovery/DiscoveryCard.vue'
import RecommendIllustCard from '../Discovery/RecommendIllustCard.vue'
import RandomIllust from './components/RandomIllust.vue'
import LatestIllustCard from '../Discovery/LatestIllustCard.vue'
import Recomm4U from './components/Recomm4U.vue'
import { notSelfHibiApi } from '@/api/http'
import { existsSessionId } from '@/api/user'

const isLogin = existsSessionId()

export default {
  name: 'HomeIllust',
  components: {
    RankCard,
    RandomIllust,
    DiscoveryCard,
    RecommendIllustCard,
    SpotlightCard,
    LatestIllustCard,
    Recomm4U,
  },
  data() {
    return {
      isSelfHibi: !notSelfHibiApi,
      isLogin,
    }
  },
}
</script>

<style lang="stylus">
.rec-cards
  display flex
  .rank-card
    flex 1
    width 48%
@media screen and (max-width: 767px)
  .rec-cards
    display block
    .rank-card
      width auto
</style>
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

</style>
