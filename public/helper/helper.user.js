// ==UserScript==
// @name         Pxve HTTP Helper
// @name:ru      HTTP-помощник Pxve
// @namespace    https://www.nanoka.top
// @version      0.8
// @description  HTTP helper for Pixiv-Viewer.
// @description:ru HTTP-помощник для Pixiv-Viewer.
// @author       asadahimeka
// @license      MIT
// @match        https://www.pixiv.pictures/*
// @match        https://pixiv.pictures/*
// @match        https://pxve.cc/*
// @match        https://pxvek.cocomi.eu.org/*
// @match        https://pxvek.169889.xyz/*
// @match        https://pixiv-viewer.netlify.app/*
// @match        https://pixiv-viewer.vercel.app/*
// @match        https://pixiv-viewer.pages.dev/*
// @connect      pixiv.net
// @connect      pximg.net
// @connect      pixiv.pictures
// @connect      cocomi.eu.org
// @connect      pxve.cc
// @connect      169889.xyz
// @grant        unsafeWindow
// @grant        window.close
// @grant        GM_xmlhttpRequest
// @grant        GM_download
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict'

  unsafeWindow.__closeWindow__ = () => window.close()
  unsafeWindow.__httpRequest__ = (url, configStr) => {
    const config = JSON.parse(configStr)
    const isReturnBlobUrl = config.responseType == 'blobUrl'
    if (isReturnBlobUrl) config.responseType = 'blob'
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        url,
        ...config,
        anonymous: true,
        responseType: config.responseType || 'json',
        onload: resp => {
          if (resp.status >= 200 && resp.status < 300) {
            resolve({
              data: isReturnBlobUrl
                ? URL.createObjectURL(resp.response)
                : resp.response,
            })
          } else {
            reject(new Error(`HTTP ${resp.status} ${resp.statusText}`))
          }
        },
        onerror: err => {
          reject(new Error(err.error || err.responseText || err.statusText || err.status))
        },
      })
    })
  }
  unsafeWindow.__download__ = (url, name, options) => {
    return new Promise((resolve, reject) => {
      GM_download({
        url,
        name,
        onload: () => resolve(),
        onerror: err => reject(new Error(err.error)),
        ...options,
      })
    })
  }
})()
