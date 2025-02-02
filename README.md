<p align="center"><img src="https://api.moedog.org/count/@asadahimeka-pixiv-viewer-github" alt="pixiv-viewer"></p>

<h1 align="center">Pixiv Viewer <sup><small>Kai</small></sup></h1>
<p align="center">Yet Another Pixiv Illust&Novel Viewer.</p>

![](https://img.shields.io/github/package-json/v/asadahimeka/pixiv-viewer)
![](https://img.shields.io/badge/license-MIT-green)
![](https://api.netlify.com/api/v1/badges/84d224a8-1630-4f47-94c2-ffb0e6da920a/deploy-status)
![](https://img.shields.io/github/package-json/dependency-version/asadahimeka/pixiv-viewer/vue)
![](https://img.shields.io/github/package-json/dependency-version/asadahimeka/pixiv-viewer/dev/@vue/cli-service)
![](https://img.shields.io/github/package-json/dependency-version/asadahimeka/pixiv-viewer/vant)

中文 | [English](./docs/README.en.md)

预览: 🔗 [pixiv.pictures](https://pixiv.pictures)

下载: ⏬ [GitHub Releases](https://github.com/asadahimeka/pixiv-viewer/releases)

## Features
- [x] 首页
  - [x] 插画/漫画/小说/直播
  - [x] 排行榜/特辑/推荐/发现/新作
  - [x] 随便看看
- [x] 搜索功能(插画·漫画/小说/用户)
  - [x] 搜索热词(长按查看标签封面)
  - [x] 搜索自动补全
  - [x] 搜索热门作品预览
  - [x] 搜索条件选择
  - [x] 以图搜图
- [x] 排行榜
  - [x] 综合/插画/漫画/动图/小说 排行榜
  - [x] R18/AI 排行榜
  - [x] 按日期查看排行榜
- [x] 动态
  - [x] 关注的新作品
  - [x] 我的收藏
  - [x] 已关注用户
  - [x] 全站最新
- [x] 设置
  - [x] 登录(RefreshToken 登录/OAuth 登录/Cookie 登录)
  - [x] 历史记录
  - [x] R18 与 AI 作品开关
  - [x] 本地黑名单
  - [x] 清除缓存
  - [x] 多语言支持
  - [x] 图片信息流布局选择
  - [x] 图片详情画质选择
  - [x] 深色模式
  - [x] 应用主题色
  - [x] 左右滑动浏览作品
  - [x] 多图床选择
  - [x] 多 API 实例选择
  - [x] 导出 RefreshToken
  - [x] AppAPI 直连模式
  - [x] AppAPI 代理服务
  - [x] 列表图片长按下载
  - [x] 列表图片长按屏蔽
  - [x] pximg 图片直连模式
  - [x] 使用 File System Access API 下载
  - [x] 使用 Tampermonkey 用户脚本下载
  - [x] 下载文件名格式
- [x] 作品页面
  - [x] 插画收藏/取消收藏/下载/查看评论/分享
  - [x] 源站链接/ID 复制
  - [x] 动图播放
  - [x] 动图下载(ZIP/GIF/WebM/APNG/MP4)
  - [x] 小说下载
  - [x] 小说阅读设置(字体/颜色/方向等)
  - [x] 小说翻译
- [x] 作者信息页面
  - [x] 关注/取关
  - [x] 查看作者插画/漫画/收藏/小说
  - [x] 查看漫画系列/小说系列
  - [x] 作者插画标签
  - [x] 相关用户

- [x] 本地 IndexedDB 缓存存储
- [x] 多端样式适配
- [x] PWA 支持
- [x] Android/Windows 版本
- [x] iOS/macOS 版本

## Feedback

https://github.com/asadahimeka/pixiv-viewer/discussions

## Preview

- 移动端

<kbd><img src="docs/a1.jpg" width="390"></kbd>  <kbd><img src="docs/a2.jpg" width="390"></kbd>

<kbd><img src="docs/a3.jpg" width="390"></kbd>  <kbd><img src="docs/a4.jpg" width="390"></kbd>

<kbd><img src="docs/a5.jpg" width="390"></kbd>  <kbd><img src="docs/a6.jpg" width="390"></kbd>　

<kbd><img src="docs/a7.jpg" width="390"></kbd>  <kbd><img src="docs/a8.jpg" width="390"></kbd>

- 桌面端

<kbd><img src="docs/w9.png" width="390"></kbd>  <kbd><img src="docs/w10.png" width="390"></kbd>

<kbd><img src="docs/w11.png" width="390"></kbd>  <kbd><img src="docs/w12.png" width="390"></kbd>

<kbd><img src="docs/w13.png" width="390"></kbd>  <kbd><img src="docs/w14.png" width="390"></kbd>　

<kbd><img src="docs/w15.png" width="390"></kbd>  <kbd><img src="docs/w16.png" width="390"></kbd>

## Alternatives

- [Pixiviz](https://pixiviz.cocomi.eu.org/)
- [Pixivel](https://pxelk.cocomi.eu.org/)
- [PixivNow](https://pxnow.cocomi.eu.org/)
- [PixivMoe](https://pixivmoe.cocomi.eu.org/)
- [PixivLxns](https://pixivlxns.cocomi.eu.org/)
- [pixivic](https://pixivic.com)
- [vilipix](https://www.vilipix.com/ranking)
- [moeview](https://moeview.cocomi.eu.org/)
- [booruwf](https://booru.cocomi.eu.org/)
- [RankTop50](https://www.nanoka.top/illust/pixiv/)

## Project setup
```
pnpm install
```

### Compiles and hot-reloads for development
```
pnpm serve
```

### Compiles and minifies for production
```
pnpm build
```

### Lints and fixes files
```
pnpm lint
```

### Customize configuration
See [Configuration Reference](https://cli.vuejs.org/config/).

## FAQ

### 自建的话如何预设图床与 API 实例

参照 [#10](https://github.com/asadahimeka/pixiv-viewer/discussions/10) 与 [#13](https://github.com/asadahimeka/pixiv-viewer/discussions/13) 设置环境变量。

可以在项目根目录下新建 `.env` 文件，参照 `.env.example` 的格式填入环境变量：

### 一直提示 API 超限或者 Rate Limit

可以到设置里切换 API 实例，或者直接使用 RefreshToken 或者 OAuth 方式登录

### 如何获取 RefreshToken

参见 https://www.nanoka.top/posts/e78ef86/

### 图片加载很慢

受限于网络环境，图片加载速度可能会比较慢。可以到设置里切换图床，或者下载 Android 版本后打开图片直连功能

### 使用美国/英国 IP 无法查看某些作品

见 pixiv 官方公告：https://www.pixiv.net/info.php?id=10837

建议用自己的账号登录本站后再使用，并且要在官方网页端[设置](https://www.pixiv.net/setting_user.php)里面选择非美国/英国的地区，最好选择日区。

### 列表与详情图片不匹配或重复、搜索结果与搜索标签不匹配

是因为自建 API 的 CDN 缓存导致的，可以到设置里切换其他 API 实例或者登录后再使用

### Cookie/SessionID 登录出错

建议使用 RefreshToken 方式登录

### Android 版本点击下载就闪退

到系统设置里给予本应用存储权限，或者下载最新版本后再进行尝试

### 是否有 iOS App

可到 [Github Releases](https://github.com/asadahimeka/pixiv-viewer/releases) 下载，注意 iOS 安装包未签名，需要自行签名侧载安装，教程：[爱思助手(视频)](https://www.bilibili.com/video/BV1Jg4y1n7hi/)、[爱思助手](https://www.i4.cn/news_detail_38195.html)、[AltStore](https://kerrinz.com/archives/432.html)


## Contribute

本项目使用 [Vue I18n](https://kazupon.github.io/vue-i18n/) 进行国际化，其他语言翻译主要来自机器翻译，如有不妥，欢迎[贡献翻译](https://github.com/asadahimeka/pixiv-viewer/tree/master/src/locales)

## Credits

### Special Thanks
- [journey-ad/pixiv-viewer](https://github.com/journey-ad/pixiv-viewer)：原项目，修改于此

### Contributors
- [@Blueberryy](https://github.com/Blueberryy): Russian translation

### Projects
- [HibiAPI](https://github.com/mixmoe/HibiAPI)：提供大部分接口支持
- [PixivNow](https://github.com/FreeNowOrg/PixivNow)：提供部分网页版接口支持

### Services
- [Pixiv.cat](https://pixiv.re/)：图像反代服务
- [SauceNAO](https://saucenao.com/)：以图搜图功能接口
- [Cloudflare Workers](https://workers.cloudflare.com/)：图像反代服务
- [Netlify](https://netlify.com/)：提供页面托管服务

### Developing
- [Vue](https://vuejs.org/)：前端框架
- [Vant UI](https://vant-ui.github.io/vant/v2/#/zh-CN/)：UI 组件库
- [Vue I18n](https://kazupon.github.io/vue-i18n/)：国际化支持

## Disclaimer

本项目与 pixiv.net(ピクシブ株式会社) 无任何隶属关系。

本项目网站、APP 所展示的所有作品的版权均为 Pixiv 或其原作者所有。

本项目仅供交流与学习，不得用于任何商业用途。

## LICENSE

[![MIT License](https://img.shields.io/github/license/asadahimeka/pixiv-viewer)](https://github.com/asadahimeka/pixiv-viewer/blob/master/LICENSE)
