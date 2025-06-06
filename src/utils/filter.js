import Mint from 'mint-filter'
import store from '@/store'
import { getCache, setCache } from './storage/siteCache'
import { COMMON_PROXY } from '@/consts'

const re1 = /漫画|描き方|お絵かきTIPS|manga|BL|スカラマシュ|散兵|雀魂|じゃんたま/i
const re2 = /R-?18|恋童|ペド|幼女|萝莉|loli|小学生|BL|腐|スカラマシュ|散兵|雀魂|じゃんたま/i

const blockedUserIds = [24517, 14002767, 16776564, 33333, 423251, 27526, 13150573]
export function filterHomeIllust(e) {
  if (e.type == 'manga') return false
  if (e.images.length != 1) return false
  if (isAiIllust(e)) return false
  if (blockedUserIds.includes(+e.author.id)) return false
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

/** @type {Mint} */
let mint
const presetWords = ['vpn', 'VPN', '推荐', '好用', '梯子']
export async function mintVerify(word = '', forceCheck = false) {
  if (presetWords.some(e => word.includes(e))) {
    return false
  }
  if (!forceCheck && store.getters.isR18On) {
    return true
  }
  word = word.replace(/[A-Za-z\d\s~`!@#$%^&*()_+\-=[\]{};':"\\|,./<>?]+/g, '')
  try {
    if (!mint) {
      let filterWords = await getCache('s.filter.words')
      if (!filterWords) {
        const resp = await fetch(`${COMMON_PROXY}https://unpkg.com/@dragon-fish/sensitive-words-filter@2.0.1/lib/words.txt`)
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

/**
 * @param {string[]} blockTags
 * @param {string[]|undefined} value
 */
export function isBlockTagHit(blockTags, value) {
  let tags = Array.isArray(value) ? value : []
  if (!tags.length || !blockTags.length) return false
  if (typeof tags[0] != 'string') tags = tags.map(e => e.name)
  const tagSet = new Set(tags)
  return blockTags.some(tag => tagSet.has(tag))
}

export const BLOCK_INPUT_WORDS = [/r-?18/i, /18-?r/i, /^黄?色情?图$/, /^ero$/i, /工口/, /エロ/]
export const BLOCK_LAST_WORD_RE = /スカラマシュ|散|(^\d+$)|雀魂|じゃんたま/i
export const BLOCK_SEARCH_WORD_RE = /スカラマシュ|散兵|放浪者(原神)|流浪者(原神)|雀魂|じゃんたま/i
export const BLOCK_RESULT_RE = /恋童|ペド|幼女|进群|加好友|度盘|低价|スカラマシュ|散兵|雀魂|じゃんたま/
