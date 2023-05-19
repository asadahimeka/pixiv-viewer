import store, { blockTags, blockUids } from '@/store'

const re1 = /漫画|描き方|お絵かきTIPS|manga|BL/
const re2 = /R-?18|恋童|ペド|幼女|萝莉|loli|小学生|BL|腐/

const blockedUserIds = [24517, 423251, 16776564]
export function filterHomeIllust(e) {
  if (e.type == 'manga') return false
  if (e.images.length != 1) return false
  if (e.illust_ai_type == 2) return false
  if (blockedUserIds.includes(+e.author.id)) return false
  return !re1.test(JSON.stringify(e.tags))
}

export function filterRecommIllust(e) {
  if (e.illust_ai_type == 2) return false
  return !re2.test(JSON.stringify(e.tags))
}

export function filterHomeNovel(e) {
  if (e.illust_ai_type == 2) return false
  return !re2.test(JSON.stringify(e.tags))
}

export function filterCensoredIllust(artwork) {
  if (blockUids.length && blockUids.includes(`${artwork?.author?.id}`)) {
    return false
  }
  if (blockTags.length) {
    const tags = JSON.stringify(artwork?.tags || [])
    if (blockTags.some(e => tags.includes(e))) {
      return false
    }
  }

  if (artwork.x_restrict == 1) {
    if (artwork.illust_ai_type == 2) {
      return store.state.SETTING.r18 && store.state.SETTING.ai
    }
    return store.state.SETTING.r18
  }
  if (artwork.x_restrict == 2) {
    if (artwork.illust_ai_type == 2) {
      return store.state.SETTING.r18g && store.state.SETTING.ai
    }
    return store.state.SETTING.r18g
  }
  if (artwork.illust_ai_type == 2) {
    return store.state.SETTING.ai
  }
  return true
}

export function filterCensoredIllusts(list = []) {
  return list.filter(filterCensoredIllust)
}
