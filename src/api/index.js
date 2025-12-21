import dayjs from 'dayjs'
import { Dialog } from 'vant'
import { get } from './http'
import { SessionStorage } from '@/utils/storage'
import { getCache, setCache } from '@/utils/storage/siteCache'
import { i18n } from '@/i18n'
import { filterCensoredIllusts, filterCensoredNovels, isBlockTagHit, mintFilter } from '@/utils/filter'
import { PXIMG_PROXY_BASE, notSelfHibiApi, PIXIV_NOW_URL, PIXIV_NEXT_URL, COMMON_PROXY } from '@/consts'
import { setProperFontSize } from '@/utils'

const isSupportWebP = (() => {
  const elem = document.createElement('canvas')

  if (elem.getContext && elem.getContext('2d')) {
    // was able or not to get WebP representation
    return elem.toDataURL('image/webp').indexOf('data:image/webp') === 0
  }

  // very old browser like IE 8, canvas not supported
  return false
})()

export const imgProxy = url => {
  let result = url.replace(/i\.pximg\.net/g, PXIMG_PROXY_BASE)
  if (url.startsWith('/-/')) {
    result = result.replace(/^\/-\//, `https://${PXIMG_PROXY_BASE}/`)
  }
  if (url.startsWith('/~/')) {
    result = result.replace(/^\/~\//, 'https://s.pximg.net/')
  }

  if (!isSupportWebP) {
    result = result.replace(/_10_webp/g, '_70')
    result = result.replace(/_webp/g, '')
  }

  return result
}

const parseUser = data => {
  const { user, profile, workspace } = data
  const { id, account, name, comment } = user
  const { background_image_url, birth, gender, is_premium, is_using_custom_profile_image, job, total_follow_users, total_mypixiv_users, total_illust_bookmarks_public, total_illusts, twitter_account, twitter_url, webpage, country_code } = profile

  return {
    id,
    account,
    name,
    comment,
    country_code,
    region: profile.region,
    avatar: imgProxy(user.profile_image_urls.medium),
    bgcover: imgProxy(background_image_url || ''),
    birth,
    gender,
    is_premium,
    is_using_custom_profile_image,
    job,
    follow: total_follow_users,
    friend: total_mypixiv_users,
    bookmarks: total_illust_bookmarks_public,
    illusts: total_illusts,
    mangas: profile.total_manga,
    illust_series: profile.total_illust_series,
    novels: profile.total_novels,
    novel_series: profile.total_novel_series,
    twitter_account,
    twitter_url,
    webpage,
    workspace,
    is_followed: user.is_followed,
  }
}

const parseIllust = data => {
  const { id, title, caption, create_date, tags, tools, width, height, x_restrict, total_view, total_bookmarks, type, illust_ai_type } = data
  let images = []

  if (data.meta_single_page.original_image_url) {
    images.push({
      s: imgProxy(data.image_urls.square_medium),
      m: imgProxy(data.image_urls.medium),
      l: imgProxy(data.image_urls.large),
      o: imgProxy(data.meta_single_page.original_image_url),
    })
  } else {
    images = data.meta_pages.map(data => {
      return {
        s: imgProxy(data.image_urls.square_medium),
        m: imgProxy(data.image_urls.medium),
        l: imgProxy(data.image_urls.large),
        o: imgProxy(data.image_urls.original),
      }
    })
  }

  const artwork = {
    id,
    title,
    caption,
    author: {
      id: data.user.id,
      name: data.user.name,
      avatar: imgProxy(data.user.profile_image_urls.medium),
      is_followed: data.user.is_followed,
    },
    created: create_date,
    images,
    tags,
    tools,
    width,
    height,
    count: data.page_count,
    view: total_view,
    like: total_bookmarks,
    totalComment: data.total_comments,
    x_restrict,
    illust_ai_type,
    type,
    is_bookmarked: data.is_bookmarked,
    series: data.series,
    seasonal_effect: data.seasonal_effect_animation_urls?.webp,
    event_banners: data.event_banners,
  }

  return artwork
}

const parseNovel = data => {
  const images = [{
    s: imgProxy(data.image_urls.square_medium),
    m: imgProxy(data.image_urls.medium),
    l: imgProxy(data.image_urls.large),
  }]

  const artwork = {
    ...data,
    images,
    author: {
      id: data.user.id,
      name: data.user.name,
      avatar: imgProxy(data.user.profile_image_urls.medium),
    },
    created: data.create_date,
    count: data.page_count,
    view: data.total_view,
    like: data.total_bookmarks,
    illust_ai_type: data.novel_ai_type,
  }

  return artwork
}

const parseAiIllust = (d, r18) => {
  const url = 'https://i.pximg.net' + d.url.replace('/-/', '/')
  const images = [{
    s: imgProxy(url.replace('_master1200', '_square1200')),
    m: imgProxy(url),
    l: imgProxy(url.replace(/\/c\/\d+x\d+\//i, '/')),
    o: 'https://i.loli.best/' + d.illust_id,
  }]

  let avatar = d.profile_img
  if (!avatar.includes('s.pximg.net')) {
    avatar = imgProxy(avatar)
  }

  const artwork = {
    id: d.illust_id,
    title: d.title,
    caption: '',
    author: {
      id: d.user_id,
      name: d.user_name,
      avatar,
    },
    created: d.date,
    images,
    tags: d.tags.map(e => ({ name: e })),
    tools: [],
    width: d.width,
    height: d.height,
    count: d.illust_page_count,
    view: d.view_count,
    like: d.rating_count,
    x_restrict: r18 ? 1 : 0,
    illust_ai_type: 2,
    type: 'illust',
  }

  return artwork
}

const parseWebRankIllust = (d, mode, content) => {
  const url = 'https://i.pximg.net' + d.url.replace('/-/', '/')
  const images = [{
    s: imgProxy(url.replace('_master1200', '_square1200')),
    m: imgProxy(url),
    l: imgProxy(url.replace(/\/c\/\d+x\d+\//i, '/')),
    o: 'https://i.loli.best/' + d.illust_id,
  }]

  let avatar = d.profile_img || ''
  if (avatar && !avatar.includes('s.pximg.net')) {
    avatar = imgProxy(avatar)
  }

  const artwork = {
    id: d.illust_id,
    title: d.title,
    caption: '',
    author: {
      id: d.user_id,
      name: d.user_name,
      avatar,
    },
    created: d.date,
    images,
    tags: d.tags.map(e => ({ name: e })),
    tools: [],
    width: d.width,
    height: d.height,
    count: d.illust_page_count,
    view: d.view_count,
    like: d.rating_count,
    x_restrict: mode.includes('r18') ? 1 : 0,
    illust_ai_type: 0,
    type: content?.includes('ugoira') ? 'ugoira' : 'illust',
  }

  return artwork
}

export const parseWebApiIllust = d => {
  const url = 'https://i.pximg.net' + d.url.replace('/-/', '/')
  const images = [{
    s: imgProxy(url.replace('_master1200', '_square1200')),
    m: imgProxy(url),
    l: imgProxy(url.replace(/\/c\/\d+x\d+\//i, '/')),
    o: 'https://i.loli.best/' + d.id,
  }]

  let avatar = d.profileImageUrl || ''
  if (avatar && !avatar.includes('s.pximg.net')) {
    avatar = imgProxy(avatar)
  }

  const artwork = {
    id: d.id,
    title: d.title,
    caption: d.description || '',
    author: {
      id: d.userId,
      name: d.userName,
      avatar,
    },
    created: d.createDate,
    images,
    tags: d.tags.map(e => ({ name: e })),
    tools: [],
    width: d.width,
    height: d.height,
    count: d.pageCount,
    view: 0,
    like: 0,
    x_restrict: d.xRestrict,
    illust_ai_type: d.aiType,
    type: ['illust', 'manga', 'ugoira'][d.illustType || 0],
  }

  return artwork
}

export const parseWebPopularIllust = d => {
  const url = 'https://i.pximg.net' + d.url.replace('/-/', '/')
  const images = [{
    s: imgProxy(url),
    m: imgProxy(url),
    l: imgProxy(url.replace(/\/c\/\d+x\d+\w*\//i, '/')),
    o: 'https://i.loli.best/' + d.illust_id,
  }]

  const artwork = {
    id: d.illust_id,
    title: d.illust_title,
    caption: '',
    author: { id: d.illust_user_id, name: d.user_name },
    created: d.illust_create_date,
    images,
    tags: d.tags.map(e => ({ name: e })),
    tools: [],
    width: +d.illust_width,
    height: +d.illust_height,
    count: d.illust_page_count,
    view: 0,
    like: 0,
    x_restrict: d.illust_x_restrict,
    illust_ai_type: d.illust_ai_type,
    type: ['illust', 'manga', 'ugoira'][d.illust_type || 0],
  }

  return artwork
}

const dealErrMsg = res => {
  const err = res.error?.response?.data?.error || res.error?.error || res.error
  let msg = err?.message || err?.user_message || err
  if (msg == 'Rate Limit') msg = i18n.t('tip.rate_limit')
  return msg
}

const api = {
  /**
   *
   * @param {Number} id 作品ID
   * @param {Number} index 页数 0起始
   */
  url(id, index) {
    if (!index) {
      return `https://pixiv.re/${id}.png`
    } else {
      return `https://pixiv.re/${id}-${index}.png`
    }
  },

  async getLatest() {
    const cacheKey = 'latestList'
    let latestList = await getCache(cacheKey)

    if (!latestList) {
      const res = await get('/illust_new')

      if (res.illusts) {
        latestList = res.illusts.map(art => parseIllust(art))
        setCache(cacheKey, latestList, 60 * 10)
      } else if (res.error) {
        return {
          status: -1,
          msg: dealErrMsg(res),
        }
      } else {
        return {
          status: -1,
          msg: i18n.t('tip.unknown_err'),
        }
      }
    }

    console.log('latestList: ', latestList)

    return { status: 0, data: latestList }
  },

  async getLatestManga() {
    const cacheKey = 'latestList.manga'
    let latestList = await getCache(cacheKey)

    if (!latestList) {
      const res = await get('/illust_new', { content_type: 'manga' })

      if (res.illusts) {
        latestList = res.illusts.map(art => parseIllust(art))
        setCache(cacheKey, latestList, 60 * 10)
      } else if (res.error) {
        return {
          status: -1,
          msg: dealErrMsg(res),
        }
      } else {
        return {
          status: -1,
          msg: i18n.t('tip.unknown_err'),
        }
      }
    }

    console.log('latestList: ', latestList)

    return { status: 0, data: latestList }
  },

  async getLatestNovel() {
    const cacheKey = 'latestList.novel'
    let latestList = await getCache(cacheKey)

    if (!latestList) {
      const res = await get('/novel_new')

      if (res.novels) {
        latestList = res.novels.map(art => parseNovel(art))
        setCache(cacheKey, latestList, 60 * 10)
      } else if (res.error) {
        return {
          status: -1,
          msg: dealErrMsg(res),
        }
      } else {
        return {
          status: -1,
          msg: i18n.t('tip.unknown_err'),
        }
      }
    }

    console.log('latestList: ', latestList)

    return { status: 0, data: filterCensoredNovels(latestList) }
  },

  /**
   *
   * @param {Number} id 作品ID
   * @param {Number} page 页数 [1,5]
   */
  async getRelated(id, page = 1, nextUrl = '') {
    const cacheKey = `relatedList_${id}_p${page}`
    let relatedList = await getCache(cacheKey)

    if (!relatedList) {
      const res = await get('/related', {
        id,
        page,
        nextUrl,
      })

      if (res.illusts) {
        relatedList = res.illusts.map(art => parseIllust(art))
        relatedList.nextUrl = res.next_url
        setCache(cacheKey, relatedList, 60 * 60 * 48)
      } else if (res.error) {
        return {
          status: -1,
          msg: dealErrMsg(res),
        }
      } else {
        return {
          status: -1,
          msg: i18n.t('tip.unknown_err'),
        }
      }
    }

    console.log('relatedList: ', relatedList)

    return { status: 0, data: relatedList }
  },

  async getRelatedNovel(id, page = 1) {
    const cacheKey = `related_novel_${id}_p${page}`
    let relatedList = await getCache(cacheKey)

    if (!relatedList) {
      const res = await get('/related_novel', {
        id,
        page,
      })

      if (res.novels) {
        relatedList = res.novels.map(art => parseNovel(art))
        setCache(cacheKey, relatedList, 60 * 60 * 48)
      } else if (res.error) {
        return {
          status: -1,
          msg: dealErrMsg(res),
        }
      } else {
        return {
          status: -1,
          msg: i18n.t('tip.unknown_err'),
        }
      }
    }

    console.log('relatedList: ', relatedList)

    return { status: 0, data: filterCensoredNovels(relatedList) }
  },

  async getRecommendedIllust(params) {
    const cacheKey = 'recommended.illust'
    let relatedList
    if (!window.APP_CONFIG.useLocalAppApi) {
      relatedList = await getCache(cacheKey)
    }

    if (!relatedList) {
      const res = await get('/illust_recommended', { params })

      if (res.illusts) {
        relatedList = res.illusts.map(art => parseIllust(art)).filter(e => e.like >= 500)
        relatedList.nextUrl = res.next_url
        if (!window.APP_CONFIG.useLocalAppApi) {
          setCache(cacheKey, relatedList, 60 * 60 * 12)
        }
      } else if (res.error) {
        return {
          status: -1,
          msg: dealErrMsg(res),
        }
      } else {
        return {
          status: -1,
          msg: i18n.t('tip.unknown_err'),
        }
      }
    }

    console.log('getRecommendedIllust: ', relatedList)

    return { status: 0, data: relatedList }
  },

  async getRecommendedManga() {
    const cacheKey = 'recommended.manga'
    let relatedList = await getCache(cacheKey)

    if (!relatedList) {
      const res = await get('/manga_recommended')

      if (res.illusts) {
        relatedList = res.illusts.map(art => parseIllust(art))
        setCache(cacheKey, relatedList, 60 * 60 * 12)
      } else if (res.error) {
        return {
          status: -1,
          msg: dealErrMsg(res),
        }
      } else {
        return {
          status: -1,
          msg: i18n.t('tip.unknown_err'),
        }
      }
    }

    console.log('getRecommendedmanga: ', relatedList)

    return { status: 0, data: relatedList }
  },

  async getRecommendedNovel() {
    const cacheKey = 'recommended.novel'
    let relatedList = await getCache(cacheKey)

    if (!relatedList) {
      const res = await get('/novel_recommended')

      if (res.novels) {
        relatedList = res.novels.map(art => parseNovel(art))
        setCache(cacheKey, relatedList, 60 * 60 * 12)
      } else if (res.error) {
        return {
          status: -1,
          msg: dealErrMsg(res),
        }
      } else {
        return {
          status: -1,
          msg: i18n.t('tip.unknown_err'),
        }
      }
    }

    console.log('getRecommendedNovel: ', relatedList)

    return { status: 0, data: filterCensoredNovels(relatedList) }
  },

  async getPopularPreview(word, params = {}) {
    const cacheKey = `search.popularPreview.${word}.${JSON.stringify(params)}`
    let relatedList = await getCache(cacheKey)

    if (!relatedList) {
      const res = await get('/popular_preview', { word, ...params })

      if (res.illusts) {
        relatedList = res.illusts.map(art => parseIllust(art))
        setCache(cacheKey, relatedList, 60 * 60 * 48)
      } else if (res.error) {
        return {
          status: -1,
          msg: dealErrMsg(res),
        }
      } else {
        return {
          status: -1,
          msg: i18n.t('tip.unknown_err'),
        }
      }
    }

    return { status: 0, data: filterCensoredIllusts(relatedList) }
  },

  async getPopularPreviewNovel(word, params = {}) {
    const cacheKey = `search.popularPreview.novel.${word}.${JSON.stringify(params)}`
    let relatedList = await getCache(cacheKey)

    if (!relatedList) {
      const res = await get('/popular_preview_novel', { word, ...params })

      if (res.novels) {
        relatedList = res.novels.map(art => parseNovel(art))
        setCache(cacheKey, relatedList, 60 * 60 * 48)
      } else if (res.error) {
        return {
          status: -1,
          msg: dealErrMsg(res),
        }
      } else {
        return {
          status: -1,
          msg: i18n.t('tip.unknown_err'),
        }
      }
    }

    return { status: 0, data: filterCensoredNovels(relatedList) }
  },

  async getRecommendedUser() {
    const cacheKey = 'recommended.user'
    let relatedList = await getCache(cacheKey)

    if (!relatedList) {
      const res = await get('/user_recommended')

      if (res.user_previews) {
        relatedList = res.user_previews
          .filter(u => u.illusts.length && (
            !u.illusts.some(e => /R-?18|3DCG|ロリ|萝莉|幼女/.test(JSON.stringify(e.tags)))
          ))
          .map(u => {
            return {
              id: u.user.id,
              name: u.user.name,
              avatar: imgProxy(u.user.profile_image_urls.medium),
              illusts: u.illusts.map(i => ({
                id: i.id,
                title: i.title,
                src: imgProxy(i.image_urls.medium),
                x_restrict: i.x_restrict,
                illust_ai_type: i.illust_ai_type,
              })),
            }
          })
        setCache(cacheKey, relatedList, 60 * 60 * 12)
      } else if (res.error) {
        return {
          status: -1,
          msg: dealErrMsg(res),
        }
      } else {
        return {
          status: -1,
          msg: i18n.t('tip.unknown_err'),
        }
      }
    }

    console.log('getRecommendedUser: ', relatedList)

    return { status: 0, data: relatedList }
  },

  async getRelatedUser(id) {
    const cacheKey = `related.user.${id}`
    let relatedList = await getCache(cacheKey)

    if (!relatedList) {
      const res = await get('/related_member', { id })

      if (res.user_previews) {
        relatedList = res.user_previews
          .map(u => {
            return {
              id: u.user.id,
              name: u.user.name,
              avatar: imgProxy(u.user.profile_image_urls.medium),
              illusts: u.illusts.map(i => ({
                id: i.id,
                title: i.title,
                src: imgProxy(i.image_urls.medium),
                x_restrict: i.x_restrict,
                illust_ai_type: i.illust_ai_type,
              })),
            }
          })
        setCache(cacheKey, relatedList, 60 * 60 * 48)
      } else if (res.error) {
        return {
          status: -1,
          msg: dealErrMsg(res),
        }
      } else {
        return {
          status: -1,
          msg: i18n.t('tip.unknown_err'),
        }
      }
    }

    console.log('getRelatedUser: ', relatedList)

    return { status: 0, data: relatedList }
  },

  async searchUser(word) {
    const cacheKey = `search.user.${word}`
    let relatedList = await getCache(cacheKey)

    if (!relatedList) {
      const res = await get('/search_user', { word })

      if (res.user_previews) {
        relatedList = res.user_previews
          .map(u => {
            return {
              id: u.user.id,
              name: u.user.name,
              avatar: imgProxy(u.user.profile_image_urls.medium),
              illusts: u.illusts.map(i => ({
                id: i.id,
                title: i.title,
                src: imgProxy(i.image_urls.medium),
                x_restrict: i.x_restrict,
                illust_ai_type: i.illust_ai_type,
              })),
            }
          })
        setCache(cacheKey, relatedList, 60 * 60 * 24)
      } else if (res.error) {
        return {
          status: -1,
          msg: dealErrMsg(res),
        }
      } else {
        return {
          status: -1,
          msg: i18n.t('tip.unknown_err'),
        }
      }
    }

    return { status: 0, data: relatedList }
  },

  async getTagsAutocomplete(word) {
    const cacheKey = `search.autocomplete.${word}`
    let relatedList = await getCache(cacheKey)

    if (!relatedList) {
      const res = await get('/search_autocomplete', { word })

      if (res.tags) {
        relatedList = res.tags.map(t => t.name)
        setCache(cacheKey, relatedList, 60 * 60 * 72)
      } else if (res.error) {
        return {
          status: -1,
          msg: dealErrMsg(res),
        }
      } else {
        return {
          status: -1,
          msg: i18n.t('tip.unknown_err'),
        }
      }
    }

    console.log('getTagsAutocomplete: ', relatedList)

    return { status: 0, data: relatedList }
  },

  async getSpotlights(page) {
    const lang = i18n.locale
    const cacheKey = `spotlights.${lang}.${page}`
    let spotlights = await getCache(cacheKey)

    if (!spotlights) {
      const url = `${PIXIV_NEXT_URL}/api/pixivision`
      const params = { page }
      if (lang != 'zh-CN') {
        params.lang = lang
      }
      const res = await get(url, params)

      if (res.articles) {
        res.articles.forEach(a => {
          a.thumbnail = imgProxy(a.thumbnail)
        })
        res.rank?.forEach(a => {
          a.thumbnail = imgProxy(a.thumbnail)
        })
        res.recommend?.forEach(a => {
          a.thumbnail = imgProxy(a.thumbnail)
        })

        spotlights = res
        setCache(cacheKey, spotlights, 60 * 60 * 12)
      } else {
        return {
          status: -1,
          msg: i18n.t('tip.unknown_err'),
        }
      }
    }

    console.log('spotlights: ', spotlights)

    return { status: 0, data: spotlights }
  },

  async getSpotlightTypeList(type, page) {
    const lang = i18n.locale
    const cacheKey = `spotlights.${type}.${lang}.${page}`
    let spotlights = await getCache(cacheKey)

    if (!spotlights) {
      const params = { page, type }
      if (lang != 'zh-CN') {
        params.lang = lang
      }
      const res = await get(`${PIXIV_NEXT_URL}/api/pixivision/list`, params)

      if (res.articles) {
        res.articles.forEach(a => {
          a.thumbnail = imgProxy(a.thumbnail)
        })
        res.rank?.forEach(a => {
          a.thumbnail = imgProxy(a.thumbnail)
        })
        res.recommend?.forEach(a => {
          a.thumbnail = imgProxy(a.thumbnail)
        })

        spotlights = res
        setCache(cacheKey, spotlights, 60 * 60 * 12)
      } else {
        return {
          status: -1,
          msg: i18n.t('tip.unknown_err'),
        }
      }
    }

    console.log('spotlights: ', spotlights)

    return { status: 0, data: spotlights }
  },
  async getSpotlightTypeDetail(id) {
    const lang = i18n.locale
    const cacheKey = `spotlight.type.${lang}.${id}`
    let spotlight = await getCache(cacheKey)

    if (!spotlight) {
      const params = { id }
      if (lang != 'zh-CN') {
        params.lang = lang
      }
      const res = await get(`${PIXIV_NEXT_URL}/api/pixivision/detail`, params)

      if (res && !res.error) {
        res.related_latest?.items?.forEach(a => {
          a.thumbnail = imgProxy(a.thumbnail)
        })
        res.related_recommend?.items?.forEach(a => {
          a.thumbnail = imgProxy(a.thumbnail)
        })

        spotlight = res
        setCache(cacheKey, res, -1)
      } else {
        return {
          status: -1,
          msg: i18n.t('tip.unknown_err'),
        }
      }
    }

    console.log('spotlight: ', spotlight)

    return { status: 0, data: spotlight }
  },

  async getSpotlightDetail(id) {
    const lang = i18n.locale
    const cacheKey = `spotlight.${lang}.${id}`
    let spotlight = await getCache(cacheKey)

    if (!spotlight) {
      const params = {}
      if (lang != 'zh-CN') {
        params.lang = lang
      }
      const res = await get(`${PIXIV_NEXT_URL}/api/pixivision/${id}`, params)

      if (res && !res.error) {
        res.cover = imgProxy(res.cover?.replace('i-ogp.pximg.net', 'i.pximg.net') || '')
        res.items?.forEach(a => {
          a.illust_url = imgProxy(a.illust_url)
          a.user_avatar = imgProxy(a.user_avatar)
        })
        res.related_latest?.items?.forEach(a => {
          a.thumbnail = imgProxy(a.thumbnail)
        })
        res.related_recommend?.items?.forEach(a => {
          a.thumbnail = imgProxy(a.thumbnail)
        })

        spotlight = res
        setCache(cacheKey, res, -1)
      } else {
        return {
          status: -1,
          msg: i18n.t('tip.unknown_err'),
        }
      }
    }

    console.log('spotlight: ', spotlight)

    return { status: 0, data: spotlight }
  },

  /**
   *
   * @param {String} mode 排行榜类型  ['daily_ai', 'daily_r18_ai']
   * @param {Number} page 页数
   * @param {String} date YYYYMMDD 默认为「前天」
   */
  async getAiRankList(mode = 'daily_ai', page = 1, date = dayjs().subtract(2, 'days').format('YYYYMMDD')) {
    date = dayjs(date).format('YYYYMMDD')
    const cacheKey = `rankList_${mode}_${date}_${page}`
    let rankList = await getCache(cacheKey)

    if (!rankList) {
      const res = await get(`${PIXIV_NOW_URL}/ranking`.replace('/http', ''), {
        format: 'json',
        p: page,
        mode,
        date,
      })

      if (res && res.contents) {
        rankList = res.contents.map(e => ({ ...parseAiIllust(e, mode.includes('r18')), _index: e.rank }))
        rankList.length && setCache(cacheKey, rankList, 60 * 60 * 24 * 14)
      } else {
        return {
          status: 0,
          data: [],
        }
      }
    }

    return { status: 0, data: filterCensoredIllusts(rankList) }
  },

  async getWebRankList(mode = 'daily', page = 1, date = dayjs().subtract(2, 'days').format('YYYYMMDD'), content) {
    date = dayjs(date).format('YYYYMMDD')
    const cacheKey = `rankList_${mode}_${content}_${date}_${page}`
    let rankList = await getCache(cacheKey)

    if (!rankList) {
      const res = await get(`${PIXIV_NOW_URL}/ranking`.replace('/http', ''), {
        format: 'json',
        p: page,
        mode,
        date,
        content,
      })

      if (res && res.contents) {
        rankList = res.contents.map(e => ({ ...parseWebRankIllust(e, mode, content), _index: e.rank }))
        rankList.length && setCache(cacheKey, rankList, 60 * 60 * 24 * 14)
      } else {
        return {
          status: 0,
          data: [],
        }
      }
    }

    return { status: 0, data: filterCensoredIllusts(rankList) }
  },

  async getDiscoveryArtworks(mode = 'all', limit = 60) {
    let list

    const res = await get(`${PIXIV_NOW_URL}/ajax/discovery/artworks`, {
      mode,
      limit,
      lang: 'zh',
      _vercel_no_cache: 1,
      _t: Date.now(),
    })

    const illust = res?.thumbnails?.illust
    if (illust) {
      const blockIds = res?.recommendedIllusts?.filter(e => JSON.stringify(e).includes('illust_for_user_mf_vh_bookmark'))?.map(e => `${e.illustId}`) || []
      const blockTags = ['拷问', '重口', '猎奇', '羞辱', '萝莉 ', '虐待', '虐杀', '血腥', '足控', '敗北', '足裏', '足指', '裸足', '处刑', '束缚', '内臓', '銃フェラ', 'sexy', 'honeyselect2', 'honeyselect', 'HoneySelect', 'HS2', '3D', '斗罗大陆', '漫画', 'manga', '中文', '中国語']
      list = illust.filter(e => !e.isAdContainer && !blockIds.includes(`${e.id}`) && !isBlockTagHit(blockTags, e.tags)).map(e => parseWebApiIllust(e))
    } else {
      return {
        status: 0,
        data: [],
      }
    }

    return { status: 0, data: filterCensoredIllusts(list) }
  },

  async getDiscoveryList(mode = 'safe', max = 18, nocache = false) {
    let list

    const params = { mode, max, _anon: 1 }

    if (nocache) {
      params._vercel_no_cache = 1
      params._t = Date.now()
    }

    const res = await get(`${PIXIV_NOW_URL}/ajax/illust/discovery`, params)

    if (res && res.illusts) {
      list = res.illusts.filter(e => !e.isAdContainer).map(e => parseWebApiIllust(e))
    } else {
      return {
        status: 0,
        data: [],
      }
    }

    return { status: 0, data: filterCensoredIllusts(list) }
  },

  async getPopularIllusts(page = 1) {
    let artList

    const res = await get(`${PIXIV_NOW_URL}/touch/ajax_api/ajax_api.php`, {
      p: page,
      mode: 'popular_illust',
      _anon: 1,
    })

    console.log('getPopularIllusts: ', res)
    if (Array.isArray(res)) {
      artList = res.map(parseWebPopularIllust)
    } else {
      return {
        status: 0,
        data: [],
      }
    }

    return { status: 0, data: filterCensoredIllusts(artList) }
  },

  /**
   *
   * @param {String} mode 排行榜类型  ['day', 'week', 'month', 'week_rookie', 'week_original', 'day_male', 'day_female', 'day_r18', 'week_r18', 'day_male_r18', 'day_female_r18', 'week_r18g']
   * @param {Number} page 页数
   * @param {String} date YYYY-MM-DD 默认为「前天」
   */
  async getRankList(mode = 'day', page = 1, date = dayjs().subtract(2, 'days').format('YYYY-MM-DD')) {
    date = dayjs(date).format('YYYY-MM-DD')
    const cacheKey = `rankList_${mode}_${date}_${page}`
    let rankList = await getCache(cacheKey)

    if (!rankList) {
      const res = await get('/rank', {
        mode,
        page,
        date,
      })

      if (res.illusts) {
        rankList = res.illusts.map((art, i) => ({ ...parseIllust(art), _index: (page - 1) * 30 + i + 1 }))
        rankList.length && setCache(cacheKey, rankList, 60 * 60 * 24 * 14)
      } else if (res.error) {
        return {
          status: -1,
          msg: dealErrMsg(res),
        }
      } else {
        return {
          status: -1,
          msg: i18n.t('tip.unknown_err'),
        }
      }
    }

    return { status: 0, data: filterCensoredIllusts(rankList) }
  },

  async getNovelRankList(mode = 'day', page = 1, date = dayjs().subtract(2, 'days').format('YYYY-MM-DD')) {
    date = dayjs(date).format('YYYY-MM-DD')
    const cacheKey = `rank_novel_${mode}_${date}_${page}`
    let rankList = await getCache(cacheKey)

    if (!rankList) {
      const res = await get('/rank_novel', {
        mode,
        page,
        date,
      })

      if (res.novels) {
        rankList = res.novels.map((art, i) => ({ ...parseNovel(art), _index: (page - 1) * 30 + i + 1 }))
        rankList.length && setCache(cacheKey, rankList, 60 * 60 * 24 * 14)
      } else if (res.error) {
        return {
          status: -1,
          msg: dealErrMsg(res),
        }
      } else {
        return {
          status: -1,
          msg: i18n.t('tip.unknown_err'),
        }
      }
    }

    return { status: 0, data: filterCensoredNovels(rankList) }
  },

  /**
   *
   * @param {String} word 关键词
   * @param {Number} page 页数
   */
  async search(word, page = 1, params = {}) {
    const cacheKey = `searchList_${word}_${page}_${JSON.stringify(params)}`
    let searchList = SessionStorage.get(cacheKey)

    if (!searchList) {
      const res = await get('/search', {
        word,
        page,
        ...params,
      })

      if (res.illusts) {
        searchList = res.illusts.map(art => parseIllust(art))
        SessionStorage.set(cacheKey, searchList, 60 * 60 * 1)
      } else if (res.error) {
        return {
          status: -1,
          msg: dealErrMsg(res),
        }
      } else {
        return {
          status: -1,
          msg: i18n.t('tip.unknown_err'),
        }
      }
    }

    return { status: 0, data: filterCensoredIllusts(searchList) }
  },

  async searchNovel(word, page = 1, params = {}) {
    const cacheKey = `searchList_novel_${word}_${page}_${JSON.stringify(params)}`
    let searchList = SessionStorage.get(cacheKey)
    let hasNext

    if (!searchList) {
      const res = await get('/search_novel', {
        word,
        page,
        ...params,
      })

      if (res.novels) {
        searchList = res.novels.map(art => parseNovel(art))
        SessionStorage.set(cacheKey, searchList, 60 * 60 * 1)
        hasNext = Boolean(res.next_url)
      } else if (res.error) {
        return {
          status: -1,
          msg: dealErrMsg(res),
        }
      } else {
        return {
          status: -1,
          msg: i18n.t('tip.unknown_err'),
        }
      }
    }

    return { status: 0, data: filterCensoredNovels(searchList), hasNext }
  },

  async getNovelDetail(id) {
    const cacheKey = `novel_${id}`
    let artwork = await getCache(cacheKey)

    if (!artwork) {
      const res = await get('/novel_detail', {
        id,
      })

      if (res.novel) {
        artwork = parseNovel(res.novel)
        setCache(cacheKey, artwork, -1)
      } else if (res.error) {
        return {
          status: -1,
          msg: dealErrMsg(res),
        }
      } else {
        return {
          status: -1,
          msg: i18n.t('tip.unknown_err'),
        }
      }
    }

    return { status: 0, data: artwork }
  },

  async getNovelText(id) {
    const cacheKey = `novel_text_${id}`
    let artwork = await getCache(cacheKey)

    if (!artwork) {
      let res
      if (notSelfHibiApi) {
        res = await get(`${PIXIV_NOW_URL}/ajax/novel/${id}`).then(r => ({
          text: r.content,
          prev: r.seriesNavData?.prev,
          next: r.seriesNavData?.next,
          embedImgs: r.textEmbeddedImages,
        }))
      } else {
        res = await get('/webview_novel', { id }).then(r => ({
          text: r.text,
          prev: r.seriesNavigation?.prevNovel,
          next: r.seriesNavigation?.nextNovel,
          embedImgs: r.images,
        }))
      }

      if (res.text) {
        artwork = res
        setCache(cacheKey, artwork, -1)
      } else if (res.error) {
        return {
          status: -1,
          msg: dealErrMsg(res),
        }
      } else {
        return {
          status: -1,
          msg: i18n.t('tip.unknown_err'),
        }
      }
    }

    return { status: 0, data: artwork }
  },

  // async getNovelText(id) {
  //   const cacheKey = `novel_text_${id}`
  //   let artwork = await getCache(cacheKey)

  //   if (!artwork) {
  //     const res = await get('/novel_text', {
  //       id,
  //     })

  //     if (res.novel_text) {
  //       artwork = {
  //         text: res.novel_text,
  //         prev: res.series_prev?.id && parseNovel(res.series_prev),
  //         next: res.series_next?.id && parseNovel(res.series_next),
  //       }
  //       setCache(cacheKey, artwork, -1)
  //     } else if (res.error) {
  //       return {
  //         status: -1,
  //         msg: dealErrMsg(res),
  //       }
  //     } else {
  //       return {
  //         status: -1,
  //         msg: i18n.t('tip.unknown_err'),
  //       }
  //     }
  //   }

  //   return { status: 0, data: artwork }
  // },

  /**
   *
   * @param {Number} id 作品ID
   */
  async getArtwork(id) {
    const cacheKey = `artwork_${id}`
    let artwork = await getCache(cacheKey)

    if (!artwork) {
      const res = await get('/illust', {
        id,
      })

      if (res.illust) {
        artwork = parseIllust(res.illust)
        try {
          // if (!artwork.caption) {
          //   const webIllust = await get(`${PIXIV_NOW_URL}/ajax/illust/${id}?full=1`)
          //   artwork.caption = webIllust.illustComment
          // }
          if (artwork.images[0].o.includes('common/images/limit')) {
            const [webRes, webImages] = await Promise.all([
              get(`${PIXIV_NOW_URL}/ajax/illust/${id}?full=1`),
              get(`${PIXIV_NOW_URL}/ajax/illust/${id}/pages`),
            ])
            artwork = {
              id: webRes.illustId,
              title: webRes.illustTitle,
              caption: webRes.illustComment,
              author: {
                id: webRes.userId,
                name: webRes.userName,
                avatar: artwork.author.avatar,
                is_followed: false,
              },
              created: webRes.createDate,
              images: webImages.map(e => ({
                s: imgProxy(e.urls.thumb_mini),
                m: imgProxy(e.urls.small),
                l: imgProxy(e.urls.regular),
                o: imgProxy(e.urls.original),
              })),
              tags: webRes.tags.tags.map(e => ({ name: e.tag })),
              width: webRes.width,
              height: webRes.height,
              count: webRes.pageCount,
              view: webRes.viewCount,
              like: webRes.bookmarkCount,
              x_restrict: webRes.xRestrict,
              illust_ai_type: webRes.aiType,
              type: ['illust', 'manga', 'ugoira'][webRes.illustType || 0],
              is_bookmarked: false,
              series: null,
            }
          }
        } catch (err) {
          console.log('err: ', err)
        }
        setCache(cacheKey, artwork, -1)
      } else if (res.error) {
        return {
          status: -1,
          msg: dealErrMsg(res),
        }
      } else {
        return {
          status: -1,
          msg: i18n.t('tip.unknown_err'),
        }
      }
    }

    return { status: 0, data: artwork }
  },

  /**
   *
   * @param {Number} id 作品ID
   */
  async ugoiraMetadata(id) {
    const cacheKey = `ugoira_${id}`
    let ugoira = await getCache(cacheKey)

    if (!ugoira) {
      const res = await get('/ugoira_metadata', {
        id,
      })

      if (res.error) {
        return {
          status: -1,
          msg: dealErrMsg(res),
        }
      } else {
        ugoira = {
          // zip: imgProxy(res.ugoira_metadata.zip_urls.medium),
          zip: imgProxy(res.ugoira_metadata.zip_urls.medium.replace('_ugoira600x600', '_ugoira1920x1080')),
          frames: res.ugoira_metadata.frames,
        }
      }

      setCache(cacheKey, ugoira, -1)
    }

    return { status: 0, data: ugoira }
  },

  /**
   *
   * @param {Number} id 画师ID
   */
  async getMemberInfo(id) {
    const cacheKey = `memberInfo_${id}`
    let memberInfo = await getCache(cacheKey)

    if (!memberInfo) {
      const res = await get('/member', { id })

      if (res.error) {
        return {
          status: -1,
          msg: dealErrMsg(res),
        }
      } else {
        memberInfo = parseUser(res)
        try {
          if (!memberInfo.comment || !memberInfo.webpage || !memberInfo.twitter_url) {
            const webRes = await get(`${PIXIV_NOW_URL}/ajax/user/${id}?full=1`)
            memberInfo.comment = webRes?.commentHtml
            memberInfo.webpage = webRes?.webpage
            memberInfo.twitter_url = webRes?.social?.twitter?.url || ''
            memberInfo.twitter_account = webRes?.social?.twitter?.url?.split('/').pop() || ''
          }
          memberInfo.comment = await mintFilter(memberInfo.comment)
        } catch (err) {
          console.log('err: ', err)
        }
        setCache(cacheKey, memberInfo, 60 * 60 * 24)
      }
    }

    return { status: 0, data: memberInfo }
  },

  /**
   * 获取画师作品标签
   * @param {Number} id 画师ID
   */
  async getMemberTags(id, isR18On = false) {
    const params = { lang: 'zh' }
    if (isR18On) params.all = '1'
    const cacheKey = `memberTags_${id}_${isR18On}`
    let memberInfo = await getCache(cacheKey)

    if (!memberInfo) {
      const res = await get(`${PIXIV_NOW_URL}/ajax/user/${id}/illusts/tags`, params)

      if (!Array.isArray(res)) {
        return {
          status: -1,
          msg: dealErrMsg(res.error ? res : { error: res }),
        }
      } else {
        memberInfo = res.sort((a, b) => b.cnt - a.cnt)
        setCache(cacheKey, memberInfo, 60 * 60 * 24)
      }
    }

    return { status: 0, data: memberInfo }
  },

  /**
   * 获取画师标签下的作品
   * @param {number} id 画师ID
   * @param {string} tag 标签
   * @param {number} page 页数
   */
  async getMemberTagArtworks(id, tag, page = 1) {
    const cacheKey = `memberTagArtworks_${id}_${tag}_${page}`
    let memberInfo = await getCache(cacheKey)

    if (!memberInfo) {
      const res = await get(`${PIXIV_NOW_URL}/ajax/user/${id}/illusts/tag`, {
        tag,
        offset: (page - 1) * 48,
        limit: 48,
        sensitiveFilterMode: 'userSetting',
        lang: 'zh',
      })

      if (!Array.isArray(res.works)) {
        return {
          status: -1,
          msg: dealErrMsg(res.error ? res : { error: res }),
        }
      } else {
        memberInfo = {
          total: res.total,
          currLen: res.works.length,
          works: res.works.map(parseWebApiIllust),
        }
        setCache(cacheKey, memberInfo, 60 * 60 * 12)
      }
    }

    memberInfo.works = filterCensoredIllusts(memberInfo.works)

    return { status: 0, data: memberInfo }
  },

  /**
   *
   * @param {Number} id 画师ID
   * @param {Number} page 页数
   */
  async getMemberArtwork(id, page, illust_type = 'illust') {
    const cacheKey = `memberArtwork_${id}_${illust_type}_p${page}`
    let memberArtwork = await getCache(cacheKey)

    if (!memberArtwork) {
      const res = await get('/member_illust', {
        id,
        page,
        illust_type,
      })

      if (res.illusts) {
        memberArtwork = res.illusts.map(art => parseIllust(art))
        setCache(cacheKey, memberArtwork, 60 * 60 * 6)
      } else if (res.error) {
        return {
          status: -1,
          msg: dealErrMsg(res),
        }
      } else {
        return {
          status: -1,
          msg: i18n.t('tip.unknown_err'),
        }
      }
    }

    return { status: 0, data: filterCensoredIllusts(memberArtwork) }
  },

  async getMemberIllustSeries(id, page = 1) {
    const cacheKey = `member_illust_series_${id}_${page}`
    let memberArtwork = await getCache(cacheKey)

    if (!memberArtwork) {
      const res = await get('/member_illust_series', { id, page })

      if (res.illust_series_details) {
        res.illust_series_details.forEach(e => { e.cover_image_urls.medium = imgProxy(e.cover_image_urls.medium) })
        memberArtwork = res.illust_series_details
        memberArtwork.next = !!res.next_url
        setCache(cacheKey, memberArtwork, 60 * 60 * 24)
      } else if (res.error) {
        return {
          status: -1,
          msg: dealErrMsg(res),
        }
      } else {
        return {
          status: -1,
          msg: i18n.t('tip.unknown_err'),
        }
      }
    }

    return { status: 0, data: memberArtwork }
  },

  async getIllustSeries(id, page = 1) {
    const cacheKey = `illust_series_${id}_${page}`
    let data = await getCache(cacheKey)

    if (!data) {
      const res = await get('/illust_series', { id, page })

      if (res.illusts) {
        data = res.illusts.map(art => parseIllust(art))
        data.next = !!res.next_url
        data.detail = res.illust_series_detail
        data.detail.cover = imgProxy(res.illust_series_detail?.cover_image_urls?.medium || '')
        setCache(cacheKey, data, 60 * 60 * 12)
      } else if (res.error) {
        return {
          status: -1,
          msg: dealErrMsg(res),
        }
      } else {
        return {
          status: -1,
          msg: i18n.t('tip.unknown_err'),
        }
      }
    }

    return { status: 0, data }
  },

  async getMemberNovelSeries(id, page = 1) {
    const cacheKey = `member_novel_series_${id}_${page}`
    let memberArtwork = await getCache(cacheKey)

    if (!memberArtwork) {
      const res = await get('/member_novel_series', { id, page })

      if (res.novel_series_details) {
        memberArtwork = res.novel_series_details
        memberArtwork.next = !!res.next_url
        setCache(cacheKey, memberArtwork, 60 * 60 * 24)
      } else if (res.error) {
        return {
          status: -1,
          msg: dealErrMsg(res),
        }
      } else {
        return {
          status: -1,
          msg: i18n.t('tip.unknown_err'),
        }
      }
    }

    return { status: 0, data: memberArtwork }
  },

  async getNovelSeries(id, page = 1) {
    const cacheKey = `novel_series_${id}_${page}`
    let data = await getCache(cacheKey)

    if (!data) {
      const res = await get('/novel_series', { id, page })

      if (res.novels) {
        data = res.novels.map(art => parseNovel(art))
        data.next = !!res.next_url
        data.detail = res.novel_series_detail
        setCache(cacheKey, data, 60 * 60 * 12)
      } else if (res.error) {
        return {
          status: -1,
          msg: dealErrMsg(res),
        }
      } else {
        return {
          status: -1,
          msg: i18n.t('tip.unknown_err'),
        }
      }
    }

    return { status: 0, data }
  },

  async getMemberNovel(id, page = 1) {
    const cacheKey = `member_novel_${id}_p${page}`
    let memberArtwork = await getCache(cacheKey)

    if (!memberArtwork) {
      const res = await get('/member_novel', {
        id,
        page,
      })

      if (res.novels) {
        memberArtwork = res.novels.map(art => parseNovel(art))
        setCache(cacheKey, memberArtwork, 60 * 60 * 6)
      } else if (res.error) {
        return {
          status: -1,
          msg: dealErrMsg(res),
        }
      } else {
        return {
          status: -1,
          msg: i18n.t('tip.unknown_err'),
        }
      }
    }

    return { status: 0, data: filterCensoredNovels(memberArtwork) }
  },

  /**
   *
   * @param {Number} id 画师ID
   * @param {Number} max_bookmark_id max_bookmark_id
   */
  async getMemberFavorite(id, max_bookmark_id, nocache = false, options = {}) {
    const cacheKey = `memberFavorite_${id}_m${max_bookmark_id}`
    let memberFavorite = nocache ? null : await getCache(cacheKey)

    if (!memberFavorite) {
      memberFavorite = {}

      const params = { id, max_bookmark_id, ...options }
      const headers = {}
      if (nocache) {
        params.t = Date.now()
        headers['cache-control'] = 'no-cache'
      }
      const res = await get('/favorite', params, { headers })

      if (res.illusts) {
        const url = new URLSearchParams(res.next_url)
        memberFavorite.next = url.get('max_bookmark_id')
        memberFavorite.illusts = res.illusts.map(art => parseIllust(art))

        !nocache && setCache(cacheKey, memberFavorite, 60 * 60 * 12)
      } else if (res.error) {
        return {
          status: -1,
          msg: dealErrMsg(res),
        }
      } else {
        return {
          status: -1,
          msg: i18n.t('tip.unknown_err'),
        }
      }
    }

    memberFavorite.illusts = filterCensoredIllusts(memberFavorite.illusts)
    return { status: 0, data: memberFavorite }
  },

  async getMemberFavoriteNovel(id, max_bookmark_id, nocache = false, options = {}) {
    const cacheKey = `member_fav_novel_${id}_m${max_bookmark_id}`
    let memberFavorite = nocache ? null : await getCache(cacheKey)

    if (!memberFavorite) {
      memberFavorite = {}

      const params = { id, max_bookmark_id, ...options }
      const headers = {}
      if (nocache) {
        params.t = Date.now()
        headers['cache-control'] = 'no-cache'
      }
      const res = await get('/favorite_novel', params, { headers })

      if (res.novels) {
        const url = new URLSearchParams(res.next_url)
        memberFavorite.next = url.get('max_bookmark_id')
        memberFavorite.novels = res.novels.map(art => parseNovel(art))

        !nocache && setCache(cacheKey, memberFavorite, 60 * 60 * 12)
      } else if (res.error) {
        return {
          status: -1,
          msg: dealErrMsg(res),
        }
      } else {
        return {
          status: -1,
          msg: i18n.t('tip.unknown_err'),
        }
      }
    }

    return { status: 0, data: memberFavorite }
  },

  async getTags() {
    const cacheKey = 'tags'
    let tags = await getCache(cacheKey)

    if (!tags) {
      const res = await get('/tags')

      if (res.trend_tags) {
        tags = res.trend_tags.map(data => {
          const { tag, translated_name } = data
          return {
            name: tag,
            tname: translated_name,
            pic: imgProxy(data.illust.image_urls.square_medium),
          }
        })

        setCache(cacheKey, tags, 60 * 60 * 12)
      } else if (res.error) {
        return {
          status: -1,
          msg: dealErrMsg(res),
        }
      } else {
        return {
          status: -1,
          msg: i18n.t('tip.unknown_err'),
        }
      }
    }

    return { status: 0, data: tags }
  },

  async getNovelTags() {
    const cacheKey = 'tags.novel'
    let tags = await getCache(cacheKey)

    if (!tags) {
      const res = await get('/tags_novel')

      if (res.trend_tags) {
        tags = res.trend_tags.map(data => {
          const { tag, translated_name } = data
          return {
            name: tag,
            tname: translated_name,
            pic: imgProxy(data.illust.image_urls.square_medium),
          }
        })

        setCache(cacheKey, tags, 60 * 60 * 12)
      } else if (res.error) {
        return {
          status: -1,
          msg: dealErrMsg(res),
        }
      } else {
        return {
          status: -1,
          msg: i18n.t('tip.unknown_err'),
        }
      }
    }

    return { status: 0, data: tags }
  },
  async getLiveList(page = 1) {
    const res = await get('/live_list', { page, _t: dayjs().format('YYYYMMDDHHmm') })

    if (res.error) {
      return {
        status: -1,
        msg: dealErrMsg(res),
      }
    }
    if (!res.lives) {
      return {
        status: -1,
        msg: i18n.t('tip.unknown_err'),
      }
    }

    return { status: 0, data: res.lives }
  },

  /**
   * @param {string} tag
   * @returns {Promise<string[]>}
   */
  async getTagStories(tag) {
    const cacheKey = `tag_stories_${tag}`
    const cache = await getCache(cacheKey)
    if (cache) return cache
    const res = await get(`${PIXIV_NOW_URL}/ajax/stories/tag_stories?tag=${tag}&lang=zh`)
    const ids = res?.tagStoryIds
    if (!Array.isArray(ids) || !ids.length) return []
    await setCache(cacheKey, ids, 60 * 60 * 24 * 3)
    return ids
  },
  /**
   * @param {string[]} ids
   * @returns {Promise<{id:string;label:string;coverImage:string}[]>}
   */
  async getTagStoryDetails(ids = []) {
    const cacheKey = `tag_stories_details_${ids}`
    const cache = await getCache(cacheKey)
    if (cache) return cache
    const params = new URLSearchParams()
    ids.forEach(e => params.append('storyIds[]', e))
    params.append('lang', 'zh')
    const res = await get(`${PIXIV_NEXT_URL}/https://www.pixiv.net/ajax/stories/tag_stories/details/many?${params}`)
    const details = res?.body?.storyDetails
    if (!Array.isArray(details) || !details.length) return []
    details.forEach(e => { e.coverImage = imgProxy(e.coverImage) })
    await setCache(cacheKey, details, 60 * 60 * 24 * 3)
    return details
  },
  /**
   * @param {string} tag
   * @param {string} date
   * @returns {Promise<string>}
   */
  async getTagStoryPage(tag, date) {
    const cacheKey = `tag_story_page_${tag}_${date}`
    const cache = await getCache(cacheKey)
    if (cache) return cache
    const resp = await fetch(`${COMMON_PROXY}https://www.pixiv.net/stories/tags/${tag}/artworks/${date}`)
    if (!resp.ok) return ''
    let html = await resp.text()
    html = html
      .replace(/i\.pximg\.net/g, PXIMG_PROXY_BASE)
      .replace(/https:\/\/i-mail\.pximg\.net/g, `${COMMON_PROXY}https://i-mail.pximg.net`)
      .replace(/https:\/\/source\.pixiv\.net/g, `${COMMON_PROXY}https://source.pixiv.net`)
      .replace(/<amp-analytics.+<\/amp-analytics>/g, '')
    if (html) {
      await setCache(cacheKey, html, -1)
    }
    return html
  },

  /**
   * @returns {Promise<[string, string|null][]>}
   */
  async getCollectionRecommendedTags() {
    const cacheKey = 'collections.recommendedTags'
    const cache = await getCache(cacheKey)
    if (cache) return cache
    const res = await get(`${PIXIV_NOW_URL}/ajax/collections/search/recommended_tags?lang=zh`)
    let tags = res?.recommendedTags
    if (!Array.isArray(tags) || !tags.length) return []
    tags = tags.map(e => {
      const t = res.tagTranslation?.[e]
      if (!t) return [e, null]
      return [e, t.zh || t.zh_tw || t.en]
    })
    await setCache(cacheKey, tags, 60 * 60 * 24)
    return tags
  },
  /**
   * @returns {Promise<{ recommend:any[]; everyone:any[]; tagRecommend:{tag:string;list:any[]}[] } | null>}
   */
  async getCollectionTop() {
    try {
      const cacheKey = 'collections.top'
      const cache = await getCache(cacheKey)
      if (cache) return cache
      const data = await get(`${PIXIV_NOW_URL}/ajax/top/collection?lang=zh`)
      const cols = data.thumbnails.collection
      if (!Array.isArray(cols) || !cols.length) return null
      const map = cols.reduce((acc, cur) => {
        acc[cur.id] = cur
        return acc
      }, {})
      const result = {}
      result.recommend = data.page.recommendCollectionIds.map(e => map[e])
      result.everyone = data.page.everyoneCollectionIds.map(e => map[e])
      result.tagRecommend = data.page.tagRecommendCollectionIds.map(e => ({
        tag: e.tag,
        list: e.ids.map(f => map[f]),
      }))
      await setCache(cacheKey, result, 60 * 60 * 3)
      return result
    } catch (err) {
      console.log('err: ', err)
      return null
    }
  },
  async getCollectionRelated(id, page = 1) {
    try {
      const cacheKey = `collections.recomm.${id}.${page}`
      const nextIdsKey = `collections.recomm.${id}.nextIds`
      const cache = await getCache(cacheKey)
      if (cache) return cache
      if (page == 1) {
        const { collections, nextIds } = await get(`${PIXIV_NOW_URL}/ajax/collection/${id}/recommend/init?lang=zh`)
        if (!Array.isArray(collections) || !collections.length) return []
        await setCache(cacheKey, collections, 60 * 60 * 24)
        if (Array.isArray(nextIds) && nextIds.length) {
          await setCache(nextIdsKey, nextIds, 60 * 60 * 24)
        }
        return collections
      }
      const nextIds = await getCache(nextIdsKey)
      if (!Array.isArray(nextIds) || !nextIds.length) return []
      const cur = (page - 1) * 10
      const ids = nextIds.slice(cur, cur + 10)
      if (!ids.length) return []
      const params = new URLSearchParams()
      ids.forEach(e => params.append('ids[]', e))
      params.append('lang', 'zh')
      const res = await get(`${PIXIV_NEXT_URL}/https://www.pixiv.net/ajax/collection/recommend/collections?${params}`)
      const data = res?.body?.collections
      if (!Array.isArray(data) || !data.length) return []
      await setCache(cacheKey, data, 60 * 60 * 24)
      return data
    } catch (err) {
      console.log('err: ', err)
      return []
    }
  },
  async searchCollections(tag, page = 1, mode = 'safe') {
    try {
      const cacheKey = `collections.search.${tag}.${page}.${mode}`
      const cache = await getCache(cacheKey)
      if (cache) return cache
      const params = new URLSearchParams()
      if (tag) params.append('tags[]', tag)
      params.append('mode', mode)
      params.append('limit', 20)
      params.append('offset', (page - 1) * 20)
      params.append('lang', 'zh')
      const res = await get(`${PIXIV_NOW_URL}/ajax/collections/search?${params}`)
      const data = res?.thumbnails?.collection
      if (!Array.isArray(data) || !data.length) return []
      await setCache(cacheKey, data, 60 * 30)
      return data
    } catch (err) {
      console.log('err: ', err)
      return []
    }
  },
  async getUserCollections(id) {
    try {
      const cacheKey = `collections.user.${id}`
      const cache = await getCache(cacheKey)
      if (cache) return cache
      const res1 = await get(`${PIXIV_NOW_URL}/ajax/user/${id}/profile/all?sensitiveFilterMode=userSetting&lang=zh`)
      const ids = res1?.collectionIds
      if (!Array.isArray(ids) || !ids.length) return []
      const params = new URLSearchParams()
      ids.forEach(e => params.append('ids[]', e))
      params.append('lang', 'zh')
      const res2 = await get(`${PIXIV_NEXT_URL}/https://www.pixiv.net/ajax/user/${id}/profile/collections?${params}`)
      const data = res2?.body?.works
      if (!Array.isArray(data) || !data.length) return []
      await setCache(cacheKey, data, 60 * 60 * 24)
      return data
    } catch (err) {
      console.log('err: ', err)
      return []
    }
  },
  async getCollectionDetail(id) {
    try {
      sessionStorage.removeItem('__PXV_CL_SCROLL_TOP_' + id)
      const cacheKey = `collections.detail.${id}`
      const cache = await getCache(cacheKey)
      if (cache) return cache
      const resp = await fetch(`${PIXIV_NEXT_URL}/https://www.pixiv.net/collections/${id}`)
      if (!resp.ok) return ''
      let html = await resp.text()
      html = html.replace(/i\.pximg\.net/g, PXIMG_PROXY_BASE)
      const doc = new DOMParser().parseFromString(html, 'text/html')
      const data = JSON.parse(doc.querySelector('#__NEXT_DATA__').innerHTML).props.pageProps
      const thumbnail = JSON.parse(data.serverSerializedPreloadedState).thumbnail
      const illusts = Object.values(thumbnail.illust).concat(Object.values(thumbnail.novel))
      doc.querySelectorAll('a[data-ga4-label="user_icon_link"]').forEach(a => {
        const uid = a.getAttribute('data-gtm-value')
        const act = illusts.find(e => e.userId == uid)
        if (!act) return
        a.querySelector('div').innerHTML = `<img alt="${act.userName}" width="16" height="16" src="${act.profileImageUrl}" style="object-fit: cover; object-position: center top;">`
      })
      doc.querySelectorAll('a[data-ga4-label="thumbnail_link"]').forEach(a => {
        if (a.innerHTML.trim()) return
        const id = a.getAttribute('href')?.split('/')?.pop()
        const act = illusts.find(e => e.id == id)
        if (!act) return
        a.innerHTML = `<img alt="${act.alt}" class="block size-full object-cover object-top" loading="lazy" src="${act.url}">`
      })
      doc.querySelectorAll('a[href^="/novel/show.php?id="]:has(figure)').forEach(a => {
        const nid = a.getAttribute('data-gtm-value')
        const act = thumbnail.novel[nid]
        if (!act) return
        const figure = a.querySelector('figure')
        figure.setAttribute('src', act.url)
        figure.setAttribute('alt', act.title)
        figure.setAttribute('style', 'object-fit: cover; object-position: center center;')
        figure.outerHTML = figure.outerHTML.replace(/figure/g, 'img')
      })
      doc.querySelectorAll('[data-ga4-label="thumbnail"]:has(a[href^="/novel/show.php"])').forEach(el => {
        const a = el.querySelector('a[href^="/novel/show.php"]')
        if (!a) return
        let nid = a.getAttribute('data-ga4-entity-id')?.split('/')?.pop()
        if (!nid) nid = a.getAttribute('data-gtm-value')
        const act = thumbnail.novel[nid]
        if (!act) return
        const caption = el.querySelector('.break-all.w-full > [class*="line-clamp-1"] + [title=""][class*="line-clamp-2"]')
        if (!caption.innerHTML.trim()) caption.innerHTML = act.description
      })
      setProperFontSize(
        doc.querySelectorAll('[data-ga4-label="thumbnail"]:not(:has(a[href^="/novel/show.php"])) div[lang][style*="font-family"]')
      )
      doc.querySelectorAll('a').forEach(a => {
        a.setAttribute('target', '')
      })
      doc.querySelectorAll('link[href*="fonts.googleapis.com"]').forEach(el => {
        const href = el.getAttribute('href').replace('fonts.googleapis.com', 'fonts.loli.net')
        el.outerHTML = `<link href="${href}" onload="this.rel='stylesheet'" rel="preload" as="style" crossorigin />`
      })
      doc.querySelectorAll('script').forEach(el => {
        el.remove()
      })
      const lang = doc.documentElement.getAttribute('lang')
      const styles = [...doc.querySelectorAll('style')].map(e => e.outerHTML).join('')
      const linkStyleTexts = await Promise.all(
        [...doc.querySelectorAll('link')]
          .filter(e => e.rel == 'stylesheet' && e.href.endsWith('.css'))
          .map(e => fetch(PIXIV_NEXT_URL + '/' + e.href).then(r => r.text()))
      )
      const tiles = doc.querySelector('[data-ga4-label="collection_tiles"]').outerHTML
      const token = Math.random().toString(32).slice(2)
      const theme = localStorage.PXV_DARK ? 'data-theme="dark"' : 'data-theme="light"'
      html = `<html lang="${lang}" ${theme}>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=1">
          <style>${linkStyleTexts.join('\n')}</style>
          ${styles}
          <style>
            html{min-width: unset !important}
            body{width: 97vw;margin: 1vw auto;box-sizing: border-box;}
            [data-theme="dark"] .backdrop-blur-md,
            [data-theme="dark"] .backdrop-blur-sm {
              border-color: rgba(0, 0, 0, 0.08) !important;
              background-color: rgba(0, 0, 0, 0.8) !important;
            }
            [data-ga4-label="collection_tiles"]{overflow: auto;aspect-ratio: unset}
            [data-ga4-label="collection_tiles"] > .absolute{display: none}
            a [style*="width:0px"]:not(:has(img)){flex: 1;width: auto !important}
            a [style*="width:0px"]:has(img){width: 40% !important}
            a[href*="/jump.php?url="] > div[style*="width:0px"]:has(img,pixiv-icon){width:30% !important}
            a[href*="/jump.php?url="] > div[style*="width:0px"]:has(img,pixiv-icon) + div{width:70% !important}
            [class*="line-clamp"][style*="line-clamp:0"]{line-clamp:none!important;-webkit-line-clamp:none!important}
            pixiv-icon[name="24/Link"]{
              background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTQuMDMxIDMuMzY3YTQuNjY2IDQuNjY2IDAgMTE2LjYgNi41OThsLTQuMjQzIDQuMjQzYTQuNjY1IDQuNjY1IDAgMDEtMi4xNjMgMS4yMjZoLS4wMzdsLS4xOTMuMDQtLjEwNy4wMi0uMjMuMDM0aC0uMTEzYy0uMDUgMC0uMDk3LjAwNS0uMTQyLjAxYTEuMjk2IDEuMjk2IDAgMDEtLjA5NS4wMWwtLjIuMDIzaC0uMjUzYTQuNjE2IDQuNjE2IDAgMDEtLjQ5Ny0uMDQ3IDUuMzU2IDUuMzU2IDAgMDEtLjQwMy0uMDgzbC0uMTk3LS4wNTNhMi42NCAyLjY0IDAgMDEtLjIxMy0uMDdsLS4wNzgtLjAyOWMtLjA0NS0uMDE2LS4wOS0uMDMyLS4xMzUtLjA1MWE0LjcxIDQuNzEgMCAwMC0uMDctLjAzIDQuNjI3IDQuNjI3IDAgMDEtMS40NzMtLjk5NCAxLjMzMyAxLjMzMyAwIDAxMC0xLjg3OSAxLjM2NiAxLjM2NiAwIDAxMS44NzMgMCAyIDIgMCAwMDIuODI2IDBsMS4wOTMtMS4wODYuMDI3LS4wMyAzLjEyNi0zLjEyM2EyIDIgMCAwMC0yLjgzLTIuODNsLTIuNTEgMi41MDdhLjMzMy4zMzMgMCAwMS0uMzYyLjA3MyA1LjYgNS42IDAgMDAtMi4xMy0uNDE3aC0uMTIzYS4zMzMuMzMzIDAgMDEtLjI0My0uNTdsMy40OTUtMy40OTJ6IiBmaWxsPSJjdXJyZW50Q29sb3IiPjwvcGF0aD48cGF0aCBkPSJNMTMuNDE4IDkuMTY2Yy4yODQuMTguNTQ3LjM5MS43ODQuNjMuMjcuMjcuNDEuNjQ0LjM4NiAxLjAyNi0uMDIzLjMyLS4xNi42Mi0uMzg2Ljg0N2ExLjM2NiAxLjM2NiAwIDAxLTEuODczIDAgMiAyIDAgMDAtMi44MjcgMEw1LjI0NiAxNS45MmEyIDIgMCAwMDIuODMgMi44M2wyLjUxNi0yLjUyYS4zMzMuMzMzIDAgMDEuMzYzLS4wNzMgNS42MTIgNS42MTIgMCAwMDIuMTMzLjQxM2guMTM0YS4zMzMuMzMzIDAgMDEuMjM2LjU3bC0zLjUgMy41QTQuNjM2IDQuNjM2IDAgMDE2LjY2NCAyMmE0LjY2NiA0LjY2NiAwIDAxLTMuMy03Ljk2Mmw0LjI0LTQuMjQyYTQuNjY2IDQuNjY2IDAgMDE1LjgxNi0uNjN6IiBmaWxsPSJjdXJyZW50Q29sb3IiPjwvcGF0aD48L3N2Zz4=) no-repeat center / contain;
            }
            ::-webkit-scrollbar{width: 5px;height: 5px;}
            ::-webkit-scrollbar-track{background: transparent;}
            ::-webkit-scrollbar-thumb{background: #b0b0b0;border-radius: 7px;}
            ::-webkit-scrollbar-thumb:hover{background: #666;}
            @media screen and (max-width: 600px) {
              body{width:100%;margin:0}
              [data-ga4-label="collection_tiles"] .grid[style*="gap:16px"]{gap:8px !important}
              [data-ga4-label="thumbnail"] a[href*="/jump.php?url="]{justify-content: flex-start;align-items: flex-start;}
              [data-ga4-label="thumbnail"] a[href*="/jump.php?url="] > div:has(img,pixiv-icon){display:none}
              [data-ga4-label="thumbnail"] a[href*="/jump.php?url="] > div:has(img,pixiv-icon) + div{width: 100% !important;padding: 2px 8px;}
              ::-webkit-scrollbar{width: 0 !important}
            }
          </style>
          </head>
          <body>
            ${tiles}
            <script>
              window.onpagehide = () => {
                sessionStorage.setItem('__PXV_CL_SCROLL_TOP_' + '${id}', document.documentElement.scrollTop)
              }
              window.onpageshow = () => {
                const scrollTop = sessionStorage.getItem('__PXV_CL_SCROLL_TOP_' + '${id}')
                if (scrollTop) document.documentElement.scrollTop = scrollTop
              }
              document.body.onclick = ev => {
                ev.stopPropagation()
                ev.preventDefault()
                let el = ev.target
                while (el && el.tagName != 'A') {
                  el = el.parentElement
                }
                if (!el) return
                const url = el.href
                window.parent.postMessage({
                  token: '${token}',
                  action: 'push',
                  payload: url
                }, '*')
              }
            </script>
          </body>
      </html>`
      const ucMap = thumbnail.collection
      const result = {
        ...data.collection,
        html,
        _token: token,
        userCols: data.userCollectionIds.map(e => ucMap[e]),
      }
      await setCache(cacheKey, result, -1)
      return result
    } catch (err) {
      console.log('err: ', err)
      return null
    }
  },

}

export default api

function reqGet(path, params) {
  return get('/req_get', {
    path,
    params: JSON.stringify(params),
  })
}

function reqPost(path, data) {
  return get('/req_post', {
    path,
    data: JSON.stringify(data),
    t: Date.now(),
  }, {
    headers: {
      'cache-control': 'no-cache',
    },
  })
}

export const localApi = {
  isLoggedIn() {
    return Boolean(window.APP_CONFIG.useLocalAppApi)
  },
  async me() {
    const res = await get('/me', { _t: Date.now() })
    if (res?.id) {
      return {
        id: res.id,
        pixivId: res.account,
        name: res.name,
        profileImg: imgProxy(res.profile_image_urls.px_170x170),
        profileImgBig: imgProxy(res.profile_image_urls.px_170x170),
        premium: res.is_premium,
        xRestrict: res.x_restrict,
      }
    }
    return null
  },
  async userFollowing(id, page = 1, restrict = 'public') {
    let list = []
    const res = await get('/following', {
      id,
      page,
      restrict,
      t: Date.now(),
    }, {
      headers: {
        'cache-control': 'no-cache',
      },
    })
    if (res.user_previews) {
      list = res.user_previews
        .map(u => {
          return {
            id: u.user.id,
            name: u.user.name,
            avatar: imgProxy(u.user.profile_image_urls.medium),
            illusts: u.illusts.map(i => ({
              id: i.id,
              title: i.title,
              src: imgProxy(i.image_urls.medium),
              x_restrict: i.x_restrict,
              illust_ai_type: i.illust_ai_type,
            })),
          }
        })
    } else if (res.error) {
      return {
        status: -1,
        msg: dealErrMsg(res),
      }
    } else {
      return {
        status: -1,
        msg: i18n.t('tip.unknown_err'),
      }
    }

    return { status: 0, data: list }
  },
  async illustFollow(page = 1, restrict = 'all') {
    let list = []
    const res = await reqGet('v2/illust/follow', {
      restrict,
      offset: (page - 1) * 30,
    })

    if (res.illusts) {
      list = res.illusts.map(art => parseIllust(art))
    } else if (res.error) {
      return {
        status: -1,
        msg: dealErrMsg(res),
      }
    } else {
      return {
        status: -1,
        msg: i18n.t('tip.unknown_err'),
      }
    }

    return { status: 0, data: filterCensoredIllusts(list) }
  },
  async novelFollow(page = 1, restrict = 'all') {
    let list = []
    const offset = (page - 1) * 30
    const params = { restrict }
    if (offset > 0) params.offset = offset
    const res = await reqGet('v1/novel/follow', params)

    if (res.novels) {
      list = res.novels.map(art => parseNovel(art))
    } else if (res.error) {
      return {
        status: -1,
        msg: dealErrMsg(res),
      }
    } else {
      return {
        status: -1,
        msg: i18n.t('tip.unknown_err'),
      }
    }

    return { status: 0, data: filterCensoredNovels(list) }
  },
  async illustBookmarkAdd(id, restrict = 'public', tags) {
    if (!id) return false
    try {
      const res = await reqPost('v2/illust/bookmark/add', {
        illust_id: `${id}`,
        restrict,
        tags,
      })
      return !res.error
    } catch (error) {
      return false
    }
  },
  async illustBookmarkDelete(id) {
    if (!id) return false
    try {
      const res = await reqPost('v1/illust/bookmark/delete', {
        illust_id: `${id}`,
      })
      return !res.error
    } catch (error) {
      return false
    }
  },
  async userFollowAdd(id, restrict = 'public') {
    if (!id) return false
    try {
      const res = await reqPost('v1/user/follow/add', {
        user_id: `${id}`,
        restrict,
      })
      return !res.error
    } catch (error) {
      return false
    }
  },
  async userFollowDelete(id) {
    if (!id) return false
    try {
      const res = await reqPost('v1/user/follow/delete', {
        user_id: `${id}`,
      })
      return !res.error
    } catch (error) {
      return false
    }
  },
  async novelBookmarkAdd(id, restrict = 'public', tags) {
    if (!id) return false
    try {
      const res = await reqPost('v2/novel/bookmark/add', {
        novel_id: `${id}`,
        restrict,
        tags,
      })
      return !res.error
    } catch (error) {
      return false
    }
  },
  async novelBookmarkDelete(id) {
    if (!id) return false
    try {
      const res = await reqPost('v1/novel/bookmark/delete', {
        novel_id: `${id}`,
      })
      return !res.error
    } catch (error) {
      return false
    }
  },
  async userBookmarkTags(page = 1, restrict = 'public', type = 'illust') {
    const res = await reqGet(`v1/user/bookmark-tags/${type}`, {
      restrict,
      offset: (page - 1) * 30,
    })
    console.log('userBookmarkTags: ', type, res)
    if (res.bookmark_tags) {
      return { status: 0, data: res.bookmark_tags }
    } else if (res.error) {
      return {
        status: -1,
        msg: dealErrMsg(res),
      }
    } else {
      return {
        status: -1,
        msg: i18n.t('tip.unknown_err'),
      }
    }
  },
}

export function getBookmarkRestrictTags(tags = []) {
  return new Promise(resolve => {
    Dialog.confirm({
      title: i18n.t('user.fav'),
      message: `
        <div id="sel_block_dialog">
          <p style="margin:0.2rem 0">${i18n.t('r7d1o2ui8dhVA0A4rAwHq')}</p>
          <div class="sel_block_chks" style="justify-content: center;">
            <input type="radio" id="get_fav_restrict_public" name="restrict" value="public" checked />
            <label for="get_fav_restrict_public" style="margin-right: 10px;">${i18n.t('tMMgcuNAMSfxgPmaTDPuN')}</label>
            <input type="radio" id="get_fav_restrict_private" name="restrict" value="private" />
            <label for="get_fav_restrict_private">${i18n.t('WUegrN0Qk6zuHdl9EHUa-')}</label>
          </div>
          <div style="height:1px;margin:0.2rem 0;border-bottom:1px solid #ccc"></div>
          <p style="margin:0.2rem 0">${i18n.t('gJIMYUgtWdroLrG3seGNl')}</p>
          <input id="get_fav_tags_input" type="text" style="margin-bottom:0.2rem">
          ${tags.map(e => `
          <div class="sel_block_chks" style="margin-bottom:0.1rem">
            <input type="checkbox" data-tag="${e.name}">
            <span style="text-align: left;">${e.name}</span>
          </div>`).join('')}
        </div>`,
      lockScroll: false,
      closeOnPopstate: true,
      cancelButtonText: i18n.t('common.cancel'),
      confirmButtonText: i18n.t('common.confirm'),
      beforeClose: (action, done) => {
        if (action == 'confirm') {
          const restrict = document.querySelector('#sel_block_dialog input[name="restrict"]:checked')?.value
          const tagsInput = document.querySelector('#get_fav_tags_input')?.value
          const tags = document.querySelectorAll('#sel_block_dialog input[data-tag]:checked')
          resolve({
            restrict,
            tags: [...tags].map(e => e.getAttribute('data-tag')).concat(tagsInput.split(/\s+/)).filter(Boolean),
          })
        }
        done()
      },
    }).catch(() => {})
  })
}
