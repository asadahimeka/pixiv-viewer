<template>
  <div class="rank-card">
    <van-cell class="cell" :border="false">
      <template #title>
        <Icon class="icon" :name="icon"></Icon>
        <span v-if="tag" class="tag">#{{ tag }}</span>
        <span class="title">{{ title }}</span>
      </template>
    </van-cell>
    <div class="card-box">
      <swiper class="swipe-wrap" :options="swiperOption">
        <swiper-slide class="swipe-item" v-for="art in list" :key="art.id">
          <div class="spec_wp" @click="toDetail(art.id)">
            <img :src="art.thumbnail" :alt="art.title">
            <div class="sp_info">
              <h2 class="sp_title">{{ art.title }}</h2>
            </div>
          </div>
        </swiper-slide>
        <div class="swiper-scrollbar" slot="scrollbar"></div>
        <div class="swiper-button-prev" slot="button-prev"></div>
        <div class="swiper-button-next" slot="button-next"></div>
      </swiper>
    </div>
  </div>
</template>

<script>
import { Cell, Icon } from "vant";

export default {
  name: "SpotlightsRecomCard",
  props: {
    title: {
      type: String,
      default: ''
    },
    tag: {
      type: String,
      default: ''
    },
    icon: {
      type: String,
      default: ''
    },
    list: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      swiperOption: {
        freeMode: true,
        slidesPerView: "auto",
        mousewheel: true,
        scrollbar: {
          el: '.swiper-scrollbar',
          draggable: true
        },
        navigation: {
          nextEl: '.swiper-button-next',
          prevEl: '.swiper-button-prev',
        },
      }
    };
  },
  methods: {
    toDetail(id) {
      this.$router.push({
        name: "Spotlight",
        params: { id }
      });
    }
  },
  components: {
    [Cell.name]: Cell,
    [Icon.name]: Icon,
  }
};
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
      width 100%
      height 100%
      object-fit cover
      border-radius: 20px;
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
