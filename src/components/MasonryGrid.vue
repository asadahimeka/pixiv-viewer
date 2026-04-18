<template>
  <div :style="containerStyle">
    <div
      v-for="(item, index) in itemsWithSpan"
      :key="item[itemKey]"
      :style="{ gridRowEnd: `span ${item.span}` }"
    >
      <slot :item="item" :index="index"></slot>
    </div>
  </div>
</template>

<script>
const setBreakpoints = (mixed, containerWidth) => {
  const valueAsNum = parseInt(mixed)
  const zero = 0

  if (!isNaN(valueAsNum) && valueAsNum > 0) {
    return valueAsNum
  }

  if (typeof mixed !== 'object' || mixed === null) {
    return zero
  }

  let matchedBreakpoint = Infinity
  let initValue = mixed.default || zero

  for (const key in mixed) {
    const breakpoint = parseInt(key)
    const breakpointValRaw = mixed[breakpoint]
    const breakpointVal = parseInt(breakpointValRaw)

    if (isNaN(breakpoint) || isNaN(breakpointVal)) {
      continue
    }

    const isNewBreakpoint =
      containerWidth <= breakpoint && breakpoint < matchedBreakpoint

    if (isNewBreakpoint) {
      matchedBreakpoint = breakpoint
      initValue = breakpointValRaw
    }
  }

  return initValue
}

const getWindowWidth = () => {
  return window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth
}

export default {
  name: 'MasonryGrid',
  props: {
    items: {
      type: Array,
      default: () => [],
    },
    itemKey: {
      type: String,
      default: 'id',
    },
    cols: {
      type: [Object, Number, String],
      default: 2,
    },
    gap: {
      type: [Object, Number, String],
      default: 0,
    },
  },
  data() {
    return {
      containerWidth: 0,
      viewportWidth: getWindowWidth(),
    }
  },
  computed: {
    displayColumns() {
      return setBreakpoints(this.cols, this.viewportWidth)
    },
    displayGap() {
      return setBreakpoints(this.gap, this.viewportWidth)
    },
    containerStyle() {
      return {
        display: 'grid',
        gridTemplateColumns: `repeat(${this.displayColumns}, 1fr)`,
        gridAutoRows: '1px',
        gridGap: `${this.displayGap}px`,
        width: '100%',
      }
    },
    itemsWithSpan() {
      const { items, displayGap, displayColumns, containerWidth, viewportWidth } = this
      if (!items.length) return []

      const effectiveWidth = containerWidth || viewportWidth
      if (!effectiveWidth) return []

      const totalGap = displayGap * (displayColumns - 1)
      const availableWidth = effectiveWidth - totalGap

      if (availableWidth <= 0) return []

      const actualColumnWidth = availableWidth / displayColumns

      return items.map(item => {
        const width = item.width || 1
        const height = item.height || 1

        let ratio = height / width
        if (ratio < 0.5) ratio = 0.5
        if (ratio > 1.6) ratio = 1.6
        const itemHeight = ratio * actualColumnWidth
        const span = Math.ceil((itemHeight + displayGap) / (1 + displayGap))

        return {
          ...item,
          span: Math.max(1, span),
        }
      })
    },
  },
  mounted() {
    this.$nextTick(() => {
      this._setupResizeListener()
      if (this.$el) {
        this.containerWidth = this.$el.offsetWidth
      }
    })
  },
  beforeDestroy() {
    this._cleanupResizeListener()
  },
  methods: {
    _setupResizeListener() {
      window.addEventListener('resize', this._handleResize)
    },
    _cleanupResizeListener() {
      window.removeEventListener('resize', this._handleResize)
      if (this._resizeTimer) {
        clearTimeout(this._resizeTimer)
        this._resizeTimer = null
      }
    },
    _handleResize() {
      const viewportWidth = getWindowWidth()
      if (this._resizeTimer) {
        clearTimeout(this._resizeTimer)
      }
      this._resizeTimer = setTimeout(() => {
        this.viewportWidth = viewportWidth
        this.containerWidth = this.$el.offsetWidth || 0
      }, 100)
    },
  },
}
</script>
