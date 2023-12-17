import axios from 'axios'
import nprogress from 'nprogress'
import { LocalStorage } from '@/utils/storage'

export const BASE_API_URL = LocalStorage.get('HIBIAPI_BASE', process.env.VUE_APP_DEF_HIBIAPI_MAIN)
export const notSelfHibiApi = !/hibi\w{0,}\.(cocomi\..+)|(pixiv\.pics)/.test(BASE_API_URL)

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

const get = async (url, params = {}, config = {}) => {
  console.log('url: ', url)
  console.log('params: ', params)
  try {
    let res
    if (/^\/(?!prks).*/.test(url) && window.APP_CONFIG.useLocalAppApi) {
      res = await window.__localApiMap__[url]?.({ query: params, ...config })
    } else {
      res = (await axios.get(url, { params, ...config })).data
    }

    return res
  } catch (error) {
    console.error(error)
    return { error }
  }
}

export { get }
