<p align="center"><img src="https://api.moedog.org/count/@himeka-pxve-github-en" alt="pixiv-viewer"></p>

<h1 align="center">Pixiv Viewer <sup><small>Kai</small></sup></h1>
<p align="center">Yet Another Pixiv Illust & Novel Viewer.</p>
<p align="center">Port of <a href="https://github.com/journey-ad/pixiv-viewer">journey-ad/pixiv-viewer</a></p>

<p align="center">
<img src="https://img.shields.io/badge/JavaScript-%23323330.svg?style=flat&logo=javascript&logoColor=%23F7DF1E" alt="JavaScript" >
<img src="https://img.shields.io/badge/Vue.js-%2335495e.svg?style=flat&logo=vuedotjs&logoColor=%234FC08D" alt="Vue.js" >
<img src="https://img.shields.io/badge/Stylus-6da13f.svg?style=flat&logo=Stylus&logoColor=white" alt="Stylus" >
<img src="https://img.shields.io/badge/PWA-Ready-5A0FC8.svg" alt="PWA" >
<img src="https://img.shields.io/badge/Cloudflare-F38020?style=flat&logo=Cloudflare&logoColor=white" alt="Cloudflare" >
</p>

<p align="center">
<img src="https://img.shields.io/github/package-json/v/asadahimeka/pixiv-viewer"  alt="Version">
<img src="https://img.shields.io/badge/license-MIT-green"  alt="License" >
<img src="https://img.shields.io/website?url=https%3A%2F%2Fpixiv.pictures&logo=cloudflare&label=Pages" alt="Pages" >
<img src="https://img.shields.io/github/downloads/asadahimeka/pixiv-viewer/total?logo=github" alt="Downloads" >
</p>

English | [中文](../README.md)

Yet another Pixiv viewer, providing online browsing of Pixiv illustrations, animations, manga, and novels. It supports multi-platform layouts, offers multiple browsing layout options, supports PWA installation, allows custom APIs and image hosting services, and supports login via RefreshToken, OAuth, or Cookie.

Preview: 🔗 [pixiv.pictures](https://pixiv.pictures)

Download: ⏬ [GitHub Releases](https://github.com/asadahimeka/pixiv-viewer/releases)

---

## 📖 Table of Contents

* [Features](#-features)
* [Screenshots](#-screenshots)
* [Technical Details](#-technical-details)
* [Development Guide](#-development-guide)
* [Deployment](#deployment)
* [Sponsorship](#-sponsorship)
* [FAQ](#-faq)
* [Contribution Guide](#-contribution-guide)
* [Acknowledgements](#-acknowledgements)
* [Related Sites](#-related-sites)
* [Disclaimer](#-disclaimer)
* [License](#-license)

---

## ✨ Features

### 🏠 Home

* **Multiple Content Types**: Supports illustrations, manga, novels, bookmarks, and more
* **Rankings**: View daily, weekly, and monthly popular works
* **Featured Specials**: Browse official curated special content
* **Personalized Recommendations**: Recommendations based on personal preferences
* **Discover Page**: Explore site-wide popular and newly discovered works
* **Random Browse**: Randomly browse high-quality works
* **Bookmarks**: Centralized display of favorite works

### 🔍 Search

* **Comprehensive Search**: Search illustrations & manga, novels, users, bookmarks
* **Trending Keywords**: Display current trending search terms (long press to view tag cover)
* **Smart Suggestions**: Automatic keyword autocomplete
* **Search Filters**: Filter by bookmarks count, submission time, etc.
* **Popular Preview**: Non-member preview of popular works (first 30 items)
* **Search by Image**: Upload images to search for similar works

### 📊 Rankings

* **Multi-dimensional Rankings**: Overall, illustrations, manga, animations, novels
* **R18 / AI Rankings**: View adult content and AI-generated works rankings
* **Historical Rankings**: View rankings by date

### 📱 Activity

* **Following Updates**: View new works from followed users
* **My Bookmarks**: View bookmarked illustrations and novels
* **Followed Users**: View followed users
* **Recommended Users**: View recommended user list
* **Latest Works**: Browse the latest uploaded works site-wide

### 🖼️ Artwork Page

* **Illustration Actions**: Bookmark, unbookmark, download, view comments, share
* **Source Link**: Quick access to the Pixiv source page
* **ID Copy**: One-click copy of artwork/author ID
* **Animation Playback**: Supports Ugoira playback

#### Novel Reading

* **Novel Download**: Download novel text, supports TXT, HTML, Markdown, DOC, PDF, EPUB formats
* **Reading Settings**: Customize fonts, colors, reading direction, etc.
* **Novel Translation**: Integrated online translation

### 👤 Author Page

* **Follow Management**: Follow / unfollow authors
* **Works Browsing**: View author's illustrations, manga, bookmarks, novels, and collections
* **Series View**: View author's manga and novel series
* **Tag Browsing**: View commonly used illustration tags by the author
* **Related Users**: Discover similar authors
* **Twitter Media**: View images/videos posted by the author on X (Twitter)

### ⚙️ Settings

#### Login Methods

* **RefreshToken Login**: Log in directly using Pixiv RefreshToken
* **OAuth Login**: Log in via Pixiv OAuth authorization
* **Cookie Login**: Log in using Cookies (not recommended)

#### Content Control

* **R18 Toggle**: Control whether adult content is displayed
* **AI Works Toggle**: Control whether AI-generated works are displayed
* **Local Blacklist**: Block works from specific tags or users

#### Browsing Experience

* **Multi-language Support**: Supports Simplified Chinese, Traditional Chinese, English, Russian, etc.
* **Dark Mode**: Eye-friendly night mode
* **Custom Theme Color**: Customize application theme color
* **Image Feed Layouts**: Multiple layout options (masonry, grid, virtual list, etc.)
* **Image Quality Selection**: Supports Medium, Large, Large (WebP), and more
* **Swipe Navigation**: Swipe left/right on artwork detail pages
* **Page Transitions**: Multiple page transition animation effects

#### Network & Data

* **Multiple Image Proxies**: Switch between multiple image proxy services
* **Multiple API Instances**: Switch between multiple backend API instances
* **AppAPI Proxy Mode**: Directly connect to Pixiv App API (requires self-hosted proxy)
* **pximg Direct Access**: Direct access to Pixiv original image servers
* **IndexedDB Cache**: Local caching to improve loading speed
* **History**: View browsing history
* **Clear Cache**: One-click application cache clearing

#### Download Features

* **Long Press Download**: Long press on list images to quickly download
* **Long Press Block**: Long press to quickly block users
* **File System Access API**: Download using modern browser File System Access API
* **Tampermonkey Support**: Download via Tampermonkey scripts
* **Custom Filename Format**: Customize download filename templates
* **Animated Export Formats**: Supports ZIP, GIF, WebM, APNG, MP4, AVIF formats

#### Backup & Restore

* **Settings Backup**: Backup current app settings to a file and restore later
* **History Backup**: Backup browsing history to a file and restore later
* **Export RefreshToken**: Export RefreshToken for use in other applications

#### Client Support

* [x] PWA Installation
* [x] Android / Windows Versions
* [x] iOS / macOS Versions

---

## 📸 Screenshots

* Mobile

<kbd><img src="1.webp" width="390"></kbd>  <kbd><img src="5.webp" width="390"></kbd>

<kbd><img src="6.webp" width="390"></kbd>  <kbd><img src="8.webp" width="390"></kbd>

<details>
<summary>View More</summary>
<kbd><img src="2.webp" width="390"></kbd>  <kbd><img src="4.webp" width="390"></kbd>

<kbd><img src="7.webp" width="390"></kbd>  <kbd><img src="3.webp" width="390"></kbd>

</details>
<br>

* Desktop

<kbd><img src="w1.webp" width="390"></kbd>  <kbd><img src="w7.webp" width="390"></kbd>

<kbd><img src="w3.webp" width="390"></kbd>  <kbd><img src="w4.webp" width="390"></kbd>

<details>
<summary>View More</summary>
<kbd><img src="w2.webp" width="390"></kbd>  <kbd><img src="w5.webp" width="390"></kbd>　

<kbd><img src="w6.webp" width="390"></kbd>  <kbd><img src="w8.webp" width="390"></kbd>

</details>

---

## 🚀 Technical Details

### Frontend Architecture

* **Vue 2.7**: Uses Vue 2.7 with Composition API support
* **Vue Router**: SPA routing with alias and history support
* **Vuex**: Centralized state management with persistent settings
* **Vue I18n**: Full internationalization support with language switching

### UI Components

* **Vant UI**: Mobile-first UI component library based on Vant
* **Stylus**: CSS preprocessor with nesting and variables
* **Responsive Design**: Automatically adapts to mobile, tablet, and desktop

### PWA Support

* **Service Worker**: Offline access and caching strategies
* **App Shell**: App shell architecture for faster initial load
* **Install Prompts**: PWA installation on desktop and mobile
* **App Shortcuts**: Desktop shortcuts (search, rankings, activity, settings)

### Performance Optimization

* **Image Lazy Loading**: Enabled by default on mobile
* **Virtual Scrolling**: High-performance rendering for large data sets
* **Route Transitions**: Smooth page transitions using the View Transitions API
* **Code Splitting**: Load libraries on demand to reduce bundle size

### Advanced Features

* **Multiple Layout Engines**:

  * Masonry
  * Grid
  * Justified
  * VirtualList
  * VirtualSlide

* **Animation Processing**:

  * Generate GIF with gif.js
  * Generate WebM with ts-whammy
  * Generate MP4 with modern-mp4
  * Support original ZIP download for animations

* **File System Access**:

  * Uses WICG File System Access API
  * Supports direct writing to local directories
  * Supports downloads organized by author

* **Network Requests**:

  * Axios-wrapped HTTP client
  * Request retry mechanism
  * Multiple proxy service switching

* **Storage Solutions**:

  * IndexedDB via LocalForage
  * Supports LocalStorage and SessionStorage

---

## 📦 Development Guide

### Requirements

* Node.js >= 16.x
* pnpm >= 9.x

### Install Dependencies

```bash
pnpm install
```

### Development Mode

```bash
pnpm serve
```

The application will start at `http://localhost:8080` with hot reload enabled.

### Production Build

```bash
pnpm build
```

Build artifacts will be output to the `dist` directory.

### Linting

```bash
pnpm lint
```

### Bundle Analysis

```bash
pnpm analyze
```

Generates a bundle analysis report to help optimize bundle size.

---

## Deployment

1. Prepare environment: Git, Node.js, pnpm

2. Prepare PxveAPI / HibiAPI instances and pximg proxy, refer to:

  * [https://github.com/asadahimeka/pxve-api](https://github.com/asadahimeka/pxve-api)
  * [https://github.com/mixmoe/HibiAPI](https://github.com/mixmoe/HibiAPI)
  * [https://pixiv.cat/reverseproxy.html](https://pixiv.cat/reverseproxy.html)

3. Download or git clone the project source code to a local directory

4. Enter the project directory and create a `.env` file in the root directory, filling in environment variables according to `.env.example`

```bash
cp .env.example .env
# Edit the .env file and fill in the required configuration
# ⚠ Do not commit the `.env` file to the Git repository
```

5. Run the following commands to build the project. The built files will be in the `dist` directory and can be deployed to your server

```bash
pnpm install
pnpm build
```

---

## 💖 Sponsorship

If this project helps you, feel free to [buy me a coffee](https://sponsors-yumine.netlify.app):

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/sakurayumine)

Your support is the motivation for continuous updates!

---

## ❓ FAQ

### How to obtain a RefreshToken?

Refer to the tutorial: [https://www.nanoka.top/posts/e78ef86/](https://www.nanoka.top/posts/e78ef86/)

### API quota exceeded or rate limited

* Switch to another API instance in settings
* Log in using RefreshToken or OAuth

### Images load very slowly

* Switch to another image proxy in settings
* Enable pximg direct access mode (requires a good network environment)
* Download and use the client version

### Some works are not accessible with US/UK IPs

Refer to Pixiv official announcement: [https://www.pixiv.net/info.php?id=10837](https://www.pixiv.net/info.php?id=10837)

Recommendations:

1. Log in with your own account
2. Set your region to a non-US/UK region in Pixiv web [settings](https://www.pixiv.net/setting_user.php) (Japan recommended)

### Cookie / SessionID login errors

It is recommended to use RefreshToken login, which is more stable and reliable.

### Mismatched or duplicated images in lists and details, or search results do not match search tags

This is caused by CDN caching of self-hosted APIs. Solutions:

* Switch to another API instance
* Use after logging in

### “Page not found”, “No permission to view this work”, or “Your access has been restricted”

This usually means the work has been deleted or hidden by the author.

### Android version crashes when clicking download

* Grant storage permissions in system settings
* Update to the latest version and try again

### How to install the iOS version?

Download from [GitHub Releases](https://github.com/asadahimeka/pixiv-viewer/releases)

Note: The iOS version is unsigned and requires manual signing and sideloading:

* [i4 Assistant (Video Tutorial)](https://www.bilibili.com/video/BV1Jg4y1n7hi/)
* [i4 Assistant](https://www.i4.cn/news_detail_38195.html)
* [AltStore](https://kerrinz.com/archives/432.html)

### How to preset image proxies and API instances for self-hosted deployment?

Refer to discussions:

* [#10](https://github.com/asadahimeka/pixiv-viewer/discussions/10)
* [#13](https://github.com/asadahimeka/pixiv-viewer/discussions/13)

---

## 🤝 Contribution Guide

Contributions of code, translations, or suggestions are welcome!

### Translation

This project uses [Vue I18n](https://kazupon.github.io/vue-i18n/) for internationalization.

Most non-Chinese translations are machine-generated. Contributions are welcome if there are inaccuracies.

Translation files are located in the `src/locales/` directory.

### Code Contribution

1. Fork this repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Reporting Issues

Please use [GitHub Issues](https://github.com/asadahimeka/pixiv-viewer/issues) to report bugs or request features.

---

## 🏆 Acknowledgements

### Special Thanks

* [journey-ad/pixiv-viewer](https://github.com/journey-ad/pixiv-viewer): Original project, modified from this

### Contributors

* [@Blueberryy](https://github.com/Blueberryy): Russian translation
* [@olivertzeng](https://github.com/olivertzeng): Traditional Chinese translation
* [@kidonng](https://github.com/kidonng)

### Related Projects

* [HibiAPI](https://github.com/mixmoe/HibiAPI): Provides most API support
* [PxveAPI](https://github.com/asadahimeka/pxve-api): HibiAPI-compatible and additional API services
* [PixivNow](https://github.com/FreeNowOrg/PixivNow): Provides partial Web API support

### Services

* [Pixiv.cat](https://pixiv.re/): Image proxy service
* [SauceNAO](https://saucenao.com/): Image search API
* [Cloudflare Workers](https://workers.cloudflare.com/): Image proxy service
* [Cloudflare Pages](https://pages.cloudflare.com/): Page hosting service

### Tech Stack

* [Vue](https://vuejs.org/): Frontend framework
* [Vant UI](https://vant-ui.github.io/vant/v2/#/zh-CN/): UI component library
* [Vue I18n](https://kazupon.github.io/vue-i18n/): Internationalization support

---

## 🔗 Related Sites

* [Pixivel](https://pxelk.cocomi.eu.org/)
* [Pixiviz](https://pixiviz.cocomi.eu.org/)
* [PixivNow](https://pxnow.cocomi.eu.org/)
* [PixivMoe](https://pixivmoe.cocomi.eu.org/)
* [PixivLxns](https://pixivlxns.cocomi.eu.org/)
* [MixPiv](https://mixpiv.cocomi.eu.org/)
* [PixiviFE](https://pixiv.perennialte.ch/)
* [pixivic](https://pixivic.com)
* [vilipix](https://www.vilipix.com/ranking)
* [moeview](https://moeview.cocomi.eu.org/)
* [booruwf](https://booru.cocomi.eu.org/)
* [PixivRanking](https://www.nanoka.top/illust/pixiv/)

---

## 📜 Disclaimer

This project is not affiliated with pixiv.net (ピクシブ株式会社) in any way.

All works displayed on this website and app are copyrighted by Pixiv or their original authors.

This project is for communication and learning purposes only and must not be used for any commercial purposes.

---

## 📄 License

This project is open-sourced under the [MIT License](LICENSE).

---

<br>

**If this project helps you, please give it a ⭐️ Star to show your support!**

Made with ❤️ by Sakura Yumine
