function fallbackCopyTextToClipboard(text, cb) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.top = "0";
  textArea.style.left = "0";
  textArea.style.position = "fixed";

  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    const successful = document.execCommand('copy');
    successful && cb?.()
  } catch (err) {
    console.error('Fallback: Oops, unable to copy', err);
  }

  document.body.removeChild(textArea);
}

export function copyText(text, cb) {
  try {
    navigator.clipboard.writeText(text).then(cb);
  } catch (error) {
    fallbackCopyTextToClipboard(text, cb);
  }
}
