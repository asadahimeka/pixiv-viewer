<template>
  <div v-longpress="backHome" class="top-bar-wrap">
    <van-nav-bar class="top-bar" left-arrow :border="false" @click-left="back">
      <template #left>
        <Icon name="left-arrow" />
      </template>
    </van-nav-bar>
  </div>
</template>

<script>
import { Dialog } from 'vant'
import store from '@/store'

export default {
  name: 'TopBar',
  props: {
    action: {
      type: Function,
    },
  },
  computed: {
    homePath() {
      return store.state.appSetting.appStartPage || '/'
    },
  },
  methods: {
    backHome(ev) {
      ev.preventDefault()
      Dialog.confirm({
        title: this.$t('ebHfHD4g4932R2m1gFtmn'),
        lockScroll: false,
        closeOnPopstate: true,
        cancelButtonText: this.$t('common.cancel'),
        confirmButtonText: this.$t('common.confirm'),
      }).then(res => {
        if (res == 'confirm') {
          this.$router.push(this.homePath)
        }
      }).catch(() => {})
    },
    back() {
      if (this.action) {
        this.action()
        return
      }

      if (history.length <= 2) {
        this.$router.push(this.homePath)
      } else {
        this.$router.back()
      }
    },
  },
}
</script>

<style lang="stylus" scoped>
.top-bar-wrap {
  position: fixed;
  top: 0;
  left 0;
  padding-top: 60px;
  width: 1.6rem;
  height: 1.2rem;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.3), rgba(#fff, 0));
  z-index: 999;
}

.top-bar {
  background: rgba(#000, 0);

  svg {
    font-size: 0.675rem;
    color: #fafafa;
    filter: drop-shadow(2px 4px 4px rgba(#000, 0.8));
  }
}
</style>
