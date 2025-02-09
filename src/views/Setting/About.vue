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
        title="@journey-ad"
        is-link
        :label="$t('VISKhjE86qDcIl_XXpx1q')"
        @click="openLink('https://github.com/journey-ad')"
      />
      <van-cell
        center
        title="HibiAPI"
        is-link
        :label="$t('44eCE1yMuhnfx93siUVJ8')"
        @click="openLink('https://github.com/mixmoe/HibiAPI')"
      />
      <van-cell
        center
        title="PixivNow"
        is-link
        :label="$t('OcYnjztb0HpfzH4xK-2f4')"
        @click="openLink('https://github.com/FreeNowOrg/PixivNow')"
      />
      <van-cell
        center
        title="Pixiv.cat"
        is-link
        :label="$t('R7wR59U5tm8NR3Gn1FKAw')"
        @click="openLink('https://pixiv.re')"
      />
      <van-cell
        center
        title="@Blueberryy"
        is-link
        :label="$t('PtZhgMV8k86Gmg96kKTCA')"
        @click="openLink('https://github.com/Blueberryy')"
      />
      <van-cell
        center
        title="pxder"
        is-link
        :label="$t('tQaYxaOwYjOgf1OAnQm4J')"
        @click="openLink('https://github.com/Tsuk1ko/pxder')"
      />
      <van-cell
        center
        title="PixEz"
        is-link
        :label="$t('tQaYxaOwYjOgf1OAnQm4J')"
        @click="openLink('https://github.com/Notsfsssf/pixez-flutter')"
      />
      <van-cell
        center
        title="pixivpy-async"
        is-link
        :label="$t('tQaYxaOwYjOgf1OAnQm4J')"
        @click="openLink('https://github.com/Mikubill/pixivpy-async')"
      />
    </van-cell-group>
    <van-cell-group :title="$t('about.feedback')">
      <van-cell
        center
        :title="$t('cIyLKP7_S_Wo0Y0908dnm')"
        is-link
        label="Github:asadahimeka/pixiv-viewer"
        @click="openLink('https://github.com/asadahimeka/pixiv-viewer/discussions')"
      />
      <van-cell
        center
        :title="$t('TnXv_wGi3BhyVLjxBYf1u')"
        is-link
        label="Github:asadahimeka/pixiv-viewer"
        @click="openLink('https://github.com/asadahimeka/pixiv-viewer/issues')"
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
