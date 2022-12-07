<template>
  <div class="rank-card">
    <van-cell class="cell" :border="false" is-link @click="toList">
      <template #title>
        <Icon class="icon icon-spec_star" name="spec_star"></Icon>
        <span class="title">特辑</span>
      </template>
    </van-cell>
    <div class="card-box">
      <swiper class="swipe-wrap" :options="swiperOption">
        <swiper-slide class="swipe-item" v-for="art in spotlights.articles" :key="art.id">
          <div class="spec_wp" @click="toDetail(art.id)">
            <img v-lazy="art.thumbnail" :alt="art.title">
            <div class="sp_info">
              <h2 class="sp_title">{{ art.title }}</h2>
            </div>
          </div>
        </swiper-slide>
        <swiper-slide class="swipe-item more">
          <ImageSlide :images="slides">
            <div class="link" @click="toList">
              <van-loading v-if="loading" class="d-loading" :size="'50px'" />
              <template v-else>
                <Icon name="more" scale="20"></Icon>
                <div>查看更多</div>
              </template>
            </div>
          </ImageSlide>
        </swiper-slide>
        <div class="swiper-scrollbar" slot="scrollbar"></div>
        <div class="swiper-button-prev" slot="button-prev"></div>
        <div class="swiper-button-next" slot="button-next"></div>
      </swiper>
    </div>
  </div>
</template>

<script>
import { Cell, Icon, Loading } from "vant";
import ImageSlide from "@/components/ImageSlide";
import api from "@/api";
export default {
  name: "SpotlightCard",
  data() {
    return {
      spotlights: [],
      loading: true,
      swiperOption: {
        freeMode: true,
        slidesPerView: "auto",
        // mousewheel: true,
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
  computed: {
    slides() {
      return this.spotlights.rank?.map(art => {
        return {
          title: art.title,
          src: art.thumbnail
        };
      }) || [];
    }
  },
  methods: {
    async getList() {
      this.loading = true
      let res = await api.getSpotlights();
      if (res.status === 0) {
        this.spotlights = res.data;
      } else {
        this.$toast({
          message: res.msg,
          icon: require("@/icons/error.svg")
        });
      }
      this.loading = false
    },
    toList() {
      this.$router.push({
        name: "Spotlights",
        params: { list: this.spotlights }
      });
    },
    toDetail(id) {
      this.$router.push({
        name: "Spotlight",
        params: { id }
      });
    }
  },
  mounted() {
    this.$nextTick(() => {
      setTimeout(() => {
        this.getList();
      }, 100)
    })
  },
  components: {
    [Cell.name]: Cell,
    [Icon.name]: Icon,
    [Loading.name]: Loading,
    ImageSlide
  }
};
</script>

<style lang="stylus" scoped>
.rank-card {
  padding: 0 14px;
  margin-bottom: 24px;


  .spec_wp {
    height 97%

    img {
      position relative
      width 100%
      height 100%
      object-fit cover
      border-radius: 20px;

      &[lazy='loading'] {
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
    height: 365px;

    .swipe-wrap {
      height: 100%;
      border-radius: 20px;
      overflow: hidden;

      .swipe-item {
        width 550px
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

        .image-slide {
          border: 1px solid #ebebeb;
          border-radius: 18px;
          box-sizing: border-box;
          height: 97%;

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
</style>
