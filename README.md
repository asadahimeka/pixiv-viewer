<p align="center"><img src="https://api.moedog.org/count/@asadahimeka-pixiv-viewer-github" alt="pixiv-viewer"></p>

# pixiv-viewer

[DEMO](https://pixiv.kanata.ml/)

[APK(5+)](https://github.com/journey-ad/pixiv-viewer/raw/master/pics/pixiv_viewer_0607231648.apk)

## Features
- [x] 基础页面
  - [x] 首页信息流
  - [x] 排行榜
  - [x] 作品页面
  - [x] 作者信息页面
  - [x] 设置页面
- [x] 搜索功能
- [x] 以图搜图
- [x] 动图播放
- [x] 动图下载(ZIP/GIF/WebM 仅支持 web 端)
- [ ] 历史记录
- [ ] 左右滑动浏览作品

## TODO
- [ ] 使用 localForage 存储缓存
- [ ] 多端样式适配
- [ ] APP 端保存文件
- [ ] 热更新资源文件

## Preview

<kbd><img src="pics/Screenshot_0.jpg" width="390"></kbd>　<kbd><img src="pics/Screenshot_1.jpg" width="390"></kbd>

<kbd><img src="pics/Screenshot_2.jpg" width="390"></kbd>　<kbd><img src="pics/Screenshot_3.jpg" width="390"></kbd>

<kbd><img src="pics/Screenshot_4.jpg" width="390"></kbd>　<kbd><img src="pics/Screenshot_5.jpg" width="390"></kbd>

<kbd><img src="pics/Screenshot_6.jpg" width="390"></kbd>　<kbd><img src="pics/Screenshot_7.jpg" width="390"></kbd>

## Project setup
```
yarn install
```

### Compiles and hot-reloads for development
```
yarn serve
```

### Compiles and minifies for production
```
yarn build
```

### Lints and fixes files
```
yarn lint
```

### Customize configuration
See [Configuration Reference](https://cli.vuejs.org/config/).

## Credit
- Vue：前端框架
- Vant UI：组件库
- 自己的 [Pixiv API](https://api.imjad.cn/pixiv_v2.md)：提供大部分接口支持
- [SauceNAO](https://saucenao.com/)：以图搜图功能接口
- [Cloudflare Workers](https://workers.cloudflare.com/)：图像反代服务
- Github Pages：提供页面托管服务
- Travis CI：提供持续集成服务
- HTML5+：App 功能支持
- HBuilder X：云打包 App

## LICENSE
[![MIT License Copyright (c) 2020 Jad](https://img.shields.io/github/license/journey-ad/pixiv-viewer)](https://github.com/journey-ad/pixiv-viewer/blob/master/LICENSE)
