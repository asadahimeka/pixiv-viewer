<template>
  <div class="artwork" :class="{ isSafari, hidePIDMask, isSimulatedMeta }">
    <TopBar />
    <div class="share_btn" @click="showShare = true">
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
          <van-loading v-if="loading" class="i-loading" size="50px" />
          <ImageView
            ref="imgView"
            :artwork="artwork"
            :show-pic-translate-btn="showPicTranslateBtn"
            :translating-index="translatingIndex"
            :translated-canvases="translatedCanvases"
            :show-translated="showTranslated"
            :pipeline-progress="pipelineProgress"
            :pipeline-stage-timings="pipelineStageTimings"
            :current-artifacts="currentArtifacts"
            @open-download="ugoiraDownloadPanelShow = true"
            @translate="handleTranslate"
            @toggle-translate="showTranslated = !showTranslated"
          />
        </div>
        <div class="ia-right">
          <van-skeleton class="skeleton" title avatar :row="5" row-width="200px" avatar-size="42px" :loading="loading">
            <ArtworkMeta ref="artworkMeta" :artwork="artwork" :maybe-ai-author="maybeAiAuthor" @ugoira-download="showUgPanelFromDlBtn" @update-author-follow="updateAuthorFollow" />
          </van-skeleton>
          <TranslateToolbar
            v-if="showPicTranslateBtn"
            :visible="showPicTranslateBtn"
            :translating="pipelineTranslating"
            :show-translated="showTranslated"
            :status-text="translateStatusText"
            :page-count="pageCount"
            :current-page="currentTransPage"
            :error-count="translateErrorCount"
            :engine="translationEngine"
            @toggle-view="showTranslated = !showTranslated"
            @open-settings="showTranslateSettings = true"
            @cancel-translate="handleCancelTranslate"
          />
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
    <PicTranslatePanel
      v-if="showPicTranslateBtn"
      :visible="showPicTranslatePanel"
      :translations="picTranslations[currentTransPage]"
      :current-page="currentTransPage"
      :loading="picTranslating[currentTransPage]"
      @close="handleClosePanel"
      @retry="handleVLRetry(currentTransPage)"
    />
    <van-popup
      v-if="showPicTranslateBtn"
      v-model="showTranslateSettings"
      position="bottom"
      class="translate-settings-popup"
      round
      closeable
      close-icon-position="top-right"
      get-container="body"
    >
      <TranslateSettings />
    </van-popup>
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
import { Dialog, ImagePreview } from '@/lib/vant-apis'
import api, { localApi } from '@/api'
import store from '@/store'
import _ from '@/lib/lodash'
import { getCache, setCache } from '@/utils/storage/siteCache'
import { i18n } from '@/i18n'
import { copyText, loadBlobAsImage, sleep } from '@/utils'
import { PIXIV_NEXT_URL, COMMON_PROXY, PXIMG_PID_BASE } from '@/consts'
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
import { ugoiraDownloadActions } from '@/utils/ugoira'
import { translateMangaPage, getCachedTranslation, resolveVlModel } from '@/utils/translate/manga'
import PicTranslatePanel from './components/PicTranslatePanel.vue'
import TranslateToolbar from './components/TranslateToolbar'
import TranslateSettings from './components/TranslateSettings'
// import { mintFilter } from '@/utils/filter'

// 服务端翻译结构化错误码 → 中文 toast（shinobu-server 契约，见其 app.js ERROR_STATUS）
const SERVER_ERROR_TOAST = {
  UNAUTHORIZED: '服务端鉴权失败',
  IMAGE_FETCH_FAILED: '图片下载失败',
  IMAGE_TOO_LARGE: '图片过大',
  LLM_RATE_LIMITED: 'LLM 限流，请稍后重试',
  PIPELINE_FAILED: '翻译失败',
  JOB_FAILED: '翻译失败',
}

export default {
  name: 'Artwork',
  components: {
    TopBar,
    ImageView,
    ArtworkMeta: Meta,
    AuthorCard,
    Related,
    PicTranslatePanel,
    TranslateToolbar,
    TranslateSettings,
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
      if (this.pipelineAbort) {
        this.pipelineAbort.abort()
      }
      next()
    }
  },
  props: {
    popupArt: { type: Object, default: () => null },
  },
  data() {
    return {
      loading: true,
      artwork: {},
      ugoiraDownloadPanelShow: false,
      ugoiraDownloadPanelActions: ugoiraDownloadActions(),
      showShare: false,
      shareOptions: [
        { name: i18n.t('artwork.share.type.web'), icon: IconWeb },
        { name: i18n.t('NpehaslwZK0m14UfYZaHO'), icon: IconLink },
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
      picTranslations: {},
      picTranslating: {},
      showPicTranslatePanel: false,
      currentTransPage: 0,
      translatedCanvases: {},
      showTranslated: false,
      pipelineProgress: {},
      pipelineStageTimings: {},
      currentArtifacts: null,
      pipelineTranslating: false,
      translateStatusText: '',
      translateErrorCount: 0,
      showTranslateSettings: false,
      pipelineAbort: null,
      isActive: true,
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
    ...mapGetters(['isCensored', 'isLoggedIn']),
    isSimulatedMeta() {
      return this.artwork.width == 0
    },
    isLandscape1Art() {
      return this.artwork?.images?.length == 1 && this.artwork?.width > this.artwork?.height
    },
    disableSwipe() {
      const { isEnableSwipe, openArtDetailAsPopup } = store.state.appSetting
      return openArtDetailAsPopup || !isEnableSwipe
    },
    isSafari() {
      return store.state.isSafari
    },
    hidePIDMask() {
      return (
        store.state.isSafari ||
        store.state.appSetting.isAutoLoadKissT ||
        !store.state.appSetting.showPIDMask
      )
    },
    showPicTranslateBtn() {
      const tags = JSON.stringify(this.artwork.tags)
      return (
        this.isLoggedIn &&
        i18n.locale.includes('zh') &&
        this.artwork.x_restrict < 1 &&
        (this.artwork.type === 'manga' || /manga|漫画|漫畫|マンガ|まんが/i.test(tags)) &&
        !/中文|中国语|Chinese|中國語|中国語/i.test(tags)
      )
    },
    translatingIndex() {
      for (const key in this.picTranslating) {
        if (this.picTranslating[key]) return parseInt(key)
      }
      return -1
    },
    pageCount() {
      return this.artwork?.images?.length || 0
    },
    translationEngine() {
      return store.state.mangaTrans.engine
    },
    translationTranslator() {
      return store.state.mangaTrans.translator || 'llm'
    },
    providerConfig() {
      const { provider, providers } = store.state.mangaTrans
      return providers[provider] || {}
    },
  },
  watch: {
    $route() {
      if (
        this.$route.name === 'Artwork' &&
        this.$route.params.id != this.artwork.id
      ) {
        this.resetTranslateState()
        this.init()
      }
    },
    popupArt(val) {
      if (val && val.id != this.artwork.id) {
        this.resetTranslateState()
        this.init()
      }
    },
  },
  mounted() {
    this.init()
  },
  activated() {
    this.isActive = true
  },
  deactivated() {
    console.log('[Artwork] deactivated — cleaning up translation state')
    this.isActive = false
    // Abort in-progress pipeline
    if (this.pipelineAbort) {
      this.pipelineAbort.abort()
      this.pipelineAbort = null
    }
    // Reset translating state
    this.pipelineTranslating = false
    this.translateStatusText = ''
    // Note: keep translatedCanvases for when component is reactivated (keep-alive)
    // canvases are released in beforeDestroy only
    // Release debug artifacts (currentArtifacts) — full-size canvases, safe to GC
    this.currentArtifacts = null
    // Release ONNX sessions + terminate the Comlink worker (~200MB)
    import('@/utils/translate/shinobu/runtime/modelRegistry').then(m => {
      m.disposeAllModelSessions().catch(err => console.warn('dispose models failed:', err))
    })
  },
  beforeDestroy() {
    console.log('[Artwork] beforeDestroy — releasing all translation canvases')
    // Abort pipeline
    if (this.pipelineAbort) {
      this.pipelineAbort.abort()
      this.pipelineAbort = null
    }
    // Release translated canvas references (GC will handle cleanup)
    this.translatedCanvases = {}
    this.pipelineProgress = {}
    this.pipelineStageTimings = {}
    // Release debug artifacts (currentArtifacts) — full-size canvases, safe to GC
    this.currentArtifacts = null
  },
  methods: {
    resetTranslateState() {
      this.showTranslated = false
      this.translatedCanvases = {}
      this.pipelineProgress = {}
      this.pipelineStageTimings = {}
      this.currentArtifacts = null
      this.pipelineTranslating = false
      this.translateStatusText = ''
      this.translateErrorCount = 0
      this.currentTransPage = 0
      if (this.pipelineAbort) {
        this.pipelineAbort.abort()
        this.pipelineAbort = null
      }
      // vl-api 状态也一并重置
      this.picTranslations = {}
      this.picTranslating = {}
      this.showPicTranslatePanel = false
    },
    init() {
      this.loading = true
      this.artwork = {}
      let id = Number(this.$route.params.id)
      let art = SessionStorage.get(`param_art_detail_${id}`)
      if (!art) art = this.$route.params.art
      if (this.popupArt) {
        art = this.popupArt
        id = art.id
      }
      console.log('artwork detail: ', id, art)
      if (art && art.type != 'ugoira' && !art.images[0].o.includes(PXIMG_PID_BASE)) {
        // art.caption = await mintFilter(art.caption)
        this.artwork = art
        this.loading = false
        SessionStorage.set(`param_art_detail_${id}`, art)
        if (localApi.APP_CONFIG.useLocalAppApi) {
          this.getArtwork(+id)
        } else {
          this.pushHistory(art)
        }
      } else {
        this.getArtwork(+id)
      }
    },
    updateAuthorFollow(val) {
      if (typeof val != 'boolean') return
      this.artwork.author.is_followed = val
    },
    async getArtwork(id) {
      await this.$nextTick()
      const res = await api.getArtwork(id)
      if (res.status === 0) {
        // res.data.caption = await mintFilter(res.data.caption)
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
        this.$refs.imgView.downloadUgoira(ugoiraDefDLFormat)
        return
      }
      this.ugoiraDownloadPanelShow = true
    },
    onUgoiraDownloadPanelSelect(item) {
      this.$refs.imgView.downloadUgoira(item.name)
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
      const openUrl = url => window.open(url, '_blank', 'noopener noreferrer')
      const shareUrl = `https://pixiv.pictures/i/${this.artwork.id}`
      const imageUrl = this.artwork.images[0].l.replace(/\/c\/\d+x\d+\w*\//g, '/')
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
            `${this.$t('artwork.share.share')} ${this.$t('artwork.share.of_art', [this.artwork.author.name])}「${this.artwork.title}」- PID: ${this.artwork.id}`,
            () => this.$toast(this.$t('tips.copylink.succ')),
            err => this.$toast(this.$t('tips.copy_err') + err)
          )
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
          openUrl(`https://service.weibo.com/share/share.php?language=zh_cn&searchPic=true&url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(`${this.$t('artwork.share.share')} ${this.$t('artwork.share.of_art', [this.artwork.author.name])}「${this.artwork.title}」- PID: ${this.artwork.id}`)}&summary=PID%3A${this.artwork.id}&pic=${imageUrl}`)
        },
        () => {
          openUrl(`https://sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzshare_onekey?title=${this.artwork.title}&url=${encodeURIComponent(shareUrl)}&pics=${imageUrl}&summary=${encodeURIComponent(this.artwork.author.name + ' - PID: ' + this.artwork.id)}`)
        },
        () => {
          openUrl(`https://connect.qq.com/widget/shareqq/index.html?url=${encodeURIComponent(shareUrl)}&title=${this.artwork.title}&source=${encodeURIComponent(shareUrl)}&desc=${encodeURIComponent(`${this.$t('artwork.share.share')} ${this.$t('artwork.share.of_art', [this.artwork.author.name])}「${this.artwork.title}」- PID: ${this.artwork.id}`)}&summary=${encodeURIComponent(`${this.$t('artwork.share.share')} ${this.$t('artwork.share.of_art', [this.artwork.author.name])}「${this.artwork.title}」- PID: ${this.artwork.id}`)}`)
        },
        // () => {
        //   openUrl(`https://wechat-share.pwp.space/?url=${encodeURIComponent(shareUrl)}&title=${this.artwork.title}`)
        // },
        () => {
          openUrl(`https://twitter.com/intent/tweet?url=${encodeURIComponent(`https://www.pixiv.net/artworks/${this.artwork.id}`)}&text=${this.artwork.title}&hashtags=pixiv`)
        },
        () => {
          openUrl(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`https://www.pixiv.net/artworks/${this.artwork.id}`)}`)
        },
      ]
      actions[index]?.()
      this.showShare = false
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
    async handleTranslate(pageIndex) {
      const engine = store.state.mangaTrans.engine
      window.umami?.track('translate_manga', { engine })

      switch (engine) {
        case 'shinobu':
          this.translateByShinobu(pageIndex)
          break
        case 'server':
          this.translateByServer(pageIndex)
          break
        case 'vl-api':
          this.translateByVLApi(pageIndex)
          break
        default:
          break
      }
    },
    handleClosePanel() {
      const engine = store.state.mangaTrans.engine
      if (engine === 'vl-api') {
        this.showPicTranslatePanel = false
      } else {
        this.showTranslated = false
      }
    },
    handleCancelTranslate() {
      // shinobu pipeline runs on the main thread via comlink worker —
      // abort via the AbortController stored in pipelineAbort (T20)
      if (this.pipelineAbort) {
        this.pipelineAbort.abort()
        this.pipelineAbort = null
      }
      this.pipelineTranslating = false
      this.translateStatusText = ''
      const pageIndex = this.currentTransPage
      // 同步清除 overlay 驱动状态，防止取消后 loading/译图 overlay 残留
      this.$set(this.pipelineProgress, pageIndex, { stage: '', detail: '', percent: 0 })
      this.$set(this.translatedCanvases, pageIndex, null)
      this.showTranslated = false
    },
    async handleVLRetry(pageIndex) {
      try {
        await setCache(`pic.translate.${this.artwork.id}.${pageIndex}.${resolveVlModel(store.state.mangaTrans.vlModel)}`, null)
      } catch (e) {
        console.warn('Failed to clear translate cache', e)
      }
      this.$set(this.picTranslations, pageIndex, '')

      this.handleTranslate(pageIndex)
    },
    async translateByShinobu(pageIndex) {
      // 提示安装 HTTP Helper 用户脚本（一次性，仅未安装时）
      if (!window.__httpRequest__ && !store.state.mangaTrans.helperConsent) {
        const helperRes = await Dialog.confirm({
          title: '提示',
          message: '建议安装 Tampermonkey 浏览器扩展并安装 HTTP Helper 用户脚本，否则可能无法进行翻译。<br><br><p>Tampermonkey 扩展: <a href="https://www.tampermonkey.net/" target="_blank" rel="noreferrer">前往安装</a></p><p>HTTP Helper 用户脚本: <a href="https://fastly.jsdelivr.net/gh/asadahimeka/pixiv-viewer@master/public/helper/helper.user.js" target="_blank" rel="noreferrer">点击安装</a></p>',
          messageAlign: 'left',
          confirmButtonText: '知道了',
          cancelButtonText: '取消',
        }).catch(() => 'cancel')
        if (helperRes === 'confirm') store.commit('SET_MANGA_TRANS', { helperConsent: true })
        // 无论确认与否，都不阻断翻译
      }
      // 首次使用需确认下载模型（检测/OCR/去字，约 199MB）
      if (!store.state.mangaTrans.shinobuModelConsent) {
        const res = await Dialog.confirm({
          title: '模型下载确认',
          message: '首次使用 Shinobu 管线需要下载模型文件（检测/OCR/去字），约 199MB，可能需要较长时间，请耐心等待。',
          confirmButtonText: '确定',
          cancelButtonText: '取消',
        }).catch(() => 'cancel')
        if (res !== 'confirm') return
        store.commit('SET_MANGA_TRANS', { shinobuModelConsent: true })
      }
      // SHINOBU PIPELINE path (canvas output, replaces old ONNX pipeline)
      if (this.pipelineTranslating) {
        this.$toast('正在翻译中，请稍候')
        return
      }

      this.showTranslated = false
      this.currentTransPage = pageIndex
      this.currentArtifacts = null

      const imageUrl = this.artwork.images[pageIndex]?.l?.replace(/\/c\/\d+x\d+\w*\//g, '/') || this.artwork.images[pageIndex]?.o
      if (!imageUrl) {
        this.$toast('无法获取图片 URL')
        return
      }

      const cacheKey = `pic.translate.shinobu.${this.artwork.id}.${pageIndex}.${this.translationTranslator}`
      const cached = await getCache(cacheKey)
      // 缓存以 Blob 存储；旧缓存（canvas 序列化成 {}）不满足 instanceof Blob → 当 miss 重新翻译
      if (cached instanceof Blob) {
        try {
          const img = await loadBlobAsImage(cached)
          const canvas = document.createElement('canvas')
          canvas.width = img.naturalWidth
          canvas.height = img.naturalHeight
          canvas.getContext('2d').drawImage(img, 0, 0)
          URL.revokeObjectURL(img.src)
          this.$set(this.translatedCanvases, pageIndex, canvas)
          this.showTranslated = true
          this.currentArtifacts = {
            detectedRegions: [],
            stageRegions: { detected: [], ocr: [], merged: [], ordered: [] },
            stageTimings: this.pipelineStageTimings[pageIndex] || [],
            resultCanvas: canvas,
            runtimeStages: [],
          }
          this.$toast('使用缓存的翻译结果')
          return
        } catch (e) {
          // 损坏/解码失败的 Blob：放弃缓存，降级为 miss 走正常翻译（不挂起）
          console.warn('[shinobu] 缓存恢复失败，重新翻译:', e)
        }
      }

      this.pipelineTranslating = true
      this.translateStatusText = '准备中…'
      this.$set(this.pipelineProgress, pageIndex, { stage: 'starting', detail: '准备中…', percent: 0 })
      this.$set(this.translatedCanvases, pageIndex, null)

      const providerConfig = this.providerConfig || {}
      const config = {
        sourceLang: 'ja',
        targetLang: 'zh-CN',
        translator: this.translationTranslator,
        llmProvider: 'custom',
        llmAuthMode: providerConfig.authMode || 'api_key',
        llmBaseUrl: providerConfig.baseUrl || '',
        llmApiKey: providerConfig.apiKey || '',
        llmModel: providerConfig.model || '',
        processMode: store.state.mangaTrans.processMode || 'translate',
        ocrEngine: 'paddleocr_v6_medium',
        ocrPostFilter: 'balanced',
        typesetDebug: false,
        eraseDebug: false,
        collectDebugLog: false,
        diagnosticRunId: Date.now().toString(),
      }

      const onProgress = progress => {
        this.$set(this.pipelineProgress, pageIndex, progress)
        this.translateStatusText = progress.detail || ''
        // 流式 stageTimings：让 TranslateProgress "阶段耗时" 块实时显示
        if (progress.timings && progress.timings.length) {
          this.$set(this.pipelineStageTimings, pageIndex, progress.timings)
        }
      }

      const abortController = new AbortController()
      this.pipelineAbort = abortController

      try {
        // Shinobu 图片获取降级链: 油猴 __httpRequest__ → imgProxy → fetch
        let imageBlob = null
        if (window.__httpRequest__) {
          try {
            const { data } = await window.__httpRequest__(imageUrl, JSON.stringify({
              responseType: 'blob',
              headers: { Referer: 'https://www.pixiv.net/' },
            }))
            if (data instanceof Blob) imageBlob = data
          } catch (e) {
            console.warn('[shinobu] 油猴图片获取失败，降级:', e)
          }
        }
        if (!imageBlob) {
          const fetchUrl = COMMON_PROXY + imageUrl
          const res = await fetch(fetchUrl)
          if (!res.ok) throw new Error(`图片下载失败 HTTP ${res.status}`)
          imageBlob = await res.blob()
        }
        const imageFile = new File([imageBlob], `page-${pageIndex}.png`, { type: imageBlob.type || 'image/png' })

        const { runPipeline } = await import('@/utils/translate/shinobu')
        const artifacts = await runPipeline(imageFile, config, onProgress, { signal: abortController.signal })

        if (!this.isActive || abortController.signal.aborted) {
          console.log('[Artwork] Component deactivated or translation cancelled during pipeline — discarding result')
          return
        }

        this.currentArtifacts = {
          detectedRegions: artifacts.detectedRegions,
          stageRegions: artifacts.stageRegions,
          stageTimings: artifacts.stageTimings,
          resultCanvas: artifacts.resultCanvas,
          runtimeStages: artifacts.runtimeStages,
        }
        this.$set(this.pipelineStageTimings, pageIndex, artifacts.stageTimings || [])

        if (artifacts.detectedRegions.length === 0) {
          this.$toast('未检测到文字')
          this.$set(this.translatedCanvases, pageIndex, null)
          this.$set(this.pipelineProgress, pageIndex, { stage: '', detail: '', percent: 0 })
          return
        }

        if (artifacts.resultCanvas && !abortController.signal.aborted) {
          this.$set(this.translatedCanvases, pageIndex, artifacts.resultCanvas)
          // IndexedDB 无法结构化克隆 canvas，转存 Blob（PNG）保证缓存可序列化
          const blob = await new Promise(resolve => artifacts.resultCanvas.toBlob(resolve, 'image/png'))
          if (blob) await setCache(cacheKey, blob)
          this.showTranslated = true
        }
        this.$toast('翻译完成')
      } catch (err) {
        if (err.name === 'AbortError') {
          this.$toast('已取消')
        } else {
          if (err.artifacts) err.artifacts = null
          console.log('shinobu pipeline err:', err)
          const stage = err.stage || ''
          const detail = err.detail || err.message || ''
          this.$toast(`翻译失败${stage ? `（${stage}）` : ''}: ${detail}`)
        }
        // 失败/取消路径:不残留译图状态
        this.showTranslated = false
        this.$set(this.translatedCanvases, pageIndex, null)
      } finally {
        this.pipelineTranslating = false
        this.translateStatusText = ''
        this.pipelineAbort = null
        this.$set(this.pipelineProgress, pageIndex, { stage: '', detail: '', percent: 0 })
      }
    },
    async translateByServer(pageIndex) {
      // 服务端翻译引擎（异步 job）：POST /translate 提交 → 轮询
      // GET /translate/jobs/:id → done 后 GET .../result 取翻译 PNG → 画布 overlay
      const { serverUrl, serverToken } = store.state.mangaTrans
      if (!serverUrl) {
        this.$toast('未配置服务端翻译地址')
        return
      }

      this.showTranslated = false
      this.currentTransPage = pageIndex
      this.currentArtifacts = null

      console.log('this.artwork.images[pageIndex]: ', this.artwork.images[pageIndex])
      const imageUrl = this.artwork.images[pageIndex]?.l?.replace(/\/c\/\d+x\d+\w*\//g, '/') || this.artwork.images[pageIndex]?.o
      if (!imageUrl) {
        this.$toast('无法获取图片 URL')
        return
      }

      // 前端缓存：命中直接恢复画布，不请求服务端
      const cacheKey = `pic.translate.server.${this.artwork.id}.${pageIndex}.${'llm'}`
      const cached = await getCache(cacheKey)
      if (cached instanceof Blob) {
        try {
          const img = await loadBlobAsImage(cached)
          const canvas = document.createElement('canvas')
          canvas.width = img.naturalWidth
          canvas.height = img.naturalHeight
          canvas.getContext('2d').drawImage(img, 0, 0)
          URL.revokeObjectURL(img.src)
          this.$set(this.translatedCanvases, pageIndex, canvas)
          this.showTranslated = true
          this.$toast('使用缓存的翻译结果')
          return
        } catch (e) {
          console.warn('[server] 缓存恢复失败，重新翻译:', e)
        }
      }

      // 简单 loading（异步 job 轮询进度，无 SSE/WebSocket，计划内）
      this.pipelineTranslating = true
      this.translateStatusText = '请求服务端翻译…'
      this.$set(this.pipelineProgress, pageIndex, { stage: 'server', detail: '请求服务端翻译…', percent: 0 })
      this.$set(this.translatedCanvases, pageIndex, null)

      const body = {
        imageUrl,
        sourceLang: 'ja',
        targetLang: 'zh-CN',
        translator: 'llm',
        processMode: 'translate',
      }

      const abortController = new AbortController()
      this.pipelineAbort = abortController

      const abortError = () => {
        const err = new Error('已取消')
        err.error = 'ABORT'
        return err
      }
      const parseErrorBody = async response => {
        let code = null
        let message = ''
        let detail = null
        try {
          const data = await response.json()
          code = data && data.error
          message = (data && data.message) || ''
          detail = (data && data.detail) || null
        } catch (e) {
          // 非 JSON 错误体，仅用 HTTP 状态兜底
        }
        return { code, message, detail }
      }
      const failedJobToast = (errorCode, message) => {
        if (SERVER_ERROR_TOAST[errorCode]) return SERVER_ERROR_TOAST[errorCode]
        return message ? `翻译失败: ${message}` : SERVER_ERROR_TOAST.JOB_FAILED
      }
      const errorToast = (code, message, httpStatus) => {
        if (code === 'UNAUTHORIZED' || httpStatus === 401) return '服务端鉴权失败'
        const mapped = SERVER_ERROR_TOAST[code]
        if (mapped) return mapped
        return message ? `翻译失败: ${message}` : `翻译失败 (HTTP ${httpStatus})`
      }

      const authHeader = serverToken ? { Authorization: `Bearer ${serverToken}` } : {}

      try {
        // ---- 1. 提交异步 job → 202 {id, status:'queued'} ----
        let res
        try {
          res = await fetch(`${serverUrl}/translate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...authHeader,
            },
            body: JSON.stringify(body),
            signal: abortController.signal,
          })
        } catch (err) {
          if (err.name === 'AbortError') throw abortError()
          // fetch 抛错（网络不可达/服务端未启动），不泄露 token/堆栈
          const netErr = new Error('无法连接翻译服务')
          netErr.error = 'NETWORK'
          throw netErr
        }

        if (!res.ok) {
          // 结构化错误 {error, message}（服务端契约见 shinobu-server app.js sendError）
          const { code, message } = await parseErrorBody(res)
          this.$toast(errorToast(code, message, res.status))
          return
        }

        // 202 应返回 JSON {id}；旧同步契约（直接 PNG）已下线
        let jobId = null
        try {
          const data = await res.json()
          jobId = data && data.id
        } catch (e) {
          // 202 但响应体非 JSON → 服务端异常，走兜底
        }
        if (!jobId) {
          this.$toast('翻译请求失败，请重试')
          return
        }

        this.translateStatusText = '翻译中…'

        // ---- 2. 轮询 job 状态（3s 间隔，10 分钟超时兜底） ----
        const POLL_INTERVAL = 3000
        const POLL_TIMEOUT = 10 * 60 * 1000
        const POLL_MAX_FAILURES = 3
        const RESULT_RETRY_LIMIT = 3
        const pollStartAt = Date.now()
        let pollFailures = 0

        let jobDone = false
        while (!jobDone) {
          // 取消：后端 job 继续跑，30 分钟自清，可接受
          if (abortController.signal.aborted) throw abortError()
          if (Date.now() - pollStartAt > POLL_TIMEOUT) {
            this.$toast('翻译超时，请重试')
            return
          }

          let jobRes
          try {
            jobRes = await fetch(`${serverUrl}/translate/jobs/${jobId}`, {
              headers: authHeader,
              signal: abortController.signal,
            })
          } catch (err) {
            if (err.name === 'AbortError') throw abortError()
            // 网络抖动：连续失败达阈值才判定 NETWORK，避免一次断连就中断
            pollFailures += 1
            if (pollFailures >= POLL_MAX_FAILURES) {
              this.$toast('无法连接翻译服务')
              return
            }
            await sleep(POLL_INTERVAL)
            continue
          }

          if (jobRes.status === 404) {
            // job 过期（30min TTL）或服务端重启后内存 job 丢失
            this.$toast('翻译任务已过期，请重试')
            return
          }
          if (!jobRes.ok) {
            // 非 404 错误（401/500 等）：有限重试后按错误映射提示
            pollFailures += 1
            if (pollFailures >= POLL_MAX_FAILURES) {
              const { code, message } = await parseErrorBody(jobRes)
              this.$toast(errorToast(code, message, jobRes.status))
              return
            }
            await sleep(POLL_INTERVAL)
            continue
          }

          pollFailures = 0

          let data
          try {
            data = await jobRes.json()
          } catch (e) {
            // 轮询响应非 JSON：视为瞬时异常，有限重试
            pollFailures += 1
            if (pollFailures >= POLL_MAX_FAILURES) {
              this.$toast('翻译失败，请重试')
              return
            }
            await sleep(POLL_INTERVAL)
            continue
          }

          const status = data && data.status
          if (status === 'queued' || status === 'running') {
            // running 带 stage/percent —— 与 TranslateProgress 的
            // shinobuStageDefs 阶段名 1:1 对应，直接透传自动渲染
            if (status === 'running' && data.stage) {
              this.$set(this.pipelineProgress, pageIndex, {
                stage: data.stage,
                detail: '',
                percent: typeof data.percent === 'number' ? data.percent : 0,
              })
            }
            await sleep(POLL_INTERVAL)
            continue
          }
          if (status === 'failed') {
            // 结构化失败：job.error 映射中文 toast（JOB_FAILED 兜底）
            this.$toast(failedJobToast(data && data.error, data && data.message))
            return
          }
          if (status === 'done') {
            jobDone = true
          } else {
            // 未知状态：继续轮询
            await sleep(POLL_INTERVAL)
          }
        }

        if (abortController.signal.aborted) throw abortError()

        // ---- 3. 取结果 PNG（done 后与 result 之间可能存在竞态 → 短重试） ----
        let blob = null
        let noText = false
        for (let i = 0; i < RESULT_RETRY_LIMIT && !blob; i++) {
          if (abortController.signal.aborted) throw abortError()
          let resultRes
          try {
            resultRes = await fetch(`${serverUrl}/translate/jobs/${jobId}/result`, {
              headers: authHeader,
              signal: abortController.signal,
            })
          } catch (err) {
            if (err.name === 'AbortError') throw abortError()
            // 取结果时断网：短重试，仍失败则映射网络错误
            if (i < RESULT_RETRY_LIMIT - 1) {
              await sleep(500)
              continue
            }
            const netErr = new Error('无法连接翻译服务')
            netErr.error = 'NETWORK'
            throw netErr
          }

          if (resultRes.status === 404) {
            this.$toast('翻译任务已过期，请重试')
            return
          }
          if (resultRes.status === 409) {
            // JOB_FAILED 已失败；JOB_NOT_READY 为 done 竞态 → 短重试
            const { code, message, detail } = await parseErrorBody(resultRes)
            if (code === 'JOB_FAILED') {
              // detail 携带原始错误码（如 IMAGE_FETCH_FAILED）
              this.$toast(failedJobToast(detail || code, message))
              return
            }
            if (code === 'JOB_NOT_FOUND') {
              this.$toast('翻译任务已过期，请重试')
              return
            }
            // JOB_NOT_READY 竞态：短暂重试后放弃
            if (i < RESULT_RETRY_LIMIT - 1) {
              await sleep(500)
              continue
            }
            this.$toast('翻译失败，请重试')
            return
          }
          if (!resultRes.ok) {
            const { code, message } = await parseErrorBody(resultRes)
            this.$toast(errorToast(code, message, resultRes.status))
            return
          }

          if (resultRes.headers.get('X-Translate-NoText') === '1') {
            // 服务端未检测到文字（原图透传）→ 显示原图，不开启译图 overlay
            noText = true
          }
          try {
            blob = await resultRes.blob()
          } catch (err) {
            // 响应体读取中途断网 → 同 fetch 失败，映射为网络错误而非原始 TypeError
            if (i < RESULT_RETRY_LIMIT - 1) {
              await sleep(500)
              continue
            }
            const netErr = new Error('无法连接翻译服务')
            netErr.error = 'NETWORK'
            throw netErr
          }
        }

        if (!blob) {
          this.$toast('翻译失败，请重试')
          return
        }
        if (noText) {
          this.$toast('未检测到文字')
          return
        }

        const img = await loadBlobAsImage(blob)
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        canvas.getContext('2d').drawImage(img, 0, 0)
        URL.revokeObjectURL(img.src)

        if (!this.isActive) return

        this.$set(this.translatedCanvases, pageIndex, canvas)
        try {
          await setCache(cacheKey, blob)
        } catch (e) {
          console.warn('[server] 翻译结果缓存失败:', e)
        }
        this.showTranslated = true
        this.$toast('翻译完成')
      } catch (err) {
        if (err && err.error === 'ABORT') {
          this.$toast('已取消')
        } else {
          console.log('[server] translate error:', err)
          const msg = (err && err.error === 'NETWORK') ? '无法连接翻译服务' : (err && err.message ? `翻译失败: ${err.message}` : '翻译失败')
          this.$toast(msg)
        }
        // 失败/取消路径不残留译图状态
        this.showTranslated = false
        this.$set(this.translatedCanvases, pageIndex, null)
      } finally {
        this.pipelineTranslating = false
        this.translateStatusText = ''
        this.pipelineAbort = null
        this.$set(this.pipelineProgress, pageIndex, { stage: '', detail: '', percent: 0 })
      }
    },
    async translateByVLApi(pageIndex) {
      // EXISTING VL-API path — keep unchanged
      this.showPicTranslatePanel = true
      this.currentTransPage = pageIndex
      const cached = await getCachedTranslation(this.artwork.id, pageIndex, resolveVlModel(store.state.mangaTrans.vlModel))
      if (cached) {
        this.$set(this.picTranslations, pageIndex, cached)
        return
      }

      this.$set(this.picTranslations, pageIndex, '')
      this.$set(this.picTranslating, pageIndex, true)

      const imageUrl = this.artwork.images[pageIndex]?.l?.replace(/\/c\/\d+x\d+\w*\//g, '/') || this.artwork.images[pageIndex]?.o
      try {
        await translateMangaPage(imageUrl, this.artwork.id, pageIndex, ({ content, done, error }) => {
          if (content) {
            const prev = this.picTranslations[pageIndex] || ''
            this.$set(this.picTranslations, pageIndex, prev + content)
          }
          if (done) {
            this.$set(this.picTranslating, pageIndex, false)
            if (error) {
              this.$toast('翻译出错: ' + error)
            } else if (!this.picTranslations[pageIndex]) {
              this.$toast('翻译失败，请重试')
            }
          }
        }, resolveVlModel(store.state.mangaTrans.vlModel))
      } catch (err) {
        console.log('translate err: ', err)
        this.$toast('翻译出错: ' + err.message)
        this.$set(this.picTranslating, pageIndex, false)
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

// 翻译设置弹窗：随 get-container="body" 挂到 body，需全局样式（scoped 不生效）
// 参照 base.styl .setting-page .van-popup--bottom 的 10rem 居中模式
.van-popup--bottom.translate-settings-popup
  left 50%
  width 10rem
  height 80%
  margin-left: -5rem
  overflow hidden
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

.i-loading
  position: absolute;
  top: 4rem;
  width: 100%;
  text-align: center;

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
      &:has(.season-effect)
        width: fit-content !important
        margin-left auto
        margin-right auto
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
@media screen and (max-width: 1120px)
  .ia-cont
    display block !important

  .ia-left
    display block !important
    align-items unset !important
    width 100% !important
    max-height max-content !important
    margin 0 auto !important
    padding 0 !important

    ::v-deep .image
      max-width: 100% !important
      max-height: 90vh !important
      border-radius 0 !important
      box-shadow none !important

  .ia-right
    position relative !important
    max-width 100% !important
    padding-right 0 !important
    .artwork-meta
      margin-top 10px !important

  &.landscape-1-art
    display: flex !important
    flex-direction: column
    .ia-left
      display flex !important
      justify-content center !important
      align-items center !important
      min-height 55vh
    .ia-right
      position: relative
      width: 100% !important
      max-width: 100% !important

@media screen and (min-width: 1121px)
  .ia-cont
    &:not(:has(.shrink)) .ia-right
      max-height 100vh
      overflow-y auto
      &::-webkit-scrollbar
        display none

.ia-cont .ia-left
  ::v-deep .image-view.horizon-scroll
    display flex
    align-items center
    gap 0.1rem
    height 96vh
    max-height 96vh
    padding-left 2rem
    overflow-x auto
    .image-box
      width max-content !important
      min-width max-content !important
      margin-bottom 0.1rem !important
      &:has(.image[lazy="loading"])
        width 9rem !important
        min-width 9rem !important
    .image
      max-width unset !important
      max-height 94vh !important
      margin 0 !important
    @media screen and (max-width: 600px)
      height 80vh
      max-height 80vh
      padding-left 0
      .image-box
        aspect-ratio auto !important
      .image
        max-width 95vw !important
        max-height 79vh !important

.artwork
  ::v-deep .top-bar-wrap
    width 2rem
    background none
  &.isSafari, &.hidePIDMask
    .image-view.loaded
      min-height auto
    .ia-right ::v-deep .artwork-meta
      background transparent
      border-radius 20px
      .caption
        margin-top 0.2rem
        margin-bottom 0.3rem
      .tag-list
        gap 0.13333rem
        .x_tag
          margin-right 0
        .tag
          background: linear-gradient(rgba(255, 255, 255, 0.75)), var(--accent-color, #f7f8fa);
          margin-right 0
          padding-left: 0.15rem;
          padding-right: 0.15rem;
          border-radius: 6PX;
          &:hover
            background linear-gradient(rgba(255, 255, 255, 0.5)), var(--accent-color, #f7f8fa) !important
            &.translated
              color var(--accent-color, #888) !important
          &.translated
            color #888
            background: linear-gradient(rgba(255, 255, 255, 0.89)), var(--accent-color, #f7f8fa);

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
