<template>
  <div class="favorite">
    <template v-if="showTitle">
      <van-cell v-if="once" class="cell" :border="false" is-link @click="onClick()">
        <template #title>
          <span class="title">
            {{ $t('user.fav_novel_title') }}
            <span v-if="num" class="num">{{ $t('user.art_num', [num]) }}</span>
          </span>
        </template>
      </van-cell>
      <h3 v-else class="af_title">{{ $t('user.fav_novel_title') }}</h3>
    </template>
    <van-list
      v-model="loading"
      :loading-text="$t('tips.loading')"
      :finished="finished"
      :finished-text="!once ? $t('tips.no_more') : ''"
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
import api from '@/api'
import _ from '@/lib/lodash'
import NovelCard from '@/components/NovelCard.vue'
export default {
  name: 'FavoriteNovels',
  components: {
    NovelCard,
  },
  props: {
    id: {
      type: Number,
      required: true,
    },
    num: {
      type: Number,
    },
    once: {
      type: Boolean,
      default: false,
    },
    notFromArtwork: {
      type: Boolean,
      default: true,
    },
    showTitle: {
      type: Boolean,
      default: true,
    },
  },
  data() {
    return {
      next: 0,
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
    }
  },
  mounted() {
    this.reset()
    this.getMemberFavorite()
  },
  activated() {
    if (this.notFromArtwork) {
      this.reset()
      this.getMemberFavorite()
    }
  },
  methods: {
    reset() {
      this.next = 0
      this.artList = []
      this.loading = false
      this.finished = false
    },
    getMemberFavorite: _.throttle(async function () {
      if (!this.id) return
      this.loading = true
      let newList
      const res = await api.getMemberFavoriteNovel(this.id, this.next)
      if (res.status === 0) {
        this.next = res.data.next
        newList = res.data.novels
        if (this.once) newList = newList.slice(0, 10)
        this.artList = _.uniqBy([
          ...this.artList,
          ...newList,
        ], 'id')
        this.loading = false
        if (this.once || !this.next) this.finished = true
      } else {
        this.$toast({
          message: res.msg,
        })
        this.loading = false
        this.error = true
      }
    }, 2500),
    toArtwork(id) {
      this.$router.push({
        name: 'NovelDetail',
        params: { id },
      })
    },
    onClick() {
      this.$emit('onCilck')
    },
  },
}
</script>

<style lang="stylus" scoped>
.af_title
  margin-top 30px
  margin-bottom 40px
  text-align center
  font-size 28px

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
