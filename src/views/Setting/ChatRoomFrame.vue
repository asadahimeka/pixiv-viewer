<template>
  <div class="chat-room-frame">
    <iframe v-if="showIFrame && iframeSrc" :src="iframeSrc" style="width: 100%;height: 100%;border: 0;"></iframe>
  </div>
</template>
<script>
export default {
  name: 'ChatRoomFrame',
  data() {
    return {
      showIFrame: false,
      iframeSrc: 'https://chat.nanoka.top/room/@pxve-discussion?title=Pixiv%20Viewer%20%E8%AE%A8%E8%AE%BA%E9%A2%91%E9%81%93',
    }
  },
  head() {
    return { title: 'Pixiv Viewer 讨论频道' }
  },
  activated() {
    this.showIFrame = true
  },
  deactivated() {
    this.showIFrame = false
  },
}
</script>
<style lang="stylus" scoped>
.chat-room-frame
  width 100%
  height 99vh
  height 99dvh
</style>
<style lang="stylus">
.app-main:has(.chat-room-frame)
  padding 0
</style>
