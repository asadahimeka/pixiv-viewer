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
      <RankNav :menu="menu" is-novel />
      <span style="display: inline-block;">
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
      <masonry v-bind="$store.getters.novelMyProps">
        <NovelCard
          v-for="(art, i) in artList"
          :key="art.id"
          :artwork="art"
          :index="i + 1"
          @click-card="toArtwork($event)"
        />
      </masonry>
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
import Nav from './components/Nav'
import _ from 'lodash'
import api from '@/api'
import NovelCard from '@/components/NovelCard.vue'
import { i18n } from '@/i18n'

const getRankMenus = () => ({
  day: { name: i18n.t('rank.day'), io: 'day', cat: '4' },
  week: { name: i18n.t('rank.week'), io: 'week', cat: '4' },
  week_rookie: { name: i18n.t('rank.rookie'), io: 'week_rookie', cat: '4' },
  week_ai: { name: 'AI', io: 'week_ai', ai: true, cat: '4' },
  day_male: { name: i18n.t('rank.male'), io: 'day_male', cat: '4' },
  day_female: { name: i18n.t('rank.female'), io: 'day_female', cat: '4' },
  day_r18: { name: i18n.t('rank.day_x'), io: 'day_r18', x: true, cat: '4' },
  week_r18: { name: i18n.t('rank.week_x'), io: 'week_r18', x: true, cat: '4' },
  week_ai_r18: { name: 'R18 AI', io: 'week_ai_r18', x: true, ai: true, cat: '4' },
  day_male_r18: { name: i18n.t('rank.day_x_male'), io: 'day_male_r18', x: true, cat: '4' },
  day_female_r18: { name: i18n.t('rank.day_x_female'), io: 'day_female_r18', x: true, cat: '4' },
})

const getRankCatLabels = () => [i18n.t('common.overall'), i18n.t('common.illust'), i18n.t('common.ugoira'), i18n.t('common.manga'), i18n.t('common.novel')]
const rankCatLinks = ['/rank/daily', '/rank/daily_illust', '/rank/daily_ugoira', '/rank/daily_manga', '/rank_novel/day']
const getRankCatActions = () => getRankCatLabels().map((e, i) => ({ text: e, _v: i.toString() }))

export default {
  name: 'RankNovel',
  components: {
    RankNav: Nav,
    NovelCard,
  },
  data() {
    const maxDate = dayjs().subtract(new Date().getHours() > 14 ? 1 : 2, 'days').toDate()
    return {
      scrollTop: 0,
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
      menu: getRankMenus(),
      showRankCat: false,
      actRankCat: '4',
      rankCatLabels: getRankCatLabels(),
      rankCatActions: getRankCatActions(),
    }
  },
  head() {
    return {
      title: `${this.$t('nav.rank')} - ${this.rankCatLabels[this.actRankCat]}`,
    }
  },
  computed: {
    dateNum() {
      return dayjs(this.date).date()
    },
  },
  watch: {
    $route() {
      if (
        this.$route.name === 'RankNovel' &&
        this.$route.params.type != this.curType
      ) {
        this.init()
      }
    },
    date(val, old) {
      if (val !== old) {
        this.init()
      }
    },
  },
  mounted() {
    this.init()
  },
  activated() {
    this.showRankCat = false
  },
  methods: {
    onRankCatSel({ _v }) {
      const link = rankCatLinks[_v]
      this.$router.replace(link)
    },
    reset() {
      this.curType = this.$route.params.type || 'daily'
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
      const res = await api.getNovelRankList(type, this.curPage, this.date)
      if (res.status === 0) {
        const newList = res.data
        if (newList.length == 0) {
          this.finished = true
        } else {
          this.artList = _.uniqBy([
            ...this.artList,
            ...newList,
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
    toArtwork(id) {
      this.$router.push({
        name: 'NovelDetail',
        params: { id },
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
    width: 100%;
    height: 100px;
    padding: 0 32px 0 12px;
    box-sizing: border-box;
    // background: #fff;
    z-index: 1;
    // backdrop-filter: blur(6px);
    backdrop-filter: saturate(200%) blur(6px);
    background: rgba(255, 255, 255, 0.8);

    .nav {
      flex 1
    }

    .calendar {
      position: relative;
      width: 60px;
      height: 60px;
      margin-left: 8px;
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
