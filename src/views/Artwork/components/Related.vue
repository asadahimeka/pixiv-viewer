<template>
  <div ref="related" class="related" :style="manualLoadRelated?'min-height:120px':''">
    <van-cell class="cell" :border="false">
      <template #title>
        <Icon class="icon heart" name="heart" />
        <span class="title">{{ $t('common.related') }}</span>
        <van-button
          v-if="manualLoadRelated && !showList"
          size="small"
          class="load_rel_btn"
          @click="init()"
        >
          {{ $t('7KdpxnZMAURov4JetAfvV') }}
        </van-button>
      </template>
    </van-cell>
    <van-loading v-if="!manualLoadRelated && !showList" size="64px" style="width: 64px;margin: 20px auto;" />
    <ImageList
      v-if="showList"
      :list="artList"
      :loading="loading"
      :finished="finished"
      :error="error"
      :on-load-more="getRelated"
    />
  </div>
</template>

<script>
import _ from '@/lib/lodash'
import api from '@/api'
import { tryURL } from '@/utils'
import ImageList from '@/components/ImageList.vue'
import store from '@/store'

const { manualLoadRelated } = store.state.appSetting

export default {
  name: 'Related',
  components: {
    ImageList,
  },
  props: {
    artwork: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      showList: false,
      curPage: 1,
      artList: [],
      error: false,
      loading: false,
      finished: false,
      nextUrl: null,
      manualLoadRelated,
    }
  },
  mounted() {
    if (!manualLoadRelated) this.setObserver()
  },
  methods: {
    setObserver() {
      const options = {
        // root: document.querySelector('.app-main'),
        rootMargin: '0px 0px 0px 0px',
        threshold: [0.99],
      }
      const ob = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting) {
          this.init()
          ob.disconnect()
        }
      }, options)
      ob.observe(this.$refs.related)
    },
    init() {
      this.reset()
      this.showList = true
      this.getRelated()
    },
    reset() {
      this.curPage = 1
      this.artList = []
    },
    getRelated: _.throttle(async function () {
      if (!this.artwork.id || this.loading || this.finished) return
      console.log('this.nextUrl: ', this.nextUrl)
      this.loading = true
      const nextUrl = tryURL(this.nextUrl)
      const res = await api.getRelated(this.artwork.id, this.curPage, nextUrl?.search.slice(1))
      if (res.status === 0) {
        if (res.data.length) {
          this.artList = _.uniqBy([
            ...this.artList,
            ...res.data,
          ], 'id')
          this.curPage++
          if (res.data.nextUrl) this.nextUrl = res.data.nextUrl
          else this.finished = true
        } else {
          this.finished = true
        }
        this.loading = false
      } else {
        this.$toast({
          message: res.msg,
        })
        this.loading = false
        this.error = true
      }
    }, 1500),
  },
}
</script>

<style lang="stylus" scoped>
.related {
  min-height: 72vh;

  .cell {
    padding: 0 8px 20px 8px;
  }

  .load_rel_btn {
    margin-left: 0.2rem;
    vertical-align: 0.5em;
  }

  .card-box {
    padding: 0 12px;

    // height: 365px;
    .swipe-wrap {
      height: 100%;
      // border-radius: 20px;
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
          border: 1PX solid #ebebeb;
          border-radius: 18px;
          box-sizing: border-box;
        }

        .image-slide {
          border: 1PX solid #ebebeb;
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

.related {
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
