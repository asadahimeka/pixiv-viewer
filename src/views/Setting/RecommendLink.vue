<template>
  <div class="setting-page">
    <van-cell
      center
      title="PixivNow"
      is-link
      label="https://pixiv.js.org"
      @click="openLink('https://pixiv.js.org')"
    />
    <van-cell
      center
      title="Pixivel"
      is-link
      label="https://pixivel.moe"
      @click="openLink('https://pixivel.moe')"
    />
    <van-cell
      center
      title="Pixiviz"
      is-link
      label="https://pixiviz.xyz"
      @click="openLink('https://pixiviz.xyz')"
    />
    <van-cell
      center
      title="Pixiviz Kai"
      is-link
      label="https://pixiviz.cocomi.eu.org"
      @click="openLink('https://pixiviz.cocomi.eu.org')"
    />
    <van-cell
      center
      title="Pixivel Kai"
      is-link
      label="https://pxelk.cocomi.eu.org"
      @click="openLink('https://pxelk.cocomi.eu.org')"
    />
    <van-cell
      center
      title="PixivNow Kai"
      is-link
      label="https://pxnow.cocomi.eu.org"
      @click="openLink('https://pxnow.cocomi.eu.org')"
    />
    <van-cell
      center
      title="pixiv萌え改"
      is-link
      label="https://pixivmoe.cocomi.eu.org"
      @click="openLink('https://pixivmoe.cocomi.eu.org')"
    />
    <van-cell
      center
      title="PixivLxns"
      is-link
      label="https://pixivlxns.cocomi.eu.org"
      @click="openLink('https://pixivlxns.cocomi.eu.org')"
    />
    <van-cell
      center
      title="PixivFE"
      is-link
      label="https://pixivfe.cocomi.eu.org"
      @click="openLink('https://pixivfe.cocomi.eu.org')"
    />
    <van-cell
      center
      title="MixPiv"
      is-link
      label="https://mixpiv.cocomi.eu.org"
      @click="openLink('https://mixpiv.cocomi.eu.org')"
    />
    <van-cell
      center
      title="Moeview"
      is-link
      label="https://moeview.cocomi.eu.org"
      @click="openLink('https://moeview.cocomi.eu.org')"
    />
    <van-cell
      center
      title="Booru Masonry"
      is-link
      label="https://booru.cocomi.eu.org"
      @click="openLink('https://booru.cocomi.eu.org')"
    />
    <van-cell
      center
      title="Pixiv Daily Top50"
      is-link
      label="https://www.nanoka.top/illust/pixiv/"
      @click="openLink('https://www.nanoka.top/illust/pixiv/')"
    />
    <van-cell
      center
      title="PixivCollection"
      is-link
      label="https://pxc.cocomi.eu.org"
      @click="openLink('https://pxc.cocomi.eu.org')"
    />
    <van-cell
      center
      title="Ugoira Converter"
      is-link
      label="https://ugoira.cocomi.eu.org"
      @click="openLink('https://ugoira.cocomi.eu.org')"
    />
    <van-cell
      center
      title="Wotaku - The Otaku Index"
      is-link
      label="https://wotaku.wiki"
      @click="openLink('https://wotaku.wiki')"
    />
    <van-cell
      center
      title="AnimeGarden - Anime Torrent aggregation site"
      is-link
      label="https://garden.onekuma.cn"
      @click="openLink('https://garden.onekuma.cn')"
    />
    <van-cell
      center
      title="EverythingMoe - Index of best Anime/Manga sites"
      is-link
      label="https://everythingmoe.com"
      @click="openLink('https://everythingmoe.com')"
    />
    <van-cell
      center
      title="Nekon - ≡ω≡"
      is-link
      label="https://nekon.app"
      @click="openLink('https://nekon.app')"
    />
  </div>
</template>

<script>
export default {
  name: 'SettingRecommendLinks',
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
