<template>
  <div class="user-illusts">
    <div class="illusts">
      <TopBar />
      <AuthorIllusts :id="+$route.params.id" key="multi-illust" :i-type="$route.query.type" :not-from-artwork="notFromArtwork" />
    </div>
  </div>
</template>
<script>
import TopBar from '@/components/TopBar'
import AuthorIllusts from './components/AuthorIllusts'

export default {
  name: 'AuthorIllustsFull',
  components: {
    TopBar,
    AuthorIllusts,
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
    return { title: this.$t('common.artwork') }
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
