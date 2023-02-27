/* eslint-disable vue/no-template-key */
<template>
  <div v-if="artwork.author" class="artwork-meta">
    <div class="mask">
      <canvas ref="mask" class="mask-text"></canvas>
    </div>
    <div class="author-info" :class="{ is_novel: isNovel }">
      <img
        v-if="!isNovel"
        class="avatar"
        :src="artwork.author.avatar"
        :alt="artwork.author.name"
        @click="toAuthor(artwork.author.id)"
      >
      <div class="name-box">
        <div v-if="isNovel && artwork.series.id" class="series">{{ artwork.series.title }}</div>
        <h2 class="title">{{ artwork.title }}</h2>
        <div class="author" @click="toAuthor(artwork.author.id)">{{ artwork.author.name }}</div>
      </div>
    </div>
    <div class="date">
      <span v-if="isNovel" class="view" style="margin-left: 0;">
        {{ artwork.text_length | convertToK }}{{ $t('common.words') }}
      </span>
      <span class="view">
        <Icon name="view" class="icon" />
        {{ artwork.view | convertToK }}
      </span>
      <span class="like">
        <Icon name="like" class="icon" />
        {{ artwork.like | convertToK }}
      </span>
      <span class="created" :class="{ is_novel: isNovel }">{{ artwork.created | formatDate(isNovel) }}</span>
    </div>
    <div class="pid_link">
      <a
        v-if="isNovel"
        target="_blank"
        rel="noreferrer"
        class="umami--click--click_pixiv_link"
        :href="'https://www.pixiv.net/novel/show.php?id=' + artwork.id"
      >
        https://www.pixiv.net/n/{{ artwork.id }}
      </a>
      <a
        v-else
        target="_blank"
        rel="noreferrer"
        class="umami--click--click_pixiv_link"
        :href="'https://www.pixiv.net/artworks/' + artwork.id"
      >
        https://www.pixiv.net/i/{{ artwork.id }}
      </a>
    </div>
    <div class="whid">
      <span v-if="!isNovel">{{ artwork.width }}×{{ artwork.height }}</span>
      <span @click="copyId(artwork.id)">{{ isNovel?'': 'P' }}ID:{{ artwork.id }}</span>
      <span @click="copyId(artwork.author.id)">UID:{{ artwork.author.id }}</span>
    </div>
    <ul class="tag-list" :class="{ censored: isCensored(artwork) }">
      <li v-if="artwork.illust_ai_type == 2">
        <van-tag class="x_tag" size="large" color="#FFB11B">{{ $t('common.ai_gen') }}</van-tag>
      </li>
      <li v-if="artwork.x_restrict">
        <van-tag class="x_tag" size="large" type="danger">NSFW</van-tag>
      </li>
      <template v-for="(tag, ti) in artwork.tags">
        <li :key="ti + '_1'" class="tag name" @click="toSearch(tag.name)">#{{ tag.name }}</li>
        <li v-if="showTranslatedTags && tag.translated_name" :key="ti + '_2'" class="tag translated" @click="toSearch(tag.translated_name)">
          {{ tag.translated_name }}
        </li>
      </template>
    </ul>
    <div :class="{ shrink: isShrink }" @click="isShrink = false">
      <div
        class="caption"
        :class="{ censored: isCensored(artwork) }"
        @click.stop.prevent="handleClick($event)"
        v-html="artwork.caption"
      ></div>
      <Icon v-if="isShrink" class="dropdown" name="dropdown" scale="4" />
    </div>
    <van-button
      v-if="!isNovel"
      type="info"
      size="small"
      plain
      block
      style="margin-top:16px"
      @click="downloadArtwork()"
    >
      <span class="umami--click--download_img">{{ $t('common.download') }}</span>
    </van-button>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import FileSaver from 'file-saver'
import dayjs from 'dayjs'
import { copyText, sleep } from '@/utils'
import { i18n } from '@/i18n'
export default {
  filters: {
    convertToK(val) {
      if (!val) return '-'
      val = +val
      if (val > 10000) {
        return (val / 1000).toFixed(1) + 'K'
      } else {
        return val
      }
    },
    formatDate(val, isNovel) {
      if (isNovel) {
        return dayjs(val)
          .format('YYYY年MM月DD日Ahh点mm分')
          .replace('AM', '上午')
          .replace('PM', '下午')
      }
      return dayjs(val).format('YYYY-MM-DD HH:mm')
    },
  },
  props: {
    artwork: {
      type: Object,
      required: true,
    },
    isNovel: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      isShrink: false,
    }
  },
  computed: {
    ...mapGetters(['isCensored']),
    showTranslatedTags() {
      return i18n.locale.includes('zh')
    },
  },
  watch: {
    artwork: {
      immediate: true,
      handler() {
        this.isShrink = this.artwork?.caption?.length > 500
      },
    },
  },
  mounted() {
    this.$nextTick(() => {
      setTimeout(() => {
        this.drawMask()
      }, 500)
    })
  },
  methods: {
    drawMask() {
      if (this.isNovel) return
      const canvas = this.$refs.mask
      if (!canvas) return

      const { width, height } = canvas.getBoundingClientRect()
      canvas.width = width * 2
      canvas.height = height * 2
      canvas.style.width = width
      canvas.style.height = height

      const ctx = canvas.getContext('2d')
      const txt = `${this.artwork.id}  `

      ctx.rotate((-20 * Math.PI) / 180)
      ctx.font = 'bold 72px Dosis'
      const txtHeight = 85
      const w = Math.ceil(ctx.measureText(txt).width)
      // txt = new Array(w * 2).join(txt + " ");
      const h = Math.sqrt(width ** 2 + height ** 2) * 2
      console.log(w, Math.ceil(h / txtHeight))
      for (let i = 0; i < h / txtHeight; i++) {
        for (let j = 0; j < w; j++) {
          if (i === Math.floor(h / txtHeight / 2) && j === 2) {
            ctx.fillStyle = 'rgba(0,0,0,.13)'
          } else {
            ctx.fillStyle = 'rgba(0,0,0,.05)'
          }
          ctx.fillText(txt, (j - 1) * w, i * txtHeight)
        }
      }
    },
    handleClick(e) {
      if (e.target.tagName === 'A') {
        let url = e.target.href
        if (url.startsWith('pixiv://users')) {
          url = url.replace('pixiv:/', '')
        }
        if (url.startsWith('pixiv://illusts')) {
          url = url.replace('pixiv://illusts', '/artworks')
        }
        if (url.startsWith('pixiv://novels')) {
          url = url.replace('pixiv://novels', '/novel')
        }
        window.open(url, '_blank', 'noreferrer')
      }
    },
    toAuthor(id) {
      this.$router.push({
        name: 'Users',
        params: { id },
      })
    },
    toSearch(keyword) {
      this.$router.push(this.isNovel ? `/search_novel/${keyword}` : `/search/${keyword}`)
    },
    async downloadArtwork() {
      if (this.artwork.type == 'ugoira') {
        this.$emit('ugoira-download')
        return
      }
      this.$toast(this.$t('tips.download_wait'))
      for (let index = 0; index < this.artwork.images.length; index++) {
        const item = this.artwork.images[index]
        FileSaver.saveAs(
          item.o,
          `${this.artwork.author.name}_${this.artwork.title}_${this.artwork.id}_p${index}.${item.o.split('.').pop()}`
        )
        await sleep(1000)
      }
    },
    async copyId(text) {
      copyText(
        text,
        () => this.$toast(this.$t('tips.copylink.succ')),
        () => {}
      )
    },
  },
}
</script>

<style lang="stylus" scoped>
.shrink {
  position relative
  max-height: 600px;
  overflow: hidden;
  &::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    background: linear-gradient(to top, rgb(255, 255, 255), rgba(#fff, 0));
  }
  .dropdown {
    position: absolute;
    bottom: 26px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1;
    color: #fafafa;
    filter: drop-shadow(1px 4px 8px rgba(0, 0, 0, 0.2));
    animation: ani-dropdown 2s ease-in-out infinite;
  }
  @keyframes ani-dropdown {
    0%, 100% {
      transform: translate(-50%, 0);
    }
    50% {
      transform: translate(-50%, 6px);
    }
  }
}

.artwork-meta {
  position: relative;
  padding: 12px 20px;
  margin: 20px 0;

  .pid_link {
    font-size: 22px;
    a {
      color #0066FF
    }
  }

  .mask {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: -1;
    overflow: hidden;
    font-family Dosis

    .mask-text {
      width: 100%;
      height: 100%;
    }
  }

  .author-info {
    height: 86px;
    margin: 10px 0 20px 0;

    .avatar {
      float: left;
      width: 86px;
      height: 86px;
      border-radius: 50%;
      overflow: hidden;
      margin-right: 18px;
    }

    .name-box {
      height: 100%;
      white-space: nowrap;

      .title {
        padding-top: 4px;
        margin-bottom: 8px;
        font-size: 32px;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .author {
        font-size: 22px;
        color: #9b9b9b;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .series {
        margin-bottom 8px
        font-size 20px
        color: #faa200;
      }
    }

    &.is_novel {
      height auto
      .name-box {
        white-space normal
      }
      .author {
        margin-top 20px
        font-size 24px
        line-height 1.2
        color #666
        &::before {
          content: 'by '
          color #999
        }
      }
    }
  }

  .date {
    font-size: 24px;
    color: #7c8f99;
    margin: 16px 0;

    .view {
      margin-right: 24px;
      color: #3366FF

      .icon {
        font-size: 1em;
        margin-right: 0px;
        vertical-align: -0.14em;
        color #8A6BBE
      }
    }

    .created.is_novel {
      display block
      margin-top 16px
    }

    .like {
      margin-right: 24px;
      color: #0099FF

      .icon {
        font-size: 0.8em;
        margin-right: 0px;
        vertical-align: baseline;
      }
    }

    .id {
      margin-left: 12px;
    }
  }

  .whid {
    display flex
    align-items center
    margin 16px 0 -4px
    font-size 20px
    color #7c8f99
    span {
      display inline-block
      margin-right 10px
      padding 6px 4px
    }
  }

  .tag-list {
    display flex
    align-items center
    flex-wrap wrap
    color: #6633FF
    margin: 16px 0;
    overflow: hidden;

    .x_tag {
      margin-right 10px
      font-weight bold
      cursor auto !important
    }

    .tag {
      line-height: 42px;
      font-size: 26px;
      margin-right: 10px;
      cursor pointer
      &.translated {
        font-size: 22px;
        color: #adadad;
        margin-right: 20px;
      }
    }
  }

  .caption {
    font-size: 24px;
    line-height: 32px;
    word-break: break-all;

    ::v-deep a {
      color: #36a8f5;
    }
  }
}
</style>
