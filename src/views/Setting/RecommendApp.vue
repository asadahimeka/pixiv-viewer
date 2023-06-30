<template>
  <div class="setting-page">
    <van-cell
      center
      title="PixEz Flutter (Android,iOS)"
      is-link
      label="使用 Flutter 编写的 Pixiv 第三方客户端。支持免代理直连。"
      @click="openLink('https://github.com/Notsfsssf/pixez-flutter')"
    />
    <van-cell
      center
      title="Pixiv-Shaft (Android)"
      is-link
      label="Pixiv 第三方 Android 客户端。"
      @click="openLink('https://github.com/CeuiLiSA/Pixiv-Shaft')"
    />
    <van-cell
      center
      title="Clover (Android)"
      is-link
      label="全新的第三方 pixiv 客户端。"
      @click="openLink('https://github.com/CeuiLiSA/Pixiv-Slinky')"
    />
    <van-cell
      center
      title="Materixiv (Android)"
      is-link
      label="Pixiv app with Material Design."
      @click="openLink('https://github.com/onlymash/materixiv')"
    />
    <van-cell
      center
      title="Pixiv Artvier (Android)"
      is-link
      label="A third-party app for pixiv. 一个第三方pixiv App。"
      @click="openLink('https://github.com/yleencc/pixiv-artvier')"
    />
    <van-cell
      center
      title="Flexbooru (Android)"
      is-link
      label="A booru client for Android, support Danbooru, Moebooru, Gelbooru, Shimmie, etc."
      @click="openLink('https://github.com/flexbooru/flexbooru')"
    />
    <van-cell
      center
      title="JHenTai (Android,iOS,Linux,macOS,Windows)"
      is-link
      label="A cross-platform app made for e-hentai & exhentai by Flutter."
      @click="openLink('https://github.com/jiangtian616/JHenTai')"
    />
    <van-cell
      center
      title="NClientV2 (Android)"
      is-link
      label="An unofficial NHentai android client."
      @click="openLink('https://github.com/Dar9586/NClientV2')"
    />
    <van-cell
      center
      title="Eros-N (Android,iOS)"
      is-link
      label="An unofficial nhentai app."
      @click="openLink('https://github.com/erosTeam/eros_n')"
    />
    <van-cell
      center
      title="PicaComic (Android,Windows)"
      is-link
      label="Unofficial picacg app built with flutter/使用 Flutter 构建的跨平台 Picacg App"
      @click="openLink('https://github.com/wgh136/PicaComic')"
    />
    <van-cell
      center
      title="动漫之家X (Android,iOS,Linux,macOS,Windows)"
      is-link
      label="动漫之家 Flutter 客户端。"
      @click="openLink('https://github.com/xiaoyaocz/flutter_dmzj')"
    />
    <van-cell
      center
      title="ComicNyaa (Android)"
      is-link
      label=" 一个跨平台的漫画/图库聚合阅读器。"
      @click="openLink('https://github.com/tsukiseele/ComicNyaa')"
    />
    <van-cell
      center
      title="MoeViewerN (Windows)"
      is-link
      label="一个可爱的二次元网络画廊浏览器。"
      @click="openLink('https://github.com/tsukiseele/MoeViewerN')"
    />
    <van-cell
      center
      title="Tachiyomi (Android)"
      is-link
      label="Free and open source manga reader for Android."
      @click="openLink('https://github.com/tachiyomiorg/tachiyomi')"
    />
    <van-cell
      center
      title="全是漫画 (Android)"
      is-link
      label="https://github.com/hongchacha/cartoon"
      @click="openLink('https://github.com/hongchacha/cartoon')"
    />
    <van-cell
      center
      title="Kikoeru (Android)"
      is-link
      label="Kikoeru(ASMR Online) android client."
      @click="openLink('https://install.appcenter.ms/users/littleloli/apps/Kikoeru/distribution_groups/public')"
    />
  </div>
</template>

<script>
export default {
  name: 'SettingRecommendApps',
  components: {
  },
  data() {
    return {

    }
  },
  methods: {
    openLink(link) {
      window.umami?.track('open_link', { link: link.replace('https://', '') })
      window.open(link, '_blank', 'noopener')
    },
  },
}
</script>

<style lang="stylus" scoped>

</style>
