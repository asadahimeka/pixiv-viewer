import dayjs from 'dayjs'
import store from '@/store'
import { replaceValidFileName } from '@/utils'
import { isAiIllust } from '@/utils/filter'

export function getArtworkFileName(artwork, index, tpl) {
  return (tpl || store.state.appSetting.dlFileNameTpl)
    .replaceAll('{author}', artwork.author.name)
    .replaceAll('{authorId}', artwork.author.id)
    .replaceAll('{title}', artwork.title)
    .replaceAll('{pid}', artwork.id)
    .replaceAll('{index}', index != null ? index : '0')
    .replaceAll('{width}', artwork.width || '')
    .replaceAll('{height}', artwork.height || '')
    .replaceAll('{tags}', artwork.tags.map(e => e.name).join('_'))
    .replaceAll('{createDate}', dayjs(artwork.created).format('YYYYMMDD_HHmmss'))
    .replaceAll('{xRestrict}', ['SFW', 'R18', 'R18G'][artwork.x_restrict])
    .replaceAll('{aiType}', isAiIllust(artwork) ? 'AI' : '')
}

const sampleArtwork = {
  id: 134903417,
  title: '边城',
  author: { id: 6049901, name: '鬼针草' },
  created: '2025-09-09T20:10:21+09:00',
  width: 2150,
  height: 3035,
  tags: [{ name: '風景' }, { name: '少女' }, { name: '背景' }, { name: '三つ編み' }, { name: 'オリジナル5000users入り' }],
  x_restrict: 0,
  illust_ai_type: 1,
}

export function getSampleFileName(tpl) {
  return replaceValidFileName(getArtworkFileName(sampleArtwork, '0', tpl) + '.jpg')
}
