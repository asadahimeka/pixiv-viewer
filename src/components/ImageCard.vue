<template>
  <div
    class="image-card"
    :class="{ isOuterMeta, [`art-cover-${artwork.id}`]: true }"
    :style="{ '--w': artwork.width, '--h': artwork.height }"
  >
    <div
      class="image-card-wrapper"
      :style="{ paddingBottom: paddingBottom(artwork) }"
      @click.stop="click(artwork.id)"
      @contextmenu="preventContext"
    >
      <Pximg
        class="image"
        :src="imgSrc"
        :class="{ censored }"
        :alt="artwork.title"
      />
      <div class="tag-r18-ai">
        <van-tag v-if="index">#{{ index }}</van-tag>
        <van-tag v-if="tagText" :color="tagText === 'R-18' ? '#fb7299' : '#ff3f3f'">{{ tagText }}</van-tag>
        <van-tag v-if="isAiIllust" color="#536cb8">&nbsp;AI&nbsp;</van-tag>
      </div>
      <div v-if="(mode == 'all' || mode === 'cover') && artwork.count > 1" class="layer-num">
        <Icon name="layer" scale="1.5" />
        {{ artwork.count }}
      </div>
      <div v-if="(mode == 'all' || mode == 'cover') && showBookmarkBtn" class="bookmark" @click.stop="toggleBookmark">
        <van-loading v-if="bLoading" color="#ff4060" />
        <van-icon v-else :name="isBookmarked?'like':'like-o'" color="#ff4060" />
      </div>
      <Icon
        v-if="(mode == 'all' || mode === 'cover') && artwork.type === 'ugoira'"
        class="btn-play"
        name="play"
        scale="8"
      />
      <div v-if="mode == 'all' || mode === 'meta'" v-longpress="isTriggerLongpress?onLongpress:()=>{}" class="meta">
        <div v-if="!isOuterMeta" class="content">
          <h2 class="title" :title="artwork.title + ' ' + artwork.created" @click.stop="onImageTitleClick">{{ artwork.title }}</h2>
          <div class="author-cont" @click.stop="toAuthor">
            <Pximg :src="artwork.author.avatar" :alt="artwork.author.name" nobg class="avatar" />
            <div class="author">{{ artwork.author.name }}</div>
          </div>
        </div>
      </div>
    </div>
    <div v-if="isOuterMeta && (mode == 'all' || mode === 'meta')" class="outer-meta">
      <div class="content">
        <h2 class="title" :title="artwork.title + ' ' + artwork.created" @click="onImageTitleClick">
          {{ artwork.title }}
        </h2>
        <div class="author-cont" @click="toAuthor">
          <Pximg :src="artwork.author.avatar" :alt="artwork.author.name" nobg class="avatar" />
          <div class="author">{{ artwork.author.name }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { Dialog, ImagePreview } from 'vant'
import { mapGetters } from 'vuex'
import { localApi } from '@/api'
import { getCache, toggleBookmarkCache } from '@/utils/storage/siteCache'
import { isAiIllust } from '@/utils/filter'
import { fancyboxShow, downloadFile } from '@/utils'
import store from '@/store'
import { getArtworkFileName } from '@/store/actions/filename'

const { isImageCardOuterMeta, isLongpressDL, isLongpressBlock, imgReso } = store.state.appSetting
const isLargeWebp = imgReso == 'Large(WebP)'
const getLargeWebpSrc = (src, fbk) => {
  return src?.replace(/\/c\/\d+x\d+(_\d+)?\//g, '/c/1200x1200_90_webp/') || fbk
}

export default {
  props: {
    artwork: {
      type: Object,
      required: true,
    },
    mode: {
      type: String,
      required: false,
      default: 'cover',
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
    return {
      showBookmarkBtn: window.APP_CONFIG.useLocalAppApi,
      bLoading: false,
      isBookmarked: false,
      isOuterMeta: isImageCardOuterMeta,
      isTriggerLongpress: isLongpressDL || isLongpressBlock,
    }
  },
  computed: {
    imgSrc() {
      const i0 = this.artwork.images[0]
      if (this.square) return i0.s
      return isLargeWebp ? getLargeWebpSrc(i0.l, i0.m) : i0.m
    },
    isAiIllust() {
      return isAiIllust(this.artwork)
    },
    tagText() {
      return ['', 'R-18', 'R-18G'][this.artwork.x_restrict] || ''
    },
    ...mapGetters(['isCensored']),
    censored() {
      return this.isCensored(this.artwork)
    },
  },
  async mounted() {
    if ((this.mode == 'all' || this.mode == 'cover') && this.showBookmarkBtn) {
      const favMap = await getCache('local.fav.map', {})
      this.isBookmarked = Boolean(favMap[this.artwork.id] || this.artwork.is_bookmarked)
    }
  },
  methods: {
    async toggleBookmark() {
      if (this.bLoading) return
      this.bLoading = true
      try {
        if (this.isBookmarked) {
          const isOk = await localApi.illustBookmarkDelete(this.artwork.id)
          if (isOk) {
            this.isBookmarked = false
            toggleBookmarkCache(this.artwork, false)
          } else {
            this.$toast(this.$t('artwork.unfav_fail'))
          }
        } else {
          const isOk = await localApi.illustBookmarkAdd(this.artwork.id)
          if (isOk) {
            this.isBookmarked = true
            toggleBookmarkCache(this.artwork, true)
          } else {
            this.$toast(this.$t('artwork.fav_fail'))
          }
        }
      } finally {
        this.bLoading = false
      }
    },
    click(id) {
      if (!id || (this.$route.name == 'Artwork' && this.$route.params.id == id)) {
        return false
      }
      this.$emit('click-card', id)
    },
    paddingBottom(artwork) {
      const pb = artwork.height / artwork.width * 100
      if (pb < 50) return '50%'
      if (pb > 160) return '160%'
      return pb.toFixed(2) + '%'
    },
    preventContext(/** @type {Event} */ event) {
      if (!this.isTriggerLongpress) return true
      event.preventDefault()
      return false
    },
    onLongpress(/** @type {Event} */ ev) {
      if (!this.isTriggerLongpress) return
      ev.preventDefault()
      isLongpressDL ? this.downloadArtwork() : this.showBlockDialog()
    },
    onImageTitleClick() {
      if (this.artwork.novel_ai_type) {
        this.click(this.artwork.id)
        return
      }
      const getSrc = isLargeWebp
        ? e => getLargeWebpSrc(e.l)
        : e => e.l.replace(/\/c\/\d+x\d+(_\d+)?\//g, '/')
      if (store.state.appSetting.isUseFancybox) {
        fancyboxShow(this.artwork, 0, getSrc)
      } else {
        ImagePreview({
          images: this.artwork.images.map(getSrc),
          startPosition: 0,
          closeOnPopstate: true,
          closeable: true,
          loop: false,
        })
      }
    },
    toAuthor() {
      if (this.$route.name == 'Users') return
      this.$router.push(`/users/${this.artwork.author.id}`)
    },
    showBlockDialog() {
      Dialog.confirm({
        title: this.$t('1a1meIFthYyv_s7C4M4L0'),
        message: `
        <div id="sel_block_dialog">
          <p style="margin:0.2rem 0">Author</p>
          <div class="sel_block_chks"><input type="checkbox" data-author="${this.artwork.author.id}">${this.artwork.author.name}(${this.artwork.author.id})</div>
          <div style="height:1px;margin:0.2rem 0;border-bottom:1px solid #ccc"></div>
          <p style="margin:0.2rem 0">Tags</p>
          ${this.artwork.tags.map(e => `<div class="sel_block_chks"><input type="checkbox" data-tagname="${e.name}">${e.name}</div>`).join('')}
        </div>`,
        lockScroll: false,
        closeOnPopstate: true,
        cancelButtonText: this.$t('common.cancel'),
        confirmButtonText: this.$t('common.confirm'),
        beforeClose: (action, done) => {
          if (action == 'confirm') {
            const authors = document.querySelectorAll('#sel_block_dialog input[data-author]:checked')
            const tags = document.querySelectorAll('#sel_block_dialog input[data-tagname]:checked')
            if (authors.length) {
              this.$store.dispatch('appendBlockUids', [...authors].map(e => e.getAttribute('data-author')))
            }
            if (tags.length) {
              this.$store.dispatch('appendBlockTags', [...tags].map(e => e.getAttribute('data-tagname')))
            }
          }
          done()
        },
      }).catch(() => {})
    },
    async downloadArtwork() {
      if (this.artwork.type == 'ugoira') return
      const res = await Dialog.confirm({
        title: this.$t('wuh4SsMnuqgjHpaOVp2rB'),
        message: this.artwork.title,
        lockScroll: false,
        closeOnPopstate: true,
        cancelButtonText: this.$t('common.cancel'),
        confirmButtonText: this.$t('common.confirm'),
      }).catch(() => 'cancel')
      if (res != 'confirm') return
      window.umami?.track('download_artwork_longpress')
      await this.$nextTick()
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
  },
}
</script>

<style lang="stylus" scoped>
.image-card
  position: relative;
  overflow: hidden;
  background: #fafafa;
  margin-bottom: 10px;
  // border-radius: 20px;

  // @media screen and (min-width: 1280px)
  //   &:hover
  //     .image[lazy="loaded"]
  //       transform: scale(1.1);

  .image
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.5s;
    transform: none;

    &[lazy="loading"]
      width: 100px;
      height: 100px;
      top: 50%;
      left: 50%;
      margin-left: -50px;
      margin-top: -50px;
      transform: scale(0.9);

  .tag-r18-ai
    position: absolute;
    top: 12px;
    left: 12px;

  .layer-num
    position: absolute;
    top: 10px;
    right: 10px;
    display: flex;
    justify-content: center;
    align-items: center;
    background: rgba(#000, 0.3);
    color: #fff;
    padding: 4px 8px;
    font-size: 18px;
    border-radius: 5px;

    svg
      vertical-align: bottom;
      margin-right: 4px;

  .bookmark
    position absolute
    bottom 0
    right 0
    z-index 1
    padding: 20px 16px
    font-size 0.5rem
    cursor pointer
    filter: drop-shadow(0.02667rem 0.05333rem 0.05333rem #e87a90)

  .btn-play
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: #565656;
    opacity: 0.6;

  .meta
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;

    &::before
      position: absolute;
      content: '';
      bottom: 0;
      width: 100%;
      height: 50%;
      background-image: linear-gradient(0deg, rgba(0, 0, 0, 0.5) 0%, rgba(255, 255, 255, 0) 100%);

.isOuterMeta
  box-shadow none
  background none
  .image-card-wrapper
    // border-radius: 0.26667rem;

  .meta
    background: rgba(0,0,0,.04);
    &::before
      display none

.image-card-wrapper
  position relative
  overflow hidden

.image-card-wrapper .meta, .outer-meta
  .content
    position: absolute;
    bottom: 0;
    width: 100%;
    padding: 18px 14px;
    box-sizing: border-box;
    color: #fff;
    .author-cont
      display: flex;
      align-items: center;

    .title
      line-height: normal;
      font-size: 24px;
      margin: 10px 0;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 1;
      -webkit-box-orient: vertical;

    .avatar
      width: 48px;
      min-width: 48px;
      height: 48px;
      margin-right: 8px;
      vertical-align: bottom;
      border-radius: 50%;
      overflow: hidden;

    .author
      display: inline-block;
      font-size: 20px;
      // font-weight: 200;

.outer-meta
  .content
    position relative
    padding 8px 20px 16px
    .title
      margin 6px 0
      font-weight 600
      cursor pointer

    .avatar
      width: 36px;
      min-width: 36px;
      height: 36px;

</style>

<style lang="stylus">
body:not(.dark)
  .outer-meta
    .content
      color #333
</style>
