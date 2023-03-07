<template>
  <div id="app">
    <Preload />
    <router-view />
  </div>
</template>

<script>
import Preload from '@/components/Preload'
import { existsSessionId, initUser } from '@/api/user'
import { mapMutations } from 'vuex'

export default {
  components: {
    Preload,
  },
  mounted() {
    const loading = document.querySelector('#ldio-loading')
    loading && (loading.style.display = 'none')

    if (!existsSessionId()) {
      console.log('No session id found. Maybe you are not logged in?')
      this.setUser(null)
      return
    }

    initUser().then(this.setUser).catch(() => this.setUser(null))
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
  padding-top 1.1rem
  .com_sel_tabs
    position fixed
    z-index 1
    left 50%
    transform translateX(-50%)
    top 0.3rem
    margin-bottom 0
    padding 0
  .com_sel_tab
    padding 0 16px
    height 0.66rem
    font-size 0.32rem
</style>
