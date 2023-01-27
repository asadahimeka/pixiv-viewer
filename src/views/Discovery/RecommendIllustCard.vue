<template>
  <div class="rank-card">
    <van-cell class="cell" :border="false" is-link @click="toList">
      <template #title>
        <Icon class="icon" name="rec_heart"></Icon>
        <span class="title">推荐</span>
      </template>
    </van-cell>
    <div class="card-box">
      <swiper class="swipe-wrap" :options="swiperOption">
        <swiper-slide class="swipe-item" v-for="art in artList.slice(0, 10)" :key="art.id">
          <ImageCard mode="meta" :artwork="art" @click-card="toArtwork($event)" />
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
import ImageCard from "@/components/ImageCard";
import ImageSlide from "@/components/ImageSlide";
import api from "@/api";
export default {
  name: "RecommendIllustCard",
  data() {
    return {
      artList: [],
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
      let artList = this.artList.slice(10, 15);
      return artList.map(art => {
        return {
          title: art.title,
          src: art.images[0].m
        };
      });
    }
  },
  methods: {
    async getRankList() {
      this.loading = true
      let res = await api.getRecommendedIllust();
      if (res.status === 0) {
        this.artList = res.data;
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
        name: "RecommendIllust",
        params: { list: this.artList }
      });
    },
    toArtwork(id) {
      this.$router.push({
        name: "Artwork",
        params: { id, list: this.artList }
      });
    }
  },
  mounted() {
    this.$nextTick(() => {
      setTimeout(() => {
        this.getRankList();
      }, 200)
    })
  },
  components: {
    [Cell.name]: Cell,
    [Icon.name]: Icon,
    [Loading.name]: Loading,
    ImageCard,
    ImageSlide
  }
};
</script>

<style lang="stylus" scoped>
.rank-card {
  padding: 0 14px;
  margin-bottom: 24px;

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
        width 330px
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
