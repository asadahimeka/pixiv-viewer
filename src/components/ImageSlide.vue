<template>
  <div class="image-slide">
    <div class="slide">
      <img
        v-for="(image,index) in images"
        :key="index"
        v-lazy="image.src"
        class="image"
        :alt="image.title"
        :class="{censored: isCensored(image)}"
      >
    </div>
    <slot></slot>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'

export default {
  props: {
    images: {
      type: Array,
      required: false,
    },
  },
  data() {
    return {}
  },
  computed: {
    ...mapGetters(['isCensored']),
  },
}
</script>

<style lang="stylus" scoped>
.image-slide {
  position: relative;
  height: 100%;
  overflow: hidden;

  .slide {
    display: flex;
    height: 100%;
    width: 110%;
    margin-left: -8%;

    .image {
      position relative
      width: 26%;
      object-fit: cover;
      clip-path: polygon(25% 0, 100% 0, 75% 100%, 0% 100%);
      margin-right: -6%;

      &[lazy="loading"] {
        opacity 0
      }
    }
  }
}
</style>
