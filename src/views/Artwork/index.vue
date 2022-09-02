<template>
  <div class="artwork">
    <TopBar />
    <div v-if="artwork">
      <div class="ia-cont">
        <div class="ia-left">
          <ImageView
            :artwork="artwork"
            :lazy="true"
            @open-download="ugoiraDownloadPanelShow=true"
            ref="imgView"
          />
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
    <van-action-sheet
      v-model="ugoiraDownloadPanelShow"
      :actions="ugoiraDownloadPanelActions"
      @select="onUgoiraDownloadPanelSelect"
      cancel-text="取消"
      description="请选择下载格式"
      close-on-popstate
      close-on-click-action
    />
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
  beforeRouteEnter(to, from, next) {
    document.querySelector('.app-main')?.scrollTo(0, 0)
    next()
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
    init() {
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
          setTimeout(() => {
            // this.$router.back();
          }, 5000);
        }
      } else {
        this.$toast({
          message: res.msg,
          icon: require("@/icons/error.svg")
        });
        setTimeout(() => {
          this.$router.back();
        }, 500);
      }
    },
    onUgoiraDownloadPanelSelect(item) {
      this.$refs.imgView.download(item.name);
    }
  },
  mounted() {
    this.init();
  },
  updated() {},
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

<style lang="stylus" scoped>
.artwork {
  .skeleton {
    margin: 30px 0;
  }
}

.ia-cont
  display flex
  align-items flex-start

  .ia-left
    display flex
    justify-content center
    align-items center
    width 72%
    min-width 72%
    margin-top 36px

    ::v-deep .image-box
      width: 100% !important
      height: auto !important
      min-width 300px
      min-height 300px

      .image
        width auto
        max-width 100%
        height auto
        max-height 92vh
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
    ::v-deep .image
      max-width: 100% !important
      max-height: 72vh !important

  .ia-right
    max-width unset !important

</style>
