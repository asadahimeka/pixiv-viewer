<template>
  <div class="top-bar-wrap">
    <van-nav-bar class="top-bar" left-arrow :border="false" @click-left="back">
      <template #left>
        <Icon name="left-arrow" />
      </template>
    </van-nav-bar>
  </div>
</template>

<script>
export default {
  components: {
  },
  props: {
    action: {
      type: Function,
    },
  },
  methods: {
    back() {
      if (this.action) {
        this.action()
        return
      }

      if (history.length <= 2) {
        this.$router.push({ name: 'Home' })
      } else {
        this.$router.back()
      }
    },
  },
}
</script>

<style lang="stylus" scoped>
.top-bar-wrap {
  position: fixed;
  top: 0;
  left 0;
  padding-top: 60px;
  width: 1.6rem;
  height: 1.2rem;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.3), rgba(#fff, 0));
  z-index: 999;
}

.top-bar {
  background: rgba(#000, 0);

  svg {
    font-size: 0.675rem;
    color: #fafafa;
    filter: drop-shadow(2px 4px 4px rgba(#000, 0.8));
  }
}
</style>
