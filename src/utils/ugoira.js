import axios from 'axios'
import { Toast } from 'vant'
import api from '@/api'
import { i18n } from '@/i18n'
import store from '@/store'
import { getArtworkFileName } from '@/store/actions/filename'
import { BASE_URL, ugoiraAvifSrc } from '@/consts'
import { downloadFile, loadScript, sleep } from '.'

export async function loadUgoira(id, onDownloadProgress) {
  const res = await api.ugoiraMetadata(id)
  if (res.status !== 0) {
    throw new Error(res.msg)
  }

  const ugoira = Object.freeze(res.data)
  const meta = {
    zip: ugoira.zip,
    frames: ugoira.frames.reduce((res, frame) => {
      res[frame.file] = frame
      return res
    }, {}),
  }

  const resp = await axios.get(ugoira.zip, {
    responseType: 'blob',
    timeout: 1000 * 60,
    onDownloadProgress,
  })
  const { default: JSZip } = await import('jszip')
  const jszip = new JSZip()
  const zip = await jszip.loadAsync(resp.data)
  const files = Object.keys(zip.files)
  await Promise.all(files.map(async name => {
    const blob = await zip.file(name).async('blob')
    const bmp = await createImageBitmap(blob)
    meta.frames[name].blob = blob
    meta.frames[name].bmp = bmp
  }))

  console.info('Frames loaded:', `frames ${files.length}`, `size ${resp.data.size}`)
  console.log('ugoira meta: ', meta)

  return meta
}

export const ugoiraDownloadActions = [
  { name: 'ZIP', subname: i18n.t('artwork.download.zip') },
  { name: 'GIF', subname: i18n.t('artwork.download.gif') },
  { name: 'WebM', subname: i18n.t('artwork.download.webm') }, // chrome only
  { name: 'APNG', subname: i18n.t('artwork.download.webm') },
  { name: 'MP4(Browser)', subname: i18n.t('pIghtXdU8socMNNRUn5UR') },
  { name: 'MP4(Server)', subname: i18n.t('zuVom-C8Ss8JTEDZIhzBj') },
  { name: 'AVIF', subname: i18n.t('zuVom-C8Ss8JTEDZIhzBj') },
  { name: 'Other', subname: i18n.t('artwork.download.mp4') },
]

export async function downloadUgoira(type, ugoira, artwork, resetUgoira) {
  try {
    window.umami?.track('download_ugoira', { dl_type: type })
    switch (type) {
      case 'ZIP':
        await downloadFile(ugoira.zip, `${getArtworkFileName(artwork)}.zip`, { subDir: 'ugoira' })
        break
      case 'GIF':
        await downloadGIF(ugoira, artwork)
        break
      case 'WebM':
        await downloadWebM(ugoira, artwork)
        break
      case 'APNG':
        await downloadAPNG(ugoira, artwork)
        break
      case 'MP4(Browser)':
        await downloadMP4(ugoira, artwork, resetUgoira)
        break
      case 'MP4(Server)':
        window.open(`https://ugoira-mp4-dl.cocomi.eu.org/${artwork.id}`, '_blank', 'noopener')
        break
      case 'AVIF':
        window.open(ugoiraAvifSrc(artwork.id), '_blank', 'noopener')
        break
      case 'Other':
        window.open(`https://ugoira.cocomi.eu.org/?id=${artwork.id}`, '_blank', 'noopener')
        break
      default:
        break
    }
  } catch (err) {
    console.log('err: ', err)
    window.umami?.track('download_ugoira_err', { error: err.message })
    Toast({ message: i18n.t('H_rYWoPA0uI7TU4YCbIz0') })
  }
}

// ref: https://github.com/xuejianxianzun/PixivBatchDownloader/blob/master/src/ts/ConvertUgoira/ToAPNG.ts
async function downloadAPNG(ugoira, artwork) {
  Toast(i18n.t('tip.down_wait'))

  if (!window.UPNG) {
    await loadScript(`${BASE_URL}static/js/pako_deflate.min.js`)
    await loadScript(`${BASE_URL}static/js/UPNG.min.js`)
  }

  await sleep(200)

  const { width, height } = artwork
  let canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  let ctx = canvas.getContext('2d', { willReadFrequently: true })

  let images = []
  const delays = []
  Object.values(ugoira.frames).forEach(frame => {
    ctx.drawImage(frame.bmp, 0, 0)
    images.push(ctx.getImageData(0, 0, width, height).data.buffer)
    delays.push(frame.delay)
  })

  const pngFile = window.UPNG.encode(images, width, height, 0, delays)
  const blob = new Blob([pngFile], { type: 'image/vnd.mozilla.apng' })

  images = null
  ctx = null
  canvas = null

  const { isUgoiraApngSaveAsPng } = store.state.appSetting
  const suffix = isUgoiraApngSaveAsPng ? 'png' : 'apng'
  await downloadFile(blob, `${getArtworkFileName(artwork)}.${suffix}`, { subDir: 'ugoira' })
}

async function downloadWebM(ugoira, artwork) {
  Toast(i18n.t('tip.down_wait'))
  await sleep(200)

  const { width, height } = artwork

  let cacheCanvas = document.createElement('canvas')
  cacheCanvas.width = width
  cacheCanvas.height = height
  let ctx = cacheCanvas.getContext('2d')

  // const encoder = new global.Whammy.Video()
  // Object.values(ugoira.frames).forEach(frame => {
  //   ctx.clearRect(0, 0, width, height)
  //   ctx.drawImage(frame.bmp, 0, 0, width, height)
  //   encoder.add(ctx, frame.delay)
  // })
  // const webm = encoder.compile()

  let images = []
  let duration = 0
  Object.values(ugoira.frames).forEach(frame => {
    ctx.clearRect(0, 0, width, height)
    ctx.drawImage(frame.bmp, 0, 0, width, height)
    images.push(ctx.canvas.toDataURL('image/webp'))
    duration += frame.delay
  })

  const { default: tsWhammy } = await import('ts-whammy')
  const webm = tsWhammy.fromImageArrayWithOptions(images, { duration: duration / 1000 })

  images = null
  ctx = null
  cacheCanvas = null

  await downloadFile(webm, `${getArtworkFileName(artwork)}.webm`, { subDir: 'ugoira' })
}

async function downloadGIF(ugoira, artwork) {
  Toast(i18n.t('tip.down_wait'))

  let images = Object.values(ugoira.frames)
  let offset = 1
  if (images.length >= 100) {
    // 抽帧间隔
    offset = 2
    images = images.filter((_, idx) => idx % offset === 0) // 抽帧
    // .map(frame => URL.createObjectURL(frame.blob));
  }

  const { width, height } = artwork

  const cacheCanvas = document.createElement('canvas')
  cacheCanvas.width = width
  cacheCanvas.height = height
  const ctx = cacheCanvas.getContext('2d')

  const { default: GIF } = await import('gif.js')
  const gif = new GIF({
    workers: 10,
    quality: 10,
    width,
    height,
    workerScript: `${BASE_URL}static/js/gif.worker.js`,
  })
  Object.values(images).forEach(frame => {
    ctx.clearRect(0, 0, width, height)
    ctx.drawImage(frame.bmp, 0, 0, width, height)
    gif.addFrame(ctx, { copy: true, delay: frame.delay * offset })
  })
  gif.on('progress', percent => {
    Toast(i18n.t('tip.down_wait') + ': ' + (percent * 100).toFixed(2) + '%')
  })
  gif.on('finished', async blob => {
    Toast.clear(true)
    await downloadFile(blob, `${getArtworkFileName(artwork)}.gif`, { subDir: 'ugoira' })
  })
  gif.render()
}

// ref: https://github.com/FreeNowOrg/PixivNow/blob/master/src/utils/UgoiraPlayer.ts#L195
async function downloadMP4(ugoira, artwork, resetUgoira) {
  Toast(i18n.t('tip.down_wait'))

  const { width, height } = artwork
  let frames = Object.values(ugoira.frames).map(frame => ({
    data: frame.bmp,
    duration: frame.delay,
  }))
  resetUgoira()
  const { encode } = await import('modern-mp4')
  const videoBitrate = parseInt(store.state.appSetting.ugoiraMp4Bitrate) * 1e6
  const mp4File = await encode({ frames, width, height, audio: false, videoBitrate })
  const blob = new Blob([mp4File], { type: 'video/mp4' })
  frames = null
  await downloadFile(blob, `${getArtworkFileName(artwork)}.mp4`, { subDir: 'ugoira' })
}
