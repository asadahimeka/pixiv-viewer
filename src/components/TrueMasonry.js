// ref: https://github.com/Vadim-evisu/true-masonry

const props = {
  tag: {
    type: [String],
    default: 'div',
  },
  cols: {
    type: [Object, Number, String],
    default: 2,
  },
  gap: {
    type: [Object, Number, String],
    default: 0,
  },
  css: {
    type: [Boolean],
    default: true,
  },
}

const setBreakpoints = (mixed, windowWidth) => {
  const valueAsNum = parseInt(mixed)
  const minVal = -1
  const zero = 0
  if (valueAsNum > -minVal) {
    return mixed
  } else if (typeof mixed !== 'object') {
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
      windowWidth <= breakpoint && breakpoint < matchedBreakpoint

    if (isNewBreakpoint) {
      matchedBreakpoint = breakpoint
      initValue = breakpointValRaw
    }
  }
  return initValue
}

const measurements = [
  'paddingLeft',
  'paddingRight',
  'paddingTop',
  'paddingBottom',
  'marginLeft',
  'marginRight',
  'marginTop',
  'marginBottom',
  'borderLeftWidth',
  'borderRightWidth',
  'borderTopWidth',
  'borderBottomWidth',
]

const measurementsLength = measurements.length

/**
 * getStyle, get style of element, check for Firefox bug
 * https://bugzilla.mozilla.org/show_bug.cgi?id=548397
 */
const getStyle = elem => {
  const style = getComputedStyle(elem)
  if (!style) {
    console.error('Style returned ' + style +
      '. Are you running this code in a hidden iframe on Firefox? ' +
      'See https://bit.ly/getsizebug1')
  }
  return style
}

const getStyleSize = value => {
  // get a number from a string, not a percentage
  const num = parseFloat(value)
  // not a percent like '100%', and a number
  const isValid = value.indexOf('%') == -1 && !isNaN(num)
  return isValid && num
}

const getWindowWidth = () => window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth

const TrueMasonry = {
  props,
  data() {
    return {
      windowWidth: getWindowWidth(),
      displayColumns: 2,
      displayGutter: 0,
      style: {},
    }
  },
  mounted() {
    this.$nextTick(() => {
      this._reCalculate('force')
    })

    // Bind resize handler to page
    window.addEventListener('resize', this._reCalculate)
  },
  activated() {
    this.$nextTick(() => {
      this._reCalculate('force')
    })
  },
  updated() {
    this.$nextTick(() => {
      this._reCalculate('force')
    })
  },
  beforeDestroy() {
    window.removeEventListener('resize', this._reCalculate)
  },
  methods: {
    getChildItemsInColumnsArray() {
      const childItems = this.$slots.default || []
      // Loop through child elements
      // skip Vue elements without tags, which includes
      // whitespace elements and also plain text

      return childItems.filter(cell => cell.tag)
    },
    _getSize(elemm) {
      const style = getStyle(elemm)
      const size = {}
      size.height = elemm.offsetHeight

      const isBorderBox = size.isBorderBox = style.boxSizing == 'border-box'

      // get all measurements
      for (let i = 0; i < measurementsLength; i++) {
        const measurement = measurements[i]
        const value = style[measurement]
        const num = parseFloat(value)
        // any 'auto', 'medium' value will be 0
        size[measurement] = !isNaN(num) ? num : 0
      }

      const paddingHeight = size.paddingTop + size.paddingBottom
      const marginHeight = size.marginTop + size.marginBottom
      const borderHeight = size.borderTopWidth + size.borderBottomWidth

      const isBorderBoxSizeOuter = isBorderBox

      const styleHeight = getStyleSize(style.height)
      const zero = 0
      if (styleHeight !== false) {
        size.height = styleHeight +
          // add padding and border unless it's already including it
          (isBorderBoxSizeOuter ? zero : paddingHeight + borderHeight)
      }
      size.innerHeight = size.height - (paddingHeight + borderHeight)
      size.outerHeight = size.height + marginHeight
      return size
    },
    _resizeMasonryItem(item) {
      const rowGap = this.displayGutter
      const rowHeight = 0
      // const child = item.children[0].elm

      const size = Math.round(this._getSize(item.elm).outerHeight)
      const rowSpan = Math.ceil((size + rowGap) / (rowHeight + rowGap))
      item.elm.style.gridRowEnd = `span ${rowSpan}`
    },
    _resizeAllMasonryItems() {
      const allItems = this.getChildItemsInColumnsArray()
      for (let i = 0; i < allItems.length; i++) {
        this._resizeMasonryItem(allItems[i])
      }
    },
    _reCalculate(force) {
      if (force == 'force') {
        this._buildGrid()
        return
      }
      const previousWindowWidth = this.windowWidth
      this.windowWidth = getWindowWidth() || Infinity
      if (previousWindowWidth !== this.windowWidth) {
        this._buildGrid()
      }
    },
    _buildGrid() {
      this._reCalculateColumnCount(this.windowWidth)
      this._reCalculateGutterSize(this.windowWidth)
      this._resizeAllMasonryItems()
    },
    _reCalculateColumnCount(windowWidth) {
      const zero = 0
      const one = 1
      let newCols = setBreakpoints(this.cols, windowWidth)
      newCols = Math.max(one, Number(newCols) || zero)
      this.displayColumns = newCols
    },
    _reCalculateGutterSize(windowWidth) {
      this.displayGutter = setBreakpoints(this.gap, windowWidth)
    },
  },
  render(h) {
    const one = 1
    const ten = 10
    const hundred = 100
    const isGutterSizeUnitless = parseInt(this.displayGutter) === this.displayGutter * one
    const gutterSizeWithUnit = isGutterSizeUnitless ? (`${this.displayGutter}px`) : this.displayGutter
    let columnWidth = ((hundred / this.displayColumns * ten) - this.displayGutter) / ten
    if (columnWidth > 48) columnWidth -= 1
    const containerStyle = {
      display: 'grid',
      gridTemplateColumns: `repeat(auto-fill, minmax(${columnWidth}%, 1fr))`,
      gridAutoRows: 0,
      gridGap: gutterSizeWithUnit,
    }
    return h(
      this.tag,
      this.css ? { style: containerStyle } : null,
      this.$slots.default
    )
  },
}

export default TrueMasonry
