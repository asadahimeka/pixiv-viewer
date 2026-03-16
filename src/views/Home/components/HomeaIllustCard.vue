<template>
  <div class="HomeaIllustCard" :class="{ 'single-img': images.length == 1 }" :style="`--ratio:${ratio}`">
    <ImageCard mode="all" :artwork="artwork" :style="`--bg:url('${images[0]}') 0`" @click-card="toDetail" />
    <div v-if="images.length > 1" ref="view" class="slide-wrap" @wheel="handleWheel">
      <div v-for="(img, i) in images" :key="i+img" class="slide-item">
        <Pximg :src="img" @click.native="toDetail" />
        <div class="slide-pagination">{{ i + 1 }} / {{ images.length }}</div>
      </div>
    </div>
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
    handleWheel(e) {
      if (this.$store.state.isMobile) return
      e.preventDefault()
      e.stopPropagation()
      this.$refs.view.scrollLeft += e.deltaY * 2
    },
  },
}
</script>

<style lang="stylus">
.HomeaIllustCard
  position relative

  .slide-wrap
    position absolute
    top 0
    z-index 1
    display flex
    align-items center
    gap 10PX
    overflow-x auto
    width 100%
    border-radius: 12PX
    @media screen and (max-width 600px)
      aspect-ratio: var(--ratio)
      &::-webkit-scrollbar
        height 0

  .slide-item
    position relative
    min-width fit-content
    height 80vh
    @media screen and (max-width 600px)
      height 100%
    &:first-child
      &, & img
        max-width 100%
    img
      display block
      width auto
      min-width 9rem
      height 100%
      object-fit: cover

  .slide-pagination
    position absolute
    top: 0.12rem
    right: 0.12rem
    z-index 12
    width fit-content
    padding: 0.1rem 0.2rem
    border-radius: 8PX
    font-size: 0.26rem
    font-weight bold
    color: #fff
    background: rgba(0, 0, 0, 0.3)
    font-family: Bahnschrift, Dosis, Arial, Helvetica, sans-serif;

  &.single-img
    @media screen and (min-width 600px)
      .image-card
        background: var(--bg)
      .image-card-wrapper
        backdrop-filter: saturate(200%) blur(20PX)
        background: rgba(255, 255, 255, 0.5)
      .image
        top 50%
        left: 50%
        transform: translate(-50%, -50%) !important
        width: auto
        height auto
        max-width 100%
        max-height 100%
        object-fit cover
        border-radius: 0
        transition: none

  &:not(.single-img)
    .image-card-wrapper .image
      display none

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
