<template>
  <div class="rank">
    <div class="top">
      <van-popover
        v-model="showRankCat"
        placement="bottom-start"
        theme="dark"
        trigger="click"
        :actions="rankCatActions"
        @select="onRankCatSel"
      >
        <template #reference>
          <div class="com_sel_tab" style="margin-right: 2px;">{{ rankCatLabels[actRankCat] }}</div>
        </template>
      </van-popover>
      <div class="nav_divi"></div>
      <RankNav :menu="menu" />
      <van-popover
        v-if="showFilterFavsBtn"
        v-model="showFilterFavsPop"
        placement="bottom-end"
        theme="dark"
        trigger="click"
      >
        <div class="filter-favs-actions">
          <span @click="isFilterFavs=!isFilterFavs">{{ isFilterFavs ? $t('hHPMdWCYd_B2r9F0icW5Y') : $t('KS3utA342Q7yr0mOFARV-') }}</span>
          <span @click="isHideManga=!isHideManga">{{ isHideManga ? $t('KBTp7zyXO4ckXvh14iu0K') : $t('1VVoNDWxcoBn236bEV-_H') }}</span>
        </div>
        <template #reference>
          <van-icon name="filter-o" class="filter-favs-icon" />
        </template>
      </van-popover>
      <span style="display: inline-block;cursor: pointer;">
        <div class="calendar" @click="isDatePickerShow = true">
          <div class="date">{{ dateNum }}</div>
        </div>
      </span>
    </div>
    <van-list
      v-model="loading"
      class="rank-list"
      :loading-text="$t('tips.loading')"
      :finished="finished"
      :finished-text="$t('tips.no_more')"
      :error.sync="error"
      :offset="800"
      :error-text="$t('tips.net_err')"
      @load="getRankList"
    >
      <wf-cont>
        <ImageCard
          v-for="(art, i) in artList"
          :key="art.id"
          mode="all"
          :artwork="art"
          :index="i + 1"
          @click-card="toArtwork(art)"
        />
      </wf-cont>
    </van-list>
    <van-calendar
      ref="calendar"
      v-model="isDatePickerShow"
      color="#f2c358"
      class="sel-rank-date"
      row-height="1.5rem"
      position="top"
      :min-date="minDate"
      :max-date="maxDate"
      :default-date="date"
      :poppable="true"
      :show-title="false"
      :show-confirm="false"
      @confirm="v => { date = v; isDatePickerShow = false }"
    />
    <van-loading v-show="loading" class="loading" :size="'50px'" />
  </div>
</template>

<script>
import dayjs from 'dayjs'
import ImageCard from '@/components/ImageCard'
import Nav from './components/Nav'
import _ from '@/lib/lodash'
import api from '@/api'
import { i18n } from '@/i18n'
import { isAiIllust } from '@/utils/filter'
import { getCache } from '@/utils/storage/siteCache'
import store from '@/store'

const getRankMenus = () => ({
  daily: { name: i18n.t('rank.day'), io: 'day', cat: '0' },
  weekly: { name: i18n.t('rank.week'), io: 'week', cat: '0' },
  monthly: { name: i18n.t('rank.month'), io: 'month', cat: '0' },
  rookie: { name: i18n.t('rank.rookie'), io: 'week_rookie', cat: '0' },
  original: { name: i18n.t('rank.original'), io: 'week_original', cat: '0' },
  daily_ai: { name: 'AI', io: 'day_ai', ai: true, cat: '0' },
  male: { name: i18n.t('rank.male'), io: 'day_male', cat: '0' },
  female: { name: i18n.t('rank.female'), io: 'day_female', cat: '0' },
  r18: { name: i18n.t('rank.day_x'), io: 'day_r18', x: true, cat: '0' },
  r18_w: { name: i18n.t('rank.week_x'), io: 'week_r18', x: true, cat: '0' },
  r18_ai: { name: 'R18 AI', io: 'day_r18_ai', x: true, ai: true, cat: '0' },
  r18_m: { name: i18n.t('rank.day_x_male'), io: 'day_male_r18', x: true, cat: '0' },
  r18_f: { name: i18n.t('rank.day_x_female'), io: 'day_female_r18', x: true, cat: '0' },
  r18g_w: { name: i18n.t('rank.r18g'), io: 'week_r18g', x: true, xg: true, cat: '0' },
  daily_illust: { name: i18n.t('rank.day'), io: 'daily-illust-web', cat: '1' },
  weekly_illust: { name: i18n.t('rank.week'), io: 'weekly-illust-web', cat: '1' },
  monthly_illust: { name: i18n.t('rank.month'), io: 'monthly-illust-web', cat: '1' },
  rookie_illust: { name: i18n.t('rank.rookie'), io: 'rookie-illust-web', cat: '1' },
  daily_r18_illust: { name: i18n.t('rank.day_x'), io: 'daily_r18-illust-web', cat: '1', x: true },
  weekly_r18_illust: { name: i18n.t('rank.week_x'), io: 'weekly_r18-illust-web', cat: '1', x: true },
  daily_ugoira: { name: i18n.t('rank.day'), io: 'daily-ugoira-web', cat: '2' },
  weekly_ugoira: { name: i18n.t('rank.week'), io: 'weekly-ugoira-web', cat: '2' },
  daily_r18_ugoira: { name: i18n.t('rank.day_x'), io: 'daily_r18-ugoira-web', cat: '2', x: true },
  weekly_r18_ugoira: { name: i18n.t('rank.week_x'), io: 'weekly_r18-ugoira-web', cat: '2', x: true },
  daily_manga: { name: i18n.t('rank.day'), io: 'daily-manga-web', cat: '3' },
  weekly_manga: { name: i18n.t('rank.week'), io: 'weekly-manga-web', cat: '3' },
  monthly_manga: { name: i18n.t('rank.month'), io: 'monthly-manga-web', cat: '3' },
  rookie_manga: { name: i18n.t('rank.rookie'), io: 'rookie-manga-web', cat: '3' },
  daily_r18_manga: { name: i18n.t('rank.day_x'), io: 'daily_r18-manga-web', cat: '3', x: true },
  weekly_r18_manga: { name: i18n.t('rank.week_x'), io: 'weekly_r18-manga-web', cat: '3', x: true },
})

const getRankCatLabels = () => [i18n.t('common.overall'), i18n.t('common.illust'), i18n.t('common.ugoira'), i18n.t('common.manga'), i18n.t('common.novel')]
const getRankCatActions = () => getRankCatLabels().map((e, i) => ({ text: e, _v: i.toString() }))

const AUTHORS_NO_TYPE_MANGA = [19585163, 16776564, 1453344, 18923, 18688682, 16106315, 10760589, 18758563]
const AUTHORS_NO_TYPE_AI = [10758107, 88598928, 31909437, 21470736, 14225123, 60651589, 127064402, 87931615, 95485582, 101555203, 20557152, 91255148]
const isHideManga = store.state.appSetting.isHideRankManga

export default {
  name: 'Rank',
  components: {
    RankNav: Nav,
    ImageCard,
  },
  data() {
    const maxDate = dayjs().subtract(new Date().getHours() > 14 ? 1 : 2, 'days').toDate()
    return {
      minDate: dayjs('2007-09-13').toDate(),
      maxDate,
      date: maxDate,
      isDatePickerShow: false,
      curType: 'daily',
      curPage: 1,
      artList: [],
      error: false,
      loading: false,
      finished: false,
      menus: getRankMenus(),
      showRankCat: false,
      actRankCat: '1',
      rankCatLabels: getRankCatLabels(),
      rankCatActions: getRankCatActions(),
      showFilterFavsBtn: window.APP_CONFIG.useLocalAppApi,
      showFilterFavsPop: false,
      isFilterFavs: false,
      isHideManga,
    }
  },
  head() {
    return {
      title: `${this.$t('nav.rank')} - ${this.rankCatLabels[this.actRankCat]}`,
    }
  },
  computed: {
    menu() {
      return _.pickBy(this.menus, o => o.cat == this.actRankCat)
    },
    dateNum() {
      return dayjs(this.date).date()
    },
  },
  watch: {
    $route() {
      if (
        this.$route.name === 'Rank' &&
        this.$route.params.type != this.curType
      ) {
        this.init()
      }
    },
    date(val, old) {
      if (val !== old) {
        this.init()
        // window.umami?.track('change_rank_date', { rank_date: val?.toLocaleDateString() })
      }
    },
    isFilterFavs(val) {
      window.umami?.track('rank_filter_fav_change', { val })
      this.onFilterFavsChange()
    },
    isHideManga(val) {
      window.umami?.track('rank_hide_manga_change', { val })
      this.onFilterFavsChange()
    },
  },
  mounted() {
    this.init()
  },
  activated() {
    this.showRankCat = false
    this.showFilterFavsPop = false
  },
  methods: {
    onRankCatSel({ _v }) {
      if (_v == '4') {
        this.$router.replace('/rank_novel/day')
        return
      }
      this.actRankCat = _v
      const first = Object.keys(this.menu)[0]
      this.$router.replace(`/rank/${first}`)
    },
    onFilterFavsChange() {
      document.documentElement.scrollTo({ top: 0, behavior: 'smooth' })
      this.showFilterFavsPop = false
      this.init()
    },
    reset() {
      const { type = 'daily' } = this.$route.params
      this.actRankCat = this.menus[type].cat
      this.curType = type
      this.curPage = 1
      this.finished = false
      this.error = false
      this.artList = []
    },
    init() {
      this.reset()
      this.getRankList()
    },
    getIOType(type) {
      return this.menu[type] ? this.menu[type].io : null
    },
    getRankList: _.throttle(async function () {
      this.loading = true
      const type = this.getIOType(this.curType)
      let res
      const isWebRank = !!type?.includes('-web')
      if (isWebRank) {
        const [mode, content] = type.replace('-web', '').split('-')
        res = await api.getWebRankList(mode, this.curPage, this.date, content)
      } else {
        res = await api.getRankList(type, this.curPage, this.date)
      }
      if (res.status === 0) {
        if (res.data.length == 0) {
          this.finished = true
        } else {
          let artList = res.data
          if (!isWebRank && this.isHideManga) {
            artList = artList.filter(e => {
              if (e.type == 'manga') return false
              if (/漫画|描き方|お絵かきTIPS|manga/.test(JSON.stringify(e.tags))) return false
              if (AUTHORS_NO_TYPE_MANGA.includes(+e.author.id)) return false
              return true
            })
          }
          if (!this.menu[this.curType]?.x) {
            artList = artList.filter(e => !/R-?18|18\+/i.test(JSON.stringify(e.tags)))
          }
          if (!this.menu[this.curType]?.ai) {
            artList = artList.filter(e => {
              if (isAiIllust(e)) return false
              if (AUTHORS_NO_TYPE_AI.includes(+e.author.id)) return false
              return true
            })
          }
          if (this.isFilterFavs) {
            const favMap = await getCache('local.fav.map', {})
            artList = artList.filter(e => !(favMap[e.id] || e.is_bookmarked))
          }
          this.artList = _.uniqBy([
            ...this.artList,
            ...artList,
          ], 'id')
          this.curPage++
        }
        this.loading = false
      } else {
        this.$toast({
          message: res.msg,
        })
        this.loading = false
        this.error = true
      }
    }, 1500),
    toArtwork(art) {
      this.$store.dispatch('setGalleryList', this.artList)
      this.$router.push({
        name: 'Artwork',
        params: { id: art.id, art },
      })
    },
    showPopup() {
      this.isDatePickerShow = true
    },
  },
}
</script>

<style lang="stylus">
.van-popover__arrow
  display none !important
.sel-rank-date
  width 750px !important
  height 680px !important
  left 50% !important
  margin-left -375px !important
</style>
<style lang="stylus" scoped>
.nav_divi {
  width 1px
  height 24px
  margin 0 15px
  background #000
}

.filter-favs-icon {
  margin-left 0.2rem
  padding 0.1rem 0
  font-size 0.55rem
  transform: translateY(-2px)
  cursor pointer
}

.filter-favs-actions span {
  display block
  padding 10PX 16PX
  cursor pointer
  font-size 14PX
}

.rank {
  min-height 72vh
  padding-top: 100px;
  box-sizing: border-box;
  padding-bottom: 100px;

  .loading {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }

  .top {
    position: fixed;
    display: flex;
    justify-content: space-between;
    align-items: center;
    top: 0;
    left 0
    width: 100%;
    height: 100px;
    padding: 0 20px 0 12px;
    box-sizing: border-box;
    // background: #fff;
    z-index: 10;
    // backdrop-filter: blur(6px);
    backdrop-filter: saturate(200%) blur(10PX);
    background: rgba(255, 255, 255, 0.8);

    .nav {
      flex 1
    }

    .calendar {
      position: relative;
      width: 60px;
      height: 60px;
      margin-left: 15px;
      background: url('~@/assets/images/calendar.png') center no-repeat;
      background-size: 100%;
      transform: translateY(-4px);

      .date {
        position: absolute;
        top: 21.5px;
        left: 55%;
        transform: translateX(-50%);
        color: #666;
        font-family: Dosis;
        font-size: 26px;
        font-weight: 600;
        letter-spacing: 4px;
      }
    }

    ::v-deep .vc-popover-content-wrapper {
      top: 90px !important;
      left: auto !important;
      right: 36px;
      transform: none !important;

      .vc-popover-caret {
        left: 94% !important;
      }
    }
  }

  .rank-list {
    margin: 0 2px;

    .card-box {
      display: flex;
      flex-direction: row;

      .column {
        width: 50%;

        .image-card {
          max-height: 360px;
          margin: 4px 2px;
        }
      }
    }
  }
}
</style>
