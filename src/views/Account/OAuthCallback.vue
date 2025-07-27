<template>
  <div class="setting-page">
    <h3 class="af_title">Login Callback</h3>
    <p style="margin-top: 20px;text-align: center;">Processing</p>
  </div>
</template>

<script>
import { login } from '@/api/client/login'
import { LocalStorage } from '@/utils/storage'
import { Dialog } from 'vant'

export default {
  name: 'OAuthCallback',
  async created() {
    try {
      const { code } = this.$route.query
      const v = LocalStorage.get('PXV_LOGIN_CODEV')
      await login(code, v)
      window.umami?.track('oauth_login_success')
      this.$toast.success(this.$t('login.succ_tip'))
      setTimeout(() => {
        location.replace('/')
      }, 200)
    } catch (err) {
      console.warn('err: ', err)
      Dialog.alert({ title: this.$t('login.fail_tip'), message: err?.message || err })
    }
  },
}
</script>
