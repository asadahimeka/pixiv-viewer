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
        <van-switch active-color="#536cb8" :value="currentSETTING.showAi" size="24" @input="onAIChange($event)" />
      </template>
    </van-cell>
  </div>
</template>

<script>
// import { resetCookieOnce, setCookieOnce } from '@/utils'
import { Dialog } from 'vant'
import { mapState, mapActions } from 'vuex'

export default {
  name: 'SettingContentsDisplay',
  data() {
    return {
      currentSETTING: {
        r18: false,
        r18g: false,
        showAi: false,
      },
    }
  },
  computed: {
    ...mapState(['SETTING']),
  },
  mounted() {
    this.currentSETTING = JSON.parse(JSON.stringify(this.SETTING))
  },
  methods: {
    saveSwitchValues() {
      this.$nextTick(() => {
        this.saveSETTING(JSON.parse(JSON.stringify(this.currentSETTING)))
      })
    },
    onAIChange(checked) {
      this.$set(this.currentSETTING, 'showAi', checked)
      this.saveSwitchValues()
      // window.umami?.(`set_ai_switch_${checked}`)
    },
    onR18Change(checked, type) {
      let name
      if (type === 1) name = 'R-18'
      if (type === 2) name = 'R-18G'

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
              // window.umami?.(`set_r18_switch_${checked}`)
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
              // window.umami?.(`set_r18g_switch_${checked}`)
            }
            this.saveSwitchValues()
            // setCookieOnce('nsfw', '1')
            type === 1 && setTimeout(() => {
              location.reload()
            }, 500)
          })
          .catch(() => {
            console.log('操作取消')
          })
      } else {
        // resetCookieOnce('nsfw')
        if (type === 1) this.currentSETTING.r18 = checked
        if (type === 2) this.currentSETTING.r18g = checked
        this.saveSwitchValues()
      }
    },
    ...mapActions(['saveSETTING']),
  },
}
</script>

<style lang="stylus" scoped>

</style>
