<template>
  <div class="illusts">
    <wf-cont layout="Grid">
      <ImageCard v-for="art in artList" :key="art.id" mode="all" :artwork="art" @click-card="toArtwork($event)" />
    </wf-cont>
    <van-empty v-if="!artList.length" :description="$t('tips.no_data')" />
  </div>
</template>

<script>
import { Dialog } from 'vant'
import ImageCard from '@/components/ImageCard'
import { getCache, setCache } from '@/utils/storage/siteCache'
import { filterCensoredIllusts } from '@/utils/filter'

export default {
  name: 'SettingHistoryIllust',
  components: {
    ImageCard,
  },
  data() {
    return {
      artList: [],
    }
  },
  activated() {
    this.getHistory()
  },
  mounted() {
    this.getHistory()
  },
  methods: {
    toArtwork(id) {
      this.$store.dispatch('setGalleryList', this.artList)
      this.$router.push({
        name: 'Artwork',
        params: { id },
      })
    },
    async getHistory() {
      const list = await getCache('illusts.history')
      this.artList = list ? filterCensoredIllusts(list) : []
    },
    clearHistory() {
      Dialog.confirm({
        message: this.$t('history.confirm.i'),
        cancelButtonText: this.$t('common.cancel'),
        confirmButtonText: this.$t('common.confirm'),
      }).then(async () => {
        this.artList = []
        await setCache('illusts.history', null)
      })
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
