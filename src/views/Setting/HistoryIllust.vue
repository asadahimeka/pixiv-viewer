<template>
  <div class="illusts">
    <VirtualWaterfall
      wrapper-height="95vh"
      :gap="10"
      :items="artList"
      :min-column-count="2"
      :item-min-width="280"
      :preload-screen-count="[1, 1]"
      :calc-item-height="(_, w) => w"
    >
      <template #default="{ item }">
        <ImageCard
          mode="all"
          :artwork="item"
          @click-card="toArtwork(item)"
        />
      </template>
    </VirtualWaterfall>
    <van-empty v-if="!artList.length" :description="$t('tips.no_data')" />
  </div>
</template>

<script>
import { Dialog } from 'vant'
import { getCache, setCache } from '@/utils/storage/siteCache'
import { filterCensoredIllusts } from '@/utils/filter'
import VirtualWaterfall from '@/components/VirtualWaterfall.vue'
import ImageCard from '@/components/ImageCard'

export default {
  name: 'SettingHistoryIllust',
  components: {
    VirtualWaterfall,
    ImageCard,
  },
  data() {
    return {
      artList: [],
      loading: false,
    }
  },
  mounted() {
    this.$nextTick(() => {
      requestAnimationFrame(() => {
        this.init()
      })
    })
  },
  methods: {
    init() {
      this.getHistory()
    },
    toArtwork(art) {
      this.$store.dispatch('setGalleryList', this.artList)
      this.$router.push({
        name: 'Artwork',
        params: { id: art.id },
      })
    },
    async getHistory() {
      if (this.loading) return
      this.loading = true
      const list = await getCache('illusts.history')
      this.artList = list ? filterCensoredIllusts(list) : []
      this.loading = false
    },
    clearHistory() {
      Dialog.confirm({
        message: this.$t('history.confirm.i'),
        cancelButtonText: this.$t('common.cancel'),
        confirmButtonText: this.$t('common.confirm'),
      }).then(async () => {
        this.artList = []
        await setCache('illusts.history', null)
      }).catch(() => {})
    },
  },
}
</script>

<style lang="stylus" scoped>
.af_title
  position relative
  margin-top 40px
  margin-bottom 40px
  text-align center
  font-size 28px

  .clear-ih
    position absolute
    top -10px
    right 20px

    ::v-deep .svg-icon
      font-size 0.6rem !important

.illusts
  ::v-deep .top-bar-wrap
    width 30%
    padding-top 20px
    background transparent

  .no-data
    margin-top 100px
    font-size 20px
    text-align center

  .card-box
    padding: 0 12px
    display: flex
    flex-direction: row

    .image-card
      max-height: 360px
      margin: 4px 2px

</style>
