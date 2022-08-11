import axios from 'axios'

const baseURL = 'https://hibiapi.getloli.com/'

// axios.defaults.baseURL = baseURL
axios.defaults.timeout = 10000
axios.defaults.headers.post['Content-Type'] = 'application/json'

const get = async (url, params) => {
  try {
    const api = new URL('https://kw.kanata.ml')
    const req_url = new URL(url, baseURL)
    api.searchParams.set('_vercel_no_cache', '1')
    Object.keys(params).forEach(k => {
      req_url.searchParams.set(k, params[k])
    })
    api.searchParams.set('u', req_url.href)
    const res = await axios.get(api.href)

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
