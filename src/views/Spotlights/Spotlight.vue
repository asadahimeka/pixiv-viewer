<template>
  <div class="Spotlight illusts">
    <TopBar />
    <div class="ex_link" @click="openLink">
      <Icon class="icon" name="ex_link" />
    </div>
    <div class="main_cover">
      <img :src="spotlight.cover || ''" alt="" loading="lazy">
      <div class="title_wp">
        <div class="title_cnt">
          <h1 class="title">{{ spotlight.title }}</h1>
        </div>
      </div>
    </div>
    <div class="sp_desc">{{ spotlight.desc }}</div>
    <van-loading v-show="loading" class="loading" :size="'50px'" />
    <div v-if="spotlight.items" class="flexbin">
      <ImageCard
        v-for="art in spotlight.items"
        :key="art.id"
        mode="meta"
        :artwork="art"
        @click-card="toArtwork($event)"
      />
    </div>
    <masonry class="spd_recomm" v-bind="recomMasonryProps">
      <SpotlightsRecom
        v-if="tagLatest.tag_name"
        :tag="tagLatest.tag_name"
        :title="$t('sp.of_new')"
        icon="new"
        :list="tagLatest.items"
      />
      <SpotlightsRecom
        v-if="tagRecomm.tag_name"
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
import ImageCard from '@/components/ImageCard'
import api from '@/api'
import SpotlightsRecom from './SpotlightsRecom.vue'
import { COMMON_PROXY } from '@/consts'

export default {
  name: 'Spotlight',
  components: {
    TopBar,
    ImageCard,
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
  },
  watch: {
    $route() {
      if (
        this.$route.name === 'Spotlight' &&
        this.$route.params.id != this.spid
      ) {
        this.spotlight = {}
        this.init()
      }
    },
  },
  activated() {
    this.spotlight.items && this.checkRes()
  },
  mounted() {
    this.init()
  },
  methods: {
    toArtwork(id) {
      this.$store.dispatch('setGalleryList', this.spotlight.items)
      this.$router.push({
        name: 'Artwork',
        params: { id },
      })
    },
    checkRes(res) {
      const data = res || this.spotlight
      if (!data.desc || !data.items.length || data.items.some(e => e.illust_url.endsWith('/effect.png'))) {
        this.spotlight.related_recommend = null
        this.spotlight.related_latest = null
        this.$router.replace(`/pixivision/${this.spid}`)
      }
    },
    async getDetail() {
      this.loading = true
      const res = _.cloneDeep(await api.getSpotlightDetail(this.spid))
      if (res.status === 0) {
        this.checkRes(res.data)
        res.data.cover = COMMON_PROXY + res.data.cover
        res.data.items = res.data.items.map(e => ({
          id: e.illust_id,
          title: e.title,
          illust_url: e.illust_url,
          images: [{ m: e.illust_url }],
          author: {
            name: e.user_name,
            avatar: e.user_avatar,
          },
        }))
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
  .flexbin:after {
    min-width: 400PX !important;
  }
  .flexbin .image-card {
    height: 400PX !important;
  }
  .flexbin .image {
    height: 400PX !important;
  }
  @media (max-width: 1280px) {
    .flexbin:after {
      min-width: 40vw !important;
    }
    .flexbin .image-card {
      height: 40vw !important;
    }
    .flexbin .image {
      height: 40vw !important;
    }
  }
  @media (max-width: 768px) {
    .flexbin:after {
      display none
    }
    .flexbin .image-card {
      width 100% !important
      height: auto !important;
    }
    .flexbin .image {
      height: auto !important;
    }
  }
</style>
<style lang="stylus" scoped>
.illusts
  padding 500px 20px 40px

.Spotlight
  .sp_desc
    max-width 66vw
    margin 30px auto
    padding 0 20px
    font-size 22px
    line-height 1.5
    text-indent 2em

  .main_cover
    position absolute
    top 0
    left 0
    width 100%
    height 500px
    img
      position relative
      width 100%
      height 100%
      object-fit cover

      &[lazy="loading"]
        width 120px
        height 120px
        top 50%
        left 50%
        transform translate(-50%, -50%)

@media screen and (min-width: 1200px)
  .Spotlight
    .flexbin,.spd_recomm
      max-width 1200PX
      margin-left auto !important
      margin-right auto !important

@media screen and (max-width: 700px)
  .Spotlight
    padding-top 52.33vw !important
    .main_cover
      height 52.33vw !important
    .sp_desc
      max-width 100%

.Spotlight
  .title_wp
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
      background-image: linear-gradient(0deg, rgba(0,0,0,0.5) 0%, rgba(255,255,255,0) 100%);
    .title_cnt
      position: absolute;
      bottom: 0;
      width: 100%;
      padding: 10px 15px;
      box-sizing: border-box;
      color: #fff;
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

      .image[lazy="loading"]
        margin 0 !important

.ex_link
  position: fixed;
  top: 0;
  right 0
  padding: 0.77rem 0.5rem;
  z-index: 99;
  font-size 2.2em
  cursor pointer
  .svg-icon
    color: #fafafa;
    filter: drop-shadow(0.02667rem 0.05333rem 0.05333rem rgba(0,0,0,0.8))

</style>
