<template>
  <svg :class="className" :role="label ? 'img' : 'presentation'" :aria-label="label" aria-hidden="true" :style="style">
    <use :xlink:href="`#icon-${name}`"></use>
  </svg>
</template>

<script>
export default {
  name: 'Icon',
  props: {
    name: {
      type: String,
      required: true,
    },
    scale: [Number, String],
    spin: Boolean,
    flip: {
      validator: function (val) {
        return val === 'horizontal' || val === 'vertical'
      },
    },
    label: String,
    index: String,
    currentIndex: String,
  },
  computed: {
    normalizedScale() {
      let scale = this.scale
      scale = typeof scale === 'undefined' ? 1 : Number(scale)
      if (isNaN(scale) || scale <= 0) {
        console.log('Invalid prop: prop "scale" should be a number over 0.', this)
        return 1
      }
      return scale
    },
    className() {
      return {
        'svg-icon': true,
        'spin': this.spin,
        'flip-horizontal': this.flip === 'horizontal',
        'flip-vertical': this.flip === 'vertical',
        'active': this.index === this.currentIndex,
      }
    },
    style() {
      if (this.normalizedScale === 1) {
        return false
      }
      return {
        fontSize: this.normalizedScale + 'em',
      }
    },
  },
}
</script>

<style lang="stylus">
.svg-icon
  display: inline-block
  width: 1em
  height: 1em
  vertical-align: -0.15em
  fill: currentColor
  overflow: hidden
  &.flip-horizontal
    transform: scale(-1, 1)
  &.flip-vertical
    transform: scale(1, -1)
  &.spin
    animation: fa-spin 1s 0s infinite linear
@keyframes fa-spin
  0%
    transform: rotate(0deg)
  100%
    transform: rotate(360deg)
</style>
