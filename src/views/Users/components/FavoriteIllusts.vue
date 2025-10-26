<template>
  <div class="favorite">
    <template v-if="showTitle">
      <van-cell v-if="once" class="cell" :border="false" is-link @click="onClick()">
        <template #title>
          <span class="title">
            {{ $t('user.fav_title') }}
            <span v-if="num" class="num">{{ $t('user.art_num', [num]) }}</span>
          </span>
        </template>
      </van-cell>
      <h3 v-else class="af_title">
        <div class="discovery-tabs">
          <div class="com_sel_tab cur">{{ $t('user.fav_title') }}</div>
          <div class="com_sel_tab" @click="$router.replace($route.fullPath.replace('favorites', 'favorite_novels'))">{{ $t('user.fav_novel_title') }}</div>
        </div>
      </h3>
    </template>
    <ImageList
      :list="artList"
      :loading="loading"
      :finished="finished"
      :error="error"
      :on-load-more="getMemberFavorite"
      :van-list-props="{ 'finished-text': !once ? $t('tips.no_more') : '' }"
    />
  </div>
</template>

<script>
import _ from '@/lib/lodash'
import api from '@/api'
import ImageList from '@/components/ImageList.vue'

export default {
  name: 'FavoriteIllusts',
  components: {
    ImageList,
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
    isCurrentUser: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      next: 0,
      artList: [],
      error: false,
      loading: false,
      finished: false,
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
      if (!this.id || this.loading || this.finished) return
      if (this.next == null) return
      this.loading = true
      let newList
      const res = await api.getMemberFavorite(this.id, this.next, this.isCurrentUser)
      if (res.status === 0) {
        this.next = res.data.next
        newList = res.data.illusts
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

.discovery-tabs
  display flex
  justify-content center
  align-items center
  gap 10px
  width 100%

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
