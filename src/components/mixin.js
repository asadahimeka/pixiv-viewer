export const swiperMixin = {
  computed: {
    swiperOption() {
      return {
        freeMode: true,
        freeModeMomentum: true,
        freeModeMomentumRatio: 0.6,
        freeModeMomentumBounce: false,
        slidesPerView: 'auto',
        mousewheel: true,

        resistance: false,
        touchEventsTarget: 'wrapper',
        threshold: 15,
        touchAngle: 30,
        snapOnRelease: true,
        momentumRatio: 0.5,
        preloadImages: false,

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
}
