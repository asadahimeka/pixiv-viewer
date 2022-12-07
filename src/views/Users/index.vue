<template>
  <div class="user-container">
    <div class="user-wrap">
      <div class="users">
        <TopBar />
        <div class="info-container" v-if="userInfo.id">
          <div class="bg-cover">
            <img :class="{ nobg: !userInfo.bgcover }" :src="userInfo.bgcover || userInfo.avatar" :alt="userInfo.name" />
          </div>
          <div class="info">
            <div class="avatar">
              <img :src="userInfo.avatar" :alt="userInfo.name" />
            </div>
            <h2 class="name">{{ userInfo.name }}</h2>
            <ul class="site-list">
              <li class="site">
                <a target="_blank" rel="noreferrer"
                  :href="'https://pixiv.me/' + userInfo.account">@{{ userInfo.account }}</a>
              </li>
              <li class="site" v-if="userInfo.country_code">
                <Icon class="icon loc" name="loc"></Icon>
                <span>{{ userInfo.country_code }}</span>
              </li>
            </ul>
            <ul class="site-list" :class="{ multi: userInfo.webpage && userInfo.twitter_url }">
              <li class="site" v-if="userInfo.webpage">
                <Icon class="icon home" name="home-s"></Icon>
                <a :href="userInfo.webpage" target="_blank">{{ userInfo.webpage | hostname }}</a>
              </li>
              <li class="site" v-if="userInfo.twitter_url">
                <Icon class="icon twitter" name="twitter"></Icon>
                <a :href="userInfo.twitter_url" target="_blank">@{{ userInfo.twitter_account }}</a>
              </li>
            </ul>
            <span class="follow">
              <span class="num">{{ userInfo.follow }}</span>关注
            </span>
            <span class="friend" v-if="userInfo.friend">
              <span class="num">{{ userInfo.friend }}</span>好P友
            </span>
            <div class="user_link">
              <a target="_blank" rel="noreferrer"
                :href="'https://www.pixiv.net/users/' + userInfo.id">https://www.pixiv.net/users/{{ userInfo.id }}</a>
            </div>
            <div class="detail" :class="{ ex: isEx || commentHeight < 160 }">
              <div class="content" v-html="userInfo.comment" ref="comment"></div>
              <div class="more" v-if="!isEx && commentHeight >= 160" @click="isEx = true">
                查看更多
                <Icon class="icon dropdown" name="dropdown"></Icon>
              </div>
            </div>
          </div>
        </div>
        <AuthorIllusts v-if="userInfo.id" :id="userInfo.id" :num="userInfo.illusts" :once="true"
          @onCilck="showSub('illusts')" key="once-illust" />
        <FavoriteIllusts v-if="userInfo.id" :id="userInfo.id" :num="userInfo.bookmarks" :once="true"
          @onCilck="showSub('favorite')" key="once-favorite" />
        <van-loading
          v-show="loading"
          class="loading"
          size="60px"
        />
      </div>
    </div>
  </div>
</template>

<script>
import { Loading } from "vant";
import TopBar from "@/components/TopBar";
import AuthorIllusts from "./components/AuthorIllusts";
import FavoriteIllusts from "./components/FavoriteIllusts";
import api from "@/api";
export default {
  name: "Users",
  watch: {
    $route() {
      if (
        this.$route.name === "Users" &&
        this.$route.params.id !== this.userInfo.id
      ) {
        this.init();
      }
    }
  },
  data() {
    return {
      loading: false,
      userInfo: {},
      isEx: false,
      commentHeight: 0
    };
  },
  computed: {},
  methods: {
    scrollToTop() {
      let el = document.querySelector('.app-main')
      el && el.scrollTo({ top: 0 })
    },
    init() {
      this.scrollToTop()
      this.loading = true;
      let id = +this.$route.params.id;
      this.userInfo = {};
      this.getMemberInfo(id);
    },
    async getMemberInfo(id) {
      // console.log(id);
      let res = await api.getMemberInfo(id);
      if (res.status === 0) {
        this.userInfo = res.data;
        this.loading = false;
        this.$nextTick(() => {
          this.getCommentHeight();
        });
      } else {
        this.loading = false;
        this.$toast({
          message: res.msg,
          icon: require("@/icons/error.svg"),
          duration: 3000
        });
      }
    },
    getCommentHeight() {
      this.commentHeight = this.$refs.comment.clientHeight;
    },
    showSub(page) {
      this.scrollToTop()
      switch (page) {
        case "illusts":
          this.$router.push({
            name: "AuthorIllusts",
            params: { id: this.userInfo.id }
          });
          break;

        case "favorite":
          this.$router.push({
            name: "AuthorFavorites",
            params: { id: this.userInfo.id }
          });
          break;

        default:
          break;
      }
    }
  },
  filters: {
    hostname(a) {
      const url = document.createElement("a");
      url.href = a;
      return url.hostname;
    }
  },
  mounted() {
    this.init();
  },
  activated() {
    this.scrollToTop()
  },
  components: {
    TopBar,
    AuthorIllusts,
    FavoriteIllusts,
    [Loading.name]: Loading,
  }
};
</script>

<style lang="stylus">
.app-main:has(.user-container)
  padding 0

  .info, .illusts, .favorite
    padding-left 16px
    padding-right 16px
</style>
<style lang="stylus" scoped>
.user-container {
  height: 100%;

  .illust-wrap, .user-wrap {
    height: 100vh;
    // overflow-y: scroll;
  }
}

.loading {
  position: absolute;
  top: 30%;
  left: 50%;
  transform: translateX(-50%);
}

.users {
  .info-container {
    .bg-cover {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 300px;
      overflow: hidden;

      img {
        display: block;
        width: 100%;
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
        font-size: 46px;
        font-weight: bold;
        margin: 10px 0;
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
          margin-right: 6px;
        }
      }

      .user_link {
        margin-top: 20px;
        font-size: 22px;
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
          white-space: pre-wrap;

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

</style>
