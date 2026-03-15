<template>
  <div class="TrendTagsCard rank-card">
    <van-cell class="cell" :border="false" is-link @click="$router.push('/search')">
      <template #title>
        <Icon class="icon icon-discovery" name="discovery" />
        <span class="title">{{ $t('CZNaDWItH2DtJ-Gp2V_8D') }}</span>
      </template>
    </van-cell>
    <div class="card-box">
      <swiper class="swipe-wrap" :options="swiperOption">
        <swiper-slide v-for="(tag, i) in tags" :key="tag+i" class="swipe-item">
          <div class="spec_wp" @click="$router.push(`/search/${tag.name}`)">
            <Pximg :src="tag.thumb" :alt="tag.name" />
            <div class="sp_info">
              <div class="sp_title">
                <p style="margin-bottom: 10px;">#{{ tag.name }}</p>
                <p v-if="tag.translated_name" style="margin-bottom: 10px;font-size: 0.8em;">{{ tag.translated_name }}</p>
                <p style="font-size: 0.7em;">{{ tag.tagged_count }} PCS</p>
              </div>
            </div>
          </div>
        </swiper-slide>
        <div slot="scrollbar" class="swiper-scrollbar"></div>
        <div slot="button-prev" class="swiper-button-prev"></div>
        <div slot="button-next" class="swiper-button-next"></div>
      </swiper>
    </div>
  </div>
</template>

<script>

export default {
  name: 'TrendTagsCard',
  props: {
    tags: { type: Array, default: () => [] },
  },
  data() {
    return {
      swiperOption: {
        freeMode: true,
        slidesPerView: 'auto',
        mousewheel: true,
        scrollbar: {
          el: '.TrendTagsCard .swiper-scrollbar',
          draggable: true,
        },
        navigation: {
          nextEl: '.TrendTagsCard .swiper-button-next',
          prevEl: '.TrendTagsCard .swiper-button-prev',
        },
      },
    }
  },
  methods: {

  },
}
</script>

<style lang="stylus" scoped>
.TrendTagsCard
  padding: 0 14px;
  margin-bottom: 24px;

  .icon-discovery
    font-size 45px

  .spec_wp
    height 97%
    img
      position relative
      width 100%
      height 100%
      object-fit cover
      &[lazy="loading"]
        width: 100px;
        height: 100px;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
    .sp_info
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 97%;
      &::before
        position: absolute;
        content: '';
        bottom: 0;
        width: 100%;
        height: 100%;
        background-image: linear-gradient(0deg, rgba(0,0,0,0.5) 0%, rgba(255,255,255,0) 100%);
    .sp_title
      position: absolute;
      bottom: 0;
      width: 100%;
      padding 10px 16px 60px;
      box-sizing: border-box;
      font-size 28px;
      text-align: center;
      color: #fff;
      white-space nowrap;
      text-overflow ellipsis;
      overflow hidden

  .card-box
    height: 365px;
    .swipe-wrap
      height: 100%;
      overflow: hidden;
      .swipe-item
        width 4.2rem
        margin-right: 12px
</style>
