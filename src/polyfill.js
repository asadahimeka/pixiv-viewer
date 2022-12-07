/* Safari and Edge polyfill for createImageBitmap
 * https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/createImageBitmap
 */
if (!('createImageBitmap' in window)) {
  window.createImageBitmap = async function (blob) {
    return new Promise((resolve, reject) => {
      let img = document.createElement('img');
      img.addEventListener('load', function () {
        resolve(this);
      });
      img.addEventListener('error', function () {
        reject(this);
      });
      img.src = URL.createObjectURL(blob);
    });
  }
}