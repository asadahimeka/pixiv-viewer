<template>
  <div class="image-search">
    <van-uploader
      class="open-dialog"
      :before-read="beforeRead"
      :after-read="afterRead"
      :disabled="loading"
    >
      <Icon v-show="!loading" name="image" scale="3"></Icon>
      <div class="loading" v-show="loading"></div>
    </van-uploader>
    <div class="container" v-if="file">
      <div class="thumb">
        <img :src="file.content" :alt="file.file.name" />
      </div>
      <div class="result-list" v-if="resultList">
        <div
          class="result"
          @click="toArtwork(result.id)"
          v-for="result in resultList"
          :key="result.id"
        >
          <img class="thumb" :src="result.thumb" :alt="result.title" />
          <div class="meta">
            <h2 class="title" v-html="result.title"></h2>
            <div class="info pid">ID: {{result.id}}</div>
            <div class="info author" v-html="result.author"></div>
          </div>
          <div class="similarity">{{result.similarity}}%</div>
          <div
            class="low"
            v-if="+result.similarity<80"
            :style="{opacity:(100-result.similarity)/100}"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { Uploader } from "vant";
import _orderBy from "lodash/orderBy";
import _uniqBy from "lodash/uniqBy";
export default {
  computed: {
    resultList() {
      if (!this.res) return null;

      let list = this.res.results.map(result => {
        return {
          id: result.data.pixiv_id,
          title: result.data.title,
          author: result.data.member_name,
          thumb: result.header.thumbnail,
          similarity: result.header.similarity
        };
      });

      list = _uniqBy(list, "id");
      list = _orderBy(list, "similarity", "desc");

      return list;
    }
  },
  data() {
    return {
      file: null,
      loading: false,
      res: null
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

      const width = 250,
        height = 250;
      let canvas = document.createElement("canvas");
      let ctx = canvas.getContext("2d");
      canvas.width = width;
      canvas.height = height;
      ctx.clearRect(0, 0, width, height);
      let img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(blob => {
          let formData = new FormData();
          formData.append("file", new File([blob], file.file.name));
          let xhr = new XMLHttpRequest();
          xhr.onreadystatechange = () => {
            if (xhr.status == 200) {
              if (!xhr.responseText) return;
              // xhr.responseText就是返回的数据
              try {
                this.file = file;
                this.res = JSON.parse(xhr.responseText);
                this.loading = false;
                this.$emit("show");
              } catch (error) {
                this.loading = false;
                this.$toast({
                  type: "fail",
                  message: "返回结果解析失败"
                });
              }
              // console.log(this.res, xhr.responseText);
            }
          };
          // 开始上传
          xhr.open("POST", "https://api.imjad.cn/pixivsearch/", true);
          xhr.send(formData);
        }, file.type || "image/png");
      };

      img.src = file.content;
    },
    toArtwork(id) {
      this.$router.push({
        name: "Artwork",
        params: {
          id
        }
      });
    }
  },
  components: {
    [Uploader.name]: Uploader
  }
};
</script>

<style lang="stylus" scoped>
.image-search {
  .open-dialog {
    position: absolute;
    top: 10px;
    right: 46px;

    ::v-deep .van-uploader__wrapper--disabled {
      opacity: 1;
    }

    .loading {
      margin-top: -8px;
      margin-right: -8px;
      width: 3em;
      height: 3em;
      background: url('~@/svg/loading-1.svg');
      background-size: 100%;
    }
  }

  .container {
    position: absolute;
    top: 98px;
    width: 100%;
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
      max-height: 50vh;
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
