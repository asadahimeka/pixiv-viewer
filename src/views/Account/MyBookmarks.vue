<template>
  <div class="favorite">
    <van-list
      v-model="loading"
      :loading-text="$t('tips.loading')"
      :finished="finished"
      :finished-text="$t('tips.no_more')"
      :error.sync="error"
      :offset="800"
      :error-text="$t('tips.net_err')"
      @load="getMemberFavorite()"
    >
      <wf-cont v-bind="$store.getters.wfProps">
        <ImageCard v-for="art in artList" :key="art.id" mode="all" :artwork="art" @click-card="toArtwork($event)" />
      </wf-cont>
    </van-list>
  </div>
</template>

<script>
import _ from 'lodash'
import { mapState } from 'vuex'
import ImageCard from '@/components/ImageCard'
import { getBookmarkIllusts } from '@/api/user'
import api from '@/api'

export default {
  name: 'MyBookmarks',
  components: {
    ImageCard,
  },
  data() {
    return {
      next: 0,
      curPage: 1,
      artList: [],
      error: false,
      loading: false,
      finished: false,
    }
  },
  computed: {
    ...mapState(['user']),
  },
  watch: {
    user(val) {
      if (val?.id) {
        this.reset()
        this.getMemberFavorite()
      }
    },
  },
  methods: {
    reset() {
      this.next = 0
      this.curPage = 0
      this.artList = []
      this.loading = false
      this.finished = false
    },
    getMemberFavorite() {
      window.APP_CONFIG.useLocalAppApi
        ? this.getBookmarks()
        : this.getBookmarksWeb()
    },
    getBookmarksWeb: _.throttle(async function () {
      if (!this.user?.id) return
      this.loading = true
      const res = await getBookmarkIllusts(this.curPage, this.user.id)
      if (res.status === 0) {
        this.artList = _.uniqBy([
          ...this.artList,
          ...res.data,
        ], 'id')
        this.loading = false
        this.curPage += 1
        if (!res.data.length) this.finished = true
      } else {
        this.$toast({
          message: res.msg,
        })
        this.loading = false
        this.error = true
      }
    }, 1500),
    getBookmarks: _.throttle(async function () {
      if (!this.user?.id) return
      if (this.next == null) return
      this.loading = true
      const res = await api.getMemberFavorite(this.user.id, this.next, true)
      if (res.status === 0) {
        this.next = res.data.next
        this.artList = _.uniqBy([
          ...this.artList,
          ...res.data.illusts,
        ], 'id')
        this.loading = false
        if (!this.next) this.finished = true
      } else {
        this.$toast({
          message: res.msg,
        })
        this.loading = false
        this.error = true
      }
    }, 1500),
    toArtwork(id) {
      this.$store.dispatch('setGalleryList', this.artList)
      this.$router.push({
        name: 'Artwork',
        params: { id },
      })
    },
  },
}
</script>

<style lang="stylus" scoped>
.favorite {
  .cell {
    padding: 10px 20px;
  }

  .num {
    float: right;
    font-size: 26px;
    color: #888;
  }

  .card-box {
    padding: 0 12px;
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
</style>
