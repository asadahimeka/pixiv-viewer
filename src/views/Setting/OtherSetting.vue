<template>
  <div class="setting-page">
    <top-bar id="top-bar-wrap" />
    <h3 class="af_title" @dblclick="showAnaSwitch=true">{{ $t('setting.other.title') }}</h3>
    <van-cell-group :title="$t('GS0J0mAbmiqPGKw20ORPi')">
      <van-cell center :title="$t('setting.other.lang')" is-link :label="selLangLabel" @click="lang.show = true" />
      <van-cell center :title="$t('psoXLFqv51j1SeKjTbnms')" is-link :label="`${accentColor} ${actTheme}`" to="/setting/accent_color" />
      <van-cell center :title="$t('setting.dark.title')" :label="$t('setting.lab.title')">
        <template #right-icon>
          <van-switch :value="isDark" size="24" @change="onDarkChange" />
        </template>
      </van-cell>
    </van-cell-group>

    <van-cell-group :title="$t('9X179hdP1zzapzk5Rvqx2')">
      <van-cell center :title="$t('setting.layout.title')" is-link :label="appSetting.wfType" @click="wfType.show = true" />
      <van-cell center :title="$t('setting.img_res.title')" is-link :label="appSetting.imgReso" @click="imgRes.show = true" />
      <van-cell center :title="$t('ZO7u4XT4flW6_nmyvmXt7')" :label="$t('WdS4RTIeeWqdaqLtvk7ZO')">
        <template #right-icon>
          <van-switch :value="appSetting.isImageCardOuterMeta" size="24" @change="v => saveAppSetting('isImageCardOuterMeta', v, true)" />
        </template>
      </van-cell>
      <van-cell center :title="$t('mR4YFHYUnr00zmzYydrMv')" :label="$t('V-KoSeNoEiNct7oZJgCcD')">
        <template #right-icon>
          <van-switch :value="appSetting.isImageFitScreen" size="24" @change="v => saveAppSetting('isImageFitScreen', v, true)" />
        </template>
      </van-cell>
      <van-cell center :title="$t('kFOiZTwKWwXy-sxaspqSD')" :label="$t('NgE24V8lvXN2c15W_2gnE')">
        <template #right-icon>
          <van-switch :disabled="appSetting.isLongpressDL" :value="appSetting.isLongpressBlock" size="24" @change="v => saveAppSetting('isLongpressBlock', v, true)" />
        </template>
      </van-cell>
      <van-cell center :title="$t('SLO07VkQh2wjFJJ1MLvUl')" :label="appSetting.pageFont || $t('ZfJcs8gi6ptsljzInCNpH')" is-link @click="showPageFontSel" />
      <van-cell v-if="isPageTransitionSelShow" center :title="$t('Cy6qJLutMa5O3jJr8TawB')" :label="pageTransitionLabel" is-link @click="pageTransition.show = true" />
    </van-cell-group>

    <van-cell-group :title="$t('novel.settings.title')">
      <van-cell center :title="$t('j1tomH0kHtIiXUQ-6NhcS')" :label="$t('UiF3Ob-tYkIolJhNVMUFM')" is-link @click="showNovelConfig" />
      <van-cell center :title="$t('MIvoTULAIywXTtFIKsEuD')" :label="novelDlFmtLabel" is-link @click="novelDlFmt.show = true" />
      <template v-if="showAutoLoadImtSwitch">
        <van-cell center title="小说默认翻译服务" :label="novelTranslateLabel" is-link @click="novelTranslate.show = true" />
        <van-cell center title="自动加载沉浸式翻译 SDK 并翻译" label="如已安装沉浸式翻译浏览器扩展则无需加载沉浸式翻译 SDK">
          <template #right-icon>
            <van-switch :value="appSetting.isAutoLoadImt" size="24" @change="changeAutoLoadImt" />
          </template>
        </van-cell>
      </template>
    </van-cell-group>

    <van-cell-group :title="$t('j2tFt08r6GGMmsfbF4HAN')">
      <van-cell center :title="$t('5syY7l774noiN5LHKUnqF')" :label="$t('QRASoWf3qDfwihoIa84C9')">
        <template #right-icon>
          <van-switch :disabled="appSetting.isLongpressBlock" :value="appSetting.isLongpressDL" size="24" @change="v => saveAppSetting('isLongpressDL', v, true)" />
        </template>
      </van-cell>
      <van-cell v-if="isFsaSupported" center :title="$t('zHc8vUk99v88lW41lrprb')" :label="$t('TvsHdAJPVAKY9rRiGoO6K')">
        <template #right-icon>
          <van-switch :disabled="appSetting.preferDownloadByTm" :value="appSetting.preferDownloadByFsa" size="24" @change="v => saveAppSetting('preferDownloadByFsa', v)" />
        </template>
      </van-cell>
      <template v-if="isFsaSupported && appSetting.preferDownloadByFsa">
        <van-cell center :title="$t('pA7B6tF0GBv6m4bI9MJWY')" is-link :label="dlDirName || $t('4v7z_VobhSO66p3-FrUt3')" @click="setDownloadDir" />
        <van-cell center :title="$t('IQH88ofRzNxE0CTcT0-wO')" :label="$t('setting.lab.title')">
          <template #right-icon>
            <van-switch :value="appSetting.dlSubDirByAuthor" size="24" @change="v => saveAppSetting('dlSubDirByAuthor', v)" />
          </template>
        </van-cell>
      </template>
      <van-cell v-if="isHelperInst" center :title="$t('eZpkRjFnBvTEVV8yNj5b7')" :label="$t('SAs_Y4hKK7myneH47ZQKG')">
        <template #right-icon>
          <van-switch :disabled="isFsaSupported && appSetting.preferDownloadByFsa" :value="appSetting.preferDownloadByTm" size="24" @change="v => saveAppSetting('preferDownloadByTm', v)" />
        </template>
      </van-cell>
      <van-cell center :title="$t('m9rhO-859d7Br05Hm5b54')" is-link :label="appSetting.dlFileNameTpl" @click="showDlFileNameTplDialog = true" />
      <van-cell center :title="$t('Rq0GHiUs_LyUxDu-IhfBb')" is-link :label="appSetting.ugoiraDefDLFormat || $t('ks96nwuAms0B8wSWBWhil')" @click="ugoiraDL.show = true" />
    </van-cell-group>

    <van-cell-group :title="$t('7-drBPGRIz_BsYuc9ybCm')">
      <van-cell center :title="$t('setting.other.manual_input')" :label="$t('setting.other.manual_input_label')">
        <template #right-icon>
          <van-switch v-model="hideApSelect" size="24" />
        </template>
      </van-cell>
      <van-cell v-if="hideApSelect && !appSetting.isDirectPximg" center :title="$t('setting.img_proxy.title')" is-link :label="pximgBed.value" @click="pximgBed.show = true" />
      <van-cell v-if="!clientConfig.useLocalAppApi && hideApSelect" center :title="$t('setting.api.title')" is-link :label="hibiapi.value" @click="hibiapi.show = true" />
      <van-cell v-if="!hideApSelect && !appSetting.isDirectPximg" center :title="$t('setting.img_proxy.title2')" is-link :label="pximgBedLabel" @click="pximgBed_.show = true" />
      <van-cell v-if="!clientConfig.useLocalAppApi && !hideApSelect" center :title="$t('setting.api.title2')" is-link :label="hibiapiLabel" @click="hibiapi_.show = true" />
      <van-cell center :title="$t('lGZGzwfWz9tW_KQey3AmQ')" :label="$t('OA8ygupG-4FcNWHtwEUG-')">
        <template #right-icon>
          <van-switch :value="appSetting.isDirectPximg" size="24" @change="setDirectPximg" />
        </template>
      </van-cell>
      <template v-if="clientConfig.useLocalAppApi">
        <van-cell v-if="isHelperInst" center :title="$t('setting.other.direct_mode.title')" :label="$t('setting.other.direct_mode.label')">
          <template #right-icon>
            <van-switch :value="clientConfig.directMode" :disabled="clientConfig.useApiProxy" size="24" @change="setDirectMode" />
          </template>
        </van-cell>
        <van-cell center :title="$t('setting.other.direct_mode.proxy.title')" :label="$t('setting.other.direct_mode.proxy.label')">
          <template #right-icon>
            <van-switch :value="clientConfig.useApiProxy" :disabled="clientConfig.directMode" size="24" @change="setUseApiProxy" />
          </template>
        </van-cell>
        <van-cell v-if="clientConfig.useApiProxy" center :title="$t('setting.other.api_proxy.title')" is-link :label="apiProxyLabel||$t('setting.other.api_proxy.def_ph')" @click="apiProxySel.show = true" />
        <van-cell v-if="clientConfig.refreshToken" center :title="$t('setting.other.cp_token_title')" is-link :label="$t('setting.other.cp_token_label')" @click="copyToken" />
      </template>
    </van-cell-group>

    <van-cell-group :title="$t('6oe7JPS26HGAlcjQdmHZ4')">
      <van-cell center :title="$t('qLUWER5bf4X2lE0RjKTBj')">
        <template #right-icon>
          <van-switch :value="appSetting.isUseFancybox" size="24" @change="v => saveAppSetting('isUseFancybox', v)" />
        </template>
      </van-cell>
      <van-cell center :title="$t('setting.other.swipe_toggle')">
        <template #right-icon>
          <van-switch :value="appSetting.isEnableSwipe" size="24" @change="v => saveAppSetting('isEnableSwipe', v, true)" />
        </template>
      </van-cell>
      <van-cell center :title="$t('GnyWarxXoDw49xCft4IlS')">
        <template #right-icon>
          <van-switch :value="appSetting.isImgLazy" size="24" @change="v => saveAppSetting('isImgLazy', v, true)" />
        </template>
      </van-cell>
      <van-cell center :title="$t('2CmJxHkq8O-uA68cU90Lx')">
        <template #right-icon>
          <van-switch :value="appSetting.isImgLazyOb" size="24" @change="v => saveAppSetting('isImgLazyOb', v, true)" />
        </template>
      </van-cell>
      <van-cell center :title="$t('_E9iTJP6wHVE-Qxau80YA')">
        <template #right-icon>
          <van-switch :value="appSetting.isImageCardBorderRadius" size="24" @change="v => saveAppSetting('isImageCardBorderRadius', v, true)" />
        </template>
      </van-cell>
      <van-cell center :title="$t('Na5UTdncjCSNrFJGlrPoq')">
        <template #right-icon>
          <van-switch :value="appSetting.withBodyBg" size="24" @change="v => saveAppSetting('withBodyBg', v, true)" />
        </template>
      </van-cell>
      <van-cell v-if="showAnaSwitch" center title="Enable Umami Analytics">
        <template #right-icon>
          <van-switch :value="isAnalyticsOn" size="24" @change="onAnalyticsChange" />
        </template>
      </van-cell>
    </van-cell-group>

    <van-cell-group :title="$t('_AEPlcZHsKjnjPXQBX59p')">
      <van-cell center :title="$t('Wc3yMDMSkHUhoGx22bsP8')" is-link @click="importSettings" />
      <van-cell center :title="$t('Bi5BpYwKhUhWcm_RueGZN')" is-link @click="exportSettings" />
    </van-cell-group>

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
      @select="v => saveAppSetting('wfType', v.name, true)"
    />
    <van-action-sheet
      v-model="imgRes.show"
      :actions="imgRes.actions"
      :cancel-text="$t('common.cancel')"
      :description="$t('setting.img_res.ph')"
      close-on-click-action
      @select="v => saveAppSetting('imgReso', v.name, true)"
    />
    <van-action-sheet
      v-model="ugoiraDL.show"
      :actions="ugoiraDL.actions"
      :cancel-text="$t('common.cancel')"
      :description="$t('Rq0GHiUs_LyUxDu-IhfBb')"
      close-on-click-action
      @select="v => saveAppSetting('ugoiraDefDLFormat', v.name)"
    />
    <van-action-sheet
      v-model="pageTransition.show"
      :actions="pageTransition.actions"
      :cancel-text="$t('common.cancel')"
      :description="$t('Cy6qJLutMa5O3jJr8TawB')"
      close-on-click-action
      @select="onPageTransitionChange"
    />
    <van-action-sheet
      v-model="pageFont.show"
      style="font-family: Arial, Helvetica, sans-serif"
      :actions="pageFont.actions"
      :cancel-text="$t('common.cancel')"
      :description="$t('SLO07VkQh2wjFJJ1MLvUl')"
      close-on-click-action
      @select="e => saveAppSetting('pageFont', e._value, true)"
    />
    <van-action-sheet
      v-model="novelDlFmt.show"
      :actions="novelDlFmt.actions"
      :cancel-text="$t('common.cancel')"
      :description="$t('MIvoTULAIywXTtFIKsEuD')"
      close-on-click-action
      @select="e => saveAppSetting('novelDlFormat', e._value)"
    />
    <van-action-sheet
      v-model="novelTranslate.show"
      :actions="novelTranslate.actions"
      :cancel-text="$t('common.cancel')"
      description="小说默认翻译服务 (不可与自动加载沉浸式翻译 SDK 同时使用)"
      close-on-click-action
      @select="e => saveAppSetting('novelDefTranslate', e._value)"
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
      @select="changePximgBed_"
    />
    <van-action-sheet
      v-model="hibiapi_.show"
      :actions="hibiapi_.actions"
      :cancel-text="$t('common.cancel')"
      :description="$t('setting.api.ph')"
      close-on-click-action
      class="hibiapi-actions"
      @select="changeHibiapi_"
    />
    <van-dialog
      v-model="showDlFileNameTplDialog"
      width="9rem"
      :title="$t('m9rhO-859d7Br05Hm5b54')"
      show-cancel-button
      :cancel-button-text="$t('common.cancel')"
      :confirm-button-text="$t('common.confirm')"
      @confirm="saveAppSetting('dlFileNameTpl', dlFileNameTpl)"
      @cancel="dlFileNameTpl=appSetting.dlFileNameTpl"
    >
      <van-cell>{{ $t('QJJd8OqGWs3rIHxMwYma9') }}</van-cell>
      <van-cell class="tips">{{ $t('bmqXgC68c1dDsgtYwO1Sv') }} <code>{pid}</code> <code>{index}</code></van-cell>
      <van-cell>{{ $t('Zt3czgV8wrvas-it5b9Z0') }}</van-cell>
      <div class="dl-tpl-tags">
        <div class="dl-tpl-tag" @click="dlFileNameTpl+='{author}'">
          <van-tag round plain type="primary" size="large">author</van-tag>
          <span>{{ $t('VJLRKYZZDrAv5NKTHcisN') }}</span>
        </div>
        <div class="dl-tpl-tag" @click="dlFileNameTpl+='{authorId}'">
          <van-tag round plain type="primary" size="large">authorId</van-tag>
          <span>{{ $t('hVJXyeDWfpiwbIS7CpgEX') }}</span>
        </div>
        <div class="dl-tpl-tag" @click="dlFileNameTpl+='{title}'">
          <van-tag round plain type="primary" size="large">title</van-tag>
          <span>{{ $t('xVDEqSshq1e1ZEmv3q-3s') }}</span>
        </div>
        <div class="dl-tpl-tag" @click="dlFileNameTpl+='{pid}'">
          <van-tag round plain type="primary" size="large">pid</van-tag>
          <span>{{ $t('6_DlIX_02ur5HfDOc9wsb') }}</span>
        </div>
        <div class="dl-tpl-tag" @click="dlFileNameTpl+='{index}'">
          <van-tag round plain type="primary" size="large">index</van-tag>
          <span>{{ $t('SjI_Ww3ngIBNJxTDLAszn') }}</span>
        </div>
        <div class="dl-tpl-tag" @click="dlFileNameTpl+='{width}'">
          <van-tag round plain type="primary" size="large">width</van-tag>
          <span>{{ $t('0VXbrbumb60glupUb3cUk') }}</span>
        </div>
        <div class="dl-tpl-tag" @click="dlFileNameTpl+='{height}'">
          <van-tag round plain type="primary" size="large">height</van-tag>
          <span>{{ $t('G6LGYgi1RdW54WbmYURmF') }}</span>
        </div>
        <div class="dl-tpl-tag" @click="dlFileNameTpl+='{tags}'">
          <van-tag round plain type="primary" size="large">tags</van-tag>
          <span>{{ $t('9tIV83JmVMkNKF2B8F4LI') }}</span>
        </div>
        <div class="dl-tpl-tag" @click="dlFileNameTpl+='{createDate}'">
          <van-tag round plain type="primary" size="large">createDate</van-tag>
          <span>{{ $t('JHBWOqLzMQN-kgmyDVSzN') }}</span>
        </div>
        <div class="dl-tpl-tag" @click="dlFileNameTpl+='_'">
          <van-tag plain type="primary" size="large">_</van-tag>
          <span>{{ $t('P2gkznjKnjtHZDGXgzYfg') }}</span>
        </div>
      </div>
      <van-field v-model="dlFileNameTpl" :label="$t('498jRU7yCP-NoupL7HBFk')" label-width="3.5em" />
    </van-dialog>
    <NovelTextConfig ref="novelConfigRef" style="left: 50%;right: unset;" />
  </div>
</template>

<script>
import { Dialog } from 'vant'
import PixivAuth from '@/api/client/pixiv-auth'
import localDb from '@/utils/storage/localDb'
import store from '@/store'
import { APP_API_PROXYS, DEF_HIBIAPI_MAIN, DEF_PXIMG_MAIN, HIBIAPI_ALTS, PXIMG_PROXYS } from '@/consts'
import { i18n } from '@/i18n'
import { checkImgAvailable, checkUrlAvailable, copyText, downloadURL, isURL, readTextFile } from '@/utils'
import { mintVerify } from '@/utils/filter'
import { LocalStorage, SessionStorage } from '@/utils/storage'
import { isFsaSupported, getMainDirHandle, setMainDirHandle } from '@/utils/fsa'
import { getPageFontModel } from '@/utils/font'
import NovelTextConfig from '../Artwork/components/NovelTextConfig.vue'

export default {
  name: 'SettingOthers',
  components: {
    NovelTextConfig,
  },
  data() {
    return {
      clientConfig: { ...window.APP_CONFIG },
      isHelperInst: !!window.__httpRequest__,
      apiProxySel: {
        show: false,
        actions: APP_API_PROXYS.split(',').map((_value, i) => {
          return { name: `Proxy ${i} (${_value.split('.')[0]})`, _value }
        }),
      },
      pximgBed: {
        show: false,
        value: LocalStorage.get('PXIMG_PROXY', DEF_PXIMG_MAIN),
      },
      pximgBed_: {
        show: false,
        value: LocalStorage.get('PXIMG_PROXY', DEF_PXIMG_MAIN),
        actions: PXIMG_PROXYS.split(';').map(e => {
          const [name, _value] = e.split(',')
          return { name, _value }
        }),
      },
      hibiapi: {
        show: false,
        value: LocalStorage.get('HIBIAPI_BASE', DEF_HIBIAPI_MAIN),
      },
      hibiapi_: {
        show: false,
        value: LocalStorage.get('HIBIAPI_BASE', DEF_HIBIAPI_MAIN),
        actions: HIBIAPI_ALTS.split(';').map(e => {
          const [name, _value] = e.split(',')
          return { name, _value }
        }),
      },
      wfType: {
        show: false,
        actions: [
          { name: 'Masonry', subname: this.$t('setting.layout.m') },
          { name: 'Grid', subname: this.$t('setting.layout.g') },
          { name: 'Justified ', subname: this.$t('setting.layout.j') },
          { name: 'Masonry(CSSGrid)', subname: this.$t('setting.layout.m') + ' - ' + this.$t('setting.lab.title') },
          { name: 'Justified(Transform)', subname: this.$t('setting.layout.j') + ' - ' + this.$t('setting.lab.title') },
          { name: 'Masonry(FlexOrder)', subname: this.$t('setting.layout.m') + ' - ' + this.$t('setting.lab.title') },
        ],
      },
      imgRes: {
        show: false,
        actions: [
          { name: 'Medium', subname: this.$t('setting.img_res.m') },
          { name: 'Large', subname: this.$t('setting.img_res.l') },
          { name: 'Original', subname: this.$t('setting.img_res.o'), disabled: true },
        ],
      },
      lang: {
        show: false,
        value: i18n.locale,
        actions: [
          { _value: 'zh-CN', name: '简体中文' },
          { _value: 'zh-TW', name: '繁體中文' },
          { _value: 'en', name: 'English' },
          { _value: 'ja', name: '日本語' },
          { _value: 'ko', name: '한국어' },
          { _value: 'de', name: 'Deutsch' },
          { _value: 'fr', name: 'Français' },
          { _value: 'ru', name: 'Русский' },
          { _value: 'it', name: 'Italiano' },
          { _value: 'es', name: 'Español' },
          { _value: 'pt', name: 'Português' },
          { _value: 'el', name: 'Ελληνικά' },
        ],
      },
      ugoiraDL: {
        show: false,
        actions: [
          { name: 'ZIP', subname: i18n.t('artwork.download.zip') },
          { name: 'GIF', subname: i18n.t('artwork.download.gif') },
          { name: 'WebM', subname: i18n.t('artwork.download.webm') },
          { name: 'APNG', subname: i18n.t('artwork.download.webm') },
          { name: 'MP4(Browser)', subname: i18n.t('pIghtXdU8socMNNRUn5UR') },
          { name: 'MP4(Server)', subname: i18n.t('zuVom-C8Ss8JTEDZIhzBj') },
          { name: 'Other', subname: i18n.t('artwork.download.mp4') },
        ],
      },
      pageTransition: {
        show: false,
        actions: [
          { name: 'none', _value: '' },
          { name: 'ios', _value: 'f7-ios' },
          { name: 'md', _value: 'f7-md' },
          // { name: 'scale', _value: 'f7-circle' },
          { name: 'cover', _value: 'f7-cover' },
          { name: 'cover-v', _value: 'f7-cover-v' },
          { name: 'dive', _value: 'f7-dive' },
          { name: 'fade', _value: 'f7-fade' },
          { name: 'flip', _value: 'f7-flip' },
          { name: 'parallax', _value: 'f7-parallax' },
          { name: 'push', _value: 'f7-push' },
        ],
      },
      pageFont: {
        show: false,
        actions: [],
      },
      novelDlFmt: {
        show: false,
        actions: [
          { name: 'TXT', _value: 'txt' },
          { name: 'HTML', _value: 'html' },
        ],
      },
      novelTranslate: {
        show: false,
        actions: [
          { name: '未设置', _value: '' },
          { name: 'AI 翻译(glm_4_9b)', _value: 'sc_glm' },
          { name: 'AI 翻译(Qwen2_7B)', _value: 'sc_qwen2' },
          { name: 'AI 翻译(DS_R1_Llama_8B)', _value: 'sc_ds_r1_llama' },
          { name: '微软翻译', _value: 'ms' },
          { name: '谷歌翻译', _value: 'gg' },
          { name: '有道翻译', _value: 'yd' },
        ],
      },
      hideApSelect: LocalStorage.get('__HIDE_AP_SEL', false),
      isDark: !!localStorage.getItem('PXV_DARK'),
      showAutoLoadImtSwitch: i18n.locale.includes('zh'),
      actTheme: localStorage.PXV_THEME || '',
      accentColor: localStorage.PXV_ACT_COLOR || 'Default',
      isFsaSupported,
      dlDirName: '',
      showDlFileNameTplDialog: false,
      dlFileNameTpl: store.state.appSetting.dlFileNameTpl,
      showAnaSwitch: false,
      isAnalyticsOn: LocalStorage.get('PXV_ANALYTICS', true),
      isPageTransitionSelShow: Boolean(document.startViewTransition),
    }
  },
  head() {
    return { title: this.$t('setting.other.title') }
  },
  computed: {
    selLangLabel() {
      return this.lang.actions.find(e => e._value == this.lang.value)?.name || ''
    },
    pximgBedLabel() {
      return this.pximgBed_.actions.find(e => e._value == this.pximgBed_.value)?.name || ''
    },
    hibiapiLabel() {
      return this.hibiapi_.actions.find(e => e._value == this.hibiapi_.value)?.name || ''
    },
    apiProxyLabel() {
      return this.apiProxySel.actions.find(e => e._value == this.clientConfig.apiProxy)?.name || ''
    },
    appSetting() {
      return store.state.appSetting
    },
    pageTransitionLabel() {
      return this.pageTransition.actions.find(e => e._value == store.state.appSetting.pageTransition)?.name || ''
    },
    novelDlFmtLabel() {
      return this.novelDlFmt.actions.find(e => e._value == store.state.appSetting.novelDlFormat)?.name || ''
    },
    novelTranslateLabel() {
      return this.novelTranslate.actions.find(e => e._value == store.state.appSetting.novelDefTranslate)?.name || ''
    },
  },
  watch: {
    hideApSelect(val) {
      LocalStorage.set('__HIDE_AP_SEL', val)
      if (val) {
        LocalStorage.set('HIBIAPI_BASE', DEF_HIBIAPI_MAIN)
        LocalStorage.set('PXIMG_PROXY', DEF_PXIMG_MAIN)
      }
      setTimeout(() => {
        location.reload()
      }, 500)
    },
  },
  async created() {
    const { name } = (await getMainDirHandle()) || {}
    if (name) this.dlDirName = name
  },
  methods: {
    copyToken() {
      const t = this.clientConfig.refreshToken
      if (!t) return
      copyText(t, () => this.$toast(this.$t('tips.copylink.succ')), err => this.$toast(this.$t('tips.copy_err') + ': ' + err))
    },
    async saveClientConfig() {
      PixivAuth.writeConfig(this.clientConfig)
      setTimeout(() => {
        location.reload()
      }, 500)
    },
    saveAppSetting(/** @type {keyof typeof store.state.appSetting} */ key, val, needReload = false) {
      console.log(key, val)
      window.umami?.track(`set:${key}`, { val })
      store.commit('setAppSetting', { [key]: val })
      if (needReload) setTimeout(() => location.reload(), 200)
    },
    async setDownloadDir() {
      try {
        const dir = await setMainDirHandle()
        this.dlDirName = dir.name
      } catch (err) {
        console.log('err: ', err)
      }
    },
    async setDirectPximg(val) {
      if (val) {
        const res = await Dialog.confirm({
          title: this.$t('nTsgCnGYm8FSVMfe-TQSN'),
          message: `${this.$t('YeEO8hAsoM45pm_vcijKP')}<br><br><p>Tampermonkey: <a href="https://www.tampermonkey.net/" target="_blank" rel="noreferrer">tampermonkey.net</a></p><p>${this.$t('lkfd4SXJiefx26Z7vj0Au')}: <a href="https://fastly.jsdelivr.net/gh/asadahimeka/pixiv-viewer@master/public/helper/helper.user.js" target="_blank" rel="noreferrer">${this.$t('2jNIricwtCbrzEESdEbvH')}</a></p>`,
          confirmButtonText: this.$t('common.confirm'),
          cancelButtonText: this.$t('common.cancel'),
        })
        if (res == 'cancel') return
        if (!this.isHelperInst) {
          Dialog.alert({
            message: this.$t('9omPI2Fz4KzKSVNlmF8-K'),
            confirmButtonText: this.$t('common.confirm'),
          })
          return
        }
      }
      this.saveAppSetting('isDirectPximg', val, true)
    },
    async setDirectMode(val) {
      if (val) {
        const res = await Dialog.confirm({
          title: this.$t('setting.other.direct_mode.confirm.title'),
          message: this.$t('setting.other.direct_mode.confirm.msg') + '<br><br><a href="https://210.140.139.161/" target="_blank" rel="noreferrer">https://210.140.139.161/</a>',
          confirmButtonText: this.$t('common.confirm'),
          cancelButtonText: this.$t('common.cancel'),
        })
        if (res == 'cancel') return
        window.umami?.track('setDirectMode', { val })
        this.clientConfig.directMode = true
        await this.$nextTick()
        await this.saveClientConfig()
      } else {
        window.umami?.track('setDirectMode', { val })
        this.clientConfig.directMode = false
        await this.$nextTick()
        await this.saveClientConfig()
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
        this.clientConfig.useApiProxy = true
        await this.$nextTick()
        await this.saveClientConfig()
      } else {
        this.clientConfig.useApiProxy = false
        await this.$nextTick()
        await this.saveClientConfig()
      }
    },
    async changeApiProxy({ _value }) {
      this.clientConfig.apiProxy = _value
      window.umami?.track('set_api_proxy', { _value })
      await this.saveClientConfig()
    },
    saveSetting(key, val) {
      window.umami?.track(`set:${key}`, { val })
      this.$nextTick(() => {
        LocalStorage.set(key, val)
        setTimeout(() => {
          location.reload()
        }, 500)
      })
    },
    async changePximgBed() {
      const url = `https://${this.pximgBed.value}`
      const res = await this.checkURL(url, () => {
        return checkImgAvailable(`${url}/user-profile/img/2022/02/03/15/54/20/22159592_fce9f5c7a908c9b601dc7e9da7a412a3_50.jpg?_t=${Date.now()}`)
      })
      if (!res) return
      SessionStorage.clear()
      await localDb.clear()
      this.saveSetting('PXIMG_PROXY', this.pximgBed.value)
    },
    async changePximgBed_({ _value }) {
      const url = `https://${_value}`
      const res = await this.checkURL(url, () => {
        return checkImgAvailable(`${url}/user-profile/img/2022/02/03/15/54/20/22159592_fce9f5c7a908c9b601dc7e9da7a412a3_50.jpg?_t=${Date.now()}`)
      })
      if (!res) return
      this.pximgBed_.value = _value
      SessionStorage.clear()
      await localDb.clear()
      this.saveSetting('PXIMG_PROXY', _value)
    },
    async changeHibiapi() {
      const url = this.hibiapi.value
      const res = await this.checkURL(url, () => {
        return checkUrlAvailable(`${url}/rank?_t=${Date.now()}`)
      })
      if (!res) return
      SessionStorage.clear()
      await localDb.clear()
      this.saveSetting('HIBIAPI_BASE', this.hibiapi.value)
    },
    async changeHibiapi_({ _value }) {
      const res = await this.checkURL(_value, () => {
        return checkUrlAvailable(`${_value}/rank?_t=${Date.now()}`)
      })
      if (!res) return
      this.hibiapi_.value = _value
      SessionStorage.clear()
      await localDb.clear()
      this.saveSetting('HIBIAPI_BASE', _value)
    },
    onDarkChange(val) {
      window.umami?.track(`set_dark_${val}`)
      this.isDark = val
      localStorage.setItem('PXV_DARK', val || '')
      if (val) document.body.classList.add('dark')
      else document.body.classList.remove('dark')
    },
    onPageTransitionChange({ _value }) {
      this.saveAppSetting('pageTransition', _value, false)
      setTimeout(() => location.assign('/'), 200)
    },
    async showPageFontSel() {
      const pageFont = await getPageFontModel()
      pageFont.show = true
      this.pageFont = pageFont
    },
    showNovelConfig() {
      this.$refs.novelConfigRef?.open()
    },
    async changeAutoLoadImt(val) {
      if (val) {
        const res = await Dialog.confirm({
          title: '自动加载沉浸式翻译 SDK',
          message: '提示：如果已安装沉浸式翻译浏览器扩展则无需加载沉浸式翻译 SDK',
          lockScroll: false,
          closeOnPopstate: true,
          cancelButtonText: '取消',
          confirmButtonText: '确定',
        }).catch(() => 'cancel')
        if (res != 'confirm') return
      }
      this.saveAppSetting('isAutoLoadImt', val, true)
    },
    changeLang({ _value }) {
      this.lang.value = _value
      window.umami?.track('set_lang', { lang: _value })
      localStorage.setItem('PXV_LANG', _value)
      setTimeout(() => {
        location.reload()
      }, 500)
    },
    onAnalyticsChange(val) {
      window.umami?.track('AnalyticsChange', { val })
      this.isAnalyticsOn = val
      LocalStorage.set('PXV_ANALYTICS', val)
      val ? localStorage.removeItem('umami.disabled') : localStorage.setItem('umami.disabled', 'true')
    },
    importSettings() {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.txt'
      input.style.display = 'none'
      input.onchange = async e => {
        try {
          const text = await readTextFile(e.target.files[0])
          const settings = JSON.parse(decodeURI(atob(text)))
          console.log('settings: ', settings)
          Object.keys(settings).forEach(k => {
            localStorage.setItem(k, settings[k])
          })
          window.umami?.track('importSettings')
          this.$toast.success('Success')
          setTimeout(() => {
            location.reload()
          }, 500)
        } catch (err) {
          console.log('err: ', err)
          this.$toast(`Error: ${err.message}`)
        }
      }
      input.click()
    },
    exportSettings() {
      window.umami?.track('exportSettings')
      const settings = {}
      const len = localStorage.length
      for (let i = 0; i < len; i++) {
        const keyName = localStorage.key(i)
        settings[keyName] = localStorage.getItem(keyName)
      }
      const blob = new Blob([btoa(encodeURI(JSON.stringify(settings)))])
      downloadURL(blob, 'pixiv-viewer-settings.txt')
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
        message: this.$t('tips.loading'),
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
  .van-cell-group
    margin-bottom 15px
  .dl-tpl-tag
    display flex
    flex-direction column
    justify-content center
    align-items center
    gap 5PX
    min-width 1.2rem
    cursor pointer
    >span:last-child
      color: gray
      font-size 12PX
    &s
      display flex
      align-items center
      flex-wrap wrap
      gap 8px
      padding 20px
</style>
