<template>
  <div class="search">
    <div class="search-bar-wrap">
      <van-search
        v-model="keywords"
        class="search-bar"
        shape="round"
        :placeholder="$t('search.placeholder')"
        maxlength="50"
        show-action
        :clearable="false"
        @search="onSearch"
      >
        <template #action>
          <div class="search_btn" @click="onSearch">{{ $t('search.search') }}</div>
        </template>
      </van-search>
    </div>
    <div class="com_sel_tabs">
      <div class="com_sel_tab" @click="$router.replace('/search')">{{ $t('common.illust_manga') }}</div>
      <div class="com_sel_tab" @click="$router.replace('/search_novel')">{{ $t('common.novel') }}</div>
      <div class="com_sel_tab cur">{{ $t('common.user') }}</div>
    </div>
    <div class="list-wrap">
      <RecommUser />
    </div>
  </div>
</template>

<script>
import { mintVerify } from '@/utils/filter'
import RecommUser from './components/RecommUser.vue'
import { i18n } from '@/i18n'

export default {
  name: 'SearchUser',
  components: {
    RecommUser,
  },
  data() {
    return {
      keywords: '',
    }
  },
  head: {
    title: i18n.t('search.search_user'),
  },
  methods: {
    async onSearch() {
      const word = this.keywords.trim()
      if (!word || /スカラマシュ|散兵|放浪者|流浪者/i.test(word) || !(await mintVerify(word))) {
        return
      }
      this.$router.push(`/search_user/${word}`)
      this.keywords = ''
    },
    toUidPage(id) {
      this.$router.push(`/users/${id}`)
    },
  },
}
</script>

<style lang="stylus" scoped>
.search {
  position: relative;
  .search-bar-wrap {
    position: fixed;
    top: 0;
    left 0
    z-index: 3;
    width: 100%;
    transition: all 0.2s;

    ::v-deep {
      .van-icon-search {
        margin-top: 2px;
        margin-left: 4px;
        font-size: 0.4rem;
      }

      .van-search__content {
        background #f5f5f5
      }
    }

    .search-bar {
      width: 100vw;
      height: 120px;
      padding-top 0.133rem
      padding-bottom 0
      backdrop-filter: saturate(200%) blur(6px);
      background: rgba(255, 255, 255, 0.8);

      ::v-deep .van-cell {
        align-items center
        line-height: 0.6rem;

        input {
          margin-top: 1px;
          margin-left: 0.5rem;
          font-size: 0.3rem;
          line-height: 0.6rem;
        }
      }
    }
  }

  .com_sel_tabs {
    position fixed
    z-index 3
    left 0
    width 100vw
    top 120px
    margin-bottom 0
    padding 0px 0px 20px
    backdrop-filter: saturate(200%) blur(6px);
    background: rgba(255, 255, 255, 0.8);
  }

  .search_btn {
    margin 0 20px 0 15px
    font-size 0.3rem
  }

  .list-wrap {
    position: relative;
    z-index 1
    min-height: 100vh;
    padding-top 2.6rem
    padding-bottom: 120px;
    box-sizing: border-box;
  }
}
</style>
