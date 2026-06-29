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

      <!-- 同步范围 -->
      <div class="sync-scope">
        <van-checkbox-group v-model="syncScope">
          <van-checkbox name="all" shape="round" @change="onScopeChangeAll">
            全部同步
          </van-checkbox>
          <van-checkbox
            name="history"
            shape="round"
            :disabled="syncScope.includes('all')"
          >
            浏览/搜索历史
          </van-checkbox>
          <van-checkbox
            name="blocks"
            shape="round"
            :disabled="syncScope.includes('all')"
          >
            标签/作者屏蔽
          </van-checkbox>
        </van-checkbox-group>
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
          上传到云端
        </van-button>
        <van-button
          type="primary"
          size="small"
          :loading="loading && action === 'download'"
          :disabled="!isPasswordValid || !isSyncIdentifierValid || loading"
          @click="onDownload"
        >
          从云端下载
        </van-button>
        <van-button
          size="small"
          :loading="loading && action === 'info'"
          :disabled="!isPasswordValid || !isSyncIdentifierValid || loading"
          @click="onCheckInfo"
        >
          查询状态
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
            <li>每次同步均使用 AES-256 加密，云端仅存储密文</li>
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
            <li>云端数据可能因维护或故障而遗失</li>
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
      showPassword: false,
      loading: false,
      action: '',
      statusText: '',
      lastSyncText: SyncManager.getLastSyncTimeText() || '',
      syncScope: ['all'],
    }
  },
  computed: {
    isPasswordValid() {
      return this.password && this.password.length >= 8
    },
    isSyncIdentifierValid() {
      return /^[a-zA-Z0-9]{8,}$/.test(this.syncIdentifier)
    },
    syncOptions() {
      const all = this.syncScope.includes('all')
      return {
        all,
        history: all || this.syncScope.includes('history'),
        blocks: all || this.syncScope.includes('blocks'),
      }
    },
  },
  methods: {
    onScopeChangeAll(checked) {
      if (checked) {
        this.syncScope = ['all']
      }
    },
    async onUpload() {
      const scopeLabel = this.syncScope.includes('all')
        ? '全部数据'
        : [this.syncScope.includes('history') ? '历史记录' : '',
            this.syncScope.includes('blocks') ? '屏蔽配置' : ''].filter(Boolean).join('、')
      const message = `将以下数据加密后上传至 <b>${this.syncUrl}</b>：<br><br>• <b>${scopeLabel}</b><br><br>数据将使用 AES-256 加密，云端仅存储密文。<br><br>⚠️ 如果云端已有相同同步标识+密码的数据，${this.syncScope.includes('all') ? '则将覆盖旧数据。' : '则将合并所选数据。'}<br>请确认您的同步标识「<b>${this.syncIdentifier}</b>」与加密密码与其他设备一致。<br>是否继续？`
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
        const result = await SyncManager.upload(this.password, this.syncIdentifier, this.syncOptions)
        if (result.conflict) {
          const date = new Date(result.serverTimestamp).toLocaleString()
          this.statusText = `⚠️ 同步冲突：云端有更新的数据（${date}），请先下载再上传`
          Toast.fail('同步冲突：云端数据更新')
        } else if (result.ok) {
          this.statusText = '✅ 同步成功！'
          this.lastSyncText = new Date(result.timestamp).toLocaleString()
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
      this.savePasswordIfNeeded()
      this.saveConfig()

      if (this.syncScope.includes('all')) {
        // Conflict detection: check if cloud has newer data
        const info = await SyncManager.checkInfo(this.password, this.syncIdentifier)
        if (info && info.timestamp) {
          const lastTs = SyncManager.getLastTimestamp()
          if (lastTs && Number(info.timestamp) > Number(lastTs)) {
            const date = new Date(info.timestamp).toLocaleString()
            const confirmed = await Dialog.confirm({
              title: '☁️ 检测到云端更新',
              message: `云端数据（${date}）比上次同步更新。下载将合并浏览历史，云端设置会覆盖本地设置。是否继续？`,
              messageAlign: 'left',
            }).catch(() => false)
            if (!confirmed) return
          }
        }
      }

      const scopeParts = []
      if (this.syncScope.includes('all')) {
        scopeParts.push('<b>全部数据</b>：设置、历史记录、屏蔽配置')
      } else {
        if (this.syncScope.includes('history')) {
          scopeParts.push('<b>浏览历史与搜索历史</b>：与云端记录合并去重')
        }
        if (this.syncScope.includes('blocks')) {
          scopeParts.push('<b>屏蔽配置</b>：与云端合并（标签屏蔽 + 作者屏蔽）')
        }
      }
      const message = `将使用本地密码解密并同步以下数据：<br><br>${scopeParts.join('<br>')}<br><br>⚠️ 请确认您的同步标识「<b>${this.syncIdentifier}</b>」与加密密码与其他设备一致，<br>以确保下载到的是正确的同步数据。<br>是否继续？`
      const confirmed = await Dialog.confirm({
        title: '☁️ 即将从云端下载同步数据',
        message,
        messageAlign: 'left',
      }).catch(() => false)
      if (!confirmed) return

      this.loading = true
      this.action = 'download'
      this.statusText = '正在下载...'
      try {
        const result = await SyncManager.download(this.password, this.syncIdentifier, this.syncOptions)
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
          this.statusText = `ℹ️ 云端数据: ${date} | 大小: ${(info.size / 1024).toFixed(1)}KB`
        } else if (info === null) {
          this.statusText = 'ℹ️ 该同步标识在云端无数据'
          Toast('该同步标识在云端无数据')
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
        SyncManager.saveConfig({ ...config, syncUrl: this.syncUrl, syncIdentifier: this.syncIdentifier })
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
  padding 16PX
  max-height 70vh
  overflow-y auto

.sync-field-group
  margin-bottom 12PX

.sync-label
  display block
  font-size 13PX
  color #666
  margin-bottom 4PX
  padding 0 16PX

.sync-label-desc
  font-size 11PX
  color #999

.sync-options
  margin 8PX 0
  .van-cell
    padding 10PX 0

.sync-actions
  display flex
  justify-content center
  gap 10PX
  margin 16PX 0

.sync-status
  text-align center
  font-size 13PX
  color #333
  margin 8PX 0

.sync-status-muted
  color #999
  font-size 12PX

.sync-notice
  margin-top 16PX
  padding 12PX
  background #f8f8f8
  border-radius 6PX
  font-size 12PX
  color #666
  line-height 1.6

  .sync-notice-section
    margin-bottom 10PX
    &:last-child
      margin-bottom 0

  ul
    margin 4PX 0 0
    padding-left 16PX

  strong
    color #333

.sync-blue-notice
  display flex
  align-items flex-start
  gap 6PX
  margin 4PX 0 12PX
  padding 8PX 12PX
  background #e8f4fd
  border-radius 6PX
  font-size 12PX
  line-height 1.6
  color #0056b3
  text-align left

.sync-blue-notice-icon
  flex-shrink 0
  font-size 14PX

.sync-blue-notice-text
  flex 1

.sync-notice-experimental
  background #fff8e1
  border-radius 6PX
  padding 8PX 12PX

.sync-scope
  margin 12PX 0
  ::v-deep
    .van-checkbox-group
      display flex
      justify-content center
      align-items center
      flex-wrap wrap
      gap 10PX
    .van-checkbox
      margin 6PX 0
      .van-checkbox__label
        margin-left 5PX
        font-size 13PX
</style>
<style lang="stylus">
.dark
  .sync-notice,
  .sync-blue-notice,
  .sync-notice-experimental
    background #333
    color #fff
  .sync-notice-experimental
    padding 0
  .sync-status,
  .sync-notice strong,
  .van-checkbox__label
    color #fff !important
</style>
