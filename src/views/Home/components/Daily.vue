<template>
  <div class="daily">
    <van-cell class="cell" :border="false">
      <template #title>
        <Icon class="icon random" name="random"></Icon>
        <span class="title">随便看看</span>
      </template>
    </van-cell>
    <van-list
      v-model="loading"
      class="artwork-list"
      :finished="finished"
      finished-text="没有更多了"
      :error.sync="error"
      error-text="网络异常，点击重新加载"
      @load="getRankList"
    >
      <masonry v-bind="$store.getters.wfProps">
        <ImageCard
          mode="all"
          :artwork="art"
          @click-card="toArtwork($event)"
          v-for="art in artList"
          :key="art.id"
        />
      </masonry>
      <!-- <div class="card-box">
        <div class="column">
          <ImageCard
            mode="cover"
            :artwork="art"
            @click-card="toArtwork($event)"
            v-for="art in odd(artList)"
            :key="art.id"
          />
        </div>
        <div class="column">
          <ImageCard
            mode="cover"
            :artwork="art"
            @click-card="toArtwork($event)"
            v-for="art in even(artList)"
            :key="art.id"
          />
        </div>
      </div> -->
    </van-list>
  </div>
</template>

<script>
import { Cell, /* Swipe, SwipeItem, */ Icon, List/* , PullRefresh */ } from "vant";
import ImageCard from "@/components/ImageCard";
import api from "@/api";
import _throttle from "lodash/throttle";
import _sample from "lodash/sample";
import _random from "lodash/random";
import _shuffle from "lodash/shuffle";
import _uniqBy from "lodash/uniqBy";
import moment from 'moment';
export default {
  name: "Daily",
  data() {
    return {
      curPage: 1,
      artList: [],
      error: false,
      loading: false,
      finished: false,
      rankModes: ['day', 'week', 'month', 'week_original', 'day_male']
    };
  },
  methods: {
    url(id, index) {
      return api.url(id, index);
    },
    getRankList: _throttle(async function() {
      this.loading = true;
      const mode = _sample(this.rankModes)
      const date = moment().subtract(_random(2, 14), 'days').format('YYYY-MM-DD')
      let res = await api.getRankList(mode, this.curPage, date, true);
      if (res.status === 0) {
        let newList = _shuffle(res.data);
        let artList = JSON.parse(JSON.stringify(this.artList));

        artList.push(...newList);
        artList = _uniqBy(artList, "id")

        this.artList = artList;
        this.loading = false;
        this.curPage++;
        if (this.curPage > 5) this.finished = true;
      } else {
        this.$toast({
          message: res.msg
        });
        this.loading = false;
        this.error = true;
      }
    }, 1500),
    odd(list) {
      return list.filter((_, index) => (index + 1) % 2);
    },
    even(list) {
      return list.filter((_, index) => !((index + 1) % 2));
    },
    toArtwork(id) {
      this.$router.push({
        name: "Artwork",
        params: { id, list: this.artList }
      });
    }
  },
  mounted() {
    // this.getLatest();
  },
  components: {
    [Cell.name]: Cell,
    // [Swipe.name]: Swipe,
    // [SwipeItem.name]: SwipeItem,
    [Icon.name]: Icon,
    [List.name]: List,
    // [PullRefresh.name]: PullRefresh,
    ImageCard
  }
};
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
          border: 1px solid #ebebeb;
          border-radius: 18px;
          box-sizing: border-box;
        }

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
