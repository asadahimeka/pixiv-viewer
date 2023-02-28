import Vue from 'vue'
import VueRouter from 'vue-router'
import nprogress from 'nprogress'

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
import Setting from '@/views/Setting/index.vue'
import History from '@/views/Setting/History.vue'
import ClearCache from '@/views/Setting/ClearCache.vue'
import ContentsDisplay from '@/views/Setting/ContentsDisplay.vue'
import SettingOthers from '@/views/Setting/OtherSetting.vue'
import SettingAbout from '@/views/Setting/About.vue'
import Recommend from '@/views/Setting/Recommend.vue'
import Artwork from '@/views/Artwork/index.vue'
import Novel from '@/views/Artwork/Novel.vue'
import Users from '@/views/Users/index.vue'
import UserIllusts from '@/views/Users/AuthorIllustsFull.vue'
import UserNovels from '@/views/Users/AuthorNovelsFull.vue'
import UserFavorites from '@/views/Users/FavoriteIllustsFull.vue'
import UserFavoriteNovels from '@/views/Users/FavoriteNovelsFull.vue'
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
          },
          {
            path: '/home_manga',
            name: 'HomeManga',
            component: HomeManga,
          },
          {
            path: '/home_novel',
            name: 'HomeNovel',
            component: HomeNovel,
          },
          {
            path: '/search',
            name: 'Search',
            component: Search,
          },
          {
            path: '/search/:keyword',
            alias: ['/s/:keyword'],
            name: 'SearchKeyword',
            component: Search,
          },
          {
            path: '/search_novel',
            name: 'SearchNovel',
            component: SearchNovel,
          },
          {
            path: '/search_novel/:keyword',
            name: 'SearchNovelKeyword',
            component: SearchNovel,
          },
          {
            path: '/search_user',
            name: 'SearchUser',
            component: SearchUser,
          },
          {
            path: '/rank',
            redirect: '/rank/daily',
          },
          {
            path: '/rank/:type',
            name: 'Rank',
            component: Rank,
          },
          {
            path: '/rank_novel/:type',
            name: 'RankNovel',
            component: RankNovel,
          },
          {
            path: '/setting',
            name: 'Setting',
            component: Setting,
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
          },
          {
            path: '/novel/:id',
            alias: ['/n/:id'],
            name: 'NovelDetail',
            component: Novel,
          },
          {
            path: '/users/:id',
            alias: ['/u/:id'],
            name: 'Users',
            component: Users,
          },
          {
            path: '/users/:id/artworks',
            name: 'AuthorIllusts',
            component: UserIllusts,
          },
          {
            path: '/users/:id/novels',
            name: 'AuthorNovels',
            component: UserNovels,
          },
          {
            path: '/users/:id/favorites',
            name: 'AuthorFavorites',
            component: UserFavorites,
          },
          {
            path: '/users/:id/favorite_novels',
            name: 'AuthorFavoriteNovels',
            component: UserFavoriteNovels,
          },
          {
            path: '/search_user/:word',
            name: 'SearchUserRes',
            component: SearchUserRes,
          },
          {
            path: '/setting/history',
            name: 'History',
            component: History,
          },
          {
            path: '/setting/clearcache',
            name: 'ClearCache',
            component: ClearCache,
          },
          {
            path: '/setting/contents_display',
            name: 'ContentsDisplay',
            component: ContentsDisplay,
          },
          {
            path: '/setting/others',
            name: 'SettingOthers',
            component: SettingOthers,
          },
          {
            path: '/setting/about',
            name: 'SettingAbout',
            component: SettingAbout,
          },
          {
            path: '/setting/recommend',
            name: 'SettingRecommend',
            component: Recommend,
          },
          {
            path: '/discovery',
            name: 'Discovery',
            component: Discovery,
          },
          {
            path: '/recom_illust',
            name: 'RecommendIllust',
            component: RecommendIllust,
          },
          {
            path: '/spotlights',
            alias: ['/pixivision'],
            name: 'Spotlights',
            component: Spotlights,
          },
          {
            path: '/spotlight/:id',
            alias: ['/pixivision/:id'],
            name: 'Spotlight',
            component: Spotlight,
          },
          {
            path: '/spotlight_detail',
            name: 'SpotlightDetail',
            component: SpotlightDetail,
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

const router = new VueRouter({
  routes,
  mode: 'history',
  base: process.env.BASE_URL,
  scrollBehavior(_, __, pos) {
    console.log('pos: ', pos)
    return pos || { x: 0, y: 0 }
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
