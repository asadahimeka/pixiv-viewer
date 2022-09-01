import Vue from 'vue'
import router from './router'
import store from './store'
import { Toast, Lazyload, ImagePreview } from 'vant';
import '@vant/touch-emulator';
import VueAwesomeSwiper from 'vue-awesome-swiper'
import VCalendar from 'v-calendar';
import VueMasonry from 'vue-masonry-css'
import SvgIcon from '@/icons'
import App from './App.vue'

import '@/assets/css/base.styl'

// import '@/assets/css/iconfont/iconfont.js'

import './polyfill'

import './registerServiceWorker'

Vue.use(Toast);
Vue.use(Lazyload, {
  lazyComponent: true,
  loading: require('@/icons/loading.svg')
})
Vue.use(ImagePreview);
Vue.use(VueAwesomeSwiper)
Vue.use(VCalendar)
Vue.use(VueMasonry)
Vue.use(SvgIcon)

Vue.config.productionTip = false

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
