<template>
  <div class="image-search">
    <van-uploader class="open-dialog" :before-read="beforeRead" :after-read="afterRead" :disabled="loading">
      <Icon v-show="!loading&&!file" name="image" />
      <div v-show="loading" class="loading"></div>
    </van-uploader>
    <span>
      <Icon v-show="!loading&&file" class="image-search-close" name="close" @click.native="reset" />
    </span>
    <div v-if="file" class="container">
      <div class="thumb">
        <img :src="file.content" :alt="file.file.name">
      </div>
      <div v-if="resultList" class="result-list">
        <masonry v-bind="wfProps">
          <div v-for="(result, i) in resultList" :key="i" class="result" @click="toArtwork(result)">
            <img class="thumb" :src="result.thumb" :alt="result.title">
            <div class="meta">
              <div v-if="result.id" class="info pid">ID: {{ result.id }}</div>
              <h2 v-if="result.title" class="title">{{ result.title }}</h2>
              <div v-if="result.url" class="info pid">{{ result.url | hostname }}</div>
              <div v-if="result.author" class="info author">{{ result.author }}</div>
            </div>
            <div class="similarity">{{ result.similarity }}%</div>
            <div v-if="result.similarity < 80" class="low"></div>
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
import _ from '@/lib/lodash'
import { Dialog } from 'vant'
import { COMMON_PROXY, PIXIV_NEXT_URL } from '@/consts'
import { calculateFileHash } from '@/utils'
import { getCache, setCache } from '@/utils/storage/siteCache'

export default {
  filters: {
    hostname(val) {
      try {
        const u = new URL(val)
        const res = u.hostname.replace('www.', '')
        if (res == 'pixiv.net') return ''
        return res
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
      resultList: null,
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
  methods: {
    reset() {
      this.file = null
      this.resultList = null
    },
    beforeRead(file) {
      if (!file.type.startsWith('image/')) {
        this.$toast(this.$t('search.img.placeholder'))
        return false
      }
      return true
    },
    async afterRead(file) {
      window.umami?.track('image-search')

      console.log('file: ', file)
      const hash = await calculateFileHash(file.file)
      console.log('hash: ', hash)

      const cacheKey = `image.search.${hash}`
      const cache = await getCache(cacheKey)
      if (cache) {
        this.file = file
        this.resultList = cache
        return
      }

      const showErr = () => {
        this.reset()
        Dialog.alert({
          title: this.$t('tips.tip'),
          message: `<p>${this.$t('search.img.err')}<br>${this.$t('lJtMtr2rgYCSg-osHykE9')}<p>`,
          confirmButtonText: this.$t('common.confirm'),
        })
      }

      try {
        this.loading = true
        const formData = new FormData()
        formData.append('file', file.file, file.file.name)
        const response = await fetch(`${PIXIV_NEXT_URL}/api/sauce/`, {
          method: 'POST',
          body: formData,
        })

        this.loading = false
        if (!response.ok) {
          showErr()
          return
        }
        const res = await response.json()
        if (!Array.isArray(res.results)) {
          showErr()
          return
        }

        this.file = file
        let list = res.results.map(result => {
          const h = result.header
          const d = result.data
          let pid = d.pixiv_id
          if (!pid) {
            pid = d.source?.match(/https:\/\/i\.pximg\.net\/img-original\/img\/\d{4}\/\d{2}\/\d{2}\/\d{2}\/\d{2}\/\d{2}\/(\d+)(\.\w+)?/i)?.[1]
          }
          return {
            id: pid,
            url: d.ext_urls?.[0],
            title: d.title,
            author: d.member_name || d.creator || d.author_name || d.author || d.artist,
            thumb: COMMON_PROXY + h.thumbnail,
            similarity: +h.similarity,
          }
        })
        list = list.filter(e => (e.id || e.url) && e.similarity > 50)
        list = _.orderBy(list, 'similarity', 'desc')
        this.resultList = list

        setCache(cacheKey, list, -1)
        window.umami?.track('image-search-success')
      } catch (err) {
        console.log('err: ', err)
        this.loading = false
        showErr()
      }
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
    ::v-deep .van-uploader__input-wrapper {
      padding .17rem
    }

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

  &-close {
    padding 0.2rem
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
            font-size: 26px;
            margin-bottom: 2PX;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            width: 4.2rem;
          }

          .info {
            font-size: 24px;
            line-height: 36px;
            color: #888;
            max-width: 4.2rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
        }

        .similarity {
          position: absolute;
          bottom: 0.2rem;
          right: 0.2rem;
          font-family: 'Dosis';
          font-size: 60px;
          font-weight: 600;
          text-align: right;
          color: #555;
          letter-spacing: 2PX;
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
