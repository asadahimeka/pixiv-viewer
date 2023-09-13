<template>
  <div class="user-illusts">
    <div class="illusts">
      <TopBar />
      <FavoriteNovels :id="+$route.params.id" key="multi-favorite" :not-from-artwork="notFromArtwork" />
    </div>
  </div>
</template>
<script>
import TopBar from '@/components/TopBar'
import FavoriteNovels from './components/FavoriteNovels.vue'
export default {
  name: 'FavoriteNovelsFull',
  components: {
    TopBar,
    FavoriteNovels,
  },
  beforeRouteEnter(to, from, next) {
    next(vm => {
      vm.notFromArtwork = from.name != 'Artwork'
    })
  },
  data() {
    return {
      notFromArtwork: true,
    }
  },
  head() {
    return this.$t('user.fav_novel_title')
  },
}
</script>
<style lang="stylus" scoped>
.user-illusts
  height: 100vh

  ::v-deep .top-bar-wrap
    width 30%
    padding-top 20px
    background transparent

.illusts
  margin-top 10px
  padding-bottom 60px

</style>
