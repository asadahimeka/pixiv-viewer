<template>
  <div class="setting-page">
    <top-bar id="top-bar-wrap" />
    <h3 class="af_title">{{ $t('about.title') }}</h3>
    <van-cell center :title="$t('about.version')" clickable label="v1.8.2" />
    <van-cell center :title="$t('about.disclaimer')" is-link :label="$t('tips.click_view')" @click="showDisclaimer" />
    <van-cell
      center
      :title="$t('about.source')"
      is-link
      label="Github:asadahimeka/pixiv-viewer"
      @click="openLink('https://github.com/asadahimeka/pixiv-viewer')"
    />
    <van-cell
      center
      :title="$t('about.from')"
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
    <van-cell center :title="$t('about.origin_site')" is-link label="https://pixiv.obfs.dev" @click="openLink('https://pixiv.obfs.dev')" />
    <van-cell
      center
      :title="$t('about.feedback')"
      is-link
      label="Github:asadahimeka/pixiv-viewer"
      @click="openLink('https://github.com/asadahimeka/pixiv-viewer/issues')"
    />
    <van-cell
      center
      title="Telegram Group"
      is-link
      label="t.me/pixiv_viewer_kai"
      @click="openLink('https://t.me/pixiv_viewer_kai')"
    />
  </div>
</template>

<script>
import { Dialog } from 'vant'

export default {
  name: 'SettingAbout',
  components: {
  },
  data() {
    return {

    }
  },
  methods: {
    openLink(link) {
      // window.umami?.(`open_link_${link.replace('https://', '')}`)
      window.open(link, '_blank', 'noopener noreferrer')
    },
    showDisclaimer() {
      Dialog.alert({
        title: this.$t('about.disclaimer'),
        message: this.$t('about.disclaimer_text'),
        confirmButtonText: this.$t('common.confirm'),
      })
      // window.umami?.(`show_disclaimer`)
    },
  },
}
</script>

<style lang="stylus" scoped>

</style>
