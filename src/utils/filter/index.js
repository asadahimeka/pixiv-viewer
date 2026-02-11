import ACFilter from './ACFilter'
import store from '@/store'
import { getCache, setCache } from '../storage/siteCache'

const re1 = /漫画|描き方|お絵かきTIPS|manga|BL|スカラマシュ|散兵/i
const re2 = /R-?18|恋童|ペド|幼女|萝莉|loli|小学生|BL|腐|スカラマシュ|散兵/i

export const HiddenAuthors = {
  HOME_BLOCKED: [24517, 14002767, 16776564, 33333, 423251, 27526, 13150573, 119489738, 62477370],
  NO_TYPE_MANGA: [],
  NO_TYPE_AI: [],
}

export function filterHomeIllust(e) {
  if (e.type == 'manga') return false
  // if (e.images.length != 1) return false
  if (isAiIllust(e)) return false
  if (HiddenAuthors.HOME_BLOCKED.includes(+e.author.id)) return false
  return !re1.test(JSON.stringify(e.tags))
}

export function filterRecommIllust(e) {
  if (isAiIllust(e)) return false
  return !re2.test(JSON.stringify(e.tags))
}

export function filterHomeNovel(e) {
  if (e.illust_ai_type == 2 || e.novel_ai_type == 2) return false
  return !re2.test(JSON.stringify(e.tags))
}

export function isArtworkNotCensored(artwork, state) {
  if (state.blockUids.length && state.blockUids.includes(`${artwork?.author?.id}`)) {
    return false
  }

  if (isBlockTagHit(state.blockTags, artwork?.tags)) {
    return false
  }

  if (artwork.x_restrict == 1) {
    if (isAiIllust(artwork)) {
      return state.contentSetting.r18 && state.contentSetting.ai
    }
    return state.contentSetting.r18
  }
  if (artwork.x_restrict == 2) {
    if (isAiIllust(artwork)) {
      return state.contentSetting.r18g && state.contentSetting.ai
    }
    return state.contentSetting.r18g
  }
  if (isAiIllust(artwork)) {
    return state.contentSetting.ai
  }
  return true
}

export function filterCensoredIllust(artwork) {
  return isArtworkNotCensored(artwork, store.state)
}

export function filterCensoredIllusts(list = []) {
  return list.filter(filterCensoredIllust)
}

export function filterCensoredNovel(artwork) {
  if (store.state.appSetting.novelFilterNoLongTag) {
    const maxTagLen = Number(store.state.appSetting.novelFilterTagLenMax)
    const maxTagSplit = Number(store.state.appSetting.novelFilterTagSplitMax)
    const tagFlag = artwork.tags?.some(e => {
      if (!isNaN(maxTagLen) && e.name?.length > maxTagLen) return true
      if (!isNaN(maxTagSplit) && e.name?.split(/[/#、]/).length > maxTagSplit) return true
      return false
    })
    if (tagFlag) return false
  }
  if (store.state.appSetting.novelFilterNoShortLen) {
    const minTextLen = Number(store.state.appSetting.novelFilterTextLenMin)
    if (!isNaN(minTextLen) && artwork.text_length < minTextLen) {
      return false
    }
  }
  return isArtworkNotCensored(artwork, store.state)
}

export function filterCensoredNovels(list = []) {
  return list.filter(filterCensoredNovel)
}

export function filterCensoredCollections(list = []) {
  const state = store.state
  return list.filter(artwork => {
    if (state.blockUids.length && state.blockUids.includes(`${artwork.userId}`)) {
      return false
    }
    if (isBlockTagHit(state.blockTags, artwork.tags)) {
      return false
    }
    if (artwork.xRestrict == 1) {
      return state.contentSetting.r18
    }
    if (artwork.xRestrict == 2) {
      return state.contentSetting.r18g
    }
    return true
  })
}

const aiTags = [
  'ai',
  'ai生成',
  'ai生成作品',
  'ai作画',
  'aiイラスト',
  'aigenerated',
  'ai-generated',
  'ai-assisted',
  'ai辅助',
  'aiアシスタンス',
  'ai_generated',
  'ai+ps',
  'aiart',
  'aiartwork',
  'aigirl',
  'ai作品',
  'ai生成イラスト',
  'ai画像',
  'ai绘画',
  'novelai',
  'novelaidiffusion',
  'stablediffusion',
]
export function isAiIllust(artwork) {
  return artwork.illust_ai_type == 2 || !!artwork.tags?.some(e => aiTags.includes(e.name?.toLowerCase()))
}

/** @type {ACFilter} */
let acFilter
const presetWords = ['vpn', '推荐', '好用', '梯子', '机场', 'clash', '下载']
export async function mintVerify(word = '', forceCheck = false) {
  if (presetWords.some(e => word.toLowerCase().includes(e.toLowerCase()))) {
    return false
  }
  if (!forceCheck && store.getters.isR18On) {
    return true
  }
  try {
    await ensureACFilter()
    return acFilter.verify(word)
  } catch (error) {
    return true
  }
}
export async function mintFilter(word = '') {
  try {
    await ensureACFilter()
    const res = acFilter.filter(word)
    console.log('res: ', res)
    return res
  } catch (error) {
    return word
  }
}
async function ensureACFilter() {
  if (!acFilter) {
    let filterWords = await getCache('sensitive~filter~words')
    if (!filterWords) {
      const resp = await fetch('https://hibiapi.cocomi.eu.org/sensitive-words-filter/words.txt')
      filterWords = (await resp.text()).split('\n').concat(presetWords)
      setCache('sensitivefilterwords', filterWords, -1)
    }
    acFilter = new ACFilter(filterWords)
  }
}

/**
 * @param {string[]} blockTags
 * @param {string[]|undefined} value
 */
export function isBlockTagHit(blockTags, value) {
  const tags = Array.isArray(value) ? value : []
  if (!tags.length || !blockTags.length) return false
  const blockTagsSet = new Set(blockTags)
  return tags.some(tag => blockTagsSet.has(typeof tag == 'string' ? tag : tag.name))
}

export const BLOCK_INPUT_WORDS = [/r-?18/i, /18-?r/i, /^黄?色情?图$/, /^ero$/i, /工口/, /エロ/]
export const BLOCK_LAST_WORD_RE = /(^\d+$)|スカラ|散/i
export const BLOCK_SEARCH_WORD_RE = /スカラマシュ|散兵|放浪者|流浪者/i
export const BLOCK_RESULT_RE = /恋童|ペド|进群|加好友|度盘|低价|スカラマシュ|散兵/i
