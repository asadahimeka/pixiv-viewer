<template>
  <div class="app-base">
    <PageLoading v-show="loading" />
    <transition :name="transitionName">
      <keep-alive>
        <router-view v-if="!loading"></router-view>
      </keep-alive>
    </transition>
  </div>
</template>

<script>
import PageLoading from "@/components/PageLoading";
export default {
  data() {
    return {
      transitionName: "fade",
      loading: false
    };
  },
  components: {
    PageLoading
  }
};
</script>

<style>
.app-base {
  height: 100%;
  width: 100%;
  /* overflow: hidden; */
}
</style>
