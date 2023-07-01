<template>
  <div v-if="author" class="author-card">
    <!-- <div class="name-bar">
      <img class="avatar" :src="author.avatar" :alt="author.name" />
      <div class="author">{{author.name}}</div>
    </div>-->

    <van-cell class="cell" :border="false" is-link @click="toAuthor(author.id)">
      <template #title>
        <img class="icon" :src="author.avatar" alt="">
        <span class="title">{{ author.name }} {{ $t('user.of_other_art') }}</span>
      </template>
    </van-cell>
    <div v-if="memberArtwork.length>=10" class="artwork-list-wrap">
      <!-- <div class="artwork-list" :style="{width:`${(memberArtwork.length-5)/2.3*100}%`}"> -->
      <swiper ref="mySwiper" class="artwork-list" :options="swiperOption">
        <swiper-slide
          v-for="art in memberArtwork.slice(0,memberArtwork.length-5)"
          :key="art.id"
          class="image-card-slide"
        >
          <ImageCard class="slide" mode="cover" :artwork="art" @click-card="toArtwork($event)" />
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
      <!-- </div> -->
    </div>
  </div>
</template>

<script>
import ImageCard from '@/components/ImageCard'
import ImageSlide from '@/components/ImageSlide'
import { mapActions, mapGetters } from 'vuex'
import api from '@/api'
export default {
  components: {
    ImageCard,
    ImageSlide,
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
        touchMoveStopPropagation: true,
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
      // this.memberArtwork = [];
      this.getMemberArtwork(this.id)
    },
    async getMemberArtwork(id) {
      const res = await api.getMemberArtwork(id)
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
      this.setGalleryList(this.memberArtwork)
      this.$router.push({
        name: 'Artwork',
        params: { id },
      })
    },
    toAuthor(id) {
      this.$router.push({
        name: 'Users',
        params: { id },
      })
    },
    ...mapActions(['setGalleryList']),
  },
}
</script>

<style lang="stylus" scoped>
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
        &.image-card-slide {
          width: 240px;
        }

        &.image-slide-slide {
          width: 320px;
        }

        .image-card {
          height: 240px !important;
          border: 1px solid #ebebeb;
          border-radius: 18px;
          box-sizing: border-box;
          margin-right: 6px;
          padding-bottom: 0 !important;
        }

        .image-slide {
          height: 240px !important;
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
