<template>
  <div ref="related" class="related">
    <van-cell class="cell" :border="false">
      <template #title>
        <Icon class="icon heart" name="heart" />
        <span class="title">{{ $t('common.related') }}</span>
      </template>
    </van-cell>
    <van-list
      v-if="showList"
      v-model="loading"
      :loading-text="$t('tips.loading')"
      :finished="finished"
      :finished-text="$t('tips.no_more')"
      :error.sync="error"
      :offset="800"
      :error-text="$t('tips.net_err')"
      @load="getRelated()"
    >
      <masonry v-bind="masonryProps">
        <NovelCard v-for="art in artList" :key="art.id" :artwork="art" @click-card="toArtwork($event)" />
      </masonry>
    </van-list>
    <van-loading v-else size="64px" style="width: 64px;margin: 20px auto;" />
  </div>
</template>

<script>
import api from '@/api'
import _ from 'lodash'
import NovelCard from '@/components/NovelCard.vue'
export default {
  name: 'RelatedNovel',
  components: {
    NovelCard,
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
      masonryProps: {
        gutter: '8px',
        cols: {
          600: 1,
          1200: 2,
          1600: 3,
          default: 4,
        },
      },
    }
  },
  mounted() {
    this.setObserver()
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
    url(id, index) {
      return api.url(id, index)
    },
    reset() {
      this.curPage = 1
      this.artList = []
    },
    getRelated: _.throttle(async function () {
      if (!this.artwork.id) return
      this.loading = true
      let newList
      const res = await api.getRelatedNovel(this.artwork.id, this.curPage)
      if (res.status === 0) {
        newList = res.data
        if (newList.length) {
          this.artList = _.uniqBy([
            ...this.artList,
            ...newList,
          ], 'id')
          this.curPage++
          if (this.curPage > 2) this.finished = true
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
    toArtwork(id) {
      this.$router.push({
        name: 'NovelDetail',
        params: { id },
      })
    },
    init() {
      this.reset()
      this.showList = true
      this.getRelated()
    },
  },
}
</script>

<style lang="stylus" scoped>
.related {
  min-height: 72vh;
  .cell {
    padding: 0 8px 20px 8px;
  }

  .card-box {
    padding: 0 12px;

    // height: 365px;
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
