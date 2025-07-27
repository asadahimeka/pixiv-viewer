import store from '@/store'
import { localApi } from '@/api'
import { existsSessionId, initUser } from '@/api/user'

export async function checkIsLogin() {
  let user = null
  try {
    if (window.APP_CONFIG.useLocalAppApi) {
      user = await localApi.me()
    } else if (existsSessionId()) {
      user = await initUser()
    }
  } catch (err) {
    console.log('err: ', err)
  }
  console.log('user: ', user)
  store.commit('setUser', user)
}
