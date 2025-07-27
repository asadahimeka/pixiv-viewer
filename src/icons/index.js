import SvgIcon from './Icon.vue'

export default {
  install(Vue) {
    Vue.component('Icon', SvgIcon)
  },
}

export const loadingSvg = (color = 'currentColor') => `data:image/svg+xml,%3C%3Fxml version="1.0" encoding="utf-8"%3F%3E%3Csvg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style="margin: auto; display: block; shape-rendering: auto; animation-play-state: running; animation-delay: 0s;" width="100px" height="100px" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid"%3E%3Ccircle cx="50" cy="50" r="24" stroke-width="5" stroke="${encodeURIComponent(color)}" stroke-dasharray="37.69911184307752 37.69911184307752" fill="none" stroke-linecap="round" style="animation-play-state: running; animation-delay: 0s;"%3E%3CanimateTransform attributeName="transform" type="rotate" repeatCount="indefinite" dur="1s" keyTimes="0;1" values="0 50 50;360 50 50" style="animation-play-state: running; animation-delay: 0s;"%3E%3C/animateTransform%3E%3C/circle%3E%3C/svg%3E%0A`
