<template>
  <div class="illust-wrap">
    <div class="illust">
      <TopBar />
      <AuthorIllusts v-if="$route.name == 'AuthorIllusts'" :id="+$route.params.id" key="multi-illust" />
      <FavoriteIllusts v-else :id="+$route.params.id" key="multi-favorite" />
    </div>
  </div>
</template>
<script>
import TopBar from "@/components/TopBar";
import AuthorIllusts from "./components/AuthorIllusts";
import FavoriteIllusts from "./components/FavoriteIllusts";
export default {
  name: 'AuthorIllustsFull',
  components: {
    TopBar,
    AuthorIllusts,
    FavoriteIllusts
  },
  beforeRouteEnter(to, from, next) {
    document.querySelector('.app-main')?.scrollTo(0, 0)
    next()
  },
}
</script>
<style scoped>
.illust-wrap {
  height: 100vh;
}

.illusts {
  margin: 10px 0 20px 0;
}
</style>
