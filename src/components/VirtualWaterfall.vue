<template>
  <div :style="{ height: wrapperHeight }">
    <div
      ref="content"
      class="virtual-waterfall"
      :style="{ height: `${Math.max(...columnsTop)}px` }"
    >
      <div
        v-for="data in itemRenderList"
        :key="data.item[rowKey] || data.index"
        :data-index="data.index"
        :style="{
          position: 'absolute',
          contentVisibility: 'auto',
          width: `${itemWidth}px`,
          height: `${data.height}px`,
          transform: `translate(${data.left}px, ${data.top}px)`,
          containIntrinsicSize: `${itemWidth}px ${data.height}px`,
        }"
      >
        <slot :item="data.item" :index="data.index"></slot>
      </div>
    </div>
    <slot name="tips"></slot>
    <div ref="indicator"></div>
  </div>
</template>

<script setup>
// https://github.com/lhlyu/vue-virtual-waterfall

import { computed, onMounted, onBeforeUnmount, readonly, ref, shallowRef, watchEffect } from 'vue'
import { useElementBounding, useElementSize } from '@vueuse/core'

const props = defineProps({
  virtual: { type: Boolean, default: true },
  rowKey: { type: String, default: 'id' },
  wrapperHeight: { type: String, default: '100vh' },
  gap: { type: Number, default: 15 },
  preloadScreenCount: { type: Array, default: () => [0, 0] },
  itemMinWidth: { type: Number, default: 200 },
  maxColumnCount: { type: Number, default: 10 },
  minColumnCount: { type: Number, default: 2 },
  items: { type: Array, default: () => [] },
  calcItemHeight: { type: Function, default: () => 250 },
  onLoadMore: { type: Function, default: () => {} },
})

const content = ref()

const { width: contentWidth } = useElementSize(content)
const { top: contentTop } = useElementBounding(content)

const indicator = ref()
const observer = ref()
const setObserver = () => {
  observer.value = new IntersectionObserver(entries => {
    console.log('entries: ', entries)
    if (entries[0].isIntersecting && props.items.length) {
      props.onLoadMore()
    }
  }, {
    rootMargin: '300px 0px 300px 0px',
    threshold: [0],
  })
  observer.value.observe(indicator.value)
}

onMounted(() => {
  if (!content.value) return
  // 这里是为了解决这个问题:
  // https://github.com/lhlyu/vue-virtual-waterfall/issues/5
  if (contentWidth.value === 0) {
    contentWidth.value = Number.parseInt(window.getComputedStyle(content.value).width)
  }
  setObserver()
})

onBeforeUnmount(() => {
  observer.value?.disconnect()
})

// 计算列数
const columnCount = computed(() => {
  if (!contentWidth.value) {
    return 0
  }
  const cWidth = contentWidth.value
  if (cWidth >= props.itemMinWidth * 2) {
    const count = Math.floor(cWidth / props.itemMinWidth)
    if (props.maxColumnCount && count > props.maxColumnCount) {
      return props.maxColumnCount
    }
    return count
  }
  return props.minColumnCount
})

// 每列距离顶部的距离
const columnsTop = ref(new Array(columnCount.value).fill(0))

// 计算每个item占据的宽度: (容器宽度 - 间隔) / 列数
const itemWidth = computed(() => {
  if (!contentWidth.value || columnCount.value <= 0) {
    return 0
  }
  // 列之间的间隔
  const gap = (columnCount.value - 1) * props.gap

  return Math.ceil((contentWidth.value - gap) / columnCount.value)
})

// 元素空间信息
// interface SpaceOption {
//   // 索引
//   index: number
//   // 原始数据
//   item: any
//   // 元素所属列
//   column: number
//   // 元素左上角绝对定位top位置
//   top: number
//   // 元素左上角绝对定位left位置
//   left: number
//   // 元素左下角绝对定位bottom位置
//   bottom: number
//   // 元素真实高度
//   height: number
// }

// 每个item占据的空间
const itemSpaces = shallowRef([])

// 暴露一个方法，让外部可以访问itemSpaces
const withItemSpaces = cb => {
  cb(readonly(itemSpaces).value)
}

defineExpose({
  withItemSpaces,
})

// 获取当前元素应该处于哪一列
const getColumnIndex = () => {
  return columnsTop.value.indexOf(Math.min(...columnsTop.value))
}

watchEffect(() => {
  const length = props.items.length

  if (!columnCount.value || !length) {
    itemSpaces.value = []
    return
  }

  const spaces = new Array(length)

  let start = 0
  // 是否启用缓存：只有当新增元素时，需要计算新增元素的信息
  const cache = itemSpaces.value.length && length > itemSpaces.value.length
  if (cache) {
    start = itemSpaces.value.length
  } else {
    columnsTop.value = new Array(columnCount.value).fill(0)
  }

  // 为了高性能采用for-i
  for (let i = 0; i < length; i++) {
    if (cache && i < start) {
      spaces[i] = itemSpaces.value[i]
      continue
    }

    const columnIndex = getColumnIndex()
    // 计算元素的高度
    const h = props.calcItemHeight(props.items[i], itemWidth.value)
    const top = columnsTop.value[columnIndex]
    const left = (itemWidth.value + props.gap) * columnIndex

    const space = {
      index: i,
      item: props.items[i],
      column: columnIndex,
      top,
      left,
      bottom: top + h,
      height: h,
    }

    // 累加当前列的高度
    columnsTop.value[columnIndex] += h + props.gap
    spaces[i] = space
  }
  itemSpaces.value = spaces
})

// 虚拟列表逻辑：需要渲染的items
const itemRenderList = computed(() => {
  const length = itemSpaces.value.length
  if (!length) {
    return []
  }
  if (!props.virtual) {
    return itemSpaces.value
  }

  // 父节点距离顶部的距离
  const parentTop = content.value.parentElement.offsetTop

  const tp = -contentTop.value + parentTop

  const [topPreloadScreenCount, bottomPreloadScreenCount] = props.preloadScreenCount
  // 避免多次访问
  const innerHeight = content.value.parentElement.clientHeight

  // 顶部的范围: 向上预加载preloadScreenCount个屏幕，Y轴上部
  const minLimit = tp - topPreloadScreenCount * innerHeight
  // 底部的范围: 向下预加载preloadScreenCount个屏幕
  const maxLimit = tp + (bottomPreloadScreenCount + 1) * innerHeight

  const items = []

  for (let i = 0; i < length; i++) {
    const v = itemSpaces.value[i]
    const t = v.top
    const b = v.bottom
    // 这里的逻辑是：
    // 只要元素部分出现在可视区域里就算作可见，因此有三段判断:
    // 1. 元素的上边界在容器内
    // 2. 元素的下边界在容器内
    // 3. 元素覆盖了整个容器
    if (
      (t >= minLimit && t <= maxLimit) ||
      (b >= minLimit && b <= maxLimit) ||
      (t < minLimit && b > maxLimit)
    ) {
      items.push(v)
    }
  }
  return items
})
</script>

<style>
.virtual-waterfall {
  position: relative;
  will-change: height;
}
.virtual-waterfall .image-card {
  width: 100%;
  height: 100%;
  margin-bottom: 0 !important;
}
.virtual-waterfall .image-card-wrapper {
  width: 100%;
  height: 100%;
  padding-bottom: 0 !important;
}
</style>
