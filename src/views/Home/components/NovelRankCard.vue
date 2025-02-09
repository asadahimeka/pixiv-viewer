<template>
  <div class="rank-card">
    <van-cell class="cell" :border="false" is-link to="/rank_novel/day">
      <template #title>
        <Icon class="icon crown" name="crown" />
        <span class="title">{{ $t('common.rank') }}</span>
      </template>
    </van-cell>
    <div class="card-box">
      <swiper class="swipe-wrap" :options="swiperOption">
        <swiper-slide v-for="art in artList.slice(0, 10)" :key="art.id" class="swipe-item">
          <div class="novel_item">
            <van-tag class="novel_length" color="#cdeefe" text-color="#0b6aaf">
              {{ $t('P8RGkre-rnlFxZ18aH2VW', [convertToK(art.text_length)]) }}
            </van-tag>
            <van-tag class="novel_favs" color="#ffe1e1" text-color="#ad0000">
              <van-icon name="like-o" style="margin-right: 2px;" />
              {{ art.like }}
            </van-tag>
            <ImageCard mode="meta" :artwork="art" @click-card="toArtwork($event)" />
            <div class="novel_tags ispx">{{ novelTagsText(art) }}</div>
          </div>
        </swiper-slide>
        <swiper-slide class="swipe-item more">
          <ImageSlide :images="slides">
            <div class="link" @click="$router.push('/rank_novel/day')">
              <van-loading v-if="loading" class="d-loading" :size="'50px'" />
              <template v-else>
                <Icon name="more" scale="20" />
                <div>{{ $t('common.view_more') }}</div>
              </template>
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
import ImageCard from '@/components/ImageCard'
import ImageSlide from '@/components/ImageSlide'
import api from '@/api'
import { filterHomeNovel } from '@/utils/filter'
import { formatIntlNumber } from '@/utils'
import { isCNLocale } from '@/i18n'

export default {
  name: 'RankCardNovel',
  components: {
    ImageCard,
    ImageSlide,
  },
  data() {
    return {
      artList: [],
      loading: true,
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
  computed: {
    slides() {
      const artList = this.artList.slice(10, 15)
      return artList.map(art => {
        return {
          title: art.title,
          src: art.images[0].m,
        }
      })
    },
  },
  created() {
    this.getRankList()
  },
  methods: {
    convertToK(val) {
      if (!val) return '-'
      if (isCNLocale()) return val
      return formatIntlNumber(+val)
    },
    novelTagsText(el) {
      return el.tags?.map(e => `#${e.name}`).join(' ')
    },
    async getRankList() {
      this.loading = true
      const res = await api.getNovelRankList()
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
  .swipe-item
    width 420px !important
  ::v-deep
    .image-card .meta::before
      height 100%
      background: rgba(0,0,0,0.5)
    .image-card .meta .content .title
      position absolute
      top -3.1rem
      left 0
      padding 0 20px
      max-height 1.6rem
      font-size: 0.38rem;
      -webkit-line-clamp: 3
      text-shadow: 4px 4px 4px black;
    .author-cont .author
      max-width 3rem
      max-height: 0.64rem;
      overflow: hidden;
      text-overflow: ellipsis;

.novel_item
  width 100%
  height 100%

.novel_length
  position absolute
  top 10px
  right 15px
  z-index 10

.novel_favs
  position absolute
  bottom 40px
  right 15px
  z-index 10

.novel_tags
  position absolute
  bottom 100px
  left 0
  width 100%
  max-height 1.3rem
  overflow hidden
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  padding 0 28px
  color #fff
  line-height 1.2
  box-sizing border-box
  &.ispx
    font-size 13px

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
      // border-radius: 20px;
      overflow: hidden;

      .swipe-item {
        width 450px;
        margin-right: 12px;

        &:last-child {
          .image-card {
            margin-right: 0;
          }
        }

        .image-card {
          // width: 50vw;
          font-size: 0;
          border: 1PX solid #ebebeb;
          box-sizing: border-box;
          width: 100%;
          height: 97%;
          padding-bottom: 0 !important;
        }

        .image-slide {
          border: 1PX solid #ebebeb;
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
