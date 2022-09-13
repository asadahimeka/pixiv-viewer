import Vue from 'vue'
import VueRouter from 'vue-router'
// import Home from '../views/Home.vue'

import BaseLayout from '@/layouts/BaseLayout.vue'
import MainLayout from '@/layouts/MainLayout.vue'
// import SafeAreaLayout from '@/layouts/SafeAreaLayout'

import Home from '@/views/Home/index.vue'
import Search from '@/views/Search/index.vue'
import Rank from '@/views/Rank/index.vue'
import Setting from '@/views/Setting/index.vue'
import Artwork from '@/views/Artwork/index.vue'
import Users from '@/views/Users/index.vue'
import UserIllusts from '@/views/Users/AuthorIllustsFull.vue'
import About from '@/views/About.vue'

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
            redirect: '/home'
          },
          {
            path: '/home',
            name: 'Home',
            meta: { __depth: 1 },
            component: Home
          },
          {
            path: '/search',
            name: 'Search',
            meta: { __depth: 1 },
            component: Search
          },
          {
            path: '/rank',
            redirect: '/rank/daily'
          },
          {
            path: '/rank/:type',
            name: 'Rank',
            meta: { __depth: 1 },
            component: Rank
          },
          {
            path: '/setting',
            name: 'Setting',
            meta: { __depth: 1 },
            component: Setting
          }
        ]
      },
      {
        path: '/',
        component: MainLayout,
        props: { showNav: false },
        children: [
          {
            path: '/artwork/:id',
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
            component: UserIllusts,
            meta: { __depth: 3 },
          },
        ]
      }
    ]
  },
  {
    path: '*',
    name: 'About',
    component: About
  }
]

const router = new VueRouter({
  routes,
  mode: 'history',
  base: process.env.BASE_URL,
})

router.beforeEach((to, from, next) => {
  console.log('to, from: ', to, from)
  const container = document.querySelector('.app-main')
  if (container) from.meta.__scrollTop = container.scrollTop
  next()
})

router.afterEach((to, from) => {
  console.log('to, from: ', to, from)
  const shouldScroll = to.meta.__depth < from.meta.__depth
  if (shouldScroll) {
    const container = document.querySelector('.app-main')
    container && requestAnimationFrame(() => {
      container.scrollTop = to.meta.__scrollTop
    })
  }
})

export default router
