import Vue from 'vue'
import VueI18n from 'vue-i18n'
import defaultMessages from './locales/zh-CN.json'
import { Locale } from 'vant'

Vue.use(VueI18n)

export const DEFAULT_LANG = 'zh-CN'

const splitLang = s => typeof s == 'string' && s.split('-')[0]
export function getSelectedLang() {
  const langMap = {
    'zh': 'zh-CN',
    'zh-CN': 'zh-CN',
    'zh-TW': 'zh-TW',
    'zh-HK': 'zh-TW',
    'zh-MO': 'zh-TW',
    'zh-SG': 'zh-CN',
    'zh-MY': 'zh-CN',
    'de': 'de',
    'el': 'el',
    'en': 'en',
    'es': 'es',
    'fr': 'fr',
    'it': 'it',
    'ja': 'ja',
    'ko': 'ko',
    'pt': 'pt',
    'ru': 'ru',
  }

  let language = localStorage.getItem('PXV_LANG') ||
    langMap[navigator.language] ||
    langMap[splitLang(navigator.language)] ||
    langMap[splitLang(navigator.languages.find(e => langMap[splitLang(e)]))] ||
    DEFAULT_LANG

  if (language == 'zh-Hans') language = 'zh-CN'
  if (language == 'zh-Hant') language = 'zh-TW'

  return language
}

export const i18n = new VueI18n({
  locale: DEFAULT_LANG,
  fallbackLocale: DEFAULT_LANG,
  messages: {
    [DEFAULT_LANG]: defaultMessages,
  },
})

const loadedLanguages = [DEFAULT_LANG]

function setI18nLanguage(lang) {
  console.log('setI18nLanguage: ', lang)
  i18n.locale = lang
  const doc = document.querySelector('html')
  doc.setAttribute('lang', lang)
  if (!['zh-CN', 'zh-TW', 'en', 'ja', 'ko'].includes(lang)) {
    doc.classList.add('non-cjk-lang')
  }
  return lang
}

export async function loadLanguageAsync(lang) {
  console.log('loadLanguageAsync: ', lang)

  if (i18n.locale === lang) {
    return Promise.resolve(setI18nLanguage(lang))
  }

  if (loadedLanguages.includes(lang)) {
    return Promise.resolve(setI18nLanguage(lang))
  }

  const messages = await import(/* webpackChunkName: "lang-[request]" */ `@/locales/${lang}.json`)
  i18n.setLocaleMessage(lang, messages)
  loadedLanguages.push(lang)
  return setI18nLanguage(lang)
}

export async function initLocale() {
  const lang = getSelectedLang()
  if (lang != DEFAULT_LANG) {
    await loadLanguageAsync(lang)
    await setVantLocale(lang)
  }
}

export const isCNLocale = () => i18n.locale.includes('zh')

export async function setVantLocale(selLang) {
  const map = {
    'zh-CN': 'zh-CN',
    'zh-TW': 'zh-TW',
    'de': 'de-DE',
    'el': 'en-US',
    'en': 'en-US',
    'es': 'es-ES',
    'fr': 'fr-FR',
    'it': 'en-US',
    'ja': 'ja-JP',
    'ko': 'en-US',
    'pt': 'en-US',
    'ru': 'en-US',
  }
  const vantLang = map[selLang]
  const { default: locale } = await import(/* webpackChunkName: "vant-locale-[request]" */ `vant/es/locale/lang/${vantLang}`)
  Locale.use(vantLang, locale)
  const unsuppLangs = ['el', 'it', 'ko', 'pt', 'ru']
  if (!unsuppLangs.includes(selLang)) return
  const messages = {
    [vantLang]: {
      vanCalendar: {
        end: i18n.t('search.date.end'),
        start: i18n.t('search.date.start'),
        title: i18n.t('vant_cal_title'),
        startEnd: `${i18n.t('search.date.start')}/${i18n.t('search.date.end')}`,
        weekdays: i18n.t('vant_cal_weekdays_split_by_space').split(/\s+/),
        monthTitle: (year, month) => i18n.t('vant_cal_month_title', { year, month }),
        rangePrompt: maxRange => i18n.t('vant_cal_range_prompt', [maxRange]),
      },
    },
  }
  Locale.add(messages)
}
