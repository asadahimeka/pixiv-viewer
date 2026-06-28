import CryptoJS from 'crypto-js'
import { getCache, setCache } from '@/utils/storage/siteCache'
import { PIXIV_NEXT_URL } from '@/consts'

const STORAGE_KEY_CONFIG = 'PXV_SYNC_CONFIG'
const STORAGE_KEY_PASSWORD = 'PXV_SYNC_PASSWORD'
const SYNC_SALT = 'pixiv-sync-v1'
const PBKDF2_ITERATIONS = 100000
const SYNC_VERSION = 3

class SyncManager {
  static getConfig() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CONFIG)
      if (raw) return JSON.parse(raw)
    } catch (e) { /* ignore */ }
    return { syncUrl: '', autoSync: false, syncIdentifier: '' }
  }

  static saveConfig(config) {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config))
  }

  static getPassword() {
    return localStorage.getItem(STORAGE_KEY_PASSWORD) ||
      sessionStorage.getItem(STORAGE_KEY_PASSWORD)
  }

  static savePassword(password, remember = false) {
    const storage = remember ? localStorage : sessionStorage
    storage.setItem(STORAGE_KEY_PASSWORD, password)
  }

  static clearPassword() {
    localStorage.removeItem(STORAGE_KEY_PASSWORD)
    sessionStorage.removeItem(STORAGE_KEY_PASSWORD)
  }

  static async deriveEncKey(password) {
    try {
      const enc = new TextEncoder()
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        enc.encode(password),
        'PBKDF2',
        false,
        ['deriveBits']
      )
      const buffer = await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: enc.encode(SYNC_SALT),
          iterations: PBKDF2_ITERATIONS,
          hash: 'SHA-256',
        },
        keyMaterial,
        256
      )
      return Array.from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
    } catch (e) {
      return null
    }
  }

  static deriveXSyncKey(password, syncIdentifier) {
    return CryptoJS.SHA256(password + ':' + syncIdentifier).toString()
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
      if (key.startsWith('PXV_SYNC_')) continue
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
      if (k.startsWith('PXV_SYNC_')) return
      localStorage.setItem(k, settings[k])
    })
  }

  static async applyHistory(history) {
    if (!history) return
    const keys = ['illusts.history', 'novels.history', 'users.history']
    const values = [history.illusts, history.novels, history.users]
    await Promise.all(values.map(async (arr, i) => {
      if (Array.isArray(arr)) return setCache(keys[i], arr)
    }))
  }

  static getDefaultSyncUrl() {
    return `${PIXIV_NEXT_URL}/api/sync`
  }

  static async upload(password, syncIdentifier) {
    const config = this.getConfig()
    if (!config.syncUrl) {
      return { ok: false, error: '请先配置同步服务地址' }
    }
    if (!password) {
      return { ok: false, error: '请输入加密密码' }
    }
    if (!syncIdentifier) {
      return { ok: false, error: '请输入同步标识' }
    }

    const encKey = await this.deriveEncKey(password)
    const syncKey = this.deriveXSyncKey(password, syncIdentifier)
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

  static async download(password, syncIdentifier) {
    const config = this.getConfig()
    if (!config.syncUrl) {
      return { ok: false, error: '请先配置同步服务地址' }
    }
    if (!password) {
      return { ok: false, error: '请输入加密密码' }
    }
    if (!syncIdentifier) {
      return { ok: false, error: '请输入同步标识' }
    }

    const encKey = await this.deriveEncKey(password)
    const syncKey = this.deriveXSyncKey(password, syncIdentifier)

    try {
      const lastTs = localStorage.getItem('PXV_SYNC_LAST_TIMESTAMP')
      const url = lastTs
        ? `${config.syncUrl}/download?since=${encodeURIComponent(lastTs)}`
        : `${config.syncUrl}/download`

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

  static async checkInfo(password, syncIdentifier) {
    const config = this.getConfig()
    if (!config.syncUrl) return null
    if (!syncIdentifier) return null

    const syncKey = this.deriveXSyncKey(password || '', syncIdentifier)

    try {
      const res = await fetch(`${config.syncUrl}/info`, {
        headers: { 'X-Sync-Key': syncKey },
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
    const syncIdentifier = config.syncIdentifier
    if (!password || !syncIdentifier) return
    try {
      const result = await this.download(password, syncIdentifier)
      if (result.ok) {
        console.log('Auto-sync completed:', result.timestamp ? new Date(result.timestamp).toLocaleString() : 'no update')
      }
    } catch (e) {
      console.log('Auto-sync skipped:', e.message)
    }
  }
}

export default SyncManager
