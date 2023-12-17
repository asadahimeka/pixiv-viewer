import Mint from 'mint-filter'
import store from '@/store'
import { getCache, setCache } from './storage/siteCache'

const re1 = /漫画|描き方|お絵かきTIPS|manga|BL|スカラマシュ|散兵/i
const re2 = /R-?18|恋童|ペド|幼女|萝莉|loli|小学生|BL|腐|スカラマシュ|散兵/i

const blockedUserIds = [24517, 14002767, 16776564, 33333, 423251, 27526, 13150573]
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
  if (e.novel_ai_type == 2) return false
  return !re2.test(JSON.stringify(e.tags))
}

export function filterCensoredIllust(artwork) {
  if (store.state.blockUids.length && store.state.blockUids.includes(`${artwork?.author?.id}`)) {
    return false
  }
  if (store.state.blockTags.length) {
    const tags = JSON.stringify(artwork?.tags || [])
    if (store.state.blockTags.some(e => tags.includes(e))) {
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
  console.log('list: ', list)
  return list.filter(filterCensoredIllust)
}

/** @type {Mint} */
let mint
export async function mintVerify(word = '', forceCheck = false) {
  if (!forceCheck && (store.state.SETTING.r18 || store.state.SETTING.r18g)) {
    return true
  }
  word = word.replace(/https?:\/\//gi, '')
  word = word.replace(/\s+/g, '')
  try {
    if (!mint) {
      let filterWords = await getCache('s.filter.words')
      if (!filterWords) {
        const resp = await fetch('https://unpkg.com/@dragon-fish/sensitive-words-filter@2.0.1/lib/words.txt')
        filterWords = (await resp.text()).split(/\s+/)
        setCache('s.filter.words', filterWords, -1)
      }
      mint = new Mint(filterWords)
    }
    return mint.verify(word)
  } catch (error) {
    return true
  }
}
