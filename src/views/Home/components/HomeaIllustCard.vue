<template>
  <div class="HomeaIllustCard" :class="{ 'single-img': images.length == 1 }" :style="`--ratio:${ratio}`">
    <swiper class="swipe-wrap" :options="swiperOption">
      <swiper-slide v-for="(img, i) in images" :key="i+img" class="swipe-item">
        <Pximg :src="img" @click.native="toDetail" />
      </swiper-slide>
      <div slot="pagination" class="swiper-pagination"></div>
      <div slot="button-prev" class="swiper-button-prev"></div>
      <div slot="button-next" class="swiper-button-next"></div>
    </swiper>
    <ImageCard :artwork="artwork" mode="all" @click-card="toDetail" />
  </div>
</template>

<script>
import ImageCard from '@/components/ImageCard.vue'

export default {
  name: 'HomeaIllustCard',
  components: { ImageCard },
  props: {
    artwork: { type: Object, required: true },
  },
  computed: {
    images() {
      return this.artwork.images.map(e => e.l.replace(/\/c\/\d+x\d+(_\d+)?\//g, '/c/1200x1200_90_webp/'))
    },
    swiperOption() {
      return {
        lazy: true,
        freeMode: true,
        mousewheel: true,
        slidesPerView: 'auto',
        spaceBetween: 10,
        centeredSlides: this.artwork.images.length == 1,
        touchMoveStopPropagation: true,
        pagination: {
          el: '.HomeaIllustCard .swiper-pagination',
          type: 'fraction',
        },
        navigation: {
          nextEl: '.HomeaIllustCard .swiper-button-next',
          prevEl: '.HomeaIllustCard .swiper-button-prev',
        },
      }
    },
    ratio() {
      let ratio = this.artwork.width / this.artwork.height
      if (ratio < 0.625) ratio = 0.625
      if (ratio > 2) ratio = 2
      return ratio
    },
  },
  methods: {
    toDetail() {
      this.$router.push({
        name: 'Artwork',
        params: {
          id: this.artwork.id,
          art: this.artwork,
        },
      })
    },
  },
}
</script>

<style lang="stylus">
.HomeaIllustCard
  position relative
  .swipe-wrap
    position absolute
    top 0
    width 100%
    border-radius: 12PX
    .swipe-item
      width 9rem
      height 80vh
      @media screen and (max-width 600px)
        aspect-ratio: var(--ratio)
        width 100%
        height inherit
      img
        width 100%
        height 100%
        object-fit: cover
    .swiper-pagination
      bottom unset
      left unset
      top: 0.13333rem
      right: 0.13333rem
      z-index 12
      width fit-content
      padding: 0.05333rem 0.10667rem
      border-radius: 0.06667rem
      font-size: 0.24rem
      font-weight bold
      color: #fff
      background: rgba(0, 0, 0, 0.3)
      font-family: Bahnschrift, Dosis, Arial, Helvetica, sans-serif;
    .swiper-button-prev, .swiper-button-next
      height 100%
  &.single-img
    .swiper-pagination
      display none
  &:not(.single-img)
    .image-card-wrapper .image
      display none
      filter none
  .image-card
    background #f9f9f9
    box-shadow: 0 3PX 1PX -2PX rgba(0, 0, 0, 0.2), 0 2PX 2PX 0 rgba(0, 0, 0, 0.14), 0 1PX 5PX 0 rgba(0, 0, 0, 0.12);
    &.isOuterMeta
      .image-card-wrapper
        border-bottom-left-radius: 0
        border-bottom-right-radius: 0
      .meta
        display none
  .outer-meta
    background #f5f5f5
  .image-card-wrapper
    @media screen and (min-width 600px)
      height 80vh
      padding-bottom 0 !important
    .image
      filter: saturate(200%) blur(20PX)
      opacity: 0.5
      @media screen and (max-width 600px)
        display none
        filter none
    .layer-num
      display none
    .tag-r18-ai, .bookmark
      z-index 9
    .meta
      top unset !important
      bottom 0
      z-index 8
      height 20% !important
      &::before
        height 100% !important
        background-image: linear-gradient(0deg, rgba(0, 0, 0, 0.3) 0%, rgba(255, 255, 255, 0) 100%);

</style>
