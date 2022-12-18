<template>
  <div class="setting-page">
    <top-bar id="top-bar-wrap" />
    <h3 class="af_title">关于</h3>
    <van-cell center title="版本" clickable label="v0.52.9" />
    <van-cell center title="免责声明" is-link label="点击查看" @click="showDisclaimer" />
    <van-cell center title="源码" is-link label="https://github.com/asadahimeka/pixiv-viewer"
      @click="openLink('https://github.com/asadahimeka/pixiv-viewer')" />
    <van-cell center title="修改自" is-link label="https://github.com/journey-ad/pixiv-viewer"
      @click="openLink('https://github.com/journey-ad/pixiv-viewer')" />
    <van-cell center title="HibiAPI" is-link label="https://github.com/mixmoe/HibiAPI"
      @click="openLink('https://github.com/mixmoe/HibiAPI')" />
    <van-cell center title="备用" is-link label="https://pxv.kanata.ml" @click="openLink('https://pxv.kanata.ml')" />
    <van-cell center title="原版网站" is-link label="https://pixiv.obfs.dev" @click="openLink('https://pixiv.obfs.dev')" />
    <van-cell center title="反馈" is-link label="https://github.com/asadahimeka/pixiv-viewer/issues"
      @click="openLink('https://github.com/asadahimeka/pixiv-viewer/issues')" />
  </div>
</template>

<script>
import { Cell, CellGroup, Dialog } from "vant";

export default {
  name: "SettingAbout",
  data() {
    return {

    };
  },
  methods: {
    openLink(link) {
      // window.umami?.(`open_link_${link.replace('https://', '')}`)
      window.open(link, '_blank', 'noopener')
    },
    showDisclaimer() {
      Dialog.alert({
        title: '免责声明',
        message: `<b>NSFW 相关</b><br>本站默认不显示 NSFW 资源（例如 R-18 插画），任意访问此类资源的行为均是由用户在设置中设定的，并且用户已确保自身年龄已满18岁且未违反当地法律法规所规定的内容。对于可能出现的 NSFW 资源我们均有做出明显的警告标记，我们不鼓励访问或传播此类资源。

<b>用户言论</b><br>“用户言论”指的是 Pixiv 源站用户通过自我介绍、插画简介、评论区等功能发布的言论。这部分属于发表者自身的行为，我们无法有效控制。我们不会发布也不鼓励传播不当言论。如果您在浏览过程中发现了不当内容，我们非常鼓励您前往源站进行举报。

<b>版权声明</b><br>请求得到的全部数据以及媒体资源，版权归 Pixiv 或其原作者所有。

Pixiv Viewer 程序通过 MIT 协议授权。

仅供交流与学习。`,
      })
      // window.umami?.(`show_disclaimer`)
    },
  },
  components: {
    [Cell.name]: Cell,
    [CellGroup.name]: CellGroup,
  }
};
</script>

<style lang="stylus" scoped>

</style>
