export const swiperMixin = {
  // ref="mySwiper"
  // mixins: [swiperMixin],
  computed: {
    swiperOption() {
      return {
        freeMode: true,
        slidesPerView: 'auto',
        mousewheel: true,
        touchMoveStopPropagation: true,
        scrollbar: {
          el: '.swiper-scrollbar',
          draggable: true,
        },
        navigation: {
          nextEl: '.swiper-button-next',
          prevEl: '.swiper-button-prev',
        },
        ...(this.extSwiperOption || {}),
      }
    },
  },
  activated() {
    this.$nextTick(() => {
      this.$refs.mySwiper?.$swiper?.attachEvents()
    })
  },
  deactivated() {
    this.$nextTick(() => {
      this.$refs.mySwiper?.$swiper?.detachEvents()
    })
  },
}
