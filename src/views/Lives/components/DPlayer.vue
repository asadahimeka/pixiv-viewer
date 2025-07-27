<script>
import { BASE_URL } from '@/consts'
import { loadScript } from '@/utils'

export default {
  props: {
    options: {
      type: Object,
    },
  },
  data() {
    return {
      dp: null,
    }
  },
  async mounted() {
    if (!window.DPlayer) {
      await loadScript(`${BASE_URL}static/js/hls.min.js`)
      await loadScript(`${BASE_URL}static/js/DPlayer.min.js`)
    }
    await this.$nextTick()
    this.initPlayer()
  },
  beforeDestroy() {
    this.dp.destroy()
    this.dp = null
  },
  methods: {
    initPlayer() {
      this.dp = new window.DPlayer({ ...this.options, container: this.$el })
      const events = this.dp.events
      Object.keys(events).forEach(item => {
        if (item === 'events') {
          return false
        } else {
          events[item].forEach(event => {
            this.dp.on(event, () => this.$emit(event))
          })
        }
      })
    },
  },
  render(h) {
    return h('div', {
      class: 'dplayer',
    }, [])
  },
}
</script>
