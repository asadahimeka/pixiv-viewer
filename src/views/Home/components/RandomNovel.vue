<template>
  <div class="daily">
    <van-cell class="cell" :border="false">
      <template #title>
        <Icon class="icon random" name="random" />
        <span class="title">{{ $t('common.random_view') }}</span>
      </template>
    </van-cell>
    <div v-if="isR18On && isLoggedIn" class="nifs-list-cont" style="display:flex;justify-content:flex-end;margin:0.2rem 0 0.4rem">
      <van-radio-group v-model="restrict" direction="horizontal">
        <van-radio name="safe">{{ $t('q3dZB--IevljTdxWdrQMC') }}</van-radio>
        <van-radio name="r18">R18</van-radio>
      </van-radio-group>
    </div>
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
import { mapGetters } from 'vuex'
import _ from '@/lib/lodash'
import dayjs from 'dayjs'
import { filterHomeNovel } from '@/utils/filter'
import NovelCard from '@/components/NovelCard.vue'

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
      restrict: 'safe',
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
  computed: {
    ...mapGetters(['isR18On', 'isLoggedIn']),
    rankModes() {
      return this.restrict == 'r18'
        ? ['day_r18', 'day_male_r18', 'week_r18']
        : ['day', 'week', 'day_male', 'week_rookie']
    },
  },
  watch: {
    restrict(val) {
      window.umami?.track('random_novel_restrict', { val })
      this.curPage = 1
      this.artList = []
      this.finished = false
      this.loading = false
      this.getRankList()
    },
  },
  methods: {
    getRankList: _.throttle(async function () {
      this.loading = true
      const mode = _.sample(this.rankModes)
      const date = dayjs().subtract(_.random(2, 14), 'days').format('YYYY-MM-DD')
      const res = await api.getNovelRankList(mode, this.curPage, date)
      if (res.status === 0) {
        let artList = _.uniqBy([
          ...this.artList,
          ..._.shuffle(res.data),
        ], 'id')
        if (this.restrict == 'safe') artList = artList.filter(filterHomeNovel)
        this.artList = artList

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
          border: 1PX solid #ebebeb;
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
