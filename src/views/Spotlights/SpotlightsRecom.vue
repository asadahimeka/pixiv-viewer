<template>
  <div class="rank-card">
    <van-cell class="cell" :border="false">
      <template #title>
        <Icon class="icon" :name="icon" />
        <span v-if="tag" class="tag">#{{ tag }}</span>
        <span class="title">{{ title }}</span>
      </template>
    </van-cell>
    <div class="card-box">
      <swiper class="swipe-wrap" :options="swiperOption">
        <swiper-slide v-for="art in list" :key="art.id" class="swipe-item">
          <div class="spec_wp" @click="toDetail(art.id)">
            <img v-lazy="art.thumbnail" :alt="art.title">
            <div class="sp_info">
              <h2 class="sp_title">{{ art.title }}</h2>
            </div>
          </div>
        </swiper-slide>
        <div slot="scrollbar" class="swiper-scrollbar"></div>
        <div slot="button-prev" class="swiper-button-prev"></div>
        <div slot="button-next" class="swiper-button-next"></div>
      </swiper>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SpotlightsRecomCard',
  components: {
  },
  props: {
    isTypeDetail: {
      type: Boolean,
      default: false,
    },
    title: {
      type: String,
      default: '',
    },
    tag: {
      type: String,
      default: '',
    },
    icon: {
      type: String,
      default: '',
    },
    list: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    return {
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
  methods: {
    toDetail(id) {
      if (this.isTypeDetail) {
        this.$router.push({
          name: 'SpotlightDetail',
          params: { id },
        })
      } else {
        this.$router.push({
          name: 'Spotlight',
          params: { id },
        })
      }
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
    color #ff007a
  }
  .title {
    font-size 26px;
  }

  .svg-icon {
    font-size 38px;
  }

  .spec_wp {
    height 97%

    img {
      position relative
      width 100%
      height 100%
      object-fit cover
      border-radius: 20px;

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
      border-radius: 20px;

      &::before {
        position: absolute;
        content: '';
        bottom: 0;
        width: 100%;
        height: 50%;
        border-radius: 20px;
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
    // padding: 0 12px;
    height: 372px;

    .swipe-wrap {
      height: 100%;
      border-radius: 20px;
      overflow: hidden;

      .swipe-item {
        width 361px;
        margin-right: 12px;

        &:last-child {
          .image-card {
            margin-right: 0;
          }
        }

        .image-card {
          // width: 50vw;
          font-size: 0;
          border: 1px solid #ebebeb;
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
