import axios from 'axios'

const baseURL = 'https://hibiapi.getloli.com/api'

axios.defaults.baseURL = baseURL
axios.defaults.timeout = 10000
axios.defaults.headers.post['Content-Type'] = 'application/json'

const get = async (url, params) => {
  console.log('url: ', url)
  console.log('params: ', params)
  try {
    let res = {}
    if (url.endsWith('pixiv/')) {
      // url = 'https://kw.cocomi.cf/https://api.moedog.org/pixiv/v2/'
      // res = await axios.get(url, { params })

      const api = new URL('https://kw.kanata.ml')
      const req_url = new URL('https://api.moedog.org/pixiv/v2/')
      api.searchParams.set('_vercel_no_cache', '1')
      Object.keys(params).forEach(k => {
        const v = params[k]
        v != null && req_url.searchParams.set(k, v)
      })
      api.searchParams.set('u', req_url.href)
      res = await axios.get(api.href)
    } else {
      res = await axios.get(url, { params })
    }

    return new Promise((resolve, reject) => {
      let data = res.data
      if (typeof data === 'object') {
        resolve(data)
      } else {
        reject(data)
      }
    })
  } catch (ex) {
    console.error(ex)
  }
}

const post = async (url, data) => {
  try {
    const res = await axios.post(url, data).data

    return new Promise((resolve, reject) => {
      let data = res.data
      if (typeof res === 'object') {
        resolve(data)
      } else {
        reject(data)
      }
    })
  } catch (ex) {
    console.error(ex)
  }
}

export { get, post }
