<template>
  <div v-if="author" class="author-card">
    <van-cell class="cell" :border="false" is-link @click="toAuthor(author.id)">
      <template #title>
        <img class="icon" :src="author.avatar" alt="">
        <span class="title">{{ author.name }} {{ $t('user.of_other_art') }}</span>
      </template>
    </van-cell>
    <div v-if="memberArtwork.length >= 10" class="artwork-list-wrap">
      <swiper ref="mySwiper" class="artwork-list" :options="swiperOption">
        <swiper-slide
          v-for="art in memberArtwork.slice(0, memberArtwork.length - 5)"
          :key="art.id"
          class="image-card-slide"
        >
          <NovelCard :artwork="art" @click-card="toArtwork($event)" />
        </swiper-slide>
        <swiper-slide class="image-slide-slide">
          <ImageSlide class="slide" :images="slides">
            <div class="link" @click="toAuthor(author.id)">
              <Icon name="more" scale="20" />
              <div>{{ $t('common.view_more') }}</div>
            </div>
          </ImageSlide>
        </swiper-slide>
        <div slot="scrollbar" class="swiper-scrollbar"></div>
      </swiper>
    </div>
  </div>
</template>

<script>
import ImageSlide from '@/components/ImageSlide'
import { mapGetters } from 'vuex'
import api from '@/api'
import NovelCard from '@/components/NovelCard.vue'
export default {
  name: 'AuthorNovelCard',
  components: {
    ImageSlide,
    NovelCard,
  },
  props: {
    id: {
      type: Number,
      required: true,
    },
  },
  data() {
    return {
      memberArtwork: null,
      swiperOption: {
        freeMode: true,
        slidesPerView: 'auto',
        mousewheel: true,
        scrollbar: {
          el: '.swiper-scrollbar',
          draggable: true,
        },
      },
    }
  },
  computed: {
    author() {
      return this.memberArtwork && this.memberArtwork.length > 0
        ? this.memberArtwork[0].author
        : null
    },
    slides() {
      const memberArtwork = this.memberArtwork.slice(
        this.memberArtwork.length - 5,
        this.memberArtwork.length
      )
      return memberArtwork.map(artwork => {
        return {
          title: artwork.title,
          src: artwork.images[0].m,
          isCensored: this.isCensored(artwork),
        }
      })
    },
    ...mapGetters(['isCensored']),
  },
  mounted() {
    this.init()
  },
  methods: {
    init() {
      this.memberArtwork = []
      this.getMemberArtwork(this.id)
    },
    async getMemberArtwork(id) {
      const res = await api.getMemberNovel(id)
      if (res.status === 0) {
        this.memberArtwork = res.data
        this.$emit('loaded')
        const i = res.data.findIndex(e => e.id == this.$route.params.id)
        i && this.$nextTick(() => {
          this.$refs.mySwiper?.$swiper?.slideTo(i)
        })
      } else {
        this.$toast({
          message: res.msg,
          icon: require('@/icons/error.svg'),
        })
      }
    },
    toArtwork(id) {
      this.$router.push({
        name: 'NovelDetail',
        params: { id },
      })
    },
    toAuthor(id) {
      this.$router.push({
        name: 'Users',
        params: { id },
      })
    },
  },
}
</script>

<style lang="stylus" scoped>
.author-card
  .artwork-list
    height 4.2rem !important
  .image-slide-slide
    width 360px
  .image-card-slide
    width 400px !important
    margin-right 10px
    ::v-deep
      .novel-card
        width 88% !important
        height 82%
        overflow hidden
        .img-cont
          display none
        .meta
          width 100%
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

.author-card {
  padding: 0 14px;
  margin: 24px 0;

  .name-bar {
    height: 96px;
    margin: 20px 0;

    .avatar {
      float: left;
      width: 96px;
      height: 96px;
      border-radius: 50%;
      overflow: hidden;
      margin-right: 18px;
    }

    .author {
      font-size: 34px;
      line-height: 96px;
      color: #777;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  .cell {
    .icon {
      border-radius: 50%;
      vertical-align: middle;
    }

    .title {
      font-size: 28px;
    }
  }

  .artwork-list-wrap {
    // overflow-x: scroll;
    border-radius: 20px;

    .artwork-list {
      display: flex;

      .swiper-slide {

        .image-slide {
          height: 4rem !important;
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
</style>
