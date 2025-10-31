<template>
  <div class="user-container">
    <div class="user-wrap">
      <div class="users">
        <TopBar />
        <div class="share_btn" @click="share">
          <Icon class="icon" name="share" />
        </div>
        <div v-if="userInfo.id" class="info-container">
          <div class="bg-cover" :class="{ hasbgcover: !!userInfo.bgcover }">
            <Pximg :src="userInfo.bgcover || userInfo.avatar" :class="{ nobg: !userInfo.bgcover }" :alt="userInfo.name" />
          </div>
          <div class="info">
            <div class="avatar">
              <Pximg :src="userInfo.avatar" :alt="userInfo.name" />
            </div>
            <h2 class="name">
              <div class="user_name">
                {{ userInfo.name }}
                <div class="sup_tags">
                  <span class="is_premium">
                    <van-tag v-if="userInfo.is_premium" plain color="#fc9d2b">P</van-tag>
                  </span>
                  <span v-if="userInfo.gender" class="gender">
                    <van-tag v-if="userInfo.gender == 'male'" plain color="#005CAF">♂</van-tag>
                    <van-tag v-if="userInfo.gender == 'female'" plain color="#F596AA">♀</van-tag>
                  </span>
                </div>
              </div>
            </h2>
            <div class="follow_btn" :class="{isFollowed}">
              <van-button
                v-if="showFollowBtn"
                v-longpress="followUserPrivate"
                size="small"
                :plain="!isFollowed"
                :color="isFollowed ? 'linear-gradient(60deg, #96deda 0%, #50c9c3 100%)' : '#4E4F97'"
                :loading="favLoading"
                @click="toggleFollow"
              >
                {{ isFollowed ? $t('user.followed') : $t('user.follow') }}
              </van-button>
            </div>
            <div class="share_btn" @click="share">
              <Icon class="icon" name="share" />
            </div>
            <div>
              <ul class="site-list">
                <li class="site user_account">
                  <a target="_blank" rel="noreferrer" :href="'https://pixiv.me/' + userInfo.account">
                    @{{ userInfo.account }}
                  </a>
                </li>
                <li class="site">·</li>
                <li v-longpress="onUidLongpress" class="site" @click="copyId">
                  <span class="user_id">ID:{{ userInfo.id }}</span>
                  <Icon name="copy" />
                </li>
                <!-- <li v-if="userInfo.region" class="site">
                  <Icon class="icon loc" name="loc" />
                  <span>{{ userInfo.region }}</span>
                </li> -->
              </ul>
              <ul class="site-list" :class="{ multi: userInfo.webpage && userInfo.twitter_url }">
                <li v-if="userInfo.webpage" class="site">
                  <Icon class="icon home" name="home-s" />
                  <a :href="userInfo.webpage" target="_blank">{{ userInfo.webpage | hostname }}</a>
                </li>
                <li v-if="userInfo.twitter_url" class="site">
                  <Icon class="icon twitter" name="twitter" />
                  <a :href="userInfo.twitter_url" target="_blank">@{{ userInfo.twitter_account }}</a>
                </li>
              </ul>
            </div>
            <div>
              <span v-if="isCurrentUser" class="follow" style="cursor: pointer;" @click="toFollowedUsers">
                {{ $t('user.following') }}
                <span class="num">
                  <a>{{ userInfo.follow }}</a>
                </span>
              </span>
              <span v-else class="follow">
                {{ $t('user.following') }}
                <span class="num">
                  <a
                    :href="`https://www.pixiv.net/users/${userInfo.id}/following`"
                    target="_blank"
                    rel="noopener noreferrer"
                    style="margin-left: -.3em;;color: inherit;"
                  >
                    {{ userInfo.follow }}
                  </a>
                </span>
              </span>
              <span v-if="userInfo.friend" class="friend">
                {{ $t('user.friend') }}
                <span class="num">
                  <a
                    :href="`https://www.pixiv.net/users/${userInfo.id}/mypixiv`"
                    target="_blank"
                    rel="noopener noreferrer"
                    style="margin-left: -.3em;;color: inherit;"
                  >
                    {{ userInfo.friend }}
                  </a>
                </span>
              </span>
              <span v-if="userInfo.region" class="follow">
                <Icon name="loc" />
                <span>{{ userInfo.region }}</span>
              </span>
            </div>
            <div class="user_link">
              <span>🔗</span>
              <a
                target="_blank"
                rel="noreferrer"
                :href="'https://www.pixiv.net/users/' + userInfo.id"
              >https://pixiv.me/{{ userInfo.account }}</a>
            </div>
            <div class="detail" :class="{ ex: isEx || commentHeight < 160 }">
              <div ref="comment" class="content" v-html="userInfo.comment"></div>
              <div v-if="!isEx && commentHeight >= 160" class="more" @click="isEx = true">
                {{ $t('common.view_more') }} <Icon class="icon dropdown" name="dropdown" />
              </div>
            </div>
          </div>
        </div>
        <van-tabs
          v-if="userInfo.id"
          v-model="activeTab"
          class="user-tabs"
          sticky
          animated
          :swipeable="activeTab!='illusts'"
          swipe-threshold="3"
          color="#F2C358"
        >
          <van-tab v-if="userInfo.illusts > 0" name="illusts">
            <template #title>
              <span>{{ $t('common.illust') }}</span>
              <van-tag mark color="#cdeefe" text-color="#0b6aaf">{{ userInfo.illusts }}</van-tag>
            </template>
            <AuthorIllusts
              v-if="activeTab == 'illusts' && userInfo.id && userInfo.illusts > 0"
              :id="userInfo.id"
              key="once-illust"
              :num="userInfo.illusts"
              :once="false"
              :show-title="false"
              :not-from-artwork="notFromArtwork"
              @onCilck="showSub('illusts')"
            />
          </van-tab>
          <van-tab v-if="userInfo.mangas > 0" name="manga">
            <template #title>
              <span>{{ $t('common.manga') }}</span>
              <van-tag mark color="#cdeefe" text-color="#0b6aaf">{{ userInfo.mangas }}</van-tag>
            </template>
            <AuthorIllusts
              v-if="activeTab == 'manga' && userInfo.id && userInfo.mangas > 0"
              :id="userInfo.id"
              key="once-manga"
              i-type="manga"
              :num="userInfo.mangas"
              :once="false"
              :show-title="false"
              :not-from-artwork="notFromArtwork"
              @onCilck="showSub('manga')"
            />
          </van-tab>
          <van-tab v-if="userInfo.illust_series > 0" name="illust_series">
            <template #title>
              <span>{{ $t('iAH7adsXaqWMXEi3TOuwS') }}({{ $t('common.manga') }})</span>
              <van-tag mark color="#cdeefe" text-color="#0b6aaf">{{ userInfo.illust_series }}</van-tag>
            </template>
            <AuthorIllustSeries
              v-if="activeTab == 'illust_series' && userInfo.id && userInfo.illust_series > 0"
              :id="userInfo.id"
              key="illust_series"
            />
          </van-tab>
          <van-tab v-if="userInfo.novels > 0" name="novel">
            <template #title>
              <span>{{ $t('common.novel') }}</span>
              <van-tag mark color="#cdeefe" text-color="#0b6aaf">{{ userInfo.novels }}</van-tag>
            </template>
            <AuthorNovels
              v-if="activeTab == 'novel' && userInfo.id && userInfo.novels > 0"
              :id="userInfo.id"
              key="once-novel"
              :num="userInfo.novels"
              :once="false"
              :show-title="false"
              :not-from-artwork="notFromArtwork"
              @onCilck="showSub('novel')"
            />
          </van-tab>
          <van-tab v-if="userInfo.novel_series > 0" name="novel_series">
            <template #title>
              <span>{{ $t('iAH7adsXaqWMXEi3TOuwS') }}({{ $t('common.novel') }})</span>
              <van-tag mark color="#cdeefe" text-color="#0b6aaf">{{ userInfo.novel_series }}</van-tag>
            </template>
            <AuthorNovelSeries
              v-if="activeTab == 'novel_series' && userInfo.id && userInfo.novel_series > 0"
              :id="userInfo.id"
              key="novel_series"
            />
          </van-tab>
          <van-tab v-if="userInfo.bookmarks > 0" name="favorite">
            <template #title>
              <span>{{ $t('user.fav') }}({{ $t('common.illust') }})</span>
              <van-tag mark color="#cdeefe" text-color="#0b6aaf">{{ userInfo.bookmarks }}</van-tag>
            </template>
            <FavoriteIllusts
              v-if="activeTab == 'favorite' && userInfo.bookmarks > 0"
              :id="userInfo.id"
              key="once-favorite"
              :num="userInfo.bookmarks"
              :not-from-artwork="notFromArtwork"
              :once="false"
              :show-title="false"
              :is-current-user="isCurrentUser"
              @onCilck="showSub('favorite')"
            />
          </van-tab>
          <van-tab v-if="userInfo.bookmarks > 0" :title="`${$t('user.fav')}(${$t('common.novel')})`" name="fav_novel">
            <FavoriteNovels
              v-if="activeTab == 'fav_novel' && userInfo.bookmarks > 0"
              :id="userInfo.id"
              key="once-fav-novel"
              :num="0"
              :not-from-artwork="notFromArtwork"
              :once="false"
              :show-title="false"
              :is-current-user="isCurrentUser"
              @onCilck="showSub('fav_novel')"
            />
          </van-tab>
          <van-tab :title="$t('user.related')" name="related">
            <RecommUser v-if="activeTab == 'related'" :related-id="userInfo.id" />
          </van-tab>
        </van-tabs>

        <!-- <div v-show="activeTab != 'related' && !loading" style="margin-top: 10px;text-align: center;">
          <van-button size="small" @click="showSub(activeTab)">{{ $t('common.view_more') }}</van-button>
        </div> -->

        <van-loading v-show="loading" class="loading" size="60px" />
      </div>
    </div>
  </div>
</template>

<script>
import TopBar from '@/components/TopBar'
import AuthorIllusts from './components/AuthorIllusts'
import AuthorIllustSeries from './components/AuthorIllustSeries'
import AuthorNovelSeries from './components/AuthorNovelSeries.vue'
import FavoriteIllusts from './components/FavoriteIllusts'
import RecommUser from '../Search/components/RecommUser.vue'
import AuthorNovels from './components/AuthorNovels.vue'
import FavoriteNovels from './components/FavoriteNovels.vue'
import _ from '@/lib/lodash'
import { Dialog } from 'vant'
import api, { localApi } from '@/api'
import { getCache, setCache } from '@/utils/storage/siteCache'
import { copyText } from '@/utils'

export default {
  name: 'Users',
  filters: {
    hostname(a) {
      const url = document.createElement('a')
      url.href = a
      return url.hostname
    },
  },
  components: {
    TopBar,
    AuthorIllusts,
    FavoriteIllusts,
    AuthorNovels,
    FavoriteNovels,
    RecommUser,
    AuthorIllustSeries,
    AuthorNovelSeries,
  },
  beforeRouteEnter(to, from, next) {
    next(vm => {
      vm.notFromArtwork = ![
        'Artwork',
        'AuthorIllusts',
        'AuthorFavorites',
        'AuthorNovels',
        'AuthorFavoriteNovels',
      ].includes(from.name)
    })
  },
  data() {
    return {
      loading: false,
      userInfo: {},
      isEx: false,
      commentHeight: 0,
      notFromArtwork: true,
      activeTab: 'illusts',
      favLoading: false,
    }
  },
  head() {
    return { title: this.userInfo.name }
  },
  computed: {
    showFollowBtn() {
      if (!window.APP_CONFIG.useLocalAppApi) return false
      const id = this.$store.state?.user?.id
      return id && id != this.userInfo.id
    },
    isFollowed() {
      return this.userInfo.is_followed
    },
    isCurrentUser() {
      const id = this.$store.state?.user?.id
      return id && id == this.userInfo.id
    },
  },
  watch: {
    $route() {
      if (
        this.$route.name == 'Users' &&
        this.$route.params.id != this.userInfo.id
      ) {
        this.init()
      }
    },
  },
  mounted() {
    this.init()
  },
  methods: {
    init() {
      this.loading = true
      const id = +this.$route.params.id
      this.userInfo = {}
      this.activeTab = 'illusts'
      if (this.$store.state.blockUids.includes(`${id}`)) {
        this.$toast(this.$t('common.content.hide'))
        return
      }
      this.getMemberInfo(id)
    },
    async togggleFollowCache(bool) {
      const itemKey = `memberInfo_${this.userInfo.id}`
      const user = await getCache(itemKey)
      if (user) {
        user.is_followed = bool
        await setCache(itemKey, user, 60 * 60 * 6)
      }
    },
    followUserPrivate() {
      if (this.isFollowed) return
      Dialog.confirm({
        message: this.$t('U7uqf6LXov5GP4PvkrnFk'),
        lockScroll: false,
        closeOnPopstate: true,
        cancelButtonText: this.$t('common.cancel'),
        confirmButtonText: this.$t('common.confirm'),
      }).then(res => {
        if (res == 'confirm') {
          this.toggleFollow('private')
        }
      }).catch(() => {})
    },
    async toggleFollow(restrict = 'public') {
      this.favLoading = true
      if (this.isFollowed) {
        const isOk = await localApi.userFollowDelete(this.userInfo.id)
        this.favLoading = false
        if (isOk) {
          this.userInfo.is_followed = false
          this.togggleFollowCache(false)
        } else {
          this.$toast(this.$t('user.unfollow_fail'))
        }
      } else {
        const isOk = await localApi.userFollowAdd(this.userInfo.id, restrict)
        this.favLoading = false
        if (isOk) {
          this.userInfo.is_followed = true
          this.togggleFollowCache(true)
        } else {
          this.$toast(this.$t('user.follow_fail'))
        }
      }
    },
    async getMemberInfo(id) {
      // console.log(id);
      const res = await api.getMemberInfo(id)
      if (res.status === 0) {
        this.userInfo = res.data
        this.loading = false
        this.$nextTick(() => {
          this.commentHeight = this.$refs.comment.clientHeight
        })

        let historyList = await getCache('users.history', [])
        if (!Array.isArray(historyList)) historyList = []
        // if (historyList.length > 100) historyList = historyList.slice(0, 100)
        historyList = _.uniqBy([res.data, ...historyList], 'id')
        setCache('users.history', historyList)
      } else {
        this.loading = false
        this.$toast({
          message: res.msg,
          icon: require('@/icons/error.svg'),
          duration: 3000,
        })
      }
    },
    copyId() {
      copyText(
        `${this.userInfo.id}`,
        () => this.$toast(this.$t('tips.copylink.succ')),
        err => this.$toast(this.$t('tips.copy_err') + err)
      )
    },
    onUidLongpress() {
      const author = this.userInfo
      Dialog.confirm({
        title: this.$t('w73XEmHradtum3SQ9IjBq'),
        message: `${author.name}(${author.id})`,
        lockScroll: false,
        closeOnPopstate: true,
        cancelButtonText: this.$t('common.cancel'),
        confirmButtonText: this.$t('common.confirm'),
      }).then(res => {
        if (res == 'confirm') {
          this.$store.dispatch('appendBlockUids', [author.id])
        }
      }).catch(() => {})
    },
    async share() {
      try {
        await navigator.share({
          title: 'Pixiv Viewer',
          text: `${this.$t('8dWKEVyxLa8UjO0iuOA78')}：${this.userInfo.name}`,
          url: `https://pixiv.pictures/u/${this.userInfo.id}`,
        }).catch(() => {})
      } catch (err) {
        copyText(
          `${this.userInfo.name} ${location.href}`,
          () => this.$toast(this.$t('tips.copylink.succ')),
          err => this.$toast(this.$t('tips.copy_err') + err)
        )
      }
    },
    toFollowedUsers() {
      this.$router.push({ name: 'Following', params: { tab: '3' } })
    },
    showSub(page) {
      switch (page) {
        case 'illusts':
          this.$router.push({
            name: 'AuthorIllusts',
            params: { id: this.userInfo.id },
            query: { type: 'illust' },
          })
          break

        case 'manga':
          this.$router.push({
            name: 'AuthorIllusts',
            params: { id: this.userInfo.id },
            query: { type: 'manga' },
          })
          break

        case 'novel':
          this.$router.push({
            name: 'AuthorNovels',
            params: { id: this.userInfo.id },
          })
          break

        case 'favorite':
          this.$router.push({
            name: 'AuthorFavorites',
            params: { id: this.userInfo.id },
          })
          break

        case 'fav_novel':
          this.$router.push({
            name: 'AuthorFavoriteNovels',
            params: { id: this.userInfo.id },
          })
          break

        default:
          break
      }
    },
  },
}
</script>

<style lang="stylus">
.app-main:has(.user-container)
  padding 0

  .info, .illusts, .favorite
    padding-left 16px
    padding-right 16px
</style>
<style lang="stylus" scoped>
// .user-container {
//   height: 100%;

//   .user-illusts, .user-wrap {
//     height: 100vh;
//     // overflow-y: scroll;
//   }
// }

.loading {
  position: absolute;
  top: 3rem;
  left: 50%;
  transform: translateX(-50%);
}

.user-tabs {
  ::v-deep .van-tabs__content  {
    margin-top 10px
  }
}

.users {
  padding-bottom 100px
  .info-container {
    margin-bottom 40px
    .bg-cover {
      height: 300px;
      overflow: hidden;

      &.hasbgcover {
        height: 50vw;
        min-height: 300px;
        max-height: 60vh;
      }

      img {
        display: block;
        width: 100%;
        height 100%
        object-fit: cover;
        &[lazy="loading"] {
          opacity 0
        }
      }

      .nobg {
        filter: blur(4px);
      }
    }

    .info {
      position: relative;
      padding-top: 120px;
      text-align: center;
      font-size: 24px;

      .avatar {
        position: absolute;
        left: 50%;
        top: -100px;
        width: 200px;
        height: 200px;
        transform: translateX(-50%);

        img {
          display: block;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          box-shadow: 0 4px 15px #0000001f;
        }
      }

      .name {
        max-width 7.2rem
        margin: 10px auto;
        font-size: 46px;
        font-weight: bold;

        .user_name {
          display inline-block
          position relative
        }

        .sup_tags {
          position absolute
          top 0
          right 0
          transform translateX(120%)
          display flex
          font-family 'Dosis', 'PingFang SC', sans-serif
          .van-tag {
            height 16PX
            vertical-align super
          }
        }
        .is_premium {
          .van-tag {
            padding 0 4.9PX
          }
        }
        .gender {
          margin-left 10px
          .van-tag {
            padding 0 2PX
            line-height 0.9
          }
        }
      }

      .site-list {
        display: flex;
        justify-content: center;

        &.multi {
          .site {
            max-width: 220px;
          }
        }

        .site {
          margin: 20px 6px;
          margin-top: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          color: #92a3aa;
          line-height: 1.2;

          a {
            color: #92a3aa;
          }
        }
      }

      .follow, .friend {
        color: #92a3aa;
        margin: 20px 6px;

        .num {
          color: #333;
          margin-left: 6px;
        }
      }

      .user_link {
        margin-top: 20px;
        font-size: 22px;

        a {
          color: #06f;
        }
      }

      .detail {
        position: relative;
        margin: 40px 0;
        padding: 0 12%;
        color: #555;
        line-height: 1.8;
        max-height: 400px;
        overflow: hidden;
        box-sizing: border-box;

        &.ex {
          max-height: initial;

          .content {
            &::after {
              display: none;
            }
          }
        }

        .content {
          max-width 750px
          margin 0 auto
          white-space: pre-wrap;
          word-break: break-word;

          &::after {
            content: '';
            position: absolute;
            left: 0;
            bottom: -10px;
            width: 100%;
            height: 50%;
            background: linear-gradient(to top, #fff, rgba(#fff, 0));
          }
        }

        .more {
          position: absolute;
          bottom: 10px;
          left: 0;
          right: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 60px;
          cursor pointer
        }
      }
    }
  }

  .illusts, .favorite {
    margin: 10px 0 20px 0;
  }
}

::v-deep .top-bar-wrap
  background none
  transition top 0.2s

.follow_btn
  margin 20px 0
  ::v-deep .van-button
    width 100px

.share_btn
  position: fixed;
  top: 0.99rem;
  right 0.5rem;
  z-index: 99;
  font-size 0.675rem
  cursor pointer
  transition top 0.2s
  .svg-icon
    color: #fafafa;
    filter: drop-shadow(0.02667rem 0.05333rem 0.05333rem rgba(0,0,0,0.8));

.users:has(.van-sticky--fixed)
  ::v-deep .top-bar-wrap
    top 0.5rem
    z-index 98
  .share_btn
    top 1.5rem
    z-index 98

@media screen and (min-width 768px)
  .users .info-container .info .name
    max-width unset

</style>
