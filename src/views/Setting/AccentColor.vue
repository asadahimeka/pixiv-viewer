<template>
  <div class="setting-page">
    <top-bar id="top-bar-wrap" />
    <h3 class="af_title">
      {{ $t('psoXLFqv51j1SeKjTbnms') }}
      <div class="reset-color" @click="resetColor">
        <Icon name="del" scale="2" />
      </div>
    </h3>
    <div class="color-list">
      <div v-for="(c,i) in colors" :key="i" class="color-item" @click="saveActColor(c)">
        <div class="color-bg" :style="{background:c.color}">{{ c.color }}</div>
        <div class="color-name flex-c" :style="{color:c.color}">
          <van-checkbox v-if="c.color == actColor" :value="true" checked-color="#00AA90" style="margin-right: 0.15rem" />
          <span>{{ c.name }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
const colors = [
  { name: 'Miku', color: '#39C5BB' },
  { name: 'Teto', color: '#D93A49' },
  { name: 'Luka', color: '#FAAFBE' },
  { name: 'Rin', color: '#FFA500' },
  { name: 'Len', color: '#FFE211' },
  { name: 'IA', color: '#D6758F' },
  { name: 'Miku(Sekai)', color: '#33CCBB', cname: 'Miku_Sekai' },
  { name: 'MEIKO(Sekai)', color: '#DD4444', cname: 'MEIKO_Sekai' },
  { name: 'KAITO(Sekai)', color: '#3366CC', cname: 'KAITO_Sekai' },
  { name: 'LuoTianyi', color: '#66CCFF' },
  { name: 'YuezhengLing', color: '#EE0000' },
  { name: 'Stardust', color: '#9999FF', cname: 'Stardust_Blue' },
  { name: 'MyGO!!!!!', color: '#3388BB', cname: 'MyGO' },
  { name: 'Tomori', color: '#77BBDD' },
  { name: 'Anon', color: '#FF8899' },
  { name: 'Rāna', color: '#77DD77', cname: 'Rana' },
  { name: 'Soyo', color: '#FFDD88' },
  { name: 'Taki', color: '#7777AA' },
  { name: 'Ave Mujica', color: '#881144', cname: 'Ave_Mujica' },
  { name: 'Uika/Doloris', color: '#BB9854', cname: 'Doloris' },
  { name: 'Mutsumi/Mortis', color: '#799978', cname: 'Mortis' },
  { name: 'Umiri/Timoris', color: '#345566', cname: 'Timoris' },
  { name: 'Nyamu/Amoris', color: '#AB4378', cname: 'Amoris' },
  { name: 'Sakiko/Oblivionis', color: '#7899CC', cname: 'Oblivionis' },
  { name: 'Poppin\'Party', color: '#FF3377', cname: 'Popipa' },
  { name: 'Kasumi', color: '#FF5522' },
  { name: 'Tae', color: '#0077DD' },
  { name: 'Rimi', color: '#FF55BB' },
  { name: 'Saaya', color: '#FFCC11' },
  { name: 'Arisa', color: '#AA66DD' },
  { name: 'Roselia', color: '#3344AA' },
  { name: 'Yukina', color: '#881188' },
  { name: 'Sayo', color: '#00AABB' },
  { name: 'Lisa', color: '#DD2200' },
  { name: 'Ako', color: '#DD0088' },
  { name: 'Rinko', color: '#BBBBBB' },
  { name: 'Afterglow', color: '#E53344' },
  { name: 'Ran', color: '#EE0022' },
  { name: 'Moka', color: '#00CCAA' },
  { name: 'Himari', color: '#FF9999' },
  { name: 'Tomoe', color: '#BB0033' },
  { name: 'Tsugumi', color: '#FFEE88' },
  { name: 'Pastel*Palettes', color: '#33DDAA', cname: 'PasPale' },
  { name: 'Aya', color: '#FF88BB' },
  { name: 'Hina', color: '#55DDEE' },
  { name: 'Chisato', color: '#FFEEAA' },
  { name: 'Maya', color: '#99DD88' },
  { name: 'Eve', color: '#DDBBFF' },
  { name: 'Hello, Happy World!', color: '#FFC02A', cname: 'HHW' },
  { name: 'Kokoro', color: '#FFEE22' },
  { name: 'Kaoru', color: '#AA33CC' },
  { name: 'Hagumi', color: '#FF9922' },
  { name: 'Kanon', color: '#44DDFF' },
  { name: 'Misaki', color: '#006599' },
  { name: 'Michelle', color: '#DD33CC', cname: 'Michelle' },
  { name: 'RAISE A SUILEN', color: '#33CCCC', cname: 'RAS' },
  { name: 'RAISE A SUILEN', color: '#8844DD', cname: 'RAS_Alt' },
  { name: 'LAYER', color: '#CC0000' },
  { name: 'LOCK', color: '#AAEE22' },
  { name: 'MASKING', color: '#EEBB44' },
  { name: 'PAREO', color: '#FF99BB' },
  { name: 'CHU²', color: '#00BBFF', cname: 'CHU2' },
  { name: 'Morfonica', color: '#33AAFF' },
  { name: 'Mashiro', color: '#6677CC' },
  { name: 'Touko', color: '#EE6666' },
  { name: 'Nanami', color: '#EE7744' },
  { name: 'Tsukushi', color: '#EE7788' },
  { name: 'Rui', color: '#669988' },
  { name: 'BanG Dream!', color: '#E5004F', cname: 'BanG_Dream' },
]

export default {
  name: 'SettingAccentColor',
  components: {
  },
  data() {
    return {
      colors,
      actColor: localStorage.PXV_ACT_COLOR,
    }
  },
  head() {
    return { title: this.$t('psoXLFqv51j1SeKjTbnms') }
  },
  methods: {
    saveActColor(c) {
      window.umami?.track('set_act_color', { name: c.name })
      const theme = c.cname || c.name
      const doc = document.documentElement
      doc.classList.remove('t_' + localStorage.PXV_THEME)
      doc.classList.add('custom_theme', 't_' + theme)
      doc.style.setProperty('--accent-color', c.color)
      this.actColor = c.color
      localStorage.PXV_THEME = theme
      localStorage.PXV_ACT_COLOR = c.color
    },
    resetColor() {
      this.actColor = null
      const doc = document.documentElement
      doc.classList.remove('custom_theme')
      doc.classList.remove('t_' + localStorage.PXV_THEME)
      doc.style.removeProperty('--accent-color')
      localStorage.removeItem('PXV_THEME')
      localStorage.removeItem('PXV_ACT_COLOR')
    },
  },
}
</script>

<style lang="stylus" scoped>
.reset-color
  position fixed
  top 0.5rem
  right 20px
  cursor pointer
  ::v-deep .svg-icon
    font-size 0.6rem !important

.color-list
  display flex
  gap 0.2rem
  flex-wrap wrap
  padding 20px
  .color-item
    flex: 0 0 31.8%;
    max-width: 31.8%;
    font-size 0.3rem
    border-radius 0.15rem
    cursor pointer
  .color-bg
    display flex
    justify-content center
    align-items center
    width 100%
    height 1.1rem
    color #fff
    border-radius 0.15rem
  .color-name
    margin-top 10px
    text-align center

</style>
