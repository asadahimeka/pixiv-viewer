<template>
  <div class="top-bar-wrap">
    <van-nav-bar class="top-bar" left-arrow :border="false" @click-left="back">
      <template #left>
        <Icon name="left-arrow" scale="2.6"></Icon>
      </template>
    </van-nav-bar>
  </div>
</template>

<script>
import { NavBar } from "vant";
export default {
  props: {
    action: {
      type: Function
    }
  },
  methods: {
    back() {
      if (this.action) {
        this.action();
        return;
      }

      if (history.length <= 2) {
        this.$router.push({ name: "Home" });
      } else {
        this.$router.back();
      }
    }
  },
  components: {
    [NavBar.name]: NavBar
  }
};
</script>

<style lang="stylus" scoped>
.top-bar-wrap {
  position: fixed;
  top: 0;
  padding-top: 60px;
  width: 30%;
  // max-width: 10rem;
  height: 160px;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.3), rgba(#fff, 0));
  z-index: 99;
}

.top-bar {
  background: rgba(#000, 0);

  svg {
    font-size: 22px;
    color: #fafafa;
    filter: drop-shadow(2px 4px 4px rgba(#000, 0.8));
  }
}
</style>
