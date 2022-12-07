<template>
  <div class="illusts">
    <top-bar />
    <h3 class="af_title">
      发现
      <div class="clear-ih" @click="getArtList">
        <Icon name="random" scale="2"></Icon>
      </div>
    </h3>
    <masonry layout="Grid">
      <ImageCard mode="all" :artwork="art" @click-card="toArtwork($event)" v-for="art in artList" :key="art.id" />
    </masonry>
    <van-loading v-show="loading" class="loading" :size="'50px'" />
    <van-empty v-if="!loading && !artList.length" description="暂无数据" />
  </div>
</template>

<script>
import TopBar from "@/components/TopBar";
import ImageCard from "@/components/ImageCard";
import api from "@/api";
import { Loading, Empty } from "vant"

export default {
  name: "Discovery",
  beforeRouteEnter(to, from, next) {
    next(vm => {
      vm.notFromDetail = from.name !== 'Artwork'
    })
  },
  data() {
    return {
      loading: false,
      artList: [],
      notFromDetail: true
    };
  },
  methods: {
    toArtwork(id) {
      this.$router.push({
        name: "Artwork",
        params: { id }
      });
    },
    async getArtList() {
      this.loading = true
      this.artList = []
      let res = await api.getDiscoveryList('all', 20, true);
      if (res.status === 0) {
        this.artList = res.data;
      } else {
        this.$toast({
          message: res.msg,
          icon: require("@/icons/error.svg")
        });
      }
      this.loading = false
    },
    init() {
      let { list } = this.$route.params
      if (list) {
        this.artList = list
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
    ImageCard,
    [Loading.name]: Loading,
    [Empty.name]: Empty
  }
};
</script>

<style lang="stylus" scoped>
.af_title
  position relative
  margin-top 40px
  margin-bottom 40px
  text-align center
  font-size 28px

  .clear-ih
    position absolute
    top -10px
    right 20px

    ::v-deep .svg-icon
      font-size 0.6rem !important

.illusts
  position relative
  padding-bottom 40px

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
