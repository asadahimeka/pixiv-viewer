import axios from 'axios'
import nprogress from 'nprogress'
import { LocalStorage } from '@/utils/storage'

export const BASE_API_URL = LocalStorage.get('HIBIAPI_BASE', process.env.VUE_APP_DEF_HIBIAPI_MAIN)
export const notSelfHibiApi = !/hibi\d?\.cocomi\.cf|hibi\d?\.kanata\.ml/.test(BASE_API_URL)

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
    const res = await axios.get(url, { params, ...config })

    return new Promise((resolve, reject) => {
      const data = res.data
      if (typeof data === 'object') {
        resolve(data)
      } else {
        reject(data)
      }
    })
  } catch (error) {
    console.error(error)
    return { error }
  }
}

const post = async (url, data) => {
  try {
    const res = await axios.post(url, data).data

    return new Promise((resolve, reject) => {
      const data = res.data
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
