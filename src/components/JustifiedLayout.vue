<template>
  <div ref="layoutRef" class="JustifiedLayout" :style="containerStyle">
    <slot></slot>
  </div>
</template>

<script>
import justifiedLayout from './justified-layout'

export default {
  name: 'JustifiedLayout',
  data() {
    return {
      containerHeight: 0,
    }
  },
  computed: {
    containerStyle() {
      return {
        height: `${this.containerHeight}px`,
      }
    },
  },
  mounted() {
    this.$nextTick(() => {
      this.calculate()
    })

    window.addEventListener('resize', this.calculate)
  },
  activated() {
    this.$nextTick(() => {
      this.calculate()
    })
  },
  updated() {
    this.$nextTick(() => {
      this.calculate()
    })
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.calculate)
  },
  methods: {
    calculate() {
      console.log('--------------------------justifiedLayout calculate')
      const containerWidth = this.$refs.layoutRef?.clientWidth
      const items = this.getChildren()
      const list = items.map(e => {
        const s = e.elm.style
        const w = +s.getPropertyValue('--w').trim()
        const h = +s.getPropertyValue('--h').trim()
        return w / h
      })
      const geometry = this.getGeometry(list, containerWidth)
      this.containerHeight = geometry.containerHeight
      const boxes = geometry.boxes
      for (let i = 0; i < items.length; i++) {
        const b = boxes[i]
        items[i].elm.style.width = `${b.width}px`
        items[i].elm.style.height = `${b.height}px`
        items[i].elm.style.transform = `translate(${b.left}px, ${b.top}px)`
      }
    },
    getChildren() {
      const childItems = this.$slots.default || []
      return childItems.filter(cell => cell.tag)
    },
    getGeometry(list, containerWidth) {
      if (!list?.length) return []
      return justifiedLayout(list, {
        // The width that boxes will be contained within irrelevant of padding.
        containerWidth,
        // Provide a single integer to apply padding to all sides or provide an object to apply individual values to each side.
        // containerPadding: 10,
        // Provide a single integer to apply spacing both horizontally and vertically or provide an object to apply individual values to each axis.
        // boxSpacing: 10,
        // It's called a target because row height is the lever we use in order to fit everything in nicely. The algorithm will get as close to the target row height as it can.
        // targetRowHeight: 320,
        // How far row heights can stray from targetRowHeight. 0 would force rows to be the targetRowHeight exactly and would likely make it impossible to justify. The value must be between 0 and 1.
        // targetRowHeightTolerance: 0.25,
        // Will stop adding rows at this number regardless of how many items still need to be laid out.
        // maxNumRows: Number.POSITIVE_INFINITY,
        // Sets the minimum height for each row in a layout, based on the targetRowHeight
        // edgeCaseMinRowHeight: 0.5,
        // Sets the maximum height for each row in a layout, based on the targetRowHeight
        // edgeCaseMaxRowHeight: 2.5,
        // Provide an aspect ratio here to return everything in that aspect ratio. Makes the values in your input array irrelevant. The length of the array remains relevant.
        // forceAspectRatio: true,
        // By default we'll return items at the end of a justified layout even if they don't make a full row. If false they'll be omitted from the output.
        // showWidows: true,
        // If you'd like to insert a full width box every n rows you can specify it with this parameter. The box on that row will ignore the targetRowHeight, make itself as wide as containerWidth - containerPadding and be as tall as its aspect ratio defines. It'll only happen if that item has an aspect ratio >= 1. Best to have a look at the examples to see what this does.
        // fullWidthBreakoutRowCadence: false,
      })
    },
  },
}
</script>

<style lang="stylus" scoped>
.JustifiedLayout
  position: relative
  width 100%
  max-width 100%
  transition: 0.2s
  will-change height
  overflow hidden
</style>
