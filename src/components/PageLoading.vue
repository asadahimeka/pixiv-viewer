<template>
  <div class="page-loading">
    <van-loading :color="color" />
  </div>
</template>
<script>
import { mapState } from 'vuex'
export default {
  name: 'PageLoading',
  computed: {
    ...mapState({
      color: 'themeColor',
    }),
  },
}
</script>
<style>
.page-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}
</style>
