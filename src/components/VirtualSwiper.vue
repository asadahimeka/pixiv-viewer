<template>
  <div ref="swiper" class="swiper-container my-virtual-swiper" :style="{ height }">
    <div class="swiper-wrapper">
      <div
        v-for="(slide, index) in virtualData.slides"
        :key="slide.id"
        class="swiper-slide"
        :style="{ [positionProp]: `${virtualData.offset}px`, '--bg': getBg(slide) }"
      >
        <slot :slide="slide" :index="virtualData.from + index"></slot>
      </div>
    </div>
    <div v-if="direction == 'horizontal'" class="swiper-button-prev"></div>
    <div v-if="direction == 'horizontal'" class="swiper-button-next"></div>
  </div>
</template>

<script>
import Swiper from 'swiper/js/swiper.esm.bundle'
import _ from '@/lib/lodash'
import store from '@/store'

const getDirection = () => document.documentElement.clientWidth > 800 ? 'horizontal' : 'vertical'
const { imgReso } = store.state.appSetting
const isLargeWebp = imgReso == 'Large(WebP)'

export default {
  name: 'VirtualSwiper',
  props: {
    height: { type: String, default: '100vh' },
    slides: { type: Array, default: () => [] },
    onReachEnd: { type: Function, default: () => {} },
  },
  data() {
    return {
      swiper: null,
      virtualData: { slides: [] },
      direction: getDirection(),
    }
  },
  computed: {
    positionProp() {
      return this.direction == 'horizontal' ? 'left' : 'top'
    },
  },
  watch: {
    slides(newVal, oldVal) {
      if (!newVal?.length) {
        this.swiper?.virtual.removeAllSlides()
        return
      }
      const oldIds = (oldVal || []).map(e => e.id)
      const newList = (newVal || []).filter(e => !oldIds.includes(e.id))
      if (!newList.length) return
      this.swiper?.virtual.appendSlide(_.cloneDeep(newList))
    },
  },
  mounted() {
    this.initSwiper()
  },
  beforeDestroy() {
    this.$nextTick(() => {
      this.swiper?.destroy()
    })
  },
  methods: {
    initSwiper() {
      const options = {
        direction: this.direction,
        spaceBetween: 1,
        roundLengths: true,
        virtual: {
          slides: this.slides,
          renderExternal: data => {
            console.log('data: ', data)
            this.virtualData = data
          },
        },
        on: {
          resize: () => {
            this.direction = getDirection()
            this.$nextTick(() => {
              this.swiper?.changeDirection(this.direction)
              this.swiper?.update(true)
            })
          },
          reachEnd: () => {
            console.log('reachEnd')
            if (this.slides.length) {
              this.onReachEnd()
            }
          },
        },
      }
      if (this.direction == 'horizontal') {
        Object.assign(options, {
          keyboard: true,
          mousewheel: true,
          navigation: {
            nextEl: '.my-virtual-swiper .swiper-button-next',
            prevEl: '.my-virtual-swiper .swiper-button-prev',
          },
        })
      }
      this.swiper = new Swiper(this.$refs.swiper, options)
    },
    getBg(art) {
      const i0 = art?.images?.[0]
      const src = isLargeWebp ? i0?.l?.replace(/\/c\/\d+x\d+(_\d+)?\//g, '/c/1200x1200_90_webp/') : i0?.m
      return src ? `url(${src}) 0` : 'none'
    },
  },
}
</script>

<style>
.my-virtual-swiper .swiper-slide {
  background: var(--bg);
}
.my-virtual-swiper .image-card,
.my-virtual-swiper .image-card-wrapper,
.my-virtual-swiper .image-card .image {
  border-radius: 0;
}
.my-virtual-swiper .image-card {
  width: 100%;
  height: 100%;
  margin-bottom: 0 !important;
  backdrop-filter: saturate(200%) blur(20PX);
  background: rgba(255, 255, 255, 0.5);
}
.my-virtual-swiper .image-card-wrapper {
  width: 100%;
  height: 100%;
  padding-bottom: 0 !important;
}
.my-virtual-swiper.swiper-container-vertical .image-card .image {
  height: auto;
  top: 50%;
  transform: translateY(-50%) !important;
}
.my-virtual-swiper.swiper-container-horizontal .image-card .image {
  width: auto;
  left: 50%;
  transform: translateX(-50%) !important;
}
.my-virtual-swiper .swiper-button-prev,
.my-virtual-swiper .swiper-button-next {
  top: 50%;
  transform: translateY(-50%);
  height: 2rem;
  background: none;
}
.my-virtual-swiper .image-card-wrapper .meta .content {
  padding: 0.24rem;
}
</style>
