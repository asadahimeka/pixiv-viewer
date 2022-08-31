import { get } from './http'
import { LocalStorage, SessionStorage } from '@/utils/storage'
import moment from 'moment'
import { Base64 } from 'js-base64';

const isSupportWebP = (() => {
  const elem = document.createElement('canvas');

  if (elem.getContext && elem.getContext('2d')) {
    // was able or not to get WebP representation
    return elem.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }

  // very old browser like IE 8, canvas not supported
  return false;
})();

const imgProxy = url => {
  let result = url.replace(/i.pximg.net/g, 'pximg.cocomi.cf')

  if (!isSupportWebP) {
    result = result.replace(/_10_webp/g, '_70')
    result = result.replace(/_webp/g, '')
  }
  return result
}

const parseUser = data => {
  const { user, profile, workspace } = data
  let { id, account, name, comment } = user
  let { background_image_url, birth, birth_day, gender, is_premium, is_using_custom_profile_image, job, total_follow_users, total_mypixiv_users, total_illust_bookmarks_public, total_illusts, twitter_account, twitter_url, webpage } = profile

  return {
    id,
    account,
    name,
    comment,
    avatar: imgProxy(user.profile_image_urls.medium),
    bgcover: background_image_url,
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
  let { id, title, caption, create_date, tags, tools, width, height, x_restrict, total_view, total_bookmarks, type } = data
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
    type
  }

  return artwork
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

  /**
   *
   * @param {Number} offset 偏移值
   * @param {Number} per_page 每页数量
   */
  async getLatest(offset = 0, per_page = 40) {
    let res = await get('/v1/', {
      type: 'latest',
      offset,
      per_page
    })

    let data, artList
    if (res.status === 'success') {
      data = res.response
    } else if (res.error) {
      return {
        status: -1,
        msg: res.error.user_message || res.error.message
      }
    } else {
      return {
        status: -1,
        msg: '未知错误'
      }
    }

    artList = data.map(art => {
      let { id, title, caption, tags, tools, width, height, age_limit } = art
      return {
        id,
        title,
        caption,
        author: {
          id: art.user.id,
          name: art.user.name,
          avatar: imgProxy(art.user.profile_image_urls.px_50x50)
        },
        images: [{
          s: imgProxy(art.image_urls.px_128x128),
          m: imgProxy(art.image_urls.px_480mw),
          l: imgProxy(art.image_urls.large),
          o: imgProxy(art.image_urls.large)
        }],
        tags,
        tools,
        width,
        height,
        count: art.page_count,
        age_limit
      }
    })

    return { status: 0, data: artList }
  },

  /**
   *
   * @param {Number} id 作品ID
   * @param {Number} page 页数 [1,5]
   */
  async getRelated(id, page = 1) {
    let relatedList
    if (!SessionStorage.has(`relatedList_${id}_p${page}`)) {

      let res = await get('/pixiv/', {
        type: 'related',
        id,
        page
      })

      let data
      if (res.illusts) {
        data = res.illusts
      } else if (res.error) {
        return {
          status: -1,
          msg: res.error.user_message || res.error.message
        }
      } else {
        return {
          status: -1,
          msg: '未知错误'
        }
      }

      relatedList = data.map(art => {
        return parseIllust(art)
      })

      SessionStorage.set(`relatedList_${id}_p${page}`, relatedList, 60 * 60 * 3)
    } else {
      relatedList = SessionStorage.get(`relatedList_${id}_p${page}`)
    }


    return { status: 0, data: relatedList }
  },

  /**
   *
   * @param {String} mode 排行榜类型  ['day', 'week', 'month', 'week_rookie', 'week_original', 'day_male', 'day_female', 'day_r18', 'week_r18', 'day_male_r18', 'day_female_r18', 'week_r18g']
   * @param {Number} page 页数
   * @param {String} date YYYY-MM-DD 默认为「前天」
   */
  async getRankList(mode = 'week', page = 1, date = moment().subtract(2, 'days').format('YYYY-MM-DD'), nocache = false) {
    let rankList
    date = moment(date).format('YYYY-MM-DD')
    if (!SessionStorage.has(`rankList_${mode}_${date}_${page}`)) {

      let res = await get('/pixiv/', {
        type: 'rank',
        mode,
        page,
        date
      })

      let data
      if (res.illusts) {
        data = res.illusts
      } else if (res.error) {
        return {
          status: -1,
          msg: res.error.user_message || res.error.message
        }
      } else {
        return {
          status: -1,
          msg: '未知错误'
        }
      }

      rankList = data.map(art => {
        return parseIllust(art)
      })

      !nocache && SessionStorage.set(`rankList_${mode}_${date}_${page}`, rankList, 60 * 60 * 24)
    } else {
      rankList = SessionStorage.get(`rankList_${mode}_${date}_${page}`)
    }


    return { status: 0, data: rankList }
  },

  /**
   *
   * @param {String} word 关键词
   * @param {Number} page 页数
   */
  async search(word, page = 1) {
    let searchList, key = `searchList_${Base64.encode(word)}_${page}`
    if (!SessionStorage.has(key)) {

      let res = await get('/pixiv/', {
        type: 'search',
        word,
        page
      })

      let data
      if (res.illusts) {
        data = res.illusts
      } else if (res.error) {
        return {
          status: -1,
          msg: res.error.user_message || res.error.message
        }
      } else {
        return {
          status: -1,
          msg: '未知错误'
        }
      }

      searchList = data.map(art => {
        return parseIllust(art)
      })

      SessionStorage.set(key, searchList, 60 * 60 * 24)
    } else {
      searchList = SessionStorage.get(key)
    }


    return { status: 0, data: searchList }
  },

  /**
   *
   * @param {Number} id 作品ID
   */
  async getArtwork(id) {
    let artwork
    if (!LocalStorage.has(`artwork_${id}`)) {

      let res = await get('/pixiv/', {
        type: 'illust',
        id
      })

      let data
      if (res.illust) {
        data = res.illust
      } else if (res.error) {
        return {
          status: -1,
          msg: res.error.user_message || res.error.message
        }
      } else {
        return {
          status: -1,
          msg: '未知错误'
        }
      }

      artwork = parseIllust(data)

      LocalStorage.set(`artwork_${id}`, artwork)
    } else {
      artwork = LocalStorage.get(`artwork_${id}`)
    }


    return { status: 0, data: artwork }
  },

  /**
   *
   * @param {Number} id 作品ID
   */
  async ugoiraMetadata(id) {
    let ugoira
    if (!LocalStorage.has(`ugoira_${id}`)) {

      let res = await get('/pixiv/', {
        type: 'ugoira_metadata',
        id
      })

      if (res.error) {
        return {
          status: -1,
          msg: res.error.user_message || res.error.message
        }
      } else {
        ugoira = {
          zip: imgProxy(res.ugoira_metadata.zip_urls.medium),
          frames: res.ugoira_metadata.frames
        }
      }

      LocalStorage.set(`ugoira_${id}`, ugoira)
    } else {
      ugoira = LocalStorage.get(`ugoira_${id}`)
    }


    return { status: 0, data: ugoira }
  },

  /**
   *
   * @param {Number} id 画师ID
   */
  async getMemberInfo(id) {
    let memberInfo
    if (!LocalStorage.has(`memberInfo_${id}`)) {

      let res = await get('/pixiv/', {
        type: 'member',
        id
      })

      if (res.error) {
        return {
          status: -1,
          msg: res.error.user_message || res.error.message
        }
      } else {
        memberInfo = parseUser(res)
      }

      LocalStorage.set(`memberInfo_${id}`, memberInfo)
    } else {
      memberInfo = LocalStorage.get(`memberInfo_${id}`)
    }


    return { status: 0, data: memberInfo }
  },

  /**
   *
   * @param {Number} id 画师ID
   * @param {Number} page 页数
   */
  async getMemberArtwork(id, page) {
    let memberArtwork
    if (!LocalStorage.has(`memberArtwork_${id}_p${page}`)) {

      let res = await get('/pixiv/', {
        type: 'member_illust',
        id,
        page
      })

      let data
      if (res.illusts) {
        data = res.illusts
      } else if (res.error) {
        return {
          status: -1,
          msg: res.error.user_message || res.error.message
        }
      } else {
        return {
          status: -1,
          msg: '未知错误'
        }
      }

      memberArtwork = data.map(art => {
        return parseIllust(art)
      })

      LocalStorage.set(`memberArtwork_${id}_p${page}`, memberArtwork)
    } else {
      memberArtwork = LocalStorage.get(`memberArtwork_${id}_p${page}`)
    }

    return { status: 0, data: memberArtwork }
  },

  /**
   *
   * @param {Number} id 画师ID
   * @param {Number} max_bookmark_id max_bookmark_id
   */
  async getMemberFavorite(id, max_bookmark_id) {
    let memberFavorite = {}
    if (!LocalStorage.has(`memberFavorite_${id}_m${max_bookmark_id}`)) {

      let res = await get('/pixiv/', {
        type: 'favorite',
        id,
        max_bookmark_id
      })

      let data
      if (res.illusts) {
        data = res
      } else if (res.error) {
        return {
          status: -1,
          msg: res.error.user_message || res.error.message
        }
      } else {
        return {
          status: -1,
          msg: '未知错误'
        }
      }

      const url = new URLSearchParams(data.next_url)
      memberFavorite.next = url.get('max_bookmark_id')
      memberFavorite.illusts = data.illusts.map(art => {
        return parseIllust(art)
      })

      LocalStorage.set(`memberFavorite_${id}_m${max_bookmark_id}`, memberFavorite)
    } else {
      memberFavorite = LocalStorage.get(`memberFavorite_${id}_m${max_bookmark_id}`)
    }

    return { status: 0, data: memberFavorite }
  },

  async getTags() {
    let tags
    if (!LocalStorage.has(`tags`)) {

      let res = await get('/pixiv/', {
        type: 'tags'
      })

      if (res.trend_tags) {
        let temp = res.trend_tags

        tags = temp.map(data => {
          let { tag, translated_name } = data
          return {
            name: tag,
            tname: translated_name,
            pic: imgProxy(data.illust.image_urls.square_medium)
          }
        })
      } else if (res.error) {
        return {
          status: -1,
          msg: res.error.user_message || res.error.message
        }
      } else {
        return {
          status: -1,
          msg: '未知错误'
        }
      }

      LocalStorage.set(`tags`, tags, 60 * 60 * 24)
    } else {
      tags = LocalStorage.get(`tags`)
    }

    return { status: 0, data: tags }
  }
}
export default api
