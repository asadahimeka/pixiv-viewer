import { Dialog } from 'vant'
import _ from '@/lib/lodash'
import dayjs from 'dayjs'
import store from '@/store'
import { HiddenAuthors } from '@/utils/filter'

async function setAppNotice(notices) {
  const today = dayjs().startOf('day')
  const notice = notices.filter(e => e.pnt.length == 0 || e.pnt.includes('web') || e.pnt.includes(location.hostname)).find(e =>
    today.isAfter(dayjs(e.start).startOf('day') - 1) &&
    today.isBefore(dayjs(e.end).endOf('day'))
  )
  console.log('notice: ', notice)
  if (!notice) return
  if (!notice.alert) {
    store.commit('setAppNotice', notice)
  } else if (localStorage.PXV_NOTICE_READ_REC != notice.id) {
    Dialog.alert({
      width: '8rem',
      title: notice.title,
      message: notice.text,
    }).then(() => {
      localStorage.PXV_NOTICE_READ_REC = notice.id
    })
  }
  if (notice.style) {
    document.head.insertAdjacentHTML('beforeend', `<style>${notice.style}</style>`)
  }
  if (notice.addClass) {
    document.documentElement.className += notice.addClass
  }
  if (Array.isArray(notice.randomClass) && notice.randomClass.length) {
    document.documentElement.classList.add(_.sample(notice.randomClass))
  }
}

async function setSeasonEffects(effects) {
  const today = dayjs().startOf('day')
  const act = effects.filter(e =>
    today.isAfter(dayjs(e.start).startOf('day') - 1) &&
    today.isBefore(dayjs(e.end).endOf('day'))
  )
  console.log('active effects: ', act)
  if (!act) return
  store.commit('setSeasonEffects', act)
}

export async function fetchNotices() {
  try {
    const res = await fetch(`https://pxve-notice.nanoka.top/anon.json?t=${dayjs().format('YYYYMMDD')}`)
    const { notices = [], effects = [], buids = [], rntm = [], rnta = [] } = await res.json()
    setAppNotice(notices)
    setSeasonEffects(effects)
    store.commit('addBlockUids', buids)
    HiddenAuthors.NO_TYPE_MANGA = rntm
    HiddenAuthors.NO_TYPE_AI = rnta
  } catch (err) {
    console.log('err: ', err)
  }
}
