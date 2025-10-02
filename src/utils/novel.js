import { Toast } from 'vant'
import { i18n } from '@/i18n'
import { BASE_URL } from '@/consts'
import { loadScript } from '.'

export async function convertHtmlToEpub(html, style, artwork) {
  try {
    style = style.replace(/"/g, '&quot;')
    if (!style) {
      html = html.split('<br>').filter(Boolean).join('<br>')
    }

    const loading = Toast.loading({
      duration: 0,
      forbidClick: true,
      message: i18n.t('tips.loading'),
    })

    if (!window.JSZip) {
      await loadScript(`${BASE_URL}static/js/jszip.min.js`)
    }
    if (!window.jEpub) {
      await loadScript(`${BASE_URL}static/js/ejs.min.js`)
      await loadScript(`${BASE_URL}static/js/jepub.js`)
    }

    const link = `https://pixiv.pictures/n/${artwork.id}`

    // eslint-disable-next-line new-cap
    const jepub = new window.jEpub()
    const tags = artwork.tags.map(e => [e.name, e.translated_name]).flat().filter(Boolean)
    jepub.init({
      i18n: detectLanguage(html).language,
      title: artwork.title,
      author: artwork.author.name,
      publisher: '[Pixiv Viewer] Sakura Yumine',
      description: `<br>${link}<br><br>${artwork.caption}`,
      tags,
    })

    jepub.uuid(link)
    jepub.date(new Date(artwork.create_date))

    const coverImg = artwork.images?.[0]?.l
    if (coverImg) {
      const coverImgBuf = await fetchImage(coverImg)
      if (coverImgBuf) jepub.cover(coverImgBuf)
    }

    const { chapters, images } = processNovel(html)

    await Promise.all(images.map(async src => {
      const buf = await fetchImage(src)
      if (buf) jepub.image(buf, src.split('/').pop())
    }))

    chapters.forEach(({ title, content }) => {
      jepub.add(title, `<div style="${style}">${content}</div>`)
    })

    const epub = await jepub.generate('blob')
    loading.clear()

    return epub
  } catch (err) {
    Toast(`导出 EPUB 出错：${err}`)
    return null
  }
}

function processNovel(html) {
  const chapters = []
  const images = []

  html = html.replace(/<img[^>]+src="([^"]+)"[^>]*>/g, (_match, src) => {
    images.push(src)
    return `<p><%= image["${src.split('/').pop()}"] %></p>`
  })

  if (/<h2[^>]*>/.test(html)) {
    const parts = html.split(/<h2[^>]*>(.*?)<\/h2>/i)
    chapters.push({ title: 'Preface', content: parts[0].trim() })
    for (let i = 1; i < parts.length; i += 2) {
      const title = parts[i].trim()
      const content = parts[i + 1]?.trim() || ''
      chapters.push({ title, content })
    }
  } else if (/<hr[^>]*>/.test(html)) {
    const parts = html.split(/<hr[^>]*>/i)
    parts.forEach((content, idx) => {
      const title = `Page ${idx + 1}`
      chapters.push({ title, content: content.trim() })
    })
  } else {
    chapters.push({ title: 'Chapter 1', content: html.trim() })
  }

  return { chapters, images }
}

async function fetchImage(src) {
  try {
    const response = await fetch(src)
    if (!response.ok) return null
    const arrayBuffer = await response.arrayBuffer()
    return arrayBuffer
  } catch (err) {
    console.log('fetchImage: ', err)
    return null
  }
}

export function detectLanguage(text) {
  const counts = {
    chinese: 0,
    hiragana: 0,
    katakana: 0,
    latin: 0,
    other: 0,
  }

  for (const ch of text) {
    const code = ch.charCodeAt(0)

    if ((code >= 0x4E00 && code <= 0x9FFF) ||
        (code >= 0x3400 && code <= 0x4DBF)) {
      counts.chinese++
    } else if (code >= 0x3040 && code <= 0x309F) {
      counts.hiragana++
    } else if ((code >= 0x30A0 && code <= 0x30FF) ||
               (code >= 0x31F0 && code <= 0x31FF)) {
      counts.katakana++
    } else if ((code >= 0x0020 && code <= 0x024F)) {
      counts.latin++
    } else {
      counts.other++
    }
  }

  const jp = counts.hiragana + counts.katakana
  const cn = counts.chinese
  const total = jp + cn + counts.latin + counts.other

  let result
  if (jp > 0 && jp >= cn * 0.1) {
    result = 'ja'
  } else if (cn > 0) {
    result = 'zh'
  } else if (counts.latin > 0) {
    result = 'en'
  } else {
    result = 'en'
  }

  return {
    language: result,
    ratio: {
      chinese: (cn / total).toFixed(2),
      japaneseKana: (jp / total).toFixed(2),
      latin: (counts.latin / total).toFixed(2),
      other: (counts.other / total).toFixed(2),
    },
    counts,
  }
}
