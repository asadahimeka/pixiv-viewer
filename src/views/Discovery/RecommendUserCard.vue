<template>
  <div class="rank-card RecommendUserCard">
    <van-cell class="cell" :border="false">
      <template #title>
        <Icon class="icon rec_user_icon" name="rec_user"></Icon>
        <span class="title">画师</span>
      </template>
    </van-cell>
    <div class="card-box">
      <swiper class="swipe-wrap" :options="swiperOption">
        <swiper-slide v-if="loading" class="swipe-item more">
          <ImageSlide :images="[]">
            <div class="link">
              <van-loading class="d-loading" :size="'50px'" />
            </div>
          </ImageSlide>
        </swiper-slide>
        <swiper-slide v-for="u in userList" :key="u.id" class="swipe-item more">
          <ImageSlide :images="u.illusts">
            <div class="link" @click="toUserPage(u.id)">
              <div class="user_info">
                <img class="user_avatar" :src="u.avatar" alt="">
                <div class="user_name">{{ u.name }}</div>
              </div>
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
  name: "RecommendUserCard",
  data() {
    return {
      userList: [],
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
  methods: {
    async getUserList() {
      this.loading = true
      let res = await api.getRecommendedUser();
      if (res.status === 0) {
        this.userList = res.data;
      } else {
        this.$toast({
          message: res.msg,
          icon: require("@/icons/error.svg")
        });
      }
      this.loading = false
    },
    toUserPage(id) {
      this.$router.push({
        name: "Users",
        params: { id }
      });
    }
  },
  mounted() {
    this.$nextTick(() => {
      setTimeout(() => {
        this.getUserList();
      }, 300)
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

<style lang="stylus">
.RecommendUserCard
  .image-slide
    .slide
      margin-left -12%
      .image
        width: 44%;
        margin-right: -10%;
        flex 1
</style>
<style lang="stylus" scoped>
.rank-card {
  padding: 0 14px;
  margin-bottom: 24px;

  .rec_user_icon {
    margin-right 8px
    font-size 46px
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
        width 390px
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
          background none;
          height: 97%;

          .user_avatar {
            width 72px
            height 72px
            border-radius 50%
          }

          .user_name {
            margin: 10px 0;
            font-size: 30px;
            line-height 1.5
            overflow: hidden;
            text-overflow: ellipsis;
            display: -webkit-box;
            -webkit-line-clamp: 1;
            -webkit-box-orient: vertical;
          }

          .user_info {
            position: absolute;
            bottom: 0;
            width: 100%;
            padding: 10px 16px 40px;
            box-sizing: border-box;
            text-align center
            color: #fff;
          }

          .link {
            position: absolute;
            width: 100%;
            height: 100%;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);

            &::before {
              position: absolute;
              content: '';
              bottom: 0;
              width: 100%;
              height: 100%;
              background-image: linear-gradient(0deg, rgba(0,0,0,0.7) 0%, rgba(255,255,255,0) 100%);
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
