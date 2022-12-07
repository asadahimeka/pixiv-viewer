<template>
  <div class="illusts">
    <top-bar />
    <h3 class="af_title">
      历史记录
      <div class="clear-ih" @click="clearHistory">
        <Icon name="del" scale="2"></Icon>
      </div>
    </h3>
    <masonry layout="Grid">
      <ImageCard mode="all" :artwork="art" @click-card="toArtwork($event)" v-for="art in artList" :key="art.id" />
    </masonry>
    <van-empty v-if="!artList.length" description="暂无数据" />
  </div>
</template>

<script>
import { Dialog, Empty } from "vant";
import TopBar from "@/components/TopBar";
import ImageCard from "@/components/ImageCard";
import { getCache, setCache } from "@/utils/siteCache";
export default {
  name: "SettingHistory",
  data() {
    return {
      artList: [],
    };
  },
  methods: {
    toArtwork(id) {
      this.$router.push({
        name: "Artwork",
        params: { id }
      });
    },
    async getHistory() {
      let list = await getCache('illusts.history')
      this.artList = list || []
    },
    clearHistory() {
      Dialog.confirm({
        message: '确定要清理历史记录吗',
      }).then(async () => {
        this.artList = []
        await setCache('illusts.history', null)
      });
    }
  },
  activated() {
    this.getHistory()
  },
  components: {
    TopBar,
    ImageCard,
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
  ::v-deep .top-bar-wrap
    width 30%
    padding-top 20px
    background transparent

  .no-data
    margin-top 100px
    font-size 20px
    text-align center

  .card-box
    padding: 0 12px
    display: flex
    flex-direction: row

    .image-card
      max-height: 360px
      margin: 4px 2px

</style>
