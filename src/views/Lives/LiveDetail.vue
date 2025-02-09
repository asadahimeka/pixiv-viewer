<template>
  <div class="live_detail">
    <top-bar />
    <h3 v-if="detail.id" class="af_title">「{{ detail.name }}」 - {{ author.name }}</h3>
    <van-loading v-if="loading" class="loading" size="50px" />
    <van-empty v-if="!loading && !detail.id" :description="$t('tips.no_data')" />
    <div v-if="!loading && detail.id" class="live_detail_cont">
      <div v-if="showPlayer" class="player">
        <DPlayer ref="dplayer" :options="playerOptions" />
        <Icon v-show="showPlayBtn" class="live_play_icon" name="play" scale="10" @click.native="play" />
      </div>
      <div v-if="performers.length > 1" class="performers">
        <div
          v-for="(p, pi) in performers"
          :key="pi"
          class="perf-thumb"
          :class="{act:actPerfIndex==pi}"
          @click="switchVideo(pi)"
        >
          <img :src="p.thumbnail" :alt="p.name">
          <div class="perf-name">{{ p.name }}</div>
        </div>
      </div>
      <div class="content">
        <h2 :title="detail.name" class="title">{{ detail.name }}</h2>
        <div class="live_desp">{{ detail.description }}</div>
        <a class="live_link" :href="liveLink" target="_blank" rel="noreferrer">{{ liveLink }}</a>
        <div class="author-cont" @click="toUsers(author.uid)">
          <img :src="author.avatar" :alt="author.name" class="avatar">
          <div class="author">{{ author.name }}</div>
        </div>
        <div class="counts">
          <span class="r_tags">
            <van-tag v-if="detail.is_r18" type="danger">R-18</van-tag>
            <van-tag v-if="detail.is_r15" type="warning">R-15</van-tag>
          </span>
          <van-icon name="clock-o" />
          <span>{{ liveDuration }}</span>
          <van-icon name="contact" />
          <span>{{ detail.member_count }}</span>
          <van-icon name="eye-o" />
          <span>{{ detail.total_audience_count }}</span>
          <van-icon v-if="detail.performer_count > 0" name="friends-o" />
          <van-icon v-if="detail.is_enabled_mic_input" name="volume-o" />
          <van-icon name="chat-o" />
          <span>{{ detail.chat_count }}</span>
          <van-icon name="like-o" />
          <span>{{ detail.heart_count }}</span>
        </div>
        <div class="chats">
          <div class="c-title-cont">
            <div class="c-title">{{ $t('lives_chats_title') }}</div>
            <div class="counts">
              <van-icon name="clock-o" />
              <span>{{ liveDuration }}</span>
              <van-icon name="contact" />
              <span>{{ detail.member_count }}</span>
              <van-icon name="eye-o" />
              <span>{{ detail.total_audience_count }}</span>
              <van-icon v-if="detail.performer_count > 0" name="friends-o" />
              <van-icon v-if="detail.is_enabled_mic_input" name="volume-o" />
              <van-icon name="chat-o" />
              <span>{{ detail.chat_count }}</span>
              <van-icon name="like-o" />
              <span>{{ detail.heart_count }}</span>
            </div>
          </div>
          <div class="ct-hr"></div>
          <div ref="chatList" class="chat-list">
            <div v-for="c in chatLogs" :key="c.id" class="chat-item">
              <img :src="c.userAvatar" :alt="c.userName" class="avatar" @click="toUsers(c.uid)">
              <span class="time">{{ c.createdAt }}</span>
              <span
                class="user-name"
                :class="{is_owner:c.userName==author.name,is_perf:isPerformer(c.userName)}"
                @click="toUsers(c.uid)"
              >{{ c.userName }}</span>:
              <span>{{ c.message }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import dayjs from 'dayjs'
import { COMMON_PROXY } from '@/consts'
import DPlayer from './components/DPlayer.vue'

export default {
  name: 'LiveDetail',
  components: { DPlayer },
  data() {
    return {
      detail: {},
      loading: true,
      liveDuration: '-',
      ldSid: null,
      chatLogs: [],
      showPlayer: false,
      showPlayBtn: true,
      actPerfIndex: 0,
      ws: null,
    }
  },
  head() {
    return { title: this.detail.id ? `「${this.detail.name}」 - ${this.author.name}` : 'Live' }
  },
  computed: {
    playerOptions() {
      return {
        theme: '#F2C358',
        autoplay: false,
        screenshot: true,
        live: true,
        video: {
          type: 'hls',
          url: this.detail.owner?.hls_movie?.url,
          pic: this.cmnProxy(this.detail.owner?.thumbnail?.original?.url),
        },
      }
    },
    author() {
      if (this.detail.id) {
        return {
          avatar: this.cmnProxy(this.detail.owner?.user?.icon?.photo?.original?.url),
          name: this.detail.owner?.user?.name,
          uid: this.detail.owner?.user?.pixiv_user_id,
          uname: this.detail.owner?.user?.unique_name,
          videoUrl: this.detail.owner?.hls_movie?.url,
          thumbnail: this.cmnProxy(this.detail.owner?.thumbnail?.original?.url),
        }
      }
      return {}
    },
    performers() {
      if (this.detail.id) {
        return [
          this.author,
          ...this.detail.performers.map(e => ({
            name: e.user?.name,
            videoUrl: e.hls_movie?.url,
            thumbnail: this.cmnProxy(e.thumbnail?.original?.url),
          })),
        ]
      }
      return []
    },
    liveLink() {
      return `https://sketch.pixiv.net/@${this.author.uname}/lives/${this.detail.id}`
    },
  },
  activated() {
    const { id } = this.$route.params
    if (!id) return
    this.getLogs(id).then(() => {
      this.initWebsocket(id)
    })
    this.getDetail(id).then(() => {
      this.calcDuration()
      this.ldSid = setInterval(() => {
        this.calcDuration()
      }, 1000)
      this.showPlayBtn = true
      this.showPlayer = true
    })
  },
  deactivated() {
    this.onDeact()
  },
  methods: {
    onDeact() {
      clearInterval(this.ldSid)
      this.$refs.dplayer?.dp?.destroy()
      this.ws?.close()
      this.ws && (this.ws.onmessage = null)
      this.ws = null
      this.showPlayer = false
      this.showPlayBtn = false
      this.detail = {}
    },
    play() {
      this.$refs.dplayer?.dp?.play()
      this.showPlayBtn = false
    },
    switchVideo(i) {
      this.actPerfIndex = i
      const { videoUrl, thumbnail } = this.performers[this.actPerfIndex]
      this.$refs.dplayer?.dp?.switchVideo({
        url: videoUrl,
        pic: thumbnail,
      })
      this.$refs.dplayer?.dp?.play()
      this.showPlayBtn = false
    },
    isPerformer(name) {
      return !!this.performers.find(e => e.name == name)
    },
    initWebsocket(id) {
      // this.ws = new WebSocket(`wss://wspx.fly.dev/sketch.pixiv.net/ws/lives?live_id=${id}`)
      this.ws = new WebSocket(`wss://sketch.pixiv.net/ws/lives?live_id=${id}`)
      this.ws.onmessage = e => {
        const data = JSON.parse(e.data)
        console.log('data: ', data)
        if (data.type == 'chat') {
          this.detail.chat_count++
          this.chatLogs.push({
            id: data.chat?.id,
            createdAt: dayjs(data.chat?.created_at).format('HH:mm'),
            uid: data.chat?.user?.pixiv_user_id,
            message: data.chat?.message,
            userName: data.chat?.user?.name,
            userAvatar: this.cmnProxy(data.chat?.user?.icon?.photo?.original?.url),
          })
          this.chatListToBottom()
        }
        if (data.type == 'audience_count_updated') {
          this.detail.member_count = data.count
          this.detail.total_audience_count = data.total
        }
        if (data.type == 'heart') {
          this.detail.heart_count = data.total_count
        }
        if (data.type == 'finish') {
          this.onDeact()
        }
      }
    },
    getDetail: async function (id) {
      this.loading = true
      const resp = await fetch(this.cmnProxy(`https://sketch.pixiv.net/api/lives/${id}.json`))
      const json = await resp.json()

      if (json?.errors?.length) {
        this.$toast({
          message: json.errors[0].message || this.$t('tip.unknown_err'),
          icon: require('@/icons/error.svg'),
        })
      } else {
        this.detail = json.data
      }
      this.loading = false
    },
    async getLogs(id) {
      const resp = await fetch(this.cmnProxy(`https://sketch.pixiv.net/api/lives/${id}/logs.json`))
      const json = await resp.json()
      if (json?.errors?.length) {
        this.$toast({
          message: json.errors[0].message || this.$t('tip.unknown_err'),
          icon: require('@/icons/error.svg'),
        })
      } else {
        this.chatLogs = json.data.filter(e => e.type == 'chat').map(e => ({
          id: e.id,
          createdAt: dayjs(e.created_at).format('HH:mm'),
          uid: e.data?.chat?.user?.pixiv_user_id,
          message: e.data?.chat?.message,
          userName: e.data?.chat?.user?.name,
          userAvatar: this.cmnProxy(e.data?.chat?.user?.icon?.photo?.original?.url),
        })).reverse()
        this.chatListToBottom()
      }
    },
    chatListToBottom() {
      setTimeout(() => {
        this.$refs.chatList?.scrollTo({
          top: this.$refs.chatList?.scrollHeight,
          behavior: 'smooth',
        })
      }, 500)
    },
    toUsers(id) {
      window.open(`/users/${id}`, '_blank', 'noreferrer')
    },
    cmnProxy(src) {
      return COMMON_PROXY + src
    },
    calcDuration() {
      let ms = (this.detail.finished_at ? new Date(this.detail.finished_at) : Date.now()) - new Date(this.detail.created_at)
      if (ms < 0) ms = -ms
      const d = {
        hour: Math.floor(ms / 3600000) % 24,
        minute: Math.floor(ms / 60000) % 60,
        second: Math.floor(ms / 1000) % 60,
      }
      this.liveDuration = `${d.hour}:${d.minute.toString().padStart(2, 0)}:${d.second.toString().padStart(2, 0)}`
    },
  },
}
</script>

<style lang="stylus" scoped>
.af_title
  position relative
  margin-top 40px
  margin-bottom 40px
  text-align center
  font-size 0.38rem
  font-weight bold

.live_detail
  position relative
  padding 0 20px 40px

  .loading
    margin-top 120px
    text-align center

  ::v-deep .top-bar-wrap
    width 2rem
    padding-top 20px
    background transparent

  .live_detail_cont
    position relative

  .live_play_icon
    position absolute
    top 50%
    left 50%
    z-index 99
    transform translate(-50%, -50%)
    color: #56565699;
    cursor pointer

  .player
    position relative
    margin 20px auto
    padding 0 5vw
    .dplayer
      max-height 70vh

  .content
    max-width: 1200px;
    margin: auto;
    padding: .10667rem .26667rem .21333rem;
    color: #333;
    box-sizing: border-box;

    .avatar
      width: .55rem;
      min-width: .55rem;
      height: .55rem;
      margin-right: .12rem;
      vertical-align: bottom;
      border-radius: 50%;
      overflow: hidden;
      object-fit: cover;
      cursor pointer

    .title
      margin: .08rem 0;
      font-weight: 600;
      line-height: normal;
      font-size: 0.38rem;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 1;
      -webkit-box-orient: vertical;
    .live_desp
      margin 25px 0
      font-size 0.3rem
      white-space: pre-wrap;
      word-break: break-word;
    .live_link
      display block
      margin-bottom 30px
      color: rgb(46, 151, 216)
      word-break: break-word;
      &:hover
        text-decoration underline

    .author-cont
      display: flex;
      align-items: center;
      font-size: .3rem;
      cursor pointer
      .author
        flex 1
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;

    .counts
      display flex
      align-items center
      color #999
      margin-top 20px
      font-family Bahnschrift, Dosis, Arial, Helvetica, sans-serif
      font-size 0.26rem
      ::v-deep
        .van-icon
          margin-left .2rem
          margin-right 0.05rem
      .r_tags
        & + .van-icon
          margin-left 0.1rem
        ::v-deep .van-tag:last-child
          margin-right 0.2rem

    .chats
      margin-top 40px
      padding 20px 0
      border 1PX solid #ccc
      border-radius 0.1rem
      .ct-hr
        width 100%
        height 1px
        margin-bottom 20px
        background #ddd
      .c-title-cont
        display flex
        justify-content space-between
        align-items center
        margin-bottom 20px
        padding 0 30px 0 20px
        .counts
          margin-top 0 !important
      .c-title
        font-size 0.32rem
        font-style italic
        font-family Georgia, Helvetica, Arial, sans-serif

      .chat-list
        max-height 60vh
        padding 0 20px
        overflow-y auto
        user-select text
      .chat-item
        margin-bottom 20px
        font-size 0.28rem
        line-height 1.2
        .time
          margin-right 0.05rem
          color #999
        .avatar
          vertical-align -0.6em
        .user-name
          font-weight bold
          cursor pointer
          &.is_perf
            color #db735c
          &.is_owner
            color #2e97d8

  .performers
    display flex
    justify-content center
    flex-wrap wrap
    gap 10px
    margin 20px 0
    .perf-thumb
      position relative
      width 200px
      height 100px
      cursor pointer
      border 3PX solid transparent
      border-radius 10px
      transition border-color 0.2s
      overflow hidden
      .perf-name
        position absolute
        top 0
        left 0
        width 100%
        height 100%
        display flex
        justify-content center
        align-items center
        padding 10px
        background rgba(0,0,0,0.4)
        color #fff
        font-size 0.26rem
        box-sizing border-box
        text-shadow 2PX 2PX 2PX #333
      img
        width 100%
        height 100%
        object-fit cover
        border-radius 10px
        transition transform 0.2s
      &.act, &:hover
        border-color #F2C358
        img
          transform scale(1.1)

@media screen and (max-width 978px)
  .live_detail
    .player
      padding 0

@media screen and (max-width 1190px)
  .live_detail .content .chats
    .chat-list
      max-height: 36vh;
    .c-title-cont .counts
      display none

@media screen and (min-width 1200px)
  .live_detail
    .content
      max-width unset
      margin 0
      margin-left 20px
      .chats
        position absolute
        top 0
        right 0
        width 400PX
        margin-top 0 !important
        background #fff
      .chat-list
        max-height 12rem !important
      .chat-item
        word-break: break-word;
    .player
      margin-left 0
      margin-right 0
      padding 0
      &,& .dplayer
        width: calc(100vw - 400PX - 1.4rem);
        height: 13.49rem;
        max-height unset
        border-radius 12px

</style>
