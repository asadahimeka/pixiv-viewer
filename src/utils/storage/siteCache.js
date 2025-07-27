import _ from '@/lib/lodash'
import store from '@/store'
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

export async function initBookmarkCache() {
  const favMap = await getCache('local.fav.map')
  if (!favMap) setCache('local.fav.map', {})
}

export async function toggleBookmarkCache(item, bool) {
  const favMapKey = 'local.fav.map'
  const favMap = await getCache(favMapKey, {})
  if (bool) {
    favMap[item.id] = true
  } else {
    delete favMap[item.id]
  }
  await setCache(favMapKey, favMap)
  const itemKey = `artwork_${item.id}`
  const artwork = await getCache(itemKey)
  if (artwork) {
    artwork.is_bookmarked = bool
    await setCache(itemKey, artwork, 60 * 60 * 6)
  }
  const listKey = `memberFavorite_${store.state.user?.id}_m0`
  const list = await getCache(listKey)
  if (list?.illusts) {
    if (bool) {
      list.illusts.unshift(item)
    } else {
      _.remove(list.illusts, e => e.id == item.id)
    }
    await setCache(listKey, list, 60 * 60 * 12)
  }
}
