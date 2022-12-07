<template>
  <div class="illusts">
    <top-bar />
    <h3 class="af_title">特辑</h3>
    <template v-if="rankList.length && recomList.length">
      <v-masonry v-bind="recomMasonryProps">
        <SpotlightsRecom title="本月排行榜" icon="spec_rank" :list="rankList" />
        <SpotlightsRecom title="为你推荐" icon="rec_heart" :list="recomList" />
      </v-masonry>
    </template>
    <van-cell v-if="artList.length" class="overview" :border="false">
      <template #title>
        <Icon class="icon" name="spec_list"></Icon>
        <span class="title">一览</span>
      </template>
    </van-cell>
    <van-list v-model="loading" :finished="finished" finished-text="没有了" :error.sync="error" :immediate-check="false"
      :offset="800" error-text="网络异常，点击重新加载" @load="getArtList">
      <v-masonry v-bind="masonryProps">
        <SpCard v-for="art in artList" :key="art.id" :artwork="art" @click.native="toArtwork(art.id)" />
      </v-masonry>
    </van-list>
    <van-loading v-show="loading" class="loading" :size="'50px'" />
    <van-empty v-if="!loading && !artList.length" description="暂无数据" />
  </div>
</template>

<script>
import TopBar from "@/components/TopBar";
import SpCard from "@/components/SpCard.vue";
import api from "@/api";
import { Cell, Loading, Empty, List } from "vant"
import _throttle from "lodash/throttle";
import SpotlightsRecom from "./SpotlightsRecom.vue";

export default {
  name: "Spotlights",
  beforeRouteEnter(to, from, next) {
    next(vm => {
      vm.notFromDetail = from.name !== 'Spotlight'
    })
  },
  data() {
    return {
      curPage: 1,
      error: false,
      loading: false,
      finished: false,
      artList: [],
      rankList: [],
      recomList: [],
      notFromDetail: true,
      recomMasonryProps: {
        gutter: "8px",
        cols: {
          700: 1,
          default: 2
        }
      },
      masonryProps: {
        gutter: "8px",
        cols: {
          700: 1,
          1000: 2,
          default: 3
        }
      }
    };
  },
  methods: {
    toArtwork(id) {
      this.$router.push({
        name: "Spotlight",
        params: { id }
      });
    },
    getArtList: _throttle(async function () {
      this.loading = true
      let res = await api.getSpotlights(this.curPage == 1 ? undefined : this.curPage);
      if (res.status === 0) {
        this.artList = this.artList.concat(res.data.articles);
        if (this.curPage == 1) {
          this.rankList = res.data.rank
          this.recomList = res.data.recommend
        }
        this.loading = false
        this.curPage++;
        if (this.curPage > 5) this.finished = true;
      } else {
        this.$toast({
          message: res.msg,
          icon: require("@/icons/error.svg")
        });
        this.loading = false
        this.error = true;
      }
    }, 1500),
    init() {
      let { list } = this.$route.params
      if (list) {
        this.artList = list.articles
        this.rankList = list.rank
        this.recomList = list.recommend
        this.curPage++
      } else if (this.notFromDetail) {
        this.getArtList()
      }
    }
  },
  activated() {
    document.querySelector('.app-main')?.scrollTo({ top: 0 })
    this.init()
  },
  components: {
    TopBar,
    SpCard,
    [Cell.name]: Cell,
    [List.name]: List,
    [Loading.name]: Loading,
    [Empty.name]: Empty,
    SpotlightsRecom
}
};
</script>

<style lang="stylus" scoped>
.af_title
  position relative
  margin-top 40px
  margin-bottom 60px
  text-align center
  font-size 28px

  .clear-ih
    position absolute
    top -10px
    right 20px

    ::v-deep .svg-icon
      font-size 0.6rem !important

.overview
  margin-bottom 10px
  .title
    font-size 26px
  .svg-icon
    margin-right 8px
    font-size 38px

.illusts
  position relative
  padding 0 20px 40px

  .loading
    margin-top: 2rem;
    text-align: center;

  ::v-deep .top-bar-wrap
    width 30%
    padding-top 20px
    background transparent

  .card-box
    padding: 0 12px
    display: flex
    flex-direction: row

    .image-card
      max-height: 360px
      margin: 4px 2px

</style>
