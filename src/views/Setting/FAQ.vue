<template>
  <div class="setting-page">
    <top-bar id="top-bar-wrap" />
    <h3 class="af_title">{{ $t('QV1uifvU3RRNg7roth-8s') }}</h3>
    <van-collapse v-model="activeNames">
      <van-collapse-item :title="$t('KwSsYWyF0HXlP8lggxLqt')" name="1">
        {{ $t('6iJYYx2KV_KWyAz0yS1CS') }}
      </van-collapse-item>
      <van-collapse-item :title="$t('8msFTe9uT5LS1hBRYrhDQ')" name="2">
        <a href="https://www.nanoka.top/posts/e78ef86/" target="_blank">https://www.nanoka.top/posts/e78ef86/</a>
      </van-collapse-item>
      <van-collapse-item :title="$t('kK53pSxdX9IOIwBqBIClc')" name="3">
        {{ $t('BKT3O7AHWaF4y-_ZST_NG') }}
      </van-collapse-item>
      <van-collapse-item :title="$t('wJAMnVWft77VcJZbZGBnw')" name="4">
        {{ $t('nLfTowV936VLOus1gCBwD') }}<a href="https://www.pixiv.net/info.php?id=10837" target="_blank" rel="noopener noreferrer">https://www.pixiv.net/info.php?id=10837</a>
        <p>
          <span v-html="$t('oIpHR8FnQhPgVI2BizbAn')"></span>
          <a href="https://www.pixiv.net/setting_user.php" target="_blank" rel="noopener noreferrer">https://www.pixiv.net/setting_user.php</a>
        </p>
      </van-collapse-item>
      <van-collapse-item :title="$t('sJi3WO6IsK-5QD-YcWBMF')" name="99">
        {{ $t('ChCGA7Uk5be-pt_ZPtyVU') }}
      </van-collapse-item>
      <van-collapse-item :title="$t('Nf5fGNxxxq0CSEYE4JATI')" name="10">
        {{ $t('9fOw28j7M34o8pTBwf5C1') }}
      </van-collapse-item>
      <van-collapse-item :title="$t('hNq6xDwKzWRVTCurKT2VB')" name="5">
        {{ $t('FKYu426sygq6j2G9o7cPa') }}
      </van-collapse-item>
      <van-collapse-item :title="$t('7Qp6wS6ighxbdX6P79aH8')" name="6">
        {{ $t('94IU-NPgYBjKNVa_XspuT') }}
      </van-collapse-item>
      <van-collapse-item :title="$t('3bW7wpYWQJ7UircVA8I76')" name="7">
        <p>{{ $t('v-ZyNlfMeisfmOU7rNkbm') }}</p>
        <a href="https://github.com/asadahimeka/pixiv-viewer/releases" target="_blank">https://github.com/asadahimeka/pixiv-viewer/releases</a>
      </van-collapse-item>
      <van-collapse-item :title="$t('DZ-5sfdw6SbWNC1_QX8QR')" name="8">
        {{ $t('Wl1aNUtmWu3vdjH7e4VTy') }}
      </van-collapse-item>
    </van-collapse>
  </div>
</template>

<script>
import { i18n } from '@/i18n'

export default {
  name: 'SettingAboutFaq',
  data() {
    return { activeNames: [] }
  },
  head() {
    return { title: i18n.t('QV1uifvU3RRNg7roth-8s') }
  },
}
</script>

<style lang="stylus" scoped>

</style>
