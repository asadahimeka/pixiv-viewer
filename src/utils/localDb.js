import localforage from 'localforage'

class LocalDB {
  _drive = localforage

  async get(key, def) {
    console.log('%c - db get: ' + key, 'color:blueviolet')
    const result = await this._drive.getItem(key)
    if (result) {
      if (Math.floor(+new Date() / 1000) >= result.expires && result.expires !== -1) {
        result.data = def
        this.remove(key)
      }

      return result.data
    } else {
      return def
    }
  }

  async set(key, val, expires = -1) {
    console.log('%c - db set: ' + key, 'color:deeppink')
    try {
      if (val === undefined) {
        await this.remove(key)
        return
      }

      if (typeof expires === 'number' && expires >= 0) {
        expires = Math.floor(+new Date() / 1000) + expires
      } else {
        expires = -1
      }

      const data = {
        data: val,
        expires,
      }

      await this._drive.setItem(key, data)
    } catch (error) {
      console.log('db error:', error)
    }
  }

  async remove(key) {
    return this._drive.removeItem(key)
  }

  async clear() {
    return this._drive.clear()
  }

  async length() {
    return this._drive.length()
  }
}

const localDb = new LocalDB()
export default localDb
