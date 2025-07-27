<template>
  <div class="comments-area">
    <p v-if="!comments.length && !loading">{{ $t('vqHSGcz4r3oSQIWQwZiVf') }}</p>
    <ul v-if="comments.length" class="comments-list">
      <div v-for="item in comments" :key="item.id" class="comments-item">
        <Comment :comment="item" />
        <div class="reply-area">
          <van-button v-if="item.hasReplies && !qShowMap[item.id]" type="info" plain size="small" @click="queryReply(item.id)">
            {{ qLoadingMap[item.id] ? $t('tips.loading') : $t('0CDMRP9wSGJQTyMbvrM8z') }}
          </van-button>
          <ul v-if="qShowMap[item.id]" class="comments-list">
            <div v-for="qItem in qComments[item.id]" :key="qItem.id" class="comments-item">
              <Comment :comment="qItem" :author-id="item.userId" :parent-user-name="item.userName" />
            </div>
          </ul>
        </div>
      </div>
      <div class="show-more">
        <van-button v-if="comments.length && hasNext" type="info" plain size="small" @click="init(id)">
          {{ loading ? $t('tips.loading') : $t('common.view_more') }}
        </van-button>
      </div>
    </ul>
    <van-loading v-if="!comments.length && loading" size="1rem" style="width: 1rem;margin: 2.5rem auto;" />
  </div>
</template>

<script>
import axios from 'axios'
import _ from '@/lib/lodash'
import { mintVerify } from '@/utils/filter'
import { PIXIV_NOW_URL } from '@/consts'
import Comment from './Comment.vue'

export default {
  name: 'CommentsArea',
  components: { Comment },
  props: {
    id: { type: [String, Number], required: true },
    count: { type: Number, required: true },
    limit: Number,
    isNovel: Boolean,
  },
  data() {
    return {
      loading: false,
      comments: [],
      offset: 0,
      hasNext: false,
      qShowMap: {},
      qLoadingMap: {},
      qComments: {},
    }
  },
  computed: {
    ajaxPart() {
      return this.isNovel ? 'novels' : 'illusts'
    },
  },
  async mounted() {
    if (!this.id) return console.info('Component CommentsArea missing param: id')
    await this.init(this.id)
  },
  methods: {
    async init(id) {
      if (this.loading) return
      try {
        this.loading = true
        const { data } = await axios.get(
          `${PIXIV_NOW_URL}/ajax/${this.ajaxPart}/comments/roots`,
          {
            params: {
              [this.isNovel ? 'novel_id' : 'illust_id']: id,
              limit: this.comments.length ? 30 : (this.limit || 3),
              offset: this.offset,
            },
          }
        )
        this.hasNext = data.hasNext
        const res = []
        for (let i = 0; i < data.comments.length; i++) {
          const element = data.comments[i]
          const text = element.userName + element.comment
          if (await mintVerify(text, true)) {
            res.push(element)
          }
        }
        this.comments = _.uniqBy(this.comments.concat(res), 'id')
        this.offset += data.comments.length
      } catch (err) {
        console.warn('Comments fetch error', err)
      } finally {
        this.loading = false
      }
    },
    async queryReply(id) {
      if (this.qLoadingMap[id]) return
      try {
        this.$set(this.qLoadingMap, id, true)
        const { data } = await axios.get(
          `${PIXIV_NOW_URL}/ajax/${this.ajaxPart}/comments/replies`,
          {
            params: {
              comment_id: id,
              page: 1,
            },
          }
        )
        const res = []
        for (let i = 0; i < data.comments.length; i++) {
          const element = data.comments[i]
          const text = element.userName + element.comment
          if (await mintVerify(text, true)) {
            res.push(element)
          }
        }
        console.log('res: ', res)
        this.$set(this.qComments, id, _.uniqBy(res, 'id'))
        this.$set(this.qShowMap, id, true)
      } catch (err) {
        console.warn('Comments fetch error', err)
      } finally {
        this.$set(this.qLoadingMap, id, false)
      }
    },
  },
}

</script>

<style scoped lang="stylus">
.comments-area
  width 750px
  min-height 100vh
  padding 40px
  box-sizing border-box
.comments-list
  list-style: none
  padding-left: 0
.comments-item
  margin-bottom 20px
.reply-area
  margin: 10PX 0 20PX 50PX
  margin-left 1.1rem
.show-more
  display: flex
  justify-content center
  margin-top 30px
</style>
