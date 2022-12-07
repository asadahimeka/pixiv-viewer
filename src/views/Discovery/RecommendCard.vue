<template>
  <div class="rec-cards">
    <RecommendIllustCard />
    <RecommendUserCard />
  </div>
</template>

<script>
import RecommendIllustCard from './RecommendIllustCard.vue';
import RecommendUserCard from './RecommendUserCard.vue';

export default {
  name: "RecommendCard",
  data() {
    return {};
  },
  components: {
    RecommendUserCard,
    RecommendIllustCard,
  }
};
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
