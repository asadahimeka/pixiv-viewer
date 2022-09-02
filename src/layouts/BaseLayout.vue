<template>
  <div class="app-base">
    <PageLoading v-show="loading" />
    <keep-alive>
      <router-view v-if="!loading"></router-view>
    </keep-alive>
  </div>
</template>

<script>
import PageLoading from "@/components/PageLoading";
export default {
  data() {
    return {
      loading: false
    };
  },
  components: {
    PageLoading
  },
};
</script>

<style>
.app-base {
  height: 100%;
  width: 100%;
  /* overflow: hidden; */
}
</style>
