<template>
  <div class="daily">
    <van-cell class="cell" :border="false">
      <template #title>
        <Icon class="icon random" name="random" />
        <span class="title">{{ $t('common.random_view') }}</span>
      </template>
      <template #right-icon>
        <span style="cursor:pointer" @click="toggleSlide">
          <Icon class="icon" name="swiper-symbol" />
        </span>
      </template>
    </van-cell>
    <div v-if="isR18On" style="display:flex;justify-content:flex-end;margin:0.2rem 0 0.4rem">
      <van-radio-group v-model="restrict" direction="horizontal">
        <van-radio name="safe">{{ $t('q3dZB--IevljTdxWdrQMC') }}</van-radio>
        <van-radio name="r18">R18</van-radio>
      </van-radio-group>
    </div>
    <ImageList
      v-if="showImageList"
      list-class="artwork-list"
      vwtf-no-top
      :force-layout="forceSlideLayout ? 'VirtualSlide' : ''"
      :list="artList"
      :loading="loading"
      :finished="finished"
      :error="error"
      :on-load-more="getRankList"
    />
  </div>
</template>

<script>
import dayjs from 'dayjs'
import { mapGetters } from 'vuex'
import _ from '@/lib/lodash'
import api from '@/api'
import { filterHomeIllust } from '@/utils/filter'
import ImageList from '@/components/ImageList.vue'

export default {
  name: 'RandomIllust',
  components: {
    ImageList,
  },
  data() {
    return {
      curPage: 1,
      artList: [],
      error: false,
      loading: false,
      finished: false,
      showImageList: true,
      forceSlideLayout: false,
      restrict: 'safe',
    }
  },
  computed: {
    ...mapGetters(['isR18On']),
    rankModes() {
      return this.restrict == 'r18'
        ? ['day_r18', 'day_male_r18', 'week_r18']
        : ['day', 'week', 'month', 'week_rookie', 'week_original', 'day_male']
    },
  },
  watch: {
    restrict(val) {
      window.umami?.track('random_illust_restrict', { val })
      this.curPage = 1
      this.artList = []
      this.finished = false
      this.loading = false
      this.getRankList()
    },
  },
  created() {
    this.getRankList()
  },
  methods: {
    toggleSlide() {
      this.showImageList = false
      this.forceSlideLayout = !this.forceSlideLayout
      this.$nextTick(() => {
        this.showImageList = true
      })
    },
    getRankList: _.throttle(async function () {
      if (this.loading || this.finished) return
      this.loading = true
      const mode = _.sample(this.rankModes)
      const date = dayjs().subtract(_.random(2, 14), 'days').format('YYYY-MM-DD')
      const res = await api.getRankList(mode, this.curPage, date, true)
      if (res.status === 0) {
        this.artList = _.uniqBy([
          ...this.artList,
          ..._.shuffle(res.data),
        ].filter(filterHomeIllust), 'id')

        this.loading = false
        this.curPage++
        if (this.curPage > 9) this.finished = true
      } else {
        this.$toast({
          message: res.msg,
        })
        this.loading = false
        this.error = true
      }
    }, 1500),
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
      // border-radius: 20px;
      overflow: hidden;

      .swipe-item {
        &:last-child {
          .image-card {
            margin-right: 0;
          }
        }

        .image-card {
          // width: 50vw;
          font-size: 0;
          float: left;
          margin-right: 12px;
          border: 1PX solid #ebebeb;
          border-radius: 18px;
          box-sizing: border-box;
        }

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
