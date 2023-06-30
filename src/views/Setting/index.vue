<template>
  <div class="setting">
    <h2 class="app-title">
      <img width="40" height="40" src="/app-icon.png" alt="">
      <span>Pixiv Viewer</span>
      <sup style="margin-left: 5px;font-size: 0.3rem;">Kai</sup>
    </h2>
    <van-cell v-if="isLoggedIn" size="large" center is-link :to="`/u/${user.id}`">
      <template #title>
        <div class="user_data">
          <img v-lazy="userAvatar" width="50" height="50" alt="">
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
    <!-- <van-cell size="large" center :title="$t('setting.down_app')" icon="apps-o" is-link to="/setting/down_app" /> -->
    <van-cell size="large" center :title="$t('setting.recomm.title')" icon="bookmark-o" is-link to="/setting/recommend" />
    <van-cell size="large" center :title="$t('setting.about')" icon="info-o" is-link to="/setting/about" />
    <div v-if="isLoggedIn" style="width: 60%;margin: 1rem auto 0;">
      <van-button round plain block type="danger" size="small" @click="logoutApp">{{ $t('user.sess.out') }}</van-button>
    </div>
  </div>
</template>

<script>
import { mapGetters, mapState } from 'vuex'
import { logout } from '@/api/user'
import { Dialog } from 'vant'
import PixivAuth from '@/api/client/pixiv-auth'

export default {
  name: 'Setting',
  computed: {
    ...mapState(['user']),
    ...mapGetters(['isLoggedIn']),
    userAvatar() {
      if (/^\/(-|~)\//.test(this.user.profileImg)) {
        return `https://pixiv.js.org/${this.user.profileImg}`
      }
      return this.user.profileImg
    },
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

<style lang="stylus" scoped>
.setting
  max-width 750px
  margin 0 auto 160px

  ::v-deep .van-cell__left-icon
    margin-right 0.4rem
    font-size 24px
    transform: translateY(1px);

.app-title
  display flex
  justify-content center
  align-items center
  margin 40px 0 50px
  font-size 40px
  text-align center

  img
    margin-right 20px

.user_data
  display flex
  align-items center
  img
    margin-right 20px
    border-radius 50%
</style>
