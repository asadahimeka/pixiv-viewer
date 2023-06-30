import { LocalStorage } from '@/utils/storage'
import PixivApi from './pixiv-api'

const CONFIG_FILE = 'PXV_CLIENT_CONFIG'
const defaultConfig = {
  directMode: false,
  refreshToken: '',
  useApiProxy: false,
  useLocalAppApi: false,
}

class PixivAuth {
  /**
   * 读取配置
   *
   * @static
   * @returns 配置
   * @memberof PixivAuth
   */
  static readConfig() {
    return LocalStorage.get(CONFIG_FILE, defaultConfig)
  }

  /**
   * 写入配置
   *
   * @static
   * @param {*} config 配置
   * @memberof PixivAuth
   */
  static writeConfig(config) {
    LocalStorage.set(CONFIG_FILE, config)
  }

  /**
   * 检查配置
   *
   * @static
   * @param {*} [config=PixivAuth.readConfig()]
   * @returns 是否通过
   * @memberof PixivAuth
   */
  static checkConfig(config) {
    let check = true
    if (!config.refreshToken) {
      console.error(`${'\nYou must login first!'}\n  Try ${'pxder --login'}`)
      check = false
    }
    return check
  }

  /**
   * 登录
   *
   * @static
   * @param {string} code
   * @param {string} code_verifier
   * @memberof PixivAuth
   */
  static async login(code, code_verifier) {
    // 登录
    const pixiv = new PixivApi()
    await pixiv.tokenRequest(code, code_verifier)
    // 获取 refresh_token
    const { refresh_token } = pixiv.authInfo()
    // 更新配置
    const conf = PixivAuth.readConfig()
    conf.refreshToken = refresh_token
    conf.useLocalAppApi = true
    PixivAuth.writeConfig(conf)
    return refresh_token
  }

  /**
   * 使用 refreshToken 登录
   *
   * @static
   * @param {string} token refreshToken
   * @memberof PixivAuth
   */
  static async loginByToken(token) {
    // 测试登录
    const pixiv = new PixivApi()
    await pixiv.refreshAccessToken(token)
    // 更新配置
    const conf = PixivAuth.readConfig()
    conf.refreshToken = token
    PixivAuth.writeConfig(conf)
  }

  /**
   * 重登陆
   *
   * @static
   * @returns 成功或失败
   * @memberof PixivAuth
   */
  async relogin() {
    // 检查配置
    const { refreshToken } = PixivAuth.readConfig()
    if (!refreshToken) return false
    // 刷新 token
    this.pixiv = new PixivApi()
    await this.pixiv.refreshAccessToken(refreshToken)
    // 定时刷新 token
    this.reloginInterval = setInterval(() => {
      this.pixiv.refreshAccessToken(refreshToken)
    }, 30 * 60 * 1000)
    return true
  }

  /**
   * 清除定时重登陆
   *
   * @memberof PixivAuth
   */
  clearReloginInterval() {
    clearInterval(this.reloginInterval)
  }

  /**
   * 登出
   *
   * @static
   * @memberof PixivAuth
   */
  static logout() {
    const config = PixivAuth.readConfig()
    config.refreshToken = null
    PixivAuth.writeConfig(config)
  }
}

export default PixivAuth
