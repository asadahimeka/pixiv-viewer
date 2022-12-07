import axios from 'axios'
import { LocalStorage } from '@/utils/storage'

const baseURL = LocalStorage.get('__HIBIAPI_BASE', 'https://ef.kanata.ml/obfs/api/pixiv')
export const notSelfHibiApi = !/hibi\d?\.cocomi\.cf|hibi3/.test(baseURL)

axios.defaults.baseURL = baseURL
axios.defaults.timeout = 10000
axios.defaults.headers.post['Content-Type'] = 'application/json'

const get = async (url, params) => {
  console.log('url: ', url)
  console.log('params: ', params)
  try {
    const res = await axios.get(url, { params })

    return new Promise((resolve, reject) => {
      let data = res.data
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
