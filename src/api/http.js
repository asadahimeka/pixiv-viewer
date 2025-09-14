import axios from 'axios'
import nprogress from 'nprogress'
import { BASE_API_URL } from '@/consts'
import { retry } from '@/utils'

axios.defaults.baseURL = BASE_API_URL
axios.defaults.timeout = 20000
axios.defaults.headers.post['Content-Type'] = 'application/json'

axios.interceptors.request.use(config => {
  nprogress.start()
  return config
})

axios.interceptors.response.use(
  res => {
    nprogress.done()
    return res
  },
  err => {
    nprogress.done()
    return Promise.reject(err)
  }
)

export async function get(url, params = {}, config = {}) {
  console.log('url: ', url)
  console.log('params: ', params)
  try {
    const res = await retry(async () => {
      let resp
      if (window.APP_CONFIG.useLocalAppApi && url.startsWith('/')) {
        resp = await window.__localApiMap__[url]({ query: params, ...config })
        return resp
      }
      resp = await axios.get(url, { params, ...config })
      return resp.data
    })

    return res
  } catch (error) {
    console.error(error)
    return { error }
  }
}
