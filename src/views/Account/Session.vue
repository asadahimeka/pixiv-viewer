<template>
  <div class="container">
    <top-bar />
    <h3 class="af_title">{{ $t('sess.title') }}</h3>
    <van-form style="margin: 1rem auto;" @submit="onSubmit">
      <van-field
        v-model="sessionIdInput"
        label="Session ID"
        :placeholder="$t('sess.input.ph')"
        :rules="rules.sessionIdInput"
      />
      <div style="width: 7rem;margin: 0.5rem auto">
        <van-button round block type="info" size="small" native-type="submit" :loading="loading">{{ $t('sess.save') }}</van-button>
      </div>
    </van-form>
    <van-collapse v-model="activeItems" class="tips">
      <van-collapse-item :title="$t('sess.ques1')" name="1">
        <h3>Chrome/Edge</h3>
        <p>
          <i18n path="sess.q1.p1" tag="span">
            <a href="https://www.pixiv.net/login.php" target="_blank" rel="noreferrer">www.pixiv.net</a>
          </i18n>
        </p>
        <p>{{ $t('sess.q1.p2') }}</p>
        <p>{{ $t('sess.q1.p3') }} </p>
        <p>
          <i18n path="sess.q1.p4" tag="span">
            <code>PHPSESSID</code>
          </i18n>
        </p>
        <p>{{ $t('sess.q1.p5') }}</p>
        <br>
        <h3>Firefox</h3>
        <p>
          <i18n path="sess.q1.p1" tag="span">
            <a href="https://www.pixiv.net/login.php" target="_blank" rel="noreferrer">www.pixiv.net</a>
          </i18n>
        </p>
        <p>{{ $t('sess.q2.p2') }}</p>
        <p>{{ $t('sess.q2.p3') }}</p>
        <p>
          <i18n path="sess.q2.p4" tag="span">
            <code>PHPSESSID</code>
          </i18n>
        </p>
        <p>{{ $t('sess.q2.p5') }}</p>
        <br>
        <p>{{ $t('sess.mobile_tip') }}</p>
        <br>
        <p>
          {{ $t('sess.example') }}
          <br>
          <code>12345678_SaEJ8xcKwWfaE55JuQALTFMEULBhcAUh</code>
        </p>
      </van-collapse-item>
      <van-collapse-item :title="$t('sess.ques2')" name="2">
        <p>{{ $t('sess.que2.p1') }}</p>
        <p>{{ $t('sess.que2.p2') }}</p>
      </van-collapse-item>
    </van-collapse>
  </div>
</template>

<script>
import { Dialog } from 'vant'
import { i18n } from '@/i18n'
import { login, validateSessionId } from '@/api/user'

export default {
  name: 'Session',
  data() {
    return {
      sessionIdInput: '',
      loading: false,
      activeItems: ['1', '2'],
      rules: {
        sessionIdInput: [{
          required: true,
          message: this.$t('sess.input.msg'),
          validator: validateSessionId,
        }],
      },
    }
  },
  head() {
    return { title: this.$t('sess.title') }
  },
  methods: {
    async onSubmit() {
      try {
        await Dialog.confirm({
          title: this.$t('sess.warn.title'),
          message: this.$t('sess.warn.text'),
          closeOnPopstate: true,
          cancelButtonText: i18n.t('common.cancel'),
          confirmButtonText: i18n.t('common.confirm'),
        })
        this.loading = true
        const userData = await login(this.sessionIdInput)
        this.$store.commit('setUser', userData)
        this.loading = false
        window.umami?.track('session_login_success')
        this.$toast(this.$t('sess.succ_msg'))
        // this.$router.replace({ name: 'Setting' })
        this.$router.go(-2)
        setTimeout(() => {
          location.reload()
        }, 200)
      } catch (err) {
        console.log('err: ', err)
        this.loading = false
        if (err instanceof Error) {
          this.$toast(err.response?.data?.message || err)
        }
      }
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

.container
  position relative
  width 9.8rem
  margin 0 auto
  padding-bottom 40px

  ::v-deep .top-bar-wrap
    width 1.3rem
    height 1.2rem
    padding-top 20px
    background transparent
.tips
  p
    line-height 1.8
  code
    padding 5px
    border-radius 8px
    background: #cdeefe
    color: #0b6aaf

</style>
