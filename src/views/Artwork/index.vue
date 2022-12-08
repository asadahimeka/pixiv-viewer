<template>
  <div class="artwork">
    <TopBar />
    <div class="share_btn" @click="share">
      <Icon class="icon" name="share"></Icon>
    </div>
    <div v-if="artwork">
      <div class="ia-cont">
        <div class="ia-left">
          <ImageView :artwork="artwork" :lazy="true" @open-download="ugoiraDownloadPanelShow = true" ref="imgView" />
        </div>
        <div class="ia-right">
          <van-skeleton class="skeleton" avatar :row="3" :avatar-size="'42px'" :loading="loading">
            <Meta :artwork="artwork" />
          </van-skeleton>
          <keep-alive>
            <AuthorCard v-if="artwork.author" :id="artwork.author.id" :key="artwork.id" />
          </keep-alive>
        </div>
      </div>
      <van-divider />
      <keep-alive>
        <Related :artwork="artwork" :key="artwork.id" />
      </keep-alive>
    </div>
    <van-action-sheet v-model="ugoiraDownloadPanelShow" :actions="ugoiraDownloadPanelActions"
      @select="onUgoiraDownloadPanelSelect" cancel-text="取消" description="请选择下载格式" close-on-popstate
      close-on-click-action />
  </div>
</template>

<script>
import TopBar from "@/components/TopBar";
import ImageView from "./components/ImageView";
import Meta from "./components/Meta";
import AuthorCard from "./components/AuthorCard";
import Related from "./components/Related";
import { Divider, Skeleton, ActionSheet } from "vant";
import { mapGetters, mapState } from "vuex";
import api from "@/api";
import { getCache, setCache } from "@/utils/siteCache";
import _uniqBy from "lodash/uniqBy";
import { copyText } from "@/utils";

export default {
  name: "Artwork",
  watch: {
    $route() {
      if (
        this.$route.name === "Artwork" &&
        this.$route.params.id !== this.artwork.id
      ) {
        this.init();
      }
    }
  },
  data() {
    return {
      loading: false,
      artwork: {},
      options: {
        // watchOverflow: true,
        // autoHeight: true,
        // slidesPerView: 1,
        // currentPage: 1,
        loop: true,
        thresholdTime: 5000,
        thresholdDistance: 150
      },
      ugoiraDownloadPanelShow: false,
      ugoiraDownloadPanelActions: [
        { name: "ZIP", subname: "原始序列帧归档文件" },
        { name: "GIF", subname: "低画质，兼容性最佳" },
        { name: "WebM", subname: "高画质，兼容性差" } // chrome only
      ]
    };
  },
  computed: {
    ...mapState(["galleryList", "currentIndex", "$swiper"]),
    ...mapGetters(["currentId", "isCensored"])
  },
  methods: {
    scrollToTop() {
      let el = document.querySelector('.app-main')
      el && el.scrollTo({ top: 0 });
    },
    init() {
      this.scrollToTop()
      this.loading = true;
      let id = +this.$route.params.id;
      this.artwork = {};
      this.getArtwork(id);
    },
    async getArtwork(id) {
      // console.log(id);
      let res = await api.getArtwork(id);
      if (res.status === 0) {
        this.artwork = res.data;
        this.loading = false;

        if (this.isCensored(this.artwork)) {
          this.$toast({
            message: "根据当前设置，此内容将不予显示",
            icon: require("@/icons/ban-view.svg")
          });
        }

        let historyList = await getCache('illusts.history', [])
        if (!Array.isArray(historyList)) historyList = []
        if (historyList.length > 100) historyList = historyList.slice(0, 100)
        historyList = _uniqBy([res.data, ...historyList], 'id')
        setCache('illusts.history', historyList)
      } else {
        this.$toast({
          message: res.msg,
          icon: require("@/icons/error.svg"),
          duration: 3000
        });
        setTimeout(() => {
          this.$router.back();
        }, 500);
      }
    },
    onUgoiraDownloadPanelSelect(item) {
      this.$refs.imgView.download(item.name);
    },
    async share() {
      window.umami?.('share_artwork')

      const shareData = {
        title: 'Pixiv Viewer',
        text: `${this.artwork.author.name} 的作品 ${this.artwork.title} - ID: ${this.artwork.id}`,
        url: `${location.href}?ref=share_btn`
      }

      try {
        await navigator.share(shareData);
      } catch (error) {
        copyText(shareData.url, () => this.$toast('已复制链接'))
      }
    }
  },
  mounted() {
    this.init();
  },
  activated() {
    this.scrollToTop()
  },
  components: {
    TopBar,
    ImageView,
    Meta,
    AuthorCard,
    Related,
    [Divider.name]: Divider,
    [Skeleton.name]: Skeleton,
    [ActionSheet.name]: ActionSheet
  }
};
</script>

<style lang="stylus">
.app-main:has(.artwork)
  padding 0

  .related
    padding-left 16px
    padding-right 16px
</style>
<style lang="stylus" scoped>
.artwork
  .skeleton
    margin: 30px 0;
  .share_btn
    position: fixed;
    top: 0;
    right 0
    padding: 0.8rem 0.5rem;
    z-index: 99;
    font-size 2.6em
    .svg-icon
      color: #fafafa;
      filter: drop-shadow(0.02667rem 0.05333rem 0.05333rem rgba(0,0,0,0.8));


.ia-cont
  display flex
  align-items flex-start

  .ia-left
    display flex
    justify-content center
    align-items center
    width 72%
    min-width 72%
    margin-top 20px
    padding 0 20px

    ::v-deep .image-box
      width: 100% !important
      height: auto !important
      min-width 300px
      min-height 300px
      &:not(:last-child)
        margin-bottom 10px

      .image
        width auto
        max-width 100%
        height auto
        max-height 96vh
        margin 0 auto

  .ia-right
    max-width 28%
    padding-right 40px
    box-sizing border-box
    overflow hidden

.artwork
  ::v-deep .top-bar-wrap
    width 30vw
    background none

@media screen and (max-width: 1200px)
  .ia-cont
    display block !important

  .ia-left
    width 100% !important
    margin 0 auto !important
    padding 0 !important

    ::v-deep .image
      max-width: 100% !important
      max-height: 90vh !important

  .ia-right
    max-width unset !important
    padding-right 0 !important
    .artwork-meta
      margin-top 10px !important

</style>
