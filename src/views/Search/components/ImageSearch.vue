<template>
  <div class="image-search">
    <van-uploader class="open-dialog" :before-read="beforeRead" :after-read="afterRead" :disabled="loading">
      <Icon v-show="!loading&&!file" name="image" />
      <div v-show="loading" class="loading"></div>
    </van-uploader>
    <span @click="reset">
      <Icon v-show="!loading&&file" name="close" />
    </span>
    <div v-if="file" class="container">
      <div class="thumb">
        <img :src="file.content" :alt="file.file.name">
      </div>
      <div v-if="resultList" class="result-list">
        <masonry v-bind="wfProps">
          <div v-for="result in resultList" :key="result.id" class="result" @click="toArtwork(result)">
            <img class="thumb" :src="result.thumb" :alt="result.title">
            <div class="meta">
              <h2 class="title" v-html="result.title"></h2>
              <div v-if="result.id" class="info pid">ID: {{ result.id }}</div>
              <div v-else class="info pid">{{ result.url | hostname }}</div>
              <div class="info author" v-html="result.author"></div>
            </div>
            <div class="similarity">{{ result.similarity }}%</div>
            <div v-if="+result.similarity < 80" class="low" :style="{ opacity: (100 - result.similarity) / 100 }"></div>
          </div>
          <div v-if="!resultList.length" class="result">
            <div class="meta">
              <h2 class="title" style="text-align: center;width: 100%;margin-top: 0.5rem;">{{ $t('tips.no_data') }}</h2>
            </div>
          </div>
        </masonry>
      </div>
    </div>
  </div>
</template>

<script>
import _ from 'lodash'
import { BASE_API_URL } from '@/api/http'
export default {
  filters: {
    hostname(val) {
      try {
        const u = new URL(val)
        return u.hostname.replace('www.', '')
      } catch (error) {
        return ''
      }
    },
  },
  components: {
  },
  data() {
    return {
      file: null,
      loading: false,
      res: null,
      wfProps: {
        gutter: '8px',
        cols: {
          900: 1,
          1200: 2,
          default: 3,
        },
      },
    }
  },
  computed: {
    resultList() {
      if (!this.res) return null

      let list = this.res.results.map(result => {
        return {
          id: result.data.pixiv_id,
          url: result.data.ext_urls && result.data.ext_urls[0],
          title: result.data.title,
          author: result.data.member_name,
          thumb: result.header.thumbnail,
          similarity: result.header.similarity,
        }
      })

      list = list.filter(e => (e.id || e.url) && e.similarity > 50)
      return _.orderBy(list, 'similarity', 'desc')
    },
  },
  methods: {
    reset() {
      this.file = null
    },
    beforeRead(file) {
      // console.log(file);
      if (!file.type.startsWith('image/')) {
        this.$toast(this.$t('search.img.placeholder'))
        return false
      }
      return true
    },
    afterRead(file) {
      this.loading = true
      // 此时可以自行将文件上传至服务器

      const showErr = () => {
        this.$toast({
          type: 'fail',
          message: this.$t('search.img.err'),
        })
      }

      const formData = new FormData()
      formData.append('file', file.file, file.file.name)
      const base = BASE_API_URL.replace('/api/pixiv', '')
      fetch(`${base}/api/sauce/`, {
        method: 'POST',
        body: formData,
      }).then(res => {
        if (!res.ok) throw new Error('Resp not ok.')
        return res.json()
      }).then(res => {
        this.loading = false
        if (!Array.isArray(res.results)) {
          showErr()
          return
        }
        this.file = file
        this.res = res
        this.$emit('show')
      }).catch(() => {
        this.loading = false
        showErr()
      })
    },
    toArtwork({ id, url }) {
      if (id) {
        this.$router.push({ name: 'Artwork', params: { id } })
        return
      }
      window.open(url, '_blank', 'noopener')
    },
  },
}
</script>

<style lang="stylus" scoped>
.image-search {
  .open-dialog {

    ::v-deep .van-uploader__wrapper--disabled {
      opacity: 1;
    }

    .loading {
      margin-top: -8px;
      margin-right: -8px;
      width: 0.6rem;
      height: 0.6rem;
      background: url('~@/icons/loading-1.svg');
      background-size: 100%;
    }

  }

  .svg-icon {
    font-size 0.45rem
  }

  .container {
    position: fixed;
    top: 1.6rem;
    left: 0;
    width: 100vw;
    height: 93vh;
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
