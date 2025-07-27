import { Dialog } from 'vant'
import { SILICON_CLOUD_API_KEY } from '@/consts'
import { loadScript } from '.'
import { i18n } from '@/i18n'

export async function loadImtSdk(isAutoLoadImt = false) {
  if (!isAutoLoadImt && !localStorage.getItem('PXV_IMT_SDK_CFMED')) {
    const res = await Dialog.confirm({
      title: '加载沉浸式翻译 SDK',
      message: '提示：如果已安装沉浸式翻译浏览器扩展则无需加载沉浸式翻译 SDK。可在偏好设置中打开自动加载沉浸式翻译 SDK。',
      lockScroll: false,
      closeOnPopstate: true,
      cancelButtonText: '取消',
      confirmButtonText: '加载',
    }).catch(() => 'cancel')
    if (res != 'confirm') return
    localStorage.setItem('PXV_IMT_SDK_CFMED', '1')
  }
  if (window.immersiveTranslateConfig) return
  window.immersiveTranslateConfig = {
    isAutoTranslate: isAutoLoadImt,
    pageRule: {
      selectors: [
        '.novel_text',
        '.artwork-meta .name-box .title',
        '.artwork-meta .name-box .series',
        '.artwork-meta .caption',
        '.artwork .series-btns',
        '.users .info .detail .content',
        '.comments-popup .content',
        '.live_detail .content .title',
        '.live_detail .content .chat-item span:last-child',
      ],
      translationClasses: ['imt-res-text'],
    },
  }
  await loadScript('https://download.immersivetranslate.com/immersive-translate-sdk-latest.js')
  const style = document.createElement('style')
  style.innerHTML = `
  .imt-fb-more-buttons .btn-animate:first-child,
  .imt-fb-more-buttons .btn-animate:last-child,
  .btn-animate[title="关闭悬浮球"],
  .popup-container .popup-content > div.flex:first-child,
  .popup-container .trial-pro-container,
  .popup-container .text-sm.px-1.text-gray-2,
  .popup-container .widgets-container.mt-5,
  .popup-container footer,
  .translation-service-container .custom-select-item:has(.custom-select-item-pro),
  .translation-service-container select option[value="deepl"],
  .translation-service-container select option[value="openai"],
  .translation-service-container select option[value="gemini"],
  .translation-service-container select option[value="claude"],
  .translation-service-container select option[value="more"] {
    display: none !important;
  }`
  setTimeout(() => {
    document.querySelector('#immersive-translate-popup')?.shadowRoot?.appendChild(style)
    try {
      const buildinConfig = JSON.parse(localStorage.buildinConfig).buildinConfig
      buildinConfig.telemetry = false
      // buildinConfig.translationService = 'bing'
      buildinConfig.translationService = 'siliconcloud'
      buildinConfig.translationServices.siliconcloud.APIKEY = SILICON_CLOUD_API_KEY
      buildinConfig.translationServices.siliconcloud.assistantId = 'common'
      buildinConfig.translationServices.siliconcloud.model = 'Qwen/Qwen2-7B-Instruct'
      localStorage.buildinConfig = JSON.stringify({ buildinConfig })
      const userConfig = JSON.parse(localStorage.userConfig).userConfig
      userConfig.telemetry = false
      // userConfig.translationService = 'bing'
      userConfig.translationService = 'siliconcloud'
      userConfig.translationServices = userConfig.translationServices || {}
      userConfig.translationServices.siliconcloud = userConfig.translationServices.siliconcloud || {}
      userConfig.translationServices.siliconcloud.APIKEY = SILICON_CLOUD_API_KEY
      userConfig.translationServices.siliconcloud.assistantId = 'common'
      userConfig.translationServices.siliconcloud.model = 'Qwen/Qwen2-7B-Instruct'
      localStorage.userConfig = JSON.stringify({ userConfig })
    } catch (err) {
      console.log('err: ', err)
    }
  }, 800)
}

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

const aiModelMap = {
  glm: 'THUDM/glm-4-9b-chat',
  glm_0414: 'THUDM/GLM-4-9B-0414',
  glm_z1: 'THUDM/GLM-Z1-9B-0414',
  qwen3: 'Qwen/Qwen3-8B',
  qwen2: 'Qwen/Qwen2-7B-Instruct',
  qwen2_5: 'Qwen/Qwen2.5-7B-Instruct',
  ds_r1_llama: 'deepseek-ai/DeepSeek-R1-Distill-Llama-8B',
  ds_r1_qwen: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-7B',
}
export async function siliconCloudTranslate(novelText = '', notsArr = [], aimd = 'glm', onRead = console.log) {
  try {
    if (!novelText.trim()) return
    novelText = replaceNovelMark(novelText)
    if (notsArr.length) {
      notsArr.forEach((e, i) => {
        novelText = novelText.replaceAll(e, `[名字${i}]`)
      })
    }
    const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${SILICON_CLOUD_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: aiModelMap[aimd],
        // temperature: aimd == 'glm' ? 0.01 : 0,
        stream: true,
        messages: [
          {
            role: 'system',
            // content: 'You are a professional, authentic machine translation engine.',
            content: '你是一个专业的、正宗的机器翻译引擎。',
            // content: 'You are a highly skilled translation engine with expertise in eBook translation. Your function is to translate eBook texts accurately into the Simplified Chinese Language, maintaining the original tone, style, and formatting. Focus on delivering translations that resonate with the intended audience while ensuring the essence of the original text is preserved.',
            // content: 'You are a highly skilled translation engine with expertise in fiction literature. Your function is to translate texts into the Simplified Chinese Language, capturing the narrative depth and emotional nuances of the original work. Maintain the original storytelling elements and cultural references without adding any explanations or annotations.',
          },
          {
            role: 'user',
            // content: `Translate the text starting on the next line into Simplified Chinese Language, output translation ONLY. NO explanations. NO notes. The content in "「」" also needs to be translated. Input:\n${novelText}`,
            // content: `Translate the following source text to Simplified Chinese Language, Output translation directly without any additional text.\nSource Text: ${novelText}`,
            content: `将下面的文本翻译为简体中文，直接输出翻译结果，不附加其他文本。\n${novelText}`,
          },
        ],
      }),
    })
    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value, { stream: true })
      const jsonLines = chunk.split('\n').filter(line => line.trim() !== '')

      for (let jsonLine of jsonLines) {
        jsonLine = jsonLine.replace(/^data: /, '')
        if (jsonLine === '[DONE]') {
          onRead({ done: true })
          return
        }
        const json = JSON.parse(jsonLine)
        const { content, reasoning_content: reason } = json.choices[0].delta

        if (content) {
          onRead({ done: false, content })
        } else if (reason) {
          onRead({ done: false, content: reason, reasoning: true })
        }
      }
    }
  } catch (err) {
    console.log('siliconCloudTranslate err: ', err)
  }
}

function replaceNovelMark(text) {
  return text.replace(/\[newpage\]/g, '\n\n————————\n\n')
    .replace(/\[\[rb:([^>[\]]+) *> *([^>[\]]+)\]\]/g, '$1($2)')
    .replace(/\[\[jumpuri:([^>\s[\]]+) *> *([^>\s[\]]+)\]\]/g, '$1')
    .replace(/\[pixivimage:([\d-]+)\]/g, 'https://pixiv.re/$1.png')
    .replace(/\[chapter: *([^[\]]+)\]/g, '\n$1\n')
    .replace(/\[uploadedimage:(\d+)\]/g, '')
}
