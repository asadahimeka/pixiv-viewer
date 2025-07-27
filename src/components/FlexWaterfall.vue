<template>
  <div
    ref="container"
    :style="{ height: validContainerHeight, 'align-content': alignContent }"
    style="display: flex; flex-flow: column wrap"
  >
    <slot></slot>
    <div
      v-for="i in validCol - 1"
      :key="`split-${i}`"
      vue-flex-waterfall-split
      :style="{ order: i, width: validColSpacing }"
      style="flex-basis: 100%"
    ></div>
  </div>
</template>

<script>
// ref: https://github.com/Tsuk1ko/vue-flex-waterfall
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import _ from '@/lib/lodash'

export default {
  name: 'FlexWaterfall',
  props: {
    height: {
      type: [Number, String],
      default: null,
    },
    alignContent: {
      type: String,
      default: null,
    },
    col: {
      type: [Number, String],
      default: 1,
    },
    colSpacing: {
      type: [Number, String],
      default: 0,
    },
    breakAt: {
      type: Object,
      default: () => ({}),
    },
    breakByContainer: {
      type: Boolean,
      default: false,
    },
  },
  setup(props, { emit }) {
    const containerHeight = ref(0)
    const winWidth = ref(0)
    const container = ref()
    let observer

    const validSortedBreakAt = computed(() => {
      const valid = []
      Object.entries(props.breakAt).forEach(([k, v]) => {
        const ikv = [Number(k) || 0, Number(v) || 0]
        if (Math.min(...ikv) > 0) valid.push(ikv)
      })
      valid.length ? addResizeListener() : removeResizeListener()
      return valid.sort(([w1], [w2]) => w1 - w2)
    })
    const validCol = computed(() => {
      const intCol = Number(props.col)
      const col = !intCol || intCol < 1 ? 1 : intCol
      const breakPoint = validSortedBreakAt.value.find(([w]) => winWidth.value && winWidth.value <= w)
      return Math.floor(breakPoint ? breakPoint[1] : col)
    })
    const validColSpacing = computed(() => validLength(props.colSpacing))
    const validContainerHeight = computed(
      () => validLength(props.height) || (containerHeight.value > 0 ? `${containerHeight.value}px` : '')
    )

    const throttleUpdateWidth = _.throttle(updateWidth, 100)

    watch(validSortedBreakAt, () => updateOrder(), { deep: true })

    onMounted(() => {
      observer = new MutationObserver(() => updateOrder())
      if (validSortedBreakAt.value.length) updateWidth()
      updateOrder(false)
      watch(validCol, () => updateOrder())
    })

    onBeforeUnmount(() => {
      stopObserve()
      removeResizeListener()
    })

    function validLength(val) {
      if (!val) return 0
      return Number(val) ? `${val}px` : val
    }

    function getItems() {
      if (!container.value) return []
      return Array.from(container.value.children)
        .filter(el => el.getAttribute('vue-flex-waterfall-split') === null)
        .map(el => {
          const { marginTop, marginBottom } = window.getComputedStyle(el)
          const ph = el.getBoundingClientRect().height + parseFloat(marginTop) + parseFloat(marginBottom)
          return { el, ph }
        })
    }

    async function updateOrder(emitEvent = true) {
      stopObserve()
      containerHeight.value = 0
      let orderChanged = false
      const colsHeight = Array(validCol.value).fill(0)
      const items = getItems() || []
      items.forEach(({ el, ph }) => {
        const minI = colsHeight.indexOf(Math.min(...colsHeight))
        const oldOrder = el.style.order
        const newOrder = String(minI + 1)
        if (oldOrder != newOrder) {
          el.style.order = newOrder
          orderChanged = true
        }
        colsHeight[minI] += ph
      })
      containerHeight.value = Math.max(...colsHeight)
      await nextTick()
      startObserve()
      if (emitEvent && orderChanged) emit('orderUpdated')
    }

    function updateWidth() {
      winWidth.value = props.breakByContainer ? container.value.clientWidth : window.innerWidth
    }

    function startObserve() {
      observer?.observe(container.value, { attributes: true, childList: true, subtree: true })
    }

    function stopObserve() {
      observer?.disconnect()
    }

    function addResizeListener() {
      window.addEventListener('resize', throttleUpdateWidth)
    }

    function removeResizeListener() {
      window.removeEventListener('resize', throttleUpdateWidth)
    }

    return {
      container,
      validContainerHeight,
      validCol,
      validColSpacing,
      updateOrder,
    }
  },
}
</script>
