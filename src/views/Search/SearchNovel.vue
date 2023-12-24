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
    <div v-show="!keywords.trim()" class="com_sel_tabs">
      <div class="com_sel_tab" @click="$router.replace('/search')">{{ $t('common.illust_manga') }}</div>
      <div class="com_sel_tab cur">{{ $t('common.novel') }}</div>
      <div class="com_sel_tab" @click="$router.replace('/search_user')">{{ $t('common.user') }}</div>
    </div>
    <div class="list-wrap" :class="{ focus: focus }" :style="{ paddingTop: keywords.trim() ? '1.6rem' : '2.6rem' }">
      <PopularPreviewNovel v-if="(isSelfHibi && showPopPreview && keywords.trim())" :word="keywords" />
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
import _ from 'lodash'
import api from '@/api'
import { notSelfHibiApi } from '@/api/http'
import NovelCard from '@/components/NovelCard.vue'
import PopularPreviewNovel from './components/PopularPreviewNovel.vue'
import { mintVerify } from '@/utils/filter'
import { i18n } from '@/i18n'

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
    }
  },
  head: {
    title: i18n.t('search.search'),
  },
  computed: {
    ...mapState(['searchHistory']),
  },
  watch: {
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
      this.$router.push(`/search_novel/${keywords}`)
      this.showPopPreview = false
    },
    doSearch: _.throttle(async function (val) {
      val = val || this.keywords
      this.keywords__ = val
      val = val.trim()
      if (val === '') {
        this.keywords = ''
        this.reset()
        return
      }
      console.log(`doSearch: ${val}`)

      if (
        /スカラマシュ|散兵|スカ蛍|スカ空|スカナヒ|散荧|荧散|散空|空散|枫散|散枫|草散|散草|放浪者(原神)|流浪者(原神)|阿散|阿帽/i.test(val) ||
        !(await mintVerify(val))
      ) {
        this.artList = []
        this.finished = true
        this.curPage = 1
        return
      }

      this.setSearchHistory(val)

      this.loading = true
      const res = await api.searchNovel(val, this.curPage)
      if (res.status === 0) {
        if (res.data.length) {
          const artList = _.uniqBy([
            ...this.artList,
            ...res.data,
          ], 'id')

          if (!artList.length) {
            this.finished = true
            return
          }

          this.artList = artList

          this.curPage++
          // if (this.curPage > 9) this.finished = true
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
    }, 2500),
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
      const res = await api.getTagsAutocomplete(this.lastWord)
      if (res.status == 0) {
        this.autoCompleteTagList = res.data
      }
    }, 500),
    onFocus() {
      this.focus = true // 获取焦点
    },
    onSearch() {
      console.log('onSearch: ', this.keywords)
      this.focus = false
      // document.querySelector('.app-main')?.scrollTo(0, 0)
      this.keywords += ' '
      this.$router.push(`/search_novel/${this.keywords.trim()}`)
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
      backdrop-filter: saturate(200%) blur(6px);
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
    backdrop-filter: saturate(200%) blur(6px);
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
