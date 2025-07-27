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
      title="Pixiv Func (Android,Windows)"
      is-link
      label="功能齐全的Pixiv第三方客户端 免代理 支持查看动图查看直播"
      @click="openLink('https://github.com/git-xiaocao/pixiv_func_mobile')"
    />
    <van-cell
      center
      title="PixivCollection (Windows)"
      is-link
      label="Pixiv本地收藏夹图片管理"
      @click="openLink('https://github.com/asadahimeka/PixivCollection/releases')"
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
      title="Boorusphere (Android)"
      is-link
      label="Simple, content-focused booru viewer for Android"
      @click="openLink('https://github.com/nullxception/boorusphere')"
    />
    <van-cell
      center
      title="Boorusama (Android)"
      is-link
      label="A mobile client for booru sites built with Flutter"
      @click="openLink('https://github.com/khoadng/Boorusama')"
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
      title="Tachiyomi (Android)"
      is-link
      label="Free and open source manga reader for Android."
      @click="openLink('https://github.com/tachiyomiorg/tachiyomi')"
    />
    <van-cell
      center
      title="TachiyomiJ2K (Android)"
      is-link
      label="TachiyomiJ2K is a free and open source manga reader for Android 6.0 and above. Based on the original Tachiyomi"
      @click="openLink('https://github.com/Jays2Kings/tachiyomiJ2K')"
    />
    <van-cell
      center
      title="CopyMangaX (Android)"
      is-link
      label="拷贝漫画三方APP 、项目采用多模块 和 MVI框架开发"
      @click="openLink('https://github.com/crowforkotlin/CopyMangaX')"
    />
    <van-cell
      center
      title="Kotatsu (Android)"
      is-link
      label="Manga reader for Android"
      @click="openLink('https://kotatsu.app/')"
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
      title="kobi ( Android,iOS,macOS,Windows,Linux)"
      is-link
      label="拷贝漫画客户端"
      @click="openLink('https://github.com/Predidit/Kazumi')"
    />
    <van-cell
      center
      title="HamsterHelper (Windows)"
      is-link
      label="仓鼠助手,p站pixiv图片下载收藏管理器"
      @click="openLink('https://github.com/HamsterHelper/HamsterHelper')"
    />
    <van-cell
      center
      title="Neko Anime (Android)"
      is-link
      label="一个可以在线看番的 Android App."
      @click="openLink('https://github.com/xioneko/neko-anime')"
    />
    <van-cell
      center
      title="纯纯看番 (Android)"
      is-link
      label="纯纯看番，使用 Compose 开发的看番软件，支持多番剧源"
      @click="openLink('https://easybangumi.org/')"
    />
    <van-cell
      center
      title="Animeko (Android,iOS,Linux,macOS,Windows)"
      is-link
      label="集找番、追番、看番的一站式弹幕追番平台"
      @click="openLink('https://github.com/open-ani/animeko')"
    />
    <van-cell
      center
      title="Aniyomi (Android)"
      is-link
      label="Full-featured player and reader, based on Tachiyomi."
      @click="openLink('https://aniyomi.org/')"
    />
    <van-cell
      center
      title="KNKPAnime (Android,Windows)"
      is-link
      label="支持多番剧源与弹幕的看番软件。"
      @click="openLink('https://github.com/KNKPA/KNKPAnime')"
    />
    <van-cell
      center
      title="Kazumi (Android,Windows)"
      is-link
      label="基于自定义规则的番剧采集APP，支持流媒体在线观看，支持弹幕。"
      @click="openLink('https://github.com/Predidit/Kazumi')"
    />
    <van-cell
      center
      title="LightNovelReader (Android)"
      is-link
      label="一款开源的轻小说阅读软件，追求轻量化的体积和流畅的阅读体验。"
      @click="openLink('https://github.com/dmzz-yyhyy/LightNovelReader')"
    />
    <van-cell
      center
      title="Bili You (Android)"
      is-link
      label="一个用flutter制作的第三方B站客户端."
      @click="openLink('https://github.com/lucinhu/bili_you')"
    />
    <van-cell
      center
      title="Kikoeru (Android)"
      is-link
      label="Kikoeru(ASMR Online) android client."
      @click="openLink('https://github.com/loli-ball/KikoeruRelease/releases')"
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
