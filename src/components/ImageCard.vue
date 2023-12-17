<template>
  <div
    class="image-card"
    :style="{ paddingBottom: paddingBottom(artwork), '--w': artwork.width, '--h': artwork.height }"
    @click.stop="click(artwork.id)"
    @contextmenu="preventContext"
  >
    <img
      v-lazy="imgSrc"
      class="image"
      :class="{ censored: isCensored(artwork) }"
      :alt="artwork.title"
    >
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
    <div v-if="mode == 'all' || mode === 'meta'" v-longpress="isTriggerLongpress?onLongpress:null" class="meta">
      <div class="content">
        <h2 class="title" :title="artwork.title">{{ artwork.title }}</h2>
        <div class="author-cont">
          <img :src="artwork.author.avatar" :alt="artwork.author.name" class="avatar" @error="onAvatarErr">
          <div class="author">{{ artwork.author.name }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import FileSaver from 'file-saver'
import { Dialog } from 'vant'
import { mapGetters } from 'vuex'
import { localApi } from '@/api'
import { LocalStorage } from '@/utils/storage'
import { getCache, toggleBookmarkCache } from '@/utils/storage/siteCache'

const isLongpressDL = LocalStorage.get('PXV_LONGPRESS_DL', false)
const isLongpressBlock = LocalStorage.get('PXV_LONGPRESS_BLOCK', false)

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
    column: {
      type: Number,
      required: false,
      default: 2,
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
      isTriggerLongpress: isLongpressDL || isLongpressBlock,
    }
  },
  computed: {
    imgSrc() {
      if (this.square) {
        return this.artwork.images[0].s
      }
      return this.artwork.images[0].m
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
    ...mapGetters(['isCensored']),
  },
  async mounted() {
    if ((this.mode == 'all' || this.mode == 'cover') && this.showBookmarkBtn) {
      const favMap = await getCache('local.fav.map', {})
      this.isBookmarked = Boolean(favMap[this.artwork.id] || this.artwork.is_bookmarked)
    }
  },
  methods: {
    onAvatarErr() {
      const src = this.artwork.author.avatar
      if (!src) return
      if (src.includes('i.pixiv.re')) return
      try {
        const u = new URL(src)
        u.host = 'i.pixiv.re'
        // eslint-disable-next-line vue/no-mutating-props
        this.artwork.author.avatar = u.href
      } catch (error) {
        console.log('error: ', error)
      }
    },
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
      if (
        !id ||
        (this.$route.name === 'Artwork' && this.$route.params.id == id)
      ) { return false }

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
      const src = this.artwork.images[0].o
      const fileName = `${this.artwork.author.name}_${this.artwork.title}_${this.artwork.id}_p0.${src.split('.').pop()}`
      const res = await Dialog.confirm({
        title: this.$t('wuh4SsMnuqgjHpaOVp2rB'),
        message: fileName,
        lockScroll: false,
        closeOnPopstate: true,
        cancelButtonText: this.$t('common.cancel'),
        confirmButtonText: this.$t('common.confirm'),
      }).catch(() => 'cancel')
      if (res != 'confirm') return
      await this.$nextTick()
      FileSaver.saveAs(src, fileName)
    },
  },
}
</script>

<style lang="stylus" scoped>
.image-card {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  background: #fafafa;
  margin-bottom: 10px;
  border-radius: 20px;

  .image {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;

    &[lazy="loading"] {
      width: 100px;
      height: 100px;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }
  }

  .tag-r18-ai {
    position: absolute;
    top: 12px;
    left: 12px;
  }

  .layer-num {
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

    svg {
      vertical-align: bottom;
      margin-right: 4px;
    }
  }

  .bookmark {
    position absolute
    bottom 0
    right 0
    z-index 1
    padding: 20px 16px
    font-size 0.5rem
    cursor pointer
    filter: drop-shadow(0.02667rem 0.05333rem 0.05333rem #e87a90)
  }

  .btn-play {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: #565656;
    opacity: 0.6;
  }

  .meta {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;

    &::before {
      position: absolute;
      content: '';
      bottom: 0;
      width: 100%;
      height: 50%;
      background-image: linear-gradient(0deg, rgba(0, 0, 0, 0.5) 0%, rgba(255, 255, 255, 0) 100%);
    }

    .content {
      position: absolute;
      bottom: 0;
      width: 100%;
      padding: 18px 14px;
      box-sizing: border-box;
      color: #fff;

      .author-cont {
        display: flex;
        align-items: center;
      }

      .title {
        line-height: normal;
        font-size: 24px;
        margin: 10px 0;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 1;
        -webkit-box-orient: vertical;
      }

      .avatar {
        width: 48px;
        min-width: 48px;
        height: 48px;
        margin-right: 8px;
        vertical-align: bottom;
        border-radius: 50%;
        overflow: hidden;
      }

      .author {
        display: inline-block;
        font-size: 20px;
        font-weight: 200;
      }
    }
  }
}
</style>
