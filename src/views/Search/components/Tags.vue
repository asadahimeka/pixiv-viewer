<template>
  <masonry class="tags" v-bind="$store.getters.wfProps">
    <div
      class="tag"
      v-for="(tag,index) in tags"
      :key="index"
      @click.stop="search(tag.name)"
      >
      <img :src="tag.pic" alt style="position: absolute;top: 0;left: 0;" />
      <div class="meta">
        <div class="content">
          <div class="name" v-if="tag.name" :class="[getLength(tag.name)]">#{{tag.name}}</div>
          <div class="tname" v-if="tag.tname" :class="[getLength(tag.tname)]">{{tag.tname}}</div>
        </div>
      </div>
    </div>
  </masonry>
  <!-- <div class="tags">
    <div class="top" v-if="tags.length>0">
      <div class="tag" @click.stop="search(tags[0].name)">
        <img :src="tags[0].pic" alt />
        <div class="meta">
          <div class="content">
            <div
              class="name"
              v-if="tags[0].name"
              :class="{s: tags[0].name.length>=10, m: tags[0].name.length>=6}"
            >#{{tags[0].name}}</div>
            <div
              class="tname"
              v-if="tags[0].tname"
              :class="{s: tags[0].tname.length>=10, m: tags[0].tname.length>=6}"
            >{{tags[0].tname}}</div>
          </div>
        </div>
      </div>
    </div>
    <div class="bottom" v-if="tags.length>3">
      <div class="row">
        <div
          class="tag"
          v-for="(tag,index) in tags.slice(1)"
          :key="index"
          @click.stop="search(tag.name)"
        >
          <img :src="tag.pic" alt />
          <div class="meta">
            <div class="content">
              <div class="name" v-if="tag.name" :class="[getLength(tag.name)]">#{{tag.name}}</div>
              <div class="tname" v-if="tag.tname" :class="[getLength(tag.tname)]">{{tag.tname}}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div> -->
</template>

<script>
import api from "@/api";
export default {
  data() {
    return {
      tags: []
    };
  },
  methods: {
    search(keywords) {
      this.$emit("search", keywords);
    },
    async getTags() {
      let res = await api.getTags();
      if (res.status === 0) {
        this.tags = res.data;
      } else {
        this.$toast({
          message: res.msg
        });
        this.loading = false;
        this.error = true;
      }
    },
    getLength(val) {
      if (val.length >= 10) {
        return "s";
      }
      if (val.length >= 4) {
        return "m";
      }
      return "l";
    }
  },
  mounted() {
    this.getTags();
  },
  components: {}
};
</script>

<style lang="stylus" scoped>
.tags {
  display: flex;
  // flex-direction: column;

  .tag {
    position: relative;
    width: 100%;
    margin-bottom: 10px;
    padding-bottom: 100%;

    img {
      display: block;
      width: 100%;
      height: 100%;
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
