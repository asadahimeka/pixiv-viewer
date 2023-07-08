<template>
  <div class="rank-card">
    <van-cell class="cell" :border="false">
      <template #title>
        <span class="search_popular_icon">
          <Icon class="icon " name="popular" />
        </span>
        <span class="title">{{ $t('search.pop_preview_novel') }}</span>
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
      <masonry v-bind="$store.getters.novelMyProps">
        <NovelCard v-for="art in artList" :key="art.id" :artwork="art" @click-card="toArtwork($event)" />
      </masonry>
    </van-list>
  </div>
</template>

<script>
import api from '@/api'
import NovelCard from '@/components/NovelCard.vue'
export default {
  name: 'PopularPreviewNovel',
  components: {
    NovelCard,
  },
  props: {
    word: String,
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
      const res = await api.getPopularPreviewNovel(this.word)
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
    toArtwork(id) {
      this.$router.push({
        name: 'NovelDetail',
        params: { id },
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
