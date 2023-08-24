import Vue from 'vue'
import VueI18n from 'vue-i18n'
import defaultMessages from './locales/zh-Hans.json'

Vue.use(VueI18n)

export function getSelectedLang() {
  const langMap = {
    'zh': 'zh-Hans',
    'zh-CN': 'zh-Hans',
    'zh-TW': 'zh-Hant',
    'zh-HK': 'zh-Hant',
    'zh-MO': 'zh-Hant',
    'zh-SG': 'zh-Hans',
    'zh-MY': 'zh-Hans',
    'ja': 'ja',
    'ja-JP': 'ja',
    'en': 'en',
    'en-US': 'en',
    'en-GB': 'en',
    'ko': 'ko',
    'ko-KR': 'ko',
    'de': 'de',
    'de-DE': 'de',
    'fr': 'fr',
    'fr-FR': 'fr',
    'ru': 'ru',
    'ru-RU': 'ru',
    'it': 'it',
    'it-IT': 'it',
  }
  const language = localStorage.getItem('PXV_LANG') || langMap[navigator.language]
  console.log('language: ', language)
  return language
}

export const DEFAULT_LANG = 'zh-Hans'

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
