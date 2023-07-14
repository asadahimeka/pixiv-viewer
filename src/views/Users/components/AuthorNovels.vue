<template>
  <div class="illusts">
    <template v-if="showTitle">
      <van-cell v-if="once" class="cell" :border="false" is-link @click="onClick()">
        <template #title>
          <span class="title">
            {{ $t('user.novel_art') }}
            <span v-if="num" class="num">{{ $t('user.art_num', [num]) }}</span>
          </span>
        </template>
      </van-cell>
      <h3 v-else class="af_title">{{ $t('user.novel_art_title', [authorName]) }}</h3>
    </template>
    <van-list
      v-model="loading"
      :loading-text="$t('tips.loading')"
      :finished="finished"
      :finished-text="!once ? $t('tips.no_more') : ''"
      :error.sync="error"
      :offset="800"
      :error-text="$t('tips.net_err')"
      @load="getMemberArtwork()"
    >
      <masonry v-bind="masonryProps">
        <NovelCard v-for="art in artList" :key="art.id" :artwork="art" @click-card="toArtwork($event)" />
      </masonry>
    </van-list>
  </div>
</template>

<script>
import api from '@/api'
import _ from 'lodash'
import NovelCard from '@/components/NovelCard.vue'
export default {
  name: 'AuthorNovels',
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
    }
  },
  computed: {
    authorName() {
      const n = this.artList[0]?.author.name
      return n ? `${n} ${this.$t('user.of')}` : ''
    },
  },
  mounted() {
    this.reset()
    this.getMemberArtwork()
  },
  activated() {
    if (this.notFromArtwork) {
      this.reset()
      this.getMemberArtwork()
    }
  },
  methods: {
    reset() {
      this.curPage = 1
      this.artList = []
    },
    getMemberArtwork: _.throttle(async function () {
      if (!this.id) return
      this.loading = true
      let newList
      const res = await api.getMemberNovel(this.id, this.curPage)
      if (res.status === 0) {
        newList = res.data
        if (this.once) newList = newList.slice(0, 10)
        this.artList = _.uniqBy([
          ...this.artList,
          ...newList,
        ], 'id')

        this.loading = false
        this.curPage++
        if (this.once || !newList.length) this.finished = true
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

.illusts {
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
