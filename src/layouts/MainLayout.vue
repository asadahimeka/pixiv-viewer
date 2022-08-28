<template>
  <div class="main-layout" :class="{'safe-area': safeArea}">
    <div class="app-main">
      <keep-alive>
        <router-view></router-view>
      </keep-alive>
    </div>
    <Nav v-if="showNav" />
  </div>
</template>

<script>
import Nav from "@/components/Nav";
export default {
  data() {
    return {};
  },
  props: {
    safeArea: {
      type: Boolean,
      default: false
    },
    showNav: {
      type: Boolean,
      default: true
    }
  },
  components: {
    Nav
  }
};
</script>

<style lang="stylus" scoped>
.main-layout {
  box-sizing: border-box;

  &.safe-area {
    padding-top: 60px;
    height: calc(100vh - 60px);
    padding-top: env(safe-area-inset-top);
    height: calc(100vh - env(safe-area-inset-top));
  }
}

.app-main {
  position: relative;
  height: 100%;
  padding-top 10px;
  // height: calc(100vh - 100px);
  padding-bottom: 100px;
  // height: calc(100vh - env(safe-area-inset-bottom));
  // padding-bottom: env(safe-area-inset-bottom);
  overflow-y: scroll;
  box-sizing: border-box;

  &::-webkit-scrollbar {
    width: 0;
  }
}
</style>
