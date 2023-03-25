<template>
  <div class="setting-page">
    <van-cell
      center
      title="Pixiviz"
      is-link
      label="https://z.pixiv.pics"
      @click="openLink('https://z.pixiv.pics')"
    />
    <van-cell
      center
      title="PixivNow"
      is-link
      label="https://now.pixiv.pics"
      @click="openLink('https://now.pixiv.pics')"
    />
    <van-cell
      center
      title="PixivMoe"
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
      title="Pixivel"
      is-link
      label="https://pixivel.moe"
      @click="openLink('https://pixivel.moe')"
    />
    <van-cell
      center
      title="PIXID"
      is-link
      label="https://pixid.top/ranking.php"
      @click="openLink('https://pixid.top/ranking.php')"
    />
    <van-cell
      center
      title="pixivic"
      is-link
      label="https://pixivic.com"
      @click="openLink('https://pixivic.com')"
    />
    <van-cell
      center
      title="vilipix"
      is-link
      label="https://www.vilipix.com/ranking"
      @click="openLink('https://www.vilipix.com/ranking')"
    />
    <van-cell
      center
      title="moeview"
      is-link
      label="https://moeview.kanata.ml"
      @click="openLink('https://moeview.kanata.ml')"
    />
    <van-cell
      center
      title="Voiux"
      is-link
      label="https://gtk.voiux.com"
      @click="openLink('https://gtk.voiux.com/pixiv_ranking?mode=daily')"
    />
    <van-cell
      center
      title="booruwf"
      is-link
      label="https://booru.kanata.ml"
      @click="openLink('https://booru.kanata.ml')"
    />
    <van-cell
      center
      title="Pixiv Ranking"
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
      // window.umami?.(`open_link_${link.replace('https://', '')}`)
      window.open(link, '_blank', 'noopener')
    },
  },
}
</script>

<style lang="stylus" scoped>

</style>
