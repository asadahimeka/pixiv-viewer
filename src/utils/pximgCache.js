import localforage from 'localforage'

// 独立实例，与 pxcl-store / shinobu-models 同写法，便于单独清除
const idb = localforage.createInstance({ name: 'pximg-thumb-cache', storeName: 'thumbs' })

// 仅用于 in-flight 去重：同一个 key 下载完成即从 Map 删除，不留结果。
const tasks = new Map()

// 刻意不含 host：host 会被改写成 i.pximg.net，镜像 IP 一变缓存就全 miss
function cacheKey(url) {
  return url.pathname + url.search
}

async function fetchBlob(url) {
  // 不就地改写传入的 URL 对象（调用方可能还要用它）
  const { data } = await window.__httpRequest__(url.href, JSON.stringify({
    responseType: 'blob',
    headers: { Referer: 'https://www.pixiv.net/' },
  }))
  return data
}

export async function getPximgBlob(url) {
  const key = cacheKey(url)
  if (tasks.has(key)) return tasks.get(key)

  const hit = await idb.getItem(key)
  if (hit) return hit

  // 上面的 await 让出了线程，期间可能已有同一 key 的下载发起，再查一次
  let task = tasks.get(key)
  if (!task) {
    task = (async () => {
      const blob = await fetchBlob(url)
      // 写入失败（如配额满）不能影响图片显示
      await idb.setItem(key, blob).catch(err => console.log('pximg cache set failed:', err))
      return blob
    })().finally(() => tasks.delete(key))
    tasks.set(key, task)
  }
  return task
}

export async function clearPximgThumbCache() {
  await idb.clear()
  tasks.clear()
}

export async function pximgThumbCacheStats() {
  try {
    const keys = await idb.keys()
    const items = await Promise.all(keys.map(k => idb.getItem(k)))
    const bytes = items.reduce((sum, item) => sum + (item?.size || 0), 0)
    return [bytes, keys.length]
  } catch (err) {
    console.log('pximg cache stats failed:', err)
    return [0, 0]
  }
}
