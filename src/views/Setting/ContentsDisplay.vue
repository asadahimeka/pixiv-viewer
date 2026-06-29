<template>
  <div class="setting-page">
    <top-bar id="top-bar-wrap" />
    <h3 class="af_title">{{ $t('display.title') }}</h3>
    <div>
      <van-cell center :title="$t('display.r18')" :label="$t('display.r18_label')">
        <template #right-icon>
          <van-switch active-color="#fb7299" :value="currentContentSetting.r18" size="24" @input="onR18Change($event, 1)" />
        </template>
      </van-cell>
      <van-cell center :title="$t('display.r18g')" :label="$t('display.r18g_label')">
        <template #right-icon>
          <van-switch active-color="#ff3f3f" :value="currentContentSetting.r18g" :disabled="!currentContentSetting.r18" size="24" @input="onR18Change($event, 2)" />
        </template>
      </van-cell>
      <van-cell center :title="$t('display.ai')" :label="$t('display.ai_label')">
        <template #right-icon>
          <van-switch active-color="#536cb8" :value="currentContentSetting.ai" size="24" @input="onAIChange($event)" />
        </template>
      </van-cell>
      <van-cell center :title="$t('3HnNTIScyvd1cNc2qAh7X')" :label="$t('qmd5JADeSGtrvucK3TnGb')">
        <template #right-icon>
          <van-switch :value="appSetting.isHideRankManga" size="24" @change="v => saveAppSetting('isHideRankManga', v)" />
        </template>
      </van-cell>
      <van-field
        v-if="clientConfig.useLocalAppApi"
        v-model="searchMinFavNum"
        type="digit"
        class="searchMinFavNum_field"
        :label="$t('mIfQo6LqzPPlvkV0XZM4X')"
        placeholder=" "
      >
        <template #button>
          <van-button size="small" type="info" @click="saveAppSetting('searchListMinFavNum', searchMinFavNum || '0')">{{ $t('common.save') }}</van-button>
        </template>
      </van-field>
    </div>
    <div class="block-section">
      <van-cell :title="$t('display.block_tags')" />
      <div class="block-tags-wrap">
        <van-tag
          v-for="(tag, i) in blockTagsList"
          :key="i"
          closeable
          size="medium"
          type="danger"
          plain
          @close="onDeleteBlockTag(tag)"
        >
          {{ tag }}
        </van-tag>
      </div>
      <van-field
        v-model="newBlockTag"
        :placeholder="$t('display.block_tags_ph')"
        clearable
        @keydown.enter="onAddBlockTag"
      >
        <template #button>
          <van-button size="small" type="info" @click="onAddBlockTag">{{ $t('common.save') }}</van-button>
        </template>
      </van-field>
    </div>
    <div class="block-section">
      <van-cell :title="$t('display.block_uids')" />
      <div class="block-tags-wrap">
        <van-tag
          v-for="(uid, i) in blockUidsList"
          :key="i"
          closeable
          size="medium"
          type="warning"
          plain
          @close="onDeleteBlockUid(uid)"
        >
          {{ uid }}
        </van-tag>
      </div>
      <van-field
        v-model="newBlockUid"
        :placeholder="$t('display.block_uids_ph')"
        clearable
        @keydown.enter="onAddBlockUid"
      >
        <template #button>
          <van-button size="small" type="info" @click="onAddBlockUid">{{ $t('common.save') }}</van-button>
        </template>
      </van-field>
    </div>
  </div>
</template>

<script>
import _ from '@/lib/lodash'
import { Dialog } from 'vant'
import { mapGetters, mapMutations } from 'vuex'
import store from '@/store'
import { localApi } from '@/api'
import { LocalStorage } from '@/utils/storage'

export default {
  name: 'SettingContentsDisplay',
  data() {
    return {
      currentContentSetting: _.cloneDeep(store.state.contentSetting),
      blockTagsList: [],
      blockUidsList: [],
      newBlockTag: '',
      newBlockUid: '',
      clientConfig: { ...localApi.APP_CONFIG },
      searchMinFavNum: store.state.appSetting.searchListMinFavNum,
    }
  },
  head() {
    return { title: this.$t('display.title') }
  },
  computed: {
    ...mapGetters(['isLoggedIn']),
    appSetting() {
      return store.state.appSetting
    },
  },
  activated() {
    const tagsRaw = LocalStorage.get('PXV_B_TAGS', '')
    this.blockTagsList = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : []
    const uidsRaw = LocalStorage.get('PXV_B_UIDS', '')
    this.blockUidsList = uidsRaw ? uidsRaw.split(',').map(u => u.trim()).filter(Boolean) : []
  },
  methods: {
    ...mapMutations(['saveContentSetting']),
    saveSwitchValues() {
      this.$nextTick(() => {
        this.saveContentSetting(_.cloneDeep(this.currentContentSetting))
      })
    },
    onAddBlockTag() {
      if (!this.newBlockTag.trim()) return
      const tags = this.newBlockTag.split(',').map(t => t.trim()).filter(Boolean)
      if (!tags.length) return
      tags.forEach(tag => {
        if (!this.blockTagsList.includes(tag)) {
          this.blockTagsList.push(tag)
        }
      })
      const merged = _.uniq(this.blockTagsList)
      LocalStorage.set('PXV_B_TAGS', merged.join(','))
      this.blockTagsList = merged
      this.newBlockTag = ''
      setTimeout(() => location.reload(), 100)
    },
    async onDeleteBlockTag(tag) {
      try {
        await Dialog.confirm({
          title: '删除屏蔽标签',
          message: `确定删除屏蔽标签「${tag}」吗？`,
        })
        store.dispatch('removeBlockTag', tag)
        this.blockTagsList = this.blockTagsList.filter(t => t !== tag)
        setTimeout(() => location.reload(), 100)
      } catch (e) { /* cancelled */ }
    },
    onAddBlockUid() {
      if (!this.newBlockUid.trim()) return
      const uids = this.newBlockUid.split(',').map(u => u.trim()).filter(Boolean)
      if (!uids.length) return
      uids.forEach(uid => {
        if (!this.blockUidsList.includes(uid)) {
          this.blockUidsList.push(uid)
        }
      })
      const merged = _.uniq(this.blockUidsList)
      LocalStorage.set('PXV_B_UIDS', merged.join(','))
      this.blockUidsList = merged
      this.newBlockUid = ''
      setTimeout(() => location.reload(), 100)
    },
    async onDeleteBlockUid(uid) {
      try {
        await Dialog.confirm({
          title: '删除屏蔽作者',
          message: `确定删除屏蔽作者「${uid}」吗？`,
        })
        store.dispatch('removeBlockUid', uid)
        this.blockUidsList = this.blockUidsList.filter(u => u !== uid)
        setTimeout(() => location.reload(), 100)
      } catch (e) { /* cancelled */ }
    },
    saveAppSetting(key, val) {
      window.umami?.track(`set:${key}`, { val })
      store.commit('setAppSetting', { [key]: val })
      setTimeout(() => location.reload(), 200)
    },
    onAIChange(checked) {
      this.$set(this.currentContentSetting, 'ai', checked)
      this.saveSwitchValues()
      window.umami?.track(`set_ai_switch_${checked}`)
    },
    onR18Change(checked, type) {
      const name = ['', 'R-18', 'R-18G'][type]
      window.umami?.track(`set_${name}_switch_${checked}`)

      if (checked) {
        Dialog.confirm({
          message: this.$t('display.confirm', [name]),
          confirmButtonColor: 'black',
          cancelButtonColor: '#1989fa',
          closeOnPopstate: true,
          cancelButtonText: this.$t('common.cancel'),
          confirmButtonText: this.$t('common.confirm'),
        }).then(() => {
          if (type === 1) {
            this.currentContentSetting.r18 = checked
            LocalStorage.set('PXV_NSFW_ON', this.isLoggedIn ? 0 : 1)
            this.saveSwitchValues()
            setTimeout(() => {
              location.reload()
            }, 200)
          }
          if (type === 2) {
            this.currentContentSetting.r18g = checked
            LocalStorage.set('PXV_NSFW_ON', this.isLoggedIn ? 0 : 1)
            this.saveSwitchValues()
            setTimeout(() => {
              Dialog.alert({
                message: this.$t('display.confirm_g', [name]),
                confirmButtonText: this.$t('common.confirm'),
              }).then(() => {
                location.reload()
              })
            }, 200)
          }
        }).catch(() => {})
      } else {
        LocalStorage.remove('PXV_NSFW_ON')
        if (type === 1) this.currentContentSetting.r18 = checked
        if (type === 2) this.currentContentSetting.r18g = checked
        this.saveSwitchValues()
        setTimeout(() => {
          location.reload()
        }, 200)
      }
    },
  },
}
</script>

<style lang="stylus">
.setting-page
  .searchMinFavNum_field
    .van-field__label
      width 4rem
    .van-field__value .van-field__control
      padding-right .2rem
      text-align right
.dark
  .block-section .block-tags-wrap
    background #161616 !important
    .van-tag
      background inherit !important
      color #fff !important
      border-color #fff !important
</style>
<style lang="stylus" scoped>
.setting-page
  .van-cell__title
    padding-right 20px

.block-section
  margin-top 0.2rem
  .block-tags-wrap
    display flex
    flex-wrap wrap
    gap 3PX
    padding 8PX 16PX
    background #fff
</style>
