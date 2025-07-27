<template>
  <div class="image-layout" :class="wfClass">
    <template v-if="isMasonry">
      <true-masonry
        v-if="wfType == 'Masonry(CSSGrid)'"
        class="true-masonry"
        :gap="{default:10}"
        :cols="masonryProps.cols"
      >
        <slot></slot>
      </true-masonry>
      <flex-waterfall
        v-else-if="wfType == 'Masonry(FlexOrder)'"
        class="flex-waterfall"
        align-content="center"
        col="5"
        col-spacing="0.13333rem"
        :break-at="masonryProps.cols"
        :break-by-container="false"
      >
        <slot></slot>
      </flex-waterfall>
      <masonry v-else v-bind="masonryProps">
        <slot></slot>
      </masonry>
    </template>
    <JustifiedLayout v-else-if="wfType == 'Justified(Transform)'">
      <slot></slot>
    </JustifiedLayout>
    <div v-else class="justified-container">
      <slot></slot>
    </div>
  </div>
</template>

<script>
import store from '@/store'
import FlexWaterfall from './FlexWaterfall.vue'
import TrueMasonry from './TrueMasonry'
import JustifiedLayout from './JustifiedLayout.vue'

const { wfType, isImageFitScreen } = store.state.appSetting
const masonryProps = {
  gutter: '10px',
  cols: isImageFitScreen
    ? {
        300: 1,
        600: 2,
        900: 3,
        1200: 4,
        1600: 5,
        1920: 6,
        2400: 7,
        2700: 8,
        3000: 9,
        default: 6,
      }
    : {
        300: 1,
        600: 2,
        1200: 3,
        default: 4,
      },
}

export default {
  components: {
    FlexWaterfall,
    TrueMasonry,
    JustifiedLayout,
  },
  props: {
    layout: {
      type: String,
      required: false,
    },
  },
  data() {
    return {
      wfType,
      masonryProps,
    }
  },
  computed: {
    isMasonry() {
      if (this.wfType.includes('Masonry')) return true
      if (['Masonry', 'Grid'].includes(this.layout)) return true
      if (this.layout == 'Justified') return false
      return ['Masonry', 'Grid'].includes(this.wfType)
    },
    wfClass() {
      return {
        'wf-grid': this.layout == 'Grid' || this.wfType == 'Grid',
      }
    },
  },
}
</script>

<style>
.image-layout > div {
  contain: layout paint;
}

.flex-waterfall .image-card {
  width: 4.5rem;
}

.justified-grid .image-card,
.JustifiedLayout .image-card {
  position: absolute !important;
}

.justified-grid .image-card-wrapper,
.JustifiedLayout .image-card-wrapper {
  height: 100%;
  padding-bottom: 0 !important;
}

.justified-grid .image,
.JustifiedLayout .image {
  position: relative !important;
}

.JustifiedLayout > .image-card {
  content-visibility: auto;
  contain-intrinsic-size: auto 300px;
}

.true-masonry .image-card {
  height: fit-content;
  margin-bottom: 0 !important;
}

.true-masonry .image-card:not(.isOuterMeta) {
  /* aspect-ratio: var(--w) / var(--h); */
  /* aspect-ratio: max(min(calc(var(--w) / var(--h)), 1.6), 0.5); */
  aspect-ratio: min(calc(var(--w) / var(--h)), 1.6);
}

@media screen and (max-width: 500px) {
  .true-masonry .image-card:not(.isOuterMeta) {
    aspect-ratio: max(min(calc(var(--w) / var(--h)), 1.6), 0.5);
  }
}

.true-masonry .image-card:not(.isOuterMeta) .image-card-wrapper{
  height: 100%;
  padding-bottom: 0 !important;
}

.wf-grid .image-card-wrapper {
  padding-bottom: 100% !important;
}

.wf-grid .outer-meta .author {
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box !important;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
}

.justified-container {
  display: flex !important;
  flex-wrap: wrap;
  gap: 10px;
}

.justified-container::after {
  content: '';
  flex-grow: 999999999;
  min-width: 200px;
  height: 0;
}

.justified-container .image-card {
  --jstf-w: 320;
  --jstf-w-px: 320PX;
  flex-grow: calc(var(--w) * var(--jstf-w) / var(--h));
  width: calc(var(--w) * var(--jstf-w-px) / var(--h));
}

.justified-container .image-card:not(.isOuterMeta) {
  margin-bottom: 0 !important;
}

@media screen and (max-width: 500px) {
  .justified-container .image-card {
    --jstf-w: 240;
    --jstf-w-px: 240PX;
  }
}

.justified-container .image-card-wrapper {
  position: relative !important;
  aspect-ratio: var(--w) / var(--h);
  margin-bottom: 0 !important;
  padding-bottom: 0 !important;
}

/* .justified-container .image-card-wrapper::before {
  content: '';
  display: block;
  padding-bottom: calc(var(--h) / var(--w) * 100%) !important;
} */

.flexbin {
  display: flex !important;
  overflow: hidden;
  flex-wrap: wrap;
  margin: 2.5px;
  transition: 0.2s;
}

.flexbin:after {
  content: '';
  flex-grow: 999999999;
  min-width: 15vw;
  height: 0;
}

.flexbin .image-card {
  position: relative;
  display: block !important;
  min-width: 200PX;
  height: 15vw !important;
  margin: 2.5px;
  padding-bottom: 0 !important;
  flex-grow: 1;
  transition: 0.2s;
}

.flexbin .image[lazy="loading"] {
  top: unset !important;
  left: unset !important;
  transform: scale(0.5) !important;
}

.flexbin .image {
  position: initial !important;
  width: auto !important;
  height: 15vw !important;
  object-fit: cover;
  max-width: 100%;
  min-width: 100%;
  vertical-align: bottom;
  transition: 0.2s;
}

@media (min-width: 768px) {
  .flexbin .meta .title {
    font-size: 23px !important;
  }

  .flexbin .meta .author {
    font-size: 18px !important;
  }
}

@media (max-width: 1280px) {
  .flexbin:after {
    min-width: 20vw !important;
  }

  .flexbin .image-card {
    height: 20vw !important;
  }

  .flexbin .image {
    height: 20vw !important;
  }
}

@media (max-width: 980px) {
  .flexbin:after {
    min-width: 30vw !important;
  }

  .flexbin .image-card {
    height: 30vw !important;
  }

  .flexbin .image {
    height: 30vw !important;
  }
}

@media (max-width: 768px) {
  .flexbin:after {
    min-width: 40vw !important;
  }

  .flexbin .image-card {
    height: 40vw !important;
  }

  .flexbin .image {
    height: 40vw !important;
  }
}

@media (max-width: 570px) {
  .flexbin:after {
    min-width: 60vw !important;
  }

  .flexbin .image-card {
    height: 60vw !important;
  }

  .flexbin .image {
    height: 60vw !important;
  }
}
</style>
