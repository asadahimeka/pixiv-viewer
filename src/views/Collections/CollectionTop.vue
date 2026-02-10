<template>
  <div class="search search-user">
    <div class="search-bar-wrap">
      <van-search
        v-model="keywords"
        class="search-bar"
        shape="round"
        maxlength="50"
        show-action
        :placeholder="$t('search.placeholder')"
        :clearable="false"
        :disabled="isSearchDisabled"
        @search="onSearch"
      >
        <template #action>
          <div class="search_btn" @click="onSearch">{{ $t('search.search') }}</div>
        </template>
      </van-search>
    </div>
    <div class="com_sel_tabs">
      <div class="com_sel_tab" @click="$router.replace('/search')">{{ $t('common.illust_manga') }}</div>
      <div class="com_sel_tab" @click="$router.replace('/search_novel')">{{ $t('common.novel') }}</div>
      <div class="com_sel_tab" @click="$router.replace('/search_user')">{{ $t('common.user') }}</div>
      <div class="com_sel_tab cur">{{ $t('dZ93cWZJ03hu5emsVwgjA') }}</div>
    </div>
    <div class="list-wrap">
      <van-loading v-if="loading" size="1rem" class="loading" />
      <div style="padding-bottom: 0.5rem"></div>
      <van-cell class="cell" :border="false" :value="$t('Iv_AtBrZSiXtLxkAr8Kas')" is-link to="/collections">
        <template #title><span class="title">{{ $t('s-vSdRKLDIiBD6JGj3r7P') }}</span></template>
      </van-cell>
      <div class="member-tags">
        <div v-for="(t, i) in tags" :key="i" class="member-tag" :style="t.style" @click="toCollections(t.name)">
          <div class="member-tag-main">#{{ t.name }}</div>
          <div v-if="t.translation">{{ t.translation }}</div>
        </div>
      </div>
      <CollectionSlide v-if="topCol.recommend" :title="$t('UloXxmkw8Hfy3fU3AwYoJ')" :list="topCol.recommend" />
      <CollectionSlide v-if="topCol.everyone" :title="$t('TqlK8T5LCQZrufKKCrmcU')" link="/collections" :list="topCol.everyone" />
      <CollectionSlide
        v-for="(it, i) in topCol.tagRecommend"
        :key="i"
        :title="`#${it.tag} ${$t('w7H3HomCOAoJHg0XxBQpc')}`"
        :link="getCollectionsUrl(it.tag)"
        :list="it.list"
      />
    </div>
  </div>
</template>

<script>
import api, { localApi } from '@/api'
import { generateRandomColor, getContrastingTextColor } from '@/utils'
import { mintVerify, BLOCK_SEARCH_WORD_RE } from '@/utils/filter'
import CollectionSlide from './components/CollectionSlide.vue'

export default {
  name: 'CollectionTop',
  components: {
    CollectionSlide,
  },
  data() {
    return {
      keywords: '',
      loading: true,
      tags: [],
      topCol: {},
      isSearchDisabled: !localApi.APP_CONFIG.useLocalAppApi,
    }
  },
  head() {
    return {
      title: this.$t('dZ93cWZJ03hu5emsVwgjA'),
    }
  },
  mounted() {
    this.init()
  },
  methods: {
    async init() {
      this.loading = true
      const [tags, topCol] = await Promise.all([
        api.getCollectionRecommendedTags(),
        api.getCollectionTop(),
      ])
      this.tags = tags.map(e => ({
        name: e[0],
        translation: e[1],
        style: this.getTagStyle(),
      }))
      this.topCol = topCol
      this.loading = false
    },
    async onSearch() {
      if (this.isSearchDisabled) return
      const word = this.keywords.trim()
      if (!word || BLOCK_SEARCH_WORD_RE.test(word) || !(await mintVerify(word))) {
        return
      }
      this.toCollections(word)
      this.keywords = ''
    },
    toCollections(tags = '') {
      this.$router.push(this.getCollectionsUrl(tags))
    },
    getCollectionsUrl(tags = '') {
      const params = new URLSearchParams()
      tags.split(/\s+/).filter(Boolean).forEach(e => params.append('tags[]', e))
      return `/collections?${params}`
    },
    getTagStyle() {
      const background = generateRandomColor()
      return {
        background,
        color: getContrastingTextColor(background),
      }
    },
  },
}
</script>

<style lang="stylus" scoped>
.search
  position: relative;
  .search-bar-wrap
    position: fixed;
    top: 0;
    left 0
    z-index: 3;
    width: 100%;
    transition: all 0.2s;

    ::v-deep
      .van-icon-search
        margin-top: 2px;
        margin-left: 4px;
        font-size: 0.4rem;
      .van-search__content
        background #f5f5f5
      .van-search__action
        margin-left 5PX
        border-radius 10PX

    .search-bar
      width: 100vw;
      height: 120px;
      padding-top 0.133rem
      padding-bottom 0
      backdrop-filter: saturate(200%) blur(10PX);
      background: rgba(255, 255, 255, 0.8);

      ::v-deep .van-cell
        align-items center
        line-height: 0.6rem;

        input
          margin-top: 1px;
          margin-left: 0.5rem;
          font-size: 0.3rem;
          line-height: 0.6rem;

  .com_sel_tabs
    position fixed
    z-index 3
    left 0
    width 100vw
    top 120px
    margin-bottom 0
    padding 0px 0px 20px
    backdrop-filter: saturate(200%) blur(10PX);
    background: rgba(255, 255, 255, 0.8);

  .search_btn
    margin 0 20px 0 15px
    font-size 0.3rem

  .list-wrap
    position: relative;
    z-index 1
    min-height: 100vh;
    padding 2.6rem 0.2rem 120px
    box-sizing: border-box;

    .loading
      position absolute
      top 35%
      left 50%
      transform translateX(-50%)

.cell
  background none

.member-tags
  display flex
  flex-wrap wrap
  gap 10px
  margin-bottom 1rem

.member-tag
  position relative
  display flex
  justify-content center
  align-items center
  flex-direction column
  gap 5px
  border-radius: 4PX
  min-height: 50px
  padding 10px 28px
  cursor pointer
  font-size 18px
  &-main
    font-weight bold
    font-size 20px

</style>
