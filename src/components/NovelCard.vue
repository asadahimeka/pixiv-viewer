<template>
  <div class="novel-card" @click.stop="click(artwork.id)">
    <div class="img-cont">
      <img v-lazy="imgSrc" :alt="artwork.title" class="image" :class="{ censored: isCensored(artwork) }">
    </div>
    <div class="meta" :class="{ censored: isCensored(artwork) }">
      <div v-if="artwork.series && artwork.series.id" class="series">{{ artwork.series.title }}</div>
      <div class="content">
        <h2 class="title">{{ artwork.title }}</h2>
        <div class="author"><span style="color:#999">by</span>&nbsp;{{ artwork.author.name }}</div>
      </div>
      <div class="novel_tags ispx">
        <span v-for="t in novelTagsText" :key="t">{{ t }}</span>
      </div>
      <div class="novel_tips">
        <van-tag v-if="index">#{{ index }}</van-tag>
        <van-tag v-if="tagText" :color="tagText === 'R-18' ? '#fb7299' : '#ff3f3f'">{{ tagText }}</van-tag>
        <van-tag v-if="isAiIllust" color="#536cb8">&nbsp;AI&nbsp;</van-tag>
        <van-tag color="#cdeefe" text-color="#0b6aaf">{{ artwork.text_length }}{{ $t('common.words') }}</van-tag>
        <van-tag color="#ffe1e1" text-color="#ad0000">
          <van-icon name="like-o" style="margin-right: 2px;" />
          {{ artwork.like }}
        </van-tag>
      </div>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
export default {
  name: 'NovelCard',
  props: {
    artwork: {
      type: Object,
      required: true,
    },
    index: {
      type: Number,
    },
    square: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {}
  },
  computed: {
    ...mapGetters(['isCensored']),
    imgSrc() {
      return this.artwork.images[0][this.square ? 's' : 'm']
    },
    isAiIllust() {
      return this.artwork.illust_ai_type == 2
    },
    tagText() {
      if (this.artwork.x_restrict == 1) {
        return 'R-18'
      } else if (this.artwork.x_restrict == 2) {
        return 'R-18G'
      } else {
        return false
      }
    },
    novelTagsText() {
      return this.artwork.tags?.map(e => `#${e.name}`)
    },
  },
  methods: {
    click(id) {
      if (
        !id ||
        (this.$route.name === 'Artwork' && this.$route.params.id == id)
      ) { return false }

      this.$emit('click-card', id)
    },
  },
}
</script>

<style lang="stylus" scoped>
.novel-card {
  position: relative;
  display: flex;
  align-items flex-start
  overflow: hidden;
  background: #f5f5f5;
  padding 20px
  margin-bottom: 15px;
  border-radius: 20px;
  border-bottom 1px solid #ccc
  cursor pointer

  .img-cont {
    position relative
    width: 2rem;
    min-width 2rem;
    min-height 3rem
  }

  .image {
    width: 100%;
    height: auto;

    &[lazy="loading"] {
      position absolute
      width: 100px;
      height: 100px;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }
  }

  .novel_tags {
    margin-top 0px
    padding 0 20px
    color #858585
    &.ispx {
      font-size 13px
    }
    span {
      margin-right 16px
    }
  }

  .novel_tips {
    margin-top 20px
    padding 0 20px
  }

  .series {
    margin-bottom 8px
    padding 0 16px
    font-size 20px
    color: #faa200;
  }

  .meta {
    .content {
      width: 100%;
      padding: 0 14px 18px;
      box-sizing: border-box;

      .author {
        display: flex;
        align-items: center;
        font-size: 23px;
        font-weight: 400;
      }

      .title {
        line-height: normal;
        font-size: 28px;
        margin-bottom: 10px;
        font-weight 600
      }
    }
  }
}
</style>
