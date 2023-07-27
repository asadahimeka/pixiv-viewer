<template>
  <div class="app-base">
    <!-- <transition name="fade"> -->
    <keep-alive>
      <router-view />
    </keep-alive>
    <!-- </transition> -->
  </div>
</template>

<script>
export default {
  data() {
    return {

    }
  },
}
</script>

<style>
.app-base {
  width: 100%;
  /* height: 100%; */
}

.fade-enter-active,
.fade-leave-active {
  transition: all 0.2s;
}
.fade-enter-from {
  opacity: 0;
}
.fade-leave-to {
  opacity: 0;
}

.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.2s;
}
.slide-left-enter-from {
  opacity: 0;
  transform: translate(50px, 0);
}
.slide-left-leave-to {
  opacity: 0;
  transform: translate(-50px, 0);
}
.slide-right-enter-from {
  opacity: 0;
  transform: translate(-50px, 0);
}
.slide-right-leave-to {
  opacity: 0;
  transform: translate(50px, 0);
}

html:has(div[class*="slide-left"]),
html:has(div[class*="slide-right"]) {
  overflow-x: hidden;
}
</style>
