<template>
  <div class="favorite">
    <BookmarkTags v-if="isAppLogin" type="illust" @update-sel-tag="updateSelTag" @update-restrict="updateRestrict" />
    <ImageList
      :list="artList"
      :loading="loading"
      :finished="finished"
      :error="error"
      :on-load-more="getMemberFavorite"
    />
  </div>
</template>

<script>
import _ from '@/lib/lodash'
import { mapState } from 'vuex'
import ImageList from '@/components/ImageList.vue'
import BookmarkTags from '@/views/Account/components/BookmarkTags.vue'
import { getBookmarkIllusts } from '@/api/user'
import api from '@/api'

export default {
  name: 'MyBookmarks',
  components: {
    ImageList,
    BookmarkTags,
  },
  data() {
    return {
      next: 0,
      curPage: 1,
      artList: [],
      error: false,
      loading: false,
      finished: false,
      isAppLogin: window.APP_CONFIG.useLocalAppApi,
      restrict: 'public',
      bookmarkTag: '',
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
  created() {
    this.reset()
    this.getMemberFavorite()
  },
  methods: {
    updateRestrict(val) {
      this.restrict = val
      this.bookmarkTag = ''
      this.reset()
      this.getMemberFavorite()
    },
    updateSelTag(val) {
      this.bookmarkTag = val
      this.reset()
      this.getMemberFavorite()
    },
    reset() {
      this.next = 0
      this.curPage = 0
      this.artList = []
      this.loading = false
      this.finished = false
    },
    getMemberFavorite() {
      this.isAppLogin
        ? this.getBookmarks()
        : this.getBookmarksWeb()
    },
    getBookmarksWeb: _.throttle(async function () {
      if (!this.user?.id || this.loading || this.finished) return
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
      if (!this.user?.id || this.loading || this.finished) return
      if (this.next == null) return
      this.loading = true
      const options = {}
      if (this.restrict) options.restrict = this.restrict
      if (this.bookmarkTag) options.tag = this.bookmarkTag
      const res = await api.getMemberFavorite(this.user.id, this.next, true, options)
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
