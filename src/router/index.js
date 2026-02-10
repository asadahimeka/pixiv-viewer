import Vue from 'vue'
import VueRouter from 'vue-router'
import nprogress from 'nprogress'
import store from '@/store'
import { BASE_URL } from '@/consts'
import { routes } from './routes'

Vue.use(VueRouter)

const router = new VueRouter({
  routes,
  mode: 'history',
  base: BASE_URL,
  scrollBehavior(_to, _from, pos) {
    console.log('pos: ', pos)
    return pos || { x: 0, y: 0 }
  },
})

const { pageTransition, imgReso, ctrlClickNewTab } = store.state.appSetting
const isLargeWebP = imgReso == 'Large(WebP)'

const noSlideRoutes = ['Home', 'HomeManga', 'HomeNovel', 'Search', 'SearchNovel', 'SearchUser', 'Rank', 'RankNovel', 'Following', 'Setting']
function handlePageTransition(to, from) {
  if (isLargeWebP && to.name == 'Artwork' && from.name != 'Artwork') {
    document.querySelector(`.art-cover-${to.params.id}`)?.classList.add('act-art-cover')
  }
  const { routeHistory } = store.state
  const doc = document.documentElement
  if (routeHistory.length > 1 && routeHistory[routeHistory.length - 2] == to.fullPath) {
    doc.classList.add('router-vta-back')
    store.commit('setRouteHistory', routeHistory.slice(0, -1))
  } else if (routeHistory[routeHistory.length - 1] != to.fullPath) {
    doc.classList.remove('router-vta-back')
    store.commit('setRouteHistory', [...routeHistory, to.fullPath])
  }
  if (noSlideRoutes.includes(from.name) && noSlideRoutes.includes(to.name)) {
    doc.classList.add('router-vta-fade')
  } else {
    doc.classList.remove('router-vta-fade')
  }
  if (from.name) {
    doc.classList.remove('router-vta-first')
  } else {
    doc.classList.add('router-vta-first')
  }
}

let isPressingMetaKey = false

if (ctrlClickNewTab) {
  document.addEventListener('keydown', event => {
    if (event.metaKey || event.ctrlKey) {
      isPressingMetaKey = true
    }
  })

  document.addEventListener('keyup', event => {
    if (!event.metaKey && !event.ctrlKey) {
      isPressingMetaKey = false
    }
  })
}

router.beforeEach((to, from, next) => {
  if (ctrlClickNewTab && isPressingMetaKey) {
    window.open(to.fullPath)
    return
  }

  if (pageTransition) {
    handlePageTransition(to, from)
    document.startViewTransition(() => next())
  } else {
    nprogress.start()
    next()
  }
})

router.afterEach((to, from) => {
  if (!pageTransition) {
    nprogress.done()
  } else if (isLargeWebP) {
    setTimeout(() => {
      document.querySelector('.act-art-cover')?.classList.remove('act-art-cover')
    }, 500)
  }
  console.log('afterEach to', to.fullPath)
  console.log('afterEach from', from.fullPath)
})

export default router
