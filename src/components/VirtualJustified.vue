<template>
  <div :style="{ height: wrapperHeight }">
    <div
      ref="content"
      class="virtual-waterfall-justi"
      :style="{ height: `${containerHeight}px` }"
    >
      <div
        v-for="data in itemRenderList"
        :key="data.item[rowKey] || data.index"
        :data-index="data.index"
        :style="{
          position: 'absolute',
          contentVisibility: 'auto',
          width: `${data.width}px`,
          height: `${data.height}px`,
          transform: `translate(${data.left}px, ${data.top}px)`,
          containIntrinsicSize: `${data.width}px ${data.height}px`,
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
import { computed, onMounted, onBeforeUnmount, ref, shallowRef, watchEffect } from 'vue'
import { useElementBounding, useElementSize } from '@vueuse/core'
import justifiedLayout from './justified-layout'

const props = defineProps({
  virtual: { type: Boolean, default: true },
  rowKey: { type: String, default: 'id' },
  wrapperHeight: { type: String, default: '100vh' },
  preloadScreenCount: { type: Array, default: () => [0, 0] },
  items: { type: Array, default: () => [] },
  onLoadMore: { type: Function, default: () => {} },
})

const content = ref()
const containerHeight = ref(0)

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
  // https://github.com/lhlyu/vue-virtual-waterfall-justi/issues/5
  if (contentWidth.value === 0) {
    contentWidth.value = Number.parseInt(window.getComputedStyle(content.value).width)
  }
  setObserver()
})

onBeforeUnmount(() => {
  observer.value?.disconnect()
})

// 每个item占据的空间
const itemSpaces = shallowRef([])

watchEffect(() => {
  const length = props.items.length
  if (!content.value || !contentWidth.value || !length) {
    itemSpaces.value = []
    return
  }
  const aspectRatios = new Array(length)
  for (let i = 0; i < length; i++) {
    const item = props.items[i]
    aspectRatios[i] = item.width / item.height
  }
  const geometry = justifiedLayout(aspectRatios, { containerWidth: contentWidth.value })
  containerHeight.value = geometry.containerHeight
  const spaces = new Array(length)
  for (let i = 0; i < length; i++) {
    const box = geometry.boxes[i]
    spaces[i] = {
      index: i,
      item: props.items[i],
      width: box.width,
      height: box.height,
      top: box.top,
      left: box.left,
      bottom: box.top + box.height,
    }
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
.virtual-waterfall-justi {
  position: relative;
  will-change: height;
}
.virtual-waterfall-justi .image-card {
  width: 100%;
  height: 100%;
  margin-bottom: 0 !important;
}
.virtual-waterfall-justi .image-card-wrapper {
  width: 100%;
  height: 100%;
  padding-bottom: 0 !important;
}
</style>
