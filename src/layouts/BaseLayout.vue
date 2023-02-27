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
</style>
