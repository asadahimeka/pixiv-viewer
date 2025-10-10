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
    <ImageList
      list-class="result-list"
      :list="artList"
      :loading="loading"
      :finished="finished"
      :error="error"
      :on-load-more="getList"
    />
  </div>
</template>

<script>
import _ from '@/lib/lodash'
import api from '@/api'
import ImageList from '@/components/ImageList.vue'

export default {
  name: 'PopularPreview',
  components: {
    ImageList,
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
      if (!this.word || this.loading) return
      this.artList = []
      this.finished = false
      this.loading = true
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
