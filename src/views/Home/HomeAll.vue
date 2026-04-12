<template>
  <div class="Home">
    <div class="com_sel_tabs home-i-tabs">
      <div class="home-title">
        <img class="app-logo" src="/app-icon.png" alt="Logo">
        <h1 class="app-title">Pixiv Viewer</h1>
      </div>
      <div class="sel-tabs flex">
        <div v-t="'nav.home'" class="com_sel_tab cur"></div>
        <div v-t="'common.illust'" class="com_sel_tab" @click="$router.replace('/')"></div>
        <div v-t="'common.manga'" class="com_sel_tab" @click="$router.replace('/home_manga')"></div>
        <div v-t="'common.novel'" class="com_sel_tab" @click="$router.replace('/home_novel')"></div>
      </div>
      <div class="home-search">
        <van-search v-model="term" :placeholder="placeholder" shape="round" @search="onSearch" />
      </div>
    </div>
    <div class="home-i">
      <div class="ha-item">
        <HomeaFeedsCard />
        <van-divider />
        <RecommendIllustCard style="padding: 0;" />
        <div class="hai-divider"></div>
      </div>
      <van-list
        v-model="loading"
        :loading-text="$t('tips.loading')"
        :finished="finished"
        :finished-text="$t('tips.no_more')"
        :error.sync="error"
        :error-text="$t('tips.net_err')"
        :immediate-check="false"
        @load="getList"
      >
        <div v-for="(item, index) in artList" :key="index" class="ha-item">
          <HomeaIllustCard v-if="item.kind == 'illust' || item.kind == 'manga'" :artwork="item.detail" />
          <HomeaNovelCard v-else-if="item.kind == 'novel'" :artwork="item.detail" />
          <HomeaTrendTags v-else-if="item.kind == 'tags_carousel'" :tags="item.detail" />
          <RankCard v-else-if="item.kind == 'ranking'" class="homea-rank" />
          <SpotlightCard v-else-if="item.kind == 'pixivision'" class="homea-pixivision" />
          <van-divider />
        </div>
      </van-list>
    </div>
  </div>
</template>

<script>
import _ from '@/lib/lodash'
import api, { localApi } from '@/api'
import HomeaIllustCard from './components/HomeaIllustCard.vue'
import HomeaNovelCard from './components/HomeaNovelCard.vue'
import HomeaTrendTags from './components/HomeaTrendTags.vue'
import HomeaFeedsCard from './components/HomeaFeedsCard.vue'
import RankCard from './components/RankCard.vue'
import SpotlightCard from '../Spotlights/SpotlightCard.vue'
import RecommendIllustCard from '../Discovery/RecommendIllustCard.vue'

export default {
  name: 'HomeAll',
  components: {
    HomeaIllustCard,
    HomeaNovelCard,
    HomeaTrendTags,
    HomeaFeedsCard,
    RankCard,
    SpotlightCard,
    RecommendIllustCard,
  },
  data() {
    return {
      term: '',
      tags: [],
      placeholder: '',
      nextParams: {},
      artList: [],
      error: false,
      loading: false,
      finished: false,
    }
  },
  head() {
    return {
      title: `Pixiv Viewer - ${this.$t('setting.app_desc')}`,
      titleTemplate: null,
    }
  },
  activated() {
    this.placeholder = _.sample(this.tags)
  },
  mounted() {
    if (localApi.isLoggedIn()) {
      this.initSearch()
      this.getList()
    } else {
      this.$router.replace('/')
    }
  },
  methods: {
    async getList() {
      this.loading = true
      const res = await localApi.homeAll(this.nextParams)
      if (res.status === 0) {
        console.log('res.data.contents: ', res.data.contents)
        this.artList = [
          ...this.artList,
          ...res.data.contents,
        ]
        this.loading = false
        this.nextParams = _.pickBy(res.data, (_val, key) => ['next_params', 'states'].includes(key))
        if (!res.data.contents.length) this.finished = true
      } else {
        this.$toast({ message: res.msg })
        this.loading = false
        this.error = true
      }
    },
    async initSearch() {
      const res = await api.getTags()
      if (res.status === 0) {
        this.tags = res.data.map(e => e.name).filter(e => !this.$store.state.blockTags.includes(e))
        this.placeholder = _.sample(this.tags)
      }
    },
    onSearch() {
      const id = this.term.match(/https?:\/\/.+\/artworks\/(\d+)/i)?.[1] || this.term.match(/^(\d{8,})$/)?.[1]
      if (id) {
        this.term = ''
        this.$router.push(`/artworks/${id}`)
      } else {
        this.$router.push(`/search/${this.term || this.placeholder}`)
      }
    },
  },
}
</script>

<style lang="stylus" scoped>
.home-i
  position relative
  z-index 2
  padding: 0 0.5rem 1.4rem;
  background #fff

.ha-item
  max-width 800PX
  margin 0 auto

.hai-divider
  width: 5rem;
  height: 1px;
  margin: 0.8rem auto;
  background: #ccc

</style>
<style lang="stylus">
.homea-rank .card-box .swipe-wrap .swipe-item
  width 4.25rem !important
  .image-card
    box-shadow none

.homea-pixivision .card-box .swipe-wrap .swipe-item
  width 8.6rem !important

.van-list .home-i .ha-item:has(.censored)
  display none

</style>
