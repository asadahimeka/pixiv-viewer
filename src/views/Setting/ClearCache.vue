<template>
  <div class="setting-page">
    <top-bar id="top-bar-wrap" />
    <h3 class="af_title">{{ $t('cache.title') }}</h3>
    <van-cell center :title="$t('cache.db')">
      <template #label>
        <span>{{ $t('cache.records', [size.db[1]]) }} ~ {{ size.db[0] | bytes }}</span>
      </template>
      <template #right-icon>
        <van-button type="info" size="small" @click="clearCache('db')">
          <span data-umami-event="clear_db_cache">{{ $t('cache.clear') }}</span>
        </van-button>
      </template>
    </van-cell>
    <van-cell center :title="$t('cache.local')">
      <template #label>
        <span>{{ $t('cache.records', [size.local[1]]) }} ~ {{ size.local[0] | bytes }}</span>
      </template>
      <template #right-icon>
        <van-button size="small" color="linear-gradient(to right, #ff6034, #ee0a24)" @click="clearCache('local')">
          <span data-umami-event="clear_local_cache">{{ $t('cache.clear') }}</span>
        </van-button>
      </template>
    </van-cell>
    <van-cell center :title="$t('cache.session')">
      <template #label>
        <span>{{ $t('cache.records', [size.session[1]]) }} ~ {{ size.session[0] | bytes }}</span>
      </template>
      <template #right-icon>
        <van-button type="primary" size="small" @click="clearCache('session')">
          <span data-umami-event="clear_session_cache">{{ $t('cache.clear') }}</span>
        </van-button>
      </template>
    </van-cell>
  </div>
</template>

<script>
import { Dialog } from 'vant'
import { LocalStorage, SessionStorage } from '@/utils/storage'
import localDb from '@/utils/storage/localDb'
import { i18n } from '@/i18n'

export default {
  name: 'SettingClearCache',
  filters: {
    bytes(bytes) {
      bytes = Number(bytes)
      if (!bytes) return '0 B'

      const k = 1024
      const dm = 1
      const sizes = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB']

      const i = Math.floor(Math.log(bytes) / Math.log(k))
      const n = parseFloat((bytes / Math.pow(k, i)).toFixed(dm))

      return `${i18n.locale.includes('zh') ? n : n.toLocaleString(i18n.locale)} ${sizes[i]}`
    },
  },
  components: {
  },
  data() {
    return {
      size: {
        db: [0, 0],
        local: [0, 0],
        session: [0, 0],
      },
    }
  },
  head() {
    return { title: this.$t('cache.title') }
  },
  activated() {
    this.calcCacheSize()
  },
  methods: {
    async calcCacheSize() {
      this.size.local = [LocalStorage.size, localStorage.length]
      this.size.session = [SessionStorage.size, sessionStorage.length]
      this.size.db = [
        (await navigator.storage.estimate()).usage,
        await localDb.length(),
      ]
    },
    clearCache(type) {
      let showName
      switch (type) {
        case 'db':
          showName = this.$t('cache.db')
          break
        case 'local':
          showName = this.$t('cache.local')
          break
        case 'session':
          showName = this.$t('cache.session')
          break
        default:
          break
      }
      let message = this.$t('cache.confirm.first', [showName])
      if (type == 'db') message += this.$t('cache.confirm.second')
      if (type == 'local') message += this.$t('a1HSQm-WYv6GDFwhKr9x_')
      Dialog.confirm({
        message,
        confirmButtonColor: 'black',
        cancelButtonColor: '#1989fa',
        closeOnPopstate: true,
        confirmButtonText: this.$t('common.confirm'),
        cancelButtonText: this.$t('common.cancel'),
      }).then(async () => {
        if (type === 'db') {
          await localDb.clear()
          const keyList = await caches.keys()
          await Promise.all(keyList.map(async key => {
            await caches.delete(key)
          }))
        }
        if (type === 'local') LocalStorage.clear()
        if (type === 'session') SessionStorage.clear()

        this.calcCacheSize()
        this.$toast.success(this.$t('cache.success_tip'))
      })
    },
  },
}
</script>

<style lang="stylus" scoped>

</style>
