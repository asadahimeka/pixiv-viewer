import CryptoJS from 'crypto-js'
import _ from '@/lib/lodash'
import { getCache, setCache } from '@/utils/storage/siteCache'
import { PIXIV_NEXT_URL } from '@/consts'

const STORAGE_KEY_CONFIG = 'PXV_SYNC_CONFIG'
const STORAGE_KEY_PASSWORD = 'PXV_SYNC_PASSWORD'
const SYNC_SALT = 'pixiv-sync-v1'
const PBKDF2_ITERATIONS = 100000
const SYNC_VERSION = 3
const STORAGE_KEY_TIMESTAMP_MAP = 'PXV_SYNC_LAST_TIMESTAMP_MAP'

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

  // ── Merge utility methods ──

  static get MERGE_KEYS() {
    return ['PIXIV_SearchHistory', 'PXV_APP_SETTING', 'PXV_CNT_SHOW', 'PXV_TEXT_CONFIG', 'PXV_CLIENT_CONFIG']
  }

  static _isWrapped(val) {
    return val && typeof val === 'object' && !Array.isArray(val) && 'data' in val && 'expires' in val
  }

  static _parseRaw(raw) {
    if (raw == null) return null
    try {
      return JSON.parse(raw)
    } catch {
      return raw
    }
  }

  static _extractData(raw) {
    if (raw == null) return undefined
    const parsed = this._parseRaw(raw)
    if (this._isWrapped(parsed)) return parsed.data
    return parsed
  }

  static _extractExpires(raw) {
    if (raw == null) return -1
    const parsed = this._parseRaw(raw)
    if (this._isWrapped(parsed)) return parsed.expires ?? -1
    return -1
  }

  static _wrap(data, expires = -1) {
    return JSON.stringify({ data, expires })
  }

  static _pickExpires(localRaw, cloudRaw) {
    const localExp = this._extractExpires(localRaw)
    const cloudExp = this._extractExpires(cloudRaw)
    if (localExp === -1 || cloudExp === -1) return -1
    return Math.max(Number(localExp) || -1, Number(cloudExp) || -1)
  }

  static _mergeHistoryArrays(localArr, remoteArr, maxLen = 500) {
    if (!Array.isArray(localArr)) return (remoteArr || []).slice(0, maxLen)
    if (!Array.isArray(remoteArr)) return localArr.slice(0, maxLen)
    const merged = _.uniqBy([...remoteArr, ...localArr], 'id')
    return merged.slice(0, maxLen)
  }

  static _mergeSearchHistory(localRaw, cloudRaw) {
    const extractArr = raw => {
      const data = this._extractData(raw)
      return Array.isArray(data) ? data : []
    }
    const local = extractArr(localRaw)
    const cloud = extractArr(cloudRaw)
    const merged = _.uniq([...cloud, ...local]).slice(0, 20)
    const expires = this._pickExpires(localRaw, cloudRaw)
    return this._wrap(merged, expires)
  }

  static _mergeWrappedObject(localRaw, cloudRaw) {
    if (localRaw == null) return cloudRaw
    const localData = this._extractData(localRaw)
    const cloudData = this._extractData(cloudRaw)
    if (typeof localData !== 'object' || typeof cloudData !== 'object' || localData === null || cloudData === null) {
      return cloudRaw
    }
    const merged = { ...localData, ...cloudData }
    const expires = this._pickExpires(localRaw, cloudRaw)
    return this._wrap(merged, expires)
  }

  static _applyMerge(key, localRaw, cloudRaw) {
    if (localRaw == null) return cloudRaw
    switch (key) {
      case 'PIXIV_SearchHistory':
        return this._mergeSearchHistory(localRaw, cloudRaw)
      default:
        return this._mergeWrappedObject(localRaw, cloudRaw)
    }
  }

  // ── Timestamp space isolation ──

  static _genSpaceKey(syncUrl, syncIdentifier) {
    return CryptoJS.SHA256(syncUrl + '::' + syncIdentifier).toString()
  }

  static _readTimestampMap() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY_TIMESTAMP_MAP) || '{}')
    } catch {
      return {}
    }
  }

  static getLastTimestamp() {
    const config = this.getConfig()
    if (!config.syncUrl || !config.syncIdentifier) return null
    const map = this._readTimestampMap()
    return map[this._genSpaceKey(config.syncUrl, config.syncIdentifier)] || null
  }

  static setLastTimestamp(timestamp) {
    const config = this.getConfig()
    if (!config.syncUrl || !config.syncIdentifier) return
    const map = this._readTimestampMap()
    map[this._genSpaceKey(config.syncUrl, config.syncIdentifier)] = String(timestamp)
    localStorage.setItem(STORAGE_KEY_TIMESTAMP_MAP, JSON.stringify(map))
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
      if (this.MERGE_KEYS.includes(k)) {
        const localRaw = localStorage.getItem(k)
        const merged = this._applyMerge(k, localRaw, settings[k])
        if (merged != null) localStorage.setItem(k, merged)
      } else {
        localStorage.setItem(k, settings[k])
      }
    })
  }

  static async applyHistory(history) {
    if (!history) return
    const keys = ['illusts.history', 'novels.history', 'users.history']
    const values = [history.illusts, history.novels, history.users]
    await Promise.all(values.map(async (arr, i) => {
      if (!Array.isArray(arr)) return
      const localArr = await getCache(keys[i])
      const merged = Array.isArray(localArr)
        ? this._mergeHistoryArrays(localArr, arr)
        : arr.slice(0, 500)
      if (merged.length > 0) {
        await setCache(keys[i], merged)
      }
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
      if (res.status === 409) {
        const errData = await res.json()
        return { ok: false, conflict: true, error: errData.error, serverTimestamp: errData.serverTimestamp }
      }
      if (!res.ok) {
        return { ok: false, error: `上传失败: HTTP ${res.status}` }
      }
      const data = await res.json()
      if (data.timestamp) {
        this.setLastTimestamp(data.timestamp)
      }
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
      const lastTs = this.getLastTimestamp()
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
        this.setLastTimestamp(data.timestamp)
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
    const ts = this.getLastTimestamp()
    if (!ts) return ''
    try {
      return new Date(Number(ts)).toLocaleString()
    } catch {
      return ''
    }
  }

  static async autoSync() {
    // Auto-sync disabled — user must manually trigger upload/download
  }
}

export default SyncManager
