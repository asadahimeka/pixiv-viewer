import SvgIcon from '@/components/SvgIcon'

const requireContext = require.context('./svg', false, /\.svg$/)
requireContext.keys().forEach(requireContext)

export default {
  install(Vue) {
    Vue.component('Icon', SvgIcon)
  },
}
