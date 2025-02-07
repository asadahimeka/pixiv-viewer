/* eslint-disable vue/no-template-key */
<template>
  <div v-if="artwork.author" class="artwork-meta">
    <div class="mask">
      <canvas ref="mask" class="mask-text"></canvas>
    </div>
    <div class="author-info" :class="{ is_novel: isNovel, isAutoLoadImt }">
      <Pximg
        v-if="!isNovel"
        class="avatar"
        nobg
        :src="artwork.author.avatar"
        :alt="artwork.author.name"
        @click.native="toAuthor(artwork.author.id)"
      />
      <div class="name-box">
        <div v-if="isNovel && artwork.series && artwork.series.id" class="series">
          <router-link :to="`/novel/series/${artwork.series.id}`">{{ artwork.series.title }}</router-link>
        </div>
        <h2 class="title">{{ artwork.title }}</h2>
        <div v-if="!isNovel && artwork.series && artwork.series.id" class="series is_illust" :title="artwork.series.title">
          <router-link :to="`/user/${artwork.author.id}/series/${artwork.series.id}`">{{ artwork.series.title }}</router-link>
        </div>
        <div class="author" :class="{is_followed:artwork.author.is_followed}" @click="toAuthor(artwork.author.id)">
          {{ artwork.author.name }}
        </div>
      </div>
    </div>
    <div class="date">
      <span v-if="isNovel" class="view" style="margin-left: 0;">
        {{ $t('P8RGkre-rnlFxZ18aH2VW', [convertToK(artwork.text_length)]) }}
      </span>
      <span class="view">
        <Icon name="view" class="icon" />
        {{ convertToK(artwork.view) }}
      </span>
      <span class="like">
        <Icon name="like" class="icon" />
        {{ convertToK(artwork.like) }}
      </span>
      <span class="created" :class="{ is_novel: isNovel }">{{ formatDate(artwork.created) }}</span>
    </div>
    <div class="pid_link">
      <a
        v-if="isNovel"
        target="_blank"
        rel="noreferrer"
        :href="'https://www.pixiv.net/novel/show.php?id=' + artwork.id"
      >
        https://pixiv.net/n/{{ artwork.id }}
      </a>
      <a
        v-else
        target="_blank"
        rel="noreferrer"
        :href="'https://www.pixiv.net/artworks/' + artwork.id"
      >
        https://pixiv.net/i/{{ artwork.id }}
      </a>
    </div>
    <div class="whid">
      <span v-if="!isNovel">{{ artwork.width }}×{{ artwork.height }}</span>
      <span @click="copyId(artwork.id)">{{ isNovel?'': 'P' }}ID:{{ artwork.id }}<Icon name="copy" style="margin-left: 1px;" /></span>
      <span
        v-longpress="() => onUidLongpress(artwork.author)"
        @click="copyId(artwork.author.id)"
        @contextmenu="preventContext"
      >UID:{{ artwork.author.id }}<Icon name="copy" style="margin-left: 1px;" /></span>
    </div>
    <ul class="tag-list" :class="{ censored }">
      <li v-if="isAiIllust">
        <van-tag class="x_tag" size="large" color="#FFB11B">{{ $t('common.ai_gen') }}</van-tag>
      </li>
      <li v-else-if="maybeAiAuthor">
        <van-tag class="x_tag" size="large" color="#FFB11B">Maybe AI</van-tag>
      </li>
      <li v-if="artwork.x_restrict">
        <van-tag class="x_tag" size="large" type="danger">NSFW</van-tag>
      </li>
      <template v-for="(tag, ti) in artwork.tags">
        <li
          :key="ti + '_1'"
          v-longpress="() => onTagLongpress(tag.name)"
          class="tag name"
          @click="toSearch(tag.name)"
          @contextmenu="preventContext"
        >
          #{{ tag.name }}
        </li>
        <li v-if="showTranslatedTags && tag.translated_name" :key="ti + '_2'" class="tag translated" @click="toSearch(tag.translated_name)">
          {{ tag.translated_name }}
        </li>
      </template>
    </ul>
    <div :class="{ shrink: isShrink }" @click="isShrink = false">
      <div
        class="caption"
        :class="{ censored }"
        @click.stop.prevent="handleClick($event)"
        v-html="artwork.caption"
      ></div>
      <Icon v-if="isShrink" class="dropdown" name="dropdown" scale="4" />
    </div>
    <template v-if="!isNovel">
      <div v-show="isBtnsShow" class="meta_btns" :class="{ censored }">
        <van-button
          v-if="isLoggedIn"
          size="small"
          :loading="favLoading"
          :icon="bookmarkId ? 'like' : 'like-o'"
          plain
          color="#E87A90"
          style="margin-right: 0.15rem;"
          @click="toggleBookmark"
        >
          {{ bookmarkId ? $t('user.faved'): $t('user.fav') }}
        </van-button>
        <van-button
          type="info"
          icon="down"
          size="small"
          plain
          color="#5DAC81"
          style="margin-right: 0.15rem;"
          @click="downloadArtwork()"
        >
          {{ $t('common.download') }}
        </van-button>
        <van-button
          type="info"
          icon="comment-o"
          size="small"
          plain
          color="#005CAF"
          @click="showComments = true"
        >
          <span>{{ $t('user.view_comments') }}</span>
        </van-button>
        <van-popup
          v-model="showComments"
          class="comments-popup"
          position="right"
          get-container="body"
          closeable
        >
          <template v-if="showComments">
            <p class="comments-title">{{ $t('hGqGftQ7v772prEac1hbJ') }}</p>
            <CommentsArea :id="artwork.id" :count="0" :limit="10" />
          </template>
        </van-popup>
      </div>
    </template>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import { Dialog } from 'vant'
import { copyText, isSafari, downloadFile, formatIntlDate, formatIntlNumber } from '@/utils'
import { i18n } from '@/i18n'
import { isIllustBookmarked, addBookmark, removeBookmark } from '@/api/user'
import { localApi } from '@/api'
import { toggleBookmarkCache } from '@/utils/storage/siteCache'
import { isAiIllust } from '@/utils/filter'
import CommentsArea from './Comment/CommentsArea.vue'
import store from '@/store'
import { getArtworkFileName } from '@/store/actions/filename'

const { isAutoLoadImt } = store.state.appSetting

export default {
  name: 'ArtworkMeta',
  components: { CommentsArea },
  props: {
    artwork: {
      type: Object,
      required: true,
    },
    isNovel: {
      type: Boolean,
      default: false,
    },
    maybeAiAuthor: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      isShrink: false,
      bookmarkId: null,
      favLoading: false,
      showComments: false,
      isAutoLoadImt,
    }
  },
  computed: {
    ...mapGetters(['isCensored', 'isLoggedIn']),
    censored() {
      return this.isCensored(this.artwork)
    },
    showTranslatedTags() {
      return i18n.locale.includes('zh')
    },
    isAiIllust() {
      return isAiIllust(this.artwork)
    },
    isBtnsShow() {
      return !this.artwork?.images.some(e => e.o.includes('common/images/limit_unknown_360.png'))
    },
  },
  watch: {
    artwork: {
      immediate: true,
      handler() {
        this.isShrink = this.artwork?.caption?.length > 500
        this.isLoggedIn && this.checkBookmarked()
      },
    },
    isLoggedIn: {
      immediate: true,
      handler(val) {
        val && this.checkBookmarked()
      },
    },
    showComments(val) {
      document.documentElement.style.overflowY = val ? 'hidden' : ''
    },
  },
  mounted() {
    if (this.isAutoLoadImt || isSafari()) return
    this.$nextTick(() => {
      setTimeout(() => {
        this.drawMask()
      }, 500)
    })
  },
  methods: {
    convertToK(val) {
      if (!val) return '-'
      return formatIntlNumber(+val)
    },
    formatDate(val) {
      return formatIntlDate(new Date(val))
    },
    checkBookmarked() {
      if (!this.artwork.id) return
      if (window.APP_CONFIG.useLocalAppApi) {
        this.bookmarkId = this.artwork.is_bookmarked
        return
      }
      this.favLoading = true
      isIllustBookmarked(this.artwork.id).then(id => {
        this.favLoading = false
        this.bookmarkId = id
      })
    },
    toggleBookmark() {
      this.favLoading = true
      if (this.bookmarkId) {
        window.APP_CONFIG.useLocalAppApi
          ? localApi.illustBookmarkDelete(this.artwork.id).then(isOk => {
            this.favLoading = false
            if (isOk) {
              this.bookmarkId = null
              toggleBookmarkCache(this.artwork, false)
            } else {
              this.$toast(this.$t('artwork.unfav_fail'))
            }
          })
          : removeBookmark(this.bookmarkId).then(({ error }) => {
            this.favLoading = false
            if (error) {
              this.$toast(this.$t('artwork.unfav_fail'))
            } else {
              this.bookmarkId = null
            }
          })
      } else {
        window.APP_CONFIG.useLocalAppApi
          ? localApi.illustBookmarkAdd(this.artwork.id).then(isOk => {
            this.favLoading = false
            if (isOk) {
              this.bookmarkId = true
              toggleBookmarkCache(this.artwork, true)
            } else {
              this.$toast(this.$t('artwork.fav_fail'))
            }
          })
          : addBookmark(this.artwork.id).then(({ data, error }) => {
            this.favLoading = false
            if (error) {
              this.$toast(this.$t('artwork.fav_fail'))
            } else {
              this.bookmarkId = data?.last_bookmark_id || null
            }
          })
      }
    },
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
      keyword = encodeURIComponent(keyword)
      this.$router.push(this.isNovel ? `/search_novel/${keyword}` : `/search/${keyword}`)
    },
    preventContext(event) {
      event.preventDefault()
      return false
    },
    onTagLongpress(tag) {
      Dialog.confirm({
        title: this.$t('LEaBJrLF0DUhyTe6-fKYT'),
        message: tag,
        lockScroll: false,
        closeOnPopstate: true,
        cancelButtonText: this.$t('common.cancel'),
        confirmButtonText: this.$t('common.confirm'),
      }).then(res => {
        if (res == 'confirm') {
          this.$store.dispatch('appendBlockTags', [tag])
        }
      }).catch(() => {})

      return false
    },
    onUidLongpress(author) {
      Dialog.confirm({
        title: this.$t('w73XEmHradtum3SQ9IjBq'),
        message: `${author.name}(${author.id})`,
        lockScroll: false,
        closeOnPopstate: true,
        cancelButtonText: this.$t('common.cancel'),
        confirmButtonText: this.$t('common.confirm'),
      }).then(res => {
        if (res == 'confirm') {
          this.$store.dispatch('appendBlockUids', [author.id])
        }
      }).catch(() => {})
    },
    async downloadArtwork() {
      if (this.artwork.type == 'ugoira') {
        this.$emit('ugoira-download')
        return
      }
      const len = this.artwork.images.length
      for (let index = 0; index < len; index++) {
        const item = this.artwork.images[index]
        const fileName = `${getArtworkFileName(this.artwork, index)}.${item.o.split('.').pop()}`
        await downloadFile(item.o, fileName, {
          message: `${this.$t('tip.downloading')} (${index + 1}/${len})`,
          subDir: store.state.appSetting.dlSubDirByAuthor ? this.artwork.author.name : undefined,
        })
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

.meta_btns {
  display flex
  margin-top 16px
  ::v-deep button {
    flex 1
    padding 0 5px

    &:nth-child(1) {
      transition 0.2s
      filter: none;
      &:hover {
        color: #e74767 !important;
        border-color: #e74767 !important;
        background: #FEDFE1;
        filter: brightness(1.05);
      }
    }

    &:nth-child(2) {
      transition 0.2s
      filter: none;
      &:hover {
        background: #e2ffef;
        filter: brightness(1.05);
      }
    }

    &:nth-child(3) {
      transition 0.2s
      filter: none;
      &:hover {
        background: #d4ebff
        filter: brightness(1.05);
      }
    }
  }
}

.comments-title {
  padding 40px 0 0 40px
  font-size 0.45rem
  font-weight bold
}

.artwork-meta {
  position: relative;
  padding: 12px 20px;
  margin: 20px 0;

  .pid_link {
    position relative
    font-size: 22px;
    padding-left 30px
    a {
      color #0066FF
    }
    &:before {
      content:'🔗'
      position absolute
      left 0
      top 0
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

  .series {
    margin-bottom 8px
    font-size 20px
    &,& a {
      color: #faa200 !important
    }
    &.is_illust {
      margin-top 5px
      // margin-left 105px
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  .author-info {
    display flex
    // height: 86px;
    margin: 10px 0 20px 0;

    .avatar {
      width: 86px;
      min-width: 86px;
      height: 86px;
      border-radius: 50%;
      overflow: hidden;
      margin-right: 18px;
    }

    &:not(.is_novel) .name-box {
      max-width calc(100% - 90px)
    }

    .name-box {
      height: 100%;
      // white-space: nowrap;

      .title {
        padding-top: 4px;
        margin-bottom: 8px;
        font-size: 32px;
        // overflow: hidden;
        // text-overflow: ellipsis;
      }

      .author {
        font-size: 22px;
        color: #9b9b9b;
        cursor pointer
        // overflow: hidden;
        // text-overflow: ellipsis;

        &.is_followed {
          font-weight 500
          text-decoration underline
          color: #00AA90;
        }
      }

    }

    &.is_novel,
    &.isAutoLoadImt {
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

    &.is_novel {
      height auto
      .name-box {
        white-space normal
      }
    }

    &.isAutoLoadImt {
      .avatar {
        display none
      }
      .name-box {
        max-width unset
      }
    }

  }

  .date {
    display flex
    align-items center
    flex-wrap wrap
    gap 16px
    font-size: 24px;
    color: #7c8f99;
    margin: 16px 0;
    line-height 1.5

    .view {
      min-width 100px
      // margin-right: 16px;
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
      // margin-top 16px
    }

    .like {
      min-width 100px
      // margin-right: 16px;
      color: #0099FF

      .icon {
        width 1.1em
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
    flex-wrap wrap
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
      background transparent
      border-radius 5px
      transition 0.2s
      &:not(.translated):hover {
        background #e1d7ff
      }
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
