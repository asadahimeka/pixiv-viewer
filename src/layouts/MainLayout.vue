<template>
  <div class="main-layout" :class="{ noImgFillScreen, 'safe-area': safeArea }">
    <div class="app-main" :class="{ 'image-card-no-radius': imageCardNoRadius }">
      <keep-alive :max="10">
        <router-view />
      </keep-alive>
    </div>
    <my-nav v-show="showNav" :is-nav-appear="hideNavBarOnScroll ? isNavAppear : true" />
    <div v-show="!showNav" class="back_to_top" :class="{ 'back_to_top--show': !isNavAppear }" @click="scrollToTop()">
      <van-icon name="back-top" />
    </div>
  </div>
</template>

<script>
import Nav from '@/components/Nav'
import store from '@/store'
import { throttleScroll } from '@/utils'

const { isImageFitScreen, isImageCardBorderRadius, hideNavBarOnScroll } = store.state.appSetting

export default {
  components: {
    'my-nav': Nav,
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
      noImgFillScreen: !isImageFitScreen,
      imageCardNoRadius: !isImageCardBorderRadius,
      hideNavBarOnScroll,
    }
  },
  mounted() {
    console.log('main-layout mounted')
    addEventListener('scroll', throttleScroll(document.documentElement, scroll => {
      if (scroll > 160) this.isNavAppear = false
    }, () => {
      this.isNavAppear = true
    }), { passive: true })
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
