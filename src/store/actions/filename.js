import store from '@/store'
import { replaceValidFileName } from '@/utils'

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
    .replaceAll('{createDate}', artwork.created)
}

const sampleArtwork = {
  id: 135826089,
  title: 'HAPPY END??',
  author: { id: 10308922, name: 'アマネレイ' },
  created: '2025-10-03T18:41:26+09:00',
  width: 1637,
  height: 1157,
  tags: [{ name: 'いますぐ輪廻' }, { name: '初音ミク' }],
}

export function getSampleFileName(tpl) {
  return replaceValidFileName(getArtworkFileName(sampleArtwork, '0', tpl) + '.jpg')
}
