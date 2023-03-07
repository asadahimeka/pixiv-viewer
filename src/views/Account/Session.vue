<template>
  <div class="container">
    <top-bar />
    <h3 class="af_title">设置 Pixiv Session ID</h3>
    <van-form style="margin: 1rem auto;" @submit="onSubmit">
      <van-field
        v-model="sessionIdInput"
        label="Session ID"
        placeholder="请输入 Session ID"
        :rules="rules.sessionIdInput"
      />
      <div style="width: 7rem;margin: 0.5rem auto">
        <van-button round block type="info" size="small" native-type="submit" :loading="loading">保存</van-button>
      </div>
    </van-form>
    <van-collapse v-model="activeItems" class="tips">
      <van-collapse-item title="如何获取 Pixiv Session ID ？" name="1">
        <h3>Chrome/Edge</h3>
        <p>1. 访问 <a href="https://www.pixiv.net/login.php" target="_blank" rel="noreferrer">www.pixiv.net</a> 源站并登录</p>
        <p>2. 点击地址栏的小锁</p>
        <p>3. 在弹出的界面选择「Cookie(正在使用 0 个 Cookie)」 </p>
        <p>4. 展开 `pixiv.net` → `Cookie` 找到 <code>PHPSESSID</code> 项</p>
        <p>5. 将它的「内容」复制后填写到这里</p>
        <br>
        <h3>Firefox</h3>
        <p>1. 访问 <a href="https://www.pixiv.net/login.php" target="_blank" rel="noreferrer">www.pixiv.net</a> 源站并登录</p>
        <p>2. 按 F12 打开浏览器控制台</p>
        <p>3. 点击「存储/storage」一栏</p>
        <p>4. 在 cookie 列表里找到「键/key」为 <code>PHPSESSID</code> 的一栏</p>
        <p>5. 将它的「值/value」复制后填写到这里</p>
        <br>
        <p>移动端自行寻找方法或者到电脑端获取</p>
        <br>
        <p>
          Session ID 形如（无效，演示用）：
          <br>
          <code>12345678_SaEJ8xcKwWfaE55JuQALTFMEULBhcAUh</code>
        </p>
      </van-collapse-item>
      <van-collapse-item title="Pixiv Viewer 会窃取我的个人信息吗？" name="2">
        <p>我们<b>不会</b>存储或转让您的个人信息以及 cookie。</p>
        <p>不过我们建议妥善保存您的 cookie。您在此处保存的信息若被他人获取有被盗号的风险。</p>
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
          message: 'Session ID 格式不正确',
          validator: validateSessionId,
        }],
      },
    }
  },
  methods: {
    async onSubmit() {
      try {
        await Dialog.confirm({
          title: '风险告知',
          message: '本功能为非正常方式登录，可能存在封号风险，使用本功能即视为使用者本人同意且已明确使用风险，如发生封号等情况与本项目作者无关。建议使用小号进行测试。',
          closeOnPopstate: true,
          cancelButtonText: i18n.t('common.cancel'),
          confirmButtonText: i18n.t('common.confirm'),
        })
        this.loading = true
        const userData = await login(this.sessionIdInput)
        this.$store.commit('setUser', userData)
        this.loading = false
        this.$toast('Session ID 认证成功')
        this.$router.replace({ name: 'Setting' })
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
