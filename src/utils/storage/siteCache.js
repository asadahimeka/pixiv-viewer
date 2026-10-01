import _ from '@/lib/lodash'
import store from '@/store'
import localDb from './localDb'

const _siteCacheData = new Map()

/** 只判"列表型"空值；null/undefined/string/Blob/普通对象 一律 false（放行） */
function isEmptyListLike(v) {
  if (Array.isArray(v)) return v.length === 0
  if (v && typeof v === 'object' && Array.isArray(v.list)) return v.list.length === 0
  return false
}

export async function setCache(key, val, expires) {
  if (isEmptyListLike(val)) return
  console.log('setCache', key, val)
  _siteCacheData.set(key, val)
  await localDb.set(key, val, expires)
}

const waitFrame = () => new Promise(resolve => requestAnimationFrame(resolve))
export async function getCache(key, def) {
  await waitFrame()
  let val = _siteCacheData.get(key)
  if (val == null) {
    val = await localDb.get(key, def)
    _siteCacheData.set(key, val)
  }
  console.log('getCache', key, key == 'local.fav.map' ? '' : val)
  return val
}

export async function initBookmarkCache() {
  const favMap = await getCache('local.fav.map')
  if (!favMap) setCache('local.fav.map', {})
}

export async function toggleBookmarkCache(item, bool, isNovel = false) {
  const favMapKey = 'local.fav.map'
  const favMap = await getCache(favMapKey, {})
  if (bool) {
    favMap[item.id] = true
  } else {
    delete favMap[item.id]
  }
  await setCache(favMapKey, favMap)
  const itemKey = isNovel ? `novel_${item.id}` : `artwork_${item.id}`
  const artwork = await getCache(itemKey)
  if (artwork) {
    artwork.is_bookmarked = bool
    await setCache(itemKey, artwork, 60 * 60 * 6)
  }
  const uid = store.state.user?.id
  const listKey = isNovel ? `member_fav_novel_${uid}_m0 ` : `memberFavorite_${uid}_m0`
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
