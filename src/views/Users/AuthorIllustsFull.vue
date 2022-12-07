<template>
  <div class="illust-wrap">
    <div class="illusts">
      <TopBar />
      <AuthorIllusts :id="+$route.params.id" key="multi-illust" />
    </div>
  </div>
</template>
<script>
import TopBar from "@/components/TopBar";
import AuthorIllusts from "./components/AuthorIllusts";

export default {
  name: 'AuthorIllustsFull',
  components: {
    TopBar,
    AuthorIllusts,
  },
}
</script>
<style lang="stylus" scoped>
.illust-wrap
  height: 100vh

  ::v-deep .top-bar-wrap
    width 30%
    padding-top 20px
    background transparent

.illusts
  margin-top 10px
  padding-bottom 60px

</style>
