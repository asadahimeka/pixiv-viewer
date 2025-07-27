<template>
  <svg
    version="1.1"
    :class="className"
    :role="label ? 'img' : 'presentation'"
    :aria-label="label"
    :viewBox="box"
    :style="style"
  >
    <path
      v-for="(path, i) in icon.paths"
      :key="i"
      :d="path.d"
      :fill="path.fill"
      :stroke="path.stroke"
      :stroke-opacity="path['stroke-opacity']"
      :stroke-width="path['stroke-width']"
      :fill-opacity="path['fill-opacity']"
    ></path>
  </svg>
</template>

<script>
import { SVGtoArray } from './lib/parse'

export default {
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
        console.warn('Invalid prop: prop "scale" should be a number over 0.', this)
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
    icon() {
      const xml = require(`./svg/${this.name}.svg`)
      const t = xml.svg.$.viewBox.split(' ')
      return {
        width: t[2],
        height: t[3],
        paths: SVGtoArray(xml.svg),
      }
    },
    box() {
      return `0 0 ${this.icon.width} ${this.icon.height}`
    },
    width() {
      return this.icon.width / 112 * this.normalizedScale
    },
    height() {
      return this.icon.height / 112 * this.normalizedScale
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
  register: function () {
    console.warn('inject deprecated since v1.2.0, SVG files can be loaded directly, so just delete the inject line.')
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

<!-- <style>
  .svg-icon {
    display: inline-block;
    fill: currentColor;
  }

  .svg-icon.flip-horizontal {
    transform: scale(-1, 1);
  }

  .svg-icon.flip-vertical {
    transform: scale(1, -1);
  }

  .svg-icon.spin {
    animation: fa-spin 1s 0s infinite linear;
  }

  @keyframes fa-spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
</style> -->
