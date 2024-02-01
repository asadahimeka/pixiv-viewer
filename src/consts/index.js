import { LocalStorage } from '@/utils/storage'

export const DEF_HIBIAPI_MAIN = process.env.VUE_APP_DEF_HIBIAPI_SFW
export const DEF_PXIMG_MAIN = process.env.VUE_APP_DEF_PXIMG_MAIN
export const DEF_API_PROXY = process.env.VUE_APP_DEF_APP_API_PROXY
export const PXIMG_PROXYS = process.env.VUE_APP_PXIMG_PROXYS || ''
export const HIBIAPI_ALTS = process.env.VUE_APP_HIBIAPI_ALTS || ''
export const APP_API_PROXYS = process.env.VUE_APP_APP_API_PROXYS || ''
export const COMMON_PROXY = process.env.VUE_APP_COMMON_PROXY || ''
export const PXIMG_PROXY_BASE = LocalStorage.get('PXIMG_PROXY', DEF_PXIMG_MAIN)
export const BASE_API_URL = LocalStorage.get('HIBIAPI_BASE', DEF_HIBIAPI_MAIN)
export const notSelfHibiApi = !/cocomi\..+|pixiv\.pics/.test(BASE_API_URL)
