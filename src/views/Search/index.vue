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
    </div>
    <div v-if="focus" class="search-dropdown">
      <div v-if="keywords.trim()" class="pid-n-uid">
        <div class="keyword" @click="onSearch">{{ $t('search.seach_tag') }} {{ keywords.trim() }} </div>
        <template v-if="isR18On && !pidOrUidList.length">
          <div class="keyword" @click="onSearch('R18')">{{ $t('pL1gF_vTo1c_iF5GpBIDA') }} {{ keywords.trim() }} </div>
          <div class="keyword" @click="onSearch('safe')">{{ $t('IxG-Y2odr_0OKUJbaqV0-') }} {{ keywords.trim() }} </div>
        </template>
        <div v-if="isSelfHibi" class="keyword" @click="searchUser">
          {{ $t('search.search_user') }} {{ keywords.trim() }}
        </div>
      </div>
      <div v-if="pidOrUidList.length" class="pid-n-uid">
        <template v-for="n in pidOrUidList">
          <div :key="'p_' + n" class="keyword" @click="toPidPage(n)">→ {{ $t('common.illust_manga') }} ID: {{ n }} </div>
          <div :key="'u_' + n" class="keyword" @click="toUidPage(n)">→ {{ $t('common.user') }} ID: {{ n }} </div>
          <div :key="'n_' + n" class="keyword" @click="toNovelPage(n)">→ {{ $t('common.novel') }} ID: {{ n }} </div>
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
    <ImageSearch v-show="!focus && !keywords.trim()" ref="imageSearch" key="container" />
    <div class="com_sel_tabs" :style="focus?'opacity:0;pointer-events:none':''">
      <div class="com_sel_tab cur">{{ $t('common.illust_manga') }}</div>
      <div class="com_sel_tab" @click="$router.replace('/search_novel')">{{ $t('common.novel') }}</div>
      <div class="com_sel_tab" @click="$router.replace('/search_user')">{{ $t('common.user') }}</div>
      <div class="com_sel_tab" @click="$router.replace('/collection')">{{ $t('dZ93cWZJ03hu5emsVwgjA') }}</div>
    </div>
    <div class="list-wrap" :class="{ focus: focus }" :style="{ paddingTop: '2.6rem' }">
      <Tags @search="tag => searchTag(tag, true)" />
      <div class="mask" @click="focus = false"></div>
    </div>
  </div>
</template>

<script>
import _ from '@/lib/lodash'
import { mapState, mapActions } from 'vuex'
import { notSelfHibiApi } from '@/consts'
import { BLOCK_LAST_WORD_RE } from '@/utils/filter'
import api from '@/api'
import store from '@/store'
import Tags from './components/Tags'
import ImageSearch from './components/ImageSearch'

export default {
  name: 'Search',
  components: {
    Tags,
    ImageSearch,
  },
  data() {
    return {
      keywords: '', // 关键词搜索框真实搜索内容
      keywordsList: [], // 关键词搜索框分词列表（空格分割）
      lastWord: '', // 正在输入的关键词
      focus: false, // 编辑框是否获取焦点
      imageSearchShow: true,
      autoCompleteTagList: [],
      isSelfHibi: !notSelfHibiApi,
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
    isR18On() {
      return store.getters.isR18On
    },
  },
  watch: {
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
  methods: {
    reset() {
      this.focus = false
      this.keywords = ''
      this.keywordsList = []
      this.lastWord = ''
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
        this.search(keywords)
      }
    },
    async search(keywords, isQueryTagStory = false) {
      this.reset()
      keywords = keywords.trim()
      console.log('search keywords: ', keywords)
      this.$router.push({
        path: `/search/${encodeURIComponent(keywords)}`,
        query: isQueryTagStory ? { tss: '1' } : {},
      })
    },
    onSearchInput: _.debounce(async function () {
      if (notSelfHibiApi) return
      if (!this.lastWord || !this.keywords.trim()) {
        this.autoCompleteTagList = []
        return
      }
      const id = this.lastWord.match(/https?:\/\/.+\/artworks\/(\d+)/i)?.[1]
      if (id) {
        this.toPidPage(id)
        return
      }
      const uid = this.lastWord.match(/https?:\/\/.+\/users\/(\d+)/i)?.[1]
      if (uid) {
        this.toUidPage(uid)
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
      this.reset()
      if (searchType == 'R18') words = words.trim() + ' R-18'
      if (searchType == 'safe') words = words.trim() + ' -R-18'
      this.$router.push(`/search/${encodeURIComponent(words.trim())}`)
    },
    searchTag(keywords, isQueryTagStory = false) {
      console.log('------- searchTag: ', keywords)
      this.search(keywords + ' ', isQueryTagStory)
    },
    async searchUser() {
      this.$router.push(`/search_user/${encodeURIComponent(this.keywords.trim())}`)
    },
    toPidPage(id) {
      this.reset()
      this.$router.push(`/artworks/${id}`)
    },
    toUidPage(id) {
      this.reset()
      this.$router.push(`/users/${id}`)
    },
    toSpotlightPage(id) {
      this.reset()
      this.$router.push(`/spotlight/${id}`)
    },
    toNovelPage(id) {
      this.reset()
      this.$router.push(`/novel/${id}`)
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
    top: 35px;
    right 30px
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

.search_param_sel
  height 70px

  ::v-deep .van-dropdown-menu__title
    font-size 0.24rem
  ::v-deep .van-dropdown-menu__bar
    background none
    height 100% !important
    .van-dropdown-menu__item:first-child,
    .van-dropdown-menu__item:nth-child(2)
      flex 1.3

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

</style>
