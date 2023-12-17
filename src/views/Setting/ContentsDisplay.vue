<template>
  <div class="setting-page">
    <top-bar id="top-bar-wrap" />
    <h3 class="af_title">{{ $t('display.title') }}</h3>
    <van-cell center :title="$t('display.r18')" :label="$t('display.r18_label')">
      <template #right-icon>
        <van-switch active-color="#fb7299" :value="currentSETTING.r18" size="24" @input="onR18Change($event, 1)" />
      </template>
    </van-cell>
    <van-cell center :title="$t('display.r18g')" :label="$t('display.r18g_label')">
      <template #right-icon>
        <van-switch active-color="#ff3f3f" :value="currentSETTING.r18g" size="24" @input="onR18Change($event, 2)" />
      </template>
    </van-cell>
    <van-cell center :title="$t('display.ai')" :label="$t('display.ai_label')">
      <template #right-icon>
        <van-switch active-color="#536cb8" :value="currentSETTING.ai" size="24" @input="onAIChange($event)" />
      </template>
    </van-cell>
    <van-cell center :title="$t('3HnNTIScyvd1cNc2qAh7X')" :label="$t('qmd5JADeSGtrvucK3TnGb')">
      <template #right-icon>
        <van-switch v-model="isHideRankManga" size="24" @change="changeHideRankManga" />
      </template>
    </van-cell>
    <van-field
      v-model="blockTags"
      rows="2"
      autosize
      :label="$t('display.block_tags')"
      type="textarea"
      :placeholder="$t('display.block_tags_ph')"
    >
      <template #button>
        <van-button size="small" type="info" @click="saveBlockTags">{{ $t('common.save') }}</van-button>
      </template>
    </van-field>
    <van-field
      v-model="blockUids"
      rows="2"
      autosize
      :label="$t('display.block_uids')"
      type="textarea"
      :placeholder="$t('display.block_uids_ph')"
    >
      <template #button>
        <van-button size="small" type="info" @click="saveBlockUids">{{ $t('common.save') }}</van-button>
      </template>
    </van-field>
  </div>
</template>

<script>
// import { resetCookieOnce, setCookieOnce } from '@/utils'
import { LocalStorage } from '@/utils/storage'
import { Dialog } from 'vant'
import { mapState, mapActions } from 'vuex'

export default {
  name: 'SettingContentsDisplay',
  data() {
    return {
      blockTags: '',
      blockUids: '',
      currentSETTING: {
        r18: false,
        r18g: false,
        ai: false,
      },
      isHideRankManga: LocalStorage.get('PXV_HIDE_RANK_MANGA', false),
    }
  },
  head() {
    return { title: this.$t('display.title') }
  },
  computed: {
    ...mapState(['SETTING']),
  },
  mounted() {
    this.currentSETTING = JSON.parse(JSON.stringify(this.SETTING))
  },
  activated() {
    this.blockTags = LocalStorage.get('PXV_B_TAGS', '')
    this.blockUids = LocalStorage.get('PXV_B_UIDS', '')
  },
  methods: {
    saveSwitchValues() {
      this.$nextTick(() => {
        this.saveSETTING(JSON.parse(JSON.stringify(this.currentSETTING)))
      })
    },
    saveBlockTags() {
      LocalStorage.set('PXV_B_TAGS', this.blockTags)
      setTimeout(() => {
        location.reload()
      }, 100)
    },
    saveBlockUids() {
      LocalStorage.set('PXV_B_UIDS', this.blockUids)
      setTimeout(() => {
        location.reload()
      }, 100)
    },
    changeHideRankManga(val) {
      this.isHideRankManga = val
      this.$nextTick(() => {
        LocalStorage.set('PXV_HIDE_RANK_MANGA', val)
        setTimeout(() => {
          location.reload()
        }, 500)
      })
    },
    onAIChange(checked) {
      this.$set(this.currentSETTING, 'ai', checked)
      this.saveSwitchValues()
      window.umami?.track(`set_ai_switch_${checked}`)
    },
    onR18Change(checked, type) {
      let name
      if (type === 1) name = 'R-18'
      if (type === 2) name = 'R-18G'

      window.umami?.track(`set_${name}_switch_${checked}`)

      if (checked) {
        Dialog.confirm({
          message: this.$t('display.confirm', [name]),
          confirmButtonColor: 'black',
          cancelButtonColor: '#1989fa',
          closeOnPopstate: true,
          cancelButtonText: this.$t('common.cancel'),
          confirmButtonText: this.$t('common.confirm'),
        })
          .then(() => {
            if (type === 1) {
              this.currentSETTING.r18 = checked
              LocalStorage.set('PXV_NSFW_ON', 1)
            }
            if (type === 2) {
              this.currentSETTING.r18g = checked
              setTimeout(() => {
                Dialog.alert({
                  message: this.$t('display.confirm_g', [name]),
                  confirmButtonText: this.$t('common.confirm'),
                }).then(() => {
                  location.reload()
                })
              }, 200)
              LocalStorage.set('PXV_NSFW_ON', 1)
            }
            this.saveSwitchValues()
            type === 1 && setTimeout(() => {
              location.reload()
            }, 200)
          })
          .catch(() => {
            console.log('操作取消')
          })
      } else {
        LocalStorage.remove('PXV_NSFW_ON')
        if (type === 1) this.currentSETTING.r18 = checked
        if (type === 2) this.currentSETTING.r18g = checked
        this.saveSwitchValues()
        setTimeout(() => {
          location.reload()
        }, 200)
      }
    },
    ...mapActions(['saveSETTING']),
  },
}
</script>

<style lang="stylus" scoped>
.setting-page
  .van-cell__title
    padding-right 20px
</style>
