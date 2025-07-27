/*
https://github.com/alphasp/pixiv-api-client

MIT License

Copyright (c) 2016 alphasp <gmerudotcom@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

import CryptoJS from 'crypto-js'
import qs from 'qs'
import axios from 'axios'
import dayjs from 'dayjs'
import { LocalStorage } from '@/utils/storage'

const md5 = s => CryptoJS.MD5(s).toString()

const BASE_URL = 'https://app-api.pixiv.net'
const OAUTH_URL = 'https://oauth.secure.pixiv.net'
const CLIENT_ID = 'MOBrBDS8blbauoSck0ZfDbtuzpyT'
const CLIENT_SECRET = 'lsACyCD94FhDUtGTXi3QzcFE2uU1hqtDaKeqrdwj'
const HASH_SECRET = '28c1fdd170a5204386cb1313c7077b34f83e4aaf4aa829ce78c231e05b0bae2c'

const DEFAULT_HEADERS = {
  'App-OS': 'Android',
  'App-OS-Version': 'Android 14.0',
  'App-Version': '6.124.0',
  'Accept-Language': 'zh-CN',
  'User-Agent': 'PixivAndroidApp/6.124.0 (Android 14.0; Pixel 8)',
}

function callApi(url, options) {
  let finalUrl = /^https?:\/\//i.test(url) ? url : BASE_URL + url
  const fUrl = new URL(finalUrl)
  if (window.p_api_proxy) {
    if (BASE_URL.includes(fUrl.hostname)) {
      fUrl.pathname = '/pixiv-app-api' + fUrl.pathname
    }
    if (OAUTH_URL.includes(fUrl.hostname)) {
      fUrl.pathname = '/pixiv-oauth' + fUrl.pathname
    }
    fUrl.hostname = window.p_api_proxy
    finalUrl = fUrl.href
  } else if (window.__httpRequest__) {
    if (window.p_api_hosts) {
      options.headers.Host = fUrl.host
      fUrl.host = window.p_api_hosts[fUrl.hostname]
      finalUrl = fUrl.href
    }
  } else {
    return Promise.reject(new Error('Can\'t make a request'))
  }
  console.log('callApi Url: ', finalUrl)
  console.log('callApi options: ', options)

  let resp
  if (window.__httpRequest__) {
    resp = window.__httpRequest__(finalUrl, JSON.stringify(options))
  } else {
    resp = axios(finalUrl, options)
  }

  return resp.then(res => {
    console.log('callApi res: ', res)
    return res.data
  }).catch(async err => {
    console.log('callApi err: ', err)
    if (err.response) {
      throw err.response.data
    } else {
      throw err.message
    }
  })
}

class PixivApi {
  constructor() {
    this.headers = { ...DEFAULT_HEADERS }
    if (!window.__httpRequest__) delete this.headers['User-Agent']
    const auth = LocalStorage.get('PXV_CLIENT_AUTH')
    if (auth) this.auth = auth
  }

  getDefaultHeaders() {
    const datetime = dayjs().format()
    return Object.assign({}, this.headers, {
      'X-Client-Time': datetime,
      'X-Client-Hash': md5(`${datetime}${HASH_SECRET}`),
    })
  }

  tokenRequest(code, code_verifier) {
    const data = qs.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      code_verifier,
      redirect_uri: `${BASE_URL}/web/v1/users/auth/pixiv/callback`,
      grant_type: 'authorization_code',
      include_policy: true,
    })
    const options = {
      method: 'POST',
      headers: Object.assign(this.getDefaultHeaders(), {
        'Content-Type': 'application/x-www-form-urlencoded',
      }),
      data,
    }
    return callApi(`${OAUTH_URL}/auth/token`, options)
      .then(data => {
        console.log('tokenRequest data: ', data)
        this.auth = data.response
        return data.response
      })
      .catch(err => {
        console.log('tokenRequest err: ', err)
        if (err.response) {
          throw err.response.data
        } else {
          throw err.message
        }
      })
  }

  logout() {
    this.auth = null
    this.username = null
    this.password = null
    delete this.headers.Authorization
    return Promise.resolve()
  }

  authInfo() {
    return this.auth
  }

  refreshAccessToken(refreshToken) {
    if (LocalStorage.get('PXV_CLIENT_AUTH')) return
    if ((!this.auth || !this.auth.refresh_token) && !refreshToken) {
      return Promise.reject(new Error('refresh_token required'))
    }
    const data = qs.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      get_secure_url: true,
      include_policy: true,
      grant_type: 'refresh_token',
      refresh_token: refreshToken || this.auth.refresh_token,
    })
    const options = {
      method: 'POST',
      headers: Object.assign(this.getDefaultHeaders(), {
        'Content-Type': 'application/x-www-form-urlencoded',
      }),
      data,
    }
    return callApi(`${OAUTH_URL}/auth/token`, options).then(data => {
      this.auth = data.response
      LocalStorage.set('PXV_CLIENT_AUTH', data.response, 1800)
      return data.response
    })
  }

  setLanguage(lang) {
    this.headers['Accept-Language'] = lang
  }

  requestUrl(url, options) {
    if (!url) {
      return Promise.reject(new Error('Url cannot be empty'))
    }
    options = options || {}
    options.headers = Object.assign(this.getDefaultHeaders(), options.headers || {})
    if (this.auth && this.auth.access_token) {
      options.headers.Authorization = `Bearer ${this.auth.access_token}`
    }
    return callApi(url, options)
      .then(json => json)
      .catch(err => {
        throw err
      })
  }

  // require auth
  userState() {
    return this.requestUrl('/v1/user/me/state')
  }

  searchIllust(word, options) {
    if (!word) {
      return Promise.reject(new Error('word required'))
    }

    const queryString = qs.stringify(
      Object.assign(
        {
          word,
          search_target: 'partial_match_for_tags',
          sort: 'date_desc',
        },
        options
      )
    )
    return this.requestUrl(`/v1/search/illust?${queryString}`)
  }

  searchIllustPopularPreview(word, options) {
    if (!word) {
      return Promise.reject(new Error('word required'))
    }

    const queryString = qs.stringify(
      Object.assign(
        {
          word,
          search_target: 'partial_match_for_tags',
        },
        options
      )
    )
    return this.requestUrl(`/v1/search/popular-preview/illust?${queryString}`)
  }

  searchNovel(word, options) {
    if (!word) {
      return Promise.reject(new Error('word required'))
    }

    const queryString = qs.stringify(
      Object.assign(
        {
          word,
          search_target: 'partial_match_for_tags',
          sort: 'date_desc',
        },
        options
      )
    )
    return this.requestUrl(`/v1/search/novel?${queryString}`)
  }

  searchNovelPopularPreview(word, options) {
    if (!word) {
      return Promise.reject(new Error('word required'))
    }

    const queryString = qs.stringify(
      Object.assign(
        {
          word,
          search_target: 'partial_match_for_tags',
        },
        options
      )
    )
    return this.requestUrl(`/v1/search/popular-preview/novel?${queryString}`)
  }

  searchIllustBookmarkRanges(word, options) {
    if (!word) {
      return Promise.reject(new Error('word required'))
    }
    const queryString = qs.stringify(
      Object.assign(
        {
          word,
          search_target: 'partial_match_for_tags',
        },
        options
      )
    )
    return this.requestUrl(`/v1/search/bookmark-ranges/illust?${queryString}`)
  }

  searchNovelBookmarkRanges(word, options) {
    if (!word) {
      return Promise.reject(new Error('word required'))
    }
    const queryString = qs.stringify(
      Object.assign(
        {
          word,
          search_target: 'partial_match_for_tags',
        },
        options
      )
    )
    return this.requestUrl(`/v1/search/bookmark-ranges/novel?${queryString}`)
  }

  searchUser(word, options) {
    if (!word) {
      return Promise.reject(new Error('word required'))
    }
    const queryString = qs.stringify(
      Object.assign({
        word,
      }, options)
    )
    return this.requestUrl(`/v1/search/user?${queryString}`)
  }

  searchAutoComplete(word) {
    if (!word) {
      return Promise.reject(new Error('word required'))
    }
    const queryString = qs.stringify(
      Object.assign({
        word,
      })
    )
    return this.requestUrl(`/v1/search/autocomplete?${queryString}`)
  }

  searchAutoCompleteV2(word) {
    if (!word) {
      return Promise.reject(new Error('word required'))
    }
    const queryString = qs.stringify(
      Object.assign({
        word,
      })
    )
    return this.requestUrl(`/v2/search/autocomplete?${queryString}`)
  }

  userDetail(id, options) {
    if (!id) {
      return Promise.reject(new Error('user_id required'))
    }

    const queryString = qs.stringify(
      Object.assign(
        {
          user_id: id,
        },
        options
      )
    )
    return this.requestUrl(`/v1/user/detail?${queryString}`)
  }

  userIllusts(id, options) {
    if (!id) {
      return Promise.reject(new Error('user_id required'))
    }

    const queryString = qs.stringify(
      Object.assign(
        {
          user_id: id,
        },
        options
      )
    )
    return this.requestUrl(`/v1/user/illusts?${queryString}`)
  }

  userNovels(id, options) {
    if (!id) {
      return Promise.reject(new Error('user_id required'))
    }

    const queryString = qs.stringify(
      Object.assign(
        {
          user_id: id,
        },
        options
      )
    )
    return this.requestUrl(`/v1/user/novels?${queryString}`)
  }

  userBookmarksIllust(id, options) {
    if (!id) {
      return Promise.reject(new Error('user_id required'))
    }

    const queryString = qs.stringify(
      Object.assign(
        {
          user_id: id,
          restrict: 'public',
        },
        options
      )
    )
    return this.requestUrl(`/v1/user/bookmarks/illust?${queryString}`)
  }

  userBookmarkIllustTags(options) {
    const queryString = qs.stringify(
      Object.assign(
        {
          restrict: 'public',
        },
        options
      )
    )
    return this.requestUrl(`/v1/user/bookmark-tags/illust?${queryString}`)
  }

  illustBookmarkDetail(id, options) {
    if (!id) {
      return Promise.reject(new Error('illust_id required'))
    }

    const queryString = qs.stringify(
      Object.assign(
        {
          illust_id: id,
        },
        options
      )
    )
    return this.requestUrl(`/v2/illust/bookmark/detail?${queryString}`)
  }

  userBookmarksNovel(id, options) {
    if (!id) {
      return Promise.reject(new Error('user_id required'))
    }

    const queryString = qs.stringify(
      Object.assign(
        {
          user_id: id,
          restrict: 'public',
        },
        options
      )
    )
    return this.requestUrl(`/v1/user/bookmarks/novel?${queryString}`)
  }

  userBookmarkNovelTags(options) {
    const queryString = qs.stringify(
      Object.assign(
        {
          restrict: 'public',
        },
        options
      )
    )
    return this.requestUrl(`/v1/user/bookmark-tags/novel?${queryString}`)
  }

  illustWalkthrough() {
    return this.requestUrl('/v1/walkthrough/illusts')
  }

  illustComments(id, options) {
    if (!id) {
      return Promise.reject(new Error('illust_id required'))
    }

    const queryString = qs.stringify(
      Object.assign(
        {
          illust_id: id,
          include_total_comments: true,
        },
        options
      )
    )
    return this.requestUrl(`/v1/illust/comments?${queryString}`)
  }

  illustCommentsV3(id, options) {
    if (!id) {
      return Promise.reject(new Error('illust_id required'))
    }

    const queryString = qs.stringify(
      Object.assign(
        {
          illust_id: id,
        },
        options
      )
    )
    return this.requestUrl(`/v3/illust/comments?${queryString}`)
  }

  illustCommentsV2(id, options) {
    if (!id) {
      return Promise.reject(new Error('illust_id required'))
    }

    const queryString = qs.stringify(
      Object.assign(
        {
          illust_id: id,
        },
        options
      )
    )
    return this.requestUrl(`/v2/illust/comments?${queryString}`)
  }

  illustCommentReplies(id) {
    if (!id) {
      return Promise.reject(new Error('comment_id required'))
    }
    const queryString = qs.stringify({ comment_id: id })
    return this.requestUrl(`/v2/illust/comment/replies?${queryString}`)
  }

  illustRelated(id, options = {}) {
    if (!id) {
      return Promise.reject(new Error('illust_id required'))
    }

    const { nextUrl } = options
    delete options.nextUrl
    const queryString = nextUrl || qs.stringify(Object.assign({ illust_id: id }, options))
    return this.requestUrl(`/v2/illust/related?${queryString}`)
  }

  novelRelated(id, options) {
    if (!id) {
      return Promise.reject(new Error('novel_id required'))
    }

    const queryString = qs.stringify(
      Object.assign(
        {
          novel_id: id,
        },
        options
      )
    )
    return this.requestUrl(`/v1/novel/related?${queryString}`)
  }

  userRelated(id, options) {
    if (!id) {
      return Promise.reject(new Error('user_id required'))
    }

    const queryString = qs.stringify(
      Object.assign(
        {
          seed_user_id: id,
        },
        options
      )
    )
    return this.requestUrl(`/v1/user/related?${queryString}`)
  }

  illustDetail(id, options) {
    if (!id) {
      return Promise.reject(new Error('illust_id required'))
    }

    const queryString = qs.stringify(
      Object.assign(
        {
          illust_id: id,
        },
        options
      )
    )
    return this.requestUrl(`/v1/illust/detail?${queryString}`)
  }

  illustNew(options) {
    const queryString = qs.stringify(
      Object.assign(
        {
          content_type: 'illust',
        },
        options
      )
    )
    return this.requestUrl(`/v1/illust/new?${queryString}`)
  }

  illustFollow(options) {
    const queryString = qs.stringify(
      Object.assign(
        {
          restrict: 'all',
        },
        options
      )
    )
    return this.requestUrl(`/v2/illust/follow?${queryString}`)
  }

  illustRecommended(options) {
    if (options.params === '{}') delete options.params
    const queryString = options.params
      ? qs.stringify(JSON.parse(options.params))
      : qs.stringify(
        Object.assign(
          {
            include_privacy_policy: false,
            include_ranking_illusts: false,
          },
          options
        )
      )
    return this.requestUrl(`/v1/illust/recommended?${queryString}`)
  }

  illustRanking(options) {
    const queryString = qs.stringify(
      Object.assign(
        {
          mode: 'day',
        },
        options
      )
    )
    return this.requestUrl(`/v1/illust/ranking?${queryString}`)
  }

  illustMyPixiv() {
    return this.requestUrl('/v2/illust/mypixiv')
  }

  illustAddComment(id, comment, parentCommentId) {
    if (!id) {
      return Promise.reject(new Error('illust_id required'))
    }
    if (!comment) {
      return Promise.reject(new Error('comment required'))
    }
    const data = qs.stringify({
      illust_id: id,
      comment,
      parent_comment_id: parentCommentId,
    })
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data,
    }
    return this.requestUrl('/v1/illust/comment/add', options)
  }

  novelAddComment(id, comment, parentCommentId) {
    if (!id) {
      return Promise.reject(new Error('novel_id required'))
    }
    if (!comment) {
      return Promise.reject(new Error('comment required'))
    }
    const data = qs.stringify({
      novel_id: id,
      comment,
      parent_comment_id: parentCommentId,
    })
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data,
    }
    return this.requestUrl('/v1/novel/comment/add', options)
  }

  trendingTagsIllust(options) {
    const queryString = qs.stringify(Object.assign({}, options))
    return this.requestUrl(`/v1/trending-tags/illust?${queryString}`)
  }

  trendingTagsNovel(options) {
    const queryString = qs.stringify(Object.assign({}, options))
    return this.requestUrl(`/v1/trending-tags/novel?${queryString}`)
  }

  bookmarkIllust(id, restrict, tags) {
    if (!id) {
      return Promise.reject(new Error('illust_id required'))
    }
    if (restrict && !['public', 'private'].includes(restrict)) {
      return Promise.reject(new Error('invalid restrict value'))
    }
    if (tags && !Array.isArray(tags)) {
      return Promise.reject(new Error('invalid tags value'))
    }
    const data = qs.stringify({
      illust_id: id,
      restrict: restrict || 'public',
      tags: tags && tags.length ? tags : undefined,
    })
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data,
    }
    return this.requestUrl('/v2/illust/bookmark/add', options)
  }

  unbookmarkIllust(id) {
    if (!id) {
      return Promise.reject(new Error('illust_id required'))
    }
    const data = qs.stringify({
      illust_id: id,
    })
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data,
    }
    return this.requestUrl('/v1/illust/bookmark/delete', options)
  }

  bookmarkNovel(id, restrict, tags) {
    if (!id) {
      return Promise.reject(new Error('novel_id required'))
    }
    if (restrict && !['public', 'private'].includes(restrict)) {
      return Promise.reject(new Error('invalid restrict value'))
    }
    if (tags && !Array.isArray(tags)) {
      return Promise.reject(new Error('invalid tags value'))
    }
    const data = qs.stringify({
      novel_id: id,
      restrict: restrict || 'public',
      tags: tags && tags.length ? tags : undefined,
    })
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data,
    }
    return this.requestUrl('/v2/novel/bookmark/add', options)
  }

  unbookmarkNovel(id) {
    if (!id) {
      return Promise.reject(new Error('novel_id required'))
    }
    const data = qs.stringify({
      novel_id: id,
    })
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data,
    }
    return this.requestUrl('/v1/novel/bookmark/delete', options)
  }

  followUser(id, restrict) {
    if (!id) {
      return Promise.reject(new Error('user_id required'))
    }
    if (restrict && !['public', 'private'].includes(restrict)) {
      return Promise.reject(new Error('invalid restrict value'))
    }
    const data = qs.stringify({
      user_id: id,
      restrict: restrict || 'public',
    })
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data,
    }
    return this.requestUrl('/v1/user/follow/add', options)
  }

  unfollowUser(id) {
    if (!id) {
      return Promise.reject(new Error('user_id required'))
    }
    const data = qs.stringify({
      user_id: id,
      restrict: 'public',
    })
    //
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data,
    }
    return this.requestUrl('/v1/user/follow/delete', options)
  }

  mangaRecommended(options) {
    const queryString = qs.stringify(
      Object.assign(
        {
          include_ranking_label: true,
          include_privacy_policy: false,
          include_ranking_illusts: false,
        },
        options
      )
    )
    return this.requestUrl(`/v1/manga/recommended?${queryString}`)
  }

  mangaNew(options) {
    const queryString = qs.stringify(
      Object.assign(
        {
          content_type: 'manga',
        },
        options
      )
    )
    return this.requestUrl(`/v1/illust/new?${queryString}`)
  }

  novelRecommended(options) {
    const queryString = qs.stringify(
      Object.assign(
        {
          include_ranking_novels: false,
          include_privacy_policy: false,
        },
        options
      )
    )
    return this.requestUrl(`/v1/novel/recommended?${queryString}`)
  }

  novelNew(options) {
    const queryString = qs.stringify(options)
    return this.requestUrl(`/v1/novel/new?${queryString}`)
  }

  novelComments(id, options) {
    if (!id) {
      return Promise.reject(new Error('novel_id required'))
    }

    const queryString = qs.stringify(
      Object.assign(
        {
          novel_id: id,
          include_total_comments: true,
        },
        options
      )
    )
    return this.requestUrl(`/v1/novel/comments?${queryString}`)
  }

  novelCommentsV2(id, options) {
    if (!id) {
      return Promise.reject(new Error('novel_id required'))
    }

    const queryString = qs.stringify(
      Object.assign(
        {
          novel_id: id,
        },
        options
      )
    )
    return this.requestUrl(`/v2/novel/comments?${queryString}`)
  }

  novelCommentsV3(id, options) {
    if (!id) {
      return Promise.reject(new Error('novel_id required'))
    }

    const queryString = qs.stringify(
      Object.assign(
        {
          novel_id: id,
        },
        options
      )
    )
    return this.requestUrl(`/v3/novel/comments?${queryString}`)
  }

  novelCommentReplies(id) {
    if (!id) {
      return Promise.reject(new Error('comment_id required'))
    }
    const queryString = qs.stringify({ comment_id: id })
    return this.requestUrl(`/v2/novel/comment/replies?${queryString}`)
  }

  userIllustSeries(id, options) {
    if (!id) {
      return Promise.reject(new Error('user_id required'))
    }

    const queryString = qs.stringify({ user_id: id, ...options })
    return this.requestUrl(`/v1/user/illust-series?${queryString}`)
  }

  userNovelSeries(id, options) {
    if (!id) {
      return Promise.reject(new Error('user_id required'))
    }

    const queryString = qs.stringify({ user_id: id, ...options })
    return this.requestUrl(`/v1/user/novel-series?${queryString}`)
  }

  illustSeries(id, options) {
    if (!id) {
      return Promise.reject(new Error('illust_series_id required'))
    }

    const queryString = qs.stringify({ illust_series_id: id, ...options })
    return this.requestUrl(`/v1/illust/series?${queryString}`)
  }

  novelSeries(id, options) {
    if (!id) {
      return Promise.reject(new Error('series_id required'))
    }

    const queryString = qs.stringify({ series_id: id, ...options })
    return this.requestUrl(`/v2/novel/series?${queryString}`)
  }

  novelDetail(id) {
    if (!id) {
      return Promise.reject(new Error('novel_id required'))
    }

    const queryString = qs.stringify({ novel_id: id })
    return this.requestUrl(`/v2/novel/detail?${queryString}`)
  }

  async novelText(id) {
    if (!id) {
      return Promise.reject(new Error('novel_id required'))
    }

    // const queryString = qs.stringify({ novel_id: id })
    // return this.requestUrl(`/v1/novel/text?${queryString}`)

    const r = await this.webviewNovel(id)
    return ({ novel_text: r.text })
  }

  async webviewNovel(id, raw = false) {
    if (!id) {
      throw new Error('novel_id required')
    }

    const queryString = qs.stringify({ id, viewer_version: '20221031_ai' })
    const response = await this.requestUrl(`/webview/v2/novel?${queryString}`, {
      responseType: 'text',
    })

    if (raw) return response

    const json = response.match(/novel:\s({.+}),/)?.[1]
    return JSON.parse(json)
  }

  novelFollow(options) {
    const queryString = qs.stringify(
      Object.assign(
        {
          restrict: 'all',
        },
        options
      )
    )
    return this.requestUrl(`/v1/novel/follow?${queryString}`)
  }

  novelMyPixiv() {
    return this.requestUrl('/v1/novel/mypixiv')
  }

  novelRanking(options) {
    const queryString = qs.stringify(
      Object.assign(
        {
          mode: 'day',
        },
        options
      )
    )
    return this.requestUrl(`/v1/novel/ranking?${queryString}`)
  }

  novelBookmarkDetail(id, options) {
    if (!id) {
      return Promise.reject(new Error('novel_id required'))
    }

    const queryString = qs.stringify(
      Object.assign(
        {
          novel_id: id,
        },
        options
      )
    )
    return this.requestUrl(`/v2/novel/bookmark/detail?${queryString}`)
  }

  userRecommended(options) {
    const queryString = qs.stringify(Object.assign({}, options))
    return this.requestUrl(`/v1/user/recommended?${queryString}`)
  }

  userFollowing(id, options) {
    if (!id) {
      return Promise.reject(new Error('user_id required'))
    }
    const queryString = qs.stringify(
      Object.assign(
        {
          user_id: id,
          restrict: 'public',
        },
        options
      )
    )
    return this.requestUrl(`/v1/user/following?${queryString}`)
  }

  userFollowDetail(id) {
    if (!id) {
      return Promise.reject(new Error('user_id required'))
    }
    const queryString = qs.stringify({ user_id: id })
    return this.requestUrl(`/v1/user/follow/detail?${queryString}`)
  }

  userFollower(id, options) {
    if (!id) {
      return Promise.reject(new Error('user_id required'))
    }
    const queryString = qs.stringify(
      Object.assign(
        {
          user_id: id,
        },
        options
      )
    )
    return this.requestUrl(`/v1/user/follower?${queryString}`)
  }

  userMyPixiv(id) {
    if (!id) {
      return Promise.reject(new Error('user_id required'))
    }
    const queryString = qs.stringify({ user_id: id })
    return this.requestUrl(`/v1/user/mypixiv?${queryString}`)
  }

  ugoiraMetaData(id) {
    if (!id) {
      return Promise.reject(new Error('illust_id required'))
    }
    const queryString = qs.stringify({ illust_id: id })
    return this.requestUrl(`/v1/ugoira/metadata?${queryString}`)
  }

  liveList(options) {
    const queryString = qs.stringify(
      Object.assign(
        {
          list_type: 'popular',
        },
        options
      )
    )
    return this.requestUrl(`/v1/live/list?${queryString}`)
  }
}

export default PixivApi
