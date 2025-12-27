<template>
  <div class="member-tags">
    <div class="member-tag" style="background: #375fd7;color: #fff;" @click="setRestrict('public')">
      <div class="member-tag-main">
        <span>{{ $t('tMMgcuNAMSfxgPmaTDPuN') }}</span>
        <van-icon v-if="restrict == 'public'" class="member-tag-check" name="checked" />
      </div>
    </div>
    <div class="member-tag" style="background: #ed4675;color: #fff;" @click="setRestrict('private')">
      <div class="member-tag-main">
        <span>{{ $t('WUegrN0Qk6zuHdl9EHUa-') }}</span>
        <van-icon v-if="restrict == 'private'" class="member-tag-check" name="checked" />
      </div>
    </div>
    <van-loading v-if="loading && !showAllTags" size="0.7rem" />
    <div v-if="selTagItem" class="member-tag" :style="selTagItem.style" @click="setSelTag(selTag)">
      <div class="member-tag-main">
        <span>#{{ selTag }}</span>
        <van-tag v-if="selTagItem" class="member-tag-cnt">{{ selTagItem.count }}</van-tag>
        <van-icon class="member-tag-close" name="cross" />
      </div>
    </div>
    <template v-else>
      <div v-for="t in tagsDisplay" :key="t.name" class="member-tag" :style="t.style" @click="setSelTag(t.name)">
        <div class="member-tag-main">#{{ t.name }}</div>
      </div>
    </template>
    <div
      v-if="!loading && !selTag"
      class="member-tag"
      style="background: #efefef;color: #333;"
      @click="showAllTags = true"
    >
      {{ $t('Tx35SIS0MBLD-pgz1XgXh') }}
    </div>

    <van-popup
      v-model="showAllTags"
      round
      closeable
      get-container="body"
      style="width: 80vw;max-width: 10rem;height:60vh;overflow: hidden;"
    >
      <van-list
        v-if="showAllTags"
        v-model="loading"
        :loading-text="$t('tips.loading')"
        :finished="finished"
        :finished-text="$t('tips.no_more')"
        :error.sync="error"
        :error-text="$t('tips.net_err')"
        :offset="800"
        style="height: 90%;margin-top: 0.7rem;overflow-y: auto;"
        @load="getList()"
      >
        <div class="member-tags popup">
          <div v-for="t in tags" :key="t.name" class="member-tag" :style="t.style" @click="setSelTag(t.name, true)">
            <div class="member-tag-main">
              <span>#{{ t.name }}</span>
              <van-tag v-if="t.count" class="member-tag-cnt" style="margin-right: 0;">{{ t.count }}</van-tag>
            </div>
          </div>
        </div>
      </van-list>
    </van-popup>
  </div>
</template>

<script>
import { localApi } from '@/api'
import { generateRandomColor, getContrastingTextColor } from '@/utils'

export default {
  name: 'BookmarkTags',
  props: {
    type: { type: String, required: true },
  },
  data() {
    return {
      curPage: 1,
      selTag: '',
      restrict: 'public',
      showAllTags: false,
      tags: [],
      error: false,
      loading: false,
      finished: false,
    }
  },
  computed: {
    tagsDisplay() {
      return this.tags.slice(0, 20)
    },
    selTagItem() {
      return this.tags.find(e => e.name == this.selTag)
    },
  },
  created() {
    this.getList()
  },
  methods: {
    async getList() {
      this.loading = true
      const res = await localApi.userBookmarkTags(this.curPage, this.restrict, this.type)
      console.log('res: ', res)
      this.loading = false
      if (res.status === 0) {
        if (!res.data.length) {
          this.finished = true
          return
        }
        this.tags = this.tags.concat(res.data).map(e => ({ ...e, style: e.style || this.getTagStyle() }))
        this.curPage++
      } else {
        this.error = true
        this.$toast({
          message: res.msg,
        })
      }
    },
    reset() {
      this.curPage = 1
      this.selTag = ''
      this.restrict = 'public'
      this.tags = []
      this.error = false
      this.loading = false
      this.finished = false
    },
    setRestrict(val) {
      window.umami?.track('bookmark_tags_restrict', { val })
      this.reset()
      this.restrict = val
      this.getList()
      this.$emit('update-restrict', val)
    },
    setSelTag(tag, isPopup = false) {
      this.selTag = tag == this.selTag ? '' : tag
      this.$emit('update-sel-tag', this.selTag)
      if (isPopup) {
        this.showAllTags = false
      }
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
.member-tags
  display flex
  flex-wrap wrap
  gap 10px
  margin-bottom 40px
  padding: 0.3rem

  @media screen and (max-width: 1200px)
    &:not(.popup)
      flex-wrap nowrap
      margin-bottom 30px
      padding-bottom 10px
      overflow-x auto
      .member-tag
        min-width fit-content

.member-tag
  position relative
  display flex
  justify-content center
  align-items center
  flex-direction column
  gap 5px
  border-radius: 4PX
  min-height: 50px
  padding 5px 28px
  cursor pointer
  font-size 18px

  &-main
    display flex
    align-items center
    gap 10px
    font-weight bold
    font-size 20px

  &-cnt
    margin-right 0.1rem

  &-close
    font-size: 1.2em
    font-weight: bold

  &-check
    position: absolute
    top: -0.1rem
    right: -0.1rem
    font-size: 1.5em
    color: #5fe96b

</style>
