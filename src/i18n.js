import Vue from 'vue'
import VueI18n from 'vue-i18n'

import zhHans from './locales/zh-Hans.json'
import zhHant from './locales/zh-Hant.json'
import en from './locales/en.json'
import ja from './locales/ja.json'
import ko from './locales/ko.json'
import de from './locales/de.json'
import fr from './locales/fr.json'
import ru from './locales/ru.json'
import it from './locales/it.json'

Vue.use(VueI18n)

const langMap = {
  'zh': 'zh-Hans',
  'zh-CN': 'zh-Hans',
  'zh-TW': 'zh-Hant',
  'zh-HK': 'zh-Hant',
  'zh-MO': 'zh-Hans',
  'zh-SG': 'zh-Hans',
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

export const i18n = new VueI18n({
  locale: language || 'en',
  fallbackLocale: 'en',
  messages: {
    'zh-Hans': zhHans,
    'zh-Hant': zhHant,
    en,
    ja,
    ko,
    de,
    fr,
    ru,
    it,
  },
})
