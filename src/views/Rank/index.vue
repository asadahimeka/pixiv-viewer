<template>
  <div class="rank">
    <div class="top">
      <Nav :menu="menu" />
      <van-popover v-model="isDatePickerShow" trigger="click" placement="bottom-end">
        <van-calendar
          color="#f2c358"
          class="sel-rank-date"
          row-height="1rem"
          :min-date="minDate"
          :max-date="maxDate"
          :default-date="date"
          :poppable="false"
          :show-title="false"
          :show-confirm="false"
          @confirm="v => {date = v;isDatePickerShow = false}"
        />
        <template #reference>
          <div class="calendar">
            <div class="date">{{dateNum}}</div>
          </div>
        </template>
      </van-popover>
      <!-- <v-date-picker
        :attributes="[{
          key: 'today',
          highlight: 'yellow',
          dates: date
        }]"
        :min-date="minDate"
        :max-date="maxDate"
        v-model="date"
        mode="single"
        :popover="{
          placement: 'bottom',
          visibility: 'click'
        }"
      >
        <div class="calendar">
          <div class="date">{{dateNum}}</div>
        </div>
      </v-date-picker> -->
    </div>
    <!-- <Top3 v-if="artList.length>=3" :artList="artList.slice(0,3)" /> -->
    <!-- v-if="artList.length>3" -->
    <van-list
      class="rank-list"
      v-model="loading"
      :finished="finished"
      finished-text="没有更多了"
      :error.sync="error"
      error-text="网络异常，点击重新加载"
      @load="getRankList"
    >
      <masonry v-bind="$store.getters.wfProps">
        <ImageCard
          mode="all"
          :artwork="art"
          @click-card="toArtwork($event)"
          v-for="art in artList"
          :key="art.id"
        />
      </masonry>
      <!-- <div class="card-box">
        <div class="column">
          <ImageCard
            mode="meta"
            :artwork="art"
            @click-card="toArtwork($event)"
            v-for="art in odd(artList.slice(3))"
            :key="art.id"
          />
        </div>
        <div class="column">
          <ImageCard
            mode="meta"
            :artwork="art"
            @click-card="toArtwork($event)"
            v-for="art in even(artList.slice(3))"
            :key="art.id"
          />
        </div>
      </div> -->
    </van-list>
    <van-loading v-show="!artList || artList.length===0" class="loading" :size="'50px'" />
  </div>
</template>

<script>
import moment from "moment";
import { List, Loading, Empty, Popover, Calendar } from "vant";
import ImageCard from "@/components/ImageCard";
import Nav from "./components/Nav";
// import Top3 from "./components/Top3";
import _throttle from "lodash/throttle";
import _uniqBy from "lodash/uniqBy";
import api from "@/api";

export default {
  name: "Rank",
  // beforeRouteEnter(to, from, next) {
  //   next(vm => {
  //     document.querySelector('.app-main')?.scrollTo(0, vm.scrollTop);
  //   });
  // },
  // beforeRouteLeave(to, from, next) {
  //   this.scrollTop = document.querySelector('.app-main')?.scrollTop || 0;
  //   next();
  // },
  data() {
    return {
      scrollTop: 0,
      minDate: moment("2007-09-13").toDate(),
      maxDate: moment()
        .subtract(2, "days")
        .toDate(),
      date: moment()
        .subtract(2, "days")
        .toDate(),
      isDatePickerShow: false,
      curType: "daily",
      curPage: 1,
      artList: [],
      error: false,
      loading: false,
      finished: false,
      menu: {
        daily: { name: "日榜", io: "day" },
        weekly: { name: "周榜", io: "week" },
        monthly: { name: "月榜", io: "month" },
        rookie: { name: "新人榜", io: "week_rookie" },
        original: { name: "原创榜", io: "week_original" },
        male: { name: "男性向", io: "day_male" },
        female: { name: "女性向", io: "day_female" },
        r18: { name: "R-18 - 日榜", io: "day_r18", x: true },
        "r18-w": { name: "R-18 - 周榜", io: "week_r18", x: true },
        "r18-m": { name: "R-18 - 男性向", io: "day_male_r18", x: true },
        "r18-f": { name: "R-18 - 女性向", io: "day_female_r18", x: true }
      }
    };
  },
  computed: {
    dateNum() {
      return moment(this.date).date();
    }
  },
  watch: {
    $route() {
      if (
        this.$route.name === "Rank" &&
        this.$route.params.type !== this.curType
      ) {
        this.init();
      }
    },
    date(val, old) {
      if (val !== old) {
        this.init();
      }
    },
    isDatePickerShow(val) {
      if (val) {
        this.$nextTick(() => {
          setTimeout(() => {
            const bd = document.querySelector('.sel-rank-date .van-calendar__body')
            if (bd) bd.scrollTop = bd.scrollHeight
            const sel = document.querySelector('.sel-rank-date .van-calendar__selected-day')
            sel && sel.parentElement.scrollIntoView()
          }, 200);
        })
      }
    }
  },
  methods: {
    reset() {
      this.curType = "daily";
      this.curPage = 1;
      this.artList = [];
    },
    init() {
      this.reset();
      this.curType = this.$route.params.type;
      // console.log(this.curType, this.$route);
      this.getRankList();
    },
    getIOType(type) {
      return this.menu[type] ? this.menu[type].io : null;
    },
    getRankList: _throttle(async function() {
      this.loading = true;
      let type = this.getIOType(this.curType);
      let res = await api.getRankList(type, this.curPage, this.date);
      if (res.status === 0) {
        let newList = res.data;
        if (newList.length == 0) {
          this.finished = true;
        } else {
          let artList = JSON.parse(JSON.stringify(this.artList));

          artList.push(...newList);
          artList = _uniqBy(artList, "id");

          this.artList = artList;
          this.loading = false;
          this.curPage++;
        }
      } else {
        this.$toast({
          message: res.msg
        });
        this.loading = false;
        this.error = true;
      }
    }, 1500),
    odd(list) {
      return list.filter((_, index) => (index + 1) % 2);
    },
    even(list) {
      return list.filter((_, index) => !((index + 1) % 2));
    },
    toArtwork(id) {
      this.$router.push({
        name: "Artwork",
        params: { id, list: this.artList }
      });
    },
    showPopup() {
      this.isDatePickerShow = true;
    }
  },
  mounted() {
    this.init();
  },
  components: {
    Nav,
    // Top3,
    [List.name]: List,
    [Loading.name]: Loading,
    [Empty.name]: Empty,
    [Popover.name]: Popover,
    [Calendar.name]: Calendar,
    ImageCard
  }
};
</script>

<style lang="stylus">
.sel-rank-date
  width 480px
  height 520px
  margin 10px
</style>
<style lang="stylus" scoped>
.rank {
  padding-top: 100px;
  // padding-top: env(safe-area-inset-top);
  // height: 100%;
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
    // top: 60px;
    // top: env(safe-area-inset-top);
    top: 0;
    // width: 750px;
    width: 100%;
    height: 100px;
    padding: 0 32px 0 12px;
    box-sizing: border-box;
    // background: #fff;
    z-index: 1;
    backdrop-filter: blur(6px);
    background: rgba(255, 255, 255, 0.8);

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
