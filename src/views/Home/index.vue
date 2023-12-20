<template>
  <div class="Home">
    <div class="com_sel_tabs home-i-tabs">
      <div class="home-title">
        <img class="app-logo" src="/app-icon.png" alt="Logo">
        <h1 class="app-title">Pixiv Viewer</h1>
      </div>
      <div class="sel-tabs flex">
        <div v-t="'common.illust'" class="com_sel_tab cur"></div>
        <div v-t="'common.manga'" class="com_sel_tab" @click="$router.replace('/home_manga')"></div>
        <div v-t="'common.novel'" class="com_sel_tab" @click="$router.replace('/home_novel')"></div>
      </div>
      <div class="home-search">
        <van-search v-model="term" :placeholder="placeholder" shape="round" @search="onSearch" />
      </div>
    </div>
    <div class="home-i">
      <div class="rec-cards">
        <RankCard />
        <SpotlightCard />
      </div>
      <Recomm4U v-if="isWebLogin" />
      <template v-else>
        <div v-if="isSelfHibi" class="rec-cards">
          <RecommendIllustCard />
          <DiscoveryCard />
        </div>
        <RandomIllust />
        <LatestIllustCard v-if="isSelfHibi" />
      </template>
    </div>
  </div>
</template>

<script>
import _ from 'lodash'
import RankCard from './components/RankCard.vue'
import SpotlightCard from '../Spotlights/SpotlightCard.vue'
import DiscoveryCard from '../Discovery/DiscoveryCard.vue'
import RecommendIllustCard from '../Discovery/RecommendIllustCard.vue'
import RandomIllust from './components/RandomIllust.vue'
import LatestIllustCard from '../Discovery/LatestIllustCard.vue'
import Recomm4U from './components/Recomm4U.vue'
import { notSelfHibiApi } from '@/api/http'
import { existsSessionId } from '@/api/user'
import api from '@/api'

const isWebLogin = existsSessionId()

export default {
  name: 'HomeIllust',
  components: {
    RankCard,
    SpotlightCard,
    DiscoveryCard,
    RecommendIllustCard,
    RandomIllust,
    LatestIllustCard,
    Recomm4U,
  },
  data() {
    return {
      isSelfHibi: !notSelfHibiApi,
      isWebLogin,
      term: '',
      tags: [],
      placeholder: '',
    }
  },
  head: {
    title: 'Pixiv Viewer - Yet Another Pixiv Illustration & Novel Viewer',
    titleTemplate: null,
  },
  activated() {
    this.placeholder = _.sample(this.tags)
  },
  mounted() {
    this.initSearch()
  },
  methods: {
    async initSearch() {
      const res = await api.getTags()
      if (res.status === 0) {
        this.tags = res.data.map(e => e.name)
        this.placeholder = _.sample(this.tags)
      }
    },
    onSearch() {
      this.$router.push(`/search/${this.term || this.placeholder}`)
    },
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
