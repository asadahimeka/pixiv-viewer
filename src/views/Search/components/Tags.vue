<template>
  <div style="position: relative;">
    <v-masonry class="tags" v-bind="$store.getters.wfProps" gutter="8px">
      <div class="tag" v-for="(tag, index) in tags" :key="index" @click.stop="search(tag.name)"
        :style="{ backgroundImage: `linear-gradient(45deg, ${randColor()} 0%, ${randColor()} 100%)` }">
        <img :src="tag.pic" alt />
        <div class="meta">
          <div class="content">
            <div class="name" v-if="tag.name" :class="[getLength(tag.name)]">#{{ tag.name }}</div>
            <div class="tname" v-if="tag.tname" :class="[getLength(tag.tname)]">{{ tag.tname }}</div>
          </div>
        </div>
      </div>
    </v-masonry>
    <van-loading v-if="loading" class="loading" size="60px" />
  </div>
</template>

<script>
import api from "@/api";
import { Loading } from "vant";
export default {
  data() {
    return {
      loading: false,
      tags: [],
    };
  },
  methods: {
    search(keywords) {
      this.$emit("search", keywords);
    },
    async getTags() {
      this.loading = true
      let res = await api.getTags();
      if (res.status === 0) {
        this.tags = res.data;
      } else {
        this.$toast({
          message: res.msg
        });
        this.error = true;
      }
      this.loading = false;
    },
    getLength(val) {
      if (val.length >= 10) {
        return "s";
      }
      if (val.length >= 4) {
        return "m";
      }
      return "l";
    },
    randColor() {
      var characters = ["a", "b", "c", "d", "e", "f", 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
      var randomColorArray = [];
      for (var i = 0; i < 6; i++) {
        var randomIndex = Math.floor(Math.random() * characters.length);
        randomColorArray.push(characters[randomIndex])
      }
      return `#${randomColorArray.join("")}`;
    }
  },
  mounted() {
    this.getTags();
  },
  components: {
    [Loading.name]: Loading
  }
};
</script>

<style lang="stylus" scoped>
.loading
  position absolute
  top 300px
  left 50%
  transform translateX(-50%)


.tags {
  // display: flex;
  // flex-direction: column;

  .tag {
    position: relative;
    width: 100%;
    margin-bottom: 10px;
    padding-bottom: 100%;
    border-radius: 8px;

    img {
      position: absolute;
      top: 0;
      left: 0;
      display: block;
      width: 100%;
      height: 100%;
      border-radius: 8px;
      object-fit: cover;
    }

    .meta {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      text-align: center;
      color: #fff;
      background: rgba(#000, 0.3);
      border-radius: 8px;

      .content {
        position: absolute;
        bottom: 10%;
        width: 100%;

        .name {
          font-size: 36px;
          margin: 10px 0;
        }

        .tname {
          font-size: 28px;
          margin: 10px 0;
        }

        .l {
          font-size: 30px;
        }

        .m {
          font-size: 26px;
        }

        .s {
          font-size: 24px;
        }
      }
    }
  }

  .top {
    .tag {
      height: 600px;
      width: 100%;
    }
  }

  .bottom {
    display: flex;

    .row {
      .tag {
        width: 33.33%;
      }
    }
  }
}
</style>
