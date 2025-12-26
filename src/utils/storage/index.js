function serialize(val) {
  return JSON.stringify(val)
}

function deserialize(val) {
  if (typeof val !== 'string') {
    return undefined
  }
  try {
    return JSON.parse(val)
  } catch (e) {
    return val || undefined
  }
}

class MyStorage {
  /** @type {Storage} */
  _drive

  constructor(drive) {
    this._drive = drive
  }

  get(key, def) {
    console.log('%c - storage get: ' + key, 'color:blueviolet')
    const result = this._drive.getItem(key)
    if (result) {
      const data = deserialize(result)

      if (data.expires !== -1 && Math.floor(Date.now() / 1000) >= data.expires) {
        data.data = def
        this.remove(key)
      }

      return data.data
    } else {
      return def
    }
  }

  set(key, val, expires = -1) {
    console.log('%c - storage set: ' + key, 'color:deeppink')
    try {
      if (val === undefined) {
        return this.remove(key)
      }

      if (typeof expires === 'number' && expires >= 0) {
        expires = Math.floor(Date.now() / 1000) + expires
      } else {
        expires = -1
      }

      const data = {
        data: val,
        expires,
      }

      this._drive.setItem(key, serialize(data))
    } catch (e) {
      console.log('Local Storage is full, Please empty data')
    }
    return val
  }

  has(key) {
    return this.get(key) !== undefined
  }

  remove(key) {
    this._drive.removeItem(key)
  }

  clear() {
    this._drive.clear()
  }

  size() {
    const encoder = new TextEncoder()
    let totalSize = 0
    for (let i = 0; i < this._drive.length; i++) {
      const key = this._drive.key(i)
      const value = this._drive.getItem(key)
      totalSize += encoder.encode(key).length + encoder.encode(value).length
    }
    return totalSize
  }
}

export const LocalStorage = new MyStorage(localStorage)
export const SessionStorage = new MyStorage(sessionStorage)

/**
 * @template T
 * @param {string} key
 * @param {T} def
 * @returns {T}
 */
export function getSettingDef(key, def) {
  return LocalStorage.get(key, def)
}
