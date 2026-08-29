import { changeVisualTheme } from '@/store/actions/change-theme'
import { getVisualTheme } from '@/utils/theme'
import { applyDynamicMdTheme } from '@/utils/theme-md'

initVisualTheme()
initMdTheme()

function initVisualTheme() {
  if (localStorage.PXV_VISUAL_THEME) return
  if (localStorage.PXV_DARK) {
    changeVisualTheme('default')
    return
  }
  if (location.hostname == 'pxve.cc') {
    changeVisualTheme('sakuria')
    return
  }
  const ua = navigator.userAgent
  if (/Android/i.test(ua)) {
    changeVisualTheme('md')
  } else if (/iPhone|iPod|Macintosh|MacIntel/i.test(ua)) {
    changeVisualTheme('ios26')
  }
}

// md 主题 + 自定义 accent seed → 动态取色
function initMdTheme() {
  if (getVisualTheme() === 'md' && localStorage.PXV_ACT_COLOR) {
    applyDynamicMdTheme(localStorage.PXV_ACT_COLOR)
  }
}
