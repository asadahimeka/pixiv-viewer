import axios from 'axios'
import { Dialog } from 'vant'
import { i18n } from '@/i18n'
import { getCookie, removeCookie, setCookie } from '@/utils'

const getJSON = (url, config) => axios.get(url, { ...config, baseURL: '/prks/now' })

export function existsSessionId() {
  const sessionId = getCookie('PHPSESSID')
  if (sessionId) {
    return true
  } else {
    removeCookie('CSRFTOKEN')
    return false
  }
}

export async function initUser() {
  try {
    const { data } = await getJSON('/api/user', { headers: { 'cache-control': 'no-store' } })
    if (data?.token) {
      console.log('session ID认证成功', data)
      setCookie('CSRFTOKEN', data.token)
      return data.userData
    } else {
      removeCookie('CSRFTOKEN')
      throw new Error('无效的session ID')
    }
  } catch (err) {
    removeCookie('CSRFTOKEN')
    throw err
  }
}

export function login(token) {
  if (!validateSessionId(token)) {
    console.error('访问令牌格式错误')
    return Promise.reject(new Error('访问令牌格式错误'))
  }
  setCookie('PHPSESSID', token, 180)
  return initUser()
}

export function logout() {
  const token = getCookie('PHPSESSID')
  if (!token) return
  Dialog.confirm({
    message: i18n.t('user.sess.logout', [token]),
    closeOnPopstate: true,
    cancelButtonText: i18n.t('common.cancel'),
    confirmButtonText: i18n.t('common.confirm'),
  }).then(() => {
    removeCookie('PHPSESSID')
    removeCookie('CSRFTOKEN')
    setTimeout(() => {
      location.reload()
    }, 200)
  })
}

export function validateSessionId(token) {
  return /^\d{2,}_[0-9A-Za-z]{32}$/.test(token)
}

export function exampleSessionId() {
  // const uid = Math.floor(100000000 * Math.random())
  const uid = 12345678
  const secret = (() => {
    const strSet =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    const final = []
    for (let i = 0; i < 32; i++) {
      const charIndex = Math.floor(Math.random() * strSet.length)
      final.push(strSet[charIndex])
    }
    return final.join('')
  })()
  return `${uid}_${secret}`
}
