<template>
  <div class="setting-page">
    <top-bar id="top-bar-wrap" />
    <h3 class="af_title">网站推荐</h3>
    <van-cell center title="Booruwf" is-link label="https://booru.kanata.ml"
      @click="openLink('https://booru.kanata.ml')" />
    <van-cell center title="Pixiv Ranking" is-link label="https://www.nanoka.top/illust/pixiv/"
      @click="openLink('https://www.nanoka.top/illust/pixiv/')" />
    <van-cell center title="PixivNow" is-link label="https://pixiv.cocomi.eu.org/ranking"
      @click="openLink('https://pixiv.cocomi.eu.org/ranking')" />
    <van-cell center title="Pixiviz" is-link label="https://pixiviz.kanata.ml/rank"
      @click="openLink('https://pixiviz.kanata.ml/rank')" />
    <van-cell center title="Pixivel" is-link label="https://pixivel.moe/rank"
      @click="openLink('https://pixivel.moe/rank')" />
    <van-cell center title="PIXID" is-link label="https://pixid.top/ranking.php"
      @click="openLink('https://pixid.top/ranking.php')" />
    <van-cell center title="pixiv萌え" is-link label="https://pixiv.moe" @click="openLink('https://pixiv.moe')" />
    <van-cell center title="Pixivic" is-link label="https://pixivic.com" @click="openLink('https://pixivic.com')" />
    <van-cell center title="Vilipix" is-link label="https://www.vilipix.com/ranking"
      @click="openLink('https://www.vilipix.com/ranking')" />
  </div>
</template>

<script>
import { Cell, CellGroup, Switch, Button, ActionSheet } from "vant";

export default {
  name: "SettingRecommendLinks",
  data() {
    return {

    };
  },
  methods: {
    openLink(link) {
      window.umami?.(`open_link_${link.replace('https://', '')}`)
      window.open(link, '_blank', 'noopener')
    },
  },
  components: {
    [Cell.name]: Cell,
    [CellGroup.name]: CellGroup,
    [Button.name]: Button,
    [Switch.name]: Switch,
    [ActionSheet.name]: ActionSheet
  }
};
</script>

<style lang="stylus" scoped>

</style>
