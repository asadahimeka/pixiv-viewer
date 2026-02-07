import '@/lib/vant-style'
import 'swiper/css/swiper.css'
import '@/assets/style/base.styl'
import '@/assets/style/theme.styl'
import '@/assets/style/theme-bg.styl'
import '@/assets/style/vta.css'

import '@vant/touch-emulator'
import '@/lib/polyfill'
import '@/lib/registerServiceWorker'

import Vue from 'vue'
import VueAwesomeSwiper from 'vue-awesome-swiper'
import VueMeta from 'vue-meta'
import { Dialog, Notify } from 'vant'
import { vOnLongPress } from '@vueuse/components'

import setupVant from '@/lib/vant'
import SvgIcon from '@/icons'
import VueMasonry from '@/components/VueMasonryCss'
import ImageLayout from '@/components/ImageLayout.vue'
import TopBar from '@/components/TopBar.vue'
import Pximg from '@/components/DirectPximg.vue'
import App from '@/App.vue'
import router from '@/router'
import store from '@/store'
import { LocalStorage } from '@/utils/storage'
import { loadCustomFont } from '@/utils/font'
import { getSelectedLang, i18n, initLocale } from '@/i18n'
import { getActionMap } from '@/api/client/action'
import { initBookmarkCache } from '@/utils/storage/siteCache'

setupApp()

async function setupApp() {
  initPxveccTheme()
  await checkWechat()
  await checkBrowser()
  await initSetting()
  await initLocale()
  await initLocalApi()

  setupVant()
  Vue.use(VueAwesomeSwiper)
  Vue.use(VueMeta, { keyName: 'head' })
  Vue.use(VueMasonry)
  Vue.use(SvgIcon)

  Vue.directive('longpress', vOnLongPress)

  Vue.component('WfCont', ImageLayout)
  Vue.component('TopBar', TopBar)
  Vue.component('Pximg', Pximg)

  Vue.config.productionTip = false

  new Vue({
    router,
    store,
    i18n,
    render: h => h(App),
  }).$mount('#app')
}

async function initLocalApi() {
  const config = LocalStorage.get('PXV_CLIENT_CONFIG', {})
  window.APP_CONFIG = config
  if (!config.useLocalAppApi) return
  document.querySelector('#ldio-loading .ldio-content')
    ?.insertAdjacentHTML('beforeend', `<p class="ldio-title" style="top:180px;font-size:14px">${i18n.t('sBmkLtGcrWIL7xsU-EdM9')}</p>`)
  window.__localApiMap__ = await getActionMap()
  await initBookmarkCache()
}

async function initSetting() {
  const { pageTransition, withBodyBg, pageFont } = store.state.appSetting
  if (pageFont) loadCustomFont(pageFont)
  if (pageTransition) document.documentElement.classList.add(pageTransition)
  if (withBodyBg) document.documentElement.classList.add('with-body-bg')

  let flag = false
  const setting = LocalStorage.get('PXV_CNT_SHOW', {})
  const isOn = () => LocalStorage.get('PXV_NSFW_ON', null)
  if (isOn() == null && (setting.r18 || setting.r18g)) {
    LocalStorage.set('PXV_NSFW_ON', 1)
  }
  try {
    if (!isOn() || !getSelectedLang().includes('zh')) return true
    document.documentElement.innerHTML = ''
    location.replace('/zq39i1hjru.html')
    flag = true
  } catch (error) {
    return true
  }
  if (flag) throw new Error('BLOCKED.')
}

async function checkWechat() {
  if (/MicroMessenger|QQ/i.test(navigator.userAgent)) {
    document.body.innerHTML = '<h1 style="margin:10px;font-size:32px">FUCK WECHAT</h1>'
    Dialog.alert({
      message: i18n.t('tip.browser_tip'),
      theme: 'round-button',
    })
    throw new Error('BLOCKED.')
  }
  return true
}

async function checkBrowser() {
  if (/Quark|QQBrowser|baidu|NewsArticle|UCBrowser|Huawei|HeyTap|Miui|Vivo|Oppo|360se|Sogou/i.test(navigator.userAgent)) {
    document.body.innerHTML = ''
    Dialog.alert({
      message: i18n.t('tip.browser_tip'),
      theme: 'round-button',
    })
    throw new Error('BLOCKED.')
  }
  const chromeVer = parseInt(navigator.userAgent.match(/Chrome\/([\d.]+)/)?.[1])
  if (chromeVer && chromeVer < 106) {
    Notify({
      message: i18n.t('tip.browser_latest'),
      color: '#fff',
      background: localStorage.PXV_ACT_COLOR || '#f1c25f',
      duration: 2500,
    })
  }
  return true
}

function initPxveccTheme() {
  if (location.hostname != 'pxve.cc' || localStorage.PXV_THEME) return
  localStorage.PXV_THEME = 'Anon'
  localStorage.PXV_ACT_COLOR = '#ff8899'
  document.documentElement.classList.add('custom_theme', 't_' + localStorage.PXV_THEME)
  document.documentElement.style.setProperty('--accent-color', localStorage.PXV_ACT_COLOR)
}
