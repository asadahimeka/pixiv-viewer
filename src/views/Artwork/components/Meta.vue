/* eslint-disable vue/no-template-key */
<template>
  <div class="artwork-meta" v-if="artwork.author">
    <div class="mask">
      <canvas class="mask-text" ref="mask"></canvas>
    </div>
    <div class="author-info">
      <img class="avatar" :src="artwork.author.avatar" :alt="artwork.author.name"
        @click="toAuthor(artwork.author.id)" />
      <div class="name-box">
        <h2 class="title">{{ artwork.title }}</h2>
        <div class="author">{{ artwork.author.name }}</div>
      </div>
    </div>
    <div class="date">
      <span class="created">{{ artwork.created | formatDate }}</span>
      <span class="view">
        <Icon name="view" class="icon"></Icon>
        {{ artwork.view | convertToK }}
      </span>
      <span class="like">
        <Icon name="like" class="icon"></Icon>
        {{ artwork.like | convertToK }}
      </span>
    </div>
    <div class="pid_link">
      <a target="_blank" rel="noreferrer" class="umami--click--click_pixiv_link"
        :href="'https://www.pixiv.net/artworks/' + artwork.id">https://www.pixiv.net/artworks/{{ artwork.id }}</a>
    </div>
    <div class="whid">
      <span>{{ artwork.width }}×{{ artwork.height }}</span>
      <span @click="copyId(artwork.id)">PID:{{ artwork.id }}</span>
      <span @click="copyId(artwork.author.id)">UID:{{ artwork.author.id }}</span>
    </div>
    <ul class="tag-list" :class="{ censored: isCensored(artwork) }">
      <li v-if="artwork.illust_ai_type == 2" class="tag name" style="margin-right: 12px;;font-weight: bold;">
        <a href="https://www.pixiv.net/info.php?id=8733" target="_blank" rel="noopener"
          style="color: #3e7699 !important;">AI 生成</a>
      </li>
      <li v-if="artwork.x_restrict" class="tag name" style="margin-right: 12px;;font-weight: bold;">
        <span style="color: red !important;">NSFW</span>
      </li>
      <template v-for="(tag, ti) in artwork.tags">
        <li :key="ti + '_1'" class="tag name" @click="toSearch(tag.name)">#{{ tag.name }}</li>
        <li :key="ti + '_2'" class="tag translated" @click="toSearch(tag.name)" v-if="tag.translated_name">
          {{ tag.translated_name }}</li>
      </template>
    </ul>
    <div class="caption" :class="{ censored: isCensored(artwork) }" @click.stop.prevent="handleClick($event)"
      v-html="artwork.caption"></div>
    <van-button color="#3e7699" size="small" plain block style="margin-top:16px" @click="downloadArtwork()">
      <span class="umami--click--download_img">下载</span>
    </van-button>
  </div>
</template>

<script>
import { Button } from "vant";
import { mapGetters } from "vuex";
import FileSaver from "file-saver";
import dayjs from 'dayjs';
import { copyText } from "@/utils";
export default {
  props: {
    artwork: {
      type: Object,
      required: true
    }
  },
  components: {
    [Button.name]: Button
  },
  data() {
    return {};
  },
  computed: {
    ...mapGetters(["isCensored"])
  },
  filters: {
    convertToK(val) {
      if (!val) return "";
      val = +val;
      if (val > 10000) {
        return (val / 1000).toFixed(1) + "K";
      } else {
        return val;
      }
    },
    formatDate(val) {
      return dayjs(val).format("YYYY-MM-DD HH:mm");
    }
  },
  methods: {
    drawMask() {
      let canvas = this.$refs.mask;
      if (!canvas) return;

      let { width, height } = canvas.getBoundingClientRect();
      canvas.width = width * 2;
      canvas.height = height * 2;
      canvas.style.width = width;
      canvas.style.height = height;

      let ctx = canvas.getContext("2d"),
        txt = `${this.artwork.id}  `;

      ctx.rotate((-20 * Math.PI) / 180);
      ctx.font = "bold 72px Dosis";
      let txtHeight = 85;
      let w = Math.ceil(ctx.measureText(txt).width);
      // txt = new Array(w * 2).join(txt + " ");
      let h = Math.sqrt(width ** 2 + height ** 2) * 2;
      console.log(w, Math.ceil(h / txtHeight));
      for (let i = 0; i < h / txtHeight; i++) {
        for (let j = 0; j < w; j++) {
          if (i === Math.floor(h / txtHeight / 2) && j === 2) {
            ctx.fillStyle = "rgba(0,0,0,.13)";
          } else {
            ctx.fillStyle = "rgba(0,0,0,.05)";
          }
          ctx.fillText(txt, (j - 1) * w, i * txtHeight);
        }
      }
    },
    handleClick(e) {
      if (e.target.tagName === "A") {
        window.open(e.target.href);
      }
    },
    toAuthor(id) {
      this.$router.push({
        name: "Users",
        params: { id }
      });
    },
    toSearch(keyword) {
      this.$router.push(`/search/${keyword}`)
    },
    downloadArtwork() {
      this.artwork.images.forEach((item, index) => {
        FileSaver.saveAs(
          item.o,
          `${this.artwork.author.name}_${this.artwork.title}_${this.artwork.id}_p${index}.${item.o.split('.').pop()}`
        );
      });
    },
    async copyId(text) {
      copyText(
        text,
        () => this.$toast('已复制'),
        () => this.$toast('复制链接失败')
      )
    }
  },
  mounted() {
    this.drawMask();
  }
};
</script>

<style lang="stylus" scoped>
.artwork-meta {
  position: relative;
  padding: 12px 20px;
  margin: 20px 0;

  .pid_link {
    font-size: 22px;
  }

  .mask {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: -1;
    overflow: hidden;

    .mask-text {
      width: 100%;
      height: 100%;
    }
  }

  .author-info {
    height: 86px;
    margin: 10px 0 20px 0;

    .avatar {
      float: left;
      width: 86px;
      height: 86px;
      border-radius: 50%;
      overflow: hidden;
      margin-right: 18px;
    }

    .name-box {
      height: 100%;
      white-space: nowrap;

      .title {
        padding-top: 4px;
        margin-bottom: 8px;
        font-size: 32px;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .author {
        font-size: 22px;
        color: #9b9b9b;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }
  }

  .date {
    font-size: 24px;
    color: #7c8f99;
    margin: 16px 0;

    .view {
      margin-left: 24px;
      color: #3e7699;

      .icon {
        font-size: 1em;
        margin-right: 0px;
        vertical-align: -0.14em;
      }
    }

    .like {
      margin-left: 24px;
      color: #36a8f5;

      .icon {
        font-size: 0.8em;
        margin-right: 0px;
        vertical-align: baseline;
      }
    }

    .id {
      margin-left: 12px;
    }
  }

  .whid {
    display flex
    align-items center
    margin 16px 0 -4px
    font-size 20px
    color #7c8f99
    span {
      display inline-block
      margin-right 10px
      padding 6px 4px
    }
  }

  .tag-list {
    color: #3e7699;
    margin: 16px 0;
    overflow: hidden;

    .tag {
      line-height: 42px;
      font-size: 26px;
      float: left;
      margin-right: 10px;

      &.translated {
        font-size: 22px;
        color: #adadad;
        margin-right: 20px;
      }
    }
  }

  .caption {
    font-size: 24px;
    line-height: 32px;
    word-break: break-all;

    ::v-deep a {
      color: #36a8f5;
    }
  }
}
</style>
