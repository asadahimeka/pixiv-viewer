<template>
  <div ref="related" class="related" :style="manualLoadRelated?'min-height:120px':''">
    <van-cell class="cell" :border="false">
      <template #title>
        <Icon class="icon heart" name="heart" />
        <span class="title">{{ $t('common.related') }}</span>
        <van-button
          v-if="manualLoadRelated && !showList"
          size="small"
          class="load_rel_btn"
          @click="init()"
        >
          {{ $t('7KdpxnZMAURov4JetAfvV') }}
        </van-button>
      </template>
    </van-cell>
    <van-loading v-if="!manualLoadRelated && !showList" size="64px" style="width: 64px;margin: 20px auto;" />
    <CollectionList v-if="showList" :fetch-list="getRelated" />
  </div>
</template>

<script>
import api from '@/api'
import store from '@/store'
import CollectionList from './CollectionList.vue'

const { manualLoadRelated } = store.state.appSetting

export default {
  name: 'CollectionRelated',
  components: {
    CollectionList,
  },
  props: {
    artwork: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      showList: false,
      manualLoadRelated,
    }
  },
  mounted() {
    if (!manualLoadRelated) this.setObserver()
  },
  methods: {
    setObserver() {
      const options = {
        rootMargin: '0px 0px 0px 0px',
        threshold: [0.99],
      }
      const ob = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting) {
          this.init()
          ob.disconnect()
        }
      }, options)
      ob.observe(this.$refs.related)
    },
    init() {
      this.showList = true
    },
    async getRelated(page) {
      const res = await api.getCollectionRelated(this.artwork.id, page)
      return res
    },
  },
}
</script>

<style lang="stylus" scoped>
.related
  min-height: 72vh;
  .cell
    padding: 0 8px 20px 8px;
  .load_rel_btn
    margin-left: 0.2rem;
    vertical-align: 0.5em;

</style>
