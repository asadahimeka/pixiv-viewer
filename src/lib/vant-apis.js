import Dialog from 'vant/lib/dialog'
import Toast from 'vant/lib/toast'
import ImagePreview from 'vant/lib/image-preview'
import Notify from 'vant/lib/notify'
import Locale from 'vant/lib/locale'

// 补漏样式：dialog/toast 样式已在 vant-style.js（webpack 去重），
// image-preview/notify 样式原由 babel-plugin-import 注入 es 版，改 lib 后需显式引入
import 'vant/lib/image-preview/style'
import 'vant/lib/notify/style'

export { Dialog, Toast, ImagePreview, Notify, Locale }
