<template>
  <div class="daily">
    <van-cell class="cell" :border="false">
      <template #title>
        <Icon class="icon random" name="random" />
        <span class="title">{{ $t('common.random_view') }}</span>
      </template>
    </van-cell>
    <van-list
      v-model="loading"
      class="artwork-list"
      :loading-text="$t('tips.loading')"
      :finished="finished"
      :finished-text="$t('tips.no_more')"
      :error.sync="error"
      :offset="800"
      :error-text="$t('tips.net_err')"
      @load="getRankList"
    >
      <masonry v-bind="masonryProps">
        <NovelCard v-for="art in artList" :key="art.id" :artwork="art" @click-card="toArtwork($event)" />
      </masonry>
    </van-list>
  </div>
</template>

<script>
import api from '@/api'
import _ from 'lodash'
import dayjs from 'dayjs'
import NovelCard from '@/components/NovelCard.vue'
import { filterHomeNovel } from '@/utils/filter'
export default {
  name: 'RandomNovel',
  components: {
    NovelCard,
  },
  data() {
    return {
      curPage: 1,
      artList: [],
      error: false,
      loading: false,
      finished: false,
      rankModes: ['day', 'week', 'day_male', 'week_rookie'],
      masonryProps: {
        gutter: '8px',
        cols: {
          600: 1,
          1200: 2,
          1600: 3,
          default: 4,
        },
      },
    }
  },
  methods: {
    url(id, index) {
      return api.url(id, index)
    },
    getRankList: _.throttle(async function () {
      this.loading = true
      const mode = _.sample(this.rankModes)
      const date = dayjs().subtract(_.random(2, 14), 'days').format('YYYY-MM-DD')
      const res = await api.getNovelRankList(mode, this.curPage, date)
      if (res.status === 0) {
        this.artList = _.uniqBy([
          ...this.artList,
          ..._.shuffle(res.data),
        ], 'id').filter(filterHomeNovel)

        this.loading = false
        this.curPage++
        if (this.curPage > 4) this.finished = true
      } else {
        this.$toast({
          message: res.msg,
        })
        this.loading = false
        this.error = true
      }
    }, 1500),
    toArtwork(id) {
      this.$router.push({
        name: 'NovelDetail',
        params: { id },
      })
    },
  },
}
</script>

<style lang="stylus" scoped>
.rank-card {
  .card-box {
    padding: 0 12px;
    height: 365px;

    .swipe-wrap {
      height: 100%;
      border-radius: 20px;
      overflow: hidden;

      .swipe-item {

        .image-slide {
          border: 1px solid #ebebeb;
          border-radius: 18px;
          box-sizing: border-box;

          .link {
            position: absolute;
            width: 100%;
            height: 100%;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: #efefef;

            &::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: rgba(#000, 0.6);
            }

            svg {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -55%);
              font-size: 20em;
            }

            div {
              position: absolute;
              left: 50%;
              top: 50%;
              transform: translate(-50%, 80%);
              font-size: 34px;
              text-align: center;
              white-space: nowrap;
            }
          }
        }

        &.more {
          .rank {
            display: flex;
            height: 100%;
            justify-content: center;
            align-items: center;
          }
        }
      }
    }
  }
}

.daily {
  min-height 100vh;
  padding: 0 14px;
  .artwork-list {
    margin: 0 2px;

    .card-box {
      display: flex;
      flex-direction: row;

      .column {
        width: 50%;

        .image-card {
          max-height: 360px;
          margin: 4px 2px;
        }
      }
    }
  }
}
</style>
