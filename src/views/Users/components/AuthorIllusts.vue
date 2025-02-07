<template>
  <div class="illusts">
    <template v-if="showTitle">
      <van-cell v-if="once" class="cell" :border="false" is-link @click="onClick()">
        <template #title>
          <span class="title">
            {{ $t('user.art_title', [iTypeText]) }}
            <span v-if="num" class="num">{{ $t('user.art_num', [num]) }}</span>
          </span>
        </template>
      </van-cell>
      <h3 v-else class="af_title">{{ $t('user.art_title', [authorName + iTypeText]) }}</h3>
    </template>
    <div v-if="iType == 'illust'" class="member-tags" :class="{ 'one-line': showAllTags }">
      <div v-for="t in memberTagsDisplay" :key="t.tag" class="member-tag" :style="getTagStyle()" @click="setSelTag(t.tag)">
        <div class="member-tag-main">
          <span>#{{ t.tag }}</span>
          <template v-if="selTag">
            <van-tag class="member-tag-cnt">{{ t.cnt }}</van-tag>
            <van-icon class="member-tag-close" name="cross" />
          </template>
        </div>
        <div v-if="t.tag_translation">{{ t.tag_translation }}</div>
      </div>
      <div
        v-if="!selTag && memberTags.length > 20 && !showAllTags"
        class="member-tag"
        style="background: #efefef;color: #333;"
        @click="showAllTags = true"
      >
        {{ $t('Tx35SIS0MBLD-pgz1XgXh') }}
      </div>
    </div>
    <van-list
      v-model="loading"
      :loading-text="$t('tips.loading')"
      :finished="finished"
      :finished-text="!once ? $t('tips.no_more') : ''"
      :error.sync="error"
      :offset="800"
      :error-text="$t('tips.net_err')"
      @load="getMemberArtwork()"
    >
      <wf-cont v-bind="$store.getters.wfProps" :layout="selTag ? 'Grid' : undefined">
        <ImageCard v-for="art in artList" :key="art.id" mode="all" :artwork="art" @click-card="toArtwork($event)" />
      </wf-cont>
    </van-list>
  </div>
</template>

<script>
import ImageCard from '@/components/ImageCard'
import api from '@/api'
import _ from 'lodash'
import { generateRandomColor, getContrastingTextColor } from '@/utils'

export default {
  name: 'AuthorIllusts',
  components: {
    ImageCard,
  },
  props: {
    id: {
      type: Number,
      required: true,
    },
    num: {
      type: Number,
    },
    once: {
      type: Boolean,
      default: false,
    },
    iType: {
      type: String,
      default: 'illust',
    },
    notFromArtwork: {
      type: Boolean,
      default: true,
    },
    showTitle: {
      type: Boolean,
      default: true,
    },
  },
  data() {
    return {
      curPage: 1,
      artList: [],
      error: false,
      loading: false,
      finished: false,
      memberTags: [],
      selTag: '',
      showAllTags: false,
      tagArtsCount: 0,
    }
  },
  computed: {
    authorName() {
      const n = this.artList[0]?.author.name
      return n ? `${n} - ` : ''
    },
    iTypeText() {
      const map = {
        illust: this.$t('common.illust'),
        manga: this.$t('common.manga'),
      }
      return map[this.iType]
    },
    memberTagsDisplay() {
      if (this.selTag) return this.memberTags.filter(e => e.tag == this.selTag)
      return this.showAllTags ? this.memberTags : this.memberTags.slice(0, 20)
    },
  },
  mounted() {
    console.log('AuthorIllusts mounted:', this.iType)
    this.init()
  },
  activated() {
    console.log('this.notFromArtwork: ', this.notFromArtwork)
    if (this.notFromArtwork) {
      this.init()
    }
  },
  methods: {
    init() {
      this.reset()
      this.getMemberTags()
      this.getMemberArtwork()
    },
    reset() {
      this.resetList()
      this.memberTags = []
      this.selTag = ''
      this.showAllTags = false
      this.tagArtsCount = 0
    },
    resetList() {
      this.curPage = 1
      this.error = false
      this.finished = false
      this.artList = []
    },
    setSelTag(tag) {
      this.resetList()
      if (tag == this.selTag) {
        this.selTag = ''
        this.tagArtsCount = 0
        this.getMemberArtwork()
        return
      }
      // window.umami?.track('sel_user_tag', { tag })
      this.selTag = tag
      this.getMemberTagArtworks()
    },
    async getMemberTags() {
      if (this.iType != 'illust') return
      const res = await api.getMemberTags(this.id)
      if (res.status === 0) {
        this.memberTags = res.data
      } else {
        this.$toast({ message: res.msg })
        this.memberTags = []
      }
    },
    getMemberTagArtworks: _.throttle(async function () {
      if (!this.id || this.iType != 'illust' || !this.selTag) return
      this.loading = true
      let newList = []
      const res = await api.getMemberTagArtworks(this.id, this.selTag, this.curPage)
      if (res.status === 0) {
        newList = res.data.works
        this.artList = _.uniqBy([
          ...this.artList,
          ...newList,
        ], 'id')

        this.loading = false

        this.tagArtsCount += res.data.currLen
        if (this.tagArtsCount >= res.data.total) {
          this.finished = true
          return
        }

        this.curPage++
      } else {
        this.$toast({
          message: res.msg,
        })
        this.loading = false
        this.error = true
      }
    }, 2500),
    getMemberArtwork: _.throttle(async function () {
      if (!this.id) return
      if (this.selTag) return this.getMemberTagArtworks()
      this.loading = true
      let newList
      const res = await api.getMemberArtwork(this.id, this.curPage, this.iType)
      if (res.status === 0) {
        newList = res.data
        if (this.once) newList = newList.slice(0, 10)
        this.artList = _.uniqBy([
          ...this.artList,
          ...newList,
        ], 'id')

        this.loading = false
        this.curPage++
        if (this.once || !newList.length) this.finished = true
      } else {
        this.$toast({
          message: res.msg,
        })
        this.loading = false
        this.error = true
      }
    }, 2500),
    toArtwork(id) {
      this.$store.dispatch('setGalleryList', this.artList)
      this.$router.push({
        name: 'Artwork',
        params: { id },
      })
    },
    onClick() {
      this.$emit('onCilck')
    },
    getTagStyle() {
      const background = generateRandomColor()
      return {
        background,
        color: getContrastingTextColor(background),
      }
    },
  },
}
</script>

<style lang="stylus" scoped>
.af_title {
  margin-top 30px
  margin-bottom 40px
  text-align center
  font-size 28px
}

member-tags-one-line() {
  flex-wrap nowrap
  margin-bottom 30px
  padding-bottom 10px
  overflow-x auto

  .member-tag {
    min-width fit-content
  }
}

.member-tags {
  display flex
  flex-wrap wrap
  gap 10px
  margin-top 20px
  margin-bottom 40px

  &.one-line {
    member-tags-one-line()
  }

  @media screen and (max-width: 1200px) {
    member-tags-one-line()
  }
}

.member-tag {
  position relative
  display flex
  justify-content center
  align-items center
  flex-direction column
  gap 5px
  border-radius: 4PX;
  min-height: 50px;
  padding 5px 28px
  cursor pointer
  font-size 18px

  &-main {
    font-weight bold
    font-size 20px
  }

  &-cnt {
    margin-right 0.4rem
  }

  &-close {
    position: absolute;
    top: 0.2rem;
    right: 0.2rem;
    font-size: 1.2em;
    font-weight: bold;
  }
}

.illusts {
  .cell {
    padding: 10px 20px;
  }

  .num {
    float: right;
    font-size: 26px;
    color: #888;
  }

  .card-box {
    padding: 0 12px;
    display: flex;
    flex-direction: row;

    .column {
      width: 50%;

      .image-card {
        max-height: 360px;
        margin: 4px 2px;
      }
    }
  }
}
</style>
