import Vue from 'vue'
import Vuex from 'vuex'
import { LocalStorage } from '@/utils/storage'

Vue.use(Vuex)

const settings = LocalStorage.get('PIXIV_SETTING', {
  r18: false,
  r18g: false,
  showAi: false,
})

// if (!document.cookie.includes('nsfw=1')) {
//   if (settings.r18) settings.r18 = false
//   if (settings.r18g) settings.r18g = false
// }

export default new Vuex.Store({
  state: {
    themeColor: '#0196fa',
    galleryList: [],
    currentIndex: -1,
    $swiper: null,
    searchHistory: LocalStorage.get('PIXIV_SearchHistory', []),
    SETTING: settings,
    user: null,
  },
  getters: {
    currentId: state => state.galleryList[state.currentIndex] ? state.galleryList[state.currentIndex].id : -1,
    isCensored: state => artwork => {
      if (artwork.x_restrict == 1) {
        if (artwork.illust_ai_type == 2) {
          return !state.SETTING.r18 || !state.SETTING.showAi
        }
        return !state.SETTING.r18
      }
      if (artwork.x_restrict == 2) {
        if (artwork.illust_ai_type == 2) {
          return !state.SETTING.r18g || !state.SETTING.showAi
        }
        return !state.SETTING.r18g
      }
      if (artwork.illust_ai_type == 2) {
        return !state.SETTING.showAi
      }
      return false
    },
    wfProps: () => ({
      gutter: '8px',
      cols: {
        300: 1,
        600: 2,
        900: 3,
        1200: 4,
        1600: 5,
        1920: 6,
        2400: 7,
        2700: 8,
        3000: 9,
        default: 6,
      },
    }),
    novelMyProps: () => ({
      gutter: '8px',
      cols: {
        600: 1,
        1200: 2,
        1600: 3,
        default: 4,
      },
    }),
    isLoggedIn(state) {
      return !!state.user
    },
  },
  mutations: {
    setGalleryList(state, { list, id }) {
      state.galleryList = list
      id && this.commit('setCurrentIndex', id)
    },
    setCurrentIndex(state, id) {
      state.currentIndex = state.galleryList.findIndex(artwork => artwork.id === id)
    },
    setSwiper(state, obj) {
      state.$swiper = obj
    },
    setSearchHistory(state, obj) {
      if (obj === null) {
        state.searchHistory = []
        LocalStorage.remove('PIXIV_SearchHistory')
      } else {
        if (state.searchHistory.includes(obj)) return false
        if (state.searchHistory.length >= 20) state.searchHistory.pop()
        state.searchHistory.unshift(obj)
        LocalStorage.set('PIXIV_SearchHistory', state.searchHistory)
      }
    },
    saveSETTING(state, obj) {
      state.SETTING = obj
      LocalStorage.set('PIXIV_SETTING', state.SETTING)
    },
    setUser(state, user) {
      state.user = user
    },
  },
  actions: {
    setGalleryList({ commit }, { list, id }) {
      commit('setGalleryList', { list, id })
    },
    setCurrentIndex({ commit }, value) {
      commit('setCurrentIndex', value)
    },
    setSwiper({ commit }, value) {
      commit('setSwiper', value)
    },
    setSearchHistory({ commit }, value) {
      commit('setSearchHistory', value)
    },
    saveSETTING({ commit }, value) {
      commit('saveSETTING', value)
    },
  },
  modules: {
  },
})
