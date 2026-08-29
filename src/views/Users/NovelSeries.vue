<template>
  <div class="illusts">
    <top-bar />
    <h3 class="af_title">{{ $t('iAH7adsXaqWMXEi3TOuwS') }}({{ $t('common.novel') }})</h3>
    <div style="max-width: 16rem;margin: 0 auto;padding: 0 0.2rem;">
      <template v-if="detail">
        <p class="ss-title">
          {{ detail.title }}
        </p>
        <p class="ss-author"><i>by</i> {{ detail.user.name }}</p>
        <p class="ss-caption">{{ detail.caption }}</p>
        <p style="text-align: center;margin: -0.2rem auto 0.4rem;">
          <van-tag color="#ffe1e1" text-color="#ad0000">
            <van-icon name="orders-o" style="margin-right: 2px;" />
            {{ detail.content_count }}
          </van-tag>
          <van-tag color="#cdeefe" text-color="#0b6aaf">{{ $t('P8RGkre-rnlFxZ18aH2VW', [convertToK(detail.total_character_count)]) }}</van-tag>
        </p>
        <div style="text-align:center;margin-bottom:0.4rem;">
          <van-button type="info" size="small" plain @click="downloadSeriesEpub">
            ⬇️下载系列EPUB
          </van-button>
        </div>
      </template>
      <van-list
        v-model="loading"
        :loading-text="$t('tips.loading')"
        :finished="finished"
        :finished-text="$t('tips.no_more')"
        :error.sync="error"
        :offset="800"
        :error-text="$t('tips.net_err')"
        @load="getArtList()"
      >
        <NovelCard
          v-for="(art,i) in artList"
          :key="art.id"
          mode="all"
          :show-img="false"
          :index="i+1"
          :artwork="art"
          @click-card="toArtwork($event)"
        />
      </van-list>
    </div>
    <van-dialog
      v-model="seriesDl.show"
      :title="seriesDl.title"
      :show-confirm-button="false"
      :close-on-click-overlay="false"
      class="series-dl-dialog"
      get-container="body"
    >
      <div class="series-dl-body">
        <van-progress
          :percentage="seriesDl.total ? Math.floor((seriesDl.current / seriesDl.total) * 100) : 0"
          color="#7232dd"
        />
        <p class="series-dl-status">
          {{ seriesDl.current }} / {{ seriesDl.total }}
          {{ seriesDl.phase === 'build' ? '正在生成 EPUB…' : seriesDl.failed ? '下载失败：' + seriesDl.errorMsg : '下载中…' }}
        </p>
        <div class="series-dl-list">
          <div
            v-for="(it, i) in seriesDl.items"
            :key="it.id"
            class="series-dl-item"
            :class="it.status"
          >
            <span class="idx">{{ i + 1 }}.</span>
            <span class="tt">{{ it.title }}</span>
            <span class="st">{{ seriesDlStatusText(it.status) }}</span>
          </div>
        </div>
        <div class="series-dl-actions">
          <van-button v-if="seriesDl.failed" type="danger" size="small" @click="retrySeriesDownload">
            重试
          </van-button>
          <van-button size="small" @click="cancelSeriesDownload">取消</van-button>
        </div>
      </div>
    </van-dialog>
  </div>
</template>

<script>
import _ from '@/lib/lodash'
import TopBar from '@/components/TopBar'
import NovelCard from '@/components/NovelCard.vue'
import api from '@/api'
import { formatIntlNumber, downloadFile } from '@/utils'
import { isCNLocale } from '@/i18n'
import { runSeriesEpubDownload } from '@/utils/novel'

export default {
  name: 'NovelSeries',
  components: {
    TopBar,
    NovelCard,
  },
  data() {
    return {
      curPage: 1,
      artList: [],
      error: false,
      loading: false,
      finished: false,
      detail: null,
      seriesDl: {
        show: false,
        title: '正在下载系列',
        total: 0,
        current: 0,
        items: [],
        phase: 'fetch',
        failed: false,
        errorMsg: '',
        cancel: false,
        seriesId: null,
        seriesTitle: '',
        _resolvePause: null,
      },
    }
  },
  head() {
    return { title: this.$t('iAH7adsXaqWMXEi3TOuwS') }
  },
  watch: {
    $route() {
      if (
        this.$route.name == 'NovelSeries' &&
        this.$route.params.id != this.detail?.id
      ) {
        this.curPage = 1
        this.artList = []
        this.error = false
        this.finished = false
        this.detail = null
        this.getArtList()
      }
    },
  },
  methods: {
    convertToK(val) {
      if (!val) return '-'
      if (isCNLocale()) return val
      return formatIntlNumber(+val)
    },
    toArtwork(id) {
      this.$router.push({
        name: 'NovelDetail',
        params: { id },
      })
    },
    seriesDlStatusText(status) {
      return (
        {
          pending: '等待',
          downloading: '下载中',
          done: '完成',
          error: '失败',
        }[status] || ''
      )
    },
    async downloadSeriesEpub() {
      const seriesId = this.$route.params.id
      if (!seriesId) return
      const seriesTitle = this.detail?.title || `系列_${seriesId}`
      this.seriesDl = {
        show: true,
        title: '正在下载系列',
        total: 0,
        current: 0,
        items: [],
        phase: 'fetch',
        failed: false,
        errorMsg: '',
        cancel: false,
        seriesId,
        seriesTitle,
        _resolvePause: null,
      }
      const epub = await runSeriesEpubDownload(seriesId, seriesTitle, {
        onProgress: st => {
          this.seriesDl.total = st.total
          this.seriesDl.current = st.current
          this.seriesDl.items = st.items
          this.seriesDl.phase = st.phase
          this.seriesDl.failed = st.failed
          this.seriesDl.errorMsg = st.errorMsg
          requestAnimationFrame(() => {
            document.querySelector('.series-dl-item.downloading')?.scrollIntoView?.()
          })
        },
        onPause: () =>
          new Promise(resolve => {
            this.seriesDl._resolvePause = resolve
          }),
        shouldCancel: () => this.seriesDl.cancel,
      }, this.detail)
      if (this.seriesDl.cancel) {
        this.seriesDl.show = false
        return
      }
      if (epub) {
        const safeName = seriesTitle.replace(/[\\/:*?"<>|]/g, '_')
        await downloadFile(epub, `${safeName}.epub`, { subDir: 'novel' })
        this.seriesDl.show = false
        this.$toast('系列 EPUB 下载完成')
      }
    },
    retrySeriesDownload() {
      if (this.seriesDl._resolvePause) {
        const r = this.seriesDl._resolvePause
        this.seriesDl._resolvePause = null
        this.seriesDl.failed = false
        r('retry')
      }
    },
    cancelSeriesDownload() {
      this.seriesDl.cancel = true
      if (this.seriesDl._resolvePause) {
        const r = this.seriesDl._resolvePause
        this.seriesDl._resolvePause = null
        r('cancel')
      } else {
        this.seriesDl.show = false
      }
    },
    getArtList: _.throttle(async function () {
      const { id } = this.$route.params
      if (!id) return
      this.loading = true
      const res = await api.getNovelSeries(id, this.curPage)
      if (res.status === 0) {
        this.artList = _.uniqBy([
          ...this.artList,
          ...res.data,
        ], 'id')

        console.log('res.data.detail: ', res.data.detail)
        this.detail = res.data.detail
        this.loading = false
        if (res.data.next) {
          this.curPage++
        } else {
          this.finished = true
        }
      } else {
        this.$toast({
          message: res.msg,
          icon: require('@/icons/error.svg'),
        })
        this.loading = false
        this.error = true
      }
    }, 1500),
  },
}
</script>

<style lang="stylus" scoped>
.af_title
  position relative
  margin-top 40px
  margin-bottom 40px
  text-align center
  font-size 28px

.illusts
  position relative
  padding 0 20px 40px

  ::v-deep .novel-card
    .series, .img-cont, .author
      display none !important

  .ss-cover
    display block
    max-width 100%
    margin 20px auto
    border-radius 20px
  .ss-title
    margin-bottom 20px
    font-size 28px
    font-weight bold
    text-align center
    color rgb(31, 31, 31)
  .ss-author
    margin-bottom 20px
    text-align center
    font-size 24px
    color rgb(31, 31, 31)
    i
      color rgb(92, 92, 92)
  .ss-caption
    margin-bottom 40px
    text-align center
    font-size 18px
    color rgb(92, 92, 92)

  .loading
    margin-top: 2rem;
    text-align: center;

  ::v-deep .top-bar-wrap
    width 30%
    padding-top 20px
    background transparent

  .card-box
    padding: 0 12px
    display: flex
    flex-direction: row

    .image-card
      max-height: 360px
      margin: 4px 2px

  ::v-deep .author-cont
    display none !important
  ::v-deep .meta
    &::before
      height 100% !important
      background-image: linear-gradient(0deg, rgba(0,0,0,0.7) 0%, rgba(255,255,255,0) 100%);
    .title
      display block !important

.series-dl-dialog
  width 9rem
  .series-dl-body
    padding 0.4rem 0.5rem 0.6rem
  .series-dl-status
    margin 0.3rem 0
    font-size 0.35rem
    text-align center
    color #666
  .series-dl-list
    max-height 8rem
    overflow-y auto
    border 1px solid #eee
    border-radius 0.2rem
    margin-bottom 0.4rem
  .series-dl-item
    display flex
    align-items center
    gap 0.2rem
    padding 0.15rem 0.3rem
    font-size 0.35rem
    border-bottom 1px solid #f5f5f5
    .idx
      flex 0 0 auto
      color #999
    .tt
      flex 1
      overflow hidden
      text-overflow ellipsis
      white-space nowrap
    .st
      flex 0 0 auto
      color #999
    &.downloading .st
      color #1989fa
    &.done .st
      color #07c160
    &.error .st
      color #ee0a24
  .series-dl-actions
    display flex
    justify-content flex-end
    gap 0.3rem

</style>
