// MD3 动态取色：seed 色 → tonal palette → 写入 --md-sys-* CSS 变量
// material-color-utilities 懒加载（独立 chunk），失败静默回退到 md.styl 静态基线
// light 写入 documentElement 内联（覆盖静态 token）；dark 用 .dark 作用域 style（随 body.dark 切换，无需重算）
const MD_ROLES = [
  ['primary', 'primary'],
  ['on-primary', 'onPrimary'],
  ['primary-container', 'primaryContainer'],
  ['on-primary-container', 'onPrimaryContainer'],
  ['secondary', 'secondary'],
  ['on-secondary', 'onSecondary'],
  ['secondary-container', 'secondaryContainer'],
  ['on-secondary-container', 'onSecondaryContainer'],
  ['tertiary', 'tertiary'],
  ['on-tertiary', 'onTertiary'],
  ['tertiary-container', 'tertiaryContainer'],
  ['on-tertiary-container', 'onTertiaryContainer'],
  ['error', 'error'],
  ['on-error', 'onError'],
  ['error-container', 'errorContainer'],
  ['on-error-container', 'onErrorContainer'],
  ['background', 'background'],
  ['on-background', 'onBackground'],
  ['surface', 'surface'],
  ['on-surface', 'onSurface'],
  ['surface-variant', 'surfaceVariant'],
  ['on-surface-variant', 'onSurfaceVariant'],
  ['outline', 'outline'],
  ['outline-variant', 'outlineVariant'],
  ['surface-container-lowest', 'surfaceContainerLowest'],
  ['surface-container-low', 'surfaceContainerLow'],
  ['surface-container', 'surfaceContainer'],
  ['surface-container-high', 'surfaceContainerHigh'],
  ['surface-container-highest', 'surfaceContainerHighest'],
]

let mdStyleEl = null

function applyScheme(target, scheme, hexFromArgb) {
  for (const [name, getter] of MD_ROLES) {
    target.style.setProperty('--md-sys-color-' + name, hexFromArgb(scheme[getter]))
  }
}

function removeScheme(target) {
  for (const [name] of MD_ROLES) {
    target.style.removeProperty('--md-sys-color-' + name)
  }
}

/**
 * 以 seed 色生成 MD3 tonal palette 并写入 CSS 变量
 * @param {string} seedColor hex 色（如 '#FF6F9F'）
 */
export async function applyDynamicMdTheme(seedColor) {
  try {
    const { argbFromHex, hexFromArgb, Hct, SchemeTonalSpot } = await import('@material/material-color-utilities')
    const hct = Hct.fromInt(argbFromHex(seedColor))
    const root = document.documentElement
    applyScheme(root, new SchemeTonalSpot(hct, false, 0), hexFromArgb)
    if (!mdStyleEl) {
      mdStyleEl = document.createElement('style')
      document.head.appendChild(mdStyleEl)
    }
    const dark = new SchemeTonalSpot(hct, true, 0)
    const decls = MD_ROLES.map(([name, getter]) => `--md-sys-color-${name}:${hexFromArgb(dark[getter])}`).join(';')
    mdStyleEl.textContent = `html.custom_theme.t_md-visual .dark,html.t_md-visual .dark{${decls}}`
  } catch (err) {
    resetMdTheme()
  }
}

/** 移除动态写入的变量，回退到 md.styl 静态基线 */
export function resetMdTheme() {
  removeScheme(document.documentElement)
  if (mdStyleEl) {
    mdStyleEl.remove()
    mdStyleEl = null
  }
}
