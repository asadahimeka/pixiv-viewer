<template>
  <div class="home">
    <RankCard></RankCard>
    <Daily></Daily>
  </div>
</template>

<script>
import RankCard from "./components/RankCard";
import Daily from "./components/Daily";

export default {
  name: "Home",
  data() {
    return {
      scrollTop: 0
    };
  },
  // beforeRouteEnter(to, from, next) {
  //   next(vm => {
  //     document.querySelector('.app-main')?.scrollTo(0, vm.scrollTop);
  //   });
  // },
  // beforeRouteLeave(to, from, next) {
  //   this.scrollTop = document.querySelector('.app-main')?.scrollTop || 0;
  //   next();
  // },
  components: {
    RankCard,
    Daily
  },
};
</script>

<style lang="stylus" scoped>
.home
  padding-bottom 100px
</style>
