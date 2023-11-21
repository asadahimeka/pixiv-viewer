<template>
  <div class="setting">
    <h1 class="app-title">
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
    <!-- <van-cell v-if="showRp" size="large" center title="扫码领红包" icon="gift-o" is-link @click="showRpDialog=true" /> -->
    <van-cell size="large" center :title="$t('setting.about')" icon="info-o" is-link to="/setting/about" />
    <div v-if="isLoggedIn" style="width: 60%;margin: 1rem auto 0;">
      <van-button round plain block type="danger" size="small" @click="logoutApp">{{ $t('user.sess.out') }}</van-button>
    </div>
    <!-- <van-dialog v-model="showRpDialog" show-cancel-button confirm-button-text="复制口令" @confirm="copyToken">
      <img :src="rpImg" alt="" style="width: 100%">
    </van-dialog> -->
  </div>
</template>

<script>
import { mapGetters, mapState } from 'vuex'
import { Dialog } from 'vant'
import PixivAuth from '@/api/client/pixiv-auth'
import { logout } from '@/api/user'
// import { copyText } from '@/utils'

// const rpText = process.env.VUE_APP_ALIPAY_REDPACK_TEXT
// const rpImg = process.env.VUE_APP_ALIPAY_REDPACK_SRC

export default {
  name: 'Setting',
  data() {
    return {
      // rpImg,
      // showRp: Boolean(rpImg) && navigator.language.includes('zh'),
      // showRpDialog: false,
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
    // copyToken() {
    //   copyText(rpText, () => this.$toast(this.$t('tips.copylink.succ')), () => {})
    // },
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
