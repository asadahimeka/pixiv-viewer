import localforage from 'localforage'

export const isFsaSupported = 'showDirectoryPicker' in self

/** @type {FileSystemDirectoryHandle} */
let mainDirHandle

/**
 * Save file via FileSystemAccess API
 * @param {string|Blob} urlOrBlob
 * @param {string} fileName
 * @param {string?} subdir
 */
export async function saveFile(urlOrBlob, fileName, subdir) {
  if (!mainDirHandle) {
    mainDirHandle = await getMainDirHandle()
    if (!mainDirHandle) mainDirHandle = await setMainDirHandle()
  }
  if (!(await verifyPermission(mainDirHandle))) {
    throw new Error('Permission not granted.')
  }
  const fileHandle = subdir
    ? await getSubDirFileHandle(mainDirHandle, subdir, fileName)
    : await mainDirHandle.getFileHandle(fileName, { create: true })
  if (typeof urlOrBlob == 'string') {
    await writeURLToFile(fileHandle, urlOrBlob)
  } else {
    await writeBlobToFile(fileHandle, urlOrBlob)
  }
  return `${mainDirHandle.name}${subdir ? `/${subdir}` : ''}/${fileName}`
}

export async function getMainDirHandle() {
  /** @type {FileSystemDirectoryHandle|null} */
  const directoryHandle = await localforage.getItem('fsa-dir-handle')
  return directoryHandle
}

export async function setMainDirHandle() {
  const directoryHandle = await window.showDirectoryPicker({ mode: 'readwrite' })
  await localforage.setItem('fsa-dir-handle', directoryHandle)
  return directoryHandle
}

/**
 * 在用户对文件句柄授予了读写权限时返回 true，若无权限则请求权限。
 * @param {FileSystemHandle} handle
 */
async function verifyPermission(handle) {
  const opts = { mode: 'readwrite' }

  // Check if permission was already granted. If so, return true.
  if ((await handle.queryPermission(opts)) === 'granted') {
    return true
  }

  // Request permission. If the user grants permission, return true.
  if ((await handle.requestPermission(opts)) === 'granted') {
    return true
  }

  // The user didn't grant permission, so return false.
  return false
}

/**
 * @param {FileSystemFileHandle} fileHandle
 * @param {string} url
 */
async function writeURLToFile(fileHandle, url) {
  // Make an HTTP request for the contents.
  const response = await fetch(url)
  if (!response.ok) throw new Error('Response not ok.')
  // Create a FileSystemWritableFileStream to write to.
  const writable = await fileHandle.createWritable()
  // Stream the response into the file.
  await response.body.pipeTo(writable)
  // pipeTo() closes the destination pipe by default, no need to close it.
}

/**
 * @param {FileSystemFileHandle} fileHandle
 * @param {Blob} blob
 */
async function writeBlobToFile(fileHandle, blob) {
  // Create a FileSystemWritableFileStream to write to.
  const writable = await fileHandle.createWritable()
  // Write the contents of the file to the stream.
  await writable.write(blob)
  // Close the file and write the contents to disk.
  await writable.close()
}

/**
 * @param {FileSystemDirectoryHandle} dirHandle
 * @param {string} subDirName
 * @param {string} fileName
 */
async function getSubDirFileHandle(dirHandle, subDirName, fileName) {
  const subDirHandle = await dirHandle.getDirectoryHandle(subDirName, { create: true })
  const fileHandle = await subDirHandle.getFileHandle(fileName, { create: true })
  return fileHandle
}
