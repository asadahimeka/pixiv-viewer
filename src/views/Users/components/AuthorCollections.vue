<template>
  <div class="series">
    <CollectionList ref="list" :pagination="false" :show-author="false" :fetch-list="getList" />
  </div>
</template>

<script>
import api from '@/api'
import CollectionList from '@/views/Collections/components/CollectionList.vue'

export default {
  name: 'AuthorCollections',
  components: {
    CollectionList,
  },
  props: {
    id: {
      type: Number,
      required: true,
    },
  },
  methods: {
    getList: async function () {
      if (!this.id) return []
      const res = await api.getUserCollections(this.id)
      return res
    },
  },
}
</script>

<style lang="stylus" scoped>
.series
  padding 0 20px
</style>
