import nprogress from 'nprogress'
import { Dialog } from 'vant'
import { i18n } from '@/i18n'
import { objectToQueryString } from '@/utils'
import { imgProxy, parseWebApiIllust } from '.'
import { getCache, setCache } from '@/utils/storage/siteCache'
import { LocalStorage } from '@/utils/storage'
import store from '@/store'
import { PIXIV_NOW_URL } from '@/consts'

/**
 * @param {string} url
 * @param {any} params
 * @param {RequestInit} config
 */
const doGet = (url, params, config = {}) => {
  nprogress.start()
  return fetch((url.startsWith('http') ? url : PIXIV_NOW_URL + url) + objectToQueryString(params), {
    method: 'GET',
    referrerPolicy: 'origin',
    ...config,
    headers: {
      'x-auth': LocalStorage.get('PXV_NOW_COOKIE') || '',
      'x-csrf-token': sessionStorage.getItem('PXV_NOW_CSRFTOKEN') || '',
      ...config.headers,
    },
  }).then(res => {
    nprogress.done()
    if (!res.ok) throw new Error('Not ok.')
    return res.json()
  }).then(res => {
    return { data: res }
  }).catch(() => {
    nprogress.done()
    return { data: {} }
  })
}

/**
 * @param {string} url
 * @param {any} data
 * @param {RequestInit} config
 */
const doPost = (url, data, config = {}) => {
  nprogress.start()
  return fetch(PIXIV_NOW_URL + url, {
    method: 'POST',
    referrerPolicy: 'origin',
    body: JSON.stringify(data),
    ...config,
    headers: {
      'content-type': 'application/json',
      'x-auth': LocalStorage.get('PXV_NOW_COOKIE') || '',
      'x-csrf-token': sessionStorage.getItem('PXV_NOW_CSRFTOKEN') || '',
      ...config.headers,
    },
  }).then(res => {
    nprogress.done()
    if (!res.ok) throw new Error('Not ok.')
    return res.json()
  }).then(res => {
    return { data: res }
  }).catch(error => {
    nprogress.done()
    return { error }
  })
}

export function existsSessionId() {
  // const sessionId = getCookie('PHPSESSID')
  const sessionId = LocalStorage.get('PXV_NOW_COOKIE')
  if (sessionId) {
    return true
  } else {
    // removeCookie('CSRFTOKEN')
    sessionStorage.removeItem('PXV_NOW_CSRFTOKEN')
    return false
  }
}

export async function initUser() {
  try {
    const { data } = await doGet(PIXIV_NOW_URL.replace('/http', '') + '/user', {}, { headers: { 'cache-control': 'no-store' } })
    if (data?.token) {
      console.log('session ID认证成功', data)
      // setCookie('CSRFTOKEN', data.token)
      sessionStorage.setItem('PXV_NOW_CSRFTOKEN', data.token)
      return data.userData
    } else {
      // removeCookie('CSRFTOKEN')
      sessionStorage.removeItem('PXV_NOW_CSRFTOKEN')
      LocalStorage.remove('PXV_NOW_COOKIE')
      throw new Error(i18n.t('k0V0c1MNZGYs9MCqjx8QL'))
    }
  } catch (err) {
    // removeCookie('CSRFTOKEN')
    sessionStorage.removeItem('PXV_NOW_CSRFTOKEN')
    LocalStorage.remove('PXV_NOW_COOKIE')
    throw err
  }
}

export function login(token) {
  if (!validateSessionId(token)) {
    console.error('访问令牌格式错误')
    return Promise.reject(new Error(i18n.t('3UCLxnEsirUQvP_xv4po4')))
  }
  // setCookie('PHPSESSID', token, 180)
  LocalStorage.set('PXV_NOW_COOKIE', `PHPSESSID=${token}`, 180 * 86400)
  return initUser()
}

export function logout() {
  // const token = getCookie('PHPSESSID')
  const token = LocalStorage.get('PXV_NOW_COOKIE')
  if (!token) return
  Dialog.confirm({
    message: i18n.t('user.sess.logout'),
    closeOnPopstate: true,
    cancelButtonText: i18n.t('common.cancel'),
    confirmButtonText: i18n.t('common.confirm'),
  }).then(() => {
    // removeCookie('PHPSESSID')
    // removeCookie('CSRFTOKEN')
    LocalStorage.remove('PXV_NOW_COOKIE')
    sessionStorage.removeItem('PXV_NOW_CSRFTOKEN')
    setTimeout(() => {
      location.reload()
    }, 200)
  })
}

export function validateSessionId(token) {
  return /^\d{2,}_[0-9A-Za-z]{32}$/.test(token)
}

export function exampleSessionId() {
  // const uid = Math.floor(100000000 * Math.random())
  const uid = 12345678
  const secret = (() => {
    const strSet =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    const final = []
    for (let i = 0; i < 32; i++) {
      const charIndex = Math.floor(Math.random() * strSet.length)
      final.push(strSet[charIndex])
    }
    return final.join('')
  })()
  return `${uid}_${secret}`
}

export async function getDiscoveryArtworks(page = 1, mode = 'all', limit = 60) {
  const cacheKey = `discovery.artworks.${page}`
  let list = await getCache(cacheKey)

  if (!list) {
    const { data: res } = await doGet('/ajax/discovery/artworks', {
      mode,
      limit,
      lang: 'zh',
      _vercel_no_cache: 1,
      _t: Date.now(),
    })

    const illust = res?.thumbnails?.illust
    if (illust) {
      list = illust
        .filter(e => !e.isAdContainer)
        .map(e => {
          e.url = e.url.replace(/\/c\/.+\/img\/(.+)_\w+1200\.(.+)/, '/c/540x540_70/img-master/img/$1_master1200.$2')
          return parseWebApiIllust(e)
        })
      setCache(cacheKey, list, 60 * 10)
    } else {
      return {
        status: 0,
        data: [],
      }
    }
  }

  return { status: 0, data: list }
}

export async function getDiscoveryUsers(page = 1, limit = 60) {
  const cacheKey = `discovery.users.${page}`
  let list = await getCache(cacheKey)

  if (!list) {
    const { data: res } = await doGet('/ajax/discovery/users', {
      limit,
      lang: 'zh',
      _vercel_no_cache: 1,
      _t: Date.now(),
    })

    const illust = res?.thumbnails?.illust || []
    const users = res?.users || []
    if (users) {
      list = users.map(u => {
        return {
          id: u.userId,
          name: u.name,
          avatar: imgProxy(u.image),
          illusts: illust.filter(e => e.userId == u.userId).map(i => ({
            id: i.id,
            title: i.title,
            src: imgProxy(i.url),
            x_restrict: i.xRestrict,
            illust_ai_type: i.aiType,
          })),
        }
      })
      setCache(cacheKey, list, 60 * 10)
    } else {
      return {
        status: 0,
        data: [],
      }
    }
  }

  return { status: 0, data: list }
}

export async function getFollowingUsers(page = 1) {
  const userId = store.state.user?.id
  if (!userId) {
    return {
      status: 0,
      data: [],
    }
  }
  const cacheKey = `following.users.${page}`
  let list = await getCache(cacheKey)

  if (!list) {
    const { data: res } = await doGet(`/ajax/user/${userId}/following`, {
      offset: (page - 1) * 24,
      limit: 24,
      rest: 'show',
      tag: '',
      acceptingRequests: 0,
      lang: 'zh',
      _vercel_no_cache: 1,
      _t: Date.now(),
    })

    const users = res.users || []
    if (users) {
      list = users.map(u => {
        return {
          id: u.userId,
          name: u.userName,
          avatar: imgProxy(u.profileImageUrl),
          illusts: u.illusts.map(i => ({
            id: i.id,
            title: i.title,
            src: imgProxy(i.url),
            x_restrict: i.xRestrict,
            illust_ai_type: i.aiType,
          })),
        }
      })
      setCache(cacheKey, list, 60 * 10)
    } else {
      return {
        status: 0,
        data: [],
      }
    }
  }

  return { status: 0, data: list }
}

export async function getFollowingIllusts(page = 1, mode = 'all') {
  const cacheKey = `following.illusts.${page}`
  let list = await getCache(cacheKey)

  if (!list) {
    const { data: res } = await doGet('/ajax/follow_latest/illust', {
      p: page,
      mode,
      lang: 'zh',
      _vercel_no_cache: 1,
      _t: Date.now(),
    })

    const illust = res?.thumbnails?.illust
    if (illust) {
      list = illust
        .filter(e => !e.isAdContainer)
        .map(e => {
          e.url = e.url.replace(/\/c\/.+\/img\/(.+)_\w+1200\.(.+)/, '/c/540x540_70/img-master/img/$1_master1200.$2')
          return parseWebApiIllust(e)
        })
      setCache(cacheKey, list, 60 * 10)
    } else {
      return {
        status: 0,
        data: [],
      }
    }
  }

  return { status: 0, data: list }
}

export async function getNewIllusts(page = 1, lastId = 0, restrict = 'safe') {
  const cacheKey = `new.illusts.${page}.${restrict}`
  let list = await getCache(cacheKey)

  if (!list) {
    const { data: res } = await doGet('/ajax/illust/new', {
      lastId,
      limit: 20,
      type: 'illust',
      r18: restrict == 'r18',
      lang: 'zh',
      _vercel_no_cache: 1,
      _t: Date.now(),
    })

    const illust = res?.illusts
    if (illust) {
      list = illust
        .filter(e => !e.isAdContainer)
        .map(e => {
          e.url = e.url.replace(/\/c\/.+\/img\/(.+)_\w+1200\.(.+)/, '/c/540x540_70/img-master/img/$1_master1200.$2')
          return parseWebApiIllust(e)
        })
      list._lastId = res?.lastId || 0
      setCache(cacheKey, list, 60 * 10)
    } else {
      return {
        status: 0,
        data: [],
      }
    }
  }

  return { status: 0, data: list }
}

export async function getBookmarkIllusts(page = 1, userId) {
  const lastFav = await getCache('lastFav', '0')
  const cacheKey = `bookmarks.${lastFav}.${page}`
  let list = await getCache(cacheKey)

  if (!list) {
    const { data: res } = await doGet(`/ajax/user/${userId}/illusts/bookmarks`, {
      tag: '',
      offset: (page - 1) * 48,
      limit: 48,
      rest: 'show',
      lang: 'zh',
      _vercel_no_cache: 1,
      _t: Date.now(),
    })

    const illust = res?.works
    if (illust) {
      list = illust
        .filter(e => !e.isAdContainer)
        .map(e => {
          e.url = e.url.replace(/\/c\/.+\/img\/(.+)_\w+1200\.(.+)/, '/c/540x540_70/img-master/img/$1_master1200.$2')
          return parseWebApiIllust(e)
        })
      setCache(cacheKey, list, 60 * 10)
    } else {
      return {
        status: 0,
        data: [],
      }
    }
  }

  return { status: 0, data: list }
}

export async function isIllustBookmarked(id) {
  const key = `isFav.${id}`
  let res = await getCache(key)
  if (res === void 0) {
    const { data } = await doGet(`/ajax/illust/${id}?_vercel_no_cache=1&_t=${Date.now()}`)
    res = data?.bookmarkData?.id
    setCache(key, data?.bookmarkData?.id || null, 60 * 30)
  }
  return res
}

export async function isUserFollowed(id) {
  const key = `isFollowed.${id}`
  let res = await getCache(key)
  if (res === void 0) {
    const { data } = await doGet(`/ajax/user/${id}?_vercel_no_cache=1&_t=${Date.now()}`)
    res = !!data?.isFollowed
    setCache(key, res, 60 * 30)
  }
  return res
}

export async function addBookmark(illust_id) {
  return doPost('/ajax/illusts/bookmarks/add', {
    illust_id,
    restrict: 0,
    comment: '',
    tags: [],
  }).then(res => {
    if (!res.error) {
      setCache(`isFav.${illust_id}`, res?.data?.last_bookmark_id || null, 60 * 30)
      setCache('lastFav', Date.now())
    }
    return res
  })
}

export async function removeBookmark(bookmark_id) {
  return doPost('/ajax/illusts/bookmarks/delete', {}, {
    body: `bookmark_id=${bookmark_id}`,
    headers: {
      'accept': 'application/json',
      'content-type': 'application/x-www-form-urlencoded; charset=utf-8',
    },
  }).then(res => {
    if (!res.error) {
      setCache(`isFav.${bookmark_id}`, null, 60 * 30)
      setCache('lastFav', Date.now())
    }
    return res
  })
}

export async function addFollow(user_id) {
  return doPost('/bookmark_add.php', {}, {
    body: objectToQueryString({
      mode: 'add',
      type: 'user',
      user_id,
      tag: '',
      restrict: 0,
      format: 'json',
    }).slice(1),
    headers: {
      'accept': 'application/json',
      'content-type': 'application/x-www-form-urlencoded; charset=utf-8',
    },
  }).then(res => {
    if (!res.error) {
      setCache(`isFollowed.${user_id}`, true, 60 * 30)
    }
    return res
  })
}

export async function removeFollow(user_id) {
  return doPost('/rpc_group_setting.php', {}, {
    body: objectToQueryString({
      mode: 'del',
      type: 'bookuser',
      id: user_id,
    }).slice(1),
    headers: {
      'accept': 'application/json',
      'content-type': 'application/x-www-form-urlencoded; charset=utf-8',
    },
  }).then(res => {
    if (!res.error) {
      setCache(`isFollowed.${user_id}`, false, 60 * 30)
    }
    return res
  })
}
