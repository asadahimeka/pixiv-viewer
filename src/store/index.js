import Vue from 'vue'
import Vuex from 'vuex'
import { LocalStorage } from '@/utils/storage'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    themeColor: '#0196fa',
    galleryList: [],
    currentIndex: -1,
    $swiper: null,
    searchHistory: LocalStorage.get('__PIXIV_searchHistory', []),
    SETTING: LocalStorage.get('__PIXIV_SETTING', {
      r18: false,
      r18g: false,
      showAi: false
    })
  },
  getters: {
    currentId: state => state.galleryList[state.currentIndex] ? state.galleryList[state.currentIndex].id : -1,
    isCensored: state => artwork => {
      if (artwork.x_restrict === 1) {
        if (artwork.illust_ai_type === 2) {
          return !state.SETTING.showAi;
        }
        return !state.SETTING.r18;
      }
      if (artwork.x_restrict === 2) {
        if (artwork.illust_ai_type === 2) {
          return !state.SETTING.showAi;
        }
        return !state.SETTING.r18g;
      }
      if (artwork.illust_ai_type === 2) {
        return !state.SETTING.showAi;
      }
      return false;
    },
    wfProps: () => ({
      gutter: "8px",
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
        default: 6
      }
    })
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
        LocalStorage.remove('__PIXIV_searchHistory')
      } else {
        if (state.searchHistory.includes(obj)) return false
        if (state.searchHistory.length >= 20) state.searchHistory.pop()
        state.searchHistory.unshift(obj)
        LocalStorage.set('__PIXIV_searchHistory', state.searchHistory)
      }
    },
    saveSETTING(state, obj) {
      state.SETTING = obj
      LocalStorage.set('__PIXIV_SETTING', state.SETTING)
    }
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
    }
  },
  modules: {
  }
})
