<template>
  <van-list
    v-model="loading"
    class="collection-list"
    :immediate-check="autoLoad"
    :loading-text="$t('tips.loading')"
    :finished="finished"
    :finished-text="$t('tips.no_more')"
    :offset="1000"
    @load="getList"
  >
    <wf-cont layout="Grid">
      <div
        v-for="it in artList"
        :key="it.id"
        class="spec_wp"
        @click="$router.push(`/collections/${it.id}`)"
      >
        <img
          :src="coverProxy(it.thumbnailImageUrl)"
          loading="lazy"
          :alt="it.title"
          :style="it.style"
          onload="this.className+=' bg-none'"
        >
        <h2 class="sp_title" :title="it.title + '\n' + it.caption">{{ it.title }}</h2>
        <div v-if="showAuthor" class="sp_author" @click.stop="$router.push(`/users/${it.userId}`)">
          <img :src="avatarProxy(it.profileImageUrl)" alt="">
          <span>{{ it.userName }}</span>
        </div>
      </div>
    </wf-cont>
    <van-empty v-if="!loading && !artList.length" :description="$t('tips.no_data')" />
  </van-list>
</template>

<script>
import _ from '@/lib/lodash'
import { imgProxy } from '@/api'
import { COMMON_IMAGE_PROXY } from '@/consts'
import { randomBg } from '@/utils'
import { filterCensoredCollections } from '@/utils/filter'

// 兼容三种历史形状：裸数组（含旧版数组 expando 元数据）/ {data|list, total} / null
function normalizeFetchResult(raw) {
  const list = Array.isArray(raw)
    ? raw
    : (raw && Array.isArray(raw.data) ? raw.data : (raw && Array.isArray(raw.list) ? raw.list : []))
  const totalVal = Array.isArray(raw) ? undefined : (raw && (raw.total ?? raw.data?.total))
  const total = typeof totalVal === 'number' ? totalVal : undefined
  return { list, total }
}

export default {
  name: 'CollectionList',
  props: {
    fetchList: { type: Function, default: async () => [] },
    pagination: { type: Boolean, default: true },
    autoLoad: { type: Boolean, default: true },
    showAuthor: { type: Boolean, default: true },
  },
  data() {
    return {
      curPage: 1,
      rawCount: 0,
      artList: [],
      loading: false,
      finished: false,
    }
  },
  methods: {
    reset() {
      this.loading = true
      this.artList = []
      this.curPage = 1
      this.rawCount = 0
      this.finished = false
      this.getList()
    },
    getList: _.throttle(async function () {
      this.loading = true
      const page = this.curPage
      const res = await this.fetchList(page)
      if (this.curPage !== page) {
        // fetch 在途期间 curPage 被改（reset() 重入）：丢弃过期响应，避免旧页数据虚增 rawCount 提前判底
        this.loading = false
        return
      }
      const { list, total } = normalizeFetchResult(res)
      if (list.length) {
        this.rawCount += list.length
        this.artList = _.uniqBy([
          ...this.artList,
          ...filterCensoredCollections(
            list.map(e => ({ ...e, style: `background: ${randomBg()}` }))
          ),
        ], 'id')

        this.loading = false
        if (!this.pagination || (typeof total === 'number' && this.rawCount >= total)) {
          this.finished = true
        } else {
          this.curPage++
        }
      } else {
        this.loading = false
        this.finished = true
      }
    }, 1000),
    coverProxy(src) {
      return COMMON_IMAGE_PROXY + src + '?format=png'
    },
    avatarProxy(src) {
      return imgProxy(src)
    },
  },
}
</script>

<style lang="stylus" scoped>
.collection-list
  margin-bottom: 1rem;

  .spec_wp
    margin-bottom 0.5rem
    cursor pointer
    > img
      width 5.4rem
      max-width 100%
      height auto
      object-fit cover
      aspect-ratio 1/1
      border-radius 8PX
    .sp_title
      width: 95%;
      margin-top 20px
      padding-left 10px
      font-size 20px;
      box-sizing border-box
      font-weight bold
      white-space nowrap;
      text-overflow ellipsis;
      overflow hidden;
    .sp_author
      display flex
      align-items center
      gap 10px
      width 100%
      margin-top 10px
      padding-left 5px
      cursor pointer
      img
        width 40px
        height 40px
        object-fit cover
        border-radius 50%

</style>
