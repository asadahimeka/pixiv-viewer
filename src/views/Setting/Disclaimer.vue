<template>
  <div class="setting-page">
    <top-bar id="top-bar-wrap" />
    <h3 class="af_title">{{ $t('about.disclaimer') }}</h3>
    <div class="disclaimer_text" v-html="$t('about.disclaimer_text')"></div>
  </div>
</template>

<script>
export default {
  name: 'SettingDisclaimer',
  head() {
    return { title: this.$t('about.disclaimer') }
  },
}
</script>

<style lang="stylus" scoped>
.setting-page
  .af_title
    margin-top 0.6rem
    font-size 16PX
</style>
<style lang="stylus">
.disclaimer_text
  padding 0 20px
  font-size 15PX
  line-height 1.7
  br
    display none
  b
    display block
    font-size 16PX
    text-align center
    margin 20px 0

</style>
