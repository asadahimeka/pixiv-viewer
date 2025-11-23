<template>
  <div v-if="listDetails.length" class="TagStorySlides rank-card">
    <van-cell class="cell" :border="false">
      <template #title>
        <Icon class="icon" name="spec_star" style="margin-right:0.2rem;font-size:0.6rem" />
        <span v-if="tag" class="tag">#{{ tag }} - </span>
        <span class="title">{{ $t('lsPtlBf66gm0GWyn_c6pj') }}</span>
      </template>
    </van-cell>
    <div class="card-box" style="padding: 0 20px">
      <swiper class="swipe-wrap" :options="swiperOption" @reach-end="onReachEnd">
        <swiper-slide v-for="it in listDetails" :key="it.id" class="swipe-item">
          <div class="spec_wp" @click="toDetail(it)">
            <Pximg :src="it.coverImage" :alt="it.label" />
            <div class="sp_info">
              <h2 class="sp_title">{{ it.label }}</h2>
            </div>
          </div>
        </swiper-slide>
        <swiper-slide v-if="loading" class="swipe-item">
          <van-loading class="d-loading" :size="'50px'" />
        </swiper-slide>
        <div slot="scrollbar" class="swiper-scrollbar" style="bottom:0"></div>
        <div slot="button-prev" class="swiper-button-prev"></div>
        <div slot="button-next" class="swiper-button-next"></div>
      </swiper>
    </div>
  </div>
</template>

<script>
import api from '@/api'

export default {
  name: 'SpotlightsRecomCard',
  components: {
  },
  props: {
    tag: {
      type: String,
      default: '',
    },
  },
  data() {
    return {
      loading: false,
      isEnd: false,
      listIds: [],
      listDetails: [],
      swiperOption: {
        freeMode: true,
        slidesPerView: 'auto',
        mousewheel: true,
        scrollbar: {
          el: '.swiper-scrollbar',
          draggable: true,
        },
        navigation: {
          nextEl: '.swiper-button-next',
          prevEl: '.swiper-button-prev',
        },
      },
    }
  },
  watch: {
    tag() {
      this.init()
    },
  },
  created() {
    this.init()
  },
  methods: {
    async init() {
      this.loading = false
      this.isEnd = false
      this.listIds = []
      this.listDetails = []
      this.listIds = await api.getTagStories(this.tag)
      if (!this.listIds.length) return
      this.listDetails = await api.getTagStoryDetails(this.listIds.slice(0, 20))
    },
    async onReachEnd() {
      if (this.loading || this.isEnd || this.$route.name != 'SearchKeyword') return
      if (!this.listIds.length || !this.listDetails.length) return
      this.loading = true
      const len = this.listDetails.length
      const details = await api.getTagStoryDetails(this.listIds.slice(len, len + 20))
      this.loading = false
      if (!details.length) {
        this.isEnd = true
        return
      }
      this.listDetails = this.listDetails.concat(details)
    },
    toDetail(item) {
      this.$router.push({
        name: 'TagStory',
        params: { tag: item.tag, date: item.createDate },
      })
    },
  },
}
</script>

<style lang="stylus" scoped>
.rank-card {
  padding: 0;
  margin-bottom: 24px;

  .tag {
    font-size 26px
  }
  .title {
    font-size 26px;
  }

  .svg-icon {
    font-size 38px;
  }

  .spec_wp {
    height 97%
    cursor pointer

    img {
      position relative
      width 100%
      height 100%
      object-fit cover

      &[lazy="loading"] {
        width: 100px;
        height: 100px;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
      }
    }

    .sp_info {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 97%;

      &::before {
        position: absolute;
        content: '';
        bottom: 0;
        width: 100%;
        height: 50%;
        background-image: linear-gradient(0deg, rgba(0,0,0,0.5) 0%, rgba(255,255,255,0) 100%);
      }
    }

    .sp_title {
      position: absolute;
      bottom: 0;
      width: 100%;
      padding 10px 16px 40px;
      box-sizing: border-box;
      font-size 24px;
      text-align: center;
      color: #fff;
      white-space nowrap;
      text-overflow ellipsis;
      overflow hidden;
    }
  }

  .d-loading {
    position absolute
    top 50%
    left 50%
    transform translate(-50%, -50%) !important
  }

  .card-box {
    height: 247px;

    .swipe-wrap {
      height: 100%;
      overflow: hidden;

      .swipe-item {
        width 320px;
        margin-right: 12px;

        &:last-child {
          .image-card {
            margin-right: 0;
          }
        }

        .image-card {
          font-size: 0;
          border: 1PX solid #ebebeb;
          box-sizing: border-box;
          width: 100%;
          height: 97%;
          padding-bottom: 0 !important;
        }
      }
    }
  }
}
</style>
