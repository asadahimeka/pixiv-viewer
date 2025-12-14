<template>
  <div class="rank-card">
    <van-cell class="cell" :border="false" :value="link ? $t('Iv_AtBrZSiXtLxkAr8Kas') : undefined" :is-link="!!link" :to="link || undefined">
      <template #title>
        <span class="title">{{ title }}</span>
      </template>
    </van-cell>
    <div class="card-box">
      <swiper class="swipe-wrap" :options="swiperOption">
        <swiper-slide v-for="(it, i) in list" :key="i" class="swipe-item">
          <div class="spec_wp" @click="$router.push(`/collections/${it.id}`)">
            <img
              :src="coverProxy(it.thumbnailImageUrl)"
              loading="lazy"
              :alt="it.title"
              :style="{ background: randomBg() }"
              onload="this.style.background='none'"
            >
            <h2 class="sp_title" :title="it.title + '\n' + it.caption">{{ it.title }}</h2>
            <div class="sp_author" @click.stop="$router.push(`/users/${it.userId}`)">
              <img :src="avatarProxy(it.profileImageUrl)" alt="">
              <span>{{ it.userName }}</span>
            </div>
          </div>
        </swiper-slide>
        <div slot="button-prev" class="swiper-button-prev"></div>
        <div slot="button-next" class="swiper-button-next"></div>
      </swiper>
    </div>
  </div>
</template>

<script>
import { imgProxy } from '@/api'
import { COMMON_PROXY } from '@/consts'
import { randomBg } from '@/utils'

export default {
  name: 'CollectionSlide',
  props: {
    title: { type: String, default: '' },
    link: { type: String, default: '' },
    list: { type: Array, default: () => [] },
  },
  data() {
    return {
      swiperOption: {
        freeMode: true,
        slidesPerView: 'auto',
        mousewheel: true,
        navigation: {
          nextEl: '.swiper-button-next',
          prevEl: '.swiper-button-prev',
        },
      },
    }
  },
  methods: {
    randomBg,
    coverProxy(src) {
      return COMMON_PROXY + src + '?format=png'
    },
    avatarProxy(src) {
      return imgProxy(src)
    },
  },
}
</script>

<style lang="stylus" scoped>
.cell
  background none

.rank-card
  padding: 0;
  margin-bottom: 1rem;

.card-box
  .swipe-wrap
    height: 100%;
    overflow: hidden;
    .swipe-item
      width 4.3rem;
      margin-right: 12px
    ::v-deep
      .swiper-button-prev
        border-top-left-radius: 10PX
        border-bottom-left-radius: 10PX
        background-image: linear-gradient(90deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0) 100%);
      .swiper-button-next
        border-top-right-radius: 10PX
        border-bottom-right-radius: 10PX
        background-image: linear-gradient(270deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0) 100%);
  .spec_wp
    cursor pointer
    img
      width 4.3rem
      height 4.3rem
      object-fit cover
      aspect-ratio 1/1
    .sp_title
      width: 95%;
      padding-left 10px
      font-size 20px;
      box-sizing border-box
      font-weight bold
      white-space nowrap;
      text-overflow ellipsis;
      overflow hidden;
    .sp_author
      display flex
      align-items center
      gap 10px
      width 100%
      margin-top 10px
      padding-left 5px
      cursor pointer
      img
        width 40px
        height 40px
        object-fit cover
        border-radius 50%

</style>
