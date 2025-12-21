<template>
  <div class="illusts">
    <top-bar />
    <h3 class="af_title">{{ title }}</h3>
    <div class="collections_restrict">
      <van-radio-group v-if="isR18On" v-model="restrict" direction="horizontal">
        <van-radio name="safe">{{ $t('q3dZB--IevljTdxWdrQMC') }}</van-radio>
        <van-radio name="r18">R18</van-radio>
      </van-radio-group>
    </div>
    <CollectionList ref="list" :auto-load="false" :fetch-list="getList" />
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import api from '@/api'
import TopBar from '@/components/TopBar'
import CollectionList from './components/CollectionList.vue'

export default {
  name: 'Collections',
  components: {
    TopBar,
    CollectionList,
  },
  beforeRouteEnter(_to, from, next) {
    next(vm => {
      vm.notFromDetail = !['Collection', 'Users'].includes(from.name)
    })
  },
  data() {
    return {
      notFromDetail: true,
      restrict: 'safe',
    }
  },
  head() {
    return {
      title: this.title,
    }
  },
  computed: {
    ...mapGetters(['isR18On']),
    title() {
      return this.searchTagsStr ? this.$t('_mXHPuQteMFhoe5D48nmE', [this.searchTagsStr]) : this.$t('TqlK8T5LCQZrufKKCrmcU')
    },
    searchTags() {
      const tags = this.$route.query['tags[]']
      if (!tags) return []
      return Array.isArray(tags) ? tags : [tags]
    },
    searchTagsStr() {
      return this.searchTags.map(e => `#${e}`).join(' ')
    },
  },
  watch: {
    restrict() {
      this.$refs.list?.reset()
    },
  },
  activated() {
    this.init()
  },
  methods: {
    init() {
      if (this.notFromDetail) {
        this.restrict = 'safe'
        this.$refs.list?.reset()
      }
    },
    getList: async function (page) {
      const res = await api.searchCollections(this.searchTags, page, this.restrict)
      return res
    },
  },
}
</script>

<style lang="stylus" scoped>
.collections_restrict
  display flex
  justify-content: flex-end
  margin: 0.2rem 0 0.4rem

.af_title
  position relative
  margin-top 40px
  margin-bottom 60px
  text-align center
  font-size 28px

.illusts
  position relative
  padding 0 20px 40px

  ::v-deep .top-bar-wrap
    width 30%
    padding-top 20px
    background transparent

</style>
