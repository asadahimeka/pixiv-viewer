import store from '@/store'

export function getArtworkFileName(artwork, index) {
  let tpl = store.state.appSetting.dlFileNameTpl
  tpl = tpl.replaceAll('{author}', artwork.author.name)
  tpl = tpl.replaceAll('{authorId}', artwork.author.id)
  tpl = tpl.replaceAll('{title}', artwork.title)
  tpl = tpl.replaceAll('{pid}', artwork.id)
  tpl = tpl.replaceAll('{index}', index != null ? index : '0')
  tpl = tpl.replaceAll('{width}', artwork.width || '')
  tpl = tpl.replaceAll('{height}', artwork.height || '')
  tpl = tpl.replaceAll('{tags}', artwork.tags.map(e => e.name).join('_'))
  tpl = tpl.replaceAll('{createDate}', artwork.created)
  return tpl
}
