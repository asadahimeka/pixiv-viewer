<template>
  <div id="app">
    <Preload />
    <router-view />
  </div>
</template>

<script>
import Preload from '@/components/Preload'
import { mapMutations } from 'vuex'
import { existsSessionId, initUser } from '@/api/user'
import { localApi } from './api'

export default {
  name: 'App',
  components: {
    Preload,
  },
  head: {
    // if no subcomponents specify a metaInfo.title, this title will be used
    title: 'Pxve',
    // all titles will be injected into this template
    titleTemplate: '%s | Pixiv Viewer',
  },
  async created() {
    let user = null
    try {
      if (window.APP_CONFIG.useLocalAppApi) {
        user = await localApi.me()
      } else if (existsSessionId()) {
        user = await initUser()
      }
    } catch (err) {
      console.log('err: ', err)
    }
    console.log('user: ', user)
    this.setUser(user)
  },
  mounted() {
    const loading = document.querySelector('#ldio-loading')
    loading && (loading.style.display = 'none')
  },
  methods: {
    ...mapMutations(['setUser']),
  },
}
</script>

<style lang="stylus">
html,body
  width 100%;
  // height 100%

#app
  -webkit-font-smoothing antialiased
  -moz-osx-font-smoothing grayscale
  // max-width 750px
  width 100%
  // height 100%
  margin 0 auto

#nprogress
  .bar
    background-color: rgb(253, 186, 47)
  .spinner
    display none

.Home
  padding-top 1.2rem
  .com_sel_tabs
    position fixed
    z-index 9
    left 50%
    transform translateX(-50%)
    top 0
    width 100vw
    margin-bottom 0
    padding 0.3rem 0
    background: rgba(255,255,255,0.8)
    backdrop-filter: saturate(200%) blur(6px)
    .home-title
      position absolute
      top 50%
      left 6vw
      transform translateY(-50%)
      display flex
      align-items center
    .app-logo,.home-search
      height 0.8rem
    .sel-tabs .com_sel_tab
      height 0.7rem
      margin-right 0.18rem
      padding 0 0.2rem
      font-size 0.35rem
    .home-search
      position absolute
      top 50%
      left 50%
      transform translate(-50%, -50%)
      display flex
      align-items center
      .van-search
        width 25vw
        padding 0
        background transparent
    .app-title
      margin-left 10px
      padding-top 5px
      font-size 36px
      font-family "Lucida Handwriting", "Georgia Pro", Georgia, "Times New Roman", serif
      font-weight bold

@media screen and (max-width: 999px)
  .Home .home-i-tabs
    justify-content flex-end
    padding-right 0.5rem
    .home-search
      display none

@media screen and (max-width: 600px)
  .Home .home-i-tabs
    .app-title
      font-size 0.39rem

@media screen and (min-width: 1000px)
  #app
    .Home
      padding-top 1.4rem
      .home-i-tabs
        justify-content flex-end
        align-items center
        padding-left 6vw
        padding-right 6vw

@media screen and (min-width: 1280px)
  #app
    .Home,
    .search .tags,
    .search .result-list,
    .rank-list,
    .users .user-tabs .van-tab__pane,
    .user-illusts,
    .Spotlights,
    .Discovery,
    .HomeRecommIllust,
    .related,
    .Following
      padding-left 5vw
      padding-right 5vw

  #app
    .nav-container
      left unset
      right 0
      bottom 50%
      width 1.2rem
      height auto
      transform: translate(0, 50%);
      opacity 1
      &.showNav
        transform: translate(0, 50%);
    .nav-bar
      flex-direction: column
      justify-content: center
      align-items: center
      padding-top 15px
      border-top-left-radius: 0.21333rem;
      border-top-right-radius: 0;
      border-bottom-left-radius: 0.21333rem;
      li
        width 100%
        margin-bottom 25px
        &.nav_to_top
          display list-item
        .icon
          margin-bottom 4px
          font-size 0.55rem
        span
          font-size 0.26rem

</style>
