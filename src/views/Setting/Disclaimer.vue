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
}
</script>

<style lang="stylus">
.disclaimer_text
  padding 0 20px
  font-size 21px
  line-height 1.7
  br
    display none
  b
    display block
    font-size 24px
    text-align center
    margin 20px 0
</style>
