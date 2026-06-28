<template>
  <van-dialog
    width="9rem"
    title="☁️ 云同步配置"
    :value="value"
    :show-confirm-button="false"
    :close-on-click-overlay="true"
    @input="$emit('input', $event)"
    @closed="onClosed"
  >
    <div class="sync-dialog-body">
      <!-- 同步服务地址 -->
      <div class="sync-field-group">
        <label class="sync-label">同步服务地址</label>
        <van-field
          v-model="syncUrl"
          placeholder="https://your-api.example.com/api/sync"
          :disabled="loading"
          clearable
        />
      </div>

      <!-- 同步标识 -->
      <div class="sync-field-group">
        <label class="sync-label">
          同步标识
          <span class="sync-label-desc">（用于区分不同的同步空间，与 Pixiv 账户无关）</span>
        </label>
        <van-field
          v-model="syncIdentifier"
          type="text"
          placeholder="输入同步标识（字母数字，至少8位）"
          :disabled="loading"
        />
      </div>

      <!-- 加密密码 -->
      <div class="sync-field-group">
        <label class="sync-label">
          加密密码
          <span class="sync-label-desc">（用于本地加密数据）</span>
        </label>
        <van-field
          v-model="password"
          :type="showPassword ? 'text' : 'password'"
          placeholder="输入加密密码，至少8位"
          :disabled="loading"
          :right-icon="showPassword ? 'eye-o' : 'closed-eye'"
          @click-right-icon="showPassword = !showPassword"
        />
      </div>

      <!-- 双输入提示条 -->
      <div class="sync-blue-notice">
        <span class="sync-blue-notice-icon">📌</span>
        <div class="sync-blue-notice-text">
          <b>同步标识</b>与<b>加密密码</b>共同确定一份同步数据。<br>
          更改其中任何一个，都将定位到不同的存储空间，<br>
          新位置将没有数据，或为另一份同步数据。<br>
          请在所有设备上使用相同的密码和标识进行同步。
        </div>
      </div>

      <!-- 选项 -->
      <div class="sync-options">
        <van-cell center title="记住密码" label="关闭标签页后无需重新输入">
          <template #right-icon>
            <van-switch :value="rememberPassword" size="22" @input="v => rememberPassword = v" />
          </template>
        </van-cell>
        <van-cell center title="启动应用时自动同步" label="打开应用时自动从云端拉取最新数据">
          <template #right-icon>
            <van-switch :value="autoSync" size="22" @input="v => setAutoSync(v)" />
          </template>
        </van-cell>
      </div>

      <!-- 操作按钮 -->
      <div class="sync-actions">
        <van-button
          type="info"
          size="small"
          :loading="loading && action === 'upload'"
          :disabled="!isPasswordValid || !isSyncIdentifierValid || loading"
          @click="onUpload"
        >
          ☁️ 上传到云端
        </van-button>
        <van-button
          type="primary"
          size="small"
          :loading="loading && action === 'download'"
          :disabled="!isPasswordValid || !isSyncIdentifierValid || loading"
          @click="onDownload"
        >
          ☁️ 从云端下载
        </van-button>
        <van-button
          size="small"
          :loading="loading && action === 'info'"
          :disabled="!isPasswordValid || !isSyncIdentifierValid || loading"
          @click="onCheckInfo"
        >
          ℹ️ 查询状态
        </van-button>
      </div>

      <!-- 状态信息 -->
      <div v-if="statusText" class="sync-status">
        {{ statusText }}
      </div>
      <div v-if="lastSyncText" class="sync-status sync-status-muted">
        上次同步: {{ lastSyncText }}
      </div>

      <!-- 安全提示 -->
      <div class="sync-notice">
        <div class="sync-notice-section">
          <strong>🔒 加密说明</strong>
          <ul>
            <li>密码仅用于在浏览器本地加密您的数据，<b>不会被发送到服务器</b></li>
            <li>每次同步均使用 AES-256 加密，服务端仅存储密文</li>
            <li>忘记密码将无法恢复数据，请妥善保管</li>
          </ul>
        </div>
        <div class="sync-notice-section">
          <strong>🛡️ 隐私提醒</strong>
          <ul>
            <li>同步数据包含您的设置与浏览历史，其中可能含有 <b>RefreshToken</b> 等敏感凭据</li>
            <li>如对隐私有较高要求，建议<b>自行部署同步服务</b>以完全掌控数据</li>
            <li>同步标识仅用于区分不同的同步空间，<b>与 Pixiv 账户无关</b>，不会上传到同步服务</li>
          </ul>
        </div>
        <div class="sync-notice-section sync-notice-experimental">
          <strong>⚠️ 实验性功能</strong>
          <ul>
            <li>此同步功能为实验性，不保证稳定可用</li>
            <li>服务端数据可能因维护或故障而遗失</li>
            <li>建议定期使用「导出设置/历史」功能备份到本地文件</li>
          </ul>
        </div>
      </div>
    </div>
  </van-dialog>
</template>

<script>
import { Dialog, Toast } from 'vant'
import SyncManager from '@/utils/sync'

export default {
  name: 'SyncDialog',
  model: {
    prop: 'value',
    event: 'input',
  },
  props: {
    value: { type: Boolean, default: false },
  },
  data() {
    const config = SyncManager.getConfig()
    const savedPassword = SyncManager.getPassword()
    return {
      syncUrl: config.syncUrl || SyncManager.getDefaultSyncUrl(),
      password: savedPassword || '',
      syncIdentifier: config.syncIdentifier || '',
      rememberPassword: !!localStorage.getItem('PXV_SYNC_PASSWORD'),
      autoSync: config.autoSync || false,
      showPassword: false,
      loading: false,
      action: '',
      statusText: '',
      lastSyncText: SyncManager.getLastSyncTimeText() || '',
    }
  },
  computed: {
    isPasswordValid() {
      return this.password && this.password.length >= 8
    },
    isSyncIdentifierValid() {
      return /^[a-zA-Z0-9]{8,}$/.test(this.syncIdentifier)
    },
  },
  methods: {
    async setAutoSync(val) {
      this.autoSync = val
      const config = SyncManager.getConfig()
      SyncManager.saveConfig({ ...config, autoSync: val, syncIdentifier: this.syncIdentifier })
    },
    async onUpload() {
      const message = `将以下数据加密后上传至 <b>${this.syncUrl}</b>：<br><br>• 应用设置（含 RefreshToken 等凭据）<br>• 浏览历史（插画、小说、用户）<br><br>数据将使用 AES-256 加密，服务端仅存储密文。<br><br>⚠️ 如果服务端已有相同同步标识+密码的数据，则将覆盖旧数据。<br>请确认您的同步标识「<b>${this.syncIdentifier}</b>」与加密密码与其他设备一致。<br>是否继续？`
      const confirmed = await Dialog.confirm({
        title: '☁️ 即将上传同步数据',
        message,
        messageAlign: 'left',
      }).catch(() => false)
      if (!confirmed) return

      this.savePasswordIfNeeded()
      this.saveConfig()
      this.loading = true
      this.action = 'upload'
      this.statusText = '正在上传...'
      try {
        const result = await SyncManager.upload(this.password, this.syncIdentifier)
        if (result.ok) {
          this.statusText = '✅ 同步成功！'
          this.lastSyncText = new Date(result.timestamp).toLocaleString()
          if (result.timestamp) {
            localStorage.setItem('PXV_SYNC_LAST_TIMESTAMP', String(result.timestamp))
          }
          Toast.success('上传成功')
        } else {
          this.statusText = `❌ ${result.error}`
          Toast.fail(result.error)
        }
      } catch (e) {
        this.statusText = `❌ ${e.message}`
        Toast.fail(e.message)
      }
      this.loading = false
      this.action = ''
    },
    async onDownload() {
      const message = `将使用本地密码解密并覆盖当前：<br><br>• 应用设置<br>• 浏览历史<br><br>⚠️ 当前本地数据将被云端数据替换。<br>请确认您的同步标识「<b>${this.syncIdentifier}</b>」与加密密码与其他设备一致，<br>以确保下载到的是正确的同步数据。<br>是否继续？`
      const confirmed = await Dialog.confirm({
        title: '☁️ 即将从云端下载同步数据',
        message,
        messageAlign: 'left',
      }).catch(() => false)
      if (!confirmed) return

      this.savePasswordIfNeeded()
      this.saveConfig()
      this.loading = true
      this.action = 'download'
      this.statusText = '正在下载...'
      try {
        const result = await SyncManager.download(this.password, this.syncIdentifier)
        if (result.ok) {
          if (result.noUpdate) {
            this.statusText = 'ℹ️ 云端无新数据'
            Toast('云端无新数据')
          } else {
            this.statusText = '✅ 下载成功，即将刷新！'
            Toast.success('下载成功，即将刷新')
            setTimeout(() => location.reload(), 1500)
          }
          if (result.timestamp) {
            this.lastSyncText = new Date(result.timestamp).toLocaleString()
          }
        } else {
          this.statusText = `❌ ${result.error}`
          Toast.fail(result.error)
        }
      } catch (e) {
        this.statusText = `❌ ${e.message}`
        Toast.fail(e.message)
      }
      this.loading = false
      this.action = ''
    },
    async onCheckInfo() {
      this.saveConfig()
      this.loading = true
      this.action = 'info'
      this.statusText = '正在查询...'
      try {
        const info = await SyncManager.checkInfo(this.password, this.syncIdentifier)
        if (info) {
          const date = new Date(info.timestamp).toLocaleString()
          this.statusText = `ℹ️ 服务端数据: ${date} | 大小: ${(info.size / 1024).toFixed(1)}KB`
        } else if (info === null) {
          this.statusText = 'ℹ️ 该同步标识在服务端无数据'
          Toast('该同步标识在服务端无数据')
        }
      } catch (e) {
        this.statusText = '⚠️ 无法连接到同步服务'
        Toast.fail('无法连接到同步服务')
      }
      this.loading = false
      this.action = ''
    },
    savePasswordIfNeeded() {
      if (this.password) {
        SyncManager.savePassword(this.password, this.rememberPassword)
      }
    },
    saveConfig() {
      if (this.syncUrl) {
        const config = SyncManager.getConfig()
        SyncManager.saveConfig({ ...config, syncUrl: this.syncUrl, syncIdentifier: this.syncIdentifier, autoSync: this.autoSync })
      }
    },
    onClosed() {
      this.statusText = ''
    },
  },
}
</script>

<style lang="stylus" scoped>
.sync-dialog-body
  padding 16px
  max-height 70vh
  overflow-y auto

.sync-field-group
  margin-bottom 12px

.sync-label
  display block
  font-size 13px
  color #666
  margin-bottom 4px
  padding 0 16px

.sync-label-desc
  font-size 11px
  color #999

.sync-options
  margin 8px 0
  .van-cell
    padding 10px 0

.sync-actions
  display flex
  justify-content center
  gap 10px
  margin 16px 0

.sync-status
  text-align center
  font-size 13px
  color #333
  margin 8px 0

.sync-status-muted
  color #999
  font-size 12px

.sync-notice
  margin-top 16px
  padding 12px
  background #f8f8f8
  border-radius 6px
  font-size 12px
  color #666
  line-height 1.6

  .sync-notice-section
    margin-bottom 10px
    &:last-child
      margin-bottom 0

  ul
    margin 4px 0 0
    padding-left 16px

  strong
    color #333

.sync-blue-notice
  display flex
  align-items flex-start
  gap 6px
  margin 4px 0 12px
  padding 8px 12px
  background #e8f4fd
  border-radius 6px
  font-size 12px
  line-height 1.6
  color #0056b3
  text-align left

.sync-blue-notice-icon
  flex-shrink 0
  font-size 14px

.sync-blue-notice-text
  flex 1

.sync-notice-experimental
  background #fff8e1
  border-radius 6px
  padding 8px 12px
</style>
