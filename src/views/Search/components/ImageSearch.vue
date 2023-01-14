<template>
  <div class="image-search">
    <van-uploader class="umami--click--image_search open-dialog" :before-read="beforeRead" :after-read="afterRead" :disabled="loading">
      <Icon v-show="!loading&&!file" name="image"></Icon>
      <div v-show="loading" class="loading"></div>
    </van-uploader>
    <span @click="reset">
      <Icon v-show="!loading&&file" name="close"></Icon>
    </span>
    <div class="container" v-if="file">
      <div class="thumb">
        <img :src="file.content" :alt="file.file.name" />
      </div>
      <div class="result-list" v-if="resultList">
        <v-masonry v-bind="wfProps">
          <div class="result" @click="toArtwork(result)" v-for="result in resultList" :key="result.id">
            <img class="thumb" :src="result.thumb" :alt="result.title" />
            <div class="meta">
              <h2 class="title" v-html="result.title"></h2>
              <div v-if="result.id" class="info pid">ID: {{ result.id }}</div>
              <div v-else class="info pid">{{ result.url | hostname }}</div>
              <div class="info author" v-html="result.author"></div>
            </div>
            <div class="similarity">{{ result.similarity }}%</div>
            <div class="low" v-if="+result.similarity < 80" :style="{ opacity: (100 - result.similarity) / 100 }"></div>
          </div>
          <div class="result" v-if="!resultList.length">
            <div class="meta">
              <h2 class="title" style="text-align: center;width: 100%;margin-top: 0.5rem;">暂无数据</h2>
            </div>
          </div>
        </v-masonry>
      </div>
    </div>
  </div>
</template>

<script>
import { Uploader } from "vant";
import _orderBy from "lodash/orderBy";
export default {
  computed: {
    resultList() {
      if (!this.res) return null;

      let list = this.res.results.map(result => {
        return {
          id: result.data.pixiv_id,
          url: result.data.ext_urls && result.data.ext_urls[0],
          title: result.data.title,
          author: result.data.member_name,
          thumb: result.header.thumbnail,
          similarity: result.header.similarity
        };
      });

      list = list.filter(e => (e.id || e.url) && e.similarity > 50)
      return _orderBy(list, "similarity", "desc")
    }
  },
  filters: {
    hostname(val) {
      try {
        let u = new URL(val)
        return u.hostname.replace('www.', '')
      } catch (error) {
        return ''
      }
    }
  },
  data() {
    return {
      file: null,
      loading: false,
      res: null,
      wfProps: {
        gutter: "8px",
        cols: {
          900: 1,
          1200: 2,
          default: 3
        }
      }
    };
  },
  methods: {
    reset() {
      this.file = null;
    },
    beforeRead(file) {
      // console.log(file);
      if (!file.type.startsWith("image/")) {
        this.$toast("请选择图片文件");
        return false;
      }
      return true;
    },
    afterRead(file) {
      this.loading = true;
      // 此时可以自行将文件上传至服务器

      const showErr = () => {
        this.$toast({
          type: "fail",
          message: "返回结果解析失败"
        });
      }

      let formData = new FormData();
      formData.append("file", file.file, file.file.name)
      fetch('https://ef.kanata.ml/hibi3/api/sauce/', {
        method: 'POST',
        body: formData
      }).then(res => {
        if (!res.ok) throw new Error('Resp not ok.')
        return res.json()
      }).then(res => {
        this.loading = false;
        if (!Array.isArray(res.results)) {
          showErr()
          return
        }
        this.file = file;
        this.res = res
        this.$emit("show");
      }).catch(() => {
        this.loading = false;
        showErr()
      })
    },
    toArtwork({ id, url }) {
      if (id) {
        this.$router.push({ name: "Artwork", params: { id } });
        return
      }
      window.open(url, '_blank', 'noopener')
    }
  },
  components: {
    [Uploader.name]: Uploader
  }
};
</script>

<style lang="stylus" scoped>
.image-search {
  position: fixed;
  top: 42px;
  right: 42px;
  z-index: 3;
  .open-dialog {

    ::v-deep .van-uploader__wrapper--disabled {
      opacity: 1;
    }

    .loading {
      margin-top: -8px;
      margin-right: -8px;
      width: 3em;
      height: 3em;
      background: url('~@/icons/loading-1.svg');
      background-size: 100%;
    }

  }

  .svg-icon {
    font-size 0.55rem
  }

  .container {
    position: fixed;
    top: 1.71rem;
    left: 0;
    width: 100vw;
    height: 90.2vh;
    background: #fff;

    > .thumb {
      position: absolute;
      top: 0;
      width: 100%;
      // height: 400px;
      height: 100%;
      margin: 0 auto;
      overflow: hidden;

      &::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(#fff, 0);
      }

      img {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 110%;
        height: 110%;
        object-fit: cover;
        filter: blur(6px);
      }
    }

    .result-list {
      position: relative;
      // margin: 32px;
      margin: 20px 20px;
      max-height: 82.6vh;
      overflow-y: scroll;
      border-radius: 12px;

      &::-webkit-scrollbar {
        width: 0px;
        background: transparent;
      }

      .result {
        position: relative;
        display: flex;
        justify-content: space-between;
        height: 160px;
        margin-top: 20px;
        // padding: 12px;
        border-radius: 12px;
        overflow: hidden;
        box-sizing: border-box;
        background: rgba(#fff, 0.95);

        &:first-of-type {
          margin: 0;
        }

        .thumb {
          position: relative;
          margin: 0;
          margin-right: 20px;
          width: 30%;
          height: auto;
          object-fit: cover;
        }

        .meta {
          flex: 1;
          padding: 20px 0;

          .title {
            font-size: 30px;
            margin-bottom: 10px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            width: 470px;
          }

          .info {
            font-size: 24px;
            line-height: 36px;
            color: #888;
            max-width: 300px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
        }

        .similarity {
          position: absolute;
          right: 20px;
          height: 155px;
          margin-top: 5px;
          font-family: 'Dosis';
          font-size: 60px;
          font-weight: 600;
          line-height: 160px;
          text-align: right;
          color: #555;
          letter-spacing: 2px;
        }

        .low {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(#fff, 0.6);
          pointer-events: none;
        }
      }
    }
  }
}
</style>
