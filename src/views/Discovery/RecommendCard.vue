<template>
  <div class="rec-cards">
    <RecommendIllustCard />
    <DiscoveryCard />
  </div>
</template>

<script>
import DiscoveryCard from './DiscoveryCard.vue'
import RecommendIllustCard from './RecommendIllustCard.vue'

export default {
  name: 'RecommendCard',
  components: {
    RecommendIllustCard,
    DiscoveryCard,
  },
  data() {
    return {}
  },
}
</script>

<style lang="stylus" scoped>
.rec-cards
  display flex

  .rank-card
    flex 1
    width 44vw

@media screen and (max-width: 700px)
  .rec-cards
    display block

    .rank-card
      width auto

</style>
