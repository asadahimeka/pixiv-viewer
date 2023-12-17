<template>
  <div class="setting" :class="{isXmas}" :style="isXmas?`background-image:url(${xmasbg})`:''">
    <div v-if="isXmas" class="app-title">
      <img src="@/assets/images/3751541.png" alt="">
      <div class="app-title-desc">Merry Christmas</div>
    </div>
    <h1 v-else class="app-title">
      <img v-if="!isLoggedIn" src="/app-icon.png" alt="">
      <div class="app-title-desc">
        <span class="title-font">Pixiv Viewer<sup style="margin-left: 5px;font-size: 0.3rem;">Kai</sup></span>
        <small>{{ $t('setting.app_desc') }}</small>
      </div>
    </h1>
    <van-cell v-if="isLoggedIn" size="large" center is-link :to="`/u/${user.id}`">
      <template #title>
        <div class="user_data">
          <img v-lazy="user.profileImg" width="50" height="50" alt="">
          <div>
            <div>{{ user.name }}</div>
            <div style="color: #999">@{{ user.pixivId }}</div>
          </div>
        </div>
      </template>
    </van-cell>
    <van-cell v-if="isLoggedIn" size="large" center :title="$t('user.sess.my_fav')" icon="star-o" is-link :to="`/users/${user.id}/favorites`" />
    <van-cell v-else size="large" center :title="$t('user.sess.login')" icon="user-circle-o" is-link to="/account/login" />
    <van-cell size="large" center :title="$t('common.history')" icon="underway-o" is-link to="/setting/history" />
    <van-cell size="large" center :title="$t('display.title')" icon="eye-o" is-link to="/setting/contents_display" />
    <van-cell size="large" center :title="$t('cache.title')" icon="delete-o" is-link to="/setting/clearcache" />
    <van-cell size="large" center :title="$t('setting.other.title')" icon="setting-o" is-link to="/setting/others" />
    <van-cell size="large" center :title="$t('setting.down_app')" icon="apps-o" is-link to="/setting/down_app" />
    <van-cell size="large" center :title="$t('setting.recomm.title')" icon="bookmark-o" is-link to="/setting/recommend" />
    <van-cell size="large" center :title="$t('setting.about')" icon="info-o" is-link to="/setting/about" />
    <div v-if="isLoggedIn" style="width: 60%;margin: 1rem auto 0;">
      <van-button round plain block type="danger" size="small" @click="logoutApp">{{ $t('user.sess.out') }}</van-button>
    </div>
  </div>
</template>

<script>
import { mapGetters, mapState } from 'vuex'
import { Dialog } from 'vant'
import PixivAuth from '@/api/client/pixiv-auth'
import { logout } from '@/api/user'

const isXmas = (() => {
  const d = new Date()
  return d.getMonth() == 11 && (d.getDate() == 24 || d.getDate() == 25)
})()

const xmasbgs = [
  '696D67_333033303235393030305F30315F66756C6C2E706E67.png',
  '696D67_333034303036373030305F30315F66756C6C2E706E67.png',
  '696D67_333034303234393030305F30315F66756C6C2E706E67.png',
  '696D67_333034303330363030305F30315F66756C6C2E706E67.png',
  '696D67_333034303330363030305F30325F66756C6C2E706E67.png',
  '696D67_333034303331313030305F30315F66756C6C2E706E67.png',
  '696D67_333034303331313030305F30325F66756C6C2E706E67.png',
  '696D67_333034303336393030305F30315F66756C6C2E706E67.png',
  '696D67_333034303337323030305F30325F66756C6C2E706E67.png',
  '696D67_333034303433343030305F30315F66756C6C2E706E67.png',
  '696D67_333034303433373030305F30315F66756C6C2E706E67.png',
  '696D67_333034303433373030305F30325F66756C6C2E706E67.png',
  '696D67_333034303439353030305F30315F66756C6C2E706E67.png',
  '696D67_333034303439363030305F30315F66756C6C2E706E67.png',
]

const randomBg = () => `/img/gbf/${xmasbgs[parseInt(Math.random() * xmasbgs.length, 10)]}`

export default {
  name: 'Setting',
  data() {
    return {
      isXmas,
      xmasbg: '',
    }
  },
  head() {
    return {
      title: this.$t('nav.setting'),
    }
  },
  computed: {
    ...mapState(['user']),
    ...mapGetters(['isLoggedIn']),
  },
  activated() {
    this.xmasbg = randomBg()
  },
  methods: {
    async logoutApp() {
      if (window.APP_CONFIG.useLocalAppApi) {
        const res = await Dialog.confirm({ message: this.$t('login.logout_tip') })
        if (res != 'confirm') return
        window.APP_CONFIG.useLocalAppApi = false
        PixivAuth.writeConfig(window.APP_CONFIG)
        setTimeout(() => {
          location.reload()
        }, 500)
      } else {
        logout()
      }
    },
  },
}
</script>

<style lang="stylus">
.dark #app .setting.isXmas
  .app-title-desc
    text-shadow: 1PX 1PX 2PX #fff;
  .van-cell:hover
    .van-cell__title,
    .van-icon
      color: #d53643
</style>

<style lang="stylus" scoped>
.setting
  max-width 750px
  margin 0 auto 160px

  &.isXmas
    position relative
    min-height 72vh
    margin 0 auto
    padding-bottom 160px
    background transparent no-repeat right -1rem bottom / 9rem
    &::after
      content 'Background © Cygames, Inc.'
      position absolute
      right 1rem
      bottom -0.5rem
      font-size 0.1rem
      color #999
      font-family sans-serif
    .app-title
      color: #d53643;
      margin: 0.7rem 0;
      font-size 0.64rem
      font-family: Lucida Handwriting,"LXGW WenKai Screen",Georgia Pro,Georgia,Times New Roman,serif;font-weight: bold;
      img
        display block !important
    ::v-deep .van-cell
      color: #ba2d38;
      background-color transparent !important
      border-radius: 0.2rem;
      transition background-color 0.2s
      &:hover
        background-color: #FEDFE1 !important;
      &::after
        opacity 0

  ::v-deep .van-cell__left-icon
    margin-right 0.4rem
    font-size 24px
    transform: translateY(1px);

.app-title
  display flex
  justify-content center
  align-items center
  margin 40px 0 50px
  padding-right 10px
  font-size 40px
  text-align center

  .title-font
    font-family "Georgia Pro", Georgia, "Times New Roman", serif
    font-weight bold

  &-desc
    display flex
    flex-direction column
    max-width 6rem
    small
      margin-top 0.2rem
      font-size 0.24rem

  img
    width 64px
    height 64px
    margin-right 20px

.user_data
  display flex
  align-items center
  img
    margin-right 20px
    border-radius 50%
</style>
