<template>
  <div class="series">
    <van-list
      v-model="loading"
      :loading-text="$t('tips.loading')"
      :finished="finished"
      :finished-text="$t('tips.no_more')"
      :error.sync="error"
      :offset="800"
      :error-text="$t('tips.net_err')"
      @load="getMemberArtwork()"
    >
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
    </van-list>
  </div>
</template>

<script>
import _ from 'lodash'
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
      curPage: 1,
      artList: [],
      error: false,
      loading: false,
      finished: false,
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
  methods: {
    getMemberArtwork: _.throttle(async function () {
      if (!this.id) return
      this.loading = true
      const res = await api.getMemberIllustSeries(this.id, this.curPage)
      if (res.status === 0) {
        this.artList = _.uniqBy([
          ...this.artList,
          ...res.data,
        ], 'id')
        this.loading = false
        if (res.data.next) {
          this.curPage++
        } else {
          this.finished = true
        }
      } else {
        this.$toast({
          message: res.msg,
        })
        this.loading = false
        this.error = true
      }
    }, 1500),
    toArtwork(id) {
      this.$router.push(`/user/${this.id}/series/${id}`)
    },
  },
}
</script>

<style lang="stylus" scoped>
.series
  padding 0 20px
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
