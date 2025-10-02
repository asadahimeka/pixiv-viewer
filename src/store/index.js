import Vue from 'vue'
import Vuex from 'vuex'
import _ from '@/lib/lodash'
import { getSettingDef, LocalStorage, SessionStorage } from '@/utils/storage'
import { isSafari } from '@/utils'
import { getSelectedLang } from '@/i18n'
import { isArtworkNotCensored } from '@/utils/filter'

Vue.use(Vuex)

const isMobile = navigator.userAgent.includes('Mobile')
const defPageTransition = (() => {
  if (!document.startViewTransition) return ''
  if (isMobile) return isSafari() ? 'f7-ios' : 'f7-md'
  return 'f7-dive'
})()

export default new Vuex.Store({
  state: {
    /** @type {number[]} */
    galleryList: [],
    /** @type {string[]} */
    searchHistory: getSettingDef('PIXIV_SearchHistory', []),
    contentSetting: getSettingDef('PXV_CNT_SHOW', {
      r18: false,
      r18g: false,
      ai: false,
    }),
    /** @type {object|null} */
    user: null,
    blockTags: getSettingDef('PXV_B_TAGS', '').split(',').filter(Boolean),
    blockUids: getSettingDef('PXV_B_UIDS', '').split(',').filter(Boolean),
    isNovelViewShrink: true,
    isMobile,
    /** @type {any[]|null} */
    appNotice: null,
    /** @type {any[]|null} */
    seasonEffects: null,
    routeHistory: SessionStorage.get('PXV_ROUTE_HISTORY', []),
    appSetting: {
      wfType: getSettingDef('PXV_WF_TYPE', 'Masonry'),
      imgReso: getSettingDef('PXV_DTL_IMG_RES', isMobile ? 'Medium' : 'Large'),
      isLongpressBlock: getSettingDef('PXV_LONGPRESS_BLOCK', false),
      isLongpressDL: getSettingDef('PXV_LONGPRESS_DL', false),
      isEnableSwipe: getSettingDef('PXV_IMG_DTL_SWIPE', false),
      isHideRankManga: getSettingDef('PXV_HIDE_RANK_MANGA', false),
      isUseFancybox: getSettingDef('PXV_USE_FANCYBOX', false),
      isImageFitScreen: getSettingDef('PXV_IMG_FIT_SCREEN', true),
      isImageCardOuterMeta: getSettingDef('PXV_IMG_META_OUTER', true),
      isDirectPximg: getSettingDef('PXV_PXIMG_DIRECT', false),
      isAutoLoadImt: getSettingDef('PXV_AUTO_LOAD_IMT', false),
      preferDownloadByFsa: false,
      preferDownloadByTm: false,
      dlSubDirByAuthor: false,
      dlFileNameTpl: '{author}_{title}_{pid}_p{index}',
      isImgLazy: false,
      isImgLazyOb: false,
      searchListMinFavNum: '5',
      isImageCardBorderRadius: true,
      isImageCardBoxShadow: true,
      ugoiraDefDLFormat: '',
      pageTransition: defPageTransition,
      withBodyBg: true,
      novelDlFormat: '',
      novelDlRmStyle: false,
      novelDefTranslate: '',
      pageFont: /zh-|ja/.test(getSelectedLang()) ? 'LXGW WenKai Screen' : '',
      hideNavBarOnScroll: true,
      manualLoadRelated: false,
      autoPlayUgoira: false,
      ugoiraMp4Bitrate: '4 Mbps',
      showFpsDemo: false,
      isAutoLoadKissT: false,
      isVirtualList: false,
      isUgoiraAvifSrc: false,
      isUgoiraApngSaveAsPng: false,
      novelFilterNoShortLen: false,
      novelFilterTextLenMin: 100,
      novelFilterNoLongTag: false,
      novelFilterTagLenMax: 30,
      novelFilterTagSplitMax: 5,
      ...getSettingDef('PXV_APP_SETTING', {}),
    },
  },
  getters: {
    isLoggedIn(state) {
      return !!state.user
    },
    isR18On(state) {
      return state.contentSetting.r18 || state.contentSetting.r18g
    },
    isCensored: state => artwork => !isArtworkNotCensored(artwork, state),
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
  },
  mutations: {
    setGalleryList(state, list = []) {
      if (state.appSetting.isEnableSwipe) state.galleryList = list.map(e => e.id)
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
    saveContentSetting(state, obj) {
      state.contentSetting = obj
      LocalStorage.set('PXV_CNT_SHOW', obj)
    },
    setUser(state, user) {
      state.user = user
    },
    setBlockTags(state, arr) {
      if (Array.isArray(arr)) {
        state.blockTags = _.uniq([...state.blockTags, ...arr])
        LocalStorage.set('PXV_B_TAGS', state.blockTags.join(','))
      }
    },
    setBlockUids(state, arr) {
      if (Array.isArray(arr)) {
        state.blockUids = _.uniq([...state.blockUids, ...arr])
        LocalStorage.set('PXV_B_UIDS', state.blockUids.join(','))
      }
    },
    setIsNovelViewShrink(state, val) {
      state.isNovelViewShrink = val
    },
    setAppNotice(state, val) {
      state.appNotice = val
    },
    setSeasonEffects(state, val) {
      state.seasonEffects = val
    },
    setAppSetting(state, obj) {
      const setting = { ...state.appSetting, ...obj }
      state.appSetting = setting
      LocalStorage.set('PXV_APP_SETTING', setting)
    },
    setRouteHistory(state, val) {
      state.routeHistory = val
      SessionStorage.set('PXV_ROUTE_HISTORY', val)
    },
  },
  actions: {
    setGalleryList({ commit }, list) {
      commit('setGalleryList', list)
    },
    setSearchHistory({ commit }, value) {
      commit('setSearchHistory', value)
    },
    appendBlockTags({ commit }, value) {
      commit('setBlockTags', value)
    },
    appendBlockUids({ commit }, value) {
      commit('setBlockUids', value)
    },
  },
})

export const novelTextConfig = Vue.observable({
  size: 16,
  height: 2,
  font: 'inherit',
  weight: 400,
  direction: 'h',
  color: '#1f1f1f',
  bg: '#ffffff',
  indent: false,
  ...getSettingDef('PXV_TEXT_CONFIG', {}),
})
