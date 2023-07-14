<template>
  <div class="illusts">
    <template v-if="showTitle">
      <van-cell v-if="once" class="cell" :border="false" is-link @click="onClick()">
        <template #title>
          <span class="title">
            {{ $t('user.art_title', [iTypeText]) }}
            <span v-if="num" class="num">{{ $t('user.art_num', [num]) }}</span>
          </span>
        </template>
      </van-cell>
      <h3 v-else class="af_title">{{ $t('user.art_title', [authorName + iTypeText]) }}</h3>
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
      <wf-cont v-bind="$store.getters.wfProps">
        <ImageCard v-for="art in artList" :key="art.id" mode="all" :artwork="art" @click-card="toArtwork($event)" />
      </wf-cont>
    </van-list>
  </div>
</template>

<script>
import ImageCard from '@/components/ImageCard'
import api from '@/api'
import _ from 'lodash'
export default {
  name: 'AuthorIllusts',
  components: {
    ImageCard,
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
    iType: {
      type: String,
      default: 'illust',
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
    }
  },
  computed: {
    authorName() {
      const n = this.artList[0]?.author.name
      return n ? `${n} ${this.$t('user.of')}` : ''
    },
    iTypeText() {
      const map = {
        illust: this.$t('common.illust'),
        manga: this.$t('common.manga'),
      }
      return map[this.iType]
    },
  },
  mounted() {
    console.log('AuthorIllusts mounted:', this.iType)
    this.reset()
    this.getMemberArtwork()
  },
  activated() {
    console.log('this.notFromArtwork: ', this.notFromArtwork)
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
      const res = await api.getMemberArtwork(this.id, this.curPage, this.iType)
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
      this.$store.dispatch('setGalleryList', this.artList)
      this.$router.push({
        name: 'Artwork',
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
