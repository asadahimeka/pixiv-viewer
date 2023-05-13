<template>
  <div class="nav">
    <router-link
      v-for="(item, route) in menu"
      v-show="showModeNav(item)"
      :key="route"
      replace
      :to="{ name: isNovel ? 'RankNovel' : 'Rank', params: { type: route } }"
      class="normal"
      :class="{ cur: $route.params.type === route }"
    >
      {{ item.name }}
    </router-link>
  </div>
</template>

<script>
import { mapState } from 'vuex'
export default {
  props: {
    menu: {
      type: Object,
      required: true,
    },
    isNovel: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    ...mapState(['SETTING']),
  },
  mounted() {
    this.init()
  },
  updated() {
    this.init()
  },
  methods: {
    showModeNav(item) {
      if (item.x && !this.SETTING.r18) return false
      if (item.ai && !this.SETTING.ai) return false
      if (item.xg && !this.SETTING.r18g) return false
      return true
    },
    init() {
      const cur = document.querySelector('.cur')
      cur && cur.scrollIntoView()
    },
  },
}
</script>

<style lang="stylus" scoped>
.nav {
  // width: 90%;
  overflow-x: auto;
  overflow-y: hidden;
  white-space: nowrap;

  a {
    display: inline-block;
    font-size: 28px;
    padding: 12px 20px;
    margin: 12px 6px;
    border-radius: 24px;
    color: #333;
    background: #eee;
    box-sizing: border-box;
    scroll-margin: 120px;

    &.cur {
      background: #f2c358;
    }
  }
}</style>
