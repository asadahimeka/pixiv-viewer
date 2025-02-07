<template>
  <div class="setting-page">
    <top-bar id="top-bar-wrap" />
    <h3 class="af_title">{{ $t('about.title') }}</h3>
    <van-cell-group :title="$t('about.about_site')">
      <van-cell center :title="$t('about.version')" clickable :label="ver" />
      <van-cell center :title="$t('about.disclaimer')" is-link :label="$t('tips.click_view')" to="/setting/about/disclaimer" />
      <van-cell
        center
        :title="$t('about.source')"
        is-link
        label="Github:asadahimeka/pixiv-viewer"
        @click="openLink('https://github.com/asadahimeka/pixiv-viewer')"
      />
      <van-cell center :title="$t('QV1uifvU3RRNg7roth-8s')" is-link :label="$t('tips.click_view')" to="/setting/about/faq" />
    </van-cell-group>
    <van-cell-group :title="$t('about.credits')">
      <van-cell
        center
        title="pixiv-viewer"
        is-link
        label="Github:journey-ad/pixiv-viewer"
        @click="openLink('https://github.com/journey-ad/pixiv-viewer')"
      />
      <van-cell
        center
        title="HibiAPI"
        is-link
        label="Github:mixmoe/HibiAPI"
        @click="openLink('https://github.com/mixmoe/HibiAPI')"
      />
      <van-cell
        center
        title="PixivNow"
        is-link
        label="Github:FreeNowOrg/PixivNow"
        @click="openLink('https://github.com/FreeNowOrg/PixivNow')"
      />
      <van-cell
        center
        title="Pixiv.cat"
        is-link
        label="https://pixiv.re"
        @click="openLink('https://pixiv.re')"
      />
      <van-cell
        center
        title="pxder"
        is-link
        label="Github:Tsuk1ko/pxder"
        @click="openLink('https://github.com/Tsuk1ko/pxder')"
      />
      <van-cell
        center
        title="PixEz"
        is-link
        label="Github:Notsfsssf/pixez-flutter"
        @click="openLink('https://github.com/Notsfsssf/pixez-flutter')"
      />
      <van-cell
        center
        title="pixivpy-async"
        is-link
        label="Github:Mikubill/pixivpy-async"
        @click="openLink('https://github.com/Mikubill/pixivpy-async')"
      />
    </van-cell-group>
    <van-cell-group :title="$t('about.feedback')">
      <van-cell
        center
        title="Github Discussions"
        is-link
        label="Github:asadahimeka/pixiv-viewer"
        @click="openLink('https://github.com/asadahimeka/pixiv-viewer/discussions')"
      />
      <van-cell
        center
        title="Github Issues"
        is-link
        label="Github:asadahimeka/pixiv-viewer-apk"
        @click="openLink('https://github.com/asadahimeka/pixiv-viewer-apk/issues')"
      />
      <van-cell
        center
        :title="$t('VhMNSWrg03-_ryN7nRBJ3')"
        is-link
        :label="$t('9H-9VJU67Fuabl8OgbhOr')"
        @click="openLink('https://www.nanoka.top/say/pxve_comments.html')"
      />
    </van-cell-group>
    <van-cell-group v-if="backSites" :title="$t('1V8tlBs--oNk_UbzsItA-')">
      <van-cell
        v-for="s in backSites"
        :key="s"
        center
        :title="`https://${s}`"
        is-link
        @click="openLink(`https://${s}`)"
      />
    </van-cell-group>
  </div>
</template>

<script>
import { BACKUP_DOMAINS, CURRENT_APP_VERSION } from '@/consts'

export default {
  name: 'SettingAbout',
  data() {
    return {
      ver: CURRENT_APP_VERSION,
      backSites: BACKUP_DOMAINS.split(',').filter(Boolean),
    }
  },
  head() {
    return { title: this.$t('about.title') }
  },
  methods: {
    openLink(link) {
      window.umami?.track('open_link', { link: link.replace('https://', '') })
      window.open(link, '_blank', 'noopener noreferrer')
    },
  },
}
</script>

<style lang="stylus" scoped>

</style>
