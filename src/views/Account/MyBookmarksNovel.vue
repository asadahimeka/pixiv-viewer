<template>
  <div class="favorite">
    <BookmarkTags type="novel" @update-sel-tag="updateSelTag" @update-restrict="updateRestrict" />
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
      <masonry v-bind="masonryProps">
        <NovelCard v-for="art in artList" :key="art.id" mode="all" :artwork="art" @click-card="toArtwork($event)" />
      </masonry>
    </van-list>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import _ from '@/lib/lodash'
import api from '@/api'
import NovelCard from '@/components/NovelCard.vue'
import BookmarkTags from '@/views/Account/components/BookmarkTags.vue'

export default {
  name: 'MyBookmarksNovel',
  components: {
    NovelCard,
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
      masonryProps: {
        gutter: '8px',
        cols: {
          600: 1,
          1200: 2,
          1600: 3,
          default: 4,
        },
      },
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
    getMemberFavorite: _.throttle(async function () {
      if (!this.user?.id || this.loading || this.finished) return
      if (this.next == null) return
      this.loading = true
      const options = {}
      if (this.restrict) options.restrict = this.restrict
      if (this.bookmarkTag) options.tag = this.bookmarkTag
      const res = await api.getMemberFavoriteNovel(this.user.id, this.next, true, options)
      if (res.status === 0) {
        this.next = res.data.next
        this.artList = _.uniqBy([
          ...this.artList,
          ...res.data.novels,
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
      this.$router.push({
        name: 'NovelDetail',
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
