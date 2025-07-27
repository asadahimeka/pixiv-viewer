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
              <van-tag color="#cdeefe" text-color="#0b6aaf">{{ $t('P8RGkre-rnlFxZ18aH2VW', [convertToK(s.total_character_count)]) }}</van-tag>
            </p>
          </div>
        </div>
      </masonry>
    </van-list>
  </div>
</template>

<script>
import _ from '@/lib/lodash'
import api from '@/api'
import { formatIntlNumber } from '@/utils'
import { isCNLocale } from '@/i18n'

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
      curPage: 1,
      artList: [],
      error: false,
      loading: false,
      finished: false,
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
  methods: {
    convertToK(val) {
      if (!val) return '-'
      if (isCNLocale()) return val
      return formatIntlNumber(+val)
    },
    getMemberArtwork: async function () {
      if (!this.id) return
      this.loading = true
      const res = await api.getMemberNovelSeries(this.id, this.curPage)
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
    },
    toArtwork(id) {
      this.$router.push(`/novel/series/${id}`)
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
