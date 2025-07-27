<template>
  <div class="Spotlight illusts">
    <TopBar />
    <div class="ex_link" @click="openLink">
      <Icon class="icon" name="ex_link" />
    </div>
    <div class="title_wp">
      <div class="title_cnt">
        <p class="sp_date" :class="{hide_date:!showDate}">{{ spotlight.date }}</p>
        <h1 class="title">{{ spotlight.title }}</h1>
      </div>
    </div>
    <div
      class="sp_desc"
      @click.stop="handleClick($event)"
      v-html="spotlight.content"
    ></div>
    <van-loading v-show="loading" class="loading" :size="'50px'" />
    <masonry v-bind="recomMasonryProps">
      <SpotlightsRecom
        v-if="tagLatest.tag_name"
        is-type-detail
        :tag="tagLatest.tag_name"
        :title="$t('sp.of_new')"
        icon="new"
        :list="tagLatest.items"
      />
      <SpotlightsRecom
        v-if="tagRecomm.tag_name"
        is-type-detail
        :tag="tagRecomm.tag_name"
        :title="$t('sp.of_recomm')"
        icon="rec_heart"
        :list="tagRecomm.items"
      />
    </masonry>
  </div>
</template>

<script>
import _ from '@/lib/lodash'
import TopBar from '@/components/TopBar'
import api from '@/api'
import SpotlightsRecom from './SpotlightsRecom.vue'
import { COMMON_PROXY, PXIMG_PROXY_BASE } from '@/consts'

export default {
  name: 'Spotlight',
  components: {
    TopBar,
    SpotlightsRecom,
  },
  data() {
    return {
      loading: false,
      spid: null,
      spotlight: {},
      recomMasonryProps: {
        gutter: '8px',
        cols: {
          700: 1,
          default: 2,
        },
      },
    }
  },
  head() {
    return { title: this.spotlight.title }
  },
  computed: {
    tagRecomm() {
      return this.spotlight.related_recommend || {}
    },
    tagLatest() {
      return this.spotlight.related_latest || {}
    },
    showDate() {
      return this.spotlight.date?.length == 10
    },
  },
  watch: {
    $route() {
      if (
        this.$route.name === 'SpotlightDetail' &&
        this.$route.params.id != this.spid
      ) {
        this.spotlight = {}
        this.init()
      }
    },
  },
  mounted() {
    this.init()
  },
  methods: {
    toArtwork(id) {
      this.$router.push({
        name: 'Artwork',
        params: { id },
      })
    },
    async getDetail() {
      this.loading = true
      const res = _.cloneDeep(await api.getSpotlightTypeDetail(this.spid))
      if (res.status === 0) {
        res.data.content = res.data.content
          ?.replace(/i\.pximg\.net/g, PXIMG_PROXY_BASE)
          ?.replace(/src="https:\/\/embed\.pixiv\.net\/(.*)"/i, `src="${COMMON_PROXY}https://embed.pixiv.net/$1"`)
        this.spotlight = res.data
      } else {
        this.$toast({
          message: res.msg,
          icon: require('@/icons/error.svg'),
        })
      }
      this.loading = false
    },
    init() {
      this.spid = this.$route.params.id
      this.getDetail()
    },
    handleClick(ev) {
      ev.preventDefault()
      let el = ev.target
      while (el && !el.className.includes('sp_desc') && el.tagName != 'A') {
        el = el.parentElement
      }
      if (el?.tagName === 'A') {
        const url = el.href
        console.log('url: ', url)
        const actionMap = [
          [/^https:\/\/www\.pixiv\.net\/artworks\/(\d+)/i, m => this.$router.push(`/i/${m}`)],
          [/^https:\/\/www\.pixiv\.net\/users\/(\d+)/i, m => this.$router.push(`/u/${m}`)],
          [/^https:\/\/www\.pixivision\.net\/.+\/a\/(\d+)/i, m => this.$router.push(`/a/${m}`)],
          [new RegExp(`${location.origin}/.+/a/(\\d+)`, 'i'), m => this.$router.push(`/a/${m}`)],
          [new RegExp(`${location.origin}/.+/\\d+#(id-\\w+)`, 'i'), m => {
            document.getElementById(m)?.scrollIntoView({ behavior: 'smooth' })
          }],
        ]
        for (const act of actionMap) {
          const match = url.match(act[0])?.[1]
          if (match) {
            act[1](match)
            return
          }
        }
        window.open(url, '_blank', 'noreferrer')
      }
    },
    openLink() {
      window.open(`https://www.pixivision.net/zh/a/${this.spid}`, '_blank', 'noreferrer')
    },
  },
}
</script>

<style lang="stylus">
.app-main:has(.Spotlight)
  padding 0

.Spotlight
  user-select text
  .hide_date
    opacity 0
  .sp_desc
    max-width 60vw
    margin 30px auto 90px
    padding 0 20px
    font-size 0.36rem
    line-height 2
    @media screen and (max-width: 768px)
      max-width 90vw

    a
     color #2196f3

    img
      display block
      max-width 90%
      height auto
      margin 20px auto

    ._clickable-image-container.fit-inner
      position relative
    .am__work__illust--seasonal-effect-animation
      position absolute
      top 0
      left 50%
      transform translateX(-50%)
      width: 100%;
      height: 100%;
      margin 0 !important
      box-shadow: none !important
      object-fit: cover

    ._article-illust-eyecatch img
      max-width 100%
    .am__work__main img
      border-radius: 4PX
      box-shadow: 0 3PX 1PX -2PX rgba(0, 0, 0, .2), 0 2PX 2PX 0 rgba(0, 0, 0, .14), 0 1PX 5PX 0 rgba(0, 0, 0, .12)
    ._feature-article-body__movie
      margin 40px 0
      text-align center
    ._feature-article-body__widget
      margin-bottom 40px
      padding 20px
      border 1PX solid #ccc
      border-radius 5PX
    ._feature-article-body__pixiv_illust
      position relative
      margin-bottom 80px
      & + ._feature-article-body__caption
        position relative
        top -25px
      &::after
        content: ''
        position absolute
        bottom -0.6rem
        left 50%
        transform translateX(-50%)
        width 60px
        height 1px
        background #808080
    .fab__credit
      font-size: 0.32rem;
      text-align: right;
      color: #808080;
      line-height: 3;
    .making-body .making-profile .profile-wrapper img
      width: 120px;
      border-radius: 50%;
      float: left;
    .making-body .making-profile .profile-wrapper .profile-contents
      margin-left: 140px;
      padding: 15px;
      background-color: #fff;
      position: relative;
      line-height 1.5
      font-size 0.3rem
    ._feature-article-body
      padding: 0;
      line-height: 1.5em;
      width: 100%;
      margin: 0 auto;
      text-align: justify;
    ._feature-article-body__paragraph
      margin-top: 20px;
      margin-bottom: 20px;
    ._feature-article-body__heading
      margin-bottom 20px
      h3
        font-size 0.39rem
        font-weight: bold;
        margin: 60px 0 40px;
        border-bottom: 2px solid #f8e71c;
        padding-bottom: 6px;
    .fab__caption
      font-size: small;
      color: #808080;
      max-width 90%
      margin 0 auto
    .comment-content
      margin: 30px 0;
      padding: 20px;
      border: 2px dashed #999;
      word-wrap: break-word;
      word-break: break-all;
    ._multipage-image-container .mic__label
      display none
    .am__work__info
      display flex
      align-items center
    .am__work .am__work__uesr-icon
      width: 65px;
      height: 65px;
      border-radius: 50%;
      margin-right: 21px;
    .answer.fab__paragraph
      display flex
      margin 40px 0
      img
        width 90px
        height 90px
        border-radius 50%
        margin 0
        margin-right 40px

    ._article-card
      width: 100%;
      display: flex;
      flex-flow: column nowrap;
      margin 0 auto 20px
      max-width 10rem
      background: #fff;
      box-shadow: 0 1PX 1PX 0 rgba(131,131,131,0.5);
      border-radius: 5px;
      overflow: hidden;
      &.spotlight
        border-top: 11px solid #0096fa;
      .arc__thumbnail-container
        height: 5rem;
        overflow: hidden;
        position: relative;
        ._thumbnail
          position: absolute;
          width: 100%;
          height: 100%;
          background-size: cover;
          background-position: top center;
          &:hover
            filter: saturate(1.4);
            &::after
              opacity 1
          &::after
            content: "";
            top: 0;
            left: 0;
            display: block;
            position: absolute;
            width: 100%;
            height: 100%;
            transition: opacity 0.15s ease;
            opacity: 0;
            background-color: rgba(255,255,255,0.3);

        ._category-label
          padding: 5px 11px;
          display: inline-block;
          color: #fff;
          line-height: 1em;
          &.spotlight
            background-color: #0096fa;
          &.large
            font-size: 0.28rem;
            line-height: 0.36rem;
            letter-spacing: 0;
            padding: 7px 22px;
            text-align: center;
            min-width: 140px;
        .arc__thumbnail-label
          position: absolute;
          bottom: 0;
          left: 0;

      .arc__title-container
        color: #323232;
        flex 1
        .arc__title
          font-weight: bold;
          font-size: 0.3rem;
          letter-spacing: 0;
          line-height: 26px;
          margin: 15px;

      .arc__footer-container
        display: flex;
        align-content: space-between;
        align-items: baseline;
        flex-wrap: nowrap;
        margin-left: 15px;
        margin-right: 15px;
        margin-bottom: 26px;
        ._tag-list
          flex 1
          line-height 20px
        .tls__list-item-container
          display: inline;
          margin-right: 14px;
        .tls__list-item
          display: inline;
          color: #ff007a;
          border-bottom: 1PX solid;
          border-color: rgba(255,0,122,0);
          transition: border-color 0.15s ease;
          font-weight: bold;
          letter-spacing: 0;
          line-height: 14px;
          &:hover
            border-color: #ff007a;
          &::before
            content: '#';
          &.small
            font-size: 0.26rem;
            font-weight: normal;

        .arc__footer-date-pr
          display: flex;
          flex-direction: column;
          margin-left 16px
          text-align: right;
          line-height: 12px;
          ._date
            letter-spacing: .05em;
            font-weight: bold;
            &.small
              font-size: 0.24rem;
            &.light-gray
              color: #a1a1a1;

</style>
<style lang="stylus" scoped>
.illusts
  padding 60px 20px 40px

.Spotlight
  .title_wp
    width: 100%;
    height: 100%;
    .title_cnt
      width: 100%;
      padding: 10px 15px;
      box-sizing: border-box;
    .sp_date
      margin-bottom 50px
      text-align: center;
      font-size: 0.35rem;
    .title
      margin: 10px 0;
      font-size: 48px;
      text-align center

.illusts
  position relative

  .loading
    margin-top: 2rem;
    text-align: center;

  ::v-deep .top-bar-wrap
    width 2rem
    padding-top 40px
    background transparent

  .card-box
    padding: 0 12px
    display: flex
    flex-direction: row

    .image-card
      max-height: 360px
      margin: 4px 2px

.ex_link
  position: fixed;
  top: 0;
  right 0
  padding: 0.7rem 0.5rem;
  z-index: 99;
  font-size 2.2em
  cursor pointer
  .svg-icon
    color: #fafafa;
    filter: drop-shadow(0.02667rem 0.05333rem 0.05333rem rgba(0,0,0,0.8))

</style>
