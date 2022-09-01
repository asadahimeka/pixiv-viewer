<template>
  <div class="user-container">
    <div class="illust-wrap" v-show="showIllusts">
      <div class="illust">
        <TopBar :action="()=>{showIllusts=false}" />
        <AuthorIllusts v-if="userInfo.id" :id="userInfo.id" key="multi-illust" />
      </div>
    </div>
    <div class="illust-wrap" v-show="showFavorite">
      <div class="illust">
        <TopBar :action="()=>{showFavorite=false}" />
        <FavoriteIllusts v-if="userInfo.id" :id="userInfo.id" key="multi-favorite" />
      </div>
    </div>
    <div class="user-wrap" v-show="!showIllusts&&!showFavorite">
      <div class="users">
        <TopBar />
        <div class="info-container" v-if="userInfo.id">
          <div class="bg-cover">
            <img :src="userInfo.avatar" :alt="userInfo.name" />
          </div>
          <div class="info">
            <div class="avatar">
              <img :src="userInfo.avatar" :alt="userInfo.name" />
            </div>
            <h2 class="name">{{userInfo.name}}</h2>
            <ul class="site-list" :class="{multi: userInfo.webpage&&userInfo.twitter_url}">
              <li class="site" v-if="userInfo.webpage">
                <Icon class="icon home" name="home-s"></Icon>
                <a :href="userInfo.webpage" target="_blank">{{userInfo.webpage | hostname}}</a>
              </li>
              <li class="site" v-if="userInfo.twitter_url">
                <Icon class="icon twitter" name="twitter"></Icon>
                <a :href="userInfo.twitter_url" target="_blank">@{{userInfo.twitter_account}}</a>
              </li>
            </ul>
            <span class="follow">
              <span class="num">{{userInfo.follow}}</span>关注
            </span>
            <span class="friend" v-if="userInfo.friend">
              <span class="num">{{userInfo.friend}}</span>好P友
            </span>
            <div class="detail" :class="{ex:isEx||commentHeight<160}">
              <div class="content" v-html="userInfo.comment" ref="comment"></div>
              <div class="more" v-if="!isEx&&commentHeight>=160" @click="isEx=true">
                查看更多
                <Icon class="icon dropdown" name="dropdown"></Icon>
              </div>
            </div>
          </div>
        </div>
        <AuthorIllusts
          v-if="userInfo.id"
          :id="userInfo.id"
          :num="userInfo.illusts"
          :once="true"
          @onCilck="showSub('illusts')"
          key="once-illust"
        />
        <FavoriteIllusts
          v-if="userInfo.id"
          :id="userInfo.id"
          :num="userInfo.bookmarks"
          :once="true"
          @onCilck="showSub('favorite')"
          key="once-favorite"
        />
      </div>
    </div>
  </div>
</template>

<script>
import TopBar from "@/components/TopBar";
import AuthorIllusts from "./components/AuthorIllusts";
import FavoriteIllusts from "./components/FavoriteIllusts";
import api from "@/api";
export default {
  name: "Users",
  watch: {
    $route() {
      this.showIllusts = false;
      this.showFavorite = false;
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
      showIllusts: false,
      showFavorite: false,
      commentHeight: 0
    };
  },
  computed: {},
  methods: {
    init() {
      window._appMainEl && window._appMainEl.scrollTo({ top: 0, behavior: "smooth" });
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
      }
    },
    getCommentHeight() {
      this.commentHeight = this.$refs.comment.clientHeight;
    },
    showSub(page) {
      document.querySelector('.app-main').scrollTop = 0;
      switch (page) {
        case "illusts":
          this.showIllusts = true;
          break;

        case "favorite":
          this.showFavorite = true;
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
  components: {
    TopBar,
    AuthorIllusts,
    FavoriteIllusts
  }
};
</script>

<style lang="stylus" scoped>
.user-container {
  height: 100%;

  .illust-wrap, .user-wrap {
    height: 100vh;
    // overflow-y: scroll;
  }
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
        filter: blur(10px);
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
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          color: #92a3aa;

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
