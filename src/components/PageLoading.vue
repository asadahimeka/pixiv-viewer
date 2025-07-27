<template>
  <div class="page-loading">
    <van-loading :color="color" />
  </div>
</template>
<script>
export default {
  name: 'PageLoading',
  data() {
    return {
      color: localStorage.PXV_ACT_COLOR,
    }
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
