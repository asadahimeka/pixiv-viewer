<template>
  <div class="artwork novel">
    <TopBar />
    <div class="more_btn" @click="showSettings=!showSettings">
      <Icon class="icon" name="novel_setting" />
    </div>
    <div class="ia-cont" :class="{ isCollapseMeta }">
      <div class="ia-left">
        <van-loading v-if="loading" size="50px" style="margin-top: 3rem;" />
        <template v-else>
          <NovelView ref="novelView" :artwork="artwork" :text-obj="novelText" :text-config="textConfig" />
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
          <van-button type="info" size="small" plain block @click="downloadNovel">
            {{ $t('common.download') }}
          </van-button>
          <van-button type="info" size="small" plain block @click="showComments = true">
            {{ $t('user.view_comments') }}
          </van-button>
          <van-popover
            v-if="showPntBtn"
            v-model="showPntPopover"
            :actions="pntActions"
            trigger="click"
            placement="top"
            style="width: 100%;"
            @select="onPntSelect"
          >
            <template #reference>
              <van-button v-if="showPntBtn" type="info" size="small" plain block>
                翻译
              </van-button>
            </template>
          </van-popover>
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
    <van-action-sheet v-model="showSettings" class="setting-actions" :title="$t('novel.settings.title')" :overlay="false">
      <div class="configs">
        <div class="conf-title">{{ $t('novel.settings.text.size') }}</div>
        <div class="conf-inp">
          <van-slider v-model="textConfig.size" :min="12" :max="36" class="conf-slider" @change="onSizeChange">
            <template #button>
              <div class="van-slider__button">{{ textConfig.size }}</div>
            </template>
          </van-slider>
        </div>
        <div class="conf-fcont">
          <div class="conf-fitem">
            <div class="conf-title">{{ $t('novel.settings.text.font') }}</div>
            <div class="conf-inp">
              <van-radio-group v-model="textConfig.font" direction="horizontal">
                <van-radio name="sans-serif" style="font-family: sans-serif;">{{ $t('novel.settings.text.sans') }}</van-radio>
                <van-radio name="serif" style="font-family: serif;">{{ $t('novel.settings.text.serif') }}</van-radio>
                <van-radio name="inherit">LXGW</van-radio>
              </van-radio-group>
            </div>
          </div>
          <div class="conf-fitem">
            <div class="conf-title">{{ $t('novel.settings.text.direction') }}</div>
            <div class="conf-inp">
              <van-radio-group v-model="textConfig.direction" direction="horizontal">
                <van-radio name="h">{{ $t('novel.settings.text.direct_h') }}</van-radio>
                <van-radio name="v">{{ $t('novel.settings.text.direct_v') }}</van-radio>
              </van-radio-group>
            </div>
          </div>
        </div>
        <div class="conf-fcont novel-wrap-setting">
          <div class="conf-fitem">
            <div class="conf-title">{{ $t('novel.settings.text.height') }}</div>
            <div class="conf-inp">
              <van-slider v-model="textConfig.height" :min="1" :max="5" :step="0.1" class="conf-slider" @change="onSizeChange">
                <template #button>
                  <div class="van-slider__button">{{ textConfig.height }}</div>
                </template>
              </van-slider>
            </div>
          </div>
          <div class="conf-fitem">
            <div class="conf-title">{{ $t('novel.settings.text.weight') }}</div>
            <div class="conf-inp">
              <van-slider v-model="textConfig.weight" :min="100" :max="900" :step="100" class="conf-slider" @change="onSizeChange">
                <template #button>
                  <div class="van-slider__button">{{ textConfig.weight }}</div>
                </template>
              </van-slider>
            </div>
          </div>
        </div>
        <div class="conf-fcont novel-wrap-setting">
          <div class="conf-fitem">
            <div class="conf-title">{{ $t('zlMUy5svAesJpHhvWRc6C') }}</div>
            <div class="conf-inp">
              <div class="conf-colors">
                <div
                  v-for="c in textColorPresets"
                  :key="c[0]"
                  class="conf-color"
                  :class="{act:textConfig.bg==c[0]}"
                  :style="{background:c[0]}"
                  @click="textConfig.bg=c[0];textConfig.color=c[1]"
                ></div>
              </div>
            </div>
          </div>
          <div class="conf-fitem">
            <div class="conf-fcont">
              <div class="conf-fitem">
                <div class="conf-title">{{ $t('novel.settings.text.color') }}</div>
                <div class="conf-inp">
                  <input v-model="textConfig.color" type="color">
                </div>
              </div>
              <div class="conf-fitem">
                <div class="conf-title">{{ $t('novel.settings.text.bg') }}</div>
                <div class="conf-inp">
                  <input v-model="textConfig.bg" type="color">
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </van-action-sheet>
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
import _ from 'lodash'
import { mapGetters } from 'vuex'
import { ImagePreview } from 'vant'
import api from '@/api'
import { PIXIV_NEXT_URL, SILICON_CLOUD_API_KEY } from '@/consts'
import { getNoTranslateWords, loadImtSdk, siliconCloudTranslate } from '@/utils/translate'
import { copyText, downloadFile } from '@/utils'
import { getCache, setCache } from '@/utils/storage/siteCache'
import { LocalStorage } from '@/utils/storage'
import { i18n } from '@/i18n'
import TopBar from '@/components/TopBar'
import NovelView from './components/NovelView.vue'
import Meta from './components/Meta'
import AuthorNovelCard from './components/AuthorNovelCard.vue'
import RelatedNovel from './components/RelatedNovel.vue'
import CommentsArea from './components/Comment/CommentsArea.vue'
import IconLink from '@/assets/images/share-sheet-link.png'
import IconQQ from '@/assets/images/share-sheet-qq.png'
import IconQrcode from '@/assets/images/share-sheet-qrcode.png'
import IconQzone from '@/assets/images/share-sheet-qzone.png'
import IconWeb from '@/assets/images/share-sheet-web.png'
import IconWechat from '@/assets/images/share-sheet-wechat.png'
import IconWeibo from '@/assets/images/share-sheet-weibo.png'
import IconTwitter from '@/assets/images/share-sheet-twi.png'
import IconFacebook from '@/assets/images/share-sheet-facebook.png'
import { getArtworkFileName } from '@/store/actions/filename'
import store from '@/store'

const { isAutoLoadImt } = store.state.appSetting
const textConfig = LocalStorage.get('PXV_TEXT_CONFIG', {
  size: 16,
  height: 2,
  font: 'inherit',
  weight: 400,
  direction: 'h',
  color: '#1f1f1f',
  bg: '#ffffff',
})

let novelTextBak = ''

export default {
  name: 'NovelDetail',
  components: {
    TopBar,
    NovelMeta: Meta,
    AuthorNovelCard,
    NovelView,
    RelatedNovel,
    CommentsArea,
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
        { name: i18n.t('artwork.share.type.wechat'), icon: IconWechat },
        { name: 'Twitter', icon: IconTwitter },
        { name: 'Facebook', icon: IconFacebook },
      ],
      showSettings: false,
      textConfig,
      textColorPresets: [
        ['#ffffff', '#1f1f1f'],
        ['#fafafa', '#1f1f1f'],
        ['#1f1f1f', '#b7b7b7'],
        ['#e6f1fa', '#1f1f1f'],
        ['#fff8eb', '#1f1f1f'],
      ],
      isCollapseMeta: false,
      showComments: false,
      showPntPopover: false,
      pntActions: [
        { text: '加载沉浸式翻译 SDK', className: 'imt', key: 'imt' },
        { text: '硅基流动 AI 翻译(glm4)', className: 'sc', key: 'sc_glm' },
        { text: '硅基流动 AI 翻译(Qwen2)', className: 'sc', key: 'sc_qwen' },
        { text: '微软翻译', className: 'ms', key: 'ms' },
        { text: '谷歌翻译', className: 'gg', key: 'gg' },
      ],
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
      return !isAutoLoadImt && i18n.locale.includes('zh') && !/中文|中国语|Chinese|中國語|中国語/.test(JSON.stringify(this.artwork.tags))
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
    textConfig: {
      deep: true,
      handler(val) {
        LocalStorage.set('PXV_TEXT_CONFIG', val)
      },
    },
    showComments(val) {
      document.documentElement.style.overflowY = val ? 'hidden' : ''
    },
  },
  mounted() {
    if (document.querySelector('#immersive-translate-popup')) {
      this.pntActions = this.pntActions.filter(e => e.key != 'imt')
    }
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
        if (historyList.length > 100) historyList = historyList.slice(0, 100)
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
        () => {
          this.openUrl(`https://wechat-share.pwp.space/?url=${encodeURIComponent(location.href)}&title=${this.artwork.title}`)
        },
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
    onSizeChange(value) {
      this.$toast(this.$t('tips.current_value') + value)
    },
    async downloadNovel() {
      window.umami?.track('download_novel')
      await downloadFile(new Blob([novelTextBak]), `${getArtworkFileName(this.artwork)}.txt`, { subDir: 'novel' })
    },
    async onPntSelect(action) {
      window.umami?.track('translate_novel', { with: action.text })
      this.$store.commit('setIsNovelViewShrink', false)
      const fns = {
        imt: () => loadImtSdk(),
        sc_glm: async () => this.fanyi('sc', await getNoTranslateWords(this.artwork.tags), 'glm'),
        sc_qwen: async () => this.fanyi('sc', await getNoTranslateWords(this.artwork.tags), 'qwen'),
        ms: async () => this.fanyi('ms', await getNoTranslateWords(this.artwork.tags)),
        gg: () => this.fanyi('gg'),
      }
      const fn = fns[action.key]
      if (fn) {
        await fn()
      }
    },
    async fanyi(srv, nots = '', aiModel = 'glm') {
      try {
        if (SILICON_CLOUD_API_KEY && srv == 'sc') {
          const cacheKey = `novel.translate.${this.artwork.id}.sc.${aiModel}.${nots}`
          const cacheText = await getCache(cacheKey)
          if (cacheText) {
            this.novelText.text = cacheText
            return
          }
          const notsArr = nots ? nots.split(',') : []
          const novelElement = document.querySelector('.novel_text')
          let resText = ''
          this.novelText.text = 'Loading...'
          siliconCloudTranslate(novelTextBak, notsArr, aiModel, chunk => {
            if (chunk.done) {
              novelElement.innerHTML = resText
              this.novelText.text = resText
              setCache(cacheKey, resText)
              return
            }

            resText += chunk
            notsArr.forEach((e, i) => {
              resText = resText.replaceAll(`[名字${i}]`, e)
              resText = resText.replaceAll(`名字${i}`, e)
            })
            resText = resText.replace(/\n/g, '<br>')
            requestAnimationFrame(() => {
              novelElement.innerHTML = resText
            })
          })
          return
        }

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
          if (!res.includes('Translate failed')) setCache(cacheKey, res)
        }
        this.novelText.text = res
        loading.clear()
      } catch (err) {
        console.log('fanyi err: ', err)
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

.setting-actions
  max-width 10rem
  // height 8rem
  max-height 80vh
  overflow-y auto
  left unset
  right 0
  background: hsla(0, 0%, 100%, .9);
  backdrop-filter: blur(.05333rem);
  box-shadow 0px 0px 8px 2px #ccc;
  .configs
    padding 0px 50px 80px
  .conf-fcont
    display flex
    align-items center
  .conf-fitem
    width 50%
    flex 1
  .conf-title
    margin 20px 0 30px
    padding: 20px 16px 0 16px;
    color: #777
    font-size: 15PX;
    font-weight bold
  .conf-inp
    padding-left 20px
  .conf-colors
    display flex
    align-items center
    flex-wrap wrap
    gap 10px
  .conf-color
    width 36px
    height 36px
    border-radius 50%
    border 2PX solid rgba(0, 0, 0, 0.08)
    &:hover,&.act
      border-color var(--accent-color, #0096fa)
  .novel-wrap-setting
    @media screen and (max-width: 600px)
      flex-wrap wrap
      > .conf-fitem
        width 100%
        flex unset
      .conf-colors
        gap 0.5rem
      .conf-color
        width 0.8rem
        height 0.8rem
  .conf-slider
    margin-top 40px
    height: 4PX
    ::v-deep .van-slider__button
      display flex
      justify-content center
      align-items center
      width: auto
      height: auto
      min-width 0.32rem
      min-height 0.3rem
      padding: 0.1rem 0.15rem
      border-radius: 0.2rem
      font-family Bahnschrift, Dosis, Arial, Helvetica, sans-serif
      font-size: 13.5PX
      font-weight bold
      line-height 1.2

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
