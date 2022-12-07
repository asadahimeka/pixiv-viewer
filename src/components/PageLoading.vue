<template>
  <div class="page-loading">
    <van-loading :color="color" />
  </div>
</template>
<script>
import { Loading } from 'vant';
import { mapState } from "vuex";
export default {
  name: "PageLoading",
  computed: {
    ...mapState({
      color: "themeColor"
    })
  },
  components: {
    [Loading.name]: Loading
  }
};
</script>
<style>
.page-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}
</style>