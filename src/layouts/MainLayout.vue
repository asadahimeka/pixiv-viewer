<template>
  <div class="main-layout" :class="{'safe-area': safeArea}">
    <div class="app-main">
      <keep-alive>
        <router-view />
      </keep-alive>
    </div>
    <my-nav v-if="showNav" />
  </div>
</template>

<script>
import Nav from '@/components/Nav'
export default {
  components: {
    'my-nav': Nav,
  },
  props: {
    safeArea: {
      type: Boolean,
      default: false,
    },
    showNav: {
      type: Boolean,
      default: true,
    },
  },
  data() {
    return {}
  },
}
</script>

<style lang="stylus" scoped>
.main-layout
  box-sizing border-box

  &.safe-area
    // height 100vh
    padding-top 0

.app-main
  position relative
  // height 100vh
  padding 10px 8px 0
  box-sizing border-box
  // overflow-y auto

</style>
