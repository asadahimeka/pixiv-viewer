<template>
  <div class="image-list-comp" :class="listClass">
    <VirtualWaterfall
      v-if="listType == 'VirtualMasonry' || listType == 'VirtualGrid'"
      wrapper-height="95vh"
      :gap="10"
      :items="list"
      :min-column-count="2"
      :item-min-width="280"
      :preload-screen-count="preloadScreenCount"
      :calc-item-height="vCalcItemHeight"
      :on-load-more="onLoadMore"
    >
      <template #default="{ item, index }">
        <ImageCard
          mode="all"
          :artwork="item"
          v-bind="imageCardProps(index, item)"
          @click-card="toArtwork(item)"
        />
      </template>
      <template #tips>
        <p v-show="loading" class="il-tips-text">{{ $t('tips.loading') }}</p>
        <p v-if="!loading && finished" class="il-tips-text">{{ $t('tips.no_more') }}</p>
        <p v-if="!loading && error" class="il-tips-text" @ciick="onLoadMore">{{ $t('tips.net_err') }}</p>
      </template>
    </VirtualWaterfall>
    <VirtualSwiper
      v-else-if="listType == 'VirtualSlide'"
      height="84vh"
      :slides="list"
      :on-reach-end="onLoadMore"
    >
      <template #default="{ slide, index }">
        <ImageCard
          mode="all"
          :artwork="slide"
          v-bind="imageCardProps(index, slide)"
          @click-card="toArtwork(slide)"
        />
      </template>
    </VirtualSwiper>
    <van-list
      v-else
      v-model="vanLoading"
      :loading-text="$t('tips.loading')"
      :finished="finished"
      :finished-text="$t('tips.no_more')"
      :error.sync="vanError"
      :error-text="$t('tips.net_err')"
      :offset="800"
      :immediate-check="false"
      v-bind="vanListProps"
      @load="onLoadMore"
    >
      <JustifiedLayout v-if="listType == 'Justified(Transform)'" :items="list">
        <template #default="{ item, index }">
          <ImageCard
            mode="all"
            :artwork="item"
            v-bind="imageCardProps(index, item)"
            @click-card="toArtwork(item)"
          />
        </template>
      </JustifiedLayout>
      <wf-cont v-else>
        <ImageCard
          v-for="(item, index) in list"
          :key="item.id || index"
          mode="all"
          :artwork="item"
          v-bind="imageCardProps(index, item)"
          @click-card="toArtwork(item)"
        />
      </wf-cont>
    </van-list>
  </div>
</template>

<script>
import store from '@/store'
import VirtualSwiper from '@/components/VirtualSwiper.vue'
import VirtualWaterfall from '@/components/VirtualWaterfall.vue'
import JustifiedLayout from '@/components/JustifiedLayoutComp.vue'
import ImageCard from '@/components/ImageCard.vue'

export default {
  name: 'ImageList',
  components: {
    VirtualSwiper,
    VirtualWaterfall,
    JustifiedLayout,
    ImageCard,
  },
  props: {
    list: { type: Array, default: () => [] },
    listClass: { type: String, default: '' },
    vanListProps: { type: Object, default: () => ({}) },
    imageCardProps: { type: Function, default: () => ({}) },
    vwtfNoTop: { type: Boolean, default: false },
    loading: { type: Boolean, default: true },
    finished: { type: Boolean, default: false },
    error: { type: Boolean, default: false },
    onLoadMore: { type: Function, default: () => {} },
    onCardClick: { type: Function, default: () => {} },
  },
  data() {
    return {
      vanLoading: true,
      vanError: true,
    }
  },
  computed: {
    listType() {
      return store.state.appSetting.wfType
    },
    preloadScreenCount() {
      return this.vwtfNoTop ? [2, 1] : [1, 1]
    },
  },
  watch: {
    loading: {
      immediate: true,
      handler(val) {
        this.vanLoading = val
      },
    },
    error: {
      immediate: true,
      handler(val) {
        this.vanError = val
      },
    },
  },
  methods: {
    vCalcItemHeight(item, itemWidth) {
      if (this.listType == 'VirtualGrid') return itemWidth
      return item.height * (itemWidth / item.width)
    },
    toArtwork(art) {
      this.onCardClick(art)
      this.$store.dispatch('setGalleryList', this.list)
      this.$router.push({
        name: 'Artwork',
        params: { id: art.id, art },
      })
    },
  },
}
</script>

<style scoped>
.il-tips-text {
  color: #969799;
  font-size: 14PX;
  line-height: 50PX;
  text-align: center;
}
</style>
