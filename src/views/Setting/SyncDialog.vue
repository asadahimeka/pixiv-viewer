<template>
  <van-dialog
    width="9rem"
    :title="$t('sync.title')"
    :value="value"
    :show-confirm-button="false"
    :close-on-click-overlay="true"
    @input="$emit('input', $event)"
    @closed="onClosed"
  >
    <div class="sync-dialog-body">
      <!-- 同步服务地址 -->
      <div class="sync-field-group">
        <label class="sync-label">{{ $t('sync.address') }}</label>
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
          {{ $t('sync.identifier') }}
          <span class="sync-label-desc">{{ $t('sync.identifier_desc') }}</span>
        </label>
        <van-field
          v-model="syncIdentifier"
          type="text"
          :placeholder="$t('sync.identifier_ph')"
          :disabled="loading"
        />
      </div>

      <!-- 加密密码 -->
      <div class="sync-field-group">
        <label class="sync-label">
          {{ $t('sync.password') }}
          <span class="sync-label-desc">{{ $t('sync.password_desc') }}</span>
        </label>
        <van-field
          v-model="password"
          :type="showPassword ? 'text' : 'password'"
          :placeholder="$t('sync.password_ph')"
          :disabled="loading"
          :right-icon="showPassword ? 'eye-o' : 'closed-eye'"
          @click-right-icon="showPassword = !showPassword"
        />
      </div>

      <!-- 双输入提示条 -->
      <div class="sync-blue-notice">
        <span class="sync-blue-notice-icon">📌</span>
        <div class="sync-blue-notice-text" v-html="dualNoticeText"></div>
      </div>

      <!-- 同步范围 -->
      <div class="sync-scope">
        <van-checkbox-group v-model="syncScope">
          <van-checkbox name="all" shape="round" @change="onScopeChangeAll">
            {{ $t('sync.scope_all') }}
          </van-checkbox>
          <van-checkbox
            name="history"
            shape="round"
            :disabled="syncScope.includes('all')"
          >
            {{ $t('sync.scope_history') }}
          </van-checkbox>
          <van-checkbox
            name="blocks"
            shape="round"
            :disabled="syncScope.includes('all')"
          >
            {{ $t('sync.scope_blocks') }}
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
          {{ $t('sync.upload_btn') }}
        </van-button>
        <van-button
          type="primary"
          size="small"
          :loading="loading && action === 'download'"
          :disabled="!isPasswordValid || !isSyncIdentifierValid || loading"
          @click="onDownload"
        >
          {{ $t('sync.download_btn') }}
        </van-button>
        <van-button
          size="small"
          :loading="loading && action === 'info'"
          :disabled="!isPasswordValid || !isSyncIdentifierValid || loading"
          @click="onCheckInfo"
        >
          {{ $t('sync.check_btn') }}
        </van-button>
      </div>

      <!-- 状态信息 -->
      <div v-if="statusText" class="sync-status">
        {{ statusText }}
      </div>
      <div v-if="lastSyncText" class="sync-status sync-status-muted">
        {{ $t('sync.last_sync', [lastSyncText]) }}
      </div>

      <!-- 安全提示 -->
      <div class="sync-notice">
        <div class="sync-notice-section">
          <strong>{{ $t('sync.enc_title') }}</strong>
          <ul>
            <li v-html="$t('sync.enc_1')"></li>
            <li v-html="$t('sync.enc_2')"></li>
            <li v-html="$t('sync.enc_3')"></li>
          </ul>
        </div>
        <div class="sync-notice-section">
          <strong>{{ $t('sync.priv_title') }}</strong>
          <ul>
            <li v-html="$t('sync.priv_1')"></li>
            <li v-html="$t('sync.priv_2')"></li>
            <li v-html="$t('sync.priv_3')"></li>
          </ul>
        </div>
        <div class="sync-notice-section sync-notice-experimental">
          <strong>{{ $t('sync.exp_title') }}</strong>
          <ul>
            <li v-html="$t('sync.exp_1')"></li>
            <li v-html="$t('sync.exp_2')"></li>
            <li v-html="$t('sync.exp_3')"></li>
          </ul>
        </div>
      </div>
    </div>
  </van-dialog>
</template>

<script>
import { Dialog, Toast } from '@/lib/vant-apis'
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
    dualNoticeText() {
      return ['sync.dual_1', 'sync.dual_2', 'sync.dual_3', 'sync.dual_4']
        .map(key => this.$t(key))
        .join('<br>')
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
      window.umami?.track('settings-sync-upload')
      const scopeLabel = this.syncScope.includes('all')
        ? this.$t('sync.data_all')
        : [this.syncScope.includes('history') ? this.$t('sync.data_history') : '',
            this.syncScope.includes('blocks') ? this.$t('sync.data_blocks') : ''].filter(Boolean).join(this.$t('sync.scope_joiner'))
      const conflictText = this.syncScope.includes('all') ? this.$t('sync.upload_overwrite') : this.$t('sync.upload_merge')
      const message = [
        this.$t('sync.upload_msg_head', [this.syncUrl, scopeLabel]),
        this.$t('sync.upload_conflict_warn', [conflictText]),
        this.$t('sync.confirm_identifier', [this.syncIdentifier]),
        this.$t('sync.confirm_end'),
      ].join('<br>')
      const confirmed = await Dialog.confirm({
        title: this.$t('sync.upload_title'),
        message,
        messageAlign: 'left',
      }).catch(() => false)
      if (!confirmed) return

      this.savePasswordIfNeeded()
      this.saveConfig()
      this.loading = true
      this.action = 'upload'
      this.statusText = this.$t('sync.uploading')
      try {
        const result = await SyncManager.upload(this.password, this.syncIdentifier, this.syncOptions)
        if (result.conflict) {
          const date = new Date(result.serverTimestamp).toLocaleString()
          this.statusText = this.$t('sync.conflict_status', [date])
          Toast.fail(this.$t('sync.conflict_toast'))
        } else if (result.ok) {
          this.statusText = this.$t('sync.ok_status')
          this.lastSyncText = new Date(result.timestamp).toLocaleString()
          Toast.success(this.$t('sync.upload_ok'))
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
      window.umami?.track('settings-sync-download')
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
              title: this.$t('sync.cloud_newer_title'),
              message: this.$t('sync.cloud_newer_msg', [date]),
              messageAlign: 'left',
            }).catch(() => false)
            if (!confirmed) return
          }
        }
      }

      const scopeParts = []
      if (this.syncScope.includes('all')) {
        scopeParts.push(this.$t('sync.dl_scope_all'))
      } else {
        if (this.syncScope.includes('history')) {
          scopeParts.push(this.$t('sync.dl_scope_history'))
        }
        if (this.syncScope.includes('blocks')) {
          scopeParts.push(this.$t('sync.dl_scope_blocks'))
        }
      }
      const message = [
        this.$t('sync.download_msg_head'),
        scopeParts.join('<br>'),
        this.$t('sync.confirm_identifier_dl', [this.syncIdentifier]),
        this.$t('sync.confirm_end'),
      ].join('<br><br>')
      const confirmed = await Dialog.confirm({
        title: this.$t('sync.download_title'),
        message,
        messageAlign: 'left',
      }).catch(() => false)
      if (!confirmed) return

      this.loading = true
      this.action = 'download'
      this.statusText = this.$t('sync.downloading')
      try {
        const result = await SyncManager.download(this.password, this.syncIdentifier, this.syncOptions)
        if (result.ok) {
          if (result.noUpdate) {
            this.statusText = this.$t('sync.no_update_status')
            Toast(this.$t('sync.no_update_toast'))
          } else {
            this.statusText = this.$t('sync.dl_ok_status')
            Toast.success(this.$t('sync.dl_ok_toast'))
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
      window.umami?.track('settings-sync-checkInfo')
      this.saveConfig()
      this.loading = true
      this.action = 'info'
      this.statusText = this.$t('sync.checking')
      try {
        const info = await SyncManager.checkInfo(this.password, this.syncIdentifier)
        if (info) {
          const date = new Date(info.timestamp).toLocaleString()
          this.statusText = this.$t('sync.info_status', [date, (info.size / 1024).toFixed(1)])
        } else if (info === null) {
          this.statusText = this.$t('sync.no_cloud_data')
          Toast(this.$t('sync.no_cloud_data'))
        }
      } catch (e) {
        this.statusText = this.$t('sync.connect_fail')
        Toast.fail(this.$t('sync.connect_fail'))
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
