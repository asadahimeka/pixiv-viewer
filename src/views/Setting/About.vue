<template>
  <div class="setting-page">
    <top-bar id="top-bar-wrap" />
    <h3 class="af_title">关于</h3>
    <van-cell center title="版本" label="v0.51.12" />
    <van-cell center title="源码" is-link label="https://github.com/asadahimeka/pixiv-viewer"
      @click="openLink('https://github.com/asadahimeka/pixiv-viewer')" />
    <van-cell center title="修改自" is-link label="https://github.com/journey-ad/pixiv-viewer"
      @click="openLink('https://github.com/journey-ad/pixiv-viewer')" />
    <van-cell center title="HibiAPI" is-link label="https://github.com/mixmoe/HibiAPI"
      @click="openLink('https://github.com/mixmoe/HibiAPI')" />
    <van-cell center title="备用" is-link label="https://pxv.kanata.ml" @click="openLink('https://pxv.kanata.ml')" />
    <van-cell center title="原版网站" is-link label="https://pixiv.obfs.dev" @click="openLink('https://pixiv.obfs.dev')" />
    <van-cell center title="反馈" is-link label="https://github.com/asadahimeka/pixiv-viewer-kai/issues"
      @click="openLink('https://github.com/asadahimeka/pixiv-viewer-kai/issues')" />
  </div>
</template>

<script>
import { Cell, CellGroup, Switch, Button, ActionSheet } from "vant";

export default {
  name: "SettingAbout",
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
