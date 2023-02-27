/* Safari and Edge polyfill for createImageBitmap
 * https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/createImageBitmap
 */
if (!('createImageBitmap' in window)) {
  window.createImageBitmap = async function (blob) {
    return new Promise((resolve, reject) => {
      const img = document.createElement('img')
      img.addEventListener('load', function () {
        resolve(this)
      })
      img.addEventListener('error', function () {
        // eslint-disable-next-line prefer-promise-reject-errors
        reject(this)
      })
      img.src = URL.createObjectURL(blob)
    })
  }
}
