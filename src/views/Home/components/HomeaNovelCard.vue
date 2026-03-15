<template>
  <div class="HomeaNovelCard">
    <NovelCard :artwork="artwork" show-caption @click-card="toDetail" />
    <div class="ha-v-divider"></div>
    <div class="preview-text" @click="toDetail">{{ artwork._previewText }}</div>
  </div>
</template>

<script>
import NovelCard from '@/components/NovelCard.vue'

export default {
  name: 'HomeaNovelCard',
  components: { NovelCard },
  props: {
    artwork: { type: Object, required: true },
  },
  methods: {
    toDetail() {
      this.$router.push(`/novel/${this.artwork.id}`)
    },
  },
}
</script>

<style lang="stylus" scoped>
.HomeaNovelCard
  display flex
  gap 10PX
  background: rgba(0, 0, 0, 0.04)
  border-radius: 12PX
  box-shadow: 0 3PX 1PX -2PX rgba(0, 0, 0, 0.2), 0 2PX 2PX 0 rgba(0, 0, 0, 0.14), 0 1PX 5PX 0 rgba(0, 0, 0, 0.12)
  ::v-deep .novel-card
    width 55%
    min-width 55%
    margin-bottom 0
    border-bottom: 0
    background none !important
  .ha-v-divider
    width 1px
    min-width 1px
    height 4.2rem
    background #ccc
  .preview-text
    height 100%
    margin 0.2rem
    font-size 0.28rem
    line-height 1.5
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: pre-wrap;
    overflow-wrap: break-word;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 11;
  @media screen and (max-width: 700px)
    overflow-x auto
    &::-webkit-scrollbar
      height 0
    ::v-deep .novel-card
      min-width 6.5rem
    .preview-text
      min-width 8rem
      -webkit-line-clamp: 16

</style>
