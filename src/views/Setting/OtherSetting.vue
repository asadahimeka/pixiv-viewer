<template>
  <div class="setting-page">
    <top-bar id="top-bar-wrap" />
    <h3 class="af_title">其他设置</h3>
    <van-cell center title="图片列表布局选择" is-link :label="wfType.value" @click="wfType.show = true" />
    <van-cell center title="pximg 图片代理选择" is-link :label="pximgBedLabel" @click="pximgBed.show = true" />
    <van-cell center title="HibiAPI 实例选择" is-link :label="hibiapiLabel" @click="hibiapi.show = true" />
    <van-action-sheet v-model="pximgBed.show" :actions="pximgBed.actions" cancel-text="取消"
      description="请选择 pixiv 图片代理 (切换后会清空本地缓存)" close-on-click-action @open="checkImgAvailable" @select="changePximgBed"
      :class="{ 'img-chk': !pximgChecked }" />
    <van-action-sheet v-model="hibiapi.show" :actions="hibiapi.actions" cancel-text="取消"
      description="请选择 HibiAPI 实例 (切换后会清空本地缓存)" close-on-click-action @open="checkApiAvailable" @select="changeHibiapi"
      class="hibiapi-actions" :class="{ 'api-chk': !apiChecked }" />
    <van-action-sheet v-model="wfType.show" :actions="wfType.actions" cancel-text="取消" description="请选择图片列表布局"
      close-on-click-action @select="changeWfType" />
  </div>
</template>

<script>
import { Cell, CellGroup, Switch, Button, ActionSheet } from "vant";
import { LocalStorage, SessionStorage } from "@/utils/storage";
import localDb from "@/utils/localDb"
import { getCache, setCache } from "@/utils/siteCache";

const PXIMG_PROXYS = process.env.VUE_APP_PXIMG_PROXYS || ''
const HIBIAPI_ALTS = process.env.VUE_APP_HIBIAPI_ALTS || ''

export default {
  name: "SettingOthers",
  data() {
    return {
      pximgBed: {
        show: false,
        value: LocalStorage.get('__PXIMG_PROXY', process.env.VUE_APP_DEF_PXIMG),
        actions: PXIMG_PROXYS.split(';').map(e => {
          const [name, _value] = e.split(',')
          return { name, _value }
        })
      },
      hibiapi: {
        show: false,
        value: LocalStorage.get('__HIBIAPI_BASE', process.env.VUE_APP_DEF_HIBIAPI),
        actions: HIBIAPI_ALTS.split(';').map(e => {
          const [name, _value] = e.split(',')
          return { name, _value }
        })
      },
      wfType: {
        show: false,
        value: LocalStorage.get('__WF_TYPE', 'Masonry'),
        actions: [
          { name: 'Masonry', subname: '等宽不等高' },
          { name: 'Grid', subname: '等宽等高' },
          { name: 'Justified ', subname: '等高不等宽' },
        ]
      },
      pximgChecked: true,
      apiChecked: true
    };
  },
  computed: {
    pximgBedLabel() {
      return this.pximgBed.actions.find(e => e._value == this.pximgBed.value)?.name || ''
    },
    hibiapiLabel() {
      return this.hibiapi.actions.find(e => e._value == this.hibiapi.value)?.name || ''
    }
  },
  methods: {
    async checkApiAvailable() {
      const ck = 'setting.apiChk'
      const isChk = await getCache(ck, false)
      this.apiChecked = isChk
      if (isChk) return
      this.hibiapi.actions.forEach(async (e) => {
        this.$set(e, 'loading', true)
        const startTime = Date.now()
        try {
          const resp = await fetch(`${e._value}/rank?_t=${startTime}`, { method: 'HEAD' })
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
      this.pximgBed.actions.forEach(async (e) => {
        this.$set(e, 'loading', true)
        const startTime = Date.now()
        let img = document.createElement('img')
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
    async changePximgBed({ _value }) {
      window.umami?.(`change_pximg_bed_${_value.replace(/[./]/g, '_')}`)
      this.pximgBed.value = _value
      LocalStorage.set('__PXIMG_PROXY', _value)
      SessionStorage.clear()
      await localDb.clear()
      setTimeout(() => {
        location.reload()
      }, 500)
    },
    async changeHibiapi({ _value }) {
      window.umami?.(`change_hibiapi_${_value.match(/https:\/\/(\w+)\.\w+\.\w+\/(\w+)\/.*/)?.slice(1).join('_')}`)
      this.hibiapi.value = _value
      LocalStorage.set('__HIBIAPI_BASE', _value)
      SessionStorage.clear()
      await localDb.clear()
      setTimeout(() => {
        location.reload()
      }, 500)
    },
    changeWfType({ name }) {
      window.umami?.(`change_wf_type_${name}`)
      this.wfType.value = name
      LocalStorage.set('__WF_TYPE', name)
      setTimeout(() => {
        location.reload()
      }, 500)
    },
  },
  components: {
    [Cell.name]: Cell,
    [CellGroup.name]: CellGroup,
    [Button.name]: Button,
    [Switch.name]: Switch,
    [ActionSheet.name]: ActionSheet
  }
};
</script>

<style lang="stylus" scoped>

</style>
