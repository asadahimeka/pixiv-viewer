<template>
  <div class="illusts">
    <top-bar />
    <h3 class="af_title">{{ $t('search.of_user_res', [$route.params.word]) }}</h3>
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
    <van-empty v-if="!loading && !userList.length" :description="$t('tips.no_data')" />
  </div>
</template>

<script>
import TopBar from '@/components/TopBar'
import api from '@/api'
import _ from '@/lib/lodash'
import ImageSlide from '@/components/ImageSlide.vue'
import { mintVerify, BLOCK_SEARCH_WORD_RE } from '@/utils/filter'

export default {
  name: 'SearchUserRes',
  components: {
    TopBar,
    ImageSlide,
  },
  beforeRouteEnter(to, from, next) {
    next(vm => {
      vm.notFromDetail = from.name !== 'Users'
    })
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
  head() {
    return {
      title: this.$t('search.search_user'),
    }
  },
  activated() {
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
      const { word } = this.$route.params
      if (!word || BLOCK_SEARCH_WORD_RE.test(word) || !(await mintVerify(word))) {
        return
      }
      this.loading = true
      this.userList = []
      const res = await api.searchUser(word)
      if (res.status === 0) {
        this.userList = res.data
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
      if (this.notFromDetail) {
        this.getUserList()
      }
    },
  },
}
</script>

<style lang="stylus" scoped>
.af_title
  position relative
  margin-top 40px
  margin-bottom 60px
  text-align center
  font-size 28px

.illusts
  position relative
  padding 0 20px 40px

  .loading
    margin-top: 2rem
    text-align: center

  ::v-deep .top-bar-wrap
    width 30%
    padding-top 20px
    background transparent

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
