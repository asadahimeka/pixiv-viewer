<template>
  <div class="setting-page">
    <van-cell
      center
      :title="$t('iqjnYM1N-k0dRi9zK1qhY')"
      is-link
      label="https://sleazyfork.org/scripts/444885"
      @click="openLink('https://sleazyfork.org/scripts/444885')"
    />
    <van-cell
      center
      :title="$t('-0kO3F4F8o-BImHqqZqtf')"
      is-link
      label="https://sleazyfork.org/scripts/397612"
      @click="openLink('https://sleazyfork.org/scripts/397612')"
    />
    <van-cell
      center
      :title="$t('nsbx-CsTvalHU191r4ncN')"
      is-link
      label="https://greasyfork.org/scripts/370418"
      @click="openLink('https://greasyfork.org/scripts/370418')"
    />
    <van-cell
      center
      :title="$t('86B5Xwwe8LCBBYG9d90_p')"
      is-link
      label="https://greasyfork.org/scripts/30766"
      @click="openLink('https://greasyfork.org/scripts/30766')"
    />
    <van-cell
      center
      :title="$t('E7xGZBPkIrdAB9Wea7xpP')"
      is-link
      label="https://greasyfork.org/scripts/449227"
      @click="openLink('https://greasyfork.org/scripts/449227')"
    />
    <van-cell
      center
      :title="$t('k6pYRO1Zkj1lEn7icNblt')"
      is-link
      label="https://greasyfork.org/scripts/437487"
      @click="openLink('https://greasyfork.org/scripts/437487')"
    />
    <van-cell
      center
      :title="$t('5g7BkTB_GvTwyZEV7iTRu')"
      is-link
      label="https://greasyfork.org/scripts/23840"
      @click="openLink('https://greasyfork.org/scripts/23840')"
    />
    <van-cell
      center
      :title="$t('EbXDbF2ntTw8_yqu4C3NH')"
      is-link
      label="https://greasyfork.org/scripts/2312"
      @click="openLink('https://greasyfork.org/scripts/2312')"
    />
    <van-cell
      center
      :title="$t('uBK-rFPkvogiYvL4hLauA')"
      is-link
      label="https://greasyfork.org/scripts/33268"
      @click="openLink('https://greasyfork.org/scripts/33268')"
    />
    <van-cell
      center
      :title="$t('ngWsK_SI194uLBKzA3XQY')"
      is-link
      label="https://greasyfork.org/scripts/424023"
      @click="openLink('https://greasyfork.org/scripts/424023')"
    />
    <van-cell
      center
      :title="$t('l0dzMCcjz576ZvVjodxOq')"
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
