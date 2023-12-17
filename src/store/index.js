import Vue from 'vue'
import Vuex from 'vuex'
import { LocalStorage } from '@/utils/storage'

Vue.use(Vuex)

const settings = LocalStorage.get('PXV_CNT_SHOW', {
  r18: false,
  r18g: false,
  ai: false,
})

const enableSwipe = LocalStorage.get('PXV_IMG_DTL_SWIPE', false)

export default new Vuex.Store({
  state: {
    themeColor: '#0196fa',
    galleryList: [],
    searchHistory: LocalStorage.get('PIXIV_SearchHistory', []),
    SETTING: settings,
    user: null,
    blockTags: LocalStorage.get('PXV_B_TAGS', '').split(',').filter(Boolean),
    blockUids: LocalStorage.get('PXV_B_UIDS', '').split(',').filter(Boolean),
  },
  getters: {
    isCensored: state => artwork => {
      if (state.blockUids.length && state.blockUids.includes(`${artwork?.author?.id}`)) {
        return true
      }
      if (state.blockTags.length) {
        const tags = JSON.stringify(artwork?.tags || [])
        if (state.blockTags.some(e => tags.includes(e))) {
          return true
        }
      }

      if (artwork.x_restrict == 1) {
        if (artwork.illust_ai_type == 2) {
          return !state.SETTING.r18 || !state.SETTING.ai
        }
        return !state.SETTING.r18
      }
      if (artwork.x_restrict == 2) {
        if (artwork.illust_ai_type == 2) {
          return !state.SETTING.r18g || !state.SETTING.ai
        }
        return !state.SETTING.r18g
      }
      if (artwork.illust_ai_type == 2) {
        return !state.SETTING.ai
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
    setGalleryList(state, list = []) {
      if (enableSwipe) state.galleryList = list.map(e => e.id)
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
      LocalStorage.set('PXV_CNT_SHOW', state.SETTING)
    },
    setUser(state, user) {
      state.user = user
    },
    setBlockTags(state, arr) {
      if (Array.isArray(arr)) {
        state.blockTags.push(...arr)
        LocalStorage.set('PXV_B_TAGS', state.blockTags.join(','))
      }
    },
    setBlockUids(state, arr) {
      if (Array.isArray(arr)) {
        state.blockUids.push(...arr)
        LocalStorage.set('PXV_B_UIDS', state.blockUids.join(','))
      }
    },
  },
  actions: {
    setGalleryList({ commit }, list) {
      commit('setGalleryList', list)
    },
    setSearchHistory({ commit }, value) {
      commit('setSearchHistory', value)
    },
    saveSETTING({ commit }, value) {
      commit('saveSETTING', value)
    },
    appendBlockTags({ commit }, value) {
      commit('setBlockTags', value)
    },
    appendBlockUids({ commit }, value) {
      commit('setBlockUids', value)
    },
  },
  modules: {
  },
})
