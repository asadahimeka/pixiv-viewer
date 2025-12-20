<template>
  <div v-if="artwork && artwork.id" class="artwork-meta">
    <div class="author-info isAutoLoadKissT">
      <div class="name-box">
        <h2 class="title">{{ artwork.title }}</h2>
        <div class="author" @click="toAuthor(artwork.userId)">
          {{ artwork.userName }}
        </div>
      </div>
    </div>
    <div class="date">
      <span class="view">
        <Icon name="view" class="icon" />
        {{ convertToK(artwork.viewCount) }}
      </span>
      <span class="like">
        <Icon name="like" class="icon" />
        {{ convertToK(artwork.bookmarkCount) }}
      </span>
      <span class="created">{{ formatDate(artwork.publishedDateTime) }}</span>
    </div>
    <div class="pid_link">
      <a
        target="_blank"
        rel="noreferrer"
        :href="'https://www.pixiv.net/collections/' + artwork.id"
      >
        {{ artwork.id }}
      </a>
    </div>
    <ul class="tag-list">
      <li v-if="artwork.xRestrict > 0">
        <van-tag class="x_tag" size="large" type="danger">NSFW</van-tag>
      </li>
      <template v-for="(tag, ti) in artwork.tags.tags">
        <li
          :key="ti + tag.tag + '_1'"
          class="tag name"
          @click="toSearch(tag.tag)"
        >
          #{{ tag.tag }}
        </li>
        <li
          v-if="showTranslatedTags && tag.translation && tag.translation.en"
          :key="ti + tag.translation.en + '_2'"
          class="tag translated"
          @click="toSearch(tag.translation.en)"
        >
          {{ tag.translation.en }}
        </li>
      </template>
    </ul>
    <div class="caption" @click.stop.prevent="handleClick($event)" v-html="artwork.caption"></div>
  </div>
</template>

<script>
import { formatIntlDate, formatIntlNumber } from '@/utils'
import { i18n, isCNLocale } from '@/i18n'

export default {
  name: 'CollectionMeta',
  props: {
    artwork: {
      type: Object,
      required: true,
    },
  },
  computed: {
    showTranslatedTags() {
      return i18n.locale.includes('zh')
    },
  },
  methods: {
    convertToK(val) {
      if (!val) return '-'
      if (isCNLocale()) return val
      return formatIntlNumber(+val)
    },
    formatDate(val) {
      return formatIntlDate(val)
    },
    handleClick(e) {
      if (e.target.tagName === 'A') {
        let url = e.target.href
        if (url.startsWith('pixiv://')) {
          url = url.replace('pixiv:/', '')
        }
        const to = this.$router.resolve(url)
        if (to.route.name == 'NotFound') {
          window.open(url, '_blank', 'noreferrer')
        } else {
          this.$router.push(to.href)
        }
      }
    },
    toAuthor(id) {
      this.$router.push({
        name: 'Users',
        params: { id },
      })
    },
    toSearch(keyword = '') {
      const params = new URLSearchParams()
      keyword.split(/\s+/).filter(Boolean).forEach(e => params.append('tags[]', e))
      this.$router.push(`/collections?${params}`)
    },
  },
}
</script>

<style lang="stylus" scoped>
.artwork-meta {
  position: relative;
  padding: 12px 20px;
  margin: 20px 0;

  .pid_link {
    position relative
    font-size: 22px;
    padding-left 30px
    a {
      color #0066FF
    }
    &:before {
      content:'🔗'
      position absolute
      left 0
      top 0
    }
  }

  .author-info {
    display flex
    margin: 10px 0 20px 0;

    .avatar {
      width: 86px;
      min-width: 86px;
      height: 86px;
      border-radius: 50%;
      overflow: hidden;
      margin-right: 18px;
    }

    .name-box {
      max-width calc(100% - 90px)
    }

    .name-box {
      height: 100%;
      .title {
        padding-top: 4px;
        margin-bottom: 8px;
        font-size: 32px;
      }

      .author {
        font-size: 22px;
        color: #9b9b9b;
        cursor pointer
      }
    }

    &.isAutoLoadKissT {
      .author {
        margin-top 20px
        font-size 24px
        line-height 1.2
        color #666
        &::before {
          content: 'by '
          color #999
        }
      }
      .name-box {
        max-width unset
      }
    }
  }

  .date {
    display flex
    align-items center
    flex-wrap wrap
    gap 16px
    font-size: 24px;
    color: #7c8f99;
    margin: 16px 0;
    line-height 1.5

    .view {
      min-width 100px
      color: #3366FF

      .icon {
        font-size: 1em;
        margin-right: 0px;
        vertical-align: -0.14em;
        color #8A6BBE
      }
    }

    .like {
      min-width 100px
      color: #0099FF

      .icon {
        width 1.1em
        font-size: 0.8em;
        margin-right: 0px;
        vertical-align: baseline;
      }
    }
  }

  .tag-list {
    display flex
    align-items center
    flex-wrap wrap
    color: #6633FF
    margin: 16px 0;
    overflow: hidden;

    .x_tag {
      margin-right 10px
      font-weight bold
      cursor auto !important
    }

    .tag {
      line-height: 42px;
      font-size: 26px;
      margin-right: 10px;
      cursor pointer
      background transparent
      border-radius 5px
      transition 0.2s
      &:not(.translated):hover {
        background #e1d7ff
      }
      &.translated {
        font-size: 22px;
        color: #adadad;
        margin-right: 20px;
      }
    }
  }

  .caption {
    font-size: 24px;
    line-height: 32px;
    word-break: break-all;

    ::v-deep a {
      color: #36a8f5;
    }
  }
}
</style>
