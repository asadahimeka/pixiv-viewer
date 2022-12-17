<template>
  <div class="favorite">
    <van-cell class="cell" :border="false" is-link @click="onClick()" v-if="once">
      <template #title>
        <span class="title">
          用户收藏
          <span class="num" v-if="num">{{num}}件作品</span>
        </span>
      </template>
    </van-cell>
    <h3 v-else class="af_title">用户收藏</h3>
    <van-list
      v-model="loading"
      :finished="finished"
      :finished-text="!once ? '没有更多了' : ''"
      :error.sync="error"
      :offset="800"
      error-text="网络异常，点击重新加载"
      @load="getMemberFavorite()"
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
import _uniqBy from "lodash/uniqBy";
export default {
  name: "FavoriteIllusts",
  props: {
    id: {
      type: Number,
      required: true
    },
    num: {
      type: Number
    },
    once: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      next: 0,
      artList: [],
      error: false,
      loading: false,
      finished: false
    };
  },
  methods: {
    reset() {
      this.next = 0;
      this.artList = [];
      this.loading = false
      this.finished = false
    },
    getMemberFavorite: _throttle(async function() {
      if (!this.id) return;
      this.loading = true;
      let newList;
      let res = await api.getMemberFavorite(this.id, this.next);
      if (res.status === 0) {
        this.next = res.data.next;
        newList = res.data.illusts;
        if (this.once) newList = newList.slice(0, 10);
        let artList = JSON.parse(JSON.stringify(this.artList));

        artList.push(...newList);
        artList = _uniqBy(artList, "id");

        this.artList = artList;
        this.loading = false;
        if (this.once || !this.next) this.finished = true;
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
    },
    onClick() {
      this.$emit("onCilck");
    }
  },
  activated() {
    this.reset();
    this.getMemberFavorite();
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
.af_title
  margin-top 30px
  margin-bottom 40px
  text-align center
  font-size 28px

.favorite {
  .cell {
    padding: 10px 20px;
  }

  .num {
    float: right;
    font-size: 26px;
    color: #888;
  }

  .card-box {
    padding: 0 12px;
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
