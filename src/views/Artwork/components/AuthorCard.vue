<template>
  <div class="author-card" v-if="author">
    <!-- <div class="name-bar">
      <img class="avatar" :src="author.avatar" :alt="author.name" />
      <div class="author">{{author.name}}</div>
    </div>-->

    <van-cell class="cell" :border="false" is-link @click="toAuthor(author.id)">
      <template #title>
        <img class="icon" :src="author.avatar" :alt="author.name" />
        <span class="title">{{author.name}} 的其他作品</span>
      </template>
    </van-cell>
    <div class="artwork-list-wrap" v-if="memberArtwork.length>=10">
      <!-- <div class="artwork-list" :style="{width:`${(memberArtwork.length-5)/2.3*100}%`}"> -->
      <swiper class="artwork-list"  :options="swiperOption">
        <swiper-slide
          class="image-card-slide"
          v-for="art in memberArtwork.slice(0,memberArtwork.length-5)"
          :key="art.id"
        >
          <ImageCard class="slide" mode="cover" :artwork="art" @click-card="toArtwork($event)" />
        </swiper-slide>
        <swiper-slide class="image-slide-slide">
          <ImageSlide class="slide" :images="slides">
            <div class="link" @click="toAuthor(author.id)">
              <Icon name="more" scale="20"></Icon>
              <div>查看更多</div>
            </div>
          </ImageSlide>
        </swiper-slide>
        <div class="swiper-scrollbar" slot="scrollbar"></div>
      </swiper>
      <!-- </div> -->
    </div>
  </div>
</template>

<script>
import { Cell } from "vant";
import ImageCard from "@/components/ImageCard";
import ImageSlide from "@/components/ImageSlide";
import { mapActions, mapGetters } from "vuex";
import api from "@/api";
export default {
  computed: {
    author() {
      return this.memberArtwork && this.memberArtwork.length > 0
        ? this.memberArtwork[0].author
        : null;
    },
    slides() {
      let memberArtwork = this.memberArtwork.slice(
        this.memberArtwork.length - 5,
        this.memberArtwork.length
      );
      return memberArtwork.map(artwork => {
        return {
          title: artwork.title,
          src: artwork.images[0].m,
          isCensored: this.isCensored(artwork)
        };
      });
    },
    ...mapGetters(["isCensored"])
  },
  props: {
    id: {
      type: Number,
      required: true
    }
  },
  data() {
    return {
      memberArtwork: null,
      swiperOption: {
        freeMode: true,
        slidesPerView: "auto",
        mousewheel: true,
        scrollbar: {
          el: '.swiper-scrollbar',
          draggable: true
        }
      }
    };
  },
  methods: {
    init() {
      // this.memberArtwork = [];
      this.getMemberArtwork(this.id);
    },
    async getMemberArtwork(id) {
      let res = await api.getMemberArtwork(id);
      if (res.status === 0) {
        this.memberArtwork = res.data;
        this.$emit("loaded");
      } else {
        this.$toast({
          message: res.msg,
          icon: require("@/icons/error.svg")
        });
      }
    },
    toArtwork(id) {
      this.$router.push({
        name: "Artwork",
        params: { id, list: this.memberArtwork }
      });
    },
    toAuthor(id) {
      this.$router.push({
        name: "Users",
        params: { id }
      });
    },
    ...mapActions(["setGalleryList"])
  },
  mounted() {
    this.init();
  },
  components: {
    [Cell.name]: Cell,
    ImageCard,
    ImageSlide
  }
};
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
