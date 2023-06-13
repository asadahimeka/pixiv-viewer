import localDb from './localDb'

const _siteCacheData = new Map()

export async function setCache(key, val, expires) {
  if (Array.isArray(val) && !val.length) return
  console.log('setCache', key, val)
  _siteCacheData.set(key, val)
  await localDb.set(key, val, expires)
}

export async function getCache(key, def) {
  let val = _siteCacheData.get(key)
  if (val == null) {
    val = await localDb.get(key, def)
    _siteCacheData.set(key, val)
  }
  console.log('getCache', key, val)
  return val
}
