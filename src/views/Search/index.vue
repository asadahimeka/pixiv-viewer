<template>
  <div class="search">
    <form class="search-bar-wrap" :class="{dropdown: focus}" action="/">
      <van-search
        class="search-bar"
        v-model="keywords"
        shape="round"
        placeholder="请输入搜索关键词"
        maxlength="50"
        @search="onBlur(true)"
        @cancel="onCancel"
        @focus="onFocus"
        @blur="onBlur(false)"
      ></van-search>
      <div class="search-bar-word" @click="handleWordsClick($event)" ref="words">
        <span class="placeholder" v-if="keywordsList.length===0 && !lastWord">请输入搜索关键词</span>
        <div class="word" v-for="(keyword, index) in keywordsList" :key="index">
          <span class="text">{{keyword}}</span>
          <span class="close" :data-index="index"></span>
        </div>
        <div class="word" v-if="lastWord">
          <span class="text no-line">{{lastWord}}</span>
        </div>
      </div>
      <div class="search-history" v-if="searchHistory.length>0 && focus">
        <div class="title-bar">
          历史搜索
          <div @click="clearHistory">
            <Icon name="del" scale="2"></Icon>
          </div>
        </div>
        <div
          class="keyword"
          @click="searchTag(keyword)"
          v-for="(keyword, index) in searchHistory"
          :key="index"
        >{{keyword}}</div>
      </div>
      <!-- <transition-group name="fade">
        <ImageSearch
          v-show="!focus && imageSearchShow"
          @show="switchImageSearchShow(true)"
          ref="imageSearch"
          key="container"
        ></ImageSearch>
        <div
          class="image-search-mask"
          @click="switchImageSearchShow(false)"
          v-show="!focus && maskShow"
          key="mask"
        ></div>
      </transition-group> -->
    </form>
    <div class="list-wrap" :class="{focus: focus}">
      <van-list
        v-if="artList.length>0"
        class="result-list"
        v-model="loading"
        :finished="finished"
        finished-text="没有更多了"
        :error.sync="error"
        error-text="网络异常，点击重新加载"
        @load="search"
      >
        <masonry v-bind="$store.getters.wfProps">
          <ImageCard
            mode="all"
            :artwork="art"
            @click-card="toArtwork($event)"
            v-for="art in artList"
            :key="art.id"
          />
        </masonry>
        <!-- <div class="card-box">
          <div class="column">
            <ImageCard
              mode="cover"
              :artwork="art"
              @click-card="toArtwork($event)"
              v-for="art in odd(artList.slice(3))"
              :key="art.id"
            />
          </div>
          <div class="column">
            <ImageCard
              mode="cover"
              :artwork="art"
              @click-card="toArtwork($event)"
              v-for="art in even(artList.slice(3))"
              :key="art.id"
            />
          </div>
        </div> -->
      </van-list>
      <Tags v-if="keywords.trim()===''" @search="searchTag" />
      <van-loading
        v-show="keywords.trim()!=='' && artList.length===0"
        class="loading"
        :size="'50px'"
      />
      <div class="mask" @click="onBlur(true)"></div>
    </div>
  </div>
</template>

<script>
import { Search, List, Loading, Empty, Icon } from "vant";
import ImageCard from "@/components/ImageCard";
import Tags from "./components/Tags";
// import ImageSearch from "./components/ImageSearch";
import { mapState, mapActions } from "vuex";
import _throttle from "lodash/throttle";
import _uniqBy from "lodash/uniqBy";
import api from "@/api";

export default {
  beforeRouteEnter(to, from, next) {
    next(vm => {
      window._appMainEl && window._appMainEl.scrollTo(0, vm.scrollTop);
    });
  },
  beforeRouteLeave(to, from, next) {
    this.scrollTop = window._appMainEl ? window._appMainEl.scrollTop : 0;
    next();
  },
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
      imageSearchShow: true
    };
  },
  watch: {
    $route() {
      // console.log(this.$route.params);
      let keyword = this.$route.params.keyword;
      if (!keyword || this.keywords.trim() === keyword.trim()) return;

      this.keywords = keyword + " ";
      this.reset();
      this.search(this.keywords);
    },
    keywords() {
      // 当关键词内容发生变化
      let keywordsList = this.keywords
        .replace(/\s\s+/g, " ") // 去除多余空格（'abc   ' => 'abc '）
        .trimLeft() // 去除开头空白字符
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
    ...mapState(["searchHistory"])
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
        this.keywords = keywordsList.join(" ") + " "; // 赋值回去
        this.reset();
        this.search(this.keywords);
      }
    },
    search: _throttle(async function(val) {
      val = val || this.keywords;
      this.keywords__ = val;
      val = val.trim();
      if (val === "") {
        this.keywords = "";
        this.reset();
        return;
      }
      console.log(val);

      this.setSearchHistory(val);

      let res = await api.search(val, this.curPage);
      if (res.status === 0) {
        let newList = res.data;
        let artList = JSON.parse(JSON.stringify(this.artList));

        artList.push(...newList);
        artList = _uniqBy(artList, "id");

        this.artList = artList;
        this.loading = false;
        this.curPage++;
        if (this.curPage > 5) this.finished = true;
      } else {
        this.$toast({
          message: res.msg
        });
        this.loading = false;
        this.error = true;
      }
      this.isLoading = false;
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
    onCancel() {},
    onFocus() {
      this.focus = true; // 获取焦点
    },
    onBlur(flag) {
      document.querySelector('.app-main').scrollTop = 0

      let keywords = `${this.keywords} `.replace(/\s\s+/g, " "); // 去除多余空格

      this.keywords = keywords;
      this.$nextTick(() => {
        this.$refs.words.scrollLeft = this.$refs.words.clientWidth; // 滚动至最后
      });

      if (/^\d+$/.test(keywords.trim())) {
        this.$router.push({
          name: "Artwork",
          params: {
            id: keywords.trim()
          }
        });
        this.keywords = "";
        this.keywordsList = [];
        this.lastWord = "";
        return;
      }

      if (flag) {
        this.focus = false; // 失去焦点

        if (this.keywords__ === keywords) {
          return false;
        } else {
          this.reset();
          this.search(this.keywords);
        }
      }
    },
    searchTag(keywords) {
      this.keywords = keywords + " ";
      this.onBlur(true);
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
    document.querySelector('.app-main').scrollTop = 0

    let input = document.querySelector('input[type="search"]');
    document.addEventListener("selectionchange", () => {
      if (this.focus)
        input.setSelectionRange(input.value.length, input.value.length);
    });

    let keyword = this.$route.params.keyword;
    if (this.$route.name === "Search" && keyword) {
      this.keywords = keyword + " ";
      this.reset();
      this.search(this.keywords);
    }
  },
  components: {
    Tags,
    // ImageSearch,
    [Search.name]: Search,
    [List.name]: List,
    [Loading.name]: Loading,
    [Empty.name]: Empty,
    [Icon.name]: Icon,
    ImageCard
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
    z-index: 1;
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
      backdrop-filter: blur(6px);
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
      top: 40px;
      left: 88px;
      font-size: 0;
      width: 100%;
      max-width: 580px;
      height: 52px;
      border-radius: 8px;
      // overflow-x: scroll;
      white-space: nowrap;

      .placeholder {
        font-size: 28px;
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
      top: 0;
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
      margin-top: 150px;
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
    }

    .image-search {
      position: absolute;
      top: 28px;
      width: 100%;
      z-index: 1;
    }
  }

  .list-wrap {
    position: relative;
    min-height: 100vh;
    // overflow-y: scroll;
    padding-top: 122px;
    padding-bottom: 100px;
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
</style>
