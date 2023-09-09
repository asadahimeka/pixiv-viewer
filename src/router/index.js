import Vue from 'vue'
import VueRouter from 'vue-router'
import nprogress from 'nprogress'
import { LocalStorage } from '@/utils/storage'

import BaseLayout from '@/layouts/BaseLayout.vue'
import MainLayout from '@/layouts/MainLayout.vue'

import Home from '@/views/Home/index.vue'
import HomeManga from '@/views/Home/HomeManga.vue'
import HomeNovel from '@/views/Home/HomeNovel.vue'
import Discovery from '@/views/Discovery/Discovery.vue'
import RecommendIllust from '@/views/Discovery/RecommendIllust.vue'
import Spotlights from '@/views/Spotlights/Spotlights.vue'
import Spotlight from '@/views/Spotlights/Spotlight.vue'
import SpotlightDetail from '@/views/Spotlights/SpotlightDetail.vue'
import Search from '@/views/Search/index.vue'
import SearchNovel from '@/views/Search/SearchNovel.vue'
import SearchUser from '@/views/Search/SearchUser.vue'
import SearchUserRes from '@/views/Search/SearchUserRes.vue'
import Rank from '@/views/Rank/index.vue'
import RankNovel from '@/views/Rank/RankNovel.vue'
import Following from '@/views/Account/Following.vue'
import Setting from '@/views/Setting/index.vue'
import History from '@/views/Setting/History.vue'
import ClearCache from '@/views/Setting/ClearCache.vue'
import ContentsDisplay from '@/views/Setting/ContentsDisplay.vue'
import SettingOthers from '@/views/Setting/OtherSetting.vue'
import SettingAbout from '@/views/Setting/About.vue'
import SettingDisclaimer from '@/views/Setting/Disclaimer.vue'
import SettingDownApp from '@/views/Setting/DownloadApp.vue'
import Recommend from '@/views/Setting/Recommend.vue'
import Artwork from '@/views/Artwork/index.vue'
import Novel from '@/views/Artwork/Novel.vue'
import Users from '@/views/Users/index.vue'
import UserIllusts from '@/views/Users/AuthorIllustsFull.vue'
import UserNovels from '@/views/Users/AuthorNovelsFull.vue'
import UserFavorites from '@/views/Users/FavoriteIllustsFull.vue'
import UserFavoriteNovels from '@/views/Users/FavoriteNovelsFull.vue'
import IllustSeries from '@/views/Users/IllustSeries.vue'
import NovelSeries from '@/views/Users/NovelSeries.vue'
import Session from '@/views/Account/Session.vue'
import Login from '@/views/Account/Login.vue'
import OAuthCallback from '@/views/Account/OAuthCallback.vue'
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
            path: '/home_manga',
            name: 'HomeManga',
            component: HomeManga,
            meta: { __depth: 1 },
          },
          {
            path: '/home_novel',
            name: 'HomeNovel',
            component: HomeNovel,
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
            alias: ['/s/:keyword'],
            name: 'SearchKeyword',
            component: Search,
            meta: { __depth: 1 },
          },
          {
            path: '/search_novel',
            name: 'SearchNovel',
            component: SearchNovel,
            meta: { __depth: 1 },
          },
          {
            path: '/search_novel/:keyword',
            name: 'SearchNovelKeyword',
            component: SearchNovel,
            meta: { __depth: 1 },
          },
          {
            path: '/search_user',
            name: 'SearchUser',
            component: SearchUser,
            meta: { __depth: 1 },
          },
          {
            path: '/rank',
            redirect: '/rank/daily',
            meta: { __depth: 1 },
          },
          {
            path: '/rank/:type',
            name: 'Rank',
            component: Rank,
            meta: { __depth: 1 },
          },
          {
            path: '/rank_novel/:type',
            name: 'RankNovel',
            component: RankNovel,
            meta: { __depth: 1 },
          },
          {
            path: '/following',
            name: 'Following',
            component: Following,
            meta: { __depth: 1 },
          },
          {
            path: '/setting',
            name: 'Setting',
            component: Setting,
            meta: { __depth: 1 },
          },
        ],
      },
      {
        path: '/',
        component: MainLayout,
        props: { showNav: false },
        children: [
          {
            path: '/artworks/:id',
            alias: ['/illust/:id', '/i/:id'],
            name: 'Artwork',
            component: Artwork,
            meta: { __depth: 10 },
          },
          {
            path: '/novel/:id',
            alias: ['/n/:id'],
            name: 'NovelDetail',
            component: Novel,
            meta: { __depth: 10 },
          },
          {
            path: '/users/:id',
            alias: ['/u/:id'],
            name: 'Users',
            component: Users,
            meta: { __depth: 20 },
          },
          {
            path: '/users/:id/artworks',
            name: 'AuthorIllusts',
            component: UserIllusts,
            meta: { __depth: 25 },
          },
          {
            path: '/users/:id/novels',
            name: 'AuthorNovels',
            component: UserNovels,
            meta: { __depth: 25 },
          },
          {
            path: '/users/:id/favorites',
            name: 'AuthorFavorites',
            component: UserFavorites,
            meta: { __depth: 25 },
          },
          {
            path: '/users/:id/favorite_novels',
            name: 'AuthorFavoriteNovels',
            component: UserFavoriteNovels,
            meta: { __depth: 25 },
          },
          {
            path: '/user/:uid/series/:sid',
            name: 'IllustSeries',
            component: IllustSeries,
            meta: { __depth: 25 },
          },
          {
            path: '/novel/series/:id',
            name: 'NovelSeries',
            component: NovelSeries,
            meta: { __depth: 25 },
          },
          {
            path: '/search_user/:word',
            name: 'SearchUserRes',
            component: SearchUserRes,
            meta: { __depth: 2 },
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
            path: '/setting/contents_display',
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
            path: '/setting/about/disclaimer',
            name: 'SettingDisclaimer',
            component: SettingDisclaimer,
            meta: { __depth: 3 },
          },
          {
            path: '/setting/down_app',
            name: 'SettingDownApp',
            component: SettingDownApp,
            meta: { __depth: 2 },
          },
          {
            path: '/setting/recommend',
            name: 'SettingRecommend',
            component: Recommend,
            meta: { __depth: 2 },
          },
          {
            path: '/discovery',
            name: 'Discovery',
            component: Discovery,
            meta: { __depth: 2 },
          },
          {
            path: '/recom_illust',
            name: 'RecommendIllust',
            component: RecommendIllust,
            meta: { __depth: 2 },
          },
          {
            path: '/spotlights',
            alias: ['/pixivision'],
            name: 'Spotlights',
            component: Spotlights,
            meta: { __depth: 2 },
          },
          {
            path: '/spotlight/:id',
            alias: ['/sp/:id'],
            name: 'Spotlight',
            component: Spotlight,
            meta: { __depth: 3 },
          },
          {
            path: '/pixivision/:id',
            name: 'SpotlightDetail',
            alias: ['/a/:id'],
            component: SpotlightDetail,
            meta: { __depth: 3 },
          },
          {
            path: '/account/session',
            name: 'Session',
            component: Session,
            meta: { __depth: 3 },
          },
          {
            path: '/account/login',
            name: 'Login',
            component: Login,
            meta: { __depth: 2 },
          },
          {
            path: '/account/oauth',
            name: 'OAuthCallback',
            component: OAuthCallback,
            meta: { __depth: 1 },
          },
        ],
      },
    ],
  },
  {
    path: '*',
    name: 'NotFound',
    component: NotFound,
  },
]

const isPageEffectOn = LocalStorage.get('PXV_PAGE_EFFECT', false)

const router = new VueRouter({
  routes,
  mode: 'history',
  base: process.env.BASE_URL,
  scrollBehavior(_, __, pos) {
    console.log('pos: ', pos)
    if (isPageEffectOn) {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve(pos || { x: 0, y: 0 })
        }, 225)
      })
    } else {
      return pos || { x: 0, y: 0 }
    }
  },
})

router.beforeEach((to, from, next) => {
  nprogress.start()
  next()
})

router.afterEach((to, from) => {
  nprogress.done()
  console.log('afterEach to', to.fullPath)
  console.log('afterEach from', from.fullPath)
})

export default router
