import CryptoJS from 'crypto-js'
import localDb from '@/utils/storage/localDb'
import { getCache, setCache } from '@/utils/storage/siteCache'

const STORAGE_KEY_CONFIG = 'PXV_SYNC_CONFIG'
const STORAGE_KEY_PASSWORD = 'PXV_SYNC_PASSWORD'
const SYNC_SALT = 'pixiv-sync-v1'
const PBKDF2_ITERATIONS = 100000
const SYNC_VERSION = 2

class SyncManager {
  static getConfig() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CONFIG)
      if (raw) return JSON.parse(raw)
    } catch (e) { /* ignore */ }
    return { syncUrl: '', autoSync: false }
  }

  static saveConfig(config) {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config))
  }

  static getPassword() {
    return localStorage.getItem(STORAGE_KEY_PASSWORD)
      || sessionStorage.getItem(STORAGE_KEY_PASSWORD)
  }

  static savePassword(password, remember = false) {
    const storage = remember ? localStorage : sessionStorage
    storage.setItem(STORAGE_KEY_PASSWORD, password)
  }

  static clearPassword() {
    localStorage.removeItem(STORAGE_KEY_PASSWORD)
    sessionStorage.removeItem(STORAGE_KEY_PASSWORD)
  }

  static deriveKeys(password) {
    const derivation = CryptoJS.PBKDF2(password, SYNC_SALT, {
      keySize: 512 / 32,
      iterations: PBKDF2_ITERATIONS,
      hasher: CryptoJS.algo.SHA256,
    })
    const words = derivation.words
    const encKey = CryptoJS.lib.WordArray.create(words.slice(0, 8)).toString()
    const syncKey = CryptoJS.lib.WordArray.create(words.slice(8, 16)).toString()
    return { encKey, syncKey }
  }

  static encrypt(data, key) {
    return CryptoJS.AES.encrypt(JSON.stringify(data), key).toString()
  }

  static decrypt(ciphertext, key) {
    try {
      const bytes = CryptoJS.AES.decrypt(ciphertext, key)
      const str = bytes.toString(CryptoJS.enc.Utf8)
      if (!str) return null
      return JSON.parse(str)
    } catch (e) {
      console.error('Decryption failed:', e)
      return null
    }
  }

  static gatherSettings() {
    const settings = {}
    const len = localStorage.length
    for (let i = 0; i < len; i++) {
      const key = localStorage.key(i)
      settings[key] = localStorage.getItem(key)
    }
    return settings
  }

  static async gatherHistory() {
    const [illusts, novels, users] = await Promise.all([
      getCache('illusts.history'),
      getCache('novels.history'),
      getCache('users.history'),
    ])
    return {
      illusts: illusts || [],
      novels: novels || [],
      users: users || [],
    }
  }

  static applySettings(settings) {
    if (!settings || typeof settings !== 'object') return
    Object.keys(settings).forEach(k => {
      localStorage.setItem(k, settings[k])
    })
  }

  static async applyHistory(history) {
    if (!history) return
    const keys = ['illusts.history', 'novels.history', 'users.history']
    const values = [history.illusts, history.novels, history.users]
    await Promise.all(values.map((arr, i) => {
      if (Array.isArray(arr)) return setCache(keys[i], arr)
    }))
  }

  static getDefaultSyncUrl() {
    const baseUrl = process.env.VUE_APP_PXVEAPI_MAIN || ''
    return baseUrl ? `${baseUrl}/sync` : ''
  }

  static async upload(password) {
    const config = this.getConfig()
    if (!config.syncUrl) {
      return { ok: false, error: '请先配置同步服务地址' }
    }
    if (!password) {
      return { ok: false, error: '请输入加密密码' }
    }

    const { encKey, syncKey } = this.deriveKeys(password)
    const settings = this.gatherSettings()
    const history = await this.gatherHistory()

    const encryptedSettings = this.encrypt(settings, encKey)
    const encryptedHistory = this.encrypt(history, encKey)

    try {
      const res = await fetch(`${config.syncUrl}/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sync-Key': syncKey,
        },
        body: JSON.stringify({
          settings: encryptedSettings,
          history: encryptedHistory,
          timestamp: Date.now(),
          version: SYNC_VERSION,
        }),
      })
      if (!res.ok) {
        return { ok: false, error: `上传失败: HTTP ${res.status}` }
      }
      const data = await res.json()
      return { ok: true, timestamp: data.timestamp }
    } catch (e) {
      return { ok: false, error: `网络错误: ${e.message}` }
    }
  }

  static async download(password) {
    const config = this.getConfig()
    if (!config.syncUrl) {
      return { ok: false, error: '请先配置同步服务地址' }
    }
    if (!password) {
      return { ok: false, error: '请输入加密密码' }
    }

    const { encKey, syncKey } = this.deriveKeys(password)

    try {
      let url = `${config.syncUrl}/download`
      const info = await this.checkInfo()
      const lastTimestamp = localStorage.getItem('PXV_SYNC_LAST_TIMESTAMP')
      if (lastTimestamp && info && info.timestamp) {
      }

      const res = await fetch(url, {
        headers: { 'X-Sync-Key': syncKey },
      })
      if (res.status === 304) {
        return { ok: true, noUpdate: true }
      }
      if (!res.ok) {
        return { ok: false, error: `下载失败: HTTP ${res.status}` }
      }
      const data = await res.json()

      const settings = this.decrypt(data.settings, encKey)
      const history = this.decrypt(data.history, encKey)

      if (!settings || !history) {
        return { ok: false, error: '解密失败，密码可能不正确' }
      }

      this.applySettings(settings)
      await this.applyHistory(history)

      if (data.timestamp) {
        localStorage.setItem('PXV_SYNC_LAST_TIMESTAMP', String(data.timestamp))
      }

      return { ok: true, timestamp: data.timestamp }
    } catch (e) {
      return { ok: false, error: `网络错误: ${e.message}` }
    }
  }

  static async checkInfo() {
    const config = this.getConfig()
    if (!config.syncUrl) return null

    try {
      const res = await fetch(`${config.syncUrl}/info`, {
        headers: { 'X-Sync-Key': 'check' },
      })
      if (!res.ok) return null
      return await res.json()
    } catch (e) {
      return null
    }
  }

  static getLastSyncTimeText() {
    const ts = localStorage.getItem('PXV_SYNC_LAST_TIMESTAMP')
    if (!ts) return ''
    try {
      const d = new Date(Number(ts))
      return d.toLocaleString()
    } catch (e) {
      return ''
    }
  }

  static async autoSync() {
    const config = this.getConfig()
    if (!config.autoSync) return
    const password = this.getPassword()
    if (!password) return
    try {
      const result = await this.download(password)
      if (result.ok) {
        console.log('Auto-sync completed:', result.timestamp ? new Date(result.timestamp).toLocaleString() : 'no update')
      }
    } catch (e) {
      console.log('Auto-sync skipped:', e.message)
    }
  }
}

export default SyncManager
