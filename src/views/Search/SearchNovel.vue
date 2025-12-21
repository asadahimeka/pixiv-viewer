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
        @click="(showPopPreview = !showPopPreview)"
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
        <template v-for="n in pidOrUidList">
          <div :key="'n_' + n" class="keyword" @click="toArtwork(n)">→ {{ $t('common.novel') }} ID: {{ n }} </div>
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
    <div v-show="!keywords.trim()" class="com_sel_tabs" :style="focus?'opacity:0;pointer-events:none':''">
      <div class="com_sel_tab" @click="$router.replace('/search')">{{ $t('common.illust_manga') }}</div>
      <div class="com_sel_tab cur">{{ $t('common.novel') }}</div>
      <div class="com_sel_tab" @click="$router.replace('/search_user')">{{ $t('common.user') }}</div>
      <div class="com_sel_tab" @click="$router.replace('/collection')">{{ $t('dZ93cWZJ03hu5emsVwgjA') }}</div>
    </div>
    <div class="list-wrap" :class="{ focus: focus }" :style="{ paddingTop: keywords.trim() ? '1.6rem' : '2.6rem' }">
      <div v-show="keywords.trim()" class="search_params">
        <van-dropdown-menu class="search_param_sel" active-color="#f2c358">
          <template v-if="!showPopPreview">
            <van-dropdown-item v-model="searchParams.mode" :options="searchModes" />
            <van-dropdown-item v-model="searchParams.sort" :options="searchOrders" />
          </template>
          <van-dropdown-item
            ref="s_date"
            :title="searchParams.start_date? searchParams.start_date + '~' + searchParams.end_date : $t('common.date')"
            :lazy-render="false"
            @open="onSelDateOpen"
          >
            <van-calendar
              ref="selDate"
              color="#f2c358"
              class="sel_search_date"
              type="range"
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
            <van-dropdown-item v-model="usersIriTag" :options="usersIriTags" />
            <van-dropdown-item v-model="searchParams.duration" :options="searchDuration" />
            <van-dropdown-item v-if="showNonCNLangParam" v-model="nonCNLang" :options="nonCNLangOptions" />
          </template>
        </van-dropdown-menu>
      </div>
      <PopularPreviewNovel v-if="(isSelfHibi && showPopPreview && keywords.trim())" ref="popPreview" :word="keywords" :params="searchParams" />
      <van-list
        v-else-if="keywords.trim()"
        v-model="loading"
        class="result-list"
        :loading-text="$t('tips.loading')"
        :finished="finished"
        :error.sync="error"
        :immediate-check="false"
        :offset="800"
        :finished-text="$t('tips.no_more')"
        :error-text="$t('tips.net_err')"
        @load="doSearch"
      >
        <masonry v-bind="$store.getters.novelMyProps">
          <NovelCard v-for="art in artList" :key="art.id" :artwork="art" @click-card="toArtwork($event)" />
        </masonry>
      </van-list>
      <TagsNovel v-if="!keywords.trim()" @search="searchTag" />
      <van-loading v-show="keywords.trim() && artList.length == 0 && !finished" class="loading" :size="'50px'" />
      <div class="mask" @click="focus = false"></div>
    </div>
  </div>
</template>

<script>
import TagsNovel from './components/TagsNovel'
import { mapState, mapActions } from 'vuex'
import dayjs from 'dayjs'
import _ from '@/lib/lodash'
import api from '@/api'
import store from '@/store'
import { notSelfHibiApi } from '@/consts'
import NovelCard from '@/components/NovelCard.vue'
import PopularPreviewNovel from './components/PopularPreviewNovel.vue'
import { mintVerify, BLOCK_SEARCH_WORD_RE, BLOCK_INPUT_WORDS, BLOCK_LAST_WORD_RE } from '@/utils/filter'
import { i18n, isCNLocale } from '@/i18n'
import { detectLanguage } from '@/utils/novel'
import { sleep } from '@/utils'

export default {
  name: 'Search',
  components: {
    TagsNovel,
    NovelCard,
    PopularPreviewNovel,
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
      maskShow: false,
      autoCompleteTagList: [],
      showPopPreview: false,
      isSelfHibi: !notSelfHibiApi,
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
        sort: 'date_desc',
        duration: '',
        start_date: '',
        end_date: '',
      },
      searchDateVals: [null, null],
      searchModes: [
        { text: this.$t('search.mode.partial'), value: 'partial_match_for_tags' },
        { text: this.$t('search.mode.exact'), value: 'exact_match_for_tags' },
        { text: this.$t('-cm0i-Kb6i1rhmSk3FXnf'), value: 'text' },
        { text: this.$t('vCd3kQ1QluX-OCbnI2v_6'), value: 'keyword' },
      ],
      searchOrders: [
        { text: this.$t('search.date.desc'), value: 'date_desc' },
        { text: this.$t('search.date.asc'), value: 'date_asc' },
      ],
      searchDuration: [
        { text: this.$t('search.dura.ph'), value: '' },
        { text: this.$t('search.dura.day'), value: 'within_last_day' },
        { text: this.$t('search.dura.week'), value: 'within_last_week' },
        { text: this.$t('search.dura.month'), value: 'within_last_month' },
      ],
      showNonCNLangParam: window.APP_CONFIG.useLocalAppApi && isCNLocale(),
      nonCNLang: 'no',
      nonCNLangOptions: [
        { text: '显示非中文', value: 'no' },
        { text: '隐藏非中文', value: 'yes' },
      ],
    }
  },
  head() {
    return {
      title: this.$t('search.search'),
    }
  },
  computed: {
    ...mapState(['searchHistory']),
    pidOrUidList() {
      return this.keywords.match(/(\d+)/g) || []
    },
    showR18OrSafeQuickTag() {
      return store.getters.isR18On &&
        !this.pidOrUidList.length &&
        !this.keywords.includes('R-18')
    },
  },
  watch: {
    usersIriTag(val) {
      // window.umami?.track('search_novel_usersIriTag', { val })
      this.reset()
      this.doSearch(this.keywords)
    },
    nonCNLang(val) {
      window.umami?.track('search_novel_nonCNLang', { val })
      this.reset()
      this.doSearch(this.keywords)
    },
    searchParams: {
      deep: true,
      handler(val) {
        console.log('val: ', val)
        // window.umami?.track('search_novel_params', { val })
        if (this.showPopPreview) {
          this.$refs.popPreview.getList()
        } else {
          this.reset()
          this.doSearch(this.keywords)
        }
      },
    },
    searchDateVals(vals) {
      console.log('vals: ', vals)
      Object.assign(this.searchParams, {
        start_date: vals[0] && dayjs(vals[0]).format('YYYY-MM-DD'),
        end_date: vals[1] && dayjs(vals[1]).format('YYYY-MM-DD'),
      })
    },
    $route() {
      if (!['SearchNovel', 'SearchNovelKeyword'].includes(this.$route.name)) {
        return
      }
      const keyword = this.$route.params.keyword || ''

      if (this.keywords.trim() != keyword.trim()) {
        this.showPopPreview = false
        this.keywords = keyword + ' '
        this.reset()
        this.doSearch(this.keywords)
      }

      if (keyword == '') {
        this.showPopPreview = false
      }
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
  },
  mounted() {
    console.log('mounted: search')

    const input = document.querySelector('input[type="search"]')
    document.addEventListener('selectionchange', () => {
      if (this.focus) { input.setSelectionRange(input.value.length, input.value.length) }
    })

    const keyword = this.$route.params.keyword
    if (['SearchNovel', 'SearchNovelKeyword'].includes(this.$route.name) && keyword) {
      this.keywords = keyword + ' '
      this.reset()
      this.doSearch(this.keywords)
    }
  },
  methods: {
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
        document.querySelector('input[type="search"]').focus()
      } else {
        const keywordsList = this.keywords.trim().split(' ') // 关键词按空格分割
        keywordsList.splice(target.dataset.index, 1) // 移除点击对象对应索引的关键词
        const keywords = keywordsList.join(' ') + ' ' // 赋值回去
        this.reset()
        this.search(keywords)
      }
    },
    onSelDateOpen() {
      this.$refs.selDate.scrollToDate(this.searchDateVals[0] || this.maxDate)
    },
    search(keywords) {
      keywords = keywords.trim()
      console.log('search keywords: ', keywords)

      const param = this.$route.params.keyword?.trim() || ''
      if (param == keywords) {
        return
      }
      if (keywords == '') {
        this.$router.push('/search_novel')
        // document.querySelector('.app-main')?.scrollTo(0, 0)
        return
      }
      this.$router.push(`/search_novel/${encodeURIComponent(keywords)}`)
      this.showPopPreview = false
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

      if (!(this.$store.state.contentSetting.r18 || this.$store.state.contentSetting.r18g)) {
        if (BLOCK_INPUT_WORDS.some(e => e.test(val))) {
          this.artList = []
          this.finished = true
          this.curPage = 1
          return
        }
        val += ' -R-18 -R18 -18+'
      } else if (this.searchParams.mode == 'text') {
        val = val.replace(/ -?R-18/g, '')
      }
      if (this.usersIriTag) val += ' ' + this.usersIriTag
      const params = _.pickBy(this.searchParams, Boolean)
      if (!this.$store.state.contentSetting.ai) {
        params.search_ai_type = 1
      }

      this.loading = true
      const res = await api.searchNovel(val, this.curPage, params)
      if (res.status === 0) {
        if (res.data.length) {
          let artList = res.data

          if (this.usersIriTag) {
            const match = this.usersIriTag.match(/(\d+)/)
            artList = artList.filter(e => e.like > Number(match && match[0]))
          }

          if (this.nonCNLang == 'yes') {
            artList = artList.filter(e => detectLanguage(e.title + e.caption).language == 'zh')
          }

          if (this.keywords__.includes(' R-18')) {
            artList = artList.filter(e => e.x_restrict > 0)
          }

          if (this.keywords__.includes(' -R-18')) {
            artList = artList.filter(e => e.x_restrict == 0)
          }

          if (artList.length < 10) {
            console.log('------------- sleep')
            await sleep(800)
          }

          this.artList = _.uniqBy([
            ...this.artList,
            ...artList,
          ], 'id')
        }
        this.loading = false
        if (res.hasNext === false) {
          this.finished = true
        } else {
          this.curPage++
        }
      } else {
        this.$toast({
          message: res.msg,
        })
        this.loading = false
        this.error = true
      }
    },
    toArtwork(id) {
      this.$router.push({
        name: 'NovelDetail',
        params: { id },
      })
    },
    onSearchInput: _.debounce(async function () {
      if (notSelfHibiApi) return
      if (!this.lastWord || !this.keywords.trim()) {
        this.autoCompleteTagList = []
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
    onSearch(searchType) {
      console.log('onSearch: ', this.keywords)
      this.focus = false
      let words = this.keywords
      if (searchType == 'R18') words = words.trim() + ' R-18'
      if (searchType == 'safe') words = words.trim() + ' -R-18'
      this.keywords = words + ' '
      this.$router.push(`/search_novel/${encodeURIComponent(this.keywords.trim())}`)
      this.reset()
      this.doSearch(this.keywords)
    },
    searchTag(keywords) {
      console.log('------- searchTag: ', keywords)
      this.focus = false
      // document.querySelector('.app-main')?.scrollTo(0, 0)
      if (this.$route.params.keyword?.trim() != keywords.trim()) {
        this.reset()
        this.search(keywords + ' ')
      }
    },
    clearHistory() {
      this.setSearchHistory(null)
    },
    switchImageSearchShow(flag) {
      if (!flag) this.$refs.imageSearch.reset()
      this.maskShow = flag
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

.search_param_sel
  height 70px

  ::v-deep .van-dropdown-menu__title
    font-size 0.24rem
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

.users-iri-sel
  position absolute
  top 30px
  left 82px
  height 70px
  background none

  ::v-deep .van-dropdown-menu__title
    font-size 0.24rem
  ::v-deep .van-dropdown-menu__bar
    height 100% !important
    background-color transparent
    box-shadow none

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

</style>
