<template>
  <div class="NotFound">
    <h1>404 NOT FOUND</h1>
    <hr style="width: 4em;margin: 2em auto;">
    <img src="https://upload-bbs.miyoushe.com/upload/2023/01/31/190122060/76349637e8740f8685b541f613616c47_3037571537680131263.png" alt="">
  </div>
</template>

<script>
export default {
  name: 'NotFound',
  head: {
    title: '404 Not Found',
  },
}
</script>

<style lang="stylus" scoped>
.NotFound
  text-align center

  h1
    padding-top 60px
    font-size 36px

  img
    width 600px
    max-width 80%

</style>
