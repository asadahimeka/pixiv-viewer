import store from '@/store'
import { applyVisualTheme } from '@/utils/theme'

export function changeVisualTheme(value) {
  applyVisualTheme(value)
  window.umami?.track('set_visual_theme', { value })
  if (value == 'sakuria') {
    localStorage.removeItem('PXV_THEME')
    localStorage.setItem('PXV_ACT_COLOR', '#ff6f9f')
    store.commit('setAppSetting', {
      pageFont: '寒蝉半圆体',
      withBodyBg: true,
      showPIDMask: false,
      isImageFitScreen: store.state.isMobile,
      isImageCardBorderRadius: true,
    })
  }
  if (value == 'md') {
    localStorage.removeItem('PXV_THEME')
    localStorage.setItem('PXV_ACT_COLOR', '#6750A4')
    store.commit('setAppSetting', {
      pageFont: '',
      pageTransition: 'f7-md',
      wfType: 'Masonry(CSSGrid)',
      withBodyBg: true,
      imgReso: 'Large(WebP)',
      isImageFitScreen: store.state.isMobile,
      isImageCardOuterMeta: true,
      isImageCardBorderRadius: true,
      isImageCardBoxShadow: true,
      navBarAltStyle: false,
      showPIDMask: false,
    })
  }
  if (value == 'ios26') {
    localStorage.removeItem('PXV_THEME')
    localStorage.setItem('PXV_ACT_COLOR', '#0088FF')
    store.commit('setAppSetting', {
      pageFont: 'HarmonyOS_Regular',
      pageTransition: 'f7-ios',
      withBodyBg: true,
      isImageFitScreen: store.state.isMobile,
      isImageCardBorderRadius: true,
      navBarAltStyle: true,
      showPIDMask: false,
    })
  }
}
