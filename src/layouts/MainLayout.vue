<template>
  <div class="main-layout" :class="layoutClasses">
    <div class="app-main" :class="imageCardClasses">
      <keep-alive :max="10">
        <router-view />
      </keep-alive>
    </div>
    <my-nav v-show="showNav" :is-nav-appear="myIsNavShow" />
    <div v-show="!showNav" class="back_to_top" :class="{ 'back_to_top--show': !isNavAppear }" @click="scrollToTop()">
      <van-icon name="back-top" />
    </div>
    <van-dialog
      v-if="openArtDetailAsPopup"
      v-model="showArtDetailPopup"
      class="art-detail-popup"
      :overlay-style="{ zIndex: 100 }"
      close-on-click-overlay
    >
      <art-detail v-if="showArtDetailPopup" :popup-art="popupArt" />
      <van-icon class="art-detail-popup-close" name="cross" @click="closeArtPopup()" />
    </van-dialog>
  </div>
</template>

<script>
import { eventBus, throttleScroll } from '@/utils'
import store from '@/store'
import Nav from '@/components/Nav'
import Artwork from '@/views/Artwork/index.vue'

const {
  isImageFitScreen,
  isImageCardBorderRadius,
  isImageCardBoxShadow,
  hideNavBarOnScroll,
  navBarAltStyle,
  openArtDetailAsPopup,
} = store.state.appSetting

export default {
  components: {
    'my-nav': Nav,
    'art-detail': Artwork,
  },
  props: {
    safeArea: {
      type: Boolean,
      default: false,
    },
    showNav: {
      type: Boolean,
      default: true,
    },
  },
  data() {
    return {
      isNavAppear: true,
      imageCardClasses: {
        'image-card-no-radius': !isImageCardBorderRadius,
        'image-card-no-shadow': !isImageCardBoxShadow,
      },
      openArtDetailAsPopup,
      showArtDetailPopup: false,
      popupArt: null,
    }
  },
  computed: {
    myIsNavShow() {
      return hideNavBarOnScroll ? this.isNavAppear : true
    },
    layoutClasses() {
      return {
        'noImgFillScreen': !isImageFitScreen,
        'safe-area': this.safeArea,
        'navbar-alt-style': navBarAltStyle,
      }
    },
  },
  mounted() {
    console.log('main-layout mounted')
    addEventListener('scroll', throttleScroll(document.documentElement, scroll => {
      if (scroll > 160) this.isNavAppear = false
    }, () => {
      this.isNavAppear = true
    }), { passive: true })

    eventBus.$on('show-art-detail-popup', art => {
      this.popupArt = art
      this.showArtDetailPopup = true
    })
    eventBus.$on('close-art-detail-popup', () => {
      this.closeArtPopup()
    })
  },
  methods: {
    scrollToTop() {
      document.documentElement.scrollTo({ top: 0, behavior: 'smooth' })
      if (this.$route.name == 'NovelDetail') {
        setTimeout(() => {
          this.$store.commit('setIsNovelViewShrink', true)
        }, 500)
      }
    },
    closeArtPopup() {
      this.showArtDetailPopup = false
      this.popupArt = null
    },
  },
}
</script>

<style lang="stylus" scoped>
.main-layout
  box-sizing border-box

  &.safe-area
    // height 100vh
    padding-top 0

.app-main
  position relative
  // height 100vh
  padding 10px 8px 0
  box-sizing border-box
  // overflow-y auto

.back_to_top
  position fixed
  bottom 40PX
  right 20PX
  z-index 999
  display: flex;
  align-items: center;
  justify-content: center;
  width 40PX
  height 40PX
  cursor: pointer;
  color #fff
  border-radius 50%
  box-shadow: 0 2PX 8PX 0 rgba(0,0,0,.12);
  transform: scale(0);
  transition: .3s cubic-bezier(.25,.8,.5,1);
  background-color rgba(241, 194, 95, 0.9)

  ::v-deep .van-icon
    font-size 22PX
    font-weight 600

  &--show
    transform: scale(1);

  // @media screen and (max-width: 1280px)
    // display none

</style>
<style lang="stylus">
html, body
  &:has(.art-detail-popup .artwork)
    overflow hidden !important
.art-detail-popup
  z-index 100 !important
  top 50%
  width 95vw !important
  height 95vh !important
  overflow-y auto
  &-close
    position absolute
    right 0rem
    top 0rem
    padding 0.25rem
    font-size: 0.6rem
    cursor pointer
  &::-webkit-scrollbar,
  .van-dialog__footer
    display none
  .van-dialog__content .artwork
    .share_btn,
    .top-bar-wrap,
    .meta_btns .van-button:last-child
      display none
    .ia-cont .ia-left .image-box .image
      max-height 92vh
</style>
