<template>
  <li class="comment-block">
    <div class="left">
      <a class="plain" target="_blank" :href="'/users/' + comment.userId">
        <img
          alt=""
          class="avatar"
          :src="resolveSrc(comment.img)"
          :title="comment.userName + ' (' + comment.userId + ')'"
        >
      </a>
    </div>
    <div class="right">
      <h4 class="user">
        <span class="comment-author">{{ comment.userName }}</span>
        <span v-if="comment.replyToUserId" class="comment-reply">&nbsp;▶&nbsp;&nbsp;{{ parentUserName }}</span>
      </h4>
      <div v-if="!comment.stampId" class="content" v-html="replaceStamps(comment.comment)"></div>
      <div v-if="comment.stampId" class="content">
        <img
          class="big-stamp"
          :src="resolveSrc('/~/common/images/stamp/generated-stamps/' + comment.stampId + '_s.jpg')"
          alt=""
        >
      </div>
      <div class="comment-date">{{ formatDate(comment.commentDate) }}</div>
    </div>
  </li>
</template>

<script>
import { imgProxy } from '@/api'
import { formatIntlDate } from '@/utils'
import stampList from './stampList.json'

export default {
  name: 'Comment',
  props: {
    comment: {
      type: Object,
      required: true,
    },
    authorId: { type: String, default: '' },
    parentUserName: { type: String, default: '' },
  },
  methods: {
    resolveSrc: imgProxy,
    replaceStamps(str) {
      for (const [stampName, stampUrl] of Object.entries(stampList)) {
        str = str.replace(
          new RegExp(`\\(${stampName}\\)`, 'g'),
          `<img class="stamp" src="${imgProxy(stampUrl)}" alt="">`
        )
      }
      return str
    },
    formatDate(val) {
      return formatIntlDate(val)
    },
  },
}
</script>

<style lang="stylus" scoped>
.comment-block
  display: flex
  + .comment-block
    margin-top: 1rem
  .left
    margin-right 0.3rem
    .avatar
      width: 0.8rem
      height: 0.8rem
      background-size: 0.8rem
      border-radius: 50%
  .right
    flex 1
    .user
      margin-bottom: .1rem
      font-size 18PX
      font-weight bold
    .content
      white-space: pre-wrap
      margin-bottom: .3em
      font-size 16PX
    .comment-date
      margin-top 10px
      font-size: 12PX
      color: #aaa
</style>
<style lang="stylus">
.comments-popup .comments-item .content
  .stamp,
  .big-stamp
    width: auto
    height: 1.4rem
    margin-top 10px
  .stamp
    height: 1.5em
    vertical-align: bottom
</style>
