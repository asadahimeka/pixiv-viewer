<template>
  <div class="setting">
    <h1 class="app-title" @click="$router.push('/setting/accent_color')">
      <img v-if="!isLoggedIn" src="/app-icon.png" alt="">
      <div class="app-title-desc">
        <span class="title-font">Pixiv Viewer<sup style="margin-left: 5px;font-size: 0.3rem;">Kai</sup></span>
        <small>{{ $t('setting.app_desc') }}</small>
      </div>
    </h1>
    <van-notice-bar
      v-if="notice"
      class="custom-notice"
      :color="notice.color || '#B5495B'"
      :background="notice.bg || '#FEDFE1'"
      :left-icon="notice.icon"
    >
      {{ notice.text }}
    </van-notice-bar>
    <div class="setting-group">
      <van-cell v-if="isLoggedIn" size="large" center is-link :to="`/u/${user.id}`">
        <template #title>
          <div class="user_data">
            <Pximg :src="user.profileImg" nobg width="50" height="50" alt="" />
            <div>
              <div>{{ user.name }}</div>
              <div style="color: #999">@{{ user.pixivId }}</div>
            </div>
          </div>
        </template>
      </van-cell>
      <van-cell v-if="isLoggedIn" size="large" center :title="$t('user.sess.my_fav')" icon="star-o" is-link :to="`/users/${user.id}/favorites?isCurrentUser=1`" />
      <van-cell v-else size="large" center :title="$t('user.sess.login')" icon="user-circle-o" is-link to="/account/login" />
      <van-cell size="large" center :title="$t('common.history')" icon="underway-o" is-link to="/setting/history" />
      <van-cell size="large" center :title="$t('display.title')" icon="eye-o" is-link to="/setting/contents_display" />
      <van-cell size="large" center :title="$t('cache.title')" icon="delete-o" is-link to="/setting/clearcache" />
      <van-cell size="large" center :title="$t('setting.other.title')" icon="setting-o" is-link to="/setting/preference" />
      <van-cell size="large" center :title="$t('setting.down_app')" icon="apps-o" is-link @click="openDlLink" />
      <van-cell size="large" center :title="$t('setting.recomm.title')" icon="bookmark-o" is-link to="/setting/osusume" />
      <van-cell size="large" center :title="$t('setting.about')" icon="info-o" is-link to="/setting/about" />
    </div>
    <div v-if="isLoggedIn" style="width: 60%;margin: 1rem auto 0;">
      <van-button round plain block type="danger" size="small" @click="logoutApp">{{ $t('user.sess.out') }}</van-button>
    </div>
    <div class="kawaii-logo"></div>
  </div>
</template>

<script>
import { mapGetters, mapState } from 'vuex'
import { Dialog } from 'vant'
import PixivAuth from '@/api/client/pixiv-auth'
import { logout } from '@/api/user'
import { LocalStorage } from '@/utils/storage'
import store from '@/store'

export default {
  name: 'Setting',
  head() {
    return {
      title: this.$t('nav.setting'),
    }
  },
  computed: {
    ...mapState(['user']),
    ...mapGetters(['isLoggedIn']),
    notice() {
      return store.state.appNotice
    },
  },
  methods: {
    async logoutApp() {
      if (window.APP_CONFIG.useLocalAppApi) {
        const res = await Dialog.confirm({ message: this.$t('login.logout_tip') })
        if (res != 'confirm') return
        LocalStorage.remove('PXV_CLIENT_AUTH')
        window.APP_CONFIG.useLocalAppApi = false
        PixivAuth.writeConfig(window.APP_CONFIG)
        setTimeout(() => {
          location.reload()
        }, 500)
      } else {
        logout()
      }
    },
    openDlLink() {
      window.umami?.track('open_dl_app_link')
      window.open('https://github.com/asadahimeka/pixiv-viewer/releases', '_blank', 'noopener')
    },
  },
}
</script>

<style lang="stylus" scoped>
.setting
  max-width 750px
  margin 0 auto 160px

  ::v-deep .van-cell__left-icon
    margin-right 0.4rem
    font-size 24px
    transform: translateY(1px);

.kawaii-logo
  position fixed
  z-index -1
  bottom: 2rem
  right: 0.4rem
  width: 4rem
  height 1.97rem
  aspect-ratio 392/193
  background url('@/assets/images/kawaii-logo.png') no-repeat center / contain
  pointer-events none

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

.custom-notice
  width 85%
  margin -20px auto 10px
  border-radius 8px
  ::v-deep
    .van-icon__image
      border-radius 50%
</style>
