<template>
  <div class="moments">
    <van-cell class="cell" :border="false">
      <template #title>
        <Icon class="icon random" name="random"></Icon>
        <span class="title">随便看看</span>
      </template>
    </van-cell>
    <van-pull-refresh v-model="isLoading" @refresh="onRefresh">
      <van-list v-model="loading" :finished="finished" finished-text="没有更多了" @load="getLatest">
        <div class="card-box">
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
        </div>
      </van-list>
    </van-pull-refresh>
  </div>
</template>

<script>
import { Cell, Swipe, SwipeItem, Icon, List, PullRefresh } from "vant";
import ImageCard from "@/components/ImageCard";
import api from "@/api";
import _throttle from "lodash/throttle";
import _uniqBy from "lodash/uniqBy";
export default {
  name: "Moments",
  data() {
    return {
      artList: [],
      loading: false,
      finished: false,
      isLoading: false
    };
  },
  methods: {
    url(id, index) {
      return api.url(id, index);
    },
    async onRefresh() {
      let res = await api.getLatest();
      if (res.status === 0) {
        this.artList = res.data;
      } else {
        this.$toast({
          message: res.msg,
          icon: require("@/svg/error.svg")
        });
      }
      this.isLoading = false;
    },
    getLatest: _throttle(async function() {
      let newList;
      let res = await api.getLatest();
      if (res.status === 0) {
        newList = res.data;
        let artList = JSON.parse(JSON.stringify(this.artList));

        artList.push(...newList);
        artList = _uniqBy(artList, "id")

        this.artList = artList;
        this.loading = false;
        if (this.artList.length > 200) this.finished = true;
      } else {
        this.$toast({
          message: res.msg,
          icon: require("@/svg/error.svg")
        });
        this.loading = false;
      }
    }, 5000),
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
    [Swipe.name]: Swipe,
    [SwipeItem.name]: SwipeItem,
    [Icon.name]: Icon,
    [List.name]: List,
    [PullRefresh.name]: PullRefresh,
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

.moments {
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
</style>
