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
      title="pixiv年鑑(β)"
      is-link
      label="https://pixiv.navirank.com/"
      @click="openLink('https://pixiv.navirank.com/')"
    />
    <van-cell
      center
      title="Pixiviz Kai"
      is-link
      label="https://z.pixiv.pics"
      @click="openLink('https://z.pixiv.pics')"
    />
    <van-cell
      center
      title="Pixivel Kai"
      is-link
      label="https://pixivel.kanata.ml"
      @click="openLink('https://pixivel.kanata.ml')"
    />
    <van-cell
      center
      title="PixivNow Kai"
      is-link
      label="https://now.pixiv.pics"
      @click="openLink('https://now.pixiv.pics')"
    />
    <van-cell
      center
      title="pixiv萌え改"
      is-link
      label="https://moe.pixiv.pics"
      @click="openLink('https://moe.pixiv.pics')"
    />
    <van-cell
      center
      title="PixivLxns"
      is-link
      label="https://lxns.pixiv.pics"
      @click="openLink('https://lxns.pixiv.pics')"
    />
    <van-cell
      center
      title="Moeview"
      is-link
      label="https://moeview.kanata.ml"
      @click="openLink('https://moeview.kanata.ml')"
    />
    <van-cell
      center
      title="Booru Masonry"
      is-link
      label="https://booru.kanata.ml"
      @click="openLink('https://booru.kanata.ml')"
    />
    <van-cell
      center
      title="Pixiv Daily Top50"
      is-link
      label="https://www.nanoka.top/illust/pixiv/"
      @click="openLink('https://www.nanoka.top/illust/pixiv/')"
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
