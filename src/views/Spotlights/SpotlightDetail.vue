<template>
  <div class="Spotlight illusts">
    <TopBar />
    <div class="ex_link" @click="openLink">
      <Icon class="icon" name="ex_link" />
    </div>
    <div class="title_wp">
      <div class="title_cnt">
        <p class="sp_date">{{ spotlight.date }}</p>
        <h1 class="title">{{ spotlight.title }}</h1>
      </div>
    </div>
    <div class="sp_desc" v-html="spotlight.content"></div>
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
import TopBar from '@/components/TopBar'
import api from '@/api'
import SpotlightsRecom from './SpotlightsRecom.vue'

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
  computed: {
    tagRecomm() {
      return this.spotlight.related_recommend || {}
    },
    tagLatest() {
      return this.spotlight.related_latest || {}
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
      const res = await api.getSpotlightTypeDetail(this.spid)
      if (res.status === 0) {
        res.data.content = res.data.content?.replace(/i\.pximg\.net/g, 'i.pixiv.re')
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
      this.spid = this.$route.query.id
      this.getDetail()
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
  .sp_desc
    max-width 72vw
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
      margin 20px auto

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
      margin: 10px 0 20px;
      font-size: 48px;
      text-align center
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;

.illusts
  position relative

  .loading
    margin-top: 2rem;
    text-align: center;

  ::v-deep .top-bar-wrap
    width 30%
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
