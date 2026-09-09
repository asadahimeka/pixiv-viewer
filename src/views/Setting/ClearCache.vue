<template>
  <div class="setting-page">
    <top-bar id="top-bar-wrap" />
    <h3 class="af_title">{{ $t('cache.title') }}</h3>
    <div class="setting-cell-group">
      <van-cell center :title="$t('cache.db')">
        <template #label>
          <span>{{ $t('cache.records', [size.db[1]]) }} ~ {{ size.db[0] | bytes }}</span>
        </template>
        <template #right-icon>
          <van-button type="info" size="small" @click="clearCache('db')">
            <span>{{ $t('cache.clear') }}</span>
          </van-button>
        </template>
      </van-cell>
      <van-cell center :title="$t('cache.local')">
        <template #label>
          <span>{{ $t('cache.records', [size.local[1]]) }} ~ {{ size.local[0] | bytes }}</span>
        </template>
        <template #right-icon>
          <van-button size="small" color="linear-gradient(to right, #ff6034, #ee0a24)" @click="clearCache('local')">
            <span>{{ $t('cache.clear') }}</span>
          </van-button>
        </template>
      </van-cell>
      <van-cell center :title="$t('cache.session')">
        <template #label>
          <span>{{ $t('cache.records', [size.session[1]]) }} ~ {{ size.session[0] | bytes }}</span>
        </template>
        <template #right-icon>
          <van-button type="primary" size="small" @click="clearCache('session')">
            <span>{{ $t('cache.clear') }}</span>
          </van-button>
        </template>
      </van-cell>
      <template v-if="showClearTransate">
        <van-cell center title="清除小说翻译缓存">
          <template #right-icon>
            <van-button type="info" size="small" @click="clearNovelTransCache">
              <span>{{ $t('cache.clear') }}</span>
            </van-button>
          </template>
        </van-cell>
        <van-cell center title="清除漫画翻译缓存">
          <template #right-icon>
            <van-button type="info" size="small" @click="clearMangaTransCache">
              <span>{{ $t('cache.clear') }}</span>
            </van-button>
          </template>
        </van-cell>
        <van-cell center title="清除漫画翻译管线模型缓存">
          <template #right-icon>
            <van-button type="info" size="small" @click="clearShinobuModelCache">
              <span>{{ $t('cache.clear') }}</span>
            </van-button>
          </template>
        </van-cell>
      </template>
      <van-cell center :title="$t('cache.pxcl')">
        <template #right-icon>
          <van-button type="info" size="small" @click="clearPxclCache">
            <span>{{ $t('cache.clear') }}</span>
          </van-button>
        </template>
      </van-cell>
    </div>
  </div>
</template>

<script>
import localforage from 'localforage'
import { Dialog } from '@/lib/vant-apis'
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
  data() {
    return {
      size: {
        db: [0, 0],
        local: [0, 0],
        session: [0, 0],
      },
      showClearTransate: i18n.locale.includes('zh'),
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
      this.size.local = [LocalStorage.size(), localStorage.length]
      this.size.session = [SessionStorage.size(), sessionStorage.length]
      this.size.db = [
        (await navigator.storage.estimate()).usage,
        await localDb.length(),
      ]
    },
    async showConfirm(message = this.$t('cache.confirm_default')) {
      try {
        await Dialog.confirm({
          message,
          confirmButtonColor: 'black',
          cancelButtonColor: '#1989fa',
          closeOnPopstate: true,
          confirmButtonText: this.$t('common.confirm'),
          cancelButtonText: this.$t('common.cancel'),
        })
        return false
      } catch (err) {
        return true
      }
    },
    async clearCache(type) {
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
      if (await this.showConfirm(message)) return

      window.umami?.track('clear_cache', { type })
      if (type === 'db') {
        await localDb.clear()
        const cacheKeys = await caches.keys()
        await Promise.all(cacheKeys.map(key => caches.delete(key)))
        await this.clearShinobuModelCache(true)
        await this.clearPxclCache(true)
      }
      if (type === 'local') LocalStorage.clear()
      if (type === 'session') SessionStorage.clear()

      this.calcCacheSize()
      this.$toast.success(this.$t('cache.success_tip'))
    },
    async clearNovelTransCache() {
      if (await this.showConfirm()) return
      window.umami?.track('clear_cache', { type: 'novel_translate' })
      try {
        const keys = await localDb.keys()
        for (const key of keys) {
          if (key.startsWith('novel.translate.')) {
            await localDb.remove(key)
          }
        }
        this.$toast.success(this.$t('cache.cleared'))
      } catch (err) {
        this.$toast(this.$t('cache.clear_fail', [err.message]))
      }
    },
    async clearMangaTransCache() {
      if (await this.showConfirm()) return
      window.umami?.track('clear_cache', { type: 'manga_translate' })
      try {
        const keys = await localDb.keys()
        for (const key of keys) {
          if (key.startsWith('pic.translate.')) {
            await localDb.remove(key)
          }
        }
        this.$toast.success(this.$t('cache.cleared'))
      } catch (err) {
        this.$toast(this.$t('cache.clear_fail', [err.message]))
      }
    },
    async clearShinobuModelCache(silent) {
      if (silent !== true && await this.showConfirm()) return
      window.umami?.track('clear_cache', { type: 'shinobu_model' })
      try {
        const modelDb = localforage.createInstance({ name: 'shinobu-models', storeName: 'models' })
        await modelDb.clear()
        silent !== true && this.$toast.success(this.$t('cache.cleared'))
      } catch (err) {
        silent !== true && this.$toast(this.$t('cache.clear_fail', [err.message]))
      }
    },
    async clearPxclCache(silent) {
      if (silent !== true && await this.showConfirm(this.$t('cache.confirm_pxcl'))) return
      window.umami?.track('clear_cache', { type: 'pxcl' })
      try {
        const pxclDb = localforage.createInstance({ name: 'pxcl-store' })
        await pxclDb.clear()
        silent !== true && this.$toast.success(this.$t('cache.cleared'))
      } catch (err) {
        silent !== true && this.$toast(this.$t('cache.clear_fail', [err.message]))
      }
    },
  },
}
</script>

<style lang="stylus" scoped>

</style>
