<template>
  <div class="search">
    <div class="search-bar-wrap" :class="{ dropdown: focus }">
      <van-search class="search-bar" v-model="keywords" shape="round" placeholder="请输入搜索关键词" maxlength="50"
        :clearable="false" @input="onSearchInput" @focus="onFocus" @search="onSearch" />
      <div class="search-bar-word" @click="handleWordsClick($event)" ref="words">
        <span class="placeholder" v-if="keywordsList.length === 0 && !lastWord">请输入搜索关键词</span>
        <div class="word" v-for="(word, index) in keywordsList" :key="index">
          <span class="text">{{ word }}</span>
          <span class="close" :data-index="index"></span>
        </div>
        <div class="word" v-if="lastWord && keywords.trim()">
          <span class="text no-line">{{ lastWord }}</span>
        </div>
      </div>
      <van-dropdown-menu class="users-iri-sel" active-color="#f2c358">
        <van-dropdown-item v-model="usersIriTag" :options="usersIriTags" />
      </van-dropdown-menu>
      <div v-show="(keywords.trim() && artList.length)" class="show_pop_icon"
        @click="(showPopPreview = !showPopPreview)">
        <Icon class="icon" name="popular"></Icon>
      </div>
      <div v-if="focus" class="search-dropdown">
        <div v-if="keywords.trim()" class="pid-n-uid">
          <div class="keyword" @click="onSearch">搜索标签 {{ keywords.trim() }} </div>
          <div class="keyword" @click="$router.push(`/searchuser/${keywords.trim()}`)">搜索用户 {{ keywords.trim() }} </div>
        </div>
        <div v-if="pidOrUidList.length" class="pid-n-uid">
          <template v-for="n in pidOrUidList">
            <div :key="'p_' + n" class="keyword" @click="toPidPage(n)">→ 作品 ID: {{ n }} </div>
            <div :key="'u_' + n" class="keyword" @click="toUidPage(n)">→ 用户 ID: {{ n }} </div>
            <div :key="'s_' + n" class="keyword" @click="toSpotlightPage(n)">→ 特辑 ID: {{ n }} </div>
          </template>
        </div>
        <div v-if="keywords.trim() && autoCompleteTagList.length" class="search-history">
          <div class="title-bar">搜索建议</div>
          <div v-for="tag in autoCompleteTagList" :key="tag" class="keyword" @click="searchTag(tag)">
            {{ tag }}
          </div>
        </div>
        <div v-if="!keywords.trim() && searchHistory.length > 0" class="search-history">
          <div class="title-bar">
            历史搜索
            <div @click="clearHistory">
              <Icon name="del" scale="2"></Icon>
            </div>
          </div>
          <div class="keyword" v-for="(word, index) in searchHistory" :key="index" @click="searchTag(word)">
            {{ word }}
          </div>
        </div>
      </div>
    </div>
    <transition name="fade">
      <ImageSearch v-show="!focus && !keywords.trim()" ref="imageSearch" key="container" />
    </transition>
    <div class="list-wrap" :class="{ focus: focus }">
      <PopularPreview v-if="(showPopPreview && keywords.trim())" :word="keywords" />
      <van-list v-show="keywords.trim()" class="result-list" v-model="loading" :finished="finished" :error.sync="error"
        :immediate-check="false" :offset="800" finished-text="没有更多了" error-text="网络异常，点击重新加载" @load="doSearch">
        <masonry v-bind="$store.getters.wfProps">
          <ImageCard mode="all" :artwork="art" @click-card="toArtwork($event)" v-for="art in artList" :key="art.id" />
        </masonry>
      </van-list>
      <Tags v-if="!keywords.trim()" @search="searchTag" />
      <van-loading v-show="keywords.trim() && artList.length == 0 && !finished" class="loading" :size="'50px'" />
      <div class="mask" @click="focus = false"></div>
    </div>
  </div>
</template>

<script>
import { Search, List, Loading, Empty, Icon, DropdownMenu, DropdownItem } from "vant";
import ImageCard from "@/components/ImageCard";
import Tags from "./components/Tags";
import ImageSearch from "./components/ImageSearch";
import { mapState, mapActions } from "vuex";
import _debounce from "lodash/debounce";
import _throttle from "lodash/throttle";
import _uniqBy from "lodash/uniqBy";
import api from "@/api";
import { notSelfHibiApi } from "@/api/http"
import PopularPreview from "./components/PopularPreview.vue";

export default {
  name: 'Search',
  data() {
    return {
      scrollTop: 0,
      keywords__: "",
      keywords: "", // 关键词搜索框真实搜索内容
      keywordsList: [], // 关键词搜索框分词列表（空格分割）
      lastWord: "", // 正在输入的关键词
      focus: false, // 编辑框是否获取焦点
      curPage: 1,
      artList: [], // 作品列表
      error: false,
      loading: false,
      finished: false,
      maskShow: false,
      imageSearchShow: true,
      autoCompleteTagList: [],
      usersIriTag: '',
      usersIriTags: [
        { text: 'users入り', value: '' },
        { text: '30000users入り', value: '30000users入り' },
        { text: '20000users入り', value: '20000users入り' },
        { text: '10000users入り', value: '10000users入り' },
        { text: '7500users入り', value: '7500users入り' },
        { text: '5000users入り', value: '5000users入り' },
        { text: '1000users入り', value: '1000users入り' },
        { text: '500users入り', value: '500users入り' },
        { text: '250users入り', value: '250users入り' },
        { text: '100users入り', value: '100users入り' },
      ],
      showPopPreview: false,
    };
  },
  watch: {
    $route() {
      if (!this.$route.name.startsWith('Search')) return
      let keyword = this.$route.params.keyword || ''

      if (this.keywords.trim() != keyword.trim()) {
        this.keywords = keyword + " ";
        this.reset();
        this.doSearch(this.keywords);
      }

      if (keyword == '') {
        document.querySelector('.app-main')?.scrollTo(0, 0)
      }
    },
    usersIriTag() {
      this.reset();
      this.doSearch(this.keywords);
    },
    keywords() {
      console.log('watch keywords: ', this.keywords)
      // 当关键词内容发生变化
      let keywordsList = this.keywords
        .replace(/\s\s+/g, " ") // 去除多余空格（'abc   ' => 'abc '）
        .trimStart() // 去除开头空白字符
        .split(" "); // 按空格分割

      if (keywordsList.length === 1 && keywordsList[0] === "") {
        // 只输入空格的情况清空关键词列表并返回
        this.keywordsList = [];
        this.reset();
        return;
      }

      this.lastWord = keywordsList.pop(); // 最顶部的元素即为正在输入的关键词

      this.keywordsList = keywordsList; // 设置关键词组

      this.$nextTick(() => {
        // 保持滚动条在尾部，使用nextTick确保及时更新
        this.$refs.words.scrollLeft = this.$refs.words.clientWidth;
        let listWrap = document.querySelector(".list-wrap");
        listWrap && listWrap.scrollTo({ top: 0 });
      });
    }
  },
  computed: {
    ...mapState(["searchHistory"]),
    pidOrUidList() {
      return this.keywords.match(/(\d+)/g) || []
    }
  },
  methods: {
    reset() {
      this.curPage = 1;
      this.artList = [];
      this.loading = false;
      this.finished = false;
    },
    handleWordsClick(e) {
      // 处理点击事件
      let target = e.target;
      if (target.className !== "close") {
        // 点击对象不为关闭按钮则输入框获取焦点
        document.querySelector('input[type="search"]').focus();
        return;
      } else {
        let keywordsList = this.keywords.trim().split(" "); // 关键词按空格分割
        keywordsList.splice(target.dataset.index, 1); // 移除点击对象对应索引的关键词
        let keywords = keywordsList.join(" ") + " "; // 赋值回去
        this.reset();
        this.search(keywords);
      }
    },
    search(keywords) {
      keywords = keywords.trim()
      console.log('search keywords: ', keywords)

      let param = this.$route.params.keyword?.trim() || ''
      if (param == keywords) {
        return
      }
      if (keywords == '') {
        this.$router.push(`/search`)
        document.querySelector('.app-main')?.scrollTo(0, 0)
        return
      }
      this.$router.push(`/search/${keywords}`)
      this.showPopPreview = false
    },
    doSearch: _throttle(async function (val) {
      val = val || this.keywords;
      this.keywords__ = val;
      val = val.trim();
      if (val === "") {
        this.keywords = "";
        this.reset();
        return;
      }
      console.log(`doSearch: ${val}`)

      this.setSearchHistory(val);

      if (this.usersIriTag) val += ' ' + this.usersIriTag
      this.loading = true
      // window.umami?.trackEvent('Search Tag', { type: 'search_tag', tag: val.replace(/\s+/g, '_') })
      let res = await api.search(val, this.curPage);
      if (res.status === 0) {
        if (res.data.length) {
          let artList = _uniqBy([
            ...this.artList,
            ...res.data
          ], 'id')

          if (!artList.length) {
            this.finished = true
            return
          }

          if (this.usersIriTag) {
            let match = this.usersIriTag.match(/(\d+)/)
            artList = artList.filter(e => e.like > Number(match && match[0]))
          }

          artList = artList.filter(e => {
            return !(
              e.like < 5 ||
              /恋童|ペド|幼女/.test(JSON.stringify(e.tags)) ||
              /恋童|幼女|进群|加好友|度盘/.test(e.title) ||
              /恋童|幼女|进群|加好友|度盘/.test(e.caption)
            )
          })

          this.artList = artList;

          this.curPage++;
          if (this.curPage > 9) this.finished = true;
        } else {
          this.finished = true;
        }
        this.loading = false;

      } else {
        this.$toast({
          message: res.msg
        });
        this.loading = false;
        this.error = true;
      }

    }, 1500),
    odd(list) {
      return list.filter((_, index) => (index + 1) % 2);
    },
    even(list) {
      return list.filter((_, index) => !((index + 1) % 2));
    },
    toArtwork(id) {
      this.$router.push({
        name: "Artwork",
        params: { id, list: this.artList }
      });
    },
    onSearchInput: _debounce(async function () {
      if (notSelfHibiApi) return
      if (!this.lastWord || !this.keywords.trim()) {
        this.autoCompleteTagList = []
        return
      }
      let res = await api.getTagsAutocomplete(this.lastWord)
      if (res.status == 0) {
        this.autoCompleteTagList = res.data
      }
    }, 500),
    onFocus() {
      this.focus = true; // 获取焦点
    },
    onSearch() {
      console.log('onSearch: ', this.keywords)
      this.focus = false
      document.querySelector('.app-main')?.scrollTo(0, 0)
      this.keywords += ' '
      this.$router.push(`/search/${this.keywords.trim()}`)
      this.reset();
      this.doSearch(this.keywords);
    },
    searchTag(keywords) {
      console.log('------- searchTag: ', keywords)
      this.focus = false
      document.querySelector('.app-main')?.scrollTo(0, 0)
      if (this.$route.params.keyword?.trim() != keywords.trim()) {
        this.reset();
        this.search(keywords + ' ');
      }
    },
    toPidPage(id) {
      this.keywords = "";
      this.keywordsList = [];
      this.lastWord = "";
      this.$router.push(`/artworks/${id}`);
    },
    toUidPage(id) {
      this.keywords = "";
      this.keywordsList = [];
      this.lastWord = "";
      this.$router.push(`/users/${id}`);
    },
    toSpotlightPage(id) {
      this.keywords = "";
      this.keywordsList = [];
      this.lastWord = "";
      this.$router.push(`/spotlight/${id}`);
    },
    clearHistory() {
      this.setSearchHistory(null);
    },
    switchImageSearchShow(flag) {
      if (!flag) this.$refs.imageSearch.reset();
      this.maskShow = flag;
    },
    ...mapActions(["setSearchHistory"])
  },
  mounted() {
    console.log('mounted: search')
    document.querySelector('.app-main')?.scrollTo(0, 0)

    let input = document.querySelector('input[type="search"]');
    document.addEventListener("selectionchange", () => {
      if (this.focus)
        input.setSelectionRange(input.value.length, input.value.length);
    });

    let keyword = this.$route.params.keyword;
    if (this.$route.name.startsWith("Search") && keyword) {
      this.keywords = keyword + " ";
      this.reset();
      this.doSearch(this.keywords);
    }
  },
  components: {
    Tags,
    ImageSearch,
    [Search.name]: Search,
    [List.name]: List,
    [Loading.name]: Loading,
    [Empty.name]: Empty,
    [Icon.name]: Icon,
    [DropdownMenu.name]: DropdownMenu,
    [DropdownItem.name]: DropdownItem,
    ImageCard,
    PopularPreview
  }
};
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
    // top: 60px;
    // top: env(safe-area-inset-top);
    top: 0;
    width: 100%;
    // max-width: 10rem;
    // min-height: 122px;
    background: #fff;
    z-index: 2;
    transition: all 0.2s;

    &.dropdown {
      // height: 500px;
    }

    ::v-deep {
      .van-icon-search {
        margin-top: 2px;
        margin-left: 4px;
        font-size: 20px;
      }

      .van-icon-clear {
        margin-top: 2px;
        margin-right: -2px;
        font-size: 20px;
      }
    }

    .search-bar {
      position: absolute;
      width: 100%;
      height: 128px;
      // backdrop-filter: blur(6px);
      backdrop-filter: saturate(200%) blur(6px);
      background: rgba(255, 255, 255, 0.8);


      // top: 26px;
      ::v-deep .van-cell {
        line-height: 32px;

        input {
          display: inline-block;
          opacity: 0;
        }
      }
    }

    .search-bar-word {
      position: absolute;
      top: 38.5px;
      left: 280px;
      font-size: 0;
      width: 100%;
      max-width: 580px;
      height: 52px;
      border-radius: 8px;
      // overflow-x: scroll;
      white-space: nowrap;

      .placeholder {
        font-size: 26px;
        line-height: 52px;
        color: #adadad;
      }

      // box-sizing: border-box;
      ::v-deep .word {
        display: inline-block;
        color: #fff;
        background: #7bb7e7;
        padding: 10px 8px;
        margin: 0 8px;
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
      position: absolute;
      top: 33px;
      width: 100%;
      z-index: 1;
    }
  }

  .list-wrap {
    position: relative;
    min-height: 100vh;
    // overflow-y: scroll;
    padding-top: 122px;
    padding-bottom: 120px;
    // padding-bottom: calc(100px + env(safe-area-inset-bottom));
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
  margin: 0 2px;

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
  top 28px
  left 82px
  height 70px
  background none

  ::v-deep .van-dropdown-menu__title
    font-size 0.24rem
  ::v-deep .van-dropdown-menu__bar
    height 100% !important
    background-color transparent
    box-shadow none

.search-dropdown
  margin-top 130px
  .pid-n-uid
    display flex
    flex-wrap wrap
    margin 0 20px 10px
    .keyword
      float none !important
      width fit-content
      margin: 0px 12px 12px 0

</style>
