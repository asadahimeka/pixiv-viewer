<template>
  <div class="series">
    <masonry v-bind="masonryProps">
      <div v-for="s in artList" :key="s.id" class="series-cont" @click="toArtwork(s.id)">
        <div class="series-title">
          <p>
            <span>{{ s.title }}</span>
          </p>
          <p class="series-caption">{{ s.caption }}</p>
          <p>
            <van-tag color="#ffe1e1" text-color="#ad0000">
              <van-icon name="orders-o" style="margin-right: 2px;" />
              {{ s.content_count }}
            </van-tag>
            <van-tag color="#cdeefe" text-color="#0b6aaf">{{ s.total_character_count }}{{ $t('common.words') }}</van-tag>
          </p>
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
  name: 'AuthorNovelSeries',
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
        gutter: '10px',
        cols: {
          700: 1,
          1200: 2,
          1600: 3,
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
      const res = await api.getMemberNovelSeries(this.id)
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
      this.$router.push(`/novel/series/${id}`)
    },
  },
}
</script>

<style lang="stylus" scoped>
.series
  &-cont
    position relative
    width: 100%
    margin-bottom 20px
    border-radius: 20px;
    background-color: rgba(0, 0, 0, 0.04);
    cursor pointer

  &-title
    padding 20px
    margin: 10px 0
    font-size: 28px
    line-height 1.5
  &-caption
    margin-top 10px
    font-size 19px
</style>
