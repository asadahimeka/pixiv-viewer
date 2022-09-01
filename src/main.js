import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import Icon from 'vue-svg-icon/Icon.vue'
import { Toast, Lazyload, ImagePreview } from 'vant';
import '@vant/touch-emulator';
import VueAwesomeSwiper from 'vue-awesome-swiper'
import VCalendar from 'v-calendar';
import VueMasonry from 'vue-masonry-css'

import 'swiper/css/swiper.css'
import '@/assets/css/base.styl'
// import '@/assets/css/iconfont/iconfont.js'

import './polyfill'

Vue.use(Toast);
Vue.use(Lazyload, {
  lazyComponent: true,
  loading: require('@/svg/loading.svg')
})
Vue.use(ImagePreview);
Vue.use(VueAwesomeSwiper)
Vue.use(VCalendar)
Vue.use(VueMasonry)

Vue.component('Icon', Icon)

Vue.config.productionTip = false

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
