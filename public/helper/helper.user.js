// ==UserScript==
// @name         Pxve HTTP Helper
// @namespace    https://www.nanoka.top
// @version      0.1
// @description  HTTP helper for Pixiv-Viewer.
// @author       asadahimeka
// @license      MIT
// @match        https://www.pixiv.pics/*
// @match        https://pixiv.pics/*
// @connect      pixiv.net
// @connect      cocomi.cf
// @connect      cocomi.eu.org
// @connect      pixiv.pics
// @connect      deno.dev
// @connect      210.140.92.180
// @grant        unsafeWindow
// @grant        window.close
// @grant        GM_xmlhttpRequest
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict'

  unsafeWindow.__closeWindow__ = () => window.close()
  unsafeWindow.__httpRequest__ = (url, configStr) => {
    const config = JSON.parse(configStr)
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        url,
        ...config,
        anonymous: true,
        responseType: config.responseType || 'json',
        onload: resp => resolve({ data: resp.response }),
        onerror: err => {
          reject(new Error(err.error || err.responseText))
        },
      })
    })
  }
})()
