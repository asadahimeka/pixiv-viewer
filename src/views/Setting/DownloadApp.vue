<template>
  <div class="setting-page">
    <top-bar id="top-bar-wrap" />
    <h3 class="af_title">{{ $t('setting.down_app') }}</h3>
    <van-cell
      center
      title="Android"
      is-link
      label="Go to App Center"
      @click="openLink('https://install.appcenter.ms/users/yumine/apps/pixiv-viewer/distribution_groups/beta')"
    />
    <van-cell
      center
      title="Windows (App Center)"
      is-link
      label="Go to App Center"
      @click="openLink('https://install.appcenter.ms/users/yumine/apps/pxve/distribution_groups/public')"
    />
    <van-cell
      center
      title="Windows (Github Releases)"
      is-link
      label="Github:asadahimeka/pixiv-viewer"
      @click="openLink('https://github.com/asadahimeka/pixiv-viewer/releases')"
    />
  </div>
</template>

<script>
export default {
  name: 'SettingAbout',
  head() {
    return { title: this.$t('setting.down_app') }
  },
  methods: {
    openLink(link) {
      window.open(link, '_blank', 'noopener noreferrer')
    },
  },
}
</script>

<style lang="stylus" scoped>

</style>
