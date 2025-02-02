<template>
  <div class="setting-page">
    <van-cell
      center
      title="Yande.re 瀑布流浏览"
      is-link
      label="https://sleazyfork.org/scripts/444885"
      @click="openLink('https://sleazyfork.org/scripts/444885')"
    />
    <van-cell
      center
      title="yande.re refine"
      is-link
      label="https://sleazyfork.org/scripts/397612"
      @click="openLink('https://sleazyfork.org/scripts/397612')"
    />
    <van-cell
      center
      title="ppixiv for Pixiv"
      is-link
      label="https://greasyfork.org/scripts/370418"
      @click="openLink('https://greasyfork.org/scripts/370418')"
    />
    <van-cell
      center
      title="Pixiv Previewer"
      is-link
      label="https://greasyfork.org/scripts/30766"
      @click="openLink('https://greasyfork.org/scripts/30766')"
    />
    <van-cell
      center
      title="Pixiv 排行榜宽屏展示"
      is-link
      label="https://greasyfork.org/scripts/449227"
      @click="openLink('https://greasyfork.org/scripts/449227')"
    />
    <van-cell
      center
      title="RandomSexyPicParser"
      is-link
      label="https://greasyfork.org/scripts/437487"
      @click="openLink('https://greasyfork.org/scripts/437487')"
    />
    <van-cell
      center
      title="大人的 Greasyfork"
      is-link
      label="https://greasyfork.org/scripts/23840"
      @click="openLink('https://greasyfork.org/scripts/23840')"
    />
    <van-cell
      center
      title="右键新标签图片显示最优化"
      is-link
      label="https://greasyfork.org/scripts/2312"
      @click="openLink('https://greasyfork.org/scripts/2312')"
    />
    <van-cell
      center
      title="片假名终结者"
      is-link
      label="https://greasyfork.org/scripts/33268"
      @click="openLink('https://greasyfork.org/scripts/33268')"
    />
    <van-cell
      center
      title="agefans Enhance"
      is-link
      label="https://greasyfork.org/scripts/424023"
      @click="openLink('https://greasyfork.org/scripts/424023')"
    />
    <van-cell
      center
      title="Github 增强 - 高速下载"
      is-link
      label="https://greasyfork.org/scripts/412245"
      @click="openLink('https://greasyfork.org/scripts/412245')"
    />
  </div>
</template>

<script>
export default {
  name: 'SettingRecommendUserscript',
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
