<template>
  <div class="artwork novel">
    <TopBar />
    <div class="more_btn" @click="toggleNovelConfigShow">
      <Icon class="icon" name="novel_setting" />
    </div>
    <div class="ia-cont" :class="{ isCollapseMeta }">
      <div class="ia-left">
        <van-loading v-if="loading" size="50px" style="margin-top: 3rem;" />
        <template v-else>
          <NovelView ref="novelView" :artwork="artwork" :text-obj="novelText" />
          <div class="collapse-btn" @click="isCollapseMeta=!isCollapseMeta">
            <Icon class="icon" name="double_arrow_down" />
          </div>
        </template>
      </div>
      <div class="ia-right">
        <van-skeleton class="skeleton" title avatar :row="5" avatar-size="42px" :loading="loading">
          <NovelMeta is-novel :artwork="artwork" />
        </van-skeleton>
        <div v-if="!loading" class="series-btns">
          <van-button v-if="novelText.prev" color="#7232dd" size="small" plain block @click="toNovel(novelText.prev.id)">
            {{ $t('novel.series.prev') }} {{ novelText.prev.title }}
          </van-button>
          <van-button v-if="novelText.next" color="#7232dd" size="small" plain block @click="toNovel(novelText.next.id)">
            {{ $t('novel.series.next') }} {{ novelText.next.title }}
          </van-button>
          <van-button type="info" size="small" plain block @click="showShare = true">
            {{ $t('artwork.share.share') }}
          </van-button>
          <van-button
            v-if="showBookmarkBtn"
            v-longpress="showBookmarkDialog"
            :loading="favLoading"
            type="info"
            size="small"
            plain
            block
            @click="toggleBookmark"
          >
            {{ artwork.is_bookmarked ? $t('user.faved'): $t('user.fav') }}
          </van-button>
          <van-button v-if="isNovelDlFormatSet" type="info" size="small" plain block @click="downloadNovel()">
            {{ $t('common.download') }}
          </van-button>
          <van-popover
            v-else
            v-model="showDlPopover"
            :actions="novelDlOptions"
            trigger="click"
            placement="top"
            style="width: 100%;"
            @select="downloadNovel"
          >
            <template #reference>
              <van-button type="info" size="small" plain block style="margin-bottom: 10px;">{{ $t('common.download') }}</van-button>
            </template>
          </van-popover>
          <van-button type="info" size="small" plain block @click="showComments = true">
            {{ $t('user.view_comments') }}
          </van-button>
          <template v-if="showPntBtn">
            <van-button v-if="isTranslated" type="info" size="small" plain block @click="showOriginText">显示原文</van-button>
            <van-button
              v-else-if="isNovelDefTranslateSet"
              type="info"
              size="small"
              plain
              block
              :loading="translateLoading"
              @click="doDefPnt"
            >
              翻译
            </van-button>
            <van-popover
              v-else
              v-model="showPntPopover"
              :actions="translateLoading ? [] : pntActions"
              trigger="click"
              placement="top"
              style="width: 100%;"
              @select="onPntSelect"
            >
              <template #reference>
                <van-button type="info" size="small" plain block :loading="translateLoading" style="margin-bottom: 10px;">翻译</van-button>
              </template>
            </van-popover>
          </template>
          <van-button type="info" size="small" plain block @click="toggleNovelConfigShow">{{ $t('novel.settings.title') }}</van-button>
        </div>
        <keep-alive>
          <AuthorNovelCard v-if="artwork.author" :id="artwork.author.id" :key="artwork.id" />
        </keep-alive>
      </div>
    </div>
    <van-divider style="margin: 0.7rem 0;" />
    <keep-alive>
      <RelatedNovel :key="artwork.id" :artwork="artwork" />
    </keep-alive>
    <van-share-sheet v-model="showShare" :title="$t('artwork.share.title')" :cancel-text="$t('common.cancel')" :options="shareOptions" @select="onShareSel" />
    <NovelTextConfig ref="novelConfigRef" />
    <van-popup
      v-model="showComments"
      class="comments-popup"
      position="right"
      get-container="body"
      closeable
    >
      <template v-if="showComments">
        <p class="comments-title">{{ $t('hGqGftQ7v772prEac1hbJ') }}</p>
        <CommentsArea :id="artwork.id" is-novel :count="0" :limit="10" />
      </template>
    </van-popup>
  </div>
</template>

<script>
import _ from '@/lib/lodash'
import { mapGetters } from 'vuex'
import { ImagePreview } from 'vant'
import api, { getBookmarkRestrictTags, localApi } from '@/api'
import store from '@/store'
import { getArtworkFileName } from '@/store/actions/filename'
import { PIXIV_NEXT_URL, SILICON_CLOUD_API_KEY } from '@/consts'
import { aiModelMap, getNoTranslateWords, isNativeTranslatorSupported, loadKISSTranslator, nativeTranslate, siliconCloudTranslate } from '@/utils/translate'
import { copyText, downloadFile } from '@/utils'
import { convertHtmlToDoc, convertHtmlToEpub, convertHtmlToPdf, convertNovelToMarkdown, printNovel } from '@/utils/novel'
import { getCache, setCache, toggleBookmarkCache } from '@/utils/storage/siteCache'
import { i18n } from '@/i18n'
import TopBar from '@/components/TopBar'
import NovelView from './components/NovelView.vue'
import NovelTextConfig from './components/NovelTextConfig.vue'
import Meta from './components/Meta'
import AuthorNovelCard from './components/AuthorNovelCard.vue'
import RelatedNovel from './components/RelatedNovel.vue'
import CommentsArea from './components/Comment/CommentsArea.vue'
import IconLink from '@/assets/images/share-sheet-link.png'
import IconQQ from '@/assets/images/share-sheet-qq.png'
import IconQrcode from '@/assets/images/share-sheet-qrcode.png'
import IconQzone from '@/assets/images/share-sheet-qzone.png'
import IconWeb from '@/assets/images/share-sheet-web.png'
// import IconWechat from '@/assets/images/share-sheet-wechat.png'
import IconWeibo from '@/assets/images/share-sheet-weibo.png'
import IconTwitter from '@/assets/images/share-sheet-twi.png'
import IconFacebook from '@/assets/images/share-sheet-facebook.png'

let novelTextBak = ''
const {
  isDefBookmarkPrivate,
  isDefBookmarkAddTags,
  isLongpressPrivateBookmark,
  isDefFollowPrivate,
  isAutoFollowAfterBookmark,
  isAutoDownLoadAfterBookmark,
  isAutoBookmarkAfterDownload,
} = store.state.appSetting

export default {
  name: 'NovelDetail',
  components: {
    TopBar,
    NovelMeta: Meta,
    AuthorNovelCard,
    NovelView,
    RelatedNovel,
    CommentsArea,
    NovelTextConfig,
  },
  data() {
    return {
      loading: false,
      artwork: {},
      novelText: {},
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
      isCollapseMeta: false,
      showComments: false,
      showPntPopover: false,
      pntActions: [],
      showDlPopover: false,
      novelDlOptions: [
        { text: 'TXT', val: 'txt' },
        { text: 'HTML', val: 'html' },
        { text: 'MD', val: 'md' },
        { text: 'DOC', val: 'doc' },
        { text: 'PDF', val: 'pdf' },
        !store.state.isMobile && ({ text: `PDF(${i18n.t('Uf25j8CV8zHmOiUk7dn-M')})`, val: 'print' }),
        { text: 'EPUB', val: 'epub' },
      ].filter(Boolean),
      showBookmarkBtn: window.APP_CONFIG.useLocalAppApi,
      favLoading: false,
      translateLoading: false,
      isTranslated: false,
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
    showPntBtn() {
      if (store.state.appSetting.isAutoLoadKissT) return false
      return (
        i18n.locale.includes('zh') &&
        !/中文|中国语|Chinese|中國語|中国語/.test(JSON.stringify(this.artwork.tags))
      )
    },
    isNovelDefTranslateSet() {
      return Boolean(store.state.appSetting.novelDefTranslate)
    },
    isNovelDlFormatSet() {
      return Boolean(store.state.appSetting.novelDefDlFormat)
    },
  },
  watch: {
    $route() {
      if (
        this.$route.name === 'NovelDetail' &&
        this.$route.params.id != this.artwork.id
      ) {
        this.init()
      }
    },
    showComments(val) {
      document.documentElement.style.overflowY = val ? 'hidden' : ''
    },
  },
  mounted() {
    this.pntActions = [
      !document.querySelector('#kiss-translator') && ({ text: '加载 KISS Translator', className: 'imt', key: 'kiss_t' }),
      isNativeTranslatorSupported && ({ text: 'Chrome 内置翻译', className: 'sc', key: 'native' }),
      { text: 'AI 翻译(glm-4-9b)', className: 'sc', key: 'sc_glm' },
      { text: 'AI 翻译(Qwen2.5-7B)', className: 'sc', key: 'sc_qwen2_5' },
      { text: 'AI 翻译(Hunyuan-MT-7B)', className: 'sc', key: 'sc_hy_mt' },
      { text: '微软翻译', className: 'ms', key: 'ms' },
      { text: '谷歌翻译', className: 'gg', key: 'gg' },
      { text: '有道翻译', className: 'yd', key: 'yd' },
    ].filter(Boolean)
    this.init()
  },
  methods: {
    init() {
      this.loading = true
      const id = +this.$route.params.id
      this.artwork = {}
      this.novelText = {}
      Promise.all([
        this.getArtwork(id),
        this.getNovelText(id),
      ]).finally(() => {
        this.loading = false
      })
    },
    async getNovelText(id) {
      const res = await api.getNovelText(id)
      if (res.status === 0) {
        this.novelText = res.data
        novelTextBak = res.data.text
      } else {
        this.$toast({
          message: res.msg,
          icon: require('@/icons/error.svg'),
          duration: 3000,
        })
      }
    },
    async getArtwork(id) {
      const res = await api.getNovelDetail(id)
      if (res.status === 0) {
        this.artwork = res.data

        if (this.isCensored(this.artwork)) {
          this.$toast({
            message: this.$t('common.content.hide'),
            icon: require('@/icons/ban-view.svg'),
          })
        }

        let historyList = await getCache('novels.history', [])
        if (!Array.isArray(historyList)) historyList = []
        // if (historyList.length > 100) historyList = historyList.slice(0, 100)
        historyList = _.uniqBy([res.data, ...historyList], 'id')
        setCache('novels.history', historyList)
      } else {
        this.$toast({
          message: res.msg,
          icon: require('@/icons/error.svg'),
          duration: 3000,
        })
      }
    },
    toggleBookmark() {
      this.favLoading = true
      if (this.artwork.is_bookmarked) {
        localApi.novelBookmarkDelete(this.artwork.id).then(isOk => {
          this.favLoading = false
          if (isOk) {
            this.artwork.is_bookmarked = false
            toggleBookmarkCache(this.artwork, false, true)
          } else {
            this.$toast(this.$t('artwork.unfav_fail'))
          }
        })
      } else {
        localApi.novelBookmarkAdd(
          this.artwork.id,
          isDefBookmarkPrivate ? 'private' : void 0,
          isDefBookmarkAddTags ? this.artwork.tags.map(e => e.name) : void 0
        ).then(isOk => {
          this.favLoading = false
          if (isOk) {
            this.artwork.is_bookmarked = true
            toggleBookmarkCache(this.artwork, true, true)
            this.autoAddFollow()
            if (isAutoDownLoadAfterBookmark) this.downloadNovel()
          } else {
            this.$toast(this.$t('artwork.fav_fail'))
          }
        })
      }
    },
    async autoAddFollow() {
      if (!isAutoFollowAfterBookmark || this.artwork.author.is_followed) return
      const isFollowedCacheKey = `member_is_followed_${this.artwork.author.id}`
      if (await getCache(isFollowedCacheKey)) return
      this.favLoading = true
      const isOk = await localApi.userFollowAdd(this.artwork.author.id, isDefFollowPrivate ? 'private' : 'public')
      this.favLoading = false
      if (!isOk) {
        this.$toast(this.$t('user.follow_fail'))
        return
      }
      this.artwork.author.is_followed = true
      await setCache(isFollowedCacheKey, true)
      const itemKey = `memberInfo_${this.artwork.author.id}`
      const user = await getCache(itemKey)
      if (user) {
        user.is_followed = true
        await setCache(itemKey, user, 60 * 60 * 6)
      }
    },
    async showBookmarkDialog(/** @type {Event} */ ev) {
      ev.preventDefault()
      if (this.artwork.is_bookmarked) return
      const action = async (restrict, tags) => {
        this.favLoading = true
        const isOk = await localApi.novelBookmarkAdd(this.artwork.id, restrict, tags)
        this.favLoading = false
        if (isOk) {
          this.artwork.is_bookmarked = true
          toggleBookmarkCache(this.artwork, true, true)
          this.autoAddFollow()
          if (isAutoDownLoadAfterBookmark) this.downloadNovel()
          if (restrict == 'private') this.$toast(this.$t('kL2NNZsLQT9TUgeEmMQk3'))
        } else {
          this.$toast(this.$t('artwork.fav_fail'))
        }
      }
      if (isLongpressPrivateBookmark) {
        await action('private', isDefBookmarkAddTags ? this.artwork.tags.map(e => e.name) : void 0)
        return
      }
      const { restrict, tags } = await getBookmarkRestrictTags(this.artwork.tags)
      console.log('restrict: ', restrict)
      console.log('tags: ', tags)
      await action(restrict, tags)
    },
    onShareSel(_, index) {
      const actions = [
        async () => {
          const shareData = {
            title: 'Pixiv Viewer',
            text: `${this.$t('artwork.share.share')} ${this.$t('artwork.share.of_art', [this.artwork.author.name])} ${this.artwork.title} - ID: ${this.artwork.id}`,
            url: `${location.href}`,
          }
          try {
            await navigator.share(shareData)
          } catch (error) {
            console.log('error: ', error)
          }
        },
        () => {
          copyText(
            location.href,
            () => this.$toast(this.$t('tips.copylink.success')),
            err => this.$toast(this.$t('tips.copylink.error') + err)
          )
        },
        () => {
          ImagePreview({
            closeable: true,
            images: [`https://api.moedog.org/qr/?url=${encodeURIComponent(location.href)}`],
          })
        },
        () => {
          this.openUrl(`https://service.weibo.com/share/share.php?language=zh_cn&searchPic=true&url=${encodeURIComponent(location.href)}&title=${encodeURIComponent(`${this.$t('artwork.share.share')} ${this.$t('artwork.share.of_art', [this.artwork.author.name])} ${this.artwork.title} - PID: ${this.artwork.id}`)}&summary=PID%3A${this.artwork.id}&pic=${this.artwork.images[0].l}`)
        },
        () => {
          this.openUrl(`https://sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzshare_onekey?title=${this.artwork.title}&url=${encodeURIComponent(location.href)}&pics=${this.artwork.images[0].l}&summary=${encodeURIComponent(this.artwork.author.name + ' - PID: ' + this.artwork.id)}`)
        },
        () => {
          this.openUrl(`https://connect.qq.com/widget/shareqq/index.html?url=${encodeURIComponent(location.href)}&title=${this.artwork.title}&source=${encodeURIComponent(location.href)}&desc=${encodeURIComponent(`${this.$t('artwork.share.share')} ${this.$t('artwork.share.of_art', [this.artwork.author.name])} ${this.artwork.title} - PID: ${this.artwork.id}`)}&summary=${encodeURIComponent(`${this.$t('artwork.share.share')} ${this.$t('artwork.share.of_art', [this.artwork.author.name])} ${this.artwork.title} - PID: ${this.artwork.id}`)}`)
        },
        // () => {
        //   this.openUrl(`https://wechat-share.pwp.space/?url=${encodeURIComponent(location.href)}&title=${this.artwork.title}`)
        // },
        () => {
          this.openUrl(`https://twitter.com/intent/tweet?url=${encodeURIComponent(`https://www.pixiv.net/novel/show.php?id=${this.artwork.id}`)}&text=${this.artwork.title}&hashtags=pixiv`)
        },
        () => {
          this.openUrl(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`https://www.pixiv.net/novel/show.php?id=${this.artwork.id}`)}`)
        },
      ]
      actions[index]?.()
    },
    openUrl(url) {
      window.open(url, '_blank', 'noopener noreferrer')
    },
    toNovel(id) {
      this.$router.push(`/novel/${id}`)
    },
    toggleNovelConfigShow() {
      this.$refs.novelConfigRef?.toggle()
    },
    async downloadNovel(format) {
      const ext = format?.val || store.state.appSetting.novelDefDlFormat
      window.umami?.track('download_novel', { ext })
      const fileName = `${getArtworkFileName(this.artwork)}`
      const getOuterHTML = () => {
        const el = document.querySelector('.novel-view').cloneNode(true)
        el.querySelector('svg').remove()
        el.style.padding = '1rem'
        const coverBox = el.querySelector('.image-box')
        coverBox.setAttribute('style', 'padding: 1em 0;text-align:center')
        coverBox.insertAdjacentHTML('afterbegin', `<h1 style="font-size:1.2em;font-weight:bold;text-align:center">${this.artwork.title}</h1><p style="color:gray;text-align:center">${this.artwork.author.name}</p>`)
        coverBox.insertAdjacentHTML('beforeend', '<hr style="margin: 1em 0;color:gray"><br>')
        return el.outerHTML
      }
      const actions = {
        txt: async () => new Blob([novelTextBak], { type: 'text/plain;charset=utf-8' }),
        html: async () => new Blob(['<meta charset="utf-8">' + getOuterHTML()], { type: 'text/html;charset=utf-8' }),
        epub: async () => {
          const el = document.querySelector('.novel_text').cloneNode(true)
          const style = store.state.appSetting.novelDlRmStyle ? '' : el.getAttribute('style')
          const res = await convertHtmlToEpub(el.innerHTML, style, this.artwork)
          return res
        },
        print: async () => {
          printNovel(getOuterHTML(), fileName)
        },
        pdf: async () => {
          const el = document.querySelector('.novel_text').cloneNode(true)
          el.innerHTML = el.innerHTML.split('<br>').map(e => `<p${e ? '' : ' style="padding: 1em 0"'}>${e}</p>`).join('')
          el.querySelectorAll('img').forEach(img => {
            img.setAttribute('crossorigin', 'anonymous')
          })
          el.insertAdjacentHTML('afterbegin', `<h1 style="font-size:1.2em;font-weight:bold;text-align:center">${this.artwork.title}</h1><p style="color:gray;text-align:center">${this.artwork.author.name}</p><hr style="margin: 1em 0;color:gray"><br>`)
          const res = await convertHtmlToPdf(el, fileName)
          return res
        },
        doc: async () => convertHtmlToDoc(getOuterHTML()),
        md: async () => convertNovelToMarkdown(this.novelText, this.artwork),
      }
      const blob = await actions[ext]()
      if (blob) await downloadFile(blob, `${fileName}.${ext}`, { subDir: 'novel' })
      if (window.APP_CONFIG.useLocalAppApi && !this.artwork.is_bookmarked && isAutoBookmarkAfterDownload) {
        this.favLoading = true
        localApi.novelBookmarkAdd(
          this.artwork.id,
          isDefBookmarkPrivate ? 'private' : void 0,
          isDefBookmarkAddTags ? this.artwork.tags.map(e => e.name) : void 0
        )
          .then(isOk => {
            this.favLoading = false
            if (isOk) {
              this.artwork.is_bookmarked = true
              toggleBookmarkCache(this.artwork, true, true)
            } else {
              this.$toast(this.$t('artwork.fav_fail'))
            }
          })
      }
    },
    showOriginText() {
      this.novelText.text = novelTextBak
      this.isTranslated = false
    },
    doDefPnt() {
      const key = store.state.appSetting.novelDefTranslate
      this.onPntSelect({ key, text: key })
    },
    async onPntSelect(action) {
      if (this.translateLoading) return
      window.umami?.track('translate_novel', { with: action.text })
      store.commit('setIsNovelViewShrink', false)
      const fns = {
        ...Object.keys(aiModelMap).reduce((acc, cur) => {
          acc[`sc_${cur}`] = async () => this.fanyi('sc', await getNoTranslateWords(this.artwork.tags), cur)
          return acc
        }, {}),
        ms: async () => this.fanyi('ms', await getNoTranslateWords(this.artwork.tags)),
        gg: () => this.fanyi('gg'),
        yd: () => this.fanyi('yd'),
        kiss_t: () => loadKISSTranslator(),
        native: () => this.aiTranslate('', '', true),
      }
      const fn = fns[action.key]
      if (fn) {
        await fn()
      }
    },
    async fanyi(srv, nots = '', aiModel = 'glm') {
      try {
        if (SILICON_CLOUD_API_KEY && srv == 'sc') {
          this.aiTranslate(nots, aiModel)
          return
        }

        this.translateLoading = true
        const loading = this.$toast.loading({
          duration: 0,
          forbidClick: true,
          message: '加载时间较长，请耐心等待',
        })
        const cacheKey = `novel.translate.${this.artwork.id}.${srv}.${nots}.${aiModel}`
        let res = await getCache(cacheKey)
        if (!res) {
          let url = `${PIXIV_NEXT_URL}/api/pixiv-novel-translate/${this.artwork.id}.html?srv=${srv}`
          if (nots) url += `&nots=${nots}`
          if (srv == 'sc' && aiModel) url += `&aimd=${aiModel}`
          res = await fetch(url).then(r => r.text())
          // if (!res.includes('Translate failed')) setCache(cacheKey, res)
          if (!res.startsWith('{')) setCache(cacheKey, res)
        }
        this.novelText.text = res
        loading.clear()
        this.translateLoading = false
        this.isTranslated = true
      } catch (err) {
        console.log('fanyi err: ', err)
      }
    },
    async aiTranslate(nots = '', aiModel = 'glm', isNative = false) {
      const cacheKey = `novel.translate.${this.artwork.id}.sc.${aiModel}.${nots}.${isNative}`
      const cacheText = await getCache(cacheKey)
      if (cacheText) {
        this.novelText.text = cacheText
        return
      }
      this.translateLoading = true
      const notsArr = nots ? nots.split(',') : []
      const novelElement = document.querySelector('.novel_text')
      let resText = ''
      this.novelText.text = this.$t('tips.loading')
      const callback = chunk => {
        if (chunk.done) {
          novelElement.innerHTML = resText
          this.novelText.text = resText
          setCache(cacheKey, resText)
          this.$toast('翻译完毕')
          this.translateLoading = false
          this.isTranslated = true
          return
        }

        if (chunk.reasoning) {
          resText = `<span style="color:gray;font-size:0.8em">思考中：${chunk.content}</span>`
        } else {
          resText += chunk.content
        }

        notsArr.forEach((e, i) => {
          resText = resText.replaceAll(`[名字${i}]`, e)
          resText = resText.replaceAll(`名字${i}`, e)
        })
        resText = resText.replace(/\n/g, '<br>')
        requestAnimationFrame(() => {
          novelElement.innerHTML = resText
        })
      }
      if (isNative) {
        nativeTranslate(novelTextBak, callback)
      } else {
        siliconCloudTranslate(novelTextBak, notsArr, aiModel, callback)
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
.comments-title
  padding 40px 0 0 40px
  font-size 0.45rem
  font-weight bold
.artwork
  .skeleton
    margin: 30px 0;
  .more_btn
    position: fixed;
    top: 0.9rem;
    right 0.5rem;
    z-index: 99;
    font-size 0.675rem
    cursor pointer
    .svg-icon
      color: #fafafa;
      filter: drop-shadow(0.02667rem 0.05333rem 0.05333rem rgba(0,0,0,0.8));

  .series-btns
    padding 0 40px
    ::v-deep
      .van-button
        &:not(:last-child)
          margin-bottom 10px
        .van-button__text
          overflow: hidden
          text-overflow: ellipsis
          white-space: nowrap

  ::v-deep .van-share-sheet
    width 10rem !important
    left 50% !important
    margin-left -5rem !important
  ::v-deep .van-share-sheet__option:first-child img
    background: #f2f3f5;
    border-radius: 50%;
  ::v-deep .van-share-sheet__options::-webkit-scrollbar
    height 0.12rem

.ia-cont
  display flex
  align-items flex-start
  min-height 100vh

  .ia-left
    position relative
    display flex
    justify-content center
    align-items center
    width 72%
    min-width 72%
    margin-top 20px
    padding 0 20px

    .collapse-btn
      position absolute
      z-index 99
      right 0
      top 200px
      display flex
      justify-content center
      align-items center
      width 60px
      height 60px
      background #f5f5f5
      border-top-left-radius 10px
      border-bottom-left-radius 10px
      cursor pointer
      .icon
        font-size 50px
        transform rotate(-90deg)

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

  .ia-right
    max-width 28%
    margin-bottom 60px
    padding-right 40px
    box-sizing border-box
    overflow hidden
    transform translateX(0)
    opacity 1
    transition 0.2s
    ::v-deep
      .artwork-meta
        padding 20px 30px 40px
        background #f5f5f5
        border-radius 20px
        .tag.translated
          color #808080
      .shrink::after
        background: linear-gradient(to top, #f5f5f5, rgba(255,255,255,0));

.artwork
  ::v-deep .top-bar-wrap
    width 30vw
    background none

  .isCollapseMeta
    justify-content center
    .ia-left
      width 100%
      .collapse-btn
        position fixed
        top: 2.7rem;
        right: 0.4rem;
        border-radius 10px
        .icon
          transform: rotate(90deg);
    .ia-right
      transform translateX(100%)
      opacity 0
      width 0
      padding-right 0
      margin-bottom 0

@media screen and (min-width: 1201px)
  .ia-cont
    &:not(:has(.shrink)) .ia-right
      max-height 100vh
      overflow-y auto
      &::-webkit-scrollbar
        display none

@media screen and (max-width: 1200px)
  .ia-cont
    display block !important

  .ia-left
    width 100% !important
    margin 0 auto !important
    padding 0 !important

    .collapse-btn
      display none !important

    ::v-deep .image
      max-width: 100% !important
      max-height: 90vh !important
    ::v-deep .novel_text:not(.vertical)
      width 660px

  .ia-right
    max-width unset !important
    padding-right 0 !important
    .artwork-meta
      margin 20px 10px !important
      padding 20px 30px
    ::v-deep
      .artwork-list
        height 4.5rem !important
      .author-card .artwork-list-wrap .artwork-list .swiper-slide .image-slide
        height 4.2rem !important

</style>
