<template>
  <div class="setting-page">
    <top-bar id="top-bar-wrap" />
    <h3 class="af_title">{{ $t('setting.other.title') }}</h3>
    <van-cell center :title="$t('setting.other.lang')" is-link :label="lang.value" @click="lang.show = true" />
    <van-cell center :title="$t('setting.dark.title')" :label="$t('setting.lab.title')">
      <template #right-icon>
        <van-switch :value="isDark" size="24" @change="onDarkChange" />
      </template>
    </van-cell>
    <van-cell center :title="$t('setting.layout.title')" is-link :label="wfType.value" @click="wfType.show = true" />
    <van-cell center :title="$t('setting.img_res.title')" is-link :label="imgRes.value" @click="imgRes.show = true" />
    <van-cell center :title="'手动输入地址'" :label="'下方图片代理与 API 实例地址是否手动输入'">
      <template #right-icon>
        <van-switch v-model="hideApSelect" size="24" />
      </template>
    </van-cell>
    <van-cell v-if="hideApSelect" center :title="$t('setting.img_proxy.title')" is-link :label="pximgBed.value" @click="pximgBed.show = true" />
    <van-cell v-if="hideApSelect" center :title="$t('setting.api.title')" is-link :label="hibiapi.value" @click="hibiapi.show = true" />
    <van-cell v-if="!hideApSelect" center :title="$t('setting.img_proxy.title2')" is-link :label="pximgBedLabel" @click="pximgBed_.show = true" />
    <van-cell v-if="!hideApSelect" center :title="$t('setting.api.title2')" is-link :label="hibiapiLabel" @click="hibiapi_.show = true" />
    <van-dialog
      v-model="pximgBed.show"
      width="9rem"
      :title="$t('setting.img_proxy.title3')"
      show-cancel-button
      :cancel-button-text="$t('common.cancel')"
      :confirm-button-text="$t('common.confirm')"
      @confirm="changePximgBed"
    >
      <van-cell>{{ $t('setting.img_proxy.desc') }}</van-cell>
      <van-cell>{{ $t('setting.img_proxy.desc2') }}</van-cell>
      <van-field v-model="pximgBed.value" :label="$t('setting.input')" label-width="3.5em" :placeholder="$t('setting.img_proxy.title4')" />
    </van-dialog>
    <van-dialog
      v-model="hibiapi.show"
      width="9rem"
      :title="$t('setting.api.title4')"
      show-cancel-button
      :cancel-button-text="$t('common.cancel')"
      :confirm-button-text="$t('common.confirm')"
      @confirm="changeHibiapi"
    >
      <van-cell>{{ $t('setting.api.desc') }}</van-cell>
      <van-cell>{{ $t('setting.api.desc2') }}</van-cell>
      <van-cell>{{ $t('setting.api.desc3') }} <a href="https://github.com/mixmoe/HibiAPI">🔗Github</a> {{ $t('setting.api.desc4') }}</van-cell>
      <van-cell>{{ $t('setting.api.desc5') }}</van-cell>
      <van-field v-model="hibiapi.value" :label="$t('setting.input')" label-width="3.5em" :placeholder="$t('setting.api.title3')" />
    </van-dialog>
    <van-action-sheet
      v-model="wfType.show"
      :actions="wfType.actions"
      :cancel-text="$t('common.cancel')"
      :description="$t('setting.layout.ph')"
      close-on-click-action
      @select="changeWfType"
    />
    <van-action-sheet
      v-model="imgRes.show"
      :actions="imgRes.actions"
      :cancel-text="$t('common.cancel')"
      :description="$t('setting.img_res.ph')"
      close-on-click-action
      @select="changeImgRes"
    />
    <van-action-sheet
      v-model="lang.show"
      :actions="lang.actions"
      :cancel-text="$t('common.cancel')"
      :description="$t('setting.other.lang_ph')"
      close-on-click-action
      @select="changeLang"
    />
    <van-action-sheet
      v-model="pximgBed_.show"
      :actions="pximgBed_.actions"
      :cancel-text="$t('common.cancel')"
      :description="$t('setting.img_proxy.ph')"
      close-on-click-action
      :class="{ 'img-chk': !pximgChecked }"
      @open="checkImgAvailable"
      @select="changePximgBed_"
    />
    <van-action-sheet
      v-model="hibiapi_.show"
      :actions="hibiapi_.actions"
      :cancel-text="$t('common.cancel')"
      :description="$t('setting.api.ph')"
      close-on-click-action
      class="hibiapi-actions"
      :class="{ 'api-chk': !apiChecked }"
      @open="checkApiAvailable"
      @select="changeHibiapi_"
    />
  </div>
</template>

<script>
import { LocalStorage, SessionStorage } from '@/utils/storage'
import localDb from '@/utils/localDb'
import { getCache, setCache } from '@/utils/siteCache'
import { i18n } from '@/i18n'
import { isURL, checkImgAvailable, checkUrlAvailable } from '@/utils'
import { Dialog } from 'vant'

const PXIMG_PROXYS = process.env.VUE_APP_PXIMG_PROXYS || ''
const HIBIAPI_ALTS = process.env.VUE_APP_HIBIAPI_ALTS || ''

export default {
  name: 'SettingOthers',
  components: {
  },
  data() {
    return {
      pximgBed: {
        show: false,
        value: LocalStorage.get('PXIMG_PROXY', process.env.VUE_APP_DEF_PXIMG_MAIN),
      },
      pximgBed_: {
        show: false,
        value: LocalStorage.get('PXIMG_PROXY', process.env.VUE_APP_DEF_PXIMG_MAIN),
        actions: PXIMG_PROXYS.split(';').map(e => {
          const [name, _value] = e.split(',')
          return { name, _value }
        }),
      },
      hibiapi: {
        show: false,
        value: LocalStorage.get('HIBIAPI_BASE', process.env.VUE_APP_DEF_HIBIAPI_MAIN),
      },
      hibiapi_: {
        show: false,
        value: LocalStorage.get('HIBIAPI_BASE', process.env.VUE_APP_DEF_HIBIAPI_MAIN),
        actions: HIBIAPI_ALTS.split(';').map(e => {
          const [name, _value] = e.split(',')
          return { name, _value }
        }),
      },
      wfType: {
        show: false,
        value: LocalStorage.get('__WF_TYPE', 'Masonry'),
        actions: [
          { name: 'Masonry', subname: this.$t('setting.layout.m') },
          { name: 'Grid', subname: this.$t('setting.layout.g') },
          { name: 'Justified ', subname: this.$t('setting.layout.j') },
        ],
      },
      imgRes: {
        show: false,
        value: LocalStorage.get('__DTL_IMG_RES', 'Large'),
        actions: [
          { name: 'Medium', subname: this.$t('setting.img_res.m') },
          { name: 'Large', subname: this.$t('setting.img_res.l') },
          { name: 'Original', subname: this.$t('setting.img_res.o') },
        ],
      },
      lang: {
        show: false,
        value: i18n.locale,
        actions: [
          { name: 'zh-Hans', subname: '简体中文' },
          { name: 'zh-Hant', subname: '繁體中文' },
          { name: 'ja', subname: '日本語' },
          { name: 'en', subname: 'English' },
          { name: 'ko', subname: '한국어' },
          { name: 'fr', subname: 'Français' },
          { name: 'de', subname: 'Deutsch' },
          { name: 'ru', subname: 'Русский' },
          { name: 'it', subname: 'Italiano' },
        ],
      },
      pximgChecked: true,
      apiChecked: true,
      hideApSelect: LocalStorage.get('__HIDE_AP_SEL', true),
      isDark: !!localStorage.getItem('__PXV_DARK'),
    }
  },
  computed: {
    pximgBedLabel() {
      return this.pximgBed_.actions.find(e => e._value == this.pximgBed_.value)?.name || ''
    },
    hibiapiLabel() {
      return this.hibiapi_.actions.find(e => e._value == this.hibiapi_.value)?.name || ''
    },
  },
  watch: {
    hideApSelect(val) {
      LocalStorage.set('__HIDE_AP_SEL', val)
      if (val) {
        LocalStorage.set('HIBIAPI_BASE', process.env.VUE_APP_DEF_HIBIAPI_MAIN)
        LocalStorage.set('PXIMG_PROXY', process.env.VUE_APP_DEF_PXIMG_MAIN)
        setTimeout(() => {
          location.reload()
        }, 500)
      }
    },
  },
  methods: {
    async changePximgBed() {
      const url = `https://${this.pximgBed.value}`
      const res = await this.checkURL(url, () => {
        if (url == 'https://i-cf.pximg.net') return true
        return checkImgAvailable(`${url}/user-profile/img/2022/02/03/15/54/20/22159592_fce9f5c7a908c9b601dc7e9da7a412a3_50.jpg?_t=${Date.now()}`)
      })
      if (!res) return
      window.umami?.track('set_pximg', { set_pximg: this.pximgBed.value })
      LocalStorage.set('PXIMG_PROXY', this.pximgBed.value)
      SessionStorage.clear()
      await localDb.clear()
      setTimeout(() => {
        location.reload()
      }, 500)
    },
    async changePximgBed_({ _value }) {
      this.pximgBed_.value = _value
      window.umami?.track('change_pximg', { change_pximg: _value })
      LocalStorage.set('PXIMG_PROXY', _value)
      SessionStorage.clear()
      await localDb.clear()
      setTimeout(() => {
        location.reload()
      }, 500)
    },
    async changeHibiapi() {
      const url = this.hibiapi.value
      const res = await this.checkURL(url, () => {
        return checkUrlAvailable(`${url}/rank?_t=${Date.now()}`)
      })
      if (!res) return
      window.umami?.track('set_hibiapi', { set_hibiapi: this.hibiapi.value })
      LocalStorage.set('HIBIAPI_BASE', this.hibiapi.value)
      SessionStorage.clear()
      await localDb.clear()
      setTimeout(() => {
        location.reload()
      }, 500)
    },
    async changeHibiapi_({ _value }) {
      this.hibiapi_.value = _value
      window.umami?.track('change_hibiapi', { change_hibiapi: _value })
      LocalStorage.set('HIBIAPI_BASE', _value)
      SessionStorage.clear()
      await localDb.clear()
      setTimeout(() => {
        location.reload()
      }, 500)
    },
    changeWfType({ name }) {
      this.wfType.value = name
      window.umami?.track('set_wf_type', { wf_type: name })
      LocalStorage.set('__WF_TYPE', name)
      setTimeout(() => {
        location.reload()
      }, 500)
    },
    changeImgRes({ name }) {
      this.imgRes.value = name
      window.umami?.track('set_img_res', { img_res: name })
      LocalStorage.set('__DTL_IMG_RES', name)
      setTimeout(() => {
        location.reload()
      }, 500)
    },
    onDarkChange(val) {
      window.umami?.track(`set_dark_${val}`)
      this.isDark = val
      this.$nextTick(() => {
        localStorage.setItem('__PXV_DARK', val || '')
        setTimeout(() => {
          location.reload()
        }, 500)
      })
    },
    changeLang({ name }) {
      this.lang.value = name
      i18n.locale = name
      window.umami?.track('set_lang', { lang: name })
      localStorage.setItem('__PXV_LANG', name)
      setTimeout(() => {
        location.reload()
      }, 500)
    },
    async checkURL(val, checkFn) {
      if (!isURL(val)) {
        Dialog.alert({
          title: 'Error',
          confirmButtonText: 'Close',
          message: 'Invalid URL input.',
        }).then(() => {
          location.reload()
        })
        return false
      }
      const loading = this.$toast.loading({
        duration: 0,
        forbidClick: true,
        message: 'Loading',
      })
      try {
        await checkFn(val)
        loading.clear()
        return true
      } catch (error) {
        loading.clear()
        Dialog.alert({
          message: this.$t('tip.connect_err'),
          confirmButtonText: 'OK',
        }).then(() => {
          location.reload()
        })
        return false
      }
    },
    async checkApiAvailable() {
      const ck = 'setting.apiChk'
      const isChk = await getCache(ck, false)
      this.apiChecked = isChk
      if (isChk) return
      this.hibiapi_.actions.forEach(async e => {
        this.$set(e, 'loading', true)
        const startTime = Date.now()
        try {
          const resp = await fetch(`${e._value}/rank?_t=${startTime}`)
          if (!resp.ok) throw new Error('Resp not ok.')
          const duration = Date.now() - startTime
          this.$set(e, 'subname', `${duration}ms`)
          this.$set(e, 'loading', false)
          if (duration > 1000) {
            this.$set(e, 'color', 'grey')
          } else if (duration < 500) {
            this.$set(e, 'color', 'green')
          } else {
            this.$set(e, 'color', 'orange')
          }
        } catch (error) {
          this.$set(e, 'loading', false)
          this.$set(e, 'subname', '-1ms')
          this.$set(e, 'color', 'red')
        }
      })
      setCache(ck, true, 60 * 60 * 6)
    },
    async checkImgAvailable() {
      const ck = 'setting.imgChk'
      const isChk = await getCache(ck, false)
      this.pximgChecked = isChk
      if (isChk) return
      this.pximgBed_.actions.forEach(async e => {
        this.$set(e, 'loading', true)
        const startTime = Date.now()
        let img = document.createElement('img')
        img.referrerPolicy = 'no-referrer'
        img.src = `https://${e._value}/user-profile/img/2022/02/03/15/54/20/22159592_fce9f5c7a908c9b601dc7e9da7a412a3_50.jpg?_t=${startTime}`
        img.onload = () => {
          const duration = Date.now() - startTime
          this.$set(e, 'subname', `${duration}ms`)
          this.$set(e, 'loading', false)
          if (duration > 1000) {
            this.$set(e, 'color', '#969799')
          } else if (duration < 500) {
            this.$set(e, 'color', 'green')
          } else {
            this.$set(e, 'color', 'orange')
          }
          img = null
        }
        img.onerror = () => {
          this.$set(e, 'loading', false)
          this.$set(e, 'subname', '-1ms')
          this.$set(e, 'color', 'red')
          img = null
        }
      })
      setCache(ck, true, 60 * 60 * 6)
    },
  },
}
</script>

<style lang="stylus" scoped>
.setting-page
  min-height 80vh
  #top-bar-wrap
    width 1.4rem
</style>
