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
  components: {
    Preload,
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
    z-index 1
    left 50%
    transform translateX(-50%)
    top 0.3rem
    margin-bottom 0
    padding 0

@media screen and (min-width: 1280px)
  .Home,
  .search .tags,
  .search .result-list,
  .rank-list,
  .users .user-tabs .van-tab__pane,
  .user-illusts,
  #app .Spotlights,
  #app .Discovery,
  #app .HomeRecommIllust,
  #app .related
    padding-left 5vw
    padding-right 5vw

  #app
    .nav-container
      left unset
      right 0
      bottom 50%
      width 1.2rem
      height auto
      // transform: translateX(100%);
      transform: translate(0, 50%);
      opacity 1
      &.showNav
        // transform: translateX(0);
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
