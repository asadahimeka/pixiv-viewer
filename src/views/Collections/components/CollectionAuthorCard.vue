<template>
  <div v-if="artwork && artwork.userId" class="author-card">
    <van-cell class="cell" :border="false" :value="$t('TBjERNyUzTvXHFSY65teN')" is-link @click="toAuthor(artwork.userId)">
      <template #title>
        <Pximg v-if="artwork.profileImageUrl" nobg class="icon" :src="artwork.profileImageUrl" alt="" />
        <span class="title">{{ artwork.userName }}</span>
      </template>
    </van-cell>
    <div class="artwork-list-wrap">
      <CollectionSlide :show-author="false" :current="artwork.id" :list="artwork.userCols" />
    </div>
  </div>
</template>

<script>
import CollectionSlide from './CollectionSlide.vue'

export default {
  name: 'CollectionAuthorCard',
  components: {
    CollectionSlide,
  },
  props: {
    artwork: {
      type: Object,
      required: true,
    },
  },
  methods: {
    toAuthor(id) {
      this.$router.push({
        name: 'Users',
        params: { id, tab: 'collections' },
      })
    },
  },
}
</script>

<style lang="stylus" scoped>
.author-card
  padding: 0 14px
  margin: 24px 0
  .cell
    .icon
      border-radius: 50%
      vertical-align: middle
    .title
      font-size: 28px
    @media screen and (min-width: 1200px)
      ::v-deep .van-cell__value
        display none

</style>
