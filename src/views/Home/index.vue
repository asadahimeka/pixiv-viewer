<template>
  <div class="home">
    <RankCard />
    <SpotlightCard />
    <RecommendCard v-if="isSelfHibi" />
    <DiscoveryCard v-if="isSelfHibi" />
    <lazy-component>
      <RandomIllust />
    </lazy-component>
    <!-- <lazy-component v-if="isSelfHibi">
      <LatestIllustCard />
    </lazy-component> -->
  </div>
</template>

<script>
import RankCard from "./components/RankCard.vue";
import SpotlightCard from "../Spotlights/SpotlightCard.vue";
import RecommendCard from "../Discovery/RecommendCard.vue";
import DiscoveryCard from "../Discovery/DiscoveryCard.vue";
import RandomIllust from "./components/RandomIllust.vue";
// import LatestIllustCard from "../Discovery/LatestIllustCard.vue";
import { notSelfHibiApi } from "@/api/http";

export default {
  name: "Home",
  data() {
    return {
      scrollTop: 0,
      isSelfHibi: !notSelfHibiApi
    };
  },
  components: {
    RankCard,
    DiscoveryCard,
    RandomIllust,
    RecommendCard,
    SpotlightCard,
    // LatestIllustCard
  }
};
</script>

<style lang="stylus" scoped>
.home
  padding-bottom 100px

  ::v-deep .image-slide
    background #f9ba48

  ::v-deep .image-slide:not(:has(.d-loading))
    background none

  ::v-deep .svg-icon
    margin-right 10px
    vertical-align -0.15rem

  ::v-deep .discovery-icon
    font-size: 0.8rem
    vertical-align: -0.2rem

</style>
