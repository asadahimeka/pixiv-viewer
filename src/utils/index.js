import axios from 'axios'
import dayjs from 'dayjs'
import { Toast } from 'vant'
import store from '@/store'
import { isFsaSupported, saveFile } from './fsa'
import { i18n, isCNLocale } from '@/i18n'
import { getArtworkFileName } from '@/store/actions/filename'
import { BASE_URL } from '@/consts'

export function throttleScroll(el, downFn, upFn) {
  let position = el.scrollTop
  let ticking = false
  return function (arg) {
    if (ticking) return
    ticking = true
    window.requestAnimationFrame(() => {
      const scroll = el.scrollTop
      scroll > position ? downFn?.(scroll, arg) : upFn?.(scroll, arg)
      position = scroll
      ticking = false
    })
  }
}

function fallbackCopyTextToClipboard(text, cb, errCb) {
  const textArea = document.createElement('textarea')
  textArea.value = text
  textArea.style.top = '0'
  textArea.style.left = '0'
  textArea.style.position = 'fixed'

  document.body.appendChild(textArea)
  textArea.focus()
  textArea.select()

  try {
    const successful = document.execCommand('copy')
    successful ? cb?.() : errCb?.()
  } catch (err) {
    console.error('Fallback: Oops, unable to copy', err)
    errCb?.(err)
  }

  document.body.removeChild(textArea)
}

export function copyText(text, cb, errCb) {
  try {
    navigator.clipboard.writeText(text).then(cb, errCb)
  } catch (error) {
    fallbackCopyTextToClipboard(text, cb, errCb)
  }
}

export function setCookieOnce(key, val) {
  document.cookie = `${key}=${val}; expires=Fri, 31 Dec 9999 23:59:59 GMT; path=/;Secure`
}

export function resetCookieOnce(key) {
  document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; Secure`
}

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function setCookie(name, value, days) {
  let expires = ''
  if (days) {
    const date = new Date()
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000))
    expires = '; expires=' + date.toUTCString()
  }
  document.cookie = name + '=' + (value || '') + expires + '; path=/;Secure'
}

export function getCookie(cname) {
  const name = cname + '='
  const ca = document.cookie.split(';')
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i]
    while (c.charAt(0) == ' ') {
      c = c.substring(1)
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length)
    }
  }
  return ''
}

export function removeCookie(key) {
  document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; Secure`
}

export function objectToQueryString(queryParameters) {
  return queryParameters
    ? Object.entries(queryParameters).reduce(
      (queryString, [key, val]) => {
        const symbol = queryString.length === 0 ? '?' : '&'
        queryString += `${symbol}${key}=${val}`
        return queryString
      },
      ''
    )
    : ''
}

export function isURL(s) {
  return /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)$/i.test(s)
}

export function tryURL(url) {
  try {
    return new URL(url)
  } catch (_err) {
    return null
  }
}

function replaceValidFileName(str = '', isDir = false) {
  const maxLen = 128
  if (isDir) {
    str = str.replace(/[\\/|?*:<>'"\s.]/g, '_')
  } else {
    const strArr = str.split('.')
    const ext = strArr.pop()
    str = strArr.join('').replace(/[\\/|?*:<>'"\s.]/g, '_') + '.' + ext
  }
  if (str.length > maxLen) str = str.slice(-maxLen)
  return str
}

/**
 * @param {string|Blob} source
 * @param {string} fileName
 * @param {object} options
 * @param {string} options.message
 * @param {string} options.subDir
 */
export async function downloadFile(source, fileName, options = {}) {
  try {
    if (typeof source == 'string' && !/\.\w+$/.test(fileName)) {
      fileName += `.${source.split('.').pop()}`
    }
    fileName = replaceValidFileName(fileName)

    const loading = Toast.loading({
      duration: 0,
      // forbidClick: true,
      message: options.message || (i18n.t('tip.downloading') + ': ' + fileName),
    })

    if (isFsaSupported && store.state.appSetting.preferDownloadByFsa) {
      if (options.subDir) options.subDir = replaceValidFileName(options.subDir, true)
      const res = await saveFile(source, fileName, options.subDir)
      loading.clear()
      Toast(i18n.t('tip.downloaded') + ': ' + res)
    } else if (typeof source == 'string' && window.__download__ && store.state.appSetting.preferDownloadByTm) {
      await window.__download__(source, fileName)
      loading.clear()
      Toast(i18n.t('tip.downloaded') + ': ' + fileName)
    } else {
      await downloadURL(source, fileName)
      loading.clear()
    }
  } catch (err) {
    console.log('err: ', err)
    Toast.clear(true)
    if (typeof source == 'string') downloadLink(source, fileName)
  }
}

/**
 * @param {string|Blob} source
 * @param {string} fileName
 */
export async function downloadURL(source, fileName) {
  if (source instanceof Blob) {
    source = URL.createObjectURL(source)
  } else {
    const resp = await fetch(source)
    if (!resp.ok) throw new Error('Response not ok.')
    source = URL.createObjectURL(await resp.blob())
  }
  downloadLink(source, fileName)
  URL.revokeObjectURL(source)
}

/**
 * @param {string} source
 * @param {string} fileName
 */
export async function downloadLink(source, fileName) {
  const a = document.createElement('a')
  a.href = source
  a.target = '_blank'
  a.rel = 'noopener noreferrer'
  a.style.display = 'none'
  a.setAttribute('download', fileName)
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

export async function readTextFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsText(file)
  })
}

export function loadScript(src) {
  return new Promise(resolve => {
    const script = document.createElement('script')
    script.src = src
    script.addEventListener('load', () => { resolve() }, false)
    document.head.appendChild(script)
  })
}

export function isSafari() {
  const ua = navigator.userAgent
  if (!/Chrome/i.test(ua) && /Safari/i.test(ua)) return true
  return false
}

export function randomBg() {
  const getRandomRangeNum = (min, max) => min + Math.floor(Math.random() * (max - min))
  const leftHue = getRandomRangeNum(0, 360)
  const bottomHue = getRandomRangeNum(0, 360)
  return `linear-gradient(to right bottom,hsl(${leftHue}, 100%, 90%) 0%,hsl(${bottomHue}, 100%, 90%) 100%)`
}

/** 生成随机中间范围的颜色 */
export function generateRandomColor() {
  const min = 195
  const max = 245
  const r = Math.floor(Math.random() * (max - min)) + min
  const g = Math.floor(Math.random() * (max - min)) + min
  const b = Math.floor(Math.random() * (max - min)) + min
  return `rgb(${r}, ${g}, ${b})`
}

/** 根据背景色生成对比强的文本色 */
export function getContrastingTextColor(backgroundColor) {
  const rgb = backgroundColor.match(/\d+/g).map(Number)
  const luminance = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255
  return luminance > 0.5 ? '#333' : 'white' // 浅色背景用黑字，深色背景用白字
}

export async function checkImgAvailable(src) {
  return new Promise((resolve, reject) => {
    let img = document.createElement('img')
    img.referrerPolicy = 'no-referrer'
    img.src = src
    img.onload = () => {
      resolve(true)
      img = null
    }
    img.onerror = () => {
      reject(new Error('Network error.'))
      img = null
    }
  })
}

export async function checkUrlAvailable(url) {
  const res = await axios.get(url, { timeout: 5000 })
  if (res.data) return true
  throw new Error('Resp not ok.')
}

export async function fancyboxShow(artwork, index = 0, getSrc = e => e.o) {
  if (!window.Fancybox) {
    document.head.insertAdjacentHTML('beforeend', `<link href="${BASE_URL}static/css/fancybox.min.css" rel="stylesheet">`)
    await loadScript(`${BASE_URL}static/js/fancybox.umd.min.js`)
  }
  // eslint-disable-next-line no-new
  new window.Fancybox(artwork.images.map(e => ({
    src: getSrc(e),
    thumb: e.m,
  })), {
    compact: store.state.isMobile,
    backdropClick: 'close',
    contentClick: store.state.isMobile ? 'close' : 'toggleZoom',
    startIndex: index,
    hideScrollbar: false,
    placeFocusBack: false,
    trapFocus: false,
    Hash: false,
    Thumbs: { showOnStart: false },
    Carousel: { infinite: false },
    Toolbar: {
      display: {
        left: ['infobar'],
        middle: [],
        right: ['toggleZoom', 'thumbs', 'myDownload', 'rotateCW', 'flipX', 'flipY', 'close'],
      },
      items: {
        myDownload: {
          tpl: '<button class="f-button"><svg><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M7 11l5 5 5-5M12 4v12"></path></svg></button>',
          click: async ev => {
            console.log('ev: ', ev)
            const { page } = ev.instance.carousel
            const item = artwork.images[page]
            const fileName = `${getArtworkFileName(artwork, page)}.${item.o.split('.').pop()}`
            await downloadFile(item.o, fileName, { subDir: store.state.appSetting.dlSubDirByAuthor ? artwork.author.name : undefined })
          },
        },
      },
    },
  })
}

export function formatIntlNumber(num) {
  try {
    return new Intl.NumberFormat(i18n.locale, {
      notation: 'compact',
      compactDisplay: 'short',
    }).format(num)
  } catch (err) {
    return num
  }
}

export function formatIntlDate(date) {
  try {
    if (isCNLocale()) return dayjs(date).format('YYYY-MM-DD HH:mm')
    date = dayjs(date).toDate()
    return new Intl.DateTimeFormat(i18n.locale, {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(date)
  } catch (err) {
    return date
  }
}
