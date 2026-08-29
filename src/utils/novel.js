import dayjs from 'dayjs'
import { Toast } from '@/lib/vant-apis'
import { i18n } from '@/i18n'
import { BASE_URL, COMMON_IMAGE_PROXY } from '@/consts'
import api, { imgProxy } from '@/api'
import { loadScript, sleep } from '.'

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
      description: `<br>${link}<br><br>${formatDate(artwork.create_date)}<br><br>${artwork.caption}`,
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

    jepub.add('作品信息', buildMetaHeaderEpub(artwork))

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

export function formatDate(date) {
  if (!date) return ''
  try {
    return dayjs(date).format('YYYY-MM-DD HH:mm')
  } catch (err) {
    return String(date)
  }
}

export function escapeHtml(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function formatTags(tags) {
  if (!Array.isArray(tags) || !tags.length) return ''
  return tags
    .map(t => {
      const name = t.name || ''
      const trans = t.translated_name
      return trans ? `${name} (${trans})` : name
    })
    .filter(Boolean)
    .join(' / ')
}

export function captionToText(caption) {
  if (!caption) return ''
  // 保留 <br> 为换行，其余标签去除
  let html = caption.replace(/<br\s*\/?>/gi, '\n')
  html = html.replace(/<[^>]+>/g, '')
  // 实体解码
  const txt = document.createElement('textarea')
  txt.innerHTML = html
  return txt.value.trim()
}

function buildMetaRows(artwork) {
  const rows = []
  rows.push(['标题', artwork.title])
  rows.push(['作者', `${artwork.author?.name || ''} (ID: ${artwork.author?.id})`])
  rows.push(['小说ID', `${artwork.id}`])
  rows.push(['创建时间', formatDate(artwork.create_date)])
  if (artwork.series?.id) {
    rows.push(['系列', `${artwork.series.title} (ID: ${artwork.series.id})`])
  }
  rows.push(['标签', formatTags(artwork.tags)])
  const caption = captionToText(artwork.caption)
  if (caption) rows.push(['简介', caption])
  rows.push([
    '统计',
    `字数：${artwork.text_length}  收藏：${artwork.total_bookmarks}  浏览：${artwork.total_view}`,
  ])
  rows.push(['原链接', `https://www.pixiv.net/novel/show.php?id=${artwork.id}`])
  return rows
}

export function buildMetaHeaderTxt(artwork) {
  const lines = buildMetaRows(artwork).map(([k, v]) =>
    v.includes('\n') ? `${k}：\n${v}` : `${k}：${v}`
  )
  return lines.join('\n') + '\n\n'
}

export function buildMetaHeaderMd(artwork) {
  const lines = buildMetaRows(artwork).map(([k, v]) => {
    if (v.includes('\n')) {
      return `> **${k}**：\n>\n> ${v.replace(/\n/g, '\n> ')}`
    }
    return `> **${k}**：${v}`
  })
  return lines.join('\n') + '\n\n---\n\n'
}

export function buildMetaHeaderHtml(artwork) {
  const rows = buildMetaRows(artwork).map(([k, v]) => {
    if (k === '原链接') {
      return `<div><b>${k}：</b><a href="${escapeHtml(v)}">${escapeHtml(v)}</a></div>`
    }
    if (v.includes('\n')) {
      return `<div><b>${k}：</b><br>${escapeHtml(v).replace(/\n/g, '<br>')}</div>`
    }
    return `<div><b>${k}：</b>${escapeHtml(v)}</div>`
  })
  return `<div class="novel-meta-header" style="margin-bottom:1em;padding:0.5em;border:1px solid #ddd;">${rows.join('')}</div>`
}

export function buildMetaHeaderEpub(artwork) {
  const rows = buildMetaRows(artwork).map(([k, v]) => {
    if (k === '原链接') {
      return `<p><b>${k}：</b><a href="${escapeHtml(v)}">${escapeHtml(v)}</a></p>`
    }
    if (v.includes('\n')) {
      return `<p><b>${k}：</b><br>${escapeHtml(v).replace(/\n/g, '<br>')}</p>`
    }
    return `<p><b>${k}：</b>${escapeHtml(v)}</p>`
  })
  return rows.join('')
}

export async function buildSeriesEpub(seriesMeta, items) {
  try {
    if (!window.JSZip) {
      await loadScript(`${BASE_URL}static/js/jszip.min.js`)
    }
    if (!window.jEpub) {
      await loadScript(`${BASE_URL}static/js/ejs.min.js`)
      await loadScript(`${BASE_URL}static/js/jepub.js`)
    }

    // eslint-disable-next-line new-cap
    const jepub = new window.jEpub()
    const firstArt = items[0]?.artwork
    const tags = (firstArt?.tags || [])
      .map(e => [e.name, e.translated_name])
      .flat()
      .filter(Boolean)
    let description = `系列：${seriesMeta.title} (ID: ${seriesMeta.id})`
    if (seriesMeta.content_count) {
      description += ` 共${seriesMeta.content_count}篇`
    }
    if (seriesMeta.total_character_count) {
      description += ` ${seriesMeta.total_character_count}字`
    }
    if (seriesMeta.caption) {
      description += ` 简介：${seriesMeta.caption}`
    }
    jepub.init({
      i18n: detectLanguage(items[0]?.text || '').language,
      title: seriesMeta.title,
      author: seriesMeta.author || firstArt?.author?.name || '',
      publisher: '[Pixiv Viewer] Sakura Yumine',
      description,
      tags,
    })
    jepub.uuid(`https://www.pixiv.net/novel/series/${seriesMeta.id}`)
    jepub.date(new Date())

    const coverImg = firstArt.images?.[0]?.l
    if (coverImg) {
      const coverImgBuf = await fetchImage(coverImg)
      if (coverImgBuf) jepub.cover(coverImgBuf)
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      const art = it.artwork
      const { chapters, images } = processNovel(parseNovelTextToHtml(it.textObj))
      await Promise.all(images.map(async src => {
        const buf = await fetchImage(src)
        if (buf) jepub.image(buf, src.split('/').pop())
      }))
      let content = `${buildMetaHeaderEpub(art)}<br><br><hr><br><br>`
      chapters.forEach(c => {
        content += c.title == 'Chapter 1'
          ? `<div>${c.content}</div>`
          : `<h3>${c.title}</h3><div>${c.content}</div>`
      })
      jepub.add(`${i + 1}. ${art.title}`, content)
    }

    const epub = await jepub.generate('blob')
    return epub
  } catch (err) {
    console.log('buildSeriesEpub err: ', err)
    Toast(`导出 EPUB 出错：${err}`)
    return null
  }
}

export async function runSeriesEpubDownload(seriesId, seriesTitle, callbacks = {}, seriesDetail = {}) {
  const { onProgress, onPause, shouldCancel } = callbacks
  const state = {
    seriesId,
    seriesTitle,
    total: 0,
    current: 0,
    items: [],
    phase: 'fetch',
    failed: false,
    errorMsg: '',
  }
  const update = () =>
    onProgress &&
    onProgress({
      ...state,
      items: state.items.map(i => ({ ...i })),
    })

  try {
    const all = []
    let page = 1
    while (true) {
      if (shouldCancel && shouldCancel()) return null
      const res = await api.getNovelSeries(seriesId, page)
      if (res.status !== 0) throw new Error(res.msg || '获取系列失败')
      all.push(...res.data)
      if (!res.data.next) break
      await sleep(1000)
      page++
    }
    state.items = all.map((a, i) => ({
      id: a.id,
      title: a.title,
      art: a,
      status: 'pending',
      text: '',
      textObj: {},
      index: i,
    }))
    state.total = all.length
    state.phase = 'text'
    update()
  } catch (err) {
    state.failed = true
    state.errorMsg = err.message || String(err)
    update()
    return null
  }

  for (let i = 0; i < state.items.length; i++) {
    const item = state.items[i]
    if (item.status === 'done') {
      state.current = i + 1
      update()
      continue
    }
    item.status = 'downloading'
    state.current = i + 1
    update()
    try {
      const res = await api.getNovelText(item.id)
      if (res.status !== 0) throw new Error(res.msg || '获取正文失败')
      item.textObj = res.data
      item.text = res.data.text
      item.status = 'done'
      // await sleep(1000)
      update()
    } catch (err) {
      item.status = 'error'
      item.error = err.message || String(err)
      state.failed = true
      state.errorMsg = item.error
      update()
      const action = onPause ? await onPause(item.error) : 'cancel'
      if (action === 'cancel') return null
      i-- // 重试当前篇
      continue
    }
  }

  state.phase = 'build'
  update()
  const epub = await buildSeriesEpub(
    {
      ...seriesDetail,
      id: seriesId,
      title: seriesTitle,
      author: state.items[0]?.art?.author?.name,
    },
    state.items.map(it => ({ artwork: it.art, text: it.text, textObj: it.textObj }))
  )
  if (!epub) {
    state.failed = true
    state.errorMsg = '生成 EPUB 失败'
    update()
    return null
  }
  return epub
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
  const fetchBuffer = async src => {
    const response = await fetch(src)
    if (!response.ok) throw new Error('Response not ok.')
    const arrayBuffer = await response.arrayBuffer()
    return arrayBuffer
  }
  try {
    return await fetchBuffer(src)
  } catch (err) {
    try {
      return await fetchBuffer(COMMON_IMAGE_PROXY + src)
    } catch (err) {
      console.log('fetchImage: ', err)
      return null
    }
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

export function printNovel(html, fileName) {
  const iframe = document.createElement('iframe')
  iframe.setAttribute('style', 'position:fixed;top:-9999px;left:-9999px')
  iframe.srcdoc = `<html><head><title>${fileName}</title></head><body style="-webkit-print-color-adjust: exact;">${html}</body></html>`
  document.body.appendChild(iframe)
  iframe.onload = () => {
    const w = iframe.contentWindow
    w.focus()
    w.print()
    w.onafterprint = () => { iframe.remove() }
  }
}

export async function convertHtmlToPdf(element, fileName) {
  try {
    const loading = Toast.loading({
      duration: 0,
      forbidClick: true,
      message: i18n.t('tips.loading'),
    })

    if (!window.html2pdf) {
      await loadScript(`${BASE_URL}static/js/html2pdf.bundle.min.js`)
    }

    const blob = await window.html2pdf()
      .from(element)
      .set({
        margin: 10,
        filename: `${fileName}.pdf`,
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', hotfixes: ['px_scaling'] },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'], avoid: 'p,img' },
      })
      .outputPdf('blob')

    loading.clear()
    return blob
  } catch (err) {
    Toast.clear(true)
    Toast(`导出 PDF 出错：${err}`)
    return null
  }
}

export function convertHtmlToDoc(outerHTML) {
  const preHtml = `
<html xmlns:o='urn:schemas-microsoft-com:office:office'
      xmlns:w='urn:schemas-microsoft-com:office:word'
      xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'></head><body>`
  const postHtml = '</body></html>'
  const html = preHtml + outerHTML + postHtml
  const res = new Blob(['\ufeff', html], { type: 'application/msword' })
  return res
}

export function convertNovelToMarkdown(textObj, artwork) {
  let { text } = textObj
  text = text
    .replace(/\[newpage\]/g, (count => () => `\n<hr id="page${++count}">\n`)(1))
    .replace(/\[newpage\]/g, '\n---\n')
    .replace(/\[\[rb:([^>[\]]+) *> *([^>[\]]+)\]\]/g, '<ruby>$1<rp>(</rp><rt>$2</rt><rp>)</rp></ruby>')
    .replace(/\[\[jumpuri:([^>\s[\]]+) *> *([^>\s[\]]+)\]\]/g, '[$1]($2)')
    .replace(/\[\[emphasismark:([^>[\]]+) *> *([^>[\]]+)\]\]/g, '<mark>$1</mark>')
    .replace(/\[i:([^[\]]+)\]/g, '*$1*')
    .replace(/\[b:([^[\]]+)\]/g, '**$1**')
    .replace(/\[pixivimage:([\d-]+)\]/g, '![$1](https://pximg.cocomi.eu.org/-pid-/$1)')
    .replace(/\[jump:(\d+)\]/g, (_, $1) => `[page${$1}](#page${$1})`)
    .replace(/\[chapter: *([^[\]]+)\]/g, '## $1')
    .replace(/\[uploadedimage:(\d+)\]/g, (_, $1) => `![${$1}](${getEmbedImg(textObj, $1)})`)
    .replace(/若想浏览插图，还请使用网页版。/g, '\n')

  text = `
# ${artwork.title}

${artwork.author.name}

![cover](${artwork.images?.[0]?.l})

---

${buildMetaHeaderMd(artwork)}
${text}
`.trim()

  return new Blob([text], { type: 'text/markdown;charset=utf-8' })
}

function getEmbedImg(textObj, id) {
  const urls = textObj.embedImgs?.[id]?.urls
  return imgProxy(urls?.['1200x1200'] || urls?.original || '')
}

export function parseNovelTextToHtml(textObj = {}, textConfig = {}) {
  let res = textObj.text
  if (!res) return ''
  const pos = detectLanguage(res).language == 'zh' ? 'under' : 'over'
  res = textConfig.indent
    ? res.split(/\n/).map(e => `<p${e ? '' : ' style="padding: 1em 0"'}>${e}</p>`).join('')
    : res.replace(/\n/g, '<br>')
  res = res
    .replace(/\[newpage\]/g, (count => () => `<hr data-index="page${++count}" style="margin: 1em 0;font-weight: bold;font-size: 1.2em;">`)(1))
    .replace(/\[\[rb:([^>[\]]+) *> *([^>[\]]+)\]\]/g, '<ruby>$1<rp>(</rp><rt>$2</rt><rp>)</rp></ruby>')
    .replace(/\[\[jumpuri:([^>\s[\]]+) *> *([^>\s[\]]+)\]\]/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
    .replace(/\[\[emphasismark:([^>[\]]+) *> *([^>[\]]+)\]\]/g, `<span style='text-emphasis-position: ${pos} right;text-emphasis-style:"$2"'>$1</span>`)
    .replace(/\[i:([^[\]]+)\]/g, '<i style="font-style:oblique">$1</i>')
    .replace(/\[b:([^[\]]+)\]/g, '<b style="font-weight:bolder;text-shadow:1px 1px 1px currentColor">$1</b>')
    .replace(/\[pixivimage:([\d-]+)\]/g, '<img style="display:block;max-width:100%;margin:auto" src="https://pximg.cocomi.eu.org/-pid-/$1" alt>')
    .replace(/\[jump:(\d+)\]/g, (_, $1) => `<a style="cursor:pointer;text-decoration:underline" onclick="document.querySelector('hr[data-index=page${$1}]')?.scrollIntoView({behavior:'smooth'})">page${$1}</a>`)
    .replace(/\[chapter: *([^[\]]+)\]/g, '<h2 style="margin: 1em 0;font-weight:bold;font-size:1.5em">$1</h2>')
    .replace(/\[uploadedimage:(\d+)\]/g, (_, $1) => `<img style="display:block;max-width:100%;margin:auto" src="${getEmbedImg(textObj, $1)}" alt>`)
    .replace(/若想浏览插图，还请使用网页版。/g, '-- 插图 --')
  return res
}
