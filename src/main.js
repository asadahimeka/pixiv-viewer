import 'swiper/css/swiper.css'
import '@/assets/css/base.styl'

import Vue from 'vue'
import VueAwesomeSwiper from 'vue-awesome-swiper'
import VueMasonry from 'vue-masonry-css'
import { Toast, Lazyload, ImagePreview } from 'vant'
import { inject } from '@vercel/analytics'

import SvgIcon from '@/icons'
import Masonry from './components/Masonry.vue'
import TopBar from '@/components/TopBar'
import App from './App.vue'
import router from './router'
import store from './store'

import '@vant/touch-emulator'
import './polyfill'
import './registerServiceWorker'

Vue.use(Toast);
Vue.use(Lazyload, {
  // observer: true,
  lazyComponent: true,
  loading: require('@/icons/loading.svg')
})
Vue.use(ImagePreview);
Vue.use(VueAwesomeSwiper)
Vue.use(VueMasonry, { name: 'v-masonry' })
Vue.use(SvgIcon)

Vue.component('masonry', Masonry)
Vue.component('top-bar', TopBar)

Vue.config.productionTip = false

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')

if (process.env.NODE_ENV === 'production') {
  inject()
}
