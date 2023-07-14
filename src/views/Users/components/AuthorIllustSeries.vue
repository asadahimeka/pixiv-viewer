<template>
  <div class="series">
    <masonry v-bind="masonryProps">
      <div v-for="s in artList" :key="s.id" class="series-cont" @click="toArtwork(s.id)">
        <img class="series-bg" :src="s.cover_image_urls.medium" alt="">
        <div class="series-title">
          <p>
            <span>{{ s.title }}</span>
            <van-tag color="#ffe1e1" text-color="#ad0000" style="vertical-align: 0.06rem;">
              {{ s.series_work_count }}
            </van-tag>
          </p>
          <p class="series-caption">{{ s.caption }}</p>
        </div>
      </div>
    </masonry>
    <div class="flex-c">
      <van-loading v-show="loading" class="loading" :size="'50px'" style="margin-top: 1rem;" />
      <van-empty v-if="!loading && !artList.length" :description="$t('tips.no_data')" />
    </div>
  </div>
</template>

<script>
import api from '@/api'

export default {
  name: 'AuthorIllustSeries',
  props: {
    id: {
      type: Number,
      required: true,
    },
  },
  data() {
    return {
      artList: [],
      loading: false,
      masonryProps: {
        gutter: '8px',
        cols: {
          700: 1,
          1600: 2,
          default: 3,
        },
      },
    }
  },
  mounted() {
    this.getMemberArtwork()
  },
  methods: {
    getMemberArtwork: async function () {
      if (!this.id) return
      this.loading = true
      this.artList = []
      const res = await api.getMemberIllustSeries(this.id)
      if (res.status === 0) {
        this.artList = res.data
      } else {
        this.$toast({
          message: res.msg,
        })
      }
      this.loading = false
    },
    toArtwork(id) {
      this.$router.push(`/user/${this.id}/series/${id}`)
    },
  },
}
</script>

<style lang="stylus" scoped>
.series
  &-cont
    position relative
    width: 100%
    height: 400px
    margin-bottom 20px
    color: #fff
    cursor pointer
    &::before
      content: ''
      position: absolute
      bottom: 0
      z-index 2
      width: 100%
      height: 100%
      border-radius 24px
      background-image: linear-gradient(0deg, rgba(0,0,0,0.7) 0%, rgba(255,255,255,0) 100%)

  &-bg
    position absolute
    top 0
    left 0
    z-index 1
    width 100%
    height 100%
    object-fit cover
    border-radius 24px

  &-title
    position absolute
    bottom 0
    z-index 3
    margin: 10px 0
    padding 10px 20px
    font-size: 28px
    line-height 1.5
  &-caption
    margin-top 10px
    font-size 19px
</style>
