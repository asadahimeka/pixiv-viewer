<template>
  <div class="setting-page">
    <top-bar id="top-bar-wrap" />
    <h3 class="af_title">应用推荐</h3>
    <van-cell center title="PixEz Flutter (Android,iOS)" is-link label="使用 Flutter 编写的 Pixiv 第三方客户端。支持免代理直连。"
      @click="openLink('https://github.com/Notsfsssf/pixez-flutter')" />
    <van-cell center title="materixiv (Android)" is-link label="Pixiv app with Material Design."
      @click="openLink('https://github.com/onlymash/materixiv')" />
    <van-cell center title="Flexbooru (Android)" is-link
      label="A booru client for Android, support Danbooru, Moebooru, Gelbooru, Shimmie, etc."
      @click="openLink('https://github.com/flexbooru/flexbooru')" />
    <van-cell center title="ComicNyaa (Android, 预发布)" is-link label=" 一个跨平台的漫画/图库聚合阅读器。"
      @click="openLink('https://github.com/tsukiseele/ComicNyaa')" />
    <van-cell center title="MoeViewerN (PC, 未发布)" is-link label="一个可爱的二次元网络画廊浏览器，目前处在dev阶段。"
      @click="openLink('https://github.com/tsukiseele/MoeViewerN')" />
    <van-cell center title="NClientV2 (Android)" is-link label="An unofficial NHentai android client."
      @click="openLink('https://github.com/Dar9586/NClientV2')" />
    <van-cell center title="Tachiyomi (Android)" is-link label="Free and open source manga reader for Android."
      @click="openLink('https://github.com/tachiyomiorg/tachiyomi')" />
    <van-cell center title="Kikoeru (Android)" is-link label="Kikoeru(ASMR Online) android client."
      @click="openLink('https://install.appcenter.ms/users/littleloli/apps/Kikoeru/distribution_groups/public')" />
  </div>
</template>

<script>
import { Cell } from "vant";
export default {
  name: "SettingRecommendApps",
  data() {
    return {
    };
  },
  methods: {
    openLink(link) {
      window.open(link, '_blank', 'noopener')
    },
  },
  components: {
    [Cell.name]: Cell,
  }
};
</script>

<style lang="stylus" scoped>
</style>
