<template>
  <div class="artwork">
    <TopBar />
    <div class="share_btn" @click="share">
      <Icon class="icon" name="share" />
    </div>
    <van-swipe-cell ref="swipeCell" :disabled="disableSwipe" stop-propagation @open="onSwipeOpen">
      <template #left>
        <div class="ia-sc-btn">
          <van-icon name="arrow-left" size="0.6rem" />
        </div>
      </template>
      <div class="ia-cont">
        <div class="ia-left">
          <van-loading v-if="loading" size="50px" />
          <ImageView ref="imgView" :artwork="artwork" :lazy="true" @open-download="ugoiraDownloadPanelShow = true" />
        </div>
        <div class="ia-right">
          <van-skeleton class="skeleton" title avatar :row="5" row-width="200px" avatar-size="42px" :loading="loading">
            <ArtworkMeta ref="artworkMeta" :artwork="artwork" @ugoira-download="showUgPanelFromDlBtn" />
          </van-skeleton>
          <keep-alive>
            <AuthorCard v-if="artwork.author" :id="artwork.author.id" :key="artwork.id" />
          </keep-alive>
        </div>
      </div>
      <template #right>
        <div class="ia-sc-btn">
          <van-icon name="arrow" size="0.6rem" />
        </div>
      </template>
    </van-swipe-cell>
    <van-divider style="margin: 0.7rem 0;" />
    <keep-alive>
      <Related :key="artwork.id" :artwork="artwork" />
    </keep-alive>
    <van-action-sheet
      v-model="ugoiraDownloadPanelShow"
      :actions="ugoiraDownloadPanelActions"
      :cancel-text="$t('common.cancel')"
      :description="$t('artwork.download.placeholder')"
      close-on-popstate
      close-on-click-action
      @select="onUgoiraDownloadPanelSelect"
    />
    <van-share-sheet
      v-model="showShare"
      :title="$t('artwork.share.title')"
      :cancel-text="$t('common.cancel')"
      :options="shareOptions"
      @select="onShareSel"
    />
  </div>
</template>

<script>
import TopBar from '@/components/TopBar'
import ImageView from './components/ImageView'
import Meta from './components/Meta'
import AuthorCard from './components/AuthorCard'
import Related from './components/Related'
import { ImagePreview } from 'vant'
import { mapGetters } from 'vuex'
import nprogress from 'nprogress'
import api from '@/api'
import { getCache, setCache } from '@/utils/storage/siteCache'
import _ from 'lodash'
import { i18n } from '@/i18n'
import { copyText } from '@/utils'
import IconLink from '@/assets/images/share-sheet-link.png'
import IconQQ from '@/assets/images/share-sheet-qq.png'
import IconQrcode from '@/assets/images/share-sheet-qrcode.png'
import IconQzone from '@/assets/images/share-sheet-qzone.png'
import IconWeb from '@/assets/images/share-sheet-web.png'
import IconWechat from '@/assets/images/share-sheet-wechat.png'
import IconWeibo from '@/assets/images/share-sheet-weibo.png'
import IconTwitter from '@/assets/images/share-sheet-twi.png'
import IconFacebook from '@/assets/images/share-sheet-facebook.png'
import { LocalStorage } from '@/utils/storage'

export default {
  name: 'Artwork',
  components: {
    TopBar,
    ImageView,
    ArtworkMeta: Meta,
    AuthorCard,
    Related,
  },
  beforeRouteUpdate(to, from, next) {
    if (this.$refs.artworkMeta?.showComments) {
      this.$refs.artworkMeta.showComments = false
      next(false)
      nprogress.done()
    } else {
      next()
    }
  },
  beforeRouteLeave(to, from, next) {
    if (this.$refs.artworkMeta?.showComments) {
      this.$refs.artworkMeta.showComments = false
      next(false)
      nprogress.done()
    } else {
      next()
    }
  },
  data() {
    return {
      loading: true,
      artwork: {},
      ugoiraDownloadPanelShow: false,
      ugoiraDownloadPanelActions: [
        { name: 'ZIP', subname: i18n.t('artwork.download.zip') },
        { name: 'GIF', subname: i18n.t('artwork.download.gif') },
        { name: 'WebM', subname: i18n.t('artwork.download.webm') }, // chrome only
        { name: 'MP4', subname: i18n.t('artwork.download.mp4') },
      ],
      showShare: false,
      shareOptions: [
        { name: i18n.t('artwork.share.type.web'), icon: IconWeb },
        { name: i18n.t('artwork.share.type.copylink'), icon: IconLink },
        { name: i18n.t('artwork.share.type.qrcode'), icon: IconQrcode },
        { name: i18n.t('artwork.share.type.weibo'), icon: IconWeibo },
        { name: i18n.t('artwork.share.type.qzone'), icon: IconQzone },
        { name: 'QQ', icon: IconQQ },
        { name: i18n.t('artwork.share.type.wechat'), icon: IconWechat },
        { name: 'Twitter', icon: IconTwitter },
        { name: 'Facebook', icon: IconFacebook },
      ],
      disableSwipe: !LocalStorage.get('PXV_IMG_DTL_SWIPE', false),
    }
  },
  head() {
    return this.artwork.title
      ? {
          title: this.artwork.title + ' - ' + this.artwork.author?.name,
        }
      : {}
  },
  computed: {
    ...mapGetters(['isCensored']),
  },
  watch: {
    $route() {
      if (
        this.$route.name === 'Artwork' &&
        this.$route.params.id != this.artwork.id
      ) {
        this.init()
      }
    },
  },
  mounted() {
    this.init()
  },
  methods: {
    init() {
      this.loading = true
      const id = +this.$route.params.id
      this.artwork = {}
      this.getArtwork(id)
    },
    async getArtwork(id) {
      // console.log(id);
      const res = await api.getArtwork(id)
      if (res.status === 0) {
        this.artwork = res.data
        this.loading = false

        if (this.isCensored(this.artwork)) {
          this.$toast({
            message: this.$t('common.content.hide'),
            icon: require('@/icons/ban-view.svg'),
          })
        }

        let historyList = await getCache('illusts.history', [])
        if (!Array.isArray(historyList)) historyList = []
        if (historyList.length > 100) historyList = historyList.slice(0, 100)
        historyList = _.uniqBy([res.data, ...historyList], 'id')
        setCache('illusts.history', historyList)
      } else {
        this.$toast({
          message: res.msg,
          icon: require('@/icons/error.svg'),
          duration: 3000,
        })
        // setTimeout(() => {
        //   this.$router.back()
        // }, 500)
      }
    },
    showUgPanelFromDlBtn() {
      if (!this.$refs.imgView.ugoira) {
        this.$toast(this.$t('artwork.download.ugoira.tip'))
        return
      }
      this.ugoiraDownloadPanelShow = true
    },
    onUgoiraDownloadPanelSelect(item) {
      this.$refs.imgView.download(item.name)
    },
    onSwipeOpen({ position }) {
      this.$refs.swipeCell?.close()
      const list = this.$store.state.galleryList || []
      console.log('list: ', list)
      const curr = list.findIndex(e => e == this.artwork.id)
      console.log('curr: ', curr)
      if (position == 'left') {
        const prev = list[curr - 1]
        console.log('prev: ', prev)
        prev && this.$router.replace(`/artworks/${prev}`)
      } else {
        const next = list[curr + 1]
        console.log('next: ', next)
        next && this.$router.replace(`/artworks/${next}`)
      }
    },
    onShareSel(_, index) {
      const shareUrl = `https://pixiv.pics/i/${this.artwork.id}`
      let imageUrl = this.artwork.images[0].l.replace(/\/c\/\d+x\d+(_\d+)?\//g, '/')
      if (imageUrl.includes('i-cf.pximg.net')) imageUrl = imageUrl.replace('i-cf.pximg.net', 'i.pixiv.re')
      const actions = [
        async () => {
          const shareData = {
            title: 'Pixiv Viewer',
            text: `${this.$t('artwork.share.share')} ${this.artwork.author.name} ${this.$t('artwork.share.of_art')} ${this.artwork.title} - ID: ${this.artwork.id}`,
            url: `${shareUrl}`,
          }
          try {
            await navigator.share(shareData)
          } catch (error) {
            console.log('error: ', error)
          }
        },
        () => {
          copyText(
            shareUrl,
            () => this.$toast(this.$t('tips.copylink.success')),
            err => this.$toast(this.$t('tips.copylink.error') + err)
          )
        },
        () => {
          ImagePreview({
            closeable: true,
            images: [`https://api.obfs.dev/api/qrcode?text=${encodeURIComponent(shareUrl)}`],
          })
        },
        () => {
          this.openUrl(`https://service.weibo.com/share/share.php?language=zh_cn&searchPic=true&url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(`${this.$t('artwork.share.share')} ${this.artwork.author.name} ${this.$t('artwork.share.of_art')} ${this.artwork.title} - PID: ${this.artwork.id}`)}&summary=PID%3A${this.artwork.id}&pic=${imageUrl}`)
        },
        () => {
          this.openUrl(`https://sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzshare_onekey?title=${this.artwork.title}&url=${encodeURIComponent(shareUrl)}&pics=${imageUrl}&summary=${encodeURIComponent(this.artwork.author.name + ' - PID: ' + this.artwork.id)}`)
        },
        () => {
          this.openUrl(`https://connect.qq.com/widget/shareqq/index.html?url=${encodeURIComponent(shareUrl)}&title=${this.artwork.title}&source=${encodeURIComponent(shareUrl)}&desc=${encodeURIComponent(`${this.$t('artwork.share.share')} ${this.artwork.author.name} ${this.$t('artwork.share.of_art')} ${this.artwork.title} - PID: ${this.artwork.id}`)}&summary=${encodeURIComponent(`${this.$t('artwork.share.share')} ${this.artwork.author.name} ${this.$t('artwork.share.of_art')} ${this.artwork.title} - PID: ${this.artwork.id}`)}`)
        },
        () => {
          this.openUrl(`https://wechat-share.pwp.space/?url=${encodeURIComponent(shareUrl)}&title=${this.artwork.title}`)
        },
        () => {
          this.openUrl(`https://twitter.com/intent/tweet?url=${encodeURIComponent(`https://www.pixiv.net/artworks/${this.artwork.id}`)}&text=${this.artwork.title}&hashtags=pixiv`)
        },
        () => {
          this.openUrl(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`https://www.pixiv.net/artworks/${this.artwork.id}`)}`)
        },
      ]
      actions[index]?.()
    },
    openUrl(url) {
      window.open(url, '_blank', 'noopener noreferrer')
    },
    async share() {
      this.showShare = true
    },
  },
}
</script>

<style lang="stylus">
img[src*="/api/qrcode?text"]
  position absolute
  top 50%
  left 50%
  transform translate(-50%, -50%)
  width 5rem !important
  height 5rem !important

.app-main:has(.artwork)
  padding 0

  .related
    padding-left 16px
    padding-right 16px
</style>
<style lang="stylus" scoped>
.artwork
  .skeleton
    margin: 30px 0;
  .share_btn
    position: fixed;
    top: 0.9rem;
    right 0.5rem;
    z-index: 99;
    font-size 0.675rem
    cursor pointer
    .svg-icon
      color: #fafafa;
      filter: drop-shadow(0.02667rem 0.05333rem 0.05333rem rgba(0,0,0,0.8));

  ::v-deep .van-share-sheet,.van-action-sheet
    width 10rem !important
    left 50% !important
    margin-left -5rem !important
  ::v-deep .van-share-sheet__option:first-child img
    background: #f2f3f5;
    border-radius: 50%;
  ::v-deep .van-share-sheet__options::-webkit-scrollbar
    height 0.12rem
  ::v-deep .van-swipe-cell
    cursor auto

.ia-sc-btn
  display flex
  justify-content center
  align-items center
  width 0.7rem
  height 100%

.ia-cont
  display flex
  align-items flex-start
  min-height 100vh

  .ia-left
    display flex
    justify-content center
    align-items center
    width 72%
    min-width 72%
    margin-top 20px
    padding 0 20px

    ::v-deep .image-box
      width: 100% !important
      height: auto !important
      min-width 300px
      min-height 300px
      &:not(:last-child)
        margin-bottom 10px

      .image
        width auto
        max-width 100%
        height auto
        max-height 96vh
        margin 0 auto
        border-radius 5PX
        box-shadow: 0 0 transparent, 0 0 transparent, 0 1PX 3PX 0 rgba(0,0,0,.1), 0 1PX 2PX -1PX rgba(0,0,0,.1)

  .ia-right
    max-width 28%
    padding-right 40px
    box-sizing border-box
    overflow hidden

.artwork
  ::v-deep .top-bar-wrap
    width 2rem
    background none

@media screen and (max-width: 1200px)
  .ia-cont
    display block !important

  .ia-left
    width 100% !important
    margin 0 auto !important
    padding 0 !important

    ::v-deep .image
      max-width: 100% !important
      max-height: 90vh !important
      border-radius 0 !important
      box-shadow none !important

  .ia-right
    max-width unset !important
    padding-right 0 !important
    .artwork-meta
      margin-top 10px !important

</style>
