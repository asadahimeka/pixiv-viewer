<template>
  <div class="rank-card">
    <van-cell class="cell" :border="false">
      <template #title>
        <span class="search_popular_icon">
          <Icon class="icon " name="popular" />
        </span>
        <span class="title">{{ $t('search.pop_preview') }}</span>
      </template>
    </van-cell>
    <van-list
      v-model="loading"
      class="result-list"
      :loading-text="$t('tips.loading')"
      :finished="finished"
      :error.sync="error"
      :immediate-check="false"
      :offset="800"
      :finished-text="$t('tips.no_more')"
      :error-text="$t('tips.net_err')"
      @load="getList"
    >
      <wf-cont>
        <ImageCard v-for="art in artList" :key="art.id" mode="all" :artwork="art" @click-card="toArtwork(art)" />
      </wf-cont>
    </van-list>
  </div>
</template>

<script>
import _ from '@/lib/lodash'
import ImageCard from '@/components/ImageCard'
import api from '@/api'
export default {
  name: 'PopularPreview',
  components: {
    ImageCard,
  },
  props: {
    word: String,
    params: Object,
  },
  data() {
    return {
      artList: [],
      loading: false,
      error: false,
      finished: false,
    }
  },
  created() {
    this.getList()
  },
  methods: {
    async getList() {
      if (!this.word) return
      this.loading = true
      this.artList = []
      const res = await api.getPopularPreview(this.word, _.pickBy(this.params, Boolean))
      if (res.status === 0) {
        this.artList = res.data
        this.finished = true
      } else {
        this.error = true
        this.$toast({
          message: res.msg,
          icon: require('@/icons/error.svg'),
        })
      }
      this.loading = false
    },
    toArtwork(art) {
      this.$store.dispatch('setGalleryList', this.artList)
      this.$router.push({
        name: 'Artwork',
        params: { id: art.id, art },
      })
    },
  },
}
</script>

<style lang="stylus" scoped>
.result-list {
  margin: 0 2px;

  .card-box {
    display: flex;
    flex-direction: row;

    .column {
      width: 50%;

      .image-card {
        max-height: 360px;
        margin: 4px 2px;
      }
    }
  }
}
.rank-card {
  padding: 0 14px;
  margin-bottom: 40px;

  & > .cell {
    padding-top 0

    .icon {
      font-size 32px
    }
    .title {
      font-size 24px
    }
  }
}
</style>
