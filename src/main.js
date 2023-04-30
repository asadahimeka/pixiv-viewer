// import 'swiper/css/swiper.css'
import '@/assets/style/base.styl'

import Vue from 'vue'
import VueAwesomeSwiper from 'vue-awesome-swiper'
import VueMasonry from 'vue-masonry-css'
import Vant, { Toast, Lazyload, ImagePreview, Dialog } from 'vant'

import SvgIcon from '@/icons'
import ImageLayout from './components/ImageLayout.vue'
import TopBar from '@/components/TopBar'
import App from './App.vue'
import router from './router'
import store from './store'
import { i18n } from './i18n'

import '@vant/touch-emulator'
import './polyfill'
import './registerServiceWorker'

Dialog.alert({
  width: '9rem',
  message: '<b style="font-size:.4rem">Pixiv 源站目前无法连接，请等待官方修复<b><br><img style="width:100%" src="https://upload-bbs.miyoushe.com/upload/2023/04/30/190122060/4b1f9f1ff58e76354f27b49f4864df93_7573079909252890752.png" alt>',
  confirmButtonText: '我知道了',
})

Vue.use(Toast)
Vue.use(ImagePreview)
Vue.use(Lazyload, {
  observer: true,
  lazyComponent: true,
  loading: require('@/icons/loading.svg'),
  adapter: {
    error(evt) {
      const src = evt.src
      if (!src?.includes('i-cf.pximg.net')) return
      if (!/\/artworks\/|\/spotlight\//i.test(location.href)) evt.el.src = ''
      evt.el.src = src.replace('i-cf.pximg.net', 'i.pixiv.re')
    },
  },
})
Vue.use(Vant)
Vue.use(VueAwesomeSwiper)
Vue.use(VueMasonry)
Vue.use(SvgIcon)

Vue.component('WfCont', ImageLayout)
Vue.component('TopBar', TopBar)

Vue.config.productionTip = false

new Vue({
  router,
  store,
  i18n,
  render: h => h(App),
}).$mount('#app')
