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
