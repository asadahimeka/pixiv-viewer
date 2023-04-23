<template>
  <div id="appSafeArea" class="app-safe-area">
    <transition>
      <keep-alive>
        <router-view />
      </keep-alive>
    </transition>
  </div>
</template>
<script>
export default {
  name: 'Safearea',
  mounted() {
    // if (window.plus) {
    // let pt = plus.navigator.getStatusbarHeight();
    // pt = pt + 5;
    // $("#appSafeArea").css("padding-top", pt + "px");
    // }
  },
}
</script>

<style>
.app-safe-area {
  padding-top: 0.8rem;
  box-sizing: border-box;
  height: 100%;
  overflow: hidden;
}
@media only screen and (-webkit-device-pixel-ratio: 3) and (device-height: 812px) and (device-width: 375px) {
  .app-safe-area {
    padding-bottom: 0.5rem;
  }
}
@media only screen and (device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 2) {
  .app-safe-area {
    padding-bottom: 0.5rem;
  }
}
@media only screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) {
  .app-safe-area {
    padding-bottom: 0.5rem;
  }
}
@media only screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) {
  .app-safe-area {
    padding-bottom: 0.5rem;
  }
}
</style>
