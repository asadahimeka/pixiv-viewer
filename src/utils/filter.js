const re1 = /漫画|描き方|お絵かきTIPS|manga|BL/
const re2 = /R-?18|恋童|ペド|幼女|萝莉|loli|小学生|BL|腐/

export function filterHomeIllust(e) {
  if (e.type == 'manga') return false
  if (e.images.length != 1) return false
  if ([24517, 16776564].includes(+e.author.id)) return false
  return !re1.test(JSON.stringify(e.tags))
}

export function filterRecommIllust(e) {
  return !re2.test(JSON.stringify(e.tags))
}

export function filterHomeNovel(e) {
  return !re2.test(JSON.stringify(e.tags))
}
