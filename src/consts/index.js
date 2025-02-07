import { LocalStorage } from '@/utils/storage'

export const CURRENT_APP_VERSION = 'v1.22.3'
export const isProduction = process.env.NODE_ENV === 'production'
export const BASE_URL = process.env.BASE_URL
export const DEF_HIBIAPI_MAIN = process.env.VUE_APP_DEF_HIBIAPI_MAIN
export const DEF_PXIMG_MAIN = process.env.VUE_APP_DEF_PXIMG_MAIN
export const DEF_API_PROXY = process.env.VUE_APP_DEF_APP_API_PROXY
export const PXIMG_PROXYS = process.env.VUE_APP_PXIMG_PROXYS || ''
export const HIBIAPI_ALTS = process.env.VUE_APP_HIBIAPI_ALTS || ''
export const APP_API_PROXYS = process.env.VUE_APP_APP_API_PROXYS || ''
export const COMMON_PROXY = process.env.VUE_APP_COMMON_PROXY || ''
export const PXIMG_PROXY_BASE = LocalStorage.get('PXIMG_PROXY', DEF_PXIMG_MAIN)
export const BASE_API_URL = LocalStorage.get('HIBIAPI_BASE', DEF_HIBIAPI_MAIN)
export const BACKUP_DOMAINS = process.env.VUE_APP_BACKUP_DOMAINS || ''
export const notSelfHibiApi = !/cocomi\.eu\.org|pixiv\.pictures|169889\.xyz|pxve\.cc|hibiapi\.getloli\.com|api\.obfs\.dev/.test(BASE_API_URL)
export const PIXIV_NEXT_URL = 'https://hibiapi.cocomi.eu.org'
export const PIXIV_NOW_URL = `${PIXIV_NEXT_URL}/api/pixiv-now/http`
export const SILICON_CLOUD_API_KEY = process.env.VUE_APP_SILICON_CLOUD_API_KEY
