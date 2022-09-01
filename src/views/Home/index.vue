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
  beforeRouteEnter(to, from, next) {
    next(vm => {
      window._appMainEl && window._appMainEl.scrollTo(0, vm.scrollTop);
    });
  },
  beforeRouteLeave(to, from, next) {
    this.scrollTop = window._appMainEl ? window._appMainEl.scrollTop : 0;
    next();
  },
  components: {
    RankCard,
    Daily
  },
  mounted () {
    window._appMainEl = document.querySelector(".app-main")
  }
};
</script>

<style lang="stylus" scoped>
.home
  padding-bottom 100px
</style>
