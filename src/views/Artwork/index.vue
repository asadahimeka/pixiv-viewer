<template>
  <div class="artwork" :class="{ isSafari, isAutoLoadImt, isSimulatedMeta }">
    <TopBar />
    <div class="share_btn" @click="share">
      <Icon class="icon" name="share" />
    </div>
    <van-swipe-cell ref="swipeCell" :disabled="disableSwipe" stop-propagation @open="onSwipeOpen">
      <template v-if="!disableSwipe" #left>
        <div class="ia-sc-btn">
          <van-icon name="arrow-left" size="0.6rem" />
        </div>
      </template>
      <div class="ia-cont" :class="{ 'landscape-1-art': isLandscape1Art }">
        <div class="ia-left">
          <van-loading v-if="loading" size="50px" />
          <ImageView ref="imgView" :artwork="artwork" @open-download="ugoiraDownloadPanelShow = true" />
        </div>
        <div class="ia-right">
          <van-skeleton class="skeleton" title avatar :row="5" row-width="200px" avatar-size="42px" :loading="loading">
            <ArtworkMeta ref="artworkMeta" :artwork="artwork" :maybe-ai-author="maybeAiAuthor" @ugoira-download="showUgPanelFromDlBtn" />
          </van-skeleton>
          <keep-alive>
            <AuthorCard v-if="artwork.author" :id="artwork.author.id" :key="artwork.id" @author-change="v => maybeAiAuthor = v" />
          </keep-alive>
        </div>
      </div>
      <template v-if="!disableSwipe" #right>
        <div class="ia-sc-btn">
          <van-icon name="arrow" size="0.6rem" />
        </div>
      </template>
    </van-swipe-cell>
    <van-divider style="margin: 0.7rem 0;" />
    <keep-alive>
      <Related v-show="artwork.id" :key="artwork.id" :artwork="artwork" />
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
import nprogress from 'nprogress'
import { mapGetters } from 'vuex'
import { ImagePreview } from 'vant'
import api from '@/api'
import store from '@/store'
import _ from '@/lib/lodash'
import { getCache, setCache } from '@/utils/storage/siteCache'
import { i18n } from '@/i18n'
import { copyText, isSafari } from '@/utils'
import { PIXIV_NEXT_URL, COMMON_PROXY } from '@/consts'
import TopBar from '@/components/TopBar'
import ImageView from './components/ImageView'
import Meta from './components/Meta'
import AuthorCard from './components/AuthorCard'
import Related from './components/Related'
import IconLink from '@/assets/images/share-sheet-link.png'
import IconQQ from '@/assets/images/share-sheet-qq.png'
import IconQrcode from '@/assets/images/share-sheet-qrcode.png'
import IconQzone from '@/assets/images/share-sheet-qzone.png'
import IconWeb from '@/assets/images/share-sheet-web.png'
// import IconWechat from '@/assets/images/share-sheet-wechat.png'
import IconWeibo from '@/assets/images/share-sheet-weibo.png'
import IconTwitter from '@/assets/images/share-sheet-twi.png'
import IconFacebook from '@/assets/images/share-sheet-facebook.png'
import { SessionStorage } from '@/utils/storage'

const { isAutoLoadImt, isEnableSwipe } = store.state.appSetting

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
        { name: 'APNG', subname: i18n.t('artwork.download.webm') },
        { name: 'MP4(Browser)', subname: i18n.t('pIghtXdU8socMNNRUn5UR') },
        { name: 'MP4(Server)', subname: i18n.t('zuVom-C8Ss8JTEDZIhzBj') },
        { name: 'Other', subname: i18n.t('artwork.download.mp4') },
      ],
      showShare: false,
      shareOptions: [
        { name: i18n.t('artwork.share.type.web'), icon: IconWeb },
        { name: i18n.t('artwork.share.type.copylink'), icon: IconLink },
        { name: i18n.t('artwork.share.type.qrcode'), icon: IconQrcode },
        { name: i18n.t('artwork.share.type.weibo'), icon: IconWeibo },
        { name: i18n.t('artwork.share.type.qzone'), icon: IconQzone },
        { name: 'QQ', icon: IconQQ },
        // { name: i18n.t('artwork.share.type.wechat'), icon: IconWechat },
        { name: 'Twitter', icon: IconTwitter },
        { name: 'Facebook', icon: IconFacebook },
      ],
      maybeAiAuthor: false,
      isSafari: isSafari(),
      isAutoLoadImt,
      disableSwipe: !isEnableSwipe,
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
    isSimulatedMeta() {
      return this.artwork.width == 0
    },
    isLandscape1Art() {
      return this.artwork?.images?.length == 1 && this.artwork?.width > this.artwork?.height
    },
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
      this.artwork = {}
      const id = Number(this.$route.params.id)
      let art = SessionStorage.get(`param_art_detail_${id}`)
      if (!art) art = this.$route.params.art
      console.log('artwork detail: ', id, art)
      if (art && art.type != 'ugoira' && !art.images[0].o.includes('i.loli.best')) {
        this.artwork = art
        this.loading = false
        SessionStorage.set(`param_art_detail_${id}`, art)
        if (window.APP_CONFIG.useLocalAppApi) {
          this.getArtwork(+id)
        } else {
          this.pushHistory(art)
        }
      } else {
        this.getArtwork(+id)
      }
    },
    async getArtwork(id) {
      await this.$nextTick()
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

        if (this.artwork.images[0].o.includes('common/images/limit')) {
          this.pidRecover(id)
        }

        this.pushHistory(res.data)
      } else {
        this.$toast({
          message: res.msg,
          icon: require('@/icons/error.svg'),
          duration: 3000,
        })
        if (res.msg == '尚无此页') {
          this.pidRecover(id, true)
        }
      }
    },
    async pushHistory(art) {
      await this.$nextTick()
      this.$refs.artworkMeta?.drawMask()

      let historyList = await getCache('illusts.history', [])
      if (!Array.isArray(historyList)) historyList = []
      // if (historyList.length > 100) historyList = historyList.slice(0, 100)
      historyList = _.uniqBy([art, ...historyList], 'id')
      setCache('illusts.history', historyList)
    },
    showUgPanelFromDlBtn() {
      const { ugoiraDefDLFormat } = store.state.appSetting
      if (ugoiraDefDLFormat) {
        this.$refs.imgView.download(ugoiraDefDLFormat)
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
      const shareUrl = `https://pixiv.pictures/i/${this.artwork.id}`
      const imageUrl = this.artwork.images[0].l.replace(/\/c\/\d+x\d+(_\d+)?\//g, '/')
      const actions = [
        async () => {
          const shareData = {
            title: 'Pixiv Viewer',
            text: `${this.$t('artwork.share.share')} ${this.$t('artwork.share.of_art', [this.artwork.author.name])}「${this.artwork.title}」- ID: ${this.artwork.id}`,
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
            images: [`https://api.moedog.org/qr/?url=${encodeURIComponent(shareUrl)}`],
          })
        },
        () => {
          this.openUrl(`https://service.weibo.com/share/share.php?language=zh_cn&searchPic=true&url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(`${this.$t('artwork.share.share')} ${this.$t('artwork.share.of_art', [this.artwork.author.name])}「${this.artwork.title}」- PID: ${this.artwork.id}`)}&summary=PID%3A${this.artwork.id}&pic=${imageUrl}`)
        },
        () => {
          this.openUrl(`https://sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzshare_onekey?title=${this.artwork.title}&url=${encodeURIComponent(shareUrl)}&pics=${imageUrl}&summary=${encodeURIComponent(this.artwork.author.name + ' - PID: ' + this.artwork.id)}`)
        },
        () => {
          this.openUrl(`https://connect.qq.com/widget/shareqq/index.html?url=${encodeURIComponent(shareUrl)}&title=${this.artwork.title}&source=${encodeURIComponent(shareUrl)}&desc=${encodeURIComponent(`${this.$t('artwork.share.share')} ${this.$t('artwork.share.of_art', [this.artwork.author.name])}「${this.artwork.title}」- PID: ${this.artwork.id}`)}&summary=${encodeURIComponent(`${this.$t('artwork.share.share')} ${this.$t('artwork.share.of_art', [this.artwork.author.name])}「${this.artwork.title}」- PID: ${this.artwork.id}`)}`)
        },
        // () => {
        //   this.openUrl(`https://wechat-share.pwp.space/?url=${encodeURIComponent(shareUrl)}&title=${this.artwork.title}`)
        // },
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
    async pidRecover(id, setFakeAuthor = false) {
      if (!store.getters.isR18On) return
      const res = await fetch(`${PIXIV_NEXT_URL}/api/pid-recover/${id}`)
      window.umami?.track('pid_recover', { ok: res.ok })
      if (!res.ok) return
      const arr = await res.json()
      console.log('--------------pidRecover arr: ', arr)
      this.loading = false
      this.artwork = {
        id,
        title: `${id}`,
        created: arr[0].createDate,
        author: setFakeAuthor
          ? {
              id: 11,
              name: 'Unknown',
              avatar: 'https://s.pximg.net/common/images/no_profile.png',
            }
          : {
              ...this.artwork.author,
              name: 'Unknown',
            },
        images: arr.map(e => ({
          l: COMMON_PROXY + e.sampleUrl,
          o: COMMON_PROXY + e.fileUrl,
        })),
        tags: arr[0].tags.map(e => ({ name: e })),
        width: 0,
        height: 0,
        count: arr.length,
        type: 'illust',
      }
    },
  },
}
</script>

<style lang="stylus">
img[src*="https://api.moedog.org/qr/?url="]
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
    top: 0.99rem;
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
    overflow clip

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
    position: sticky;
    top: 0;
    max-width 28%
    padding-right 40px
    box-sizing border-box
    overflow hidden

@media screen and (min-width: 1600px)
  .ia-cont
    &.landscape-1-art
      align-items center
      .ia-left
        margin-top -.2rem
      .ia-right
        min-height 100vh
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

  &.landscape-1-art
    display: flex !important
    flex-direction: column
    .ia-left
      flex 1
      min-height 55vh
    .ia-right
      position: relative
      width: 100% !important
      max-width: 100% !important

.artwork
  ::v-deep .top-bar-wrap
    width 2rem
    background none
  &.isSafari, &.isAutoLoadImt
    .image-view.loaded
      min-height auto
    .ia-right ::v-deep .artwork-meta
      padding 20px 30px 40px
      background #f5f5f5
      border-radius 20px
      .tag.translated
        color #808080
      @media screen and (max-width: 1200px)
        margin 0.26667rem 0.13333rem !important
      .shrink::after
        background: linear-gradient(to top, #f5f5f5, rgba(255,255,255,0));

.isSimulatedMeta
  ::v-deep .artwork-meta
    .tag-list
      pointer-events none
    .view,
    .like,
    .pid_link,
    .whid span:first-child,
    .whid span:last-child,
    .van-button:has(.van-icon-comment-o)
      display none
    .date,.whid
      display inline-flex
      margin 0
</style>
