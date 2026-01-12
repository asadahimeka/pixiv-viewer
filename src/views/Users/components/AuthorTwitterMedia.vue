<template>
  <div class="series nifs-list-cont">
    <van-list
      v-model="loading"
      class="collection-list"
      :immediate-check="false"
      :loading-text="$t('tips.loading')"
      :finished="finished"
      :finished-text="$t('tips.no_more')"
      :offset="1000"
      @load="getList"
    >
      <JustifiedLayout :items="artList">
        <template #default="{ item }">
          <div class="spec_wp" :style="item.style" @click="showImage(item)">
            <img :src="item.images[0].m" loading="lazy" :alt="item.title">
            <div class="sp_meta">
              <h2 class="sp_title" :title="item.caption" @click.stop="toDetail(item.id)">
                {{ item.title }}
              </h2>
            </div>
            <div v-if="item.type != 'PHOTO'" class="layer-num layer-type">
              {{ item.type }}
            </div>
            <div v-if="item.count > 1" class="layer-num">
              <Icon name="layer" scale="1.5" />
              {{ item.count }}
            </div>
          </div>
        </template>
      </JustifiedLayout>
      <van-empty v-if="!loading && !artList.length" :description="$t('tips.no_data')" />
    </van-list>
  </div>
</template>

<script>
import _ from '@/lib/lodash'
import api from '@/api'
import { previewXMedia, randomBg } from '@/utils'
import JustifiedLayout from '@/components/JustifiedLayoutComp.vue'

export default {
  name: 'AuthorTwitterMedia',
  components: {
    JustifiedLayout,
  },
  props: {
    userName: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      artList: [],
      loading: false,
      finished: false,
      userId: '',
      nextCursor: '',
    }
  },
  watch: {
    userName() {
      this.init()
    },
  },
  created() {
    this.init()
  },
  methods: {
    init() {
      this.loading = true
      this.artList = []
      this.finished = false
      this.userId = ''
      this.nextCursor = ''
      this.getList()
    },
    getList: _.throttle(async function () {
      this.loading = true
      const res = await api.getTwitterMedias(this.userName, this.userId, this.nextCursor)
      if (res?.results) {
        this.artList = _.uniqBy([
          ...this.artList,
          ...res.results.map(e => ({ ...e, style: `background: ${randomBg()}` })),
        ], 'id')

        this.nextCursor = res.next_cursor
        this.userId = res.user_id
        if (!res.next_cursor) {
          this.finished = true
        }
      } else {
        this.finished = true
      }
      this.loading = false
    }, 2000),
    showImage(item) {
      previewXMedia(item)
    },
    toDetail(id) {
      window.open(`https://x.com/${this.userName}/status/${id}`, '_blank', 'noreferrer')
    },
  },
}
</script>

<style lang="stylus" scoped>
.series
  padding 0 20px

.collection-list
  margin-bottom: 1rem;

  .spec_wp
    position relative
    width 100%
    height 100%
    cursor pointer
    border-radius 8PX
    > img
      width 100%
      height 100%
      object-fit cover
      border-radius 8PX
    .sp_meta
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      border-radius 8PX
      &::before
        position: absolute;
        content: '';
        bottom: 0;
        width: 100%;
        height: 50%;
        border-radius 8PX
        background-image: linear-gradient(0deg, rgba(0, 0, 0, 0.5) 0%, rgba(255, 255, 255, 0) 100%);
      .sp_title
        position: absolute;
        bottom: 5px;
        width: 100%;
        padding: 18px;
        box-sizing border-box
        color: #fff;
        font-size 24px;
        font-weight bold
        white-space nowrap;
        text-overflow ellipsis;
        overflow hidden;
    .layer-num
      position: absolute;
      top: 10px;
      right: 10px;
      display flex
      justify-content center
      align-items center
      gap 5PX
      background: rgba(#000, 0.3);
      color: #fff;
      padding: 4px 8px;
      font-size: 18px;
      border-radius: 5px;
    .layer-type
      left 10px
      right unset

</style>
