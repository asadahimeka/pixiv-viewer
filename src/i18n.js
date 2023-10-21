import Vue from 'vue'
import VueI18n from 'vue-i18n'
import defaultMessages from './locales/zh-Hans.json'

Vue.use(VueI18n)

export const DEFAULT_LANG = 'zh-Hans'

const splitLang = s => typeof s == 'string' && s.split('-')[0]
export function getSelectedLang() {
  const langMap = {
    'zh': 'zh-Hans',
    'zh-CN': 'zh-Hans',
    'zh-TW': 'zh-Hant',
    'zh-HK': 'zh-Hant',
    'zh-MO': 'zh-Hant',
    'zh-SG': 'zh-Hans',
    'zh-MY': 'zh-Hans',
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

  const language = localStorage.getItem('PXV_LANG') ||
    langMap[navigator.language] ||
    langMap[splitLang(navigator.language)] ||
    langMap[splitLang(navigator.languages.find(e => langMap[splitLang(e)]))] ||
    DEFAULT_LANG

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
  document.querySelector('html').setAttribute('lang', lang)
  return lang
}

export function loadLanguageAsync(lang) {
  console.log('loadLanguageAsync: ', lang)

  if (i18n.locale === lang) {
    return Promise.resolve(setI18nLanguage(lang))
  }

  if (loadedLanguages.includes(lang)) {
    return Promise.resolve(setI18nLanguage(lang))
  }

  return import(/* webpackChunkName: "lang-[request]" */ `@/locales/${lang}.json`).then(
    messages => {
      i18n.setLocaleMessage(lang, messages)
      loadedLanguages.push(lang)
      return setI18nLanguage(lang)
    }
  )
}
