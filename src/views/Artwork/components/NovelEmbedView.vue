<template>
  <div class="novel-embed-view">
    <iframe v-if="html" :srcdoc="html"></iframe>
    <van-loading v-else size="50px" style="margin: 2rem;text-align: center;" />
  </div>
</template>

<script>
export default {
  name: 'NovelEmbedView',
  props: {
    html: {
      type: String,
      required: true,
    },
  },
}
</script>

<style lang="stylus" scoped>
.novel-embed-view
  width 100%
  max-width 1000PX
  height 97vh
  @media screen and (max-width: 600px)
    height 80vh
  iframe
    width: 100%
    height: 100%
    border: 0
</style>
