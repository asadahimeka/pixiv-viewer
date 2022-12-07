import Vue from 'vue'
import VueRouter from 'vue-router'

import BaseLayout from '@/layouts/BaseLayout.vue'
import MainLayout from '@/layouts/MainLayout.vue'

import Home from '@/views/Home/index.vue'
import Discovery from '@/views/Discovery/Discovery.vue'
import Spotlights from '@/views/Spotlights/Spotlights.vue'
import Spotlight from '@/views/Spotlights/Spotlight.vue'
import Search from '@/views/Search/index.vue'
import Rank from '@/views/Rank/index.vue'
import Setting from '@/views/Setting/index.vue'
import History from '@/views/Setting/History.vue'
import ClearCache from '@/views/Setting/ClearCache.vue'
import ContentsDisplay from '@/views/Setting/ContentsDisplay.vue'
import SettingOthers from '@/views/Setting/OtherSetting.vue'
import SettingAbout from '@/views/Setting/About.vue'
import RecommendLink from '@/views/Setting/RecommendLink.vue'
import RecommendUserscript from '@/views/Setting/RecommendUserscript.vue'
import Artwork from '@/views/Artwork/index.vue'
import Users from '@/views/Users/index.vue'
import UserIllusts from '@/views/Users/AuthorIllustsFull.vue'
import UserFavorites from '@/views/Users/FavoriteIllustsFull.vue'
import NotFound from '@/views/NotFound.vue'

Vue.use(VueRouter)

const routes = [
  {
    path: '/',
    component: BaseLayout,
    children: [
      {
        path: '/',
        component: MainLayout,
        props: { safeArea: true },
        children: [
          {
            path: '/',
            name: 'Home',
            component: Home,
            meta: { __depth: 1 },
          },
          {
            path: '/search',
            name: 'Search',
            component: Search,
            meta: { __depth: 1 },
          },
          {
            path: '/search/:keyword',
            name: 'SearchKeyword',
            component: Search,
            meta: { __depth: 1 },
          },
          {
            path: '/rank',
            redirect: '/rank/daily'
          },
          {
            path: '/rank/:type',
            name: 'Rank',
            component: Rank,
            meta: { __depth: 1 },
          },
          {
            path: '/setting',
            name: 'Setting',
            component: Setting,
            meta: { __depth: 1 },
          }
        ]
      },
      {
        path: '/',
        component: MainLayout,
        props: { showNav: false },
        children: [
          {
            path: '/artworks/:id',
            name: 'Artwork',
            component: Artwork,
            meta: { __depth: 4 },
          },
          {
            path: '/users/:id',
            name: 'Users',
            component: Users,
            meta: { __depth: 2 },
          },
          {
            path: '/users/:id/artworks',
            name: 'AuthorIllusts',
            component: UserIllusts,
            meta: { __depth: 3 },
          },
          {
            path: '/users/:id/favorites',
            name: 'AuthorFavorites',
            component: UserFavorites,
            meta: { __depth: 3 },
          },
          {
            path: '/setting/history',
            name: 'History',
            component: History,
            meta: { __depth: 2 },
          },
          {
            path: '/setting/clearcache',
            name: 'ClearCache',
            component: ClearCache,
            meta: { __depth: 2 },
          },
          {
            path: '/setting/contents-display',
            name: 'ContentsDisplay',
            component: ContentsDisplay,
            meta: { __depth: 2 },
          },
          {
            path: '/setting/others',
            name: 'SettingOthers',
            component: SettingOthers,
            meta: { __depth: 2 },
          },
          {
            path: '/setting/about',
            name: 'SettingAbout',
            component: SettingAbout,
            meta: { __depth: 2 },
          },
          {
            path: '/setting/userscripts',
            name: 'SettingRecommendUserscript',
            component: RecommendUserscript,
            meta: { __depth: 2 },
          },
          {
            path: '/setting/links',
            name: 'SettingRecommendLink',
            component: RecommendLink,
            meta: { __depth: 2 },
          },
          {
            path: '/discovery',
            name: 'Discovery',
            component: Discovery,
            meta: { __depth: 2 },
          },
          {
            path: '/spotlights',
            name: 'Spotlights',
            component: Spotlights,
            meta: { __depth: 2 },
          },
          {
            path: '/spotlight/:id',
            name: 'Spotlight',
            component: Spotlight,
            meta: { __depth: 3 },
          },
        ]
      }
    ]
  },
  {
    path: '*',
    name: 'NotFound',
    component: NotFound
  }
]

const router = new VueRouter({
  routes,
  mode: 'history',
  base: process.env.BASE_URL,
})

router.beforeEach((to, from, next) => {
  const container = document.querySelector('.app-main')
  if (container) from.meta.__scrollTop = container.scrollTop
  console.log('beforeEach to', to.fullPath, to.meta.__scrollTop)
  console.log('beforeEach from', from.fullPath, from.meta.__scrollTop)
  next()
})

router.afterEach((to, from) => {
  console.log('afterEach to', to.fullPath, to.meta.__scrollTop)
  console.log('afterEach from', from.fullPath, from.meta.__scrollTop)
  const shouldScroll = to.meta.__depth < from.meta.__depth
  console.log('shouldScroll: ', shouldScroll)
  if (shouldScroll) {
    const container = document.querySelector('.app-main')
    container && requestAnimationFrame(() => {
      container.scrollTop = to.meta.__scrollTop
    })
  }
})

export default router
