<template>
  <div class="setting-page">
    <top-bar id="top-bar-wrap" />
    <h3 class="af_title">用户脚本推荐</h3>
    <van-cell center title="Yande.re 瀑布流浏览" is-link label="https://sleazyfork.org/zh-CN/scripts/444885"
      @click="openLink('https://sleazyfork.org/zh-CN/scripts/444885')" />
    <van-cell center title="Pixiv Previewer" is-link label="https://greasyfork.org/zh-CN/scripts/30766"
      @click="openLink('https://greasyfork.org/zh-CN/scripts/30766')" />
    <van-cell center title="Pixiv 排行榜宽屏展示" is-link label="https://greasyfork.org/zh-CN/scripts/449227"
      @click="openLink('https://greasyfork.org/zh-CN/scripts/449227')" />
    <van-cell center title="ppixiv for Pixiv" is-link label="https://github.com/ppixiv/ppixiv"
      @click="openLink('https://github.com/ppixiv/ppixiv')" />
  </div>
</template>

<script>
import { Cell, CellGroup, Switch, Button, ActionSheet } from "vant";

export default {
  name: "SettingRecommendUserscript",
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
