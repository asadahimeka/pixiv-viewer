import { applyDynamicMdTheme, resetMdTheme } from './theme-md'

const VISUAL_THEME_KEY = 'PXV_VISUAL_THEME'
const CHAR_THEME_KEY = 'PXV_THEME'

const VISUAL_THEMES = ['default', 'sakuria', 'md', 'ios26']

function visualThemeClass(theme) {
  return `t_${theme}-visual`
}

/**
 * 同步 custom_theme 类：
 * 视觉主题（非 default）或角色主题存在时保留，两者都无时移除
 * 协调规则：有角色主题 → custom_theme 由角色主题管理；只有视觉主题 → 由视觉主题补加
 */
function syncCustomTheme() {
  const doc = document.documentElement
  const hasVisual = !!localStorage[VISUAL_THEME_KEY] && localStorage[VISUAL_THEME_KEY] !== 'default'
  const hasCharTheme = !!localStorage[CHAR_THEME_KEY]
  if (hasVisual || hasCharTheme) {
    doc.classList.add('custom_theme')
  } else {
    doc.classList.remove('custom_theme')
  }
}

/**
 * 获取当前视觉主题
 * @returns {string} 'default' | 'sakuria' | 'md' | 'ios26'
 */
export function getVisualTheme() {
  const theme = localStorage[VISUAL_THEME_KEY]
  return VISUAL_THEMES.includes(theme) ? theme : 'default'
}

/**
 * 应用视觉主题，非法值回退 'default'
 * @param {string} theme
 */
export function applyVisualTheme(theme) {
  const next = VISUAL_THEMES.includes(theme) ? theme : 'default'
  const doc = document.documentElement
  for (const t of VISUAL_THEMES) {
    if (t !== 'default') doc.classList.remove(visualThemeClass(t))
  }
  if (next !== 'default') {
    doc.classList.add(visualThemeClass(next))
  }
  syncMdTheme(next)
  localStorage[VISUAL_THEME_KEY] = next
  syncCustomTheme()
}

function syncMdTheme(theme) {
  const seed = localStorage.PXV_ACT_COLOR
  if (theme === 'md' && seed) {
    applyDynamicMdTheme(seed)
  } else {
    resetMdTheme()
  }
}

/**
 * 重置视觉主题：移除全部 t_*-visual 类并删除 localStorage 键
 */
export function resetVisualTheme() {
  const doc = document.documentElement
  for (const t of VISUAL_THEMES) {
    if (t !== 'default') doc.classList.remove(visualThemeClass(t))
  }
  resetMdTheme()
  localStorage.removeItem(VISUAL_THEME_KEY)
  syncCustomTheme()
}

// 启动时（模块静态导入即执行）：md 主题 + 自定义 accent seed → 动态取色
const currentTheme = getVisualTheme()
if (currentTheme === 'md' && localStorage.PXV_ACT_COLOR) {
  applyDynamicMdTheme(localStorage.PXV_ACT_COLOR)
}
