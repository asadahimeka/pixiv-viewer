<template>
  <div class="artwork isAutoLoadKissT">
    <TopBar />
    <div class="ia-cont">
      <div class="ia-left">
        <van-loading v-if="loading" size="50px" style="position: absolute;margin: 2rem" />
        <CollectionView :artwork="artwork" />
      </div>
      <div class="ia-right">
        <van-skeleton class="skeleton" title avatar :row="5" row-width="200px" avatar-size="42px" :loading="loading">
          <CollectionMeta :artwork="artwork" />
        </van-skeleton>
        <CollectionAuthorCard v-if="artwork.id" :artwork="artwork" />
      </div>
    </div>
    <van-divider style="margin: 0.7rem 0;" />
    <CollectionRelated v-if="artwork.id" :artwork="artwork" />
  </div>
</template>

<script>
import api from '@/api'
import TopBar from '@/components/TopBar.vue'
import CollectionView from './components/CollectionView.vue'
import CollectionMeta from './components/CollectionMeta.vue'
import CollectionAuthorCard from './components/CollectionAuthorCard.vue'
import CollectionRelated from './components/CollectionRelated.vue'

export default {
  name: 'Collection',
  components: {
    TopBar,
    CollectionView,
    CollectionMeta,
    CollectionAuthorCard,
    CollectionRelated,
  },
  data() {
    return {
      loading: true,
      artwork: {},
    }
  },
  head() {
    return this.artwork.title
      ? {
          title: this.artwork.title + ' - ' + this.$t('4--dCKaKniIMUQ7l_mKpg', [this.artwork.userName]),
        }
      : {}
  },
  watch: {
    $route() {
      if (
        this.$route.name === 'Collection' &&
        this.$route.params.id != this.artwork.id
      ) {
        this.init()
      }
    },
  },
  mounted() {
    this.init()
  },
  methods: {
    async init() {
      this.loading = true
      this.artwork = {}
      const id = this.$route.params.id
      if (!id) return
      await this.$nextTick()
      const res = await api.getCollectionDetail(id)
      if (res) {
        console.log('res: ', res)
        // todo: 过滤R18
        this.artwork = res
        this.loading = false
      } else {
        this.$toast({
          message: this.$t('tip.unknown_err'),
          icon: require('@/icons/error.svg'),
          duration: 3000,
        })
      }
    },
  },
}
</script>

<style lang="stylus">
.app-main:has(.artwork)
  padding 0
  .related
    padding-left 16px
    padding-right 16px
</style>
<style lang="stylus" scoped>
.artwork
  .skeleton
    margin: 30px 0;

.ia-cont
  display flex
  align-items flex-start
  min-height 100vh

  .ia-left
    display flex
    justify-content center
    align-items center
    width 72%
    min-width 72%
    margin-top 20px
    padding 0 20px

  .ia-right
    position: sticky;
    top: 0;
    max-width 28%
    padding-right 40px
    box-sizing border-box
    overflow hidden

@media screen and (max-width: 1120px)
  .ia-cont
    display block !important

  .ia-left
    width 100% !important
    margin 0 auto !important
    padding 0 !important

  .ia-right
    max-width unset !important
    padding-right 0 !important
    .artwork-meta
      margin-top 10px !important

@media screen and (min-width: 1201px)
  .ia-cont .ia-right
    max-height 100vh
    overflow-y auto
    &::-webkit-scrollbar
      display none

.artwork
  ::v-deep .top-bar-wrap
    width 2rem
    background none
  &.isAutoLoadKissT
    .ia-right ::v-deep .artwork-meta
      .tag.translated
        color #808080
      @media screen and (max-width: 1120px)
        margin 0.26667rem 0.13333rem !important

</style>
