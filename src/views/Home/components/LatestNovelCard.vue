<template>
  <div class="rank-card">
    <van-cell class="cell" :border="false">
      <template #title>
        <Icon class="icon" name="new" />
        <span class="title">{{ $t('common.new_art') }}</span>
      </template>
    </van-cell>
    <van-empty v-show="!show" :description="$t('tips.click_view')" @click.native="getRankList" />
    <div v-show="show" class="card-box">
      <swiper class="swipe-wrap" :options="swiperOption">
        <swiper-slide v-for="art in artList" :key="art.id" class="swipe-item">
          <NovelCard :artwork="art" @click-card="toArtwork($event)" />
        </swiper-slide>
        <swiper-slide v-if="loading" class="swipe-item more">
          <ImageSlide :images="[]">
            <div class="link">
              <van-loading class="d-loading" :size="'50px'" />
            </div>
          </ImageSlide>
        </swiper-slide>
        <div slot="scrollbar" class="swiper-scrollbar"></div>
        <div slot="button-prev" class="swiper-button-prev"></div>
        <div slot="button-next" class="swiper-button-next"></div>
      </swiper>
    </div>
  </div>
</template>

<script>
import NovelCard from '@/components/NovelCard.vue'
import ImageSlide from '@/components/ImageSlide'
import api from '@/api'
import { filterHomeNovel } from '@/utils/filter'
export default {
  name: 'LatestMangaCard',
  components: {
    ImageSlide,
    NovelCard,
  },
  data() {
    return {
      artList: [],
      loading: false,
      show: false,
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
    async getRankList() {
      this.show = true
      this.loading = true
      const res = await api.getLatestNovel()
      if (res.status === 0) {
        this.artList = res.data.filter(filterHomeNovel)
      } else {
        this.$toast({
          message: res.msg,
          icon: require('@/icons/error.svg'),
        })
      }
      this.loading = false
    },
    toArtwork(id) {
      this.$router.push({
        name: 'NovelDetail',
        params: { id },
      })
    },
  },
}
</script>

<style lang="stylus" scoped>
.rank-card
  .card-box
    height 4.2rem !important
  .swipe-item
    width 520px !important
  ::v-deep
    .novel-card
      width 6.4rem !important
      height 82%
      overflow hidden
      .meta
        width 4.3rem
      .title,.novel_tags
        width 100%
        max-height 1rem
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
      .series
        width 100%
        overflow hidden
        text-overflow: ellipsis;
        white-space nowrap

.rank-card {
  margin-top 20px;
  margin-bottom: 24px;
  padding: 0 14px;

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
