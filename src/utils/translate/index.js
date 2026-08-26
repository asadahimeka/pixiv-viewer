import { Dialog } from '@/lib/vant-apis'
import { i18n } from '@/i18n'
import { loadScript } from '@/utils'
import { chatCompletionStream } from '@/utils/translate/llmClient'
import store from '@/store'

export async function loadKISSTranslator(isAutoLoad = false, isAutoTrigger = isAutoLoad) {
  if (!isAutoLoad && !localStorage.getItem('PXV_KISST_CFMED')) {
    const res = await Dialog.confirm({
      title: '加载 KISS Translator 脚本',
      message: '提示：如果已安装 KISS Translator 浏览器扩展或用户脚本则无需加载。可在偏好设置中打开自动加载 KISS Translator 脚本。',
      lockScroll: false,
      closeOnPopstate: true,
      cancelButtonText: '取消',
      confirmButtonText: '加载',
    }).catch(() => 'cancel')
    if (res != 'confirm') return false
    localStorage.setItem('PXV_KISST_CFMED', '1')
  }
  if (document.querySelector('#kiss-translator')) {
    return false
  }
  await loadScript('/kiss-translator/KISS-Translator.min.js')
  if (isAutoTrigger) {
    setTimeout(() => {
      window._GM_menuCommands?.find(e => e.name == '开启翻译')?.callback()
    }, 1000)
  }
  return true
}

// export async function loadImtSdk(isAutoLoadImt = false) {
//   if (!isAutoLoadImt && !localStorage.getItem('PXV_IMT_SDK_CFMED')) {
//     const res = await Dialog.confirm({
//       title: '加载沉浸式翻译 SDK',
//       message: '提示：如果已安装沉浸式翻译浏览器扩展则无需加载沉浸式翻译 SDK。可在偏好设置中打开自动加载沉浸式翻译 SDK。',
//       lockScroll: false,
//       closeOnPopstate: true,
//       cancelButtonText: '取消',
//       confirmButtonText: '加载',
//     }).catch(() => 'cancel')
//     if (res != 'confirm') return
//     localStorage.setItem('PXV_IMT_SDK_CFMED', '1')
//   }
//   if (window.immersiveTranslateConfig) return
//   window.immersiveTranslateConfig = {
//     isAutoTranslate: isAutoLoadImt,
//     pageRule: {
//       selectors: [
//         '.novel_text',
//         '.artwork-meta .name-box .title',
//         '.artwork-meta .name-box .series',
//         '.artwork-meta .caption',
//         '.artwork .series-btns',
//         '.users .info .detail .content',
//         '.comments-popup .content',
//         '.live_detail .content .title',
//         '.live_detail .content .chat-item span:last-child',
//       ],
//       translationClasses: ['imt-res-text'],
//     },
//   }
//   await loadScript('https://download.immersivetranslate.com/immersive-translate-sdk-latest.js')
//   const style = document.createElement('style')
//   style.innerHTML = `
//   .imt-fb-more-buttons .btn-animate:first-child,
//   .imt-fb-more-buttons .btn-animate:last-child,
//   .btn-animate[title="关闭悬浮球"],
//   .popup-container .popup-content > div.flex:first-child,
//   .popup-container .trial-pro-container,
//   .popup-container .text-sm.px-1.text-gray-2,
//   .popup-container .widgets-container.mt-5,
//   .popup-container footer,
//   .translation-service-container .custom-select-item:has(.custom-select-item-pro),
//   .translation-service-container select option[value="deepl"],
//   .translation-service-container select option[value="openai"],
//   .translation-service-container select option[value="gemini"],
//   .translation-service-container select option[value="claude"],
//   .translation-service-container select option[value="more"] {
//     display: none !important;
//   }`
//   setTimeout(() => {
//     document.querySelector('#immersive-translate-popup')?.shadowRoot?.appendChild(style)
//     try {
//       const buildinConfig = JSON.parse(localStorage.buildinConfig).buildinConfig
//       buildinConfig.telemetry = false
//       // buildinConfig.translationService = 'bing'
//       buildinConfig.translationService = 'siliconcloud'
//       buildinConfig.translationServices.siliconcloud.assistantId = 'common'
//       buildinConfig.translationServices.siliconcloud.model = 'Qwen/Qwen2.5-7B-Instruct'
//       localStorage.buildinConfig = JSON.stringify({ buildinConfig })
//       const userConfig = JSON.parse(localStorage.userConfig).userConfig
//       userConfig.telemetry = false
//       // userConfig.translationService = 'bing'
//       userConfig.translationService = 'siliconcloud'
//       userConfig.translationServices = userConfig.translationServices || {}
//       userConfig.translationServices.siliconcloud = userConfig.translationServices.siliconcloud || {}
//       userConfig.translationServices.siliconcloud.assistantId = 'common'
//       userConfig.translationServices.siliconcloud.model = 'Qwen/Qwen2.5-7B-Instruct'
//       localStorage.userConfig = JSON.stringify({ userConfig })
//     } catch (err) {
//       console.log('err: ', err)
//     }
//   }, 800)
// }

export function getNoTranslateWords(tags = []) {
  return new Promise(resolve => {
    Dialog.confirm({
      title: '填写不翻译的文本',
      message: `
      <div id="get_pnt_nots_dialog">
        <p style="margin:0.2rem 0">选择或输入不翻译的单词，以英文逗号分隔，留空跳过</p>
        <input id="get_pnt_nots_input" type="text" >
        <div style="height:1px;margin:0.2rem 0;border-bottom:1px solid #ccc"></div>
        ${tags.map(e => `<div class="sel_block_chks"><input type="checkbox" data-tagname="${e.name}" onchange="if(this.checked){window['get_pnt_nots_input'].value=window['get_pnt_nots_input'].value.split(',').filter(e=>e).concat([this.getAttribute('data-tagname')]).join(',')}else{window['get_pnt_nots_input'].value=window['get_pnt_nots_input'].value.split(',').filter(e=>e&&e!=this.getAttribute('data-tagname')).join(',')}">${e.name}</div>`).join('')}
      </div>`,
      lockScroll: false,
      closeOnPopstate: true,
      cancelButtonText: i18n.t('common.cancel'),
      confirmButtonText: i18n.t('common.confirm'),
      beforeClose: (action, done) => {
        if (action == 'confirm') {
          const tagInp = document.querySelector('#get_pnt_nots_input')?.value || ''
          resolve(tagInp)
        }
        done()
      },
    }).catch(() => {})
  })
}

export async function siliconCloudTranslate(novelText = '', notsArr = [], modelId = 'tencent/Hunyuan-MT-7B', onRead = console.log) {
  try {
    if (!novelText.trim()) return
    const mt = store.state.mangaTrans
    const cfg = mt.providers[mt.novelProvider] || {}
    if (!cfg.apiKey) {
      onRead({ done: true, error: 'no_api_key' })
      return
    }
    novelText = replaceNovelMark(novelText)
    if (notsArr.length) {
      notsArr.forEach((e, i) => {
        novelText = novelText.replaceAll(e, `[名字${i}]`)
      })
    }
    await chatCompletionStream({
      baseUrl: cfg.baseUrl,
      apiKey: cfg.apiKey,
      onRead,
      body: {
        model: modelId,
        stream: true,
        messages: [
          {
            role: 'system',
            content: 'You are a professional literary translator for Pixiv Japanese novels.',
          },
          {
            role: 'user',
            content: `Translate the following source text into Simplified Chinese Language. Ensure the translation is fluent and natural, maintaining the original meaning and style. Keep names, tone, pacing, and line intent consistent with the source. Do not censor or skip any content. Provide only the translation, without any explanation.\nSource Text:\n${novelText}`,
          },
        ],
      },
    })
  } catch (err) {
    console.log('siliconCloudTranslate err: ', err)
    onRead({ done: true, error: err.message || String(err) })
  }
}

function replaceNovelMark(text) {
  return text.replace(/\[newpage\]/g, '\n\n————————\n\n')
    .replace(/\[\[rb:([^>[\]]+) *> *([^>[\]]+)\]\]/g, '$1($2)')
    .replace(/\[\[jumpuri:([^>\s[\]]+) *> *([^>\s[\]]+)\]\]/g, '$1')
    .replace(/\[\[emphasismark:([^>[\]]+) *> *([^>[\]]+)\]\]/g, '$1')
    .replace(/\[i:([^[\]]+)\]/g, '$1')
    .replace(/\[b:([^[\]]+)\]/g, '$1')
    .replace(/\[pixivimage:([\d-]+)\]/g, 'https://pximg.cocomi.eu.org/-pid-/$1')
    .replace(/\[chapter: *([^[\]]+)\]/g, '\n$1\n')
    .replace(/\[uploadedimage:(\d+)\]/g, '')
}

export const isNativeTranslatorSupported = 'Translator' in self && !/EdgA?\//i.test(navigator.userAgent)
let translator
async function ensureTranslator() {
  if (translator) return
  translator = await window.Translator.create({
    sourceLanguage: 'ja',
    targetLanguage: 'zh',
  })
}
export async function nativeTranslate(novelText = '', onRead = () => {}) {
  try {
    if (!novelText.trim()) return
    novelText = replaceNovelMark(novelText)
    const textArr = novelText.split('\n')
    await ensureTranslator()
    for (const text of textArr) {
      if (!text.trim()) continue
      const stream = translator.translateStreaming(text)
      for await (const chunk of stream) {
        console.log(chunk)
        onRead({ done: false, content: chunk })
      }
      onRead({ done: false, content: '\n' })
    }
    onRead({ done: true })
  } catch (err) {
    console.log('nativeTranslate err: ', err)
  }
}
