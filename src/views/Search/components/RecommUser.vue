<template>
  <div class="illusts">
    <masonry v-bind="masonryProps">
      <ImageSlide v-for="u in userList" :key="u.id" :images="u.illusts">
        <div class="link" @click="toUserPage(u.id)">
          <div class="user_info">
            <Pximg nobg class="user_avatar" :src="u.avatar" alt="" />
            <div class="user_name">{{ u.name }}</div>
          </div>
        </div>
      </ImageSlide>
    </masonry>
    <van-loading v-show="loading" class="loading" :size="'50px'" />
    <van-empty v-if="!loading && !userList.length" />
  </div>
</template>

<script>
import api from '@/api'
import _ from '@/lib/lodash'
import ImageSlide from '@/components/ImageSlide.vue'

export default {
  name: 'RecommUser',
  components: {
    ImageSlide,
  },
  props: {
    relatedId: {
      type: [String, Number],
      default: null,
    },
  },
  data() {
    return {
      loading: false,
      userList: [],
      notFromDetail: true,
      masonryProps: {
        gutter: '8px',
        cols: {
          700: 1,
          1000: 2,
          1600: 3,
          default: 4,
        },
      },
    }
  },
  mounted() {
    this.init()
  },
  methods: {
    toUserPage(id) {
      this.$router.push({
        name: 'Users',
        params: { id },
      })
    },
    getUserList: _.throttle(async function () {
      this.loading = true
      this.userList = []
      let res
      if (this.relatedId) {
        res = await api.getRelatedUser(this.relatedId)
      } else {
        res = await api.getRecommendedUser()
      }
      if (res.status === 0) {
        this.userList = _.shuffle(res.data)
        this.loading = false
      } else {
        this.$toast({
          message: res.msg,
          icon: require('@/icons/error.svg'),
        })
        this.loading = false
      }
    }, 1500),
    init() {
      this.getUserList()
    },
  },
}
</script>

<style lang="stylus" scoped>
.illusts
  position relative
  padding 0 20px 40px

  .loading
    margin-top: 2rem
    text-align: center

  .card-box
    padding: 0 12px
    display: flex
    flex-direction: row

    .image-card
      max-height: 360px
      margin: 4px 2px

.illusts ::v-deep .image-slide
  height: 390px
  margin-bottom 12px
  border: 1PX solid #ebebeb
  border-radius: 18px
  box-sizing: border-box
  background none

  .slide
    margin-left -12%
    .image
      width: 44%;
      margin-right: -10%;
      flex 1

  .user_avatar
    width 72px
    height 72px
    border-radius 50%

  .user_name
    margin: 10px 0
    font-size: 30px
    line-height 1.5
    overflow: hidden
    text-overflow: ellipsis
    display: -webkit-box
    -webkit-line-clamp: 1
    -webkit-box-orient: vertical

  .user_info
    position: absolute
    bottom: 0
    width: 100%
    padding: 10px 16px 40px
    box-sizing: border-box
    text-align center
    color: #fff

  .link
    position: absolute;
    width: 100%
    height: 100%
    top: 50%
    left: 50%
    transform: translate(-50%, -50%)
    &::before
      position: absolute
      content: ''
      bottom: 0
      width: 100%
      height: 100%
      background-image: linear-gradient(0deg, rgba(0,0,0,0.7) 0%, rgba(255,255,255,0) 100%)

</style>
