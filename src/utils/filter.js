const re1 = /漫画|描き方|お絵かきTIPS|manga|BL/
const re2 = /R-?18|恋童|ペド|幼女|萝莉|loli|小学生|BL|腐/

const blockedUserIds = [24517, 423251, 16776564]
export function filterHomeIllust(e) {
  if (e.type == 'manga') return false
  if (e.images.length != 1) return false
  if (blockedUserIds.includes(+e.author.id)) return false
  return !re1.test(JSON.stringify(e.tags))
}

export function filterRecommIllust(e) {
  return !re2.test(JSON.stringify(e.tags))
}

export function filterHomeNovel(e) {
  return !re2.test(JSON.stringify(e.tags))
}
