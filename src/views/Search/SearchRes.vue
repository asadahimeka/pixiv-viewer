<template>
  <div class="search">
    <div class="search-bar-wrap" :class="{ dropdown: focus }">
      <van-search
        v-model="keywords"
        class="search-bar"
        shape="round"
        :placeholder="$t('search.placeholder')"
        maxlength="50"
        :clearable="false"
        @input="onSearchInput"
        @focus="onFocus"
        @search="onSearch"
      />
      <div ref="words" class="search-bar-word" @click="handleWordsClick($event)">
        <span v-if="keywordsList.length === 0 && !lastWord" class="placeholder">{{ $t('search.placeholder') }}</span>
        <div v-for="(word, index) in keywordsList" :key="index" class="word">
          <span class="text">{{ word }}</span>
          <span class="close" :data-index="index"></span>
        </div>
        <div v-if="lastWord && keywords.trim()" class="word">
          <span class="text no-line">{{ lastWord }}</span>
        </div>
      </div>
      <div
        v-if="(isSelfHibi && keywords.trim() && artList.length)"
        class="show_pop_icon"
        @click="togglePopPreview"
      >
        <Icon class="icon" name="popular" />
      </div>
    </div>
    <div v-if="focus" class="search-dropdown">
      <div v-if="keywords.trim()" class="pid-n-uid">
        <div class="keyword" @click="onSearch">{{ $t('search.seach_tag') }} {{ keywords.trim() }} </div>
        <template v-if="showR18OrSafeQuickTag">
          <div class="keyword" @click="onSearch('R18')">{{ $t('pL1gF_vTo1c_iF5GpBIDA') }} {{ keywords.trim() }} </div>
          <div class="keyword" @click="onSearch('safe')">{{ $t('IxG-Y2odr_0OKUJbaqV0-') }} {{ keywords.trim() }} </div>
        </template>
        <div v-if="isSelfHibi" class="keyword" @click="searchUser">
          {{ $t('search.search_user') }} {{ keywords.trim() }}
        </div>
      </div>
      <div v-if="pidOrUidList.length" class="pid-n-uid">
        <template v-for="n in pidOrUidList">
          <div :key="'p_' + n" class="keyword" @click="toPidPage(n)">→ {{ $t('common.artwork') }} ID: {{ n }} </div>
          <div :key="'u_' + n" class="keyword" @click="toUidPage(n)">→ {{ $t('common.user') }} ID: {{ n }} </div>
          <div v-if="n.length<6" :key="'s_' + n" class="keyword" @click="toSpotlightPage(n)">→ 特辑 ID: {{ n }} </div>
        </template>
      </div>
      <div v-if="keywords.trim() && autoCompleteTagList.length" class="search-history">
        <div class="title-bar">{{ $t('search.autocomplete') }}</div>
        <div v-for="tag in autoCompleteTagList" :key="tag" class="keyword" @click="searchTag(tag)">
          {{ tag }}
        </div>
      </div>
      <div v-if="!keywords.trim() && searchHistory.length > 0" class="search-history">
        <div class="title-bar">
          {{ $t('search.history') }}
          <div @click="clearHistory">
            <Icon name="del" scale="2" />
          </div>
        </div>
        <div v-for="(word, index) in searchHistory" :key="index" class="keyword" @click="searchTag(word)">
          {{ word }}
        </div>
      </div>
    </div>
    <div class="list-wrap" :class="{ focus: focus }" :style="{ paddingTop: keywords.trim() ? '1.6rem' : '2.6rem' }">
      <div v-show="keywords.trim()" class="search_params">
        <van-dropdown-menu class="search_param_sel" :class="{ showPopPreview }" active-color="#f2c358">
          <template v-if="!showPopPreview">
            <van-dropdown-item v-model="searchParams.mode" :options="searchModes" />
            <van-dropdown-item v-model="usersIriTag" :options="usersIriTags" />
            <van-dropdown-item v-model="searchParams.order" :options="searchOrders" />
          </template>
          <van-dropdown-item
            ref="s_date"
            :title="searchParams.start_date ? searchParams.start_date + '~' + searchParams.end_date : $t('common.date')"
            :lazy-render="false"
            @open="onSelDateOpen"
          >
            <van-calendar
              ref="selDate"
              color="#f2c358"
              class="sel_search_date"
              type="range"
              lazy-render
              :confirm-text="$t('common.confirm')"
              :confirm-disabled-text="$t('common.confirm')"
              :default-date="searchDateVals"
              :poppable="false"
              :show-title="false"
              :min-date="minDate"
              :max-date="maxDate"
              @confirm="v => { searchDateVals = v; $refs.s_date.toggle() }"
            />
            <div style="width: 9.4rem;margin: 5px auto 10px">
              <van-button
                style="height: 36px;"
                block
                round
                @click="() => { searchDateVals = [null, null]; $refs.s_date.toggle() }"
              >
                {{ $t('common.reset') }}
              </van-button>
            </div>
          </van-dropdown-item>
          <template v-if="!showPopPreview">
            <van-dropdown-item v-model="searchDurationParam" :options="searchDurations" @change="handleDurationChange" />
            <van-dropdown-item v-model="searchParams.search_ai_type" :disabled="!isAIOn" :options="searchAIOptions" />
            <van-dropdown-item v-model="searchParams.searchR18Type" :disabled="!isR18On" :options="searchR18Options" />
            <van-dropdown-item v-model="searchParams.ratioFilter" :options="ratioOptions" />
          </template>
        </van-dropdown-menu>
      </div>
      <PopularPreview v-if="showPopPreview && keywords.trim()" ref="popPreview" :word="keywords" :params="searchParams" />
      <ImageList
        v-else-if="keywords.trim()"
        :list-class="`result-list${isPagination ? ' is-pagination' : ''}`"
        :list="artList"
        :loading="loading"
        :finished="finished"
        :error="error"
        :on-load-more="onLoadMore"
      />
      <van-loading v-if="isPagination && loading" size="50px" style="margin: 32vh;text-align: center;" />
      <div v-if="isPagination && !showPopPreview" style="display: flex;justify-content: center;">
        <van-pagination
          :value="curPage"
          :items-per-page="30"
          :page-count="totalPages"
          :show-page-size="pageBtnNum"
          @change="onPageChange"
        >
          <template #prev-text>
            <van-icon name="arrow-left" />
          </template>
          <template #next-text>
            <van-icon name="arrow" />
          </template>
        </van-pagination>
        <van-field
          type="digit"
          maxlength="3"
          placeholder="Go"
          style="width: 1.7rem;height: 40px;"
          @keydown.enter="onPageChange(+$event.target.value)"
        />
      </div>
      <van-loading v-if="!isPagination && keywords.trim() && artList.length == 0 && !finished" class="loading" :size="'50px'" />
      <div class="mask" @click="focus = false"></div>
    </div>
  </div>
</template>

<script>
import { mapState, mapActions } from 'vuex'
import _ from '@/lib/lodash'
import dayjs from 'dayjs'
import api from '@/api'
import store from '@/store'
import { notSelfHibiApi } from '@/consts'
import { mintVerify, BLOCK_INPUT_WORDS, BLOCK_LAST_WORD_RE, BLOCK_SEARCH_WORD_RE, BLOCK_RESULT_RE, isAiIllust } from '@/utils/filter'
import { i18n } from '@/i18n'
import { sleep } from '@/utils'
import ImageList from '@/components/ImageList.vue'
import PopularPreview from './components/PopularPreview.vue'

const ARTWORK_LINK_RE = /https?:\/\/.+\/artworks\/(\d+)/i

export default {
  name: 'SearchRes',
  components: {
    ImageList,
    PopularPreview,
  },
  data() {
    return {
      keywords__: '',
      keywords: '', // 关键词搜索框真实搜索内容
      keywordsList: [], // 关键词搜索框分词列表（空格分割）
      lastWord: '', // 正在输入的关键词
      focus: false, // 编辑框是否获取焦点
      curPage: 1,
      artList: [], // 作品列表
      error: false,
      loading: false,
      finished: false,
      autoCompleteTagList: [],
      usersIriTag: '',
      usersIriTags: [
        { text: this.$t('7PnT90lP_mZTPfL3Uwlhl'), value: '' },
        ...[30000, 20000, 10000, 7500, 5000, 1000, 500, 250, 100].map(e => {
          return { text: i18n.t('8SuotxAmYS7l1QCfLz0Yv', [e]), value: `${e}users入り` }
        }),
      ],
      // minDate: new Date('2007/09/13'),
      minDate: dayjs().subtract(1, 'year').toDate(),
      maxDate: new Date(),
      searchParams: {
        mode: 'partial_match_for_tags',
        order: 'date_desc',
        start_date: '',
        end_date: '',
        search_ai_type: '',
        searchR18Type: '',
        ratioFilter: '',
      },
      searchModes: [
        { text: this.$t('search.mode.partial'), value: 'partial_match_for_tags' },
        { text: this.$t('search.mode.exact'), value: 'exact_match_for_tags' },
        { text: this.$t('search.mode.title'), value: 'title_and_caption' },
      ],
      searchOrders: [
        { text: this.$t('search.date.desc'), value: 'date_desc' },
        { text: this.$t('search.date.asc'), value: 'date_asc' },
      ],
      searchDurationParam: '',
      searchDateVals: [null, null],
      searchDurations: [
        { text: this.$t('search.dura.ph'), value: '' },
        { text: this.$t('search.dura.day'), value: 'within_last_day' },
        { text: this.$t('search.dura.week'), value: 'within_last_week' },
        { text: this.$t('search.dura.month'), value: 'within_last_month' },
        { text: this.$t('MA6IA3Iad77L-GFmI1G2e'), value: 'within_last_half_year' },
        { text: this.$t('AHbKrrnigwX4uyEuNTLhD'), value: 'within_last_year' },
      ],
      searchR18Options: [
        { text: this.$t('ZrjYwXfoy-1VsGd5GPUaG'), value: '' },
        { text: this.$t('KaQ9vCtHFcDpPCx80CpoW'), value: 'R' },
        { text: this.$t('q3dZB--IevljTdxWdrQMC'), value: 'S' },
      ],
      searchAIOptions: [
        { text: this.$t('D3kINSMv_LLXKunaXRBkY'), value: '' },
        { text: this.$t('VTewlLtKnSV8muyw35y8P'), value: '1' },
      ],
      ratioOptions: [
        { text: this.$t('60rHZkbSVyvMXR5mxfOUS'), value: '' },
        { text: this.$t('4qZPW5NFW8YYDwkKtrKjz'), value: 'w>h' },
        { text: this.$t('lveNeJo4VKOxFL7t6wvN_'), value: 'w=h' },
        { text: this.$t('Fe6ZIApJoqbXO5UU5S001'), value: 'w<h' },
      ],
      showPopPreview: false,
      isSelfHibi: !notSelfHibiApi,
      totalPages: 166,
      pageBtnNum: document.documentElement.clientWidth / 80,
    }
  },
  head() {
    return {
      title: this.$t('search.search'),
    }
  },
  computed: {
    ...mapState(['searchHistory']),
    isR18On() {
      return store.getters.isR18On
    },
    isAIOn() {
      return store.state.contentSetting.ai
    },
    searchListMinFavNum() {
      return Number(store.state.appSetting.searchListMinFavNum)
    },
    pidOrUidList() {
      return this.keywords.match(/(\d+)/g) || []
    },
    showR18OrSafeQuickTag() {
      return store.getters.isR18On &&
        !this.pidOrUidList.length &&
        !this.keywords.includes('R-18')
    },
    isPagination() {
      const { isVirtualList, searchListPagination } = store.state.appSetting
      return !isVirtualList && searchListPagination
    },
  },
  watch: {
    usersIriTag(val) {
      // window.umami?.track('search_illust_usersIriTag', { val })
      this.reset()
      this.doSearch(this.keywords)
    },
    searchParams: {
      deep: true,
      handler(val) {
        console.log('searchParams: ', val)
        // window.umami?.track('search_illust_params', { val })
        if (this.showPopPreview) {
          this.$refs.popPreview.getList()
        } else {
          this.reset()
          this.doSearch(this.keywords)
        }
      },
    },
    searchDateVals(vals) {
      console.log('searchDateVals: ', vals)
      if (!(Array.isArray(vals) && vals[2])) {
        this.searchDurationParam = ''
      }
      Object.assign(this.searchParams, {
        start_date: vals[0] && dayjs(vals[0]).format('YYYY-MM-DD'),
        end_date: vals[1] && dayjs(vals[1]).format('YYYY-MM-DD'),
      })
    },
    keywords() {
      console.log('watch keywords: ', this.keywords)
      // 当关键词内容发生变化
      const keywordsList = this.keywords
        .replace(/\s\s+/g, ' ') // 去除多余空格（'abc   ' => 'abc '）
        .trimStart() // 去除开头空白字符
        .split(' ') // 按空格分割

      if (keywordsList.length === 1 && keywordsList[0] === '') {
        // 只输入空格的情况清空关键词列表并返回
        this.keywordsList = []
        this.reset()
        return
      }

      this.lastWord = keywordsList.pop() // 最顶部的元素即为正在输入的关键词

      this.keywordsList = keywordsList // 设置关键词组

      this.$nextTick(() => {
        // 保持滚动条在尾部，使用nextTick确保及时更新
        this.$refs.words.scrollLeft = this.$refs.words.clientWidth
        const listWrap = document.querySelector('.list-wrap')
        listWrap && listWrap.scrollTo({ top: 0 })
      })
    },
    $route() {
      if (this.$route.name != 'SearchKeyword') return
      const keyword = (this.$route.params.keyword || '').trim()
      console.log('watch route SearchKeyword: ', keyword)
      console.log('watch route this.keywords: ', this.keywords)
      if (!keyword || keyword == this.keywords.trim()) return
      console.log('watch route Searching')
      this.showPopPreview = false
      this.keywords = keyword + ' '
      this.reset()
      this.doSearch(this.keywords)
    },
  },
  mounted() {
    const keyword = (this.$route.params.keyword || '').trim()
    console.log('mounted: SearchKeyword: ', keyword)
    if (!keyword) return
    this.showPopPreview = false
    this.keywords = keyword + ' '
    this.reset()
    this.doSearch(this.keywords)
  },
  // activated() {
  //   console.log('-------------activated: SearchKeyword')
  //   if (this.$route.name != 'SearchKeyword') return
  //   const keyword = (this.$route.params.keyword || '').trim()
  //   console.log('keyword: ', keyword)
  //   console.log('this.keywords: ', this.keywords)
  //   if (!keyword || keyword == this.keywords.trim()) return
  //   this.showPopPreview = false
  //   this.keywords = keyword + ' '
  //   this.reset()
  //   this.doSearch(this.keywords)
  // },
  methods: {
    onLoadMore() {
      if (this.isPagination) {
        this.loading = false
        this.finished = true
        return
      }
      this.doSearch()
    },
    onPageChange(page) {
      console.log('page: ', page)
      if (!page) return
      document.documentElement.scrollTo({ top: 0, behavior: 'smooth' })
      this.curPage = page
      this.loading = false
      this.artList = []
      this.doSearch()
    },
    reset() {
      this.curPage = 1
      this.artList = []
      this.loading = false
      this.finished = false
    },
    handleWordsClick(e) {
      // 处理点击事件
      const target = e.target
      if (target.className !== 'close') {
        // 点击对象不为关闭按钮则输入框获取焦点
        document.querySelector('.search-bar-wrap input[type="search"]').focus()
      } else {
        const keywordsList = this.keywords.trim().split(' ') // 关键词按空格分割
        keywordsList.splice(target.dataset.index, 1) // 移除点击对象对应索引的关键词
        const keywords = keywordsList.join(' ') + ' ' // 赋值回去
        this.reset()
        this.search(keywords)
      }
    },
    handleDurationChange(val) {
      console.log('handleDurationChange: ', val)
      if (!val) {
        this.searchDateVals = [null, null, true]
        return
      }
      const today = dayjs()
      /** @type {Record<string, () => dayjs.Dayjs>} */
      const startDateMap = {
        within_last_day: () => today.subtract(1, 'day'),
        within_last_week: () => today.subtract(7, 'days'),
        within_last_month: () => today.subtract(1, 'month'),
        within_last_half_year: () => today.subtract(6, 'months'),
        within_last_year: () => today.subtract(1, 'year'),
      }
      const startDate = startDateMap[val] && startDateMap[val]()
      if (!startDate) return
      this.searchDateVals = [startDate.toDate(), today.toDate(), true]
    },
    onSelDateOpen() {
      // this.$nextTick(() => {
      this.$refs.selDate.scrollToDate(this.searchDateVals[0] || this.maxDate)
      // })
    },
    togglePopPreview() {
      this.showPopPreview = !this.showPopPreview
      if (!this.showPopPreview) {
        this.$nextTick(() => {
          this.reset()
          this.doSearch(this.keywords)
        })
      }
    },
    async search(keywords) {
      keywords = keywords.trim()
      console.log('search keywords: ', keywords)

      const param = this.$route.params.keyword?.trim() || ''
      if (param == keywords) {
        return
      }
      if (keywords == '') {
        this.keywords = ''
        this.$router.push('/search')
        return
      }

      this.showPopPreview = false
      this.keywords = keywords + ' '
      this.$router.push(`/search/${encodeURIComponent(keywords)}`)
      this.reset()
      this.doSearch(this.keywords)
    },
    doSearch: async function (val) {
      val = val || this.keywords
      this.keywords__ = val
      val = val.trim()
      if (val === '') {
        this.keywords = ''
        this.reset()
        return
      }
      console.log(`doSearch: ${val}`)

      if (BLOCK_SEARCH_WORD_RE.test(val) || !(await mintVerify(val))) {
        this.artList = []
        this.finished = true
        this.curPage = 1
        return
      }

      this.setSearchHistory(val)

      if (!this.isR18On) {
        if (BLOCK_INPUT_WORDS.some(e => e.test(val))) {
          this.artList = []
          this.finished = true
          this.curPage = 1
          return
        }
        val += ' -R-18 -R18 -18+'
      } else if (this.searchParams.mode == 'title_and_caption') {
        val = val.replace(/ -?R-18/g, '')
      }
      if (this.usersIriTag) val += ' ' + this.usersIriTag
      const params = _.pickBy(this.searchParams, Boolean)
      delete params.searchR18Type
      delete params.ratioFilter
      if (!this.isAIOn || val.includes(' -AI')) {
        params.search_ai_type = 1 // 不显示AI作品
      }
      if (this.loading || (!this.isPagination && this.finished)) return
      this.loading = true
      const res = await api.search(val, this.curPage, params)
      if (res.status === 0) {
        if (res.data.length) {
          let artList = res.data

          if (this.usersIriTag) {
            const match = this.usersIriTag.match(/(\d+)/)
            artList = artList.filter(e => e.like > Number(match && match[0]))
          }

          if (this.searchParams.searchR18Type == 'R' || this.keywords__.includes(' R-18')) {
            artList = artList.filter(e => e.x_restrict > 0)
          }

          if (this.searchParams.searchR18Type == 'S' || this.keywords__.includes(' -R-18')) {
            artList = artList.filter(e => e.x_restrict == 0)
          }

          if (this.searchParams.search_ai_type == '1' || this.keywords__.includes(' -AI')) {
            artList = artList.filter(e => !isAiIllust(e))
          }

          const { ratioFilter } = this.searchParams
          if (ratioFilter) {
            artList = artList.filter(e => {
              if (ratioFilter == 'w>h') return e.width > e.height
              if (ratioFilter == 'w=h') return e.width == e.height
              if (ratioFilter == 'w<h') return e.width < e.height
              return true
            })
          }

          artList = artList.filter(e => {
            return !(
              e.like < this.searchListMinFavNum ||
              BLOCK_RESULT_RE.test(JSON.stringify(e.tags)) ||
              BLOCK_RESULT_RE.test(e.title) ||
              BLOCK_RESULT_RE.test(e.caption)
            )
          })

          if (artList.length < 10) {
            console.log('------------- sleep')
            await sleep(800)
          }

          if (this.isPagination) {
            this.artList = artList
          } else {
            this.artList = _.uniqBy([
              ...this.artList,
              ...artList,
            ], 'id')
            this.curPage++
          }
        } else {
          this.finished = true
        }
        this.loading = false
      } else {
        this.$toast({
          message: res.msg,
        })
        await sleep(800)
        this.loading = false
        this.error = true
      }
    },
    toArtwork(art) {
      this.$store.dispatch('setGalleryList', this.artList)
      this.$router.push({
        name: 'Artwork',
        params: { id: art.id, art },
      })
    },
    onSearchInput: _.debounce(async function () {
      if (notSelfHibiApi) return
      if (!this.lastWord || !this.keywords.trim()) {
        this.autoCompleteTagList = []
        return
      }
      const id = this.lastWord.match(ARTWORK_LINK_RE)?.[1]
      if (id) {
        this.toPidPage(id)
        return
      }
      if (BLOCK_LAST_WORD_RE.test(this.lastWord)) {
        return
      }
      const res = await api.getTagsAutocomplete(this.lastWord)
      if (res.status == 0) {
        this.autoCompleteTagList = res.data
      }
    }, 500),
    onFocus() {
      this.focus = true // 获取焦点
    },
    async onSearch(searchType) {
      console.log('onSearch: ', this.keywords)
      this.focus = false
      let words = this.keywords
      if (searchType == 'R18') words = words.trim() + ' R-18'
      if (searchType == 'safe') words = words.trim() + ' -R-18'
      this.keywords = words + ' '
      this.$router.push(`/search/${encodeURIComponent(this.keywords.trim())}`)
      this.reset()
      this.doSearch(this.keywords)
    },
    searchTag(keywords) {
      console.log('------- searchTag: ', keywords)
      this.focus = false
      if (this.$route.params.keyword?.trim() != keywords.trim()) {
        this.reset()
        this.search(keywords + ' ')
      }
    },
    async searchUser() {
      this.$router.push(`/search_user/${encodeURIComponent(this.keywords.trim())}`)
    },
    toPidPage(id) {
      this.keywords = ''
      this.keywordsList = []
      this.lastWord = ''
      this.$router.push(`/artworks/${id}`)
    },
    toUidPage(id) {
      this.keywords = ''
      this.keywordsList = []
      this.lastWord = ''
      this.$router.push(`/users/${id}`)
    },
    toSpotlightPage(id) {
      this.keywords = ''
      this.keywordsList = []
      this.lastWord = ''
      this.$router.push(`/spotlight/${id}`)
    },
    clearHistory() {
      this.setSearchHistory(null)
    },
    ...mapActions(['setSearchHistory']),
  },
}
</script>

<style lang="stylus" scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.25s;
}

.fade-enter, .fade-leave-to {
  opacity: 0;
}

.search {
  position: relative;

  .search-bar-wrap {
    position: fixed;
    top: 0;
    left 0
    width: 100%;
    z-index: 3;
    transition: all 0.2s;

    // &.dropdown {
    //   height: 500px;
    // }

    ::v-deep {
      .van-icon-search {
        margin-top: 2px;
        margin-left: 4px;
        font-size: 0.4rem;
      }

      .van-icon-clear {
        margin-top: 2px;
        margin-right: -2px;
        font-size: 0.4rem;
      }

      .van-search__content {
        background #f5f5f5
      }
    }

    .search-bar {
      width: 100vw;
      height: 120px;
      padding-top 0.133rem
      padding-bottom 0
      backdrop-filter: saturate(200%) blur(10PX);
      background: rgba(255, 255, 255, 0.8);

      ::v-deep .van-cell {
        line-height: 0.6rem;

        input {
          display: inline-block;
          opacity: 0;
        }
      }
    }

    .search-bar-word {
      position: absolute;
      left: 1.5rem;
      top 50%
      margin-top -0.21334rem
      font-size: 0;
      width: 100%;
      max-width: 580px;
      height: 52px;
      border-radius: 8px;
      // overflow-x: scroll;
      white-space: nowrap;

      .placeholder {
        font-size: 0.3rem;
        line-height: 0.6rem;
        color: #adadad;
      }

      // box-sizing: border-box;
      ::v-deep .word {
        display: inline-block;
        color: #fff;
        background: #7bb7e7;
        padding: 10px 8px;
        margin: -3px 8px 0;
        border-radius: 8px;
        font-size: 24px;
        overflow: hidden;

        .text {
          border-right: 1px solid #acd9fd;
          padding-right: 8px;

          &.no-line {
            border-color: rgba(#fff, 0);
          }
        }

        .close {
          display: inline-block;
          width: 24px;
          height: 24px;
          background: url('~@/icons/close.svg');
          background-size: 100%;
        }
      }
    }

    .image-search-mask {
      position: fixed;
      // top: 128px;
      // top: env(safe-area-inset-top);
      top: 1.72rem;
      width: 100%;
      // max-width: 10rem;
      // height: calc(100% - 128px);
      // height: calc(100% - env(safe-area-inset-top));
      height: 100%;
      box-sizing: border-box;
      // pointer-events: none;
      background: rgba(0, 0, 0, 0.6);
      transition: all 0.2s;
    }
  }

  .search-history {
    // position: absolute;
    // margin-top: 150px;
    margin-bottom: 20px;
    width: 100%;
    padding: 0 6px;
    box-sizing: border-box;
    overflow: hidden;
    .title-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      height: 40px;
      font-size: 26px;
      margin: 8px 20px;
    }
  }

  .keyword {
    float: left;
    font-size: 24px;
    padding: 12px 20px;
    background: #eaeaea;
    border-radius: 26px;
    margin: 12px 12px;
    user-select: none;
    white-space: nowrap;
    max-width: 50%;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .image-search {
    position: fixed;
    top: 48px;
    right 50px
    z-index: 5;
  }

  .com_sel_tabs {
    position fixed
    z-index 3
    left 50%
    width 100%
    transform translateX(-50%)
    top 120px
    margin-bottom 0
    padding 0px 0px 20px
    backdrop-filter: saturate(200%) blur(10PX);
    background: rgba(255, 255, 255, 0.8);
  }

  .list-wrap {
    position: relative;
    z-index 1
    min-height: 100vh;
    padding-bottom: 120px;
    box-sizing: border-box;

    >.mask {
      display: none;
    }

    &.focus {
      >.mask {
        display: block;
        position: fixed;
        z-index 2
        top: 122px;
        width: 100%;
        // max-width: 10rem;
        height: calc(100% - 122px);
        box-sizing: border-box;
        // pointer-events: none;
        background: rgba(0, 0, 0, 0.6);
        transition: all 0.2s;
      }
    }
  }
}

.loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.result-list {
  margin: 10px;

  .card-box {
    display: flex;
    flex-direction: row;

    .column {
      width: 50%;

      .image-card {
        max-height: 360px;
        margin: 4px 2px;
      }
    }
  }
}

.show_pop_icon
  position absolute
  top: 22px;
  right: 40px;
  font-size 36px
  padding 20px

.search_params
  position relative
  top -24px
  @media screen and (max-width: 1280px)
    overflow-x: auto;
    &::-webkit-scrollbar
      display none
    ::v-deep .van-dropdown-menu
      padding-bottom 0.3rem
  @media screen and (min-width: 1281px)
    ::v-deep .van-dropdown-menu:not(.showPopPreview)
      >div:nth-child(2) .van-dropdown-item__content
        width: 14.5vw
        border-bottom-right-radius: 8PX
      >div:nth-child(3) .van-dropdown-item__content
        width: 12.5vw
        left: 12.5vw
        border-bottom-left-radius: 8PX
        border-bottom-right-radius: 8PX
      >div:nth-child(4) .van-dropdown-item__content
        width: 12.5vw
        left: 12.5vw*2
        border-bottom-left-radius: 8PX
        border-bottom-right-radius: 8PX
      >div:nth-child(6) .van-dropdown-item__content
        width: 12.5vw
        left: 12.5vw*4
        border-bottom-left-radius: 8PX
        border-bottom-right-radius: 8PX
      >div:nth-child(7) .van-dropdown-item__content
        width: 12.5vw
        left: 12.5vw*5
        border-bottom-left-radius: 8PX
        border-bottom-right-radius: 8PX
      >div:nth-child(8) .van-dropdown-item__content
        width: 12.5vw
        left: 12.5vw*6
        border-bottom-left-radius: 8PX
        border-bottom-right-radius: 8PX
      >div:nth-child(9) .van-dropdown-item__content
        width: 12.5vw
        left: unset
        right 0
        border-bottom-left-radius: 8PX

.search_param_sel
  height 70px

  ::v-deep .van-dropdown-menu__title
    font-size 0.26rem
  ::v-deep .van-dropdown-menu__bar
    background none
    height 100% !important
    @media screen and (max-width: 1280px)
      .van-dropdown-menu__item
        min-width: max-content;
        padding: 0 0.2rem;

.sel_search_date
  width 750px !important
  height 455PX
  margin: 0 auto;

.dropdown
  &.search-bar-wrap .search-bar
    background #fff

.search-dropdown
  position: fixed;
  top: 120px;
  left 0
  z-index: 4;
  width 100%
  background: #fff

  .pid-n-uid
    display flex
    flex-wrap wrap
    margin 0 20px 10px
    .keyword
      float none !important
      width fit-content
      margin: 0px 12px 12px 0

.search .list-wrap .result-list.is-pagination
  margin-bottom 0.5rem
  ::v-deep .van-list__finished-text
    display none
</style>
<style scoped>
.search_param_sel ::v-deep .van-dropdown-menu__title {
  font-size: max(0.26rem, 12PX);
}
</style>
