<template>
  <div class="Lives illusts">
    <top-bar />
    <h3 class="af_title">{{ $t('qzuDyLgl-y1tIhY0Dc_6s') }}</h3>
    <van-list
      v-model="loading"
      :loading-text="$t('tips.loading')"
      :finished="finished"
      :finished-text="$t('tips.no_more')"
      :error.sync="error"
      :offset="800"
      :error-text="$t('tips.net_err')"
      @load="getArtList"
    >
      <div class="live_list">
        <div v-for="a in artList" :key="a.id" class="live_card" @click="$router.push(`/live/${a.id}`)">
          <div class="live_img">
            <img :src="cmnProxy(a.thumbnail_image_url)" alt="">
            <div v-if="a.performers.length" class="performers">
              <img
                v-for="(p, pi) in a.performers"
                :key="pi"
                :src="imgProxy(p.user.profile_image_urls.medium)"
                :alt="p.user.name"
                class="performers_avatar"
              >
            </div>
          </div>
          <div class="content">
            <h2 :title="a.name" class="title">
              <span class="title_tags">
                <van-tag v-if="a.is_r18" type="danger">R-18</van-tag>
                <van-tag v-if="a.is_r15" type="warning">R-15</van-tag>
              </span>
              <span>{{ a.name }}</span>
            </h2>
            <div class="author-cont">
              <img :src="imgProxy(a.owner.user.profile_image_urls.medium)" :alt="a.owner.user.name" class="avatar">
              <div class="author">{{ a.owner.user.name }}</div>
              <div class="counts">
                <van-icon name="contact" />
                <span>{{ a.member_count }}</span>
                <van-icon name="eye-o" />
                <span>{{ a.total_audience_count }}</span>
                <van-icon v-if="a.performer_count > 0" name="friends-o" />
                <van-icon v-if="a.is_enabled_mic_input" name="volume-o" />
              </div>
            </div>
          </div>
          <Icon class="live_play_icon" name="play" scale="4" />
        </div>
      </div>
    </van-list>
    <van-empty v-if="!loading && !artList.length" :description="$t('tips.no_data')" />
  </div>
</template>

<script>
import api, { imgProxy } from '@/api'
import _ from '@/lib/lodash'
import { COMMON_PROXY } from '@/consts'

export default {
  name: 'Lives',
  data() {
    return {
      artList: [],
      loading: false,
      curPage: 1,
      finished: false,
      error: false,
    }
  },
  head() {
    return { title: this.$t('qzuDyLgl-y1tIhY0Dc_6s') }
  },
  methods: {
    toDetail(id) {
      this.$router.push('/')
    },
    getArtList: _.throttle(async function () {
      this.loading = true
      const res = await api.getLiveList(this.curPage)
      if (res.status === 0) {
        if (res.data.length) {
          if (!(this.$store.state.contentSetting.r18 || this.$store.state.contentSetting.r18g)) {
            res.data = res.data.filter(e => !e.is_adult)
          }
          this.artList = _.uniqBy([
            ...this.artList,
            ...res.data,
          ], 'id')
          this.curPage++
        } else {
          this.finished = true
        }
      } else {
        this.$toast({
          message: res.msg,
        })
        this.error = true
      }
      this.loading = false
    }, 1000),
    imgProxy,
    cmnProxy(src) {
      return COMMON_PROXY + src
    },
  },
}
</script>

<style lang="stylus" scoped>
.af_title
  position relative
  margin-top 40px
  margin-bottom 40px
  text-align center
  font-size 28px

.illusts
  position relative
  padding 0 20px 40px

  .loading
    margin-top: 2rem;
    text-align: center;

  ::v-deep .top-bar-wrap
    width 2rem
    padding-top 20px
    background transparent

.live_list
  display flex
  flex-wrap wrap
  gap: 0.4rem 2%;
  max-width 1200PX
  margin 0 auto

  .live_card
    position relative
    flex: 0 0 32%;
    max-width: 32%;
    border-radius: .26667rem;
    box-shadow: 0 3PX 1PX -2PX rgba(0,0,0,.2), 0 2PX 2PX 0 rgba(0,0,0,.14), 0 1PX 5PX 0 rgba(0,0,0,.12);
    cursor pointer
    @media screen and (max-width: 1000px)
      flex: 0 0 49%;
      max-width: 49%;
    @media screen and (max-width: 500px)
      flex: 0 0 100%;
      max-width: 100%;

  .live_img
    position relative
    width 100%;
    aspect-ratio: 16 / 9;
    &::after
      content ''
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, .04);
      border-radius: .26667rem;
    img
      max-width 100%
      border-top-left-radius: .26667rem;
      border-top-right-radius: .26667rem;
      object-fit: cover;
    .performers
      position: absolute;
      bottom: 0.4rem;
      right: 0;
      z-index: 20;
      display: flex;
      justify-content: flex-end;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.2rem;
      padding: 0 0.2rem;
      &_avatar
        width: .8rem;
        min-width: .8rem;
        height: .8rem;
        border-radius: 50%;
        border 2PX solid #fff
        object-fit: cover;

  .live_play_icon
    position absolute
    left 0.1rem
    top 0.1rem
    color: #56565699;

  .content
    width: 100%;
    padding: .10667rem .26667rem .21333rem;
    color: #333;
    box-sizing: border-box;
    .title
      margin: .08rem 0;
      font-weight: 600;
      line-height: normal;
      font-size: .32rem;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 1;
      -webkit-box-orient: vertical;
      &_tags
        margin-left 0.1rem
    .author-cont
      display: flex;
      align-items: center;
      font-size: .26667rem;
      .avatar
        width: .6rem;
        min-width: .6rem;
        height: .6rem;
        margin-right: .10667rem;
        vertical-align: bottom;
        border-radius: 50%;
        overflow: hidden;
        object-fit: cover;
      .author
        flex 1
        display: inline-block;
        font-weight: 200;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
      .counts
        display flex
        align-items center
        color #999
        ::v-deep
          .van-icon
            margin-left .10667rem

</style>
