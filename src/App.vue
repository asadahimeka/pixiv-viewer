<template>
  <div id="app">
    <Preload />
    <router-view />
  </div>
</template>

<script>
import Preload from "@/components/Preload";
export default {
  components: {
    Preload
  }
};
</script>

<style lang="stylus">
html,body
  width 100%;
  height 100%

#app
  -webkit-font-smoothing antialiased
  -moz-osx-font-smoothing grayscale
  // max-width 750px
  width 100%
  height 100%
  margin 0 auto

</style>
