<template>
  <div class="setting-page">
    <top-bar id="top-bar-wrap" />
    <h3 class="af_title" @dblclick="hideApSelect=false">{{ $t('setting.other.title') }}</h3>
    <van-cell center :title="$t('setting.other.lang')" is-link :label="lang.value" @click="lang.show = true" />
    <van-cell center :title="$t('setting.layout.title')" is-link :label="wfType.value" @click="wfType.show = true" />
    <van-cell center :title="$t('setting.img_res.title')" is-link :label="imgRes.value" @click="imgRes.show = true" />
    <van-cell center :title="$t('setting.dark.title')" :label="$t('setting.lab.title')">
      <template #right-icon>
        <van-switch :value="isDark" size="24" @change="onDarkChange" />
      </template>
    </van-cell>
    <van-cell center :title="$t('setting.other.swipe_toggle')" :label="$t('setting.lab.title')">
      <template #right-icon>
        <van-switch :value="enableSwipe" size="24" @change="changeEnableSwipe" />
      </template>
    </van-cell>
    <van-cell center :title="$t('eioSClGw9BqryzojTwr8j')" :label="$t('setting.lab.title')">
      <template #right-icon>
        <van-switch :value="isPageEffectOn" size="24" @change="changePageEffect" />
      </template>
    </van-cell>
    <van-cell center :title="$t('5syY7l774noiN5LHKUnqF')" :label="$t('setting.lab.title')">
      <template #right-icon>
        <van-switch :disabled="isLongpressBlock" :value="isLongpressDL" size="24" @change="changeLongpressDL" />
      </template>
    </van-cell>
    <van-cell center :title="$t('kFOiZTwKWwXy-sxaspqSD')" :label="$t('setting.lab.title')">
      <template #right-icon>
        <van-switch :disabled="isLongpressDL" :value="isLongpressBlock" size="24" @change="changeLongpressBlock" />
      </template>
    </van-cell>
    <van-cell center :title="$t('setting.other.manual_input')" :label="$t('setting.other.manual_input_label')">
      <template #right-icon>
        <van-switch v-model="hideApSelect" size="24" />
      </template>
    </van-cell>
    <van-cell v-if="hideApSelect" center :title="$t('setting.img_proxy.title')" is-link :label="pximgBed.value" @click="pximgBed.show = true" />
    <van-cell v-if="!appConfig.useLocalAppApi && hideApSelect" center :title="$t('setting.api.title')" is-link :label="hibiapi.value" @click="hibiapi.show = true" />
    <van-cell v-if="!hideApSelect" center :title="$t('setting.img_proxy.title2')" is-link :label="pximgBedLabel" @click="pximgBed_.show = true" />
    <van-cell v-if="!appConfig.useLocalAppApi && !hideApSelect" center :title="$t('setting.api.title2')" is-link :label="hibiapiLabel" @click="hibiapi_.show = true" />
    <template v-if="appConfig.useLocalAppApi">
      <van-cell v-if="isHelperInst" center :title="$t('setting.other.direct_mode.title')" :label="$t('setting.other.direct_mode.label')">
        <template #right-icon>
          <van-switch :value="appConfig.directMode" :disabled="appConfig.useApiProxy" size="24" @change="setDirectMode" />
        </template>
      </van-cell>
      <van-cell center :title="$t('setting.other.direct_mode.proxy.title')" :label="$t('setting.other.direct_mode.proxy.label')">
        <template #right-icon>
          <van-switch :value="appConfig.useApiProxy" :disabled="appConfig.directMode" size="24" @change="setUseApiProxy" />
        </template>
      </van-cell>
      <van-cell v-if="appConfig.useApiProxy" center :title="$t('setting.other.api_proxy.title')" is-link :label="apiProxyLabel||$t('setting.other.api_proxy.def_ph')" @click="apiProxySel.show = true" />
      <!-- <van-cell v-if="appConfig.directMode" center :title="$t('setting.other.direct_mode.host.title')" is-link :label="$t('setting.other.direct_mode.host.label')" @click="clearApiHosts" /> -->
      <van-cell v-if="appConfig.refreshToken" center :title="$t('setting.other.cp_token_title')" is-link :label="$t('setting.other.cp_token_label')" @click="copyToken" />
    </template>
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
      v-model="apiProxySel.show"
      :actions="apiProxySel.actions"
      :cancel-text="$t('common.cancel')"
      :description="$t('setting.other.api_proxy.sel_desc')"
      close-on-click-action
      @select="changeApiProxy"
    />
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
import { Dialog } from 'vant'
import PixivAuth from '@/api/client/pixiv-auth'
import { i18n } from '@/i18n'
import { checkImgAvailable, checkUrlAvailable, copyText, isURL } from '@/utils'
import { mintVerify } from '@/utils/filter'
import localDb from '@/utils/storage/localDb'
import { getCache, setCache } from '@/utils/storage/siteCache'
import { LocalStorage, SessionStorage } from '@/utils/storage'

const PXIMG_PROXYS = process.env.VUE_APP_PXIMG_PROXYS || ''
const HIBIAPI_ALTS = process.env.VUE_APP_HIBIAPI_ALTS || ''
const APP_API_PROXYS = process.env.VUE_APP_APP_API_PROXYS || ''

export default {
  name: 'SettingOthers',
  components: {
  },
  data() {
    return {
      appConfig: { ...window.APP_CONFIG },
      isHelperInst: !!window.__httpRequest__,
      apiProxySel: {
        show: false,
        actions: APP_API_PROXYS.split(',').map((_value, i) => {
          return { name: `Proxy ${i}`, _value }
        }),
      },
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
        value: LocalStorage.get('PXV_WF_TYPE', 'Masonry'),
        actions: [
          { name: 'Masonry', subname: this.$t('setting.layout.m') },
          { name: 'Grid', subname: this.$t('setting.layout.g') },
          { name: 'Justified ', subname: this.$t('setting.layout.j') },
        ],
      },
      imgRes: {
        show: false,
        value: LocalStorage.get('PXV_DTL_IMG_RES', navigator.userAgent.includes('Mobile') ? 'Medium' : 'Large'),
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
          { name: 'en', subname: 'English' },
          { name: 'ja', subname: '日本語' },
          { name: 'ko', subname: '한국어' },
          { name: 'de', subname: 'Deutsch' },
          { name: 'fr', subname: 'Français' },
          { name: 'ru', subname: 'Русский' },
          { name: 'it', subname: 'Italiano' },
          { name: 'es', subname: 'Español' },
          { name: 'pt', subname: 'Português' },
          { name: 'el', subname: 'Ελληνικά' },
        ],
      },
      pximgChecked: true,
      apiChecked: true,
      hideApSelect: LocalStorage.get('__HIDE_AP_SEL', false),
      isDark: !!localStorage.getItem('PXV_DARK'),
      enableSwipe: LocalStorage.get('PXV_IMG_DTL_SWIPE', false),
      isPageEffectOn: LocalStorage.get('PXV_PAGE_EFFECT', false),
      isLongpressDL: LocalStorage.get('PXV_LONGPRESS_DL', false),
      isLongpressBlock: LocalStorage.get('PXV_LONGPRESS_BLOCK', false),
    }
  },
  head() {
    return { title: this.$t('setting.other.title') }
  },
  computed: {
    pximgBedLabel() {
      return this.pximgBed_.actions.find(e => e._value == this.pximgBed_.value)?.name || ''
    },
    hibiapiLabel() {
      return this.hibiapi_.actions.find(e => e._value == this.hibiapi_.value)?.name || ''
    },
    apiProxyLabel() {
      return this.apiProxySel.actions.find(e => e._value == this.appConfig.apiProxy)?.name || ''
    },
  },
  watch: {
    hideApSelect(val) {
      LocalStorage.set('__HIDE_AP_SEL', val)
      if (val) {
        LocalStorage.set('HIBIAPI_BASE', process.env.VUE_APP_DEF_HIBIAPI_MAIN)
        LocalStorage.set('PXIMG_PROXY', process.env.VUE_APP_DEF_PXIMG_MAIN)
      }
      setTimeout(() => {
        location.reload()
      }, 500)
    },
  },
  methods: {
    copyToken() {
      const t = this.appConfig.refreshToken
      if (!t) return
      copyText(t, () => this.$toast(this.$t('tips.copylink.succ')), err => this.$toast(this.$t('tips.copy_err') + ': ' + err))
    },
    async saveConfig() {
      PixivAuth.writeConfig(this.appConfig)
      setTimeout(() => {
        location.reload()
      }, 500)
    },
    async setDirectMode(val) {
      if (val) {
        const res = await Dialog.confirm({
          title: this.$t('setting.other.direct_mode.confirm.title'),
          message: this.$t('setting.other.direct_mode.confirm.msg') + '<br><br><a href="https://210.140.92.180/" target="_blank" rel="noreferrer">https://210.140.92.180/</a>',
          confirmButtonText: this.$t('common.confirm'),
          cancelButtonText: this.$t('common.cancel'),
        })
        if (res == 'cancel') return
        window.umami?.track('setDirectMode')
        this.appConfig.directMode = true
        await this.$nextTick()
        await this.saveConfig()
      } else {
        this.appConfig.directMode = false
        await this.$nextTick()
        await this.saveConfig()
      }
    },
    async setUseApiProxy(val) {
      if (val) {
        const res = await Dialog.confirm({
          title: this.$t('setting.other.direct_mode.confirm.proxy_title'),
          message: this.$t('setting.other.direct_mode.confirm.proxy_msg'),
          confirmButtonText: this.$t('common.confirm'),
          cancelButtonText: this.$t('common.cancel'),
        })
        if (res == 'cancel') return
        window.umami?.track('setUseApiProxy')
        this.appConfig.useApiProxy = true
        await this.$nextTick()
        await this.saveConfig()
      } else {
        this.appConfig.useApiProxy = false
        await this.$nextTick()
        await this.saveConfig()
      }
    },
    async clearApiHosts() {
      const res = await Dialog.confirm({
        message: this.$t('setting.other.direct_mode.host_msg'),
        confirmButtonText: this.$t('common.confirm'),
        cancelButtonText: this.$t('common.cancel'),
      })
      if (res == 'cancel') return
      delete this.appConfig.apiHosts
      await this.saveConfig()
    },
    async changeApiProxy({ _value }) {
      this.appConfig.apiProxy = _value
      window.umami?.track('set_api_proxy', { _value })
      await this.saveConfig()
    },
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
      LocalStorage.set('PXV_WF_TYPE', name)
      setTimeout(() => {
        location.reload()
      }, 500)
    },
    changeImgRes({ name }) {
      this.imgRes.value = name
      window.umami?.track('set_img_res', { img_res: name })
      LocalStorage.set('PXV_DTL_IMG_RES', name)
      setTimeout(() => {
        location.reload()
      }, 500)
    },
    onDarkChange(val) {
      window.umami?.track(`set_dark_${val}`)
      this.isDark = val
      this.$nextTick(() => {
        localStorage.setItem('PXV_DARK', val || '')
        setTimeout(() => {
          location.reload()
        }, 500)
      })
    },
    changeEnableSwipe(val) {
      window.umami?.track(`changeEnableSwipe_${val}`)
      this.enableSwipe = val
      this.$nextTick(() => {
        LocalStorage.set('PXV_IMG_DTL_SWIPE', val)
        setTimeout(() => {
          location.reload()
        }, 500)
      })
    },
    changePageEffect(val) {
      this.isPageEffectOn = val
      this.$nextTick(() => {
        LocalStorage.set('PXV_PAGE_EFFECT', val)
        setTimeout(() => {
          location.reload()
        }, 500)
      })
    },
    changeLongpressDL(val) {
      this.isLongpressDL = val
      this.$nextTick(() => {
        LocalStorage.set('PXV_LONGPRESS_DL', val)
        setTimeout(() => {
          location.reload()
        }, 500)
      })
    },
    changeLongpressBlock(val) {
      this.isLongpressBlock = val
      this.$nextTick(() => {
        LocalStorage.set('PXV_LONGPRESS_BLOCK', val)
        setTimeout(() => {
          location.reload()
        }, 500)
      })
    },
    changeLang({ name }) {
      this.lang.value = name
      // i18n.locale = name
      window.umami?.track('set_lang', { lang: name })
      localStorage.setItem('PXV_LANG', name)
      setTimeout(() => {
        location.reload()
      }, 500)
    },
    async checkURL(val, checkFn) {
      if (!isURL(val)) {
        const isOK = await mintVerify(val, true)
        if (isOK) {
          Dialog.alert({
            title: 'Error',
            confirmButtonText: 'Close',
            message: 'Invalid URL input.',
          }).then(() => {
            location.reload()
          })
        } else {
          Dialog.alert({
            width: '9rem',
            title: 'U3VuIG9mIEJlYWNo',
            confirmButtonText: 'Close',
            message: '<img src="https://upload-bbs.miyoushe.com/upload/2023/05/21/190122060/911b2f7ef84a863194dfb247c2dfdac9_4125491471312265373.png" alt style="width:100%">',
          }).then(() => {
            location.reload()
          })
        }
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
  .van-cell__title
    padding-right 20px
</style>
