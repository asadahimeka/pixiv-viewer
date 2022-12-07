import dayjs from 'dayjs';
import { Base64 } from 'js-base64';
import { get, notSelfHibiApi } from './http'
import { LocalStorage, SessionStorage } from '@/utils/storage';
import { getCache, setCache } from '@/utils/siteCache';

const isSupportWebP = (() => {
  const elem = document.createElement('canvas');

  if (elem.getContext && elem.getContext('2d')) {
    // was able or not to get WebP representation
    return elem.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }

  // very old browser like IE 8, canvas not supported
  return false;
})();

const proxyBase = LocalStorage.get('__PXIMG_PROXY', 'pximg.cocomi.cf')
const imgProxy = url => {
  let result = url.replace(/i\.pximg\.net/g, proxyBase)

  if (!isSupportWebP) {
    result = result.replace(/_10_webp/g, '_70')
    result = result.replace(/_webp/g, '')
  }

  return result
}

const parseUser = data => {
  const { user, profile, workspace } = data
  let { id, account, name, comment } = user
  let { background_image_url, birth, birth_day, gender, is_premium, is_using_custom_profile_image, job, total_follow_users, total_mypixiv_users, total_illust_bookmarks_public, total_illusts, twitter_account, twitter_url, webpage, country_code } = profile

  return {
    id,
    account,
    name,
    comment,
    country_code,
    avatar: imgProxy(user.profile_image_urls.medium),
    bgcover: imgProxy(background_image_url || ''),
    birth: `${birth}-${birth_day}`,
    gender,
    is_premium,
    is_using_custom_profile_image,
    job,
    follow: total_follow_users,
    friend: total_mypixiv_users,
    bookmarks: total_illust_bookmarks_public,
    illusts: total_illusts,
    twitter_account,
    twitter_url,
    webpage,
    workspace
  }
}

const parseIllust = data => {
  let { id, title, caption, create_date, tags, tools, width, height, x_restrict, total_view, total_bookmarks, type, illust_ai_type } = data
  let images = []

  if (data.meta_single_page.original_image_url) {
    images.push({
      s: imgProxy(data.image_urls.square_medium),
      m: imgProxy(data.image_urls.medium),
      l: imgProxy(data.image_urls.large),
      o: imgProxy(data.meta_single_page.original_image_url)
    })
  } else {
    images = data.meta_pages.map(data => {
      return {
        s: imgProxy(data.image_urls.square_medium),
        m: imgProxy(data.image_urls.medium),
        l: imgProxy(data.image_urls.large),
        o: imgProxy(data.image_urls.original)
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
      avatar: imgProxy(data.user.profile_image_urls.medium)
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
    x_restrict,
    illust_ai_type,
    type
  }

  return artwork
}

const parseAiIllust = (d, r18) => {

  let url = 'https://i.pximg.net' + d.url.replace('/-/', '/')
  let images = [{
    s: imgProxy(url.replace('_master1200', '_square1200')),
    m: imgProxy(url),
    l: imgProxy(url.replace(/\/c\/\d+x\d+\//i, '/')),
    o: 'https://ef.kanata.ml/pid/' + d.illust_id
  }]

  let avatar = d.profile_img
  let avatarPrefix = avatar.startsWith('/~/') ? 'https://s.pximg.net' : `https://${proxyBase}`
  avatar = avatar.replace(/\/(-)|(~)\//, '/')
  avatar = avatarPrefix + avatar

  let artwork = {
    id: d.illust_id,
    title: d.title,
    caption: '',
    author: {
      id: d.user_id,
      name: d.user_name,
      avatar
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
    type: 'illust'
  }

  return artwork
}

const parseWebApiIllust = (d) => {

  let url = 'https://i.pximg.net' + d.url.replace('/-/', '/')
  let images = [{
    s: imgProxy(url.replace('_master1200', '_square1200')),
    m: imgProxy(url),
    l: imgProxy(url.replace(/\/c\/\d+x\d+\//i, '/')),
    o: 'https://ef.kanata.ml/pid/' + d.id
  }]

  let avatar = d.profileImageUrl
  let avatarPrefix = avatar.startsWith('/~/') ? 'https://s.pximg.net' : `https://${proxyBase}`
  avatar = avatar.replace(/\/(-)|(~)\//, '/')
  avatar = avatarPrefix + avatar

  let artwork = {
    id: d.id,
    title: d.title,
    caption: '',
    author: {
      id: d.userId,
      name: d.userName,
      avatar
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
    type: 'illust'
  }

  return artwork
}

const dealErrMsg = (res) => {
  let msg = res.error.user_message || res.error.message || res.error
  if (msg == 'Rate Limit') msg = 'API 超限，请稍后再试或到设置里更换 API 实例'
  return msg
}

const specHibiApiBase = notSelfHibiApi ? 'https://ef.kanata.ml/hibi3/api/pixiv' : ''

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
    let cacheKey = `latestList`
    let latestList = await getCache(cacheKey)

    if (!latestList) {

      let res = await get(specHibiApiBase + '/illust_new')

      if (res.illusts) {

        latestList = res.illusts.map(art => parseIllust(art))
        setCache(cacheKey, latestList, 60 * 10)

      } else if (res.error) {
        return {
          status: -1,
          msg: dealErrMsg(res)
        }
      } else {
        return {
          status: -1,
          msg: '未知错误'
        }
      }
    }

    console.log('latestList: ', latestList)

    return { status: 0, data: latestList }
  },

  /**
   *
   * @param {Number} id 作品ID
   * @param {Number} page 页数 [1,5]
   */
  async getRelated(id, page = 1) {
    let cacheKey = `relatedList_${id}_p${page}`
    let relatedList = await getCache(cacheKey)

    if (!relatedList) {

      let res = await get('/related', {
        id,
        page
      })

      if (res.illusts) {

        relatedList = res.illusts.map(art => parseIllust(art))
        setCache(cacheKey, relatedList, 60 * 60 * 24)

      } else if (res.error) {
        return {
          status: -1,
          msg: dealErrMsg(res)
        }
      } else {
        return {
          status: -1,
          msg: '未知错误'
        }
      }

    }

    console.log('relatedList: ', relatedList)

    return { status: 0, data: relatedList }
  },

  async getRecommendedIllust() {
    let cacheKey = `recommended.illust`
    let relatedList = await getCache(cacheKey)

    if (!relatedList) {

      let res = await get(specHibiApiBase + '/illust_recommended')

      if (res.illusts) {

        relatedList = res.illusts.map(art => parseIllust(art))
        setCache(cacheKey, relatedList, 60 * 60 * 1)

      } else if (res.error) {
        return {
          status: -1,
          msg: dealErrMsg(res)
        }
      } else {
        return {
          status: -1,
          msg: '未知错误'
        }
      }

    }

    console.log('getRecommendedIllust: ', relatedList)

    return { status: 0, data: relatedList }
  },

  async getRecommendedUser() {
    let cacheKey = `recommended.user`
    let relatedList = await getCache(cacheKey)

    if (!relatedList) {

      let res = await get(specHibiApiBase + '/user_recommended')

      if (res.user_previews) {

        relatedList = res.user_previews
          .filter(u => u.illusts.length && (
            !u.illusts.some(e => /ロリ|loli|萝莉|幼女/.test(JSON.stringify(e.tags)))
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
              }))
            }
          })
        setCache(cacheKey, relatedList, 60 * 60 * 3)

      } else if (res.error) {
        return {
          status: -1,
          msg: dealErrMsg(res)
        }
      } else {
        return {
          status: -1,
          msg: '未知错误'
        }
      }

    }

    console.log('getRecommendedUser: ', relatedList)

    return { status: 0, data: relatedList }
  },

  async getTagsAutocomplete(word) {
    let cacheKey = `search.autocomplete.${word}`
    let relatedList = await getCache(cacheKey)

    if (!relatedList) {

      let res = await get('/search_autocomplete', { word })

      if (res.tags) {

        relatedList = res.tags.map(t => t.name)
        setCache(cacheKey, relatedList, 60 * 60 * 12)

      } else if (res.error) {
        return {
          status: -1,
          msg: dealErrMsg(res)
        }
      } else {
        return {
          status: -1,
          msg: '未知错误'
        }
      }

    }

    console.log('getTagsAutocomplete: ', relatedList)

    return { status: 0, data: relatedList }
  },

  async getSpotlights(page) {
    let cacheKey = `spotlights.${page}`
    let spotlights = await getCache(cacheKey)

    if (!spotlights) {

      let res = await get('https://pixiv.cocomi.eu.org/api/pixivision', { page })

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
          msg: '未知错误'
        }
      }

    }

    console.log('spotlights: ', spotlights)

    return { status: 0, data: spotlights }
  },

  async getSpotlightDetail(id) {
    let cacheKey = `spotlight.${id}`
    let spotlight = await getCache(cacheKey)

    if (!spotlight) {

      let res = await get(`https://pixiv.cocomi.eu.org/api/pixivision/${id}`)

      if (res) {

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
        setCache(cacheKey, JSON.parse(JSON.stringify(res)), 60 * 60 * 24)

      } else {
        return {
          status: -1,
          msg: '未知错误'
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
   * @param {String} date YYYY-MM-DD 默认为「前天」
   */
  async getAiRankList(mode = 'daily_ai', page = 1, date = dayjs().subtract(2, 'days').format('YYYY-MM-DD')) {
    date = dayjs(date).format('YYYYMMDD')
    let cacheKey = `rankList_${mode}_${date}_${page}`
    let rankList = await getCache(cacheKey)

    if (!rankList) {
      let res = await get('https://pixiv.cocomi.eu.org/api/ranking', {
        format: 'json',
        p: page,
        mode,
        date
      })

      if (res && res.contents) {
        rankList = res.contents.map(e => parseAiIllust(e, mode.includes('r18')))
        rankList.length && setCache(cacheKey, rankList, 60 * 60 * 6)
      } else {
        return {
          status: 0,
          data: []
        }
      }

    }

    return { status: 0, data: rankList }
  },

  async getDiscoveryArtworks(mode = 'all', limit = 60) {
    let list

    let res = await get('https://ef.kanata.ml/https:/pixiv.cocomi.eu.org/ajax/discovery/artworks', {
      mode,
      limit,
      lang: 'zh',
      _vercel_no_cache: 1
    })

    let illust = res?.thumbnails?.illust
    if (illust) {
      list = illust.filter(e => !e.isAdContainer).map(e => parseWebApiIllust(e))
    } else {
      return {
        status: 0,
        data: []
      }
    }

    return { status: 0, data: list }
  },

  async getDiscoveryList(mode = 'all', max = 20, nocache = false) {
    let list

    let params = { mode, max }

    if (nocache) params._vercel_no_cache = 1

    let res = await get('https://ef.kanata.ml/cp/600/https:/pixiv.js.org/ajax/illust/discovery', params)

    if (res && res.illusts) {
      list = res.illusts.filter(e => !e.isAdContainer).map(e => parseWebApiIllust(e))
    } else {
      return {
        status: 0,
        data: []
      }
    }

    return { status: 0, data: list }
  },

  /**
   *
   * @param {String} mode 排行榜类型  ['day', 'week', 'month', 'week_rookie', 'week_original', 'day_male', 'day_female', 'day_r18', 'week_r18', 'day_male_r18', 'day_female_r18', 'week_r18g']
   * @param {Number} page 页数
   * @param {String} date YYYY-MM-DD 默认为「前天」
   */
  async getRankList(mode = 'week', page = 1, date = dayjs().subtract(2, 'days').format('YYYY-MM-DD')) {

    date = dayjs(date).format('YYYY-MM-DD')
    let cacheKey = `rankList_${mode}_${date}_${page}`
    let rankList = await getCache(cacheKey)

    if (!rankList) {

      let res = await get('/rank', {
        mode,
        page,
        date
      })

      if (res.illusts) {

        rankList = res.illusts.map(art => parseIllust(art))
        rankList.length && setCache(cacheKey, rankList, 60 * 60 * 6)

      } else if (res.error) {
        return {
          status: -1,
          msg: dealErrMsg(res)
        }
      } else {
        return {
          status: -1,
          msg: '未知错误'
        }
      }
    }


    return { status: 0, data: rankList }
  },

  /**
   *
   * @param {String} word 关键词
   * @param {Number} page 页数
   */
  async search(word, page = 1) {
    let cacheKey = `searchList_${Base64.encode(word)}_${page}`
    let searchList = SessionStorage.get(cacheKey)

    if (!searchList) {

      let res = await get('/search', {
        word,
        page
      })

      if (res.illusts) {

        searchList = res.illusts.map(art => parseIllust(art))
        SessionStorage.set(cacheKey, searchList, 60 * 60 * 1)

      } else if (res.error) {
        return {
          status: -1,
          msg: dealErrMsg(res)
        }
      } else {
        return {
          status: -1,
          msg: '未知错误'
        }
      }

    }

    return { status: 0, data: searchList }
  },

  /**
   *
   * @param {Number} id 作品ID
   */
  async getArtwork(id) {
    let cacheKey = `artwork_${id}`
    let artwork = await getCache(cacheKey)

    if (!artwork) {

      let res = await get('/illust', {
        id
      })

      if (res.illust) {

        artwork = parseIllust(res.illust)
        setCache(cacheKey, artwork, 60 * 60 * 1)

      } else if (res.error) {
        return {
          status: -1,
          msg: dealErrMsg(res)
        }
      } else {
        return {
          status: -1,
          msg: '未知错误'
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
    let cacheKey = `ugoira_${id}`
    let ugoira = await getCache(cacheKey)

    if (!ugoira) {

      let res = await get('/ugoira_metadata', {
        id
      })

      if (res.error) {
        return {
          status: -1,
          msg: dealErrMsg(res)
        }
      } else {
        ugoira = {
          zip: imgProxy(res.ugoira_metadata.zip_urls.medium),
          frames: res.ugoira_metadata.frames
        }
      }

      setCache(cacheKey, ugoira, 60 * 60 * 24)
    }


    return { status: 0, data: ugoira }
  },

  /**
   *
   * @param {Number} id 画师ID
   */
  async getMemberInfo(id) {
    let cacheKey = `memberInfo_${id}`
    let memberInfo = await getCache(cacheKey)

    if (!memberInfo) {

      let res = await get('/member', {
        id
      })

      if (res.error) {
        return {
          status: -1,
          msg: dealErrMsg(res)
        }
      } else {
        memberInfo = parseUser(res)
      }

      setCache(cacheKey, memberInfo, 60 * 60 * 24)
    }

    return { status: 0, data: memberInfo }
  },

  /**
   *
   * @param {Number} id 画师ID
   * @param {Number} page 页数
   */
  async getMemberArtwork(id, page) {
    let cacheKey = `memberArtwork_${id}_p${page}`
    let memberArtwork = await getCache(cacheKey)

    if (!memberArtwork) {

      let res = await get('/member_illust', {
        id,
        page
      })

      if (res.illusts) {

        memberArtwork = res.illusts.map(art => parseIllust(art))
        setCache(cacheKey, memberArtwork, 60 * 60 * 3)

      } else if (res.error) {
        return {
          status: -1,
          msg: dealErrMsg(res)
        }
      } else {
        return {
          status: -1,
          msg: '未知错误'
        }
      }

    }

    return { status: 0, data: memberArtwork }
  },

  /**
   *
   * @param {Number} id 画师ID
   * @param {Number} max_bookmark_id max_bookmark_id
   */
  async getMemberFavorite(id, max_bookmark_id) {
    let cacheKey = `memberFavorite_${id}_m${max_bookmark_id}`
    let memberFavorite = await getCache(cacheKey)

    if (!memberFavorite) {
      memberFavorite = {}

      let res = await get('/favorite', {
        id,
        max_bookmark_id
      })

      if (res.illusts) {
        const url = new URLSearchParams(res.next_url)
        memberFavorite.next = url.get('max_bookmark_id')
        memberFavorite.illusts = res.illusts.map(art => parseIllust(art))

        setCache(cacheKey, memberFavorite, 60 * 60 * 12)

      } else if (res.error) {
        return {
          status: -1,
          msg: dealErrMsg(res)
        }
      } else {
        return {
          status: -1,
          msg: '未知错误'
        }
      }

    }

    return { status: 0, data: memberFavorite }
  },

  async getTags() {
    let cacheKey = 'tags'
    let tags = await getCache(cacheKey)

    if (!tags) {

      let res = await get('/tags')

      if (res.trend_tags) {

        tags = res.trend_tags.map(data => {
          let { tag, translated_name } = data
          return {
            name: tag,
            tname: translated_name,
            pic: imgProxy(data.illust.image_urls.square_medium)
          }
        })

        setCache(cacheKey, tags, 60 * 60 * 12)

      } else if (res.error) {
        return {
          status: -1,
          msg: dealErrMsg(res)
        }
      } else {
        return {
          status: -1,
          msg: '未知错误'
        }
      }

    }

    return { status: 0, data: tags }
  }
}
export default api
