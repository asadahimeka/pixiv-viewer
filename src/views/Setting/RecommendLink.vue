<template>
  <div class="setting-page">
    <van-cell
      center
      title="PixivNow"
      is-link
      label="https://pixiv.js.org"
      @click="openLink('https://pixiv.js.org/?ref=pixiv.pics')"
    />
    <van-cell
      center
      title="Pixivel"
      is-link
      label="https://pixivel.moe"
      @click="openLink('https://pixivel.moe/?ref=pixiv.pics')"
    />
    <van-cell
      center
      title="Pixiviz"
      is-link
      label="https://pixiviz.xyz"
      @click="openLink('https://pixiviz.xyz/?ref=pixiv.pics')"
    />
    <van-cell
      center
      title="pixiv年鑑(β)"
      is-link
      label="https://pixiv.navirank.com"
      @click="openLink('https://pixiv.navirank.com/?ref=pixiv.pics')"
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
      label="https://pxelk.pixiv.pics"
      @click="openLink('https://pxelk.pixiv.pics')"
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
      label="https://moeview.pixiv.pics"
      @click="openLink('https://moeview.pixiv.pics')"
    />
    <van-cell
      center
      title="Booru Masonry"
      is-link
      label="https://booru.pixiv.pics"
      @click="openLink('https://booru.pixiv.pics')"
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
      label="https://fav.pixiv.pics/"
      @click="openLink('https://fav.pixiv.pics/')"
    />
    <van-cell
      center
      title="Wotaku - The Otaku Index"
      is-link
      label="https://wotaku.moe/"
      @click="openLink('https://wotaku.moe/')"
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
