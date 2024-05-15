<p align="center"><img src="https://api.moedog.org/count/@asadahimeka-pixiv-viewer-github-en" alt="pixiv-viewer"></p>

<h1 align="center">Pixiv Viewer <sup><small>Anon</small></sup></h1>

Demo: 🔗 [pixiv.pics](https://pixiv.pics)

Download: ⏬ [App Center](https://install.appcenter.ms/users/yumine/apps/pixiv-viewer/distribution_groups/beta) | [GitHub Releases](https://github.com/asadahimeka/pixiv-viewer/releases)

## Features
- [x] Basic Pages
  - [x] Home Waterfall Layout
  - [x] Ranking(including AI)
  - [x] Artworks Page
  - [x] Users Page
  - [x] Setting Page
- [x] Search Tags
- [x] Search with images
- [x] Play Ugoira
- [x] Download Ugoira(ZIP/GIF/WebM)
- [x] Local Caching with localforage
- [x] View History
- [x] Mobile and Desktop Style Responsive
- [x] Support PWA
- [x] R18 and AI Artworks Display Switch
- [x] Select Waterfull Layout(Masonry/Grid/Flexbin)
- [x] Select Pximg Proxy
- [x] Select HibiAPI Instance
- [x] Spotlights/Recommend/Discovery/New Illustration
- [x] Search Tags Autocomplete
- [x] Search Popular Works Preview
- [x] Search Params Support
- [x] Novel Support
- [x] Login/Bookmark/Follow
- [x] I18n Support
- [x] Dark Mode
- [x] Swipe to toggle artworks

## Feedback

https://github.com/asadahimeka/pixiv-viewer/discussions

## Preview

- Mobile

<kbd><img src="ea1.jpg" width="390"></kbd>  <kbd><img src="ea2.jpg" width="390"></kbd>

<kbd><img src="ea3.jpg" width="390"></kbd>  <kbd><img src="ea4.jpg" width="390"></kbd>

- Desktop

<kbd><img src="ew1.png" width="390"></kbd>  <kbd><img src="ew2.png" width="390"></kbd>

<kbd><img src="ew3.png" width="390"></kbd>  <kbd><img src="ew4.png" width="390"></kbd>

## Alternatives

- [Pixiviz](https://z.pixiv.pics)
- [Pixivel](https://pxelk.pixiv.pics)
- [PixivNow](https://now.pixiv.pics/ranking)
- [PixivMoe](https://moe.pixiv.pics)
- [PixivLxns](https://lxns.pixiv.pics)
- [pixivic](https://pixivic.com)
- [vilipix](https://www.vilipix.com/ranking)
- [moeview](https://moeview.pixiv.pics)
- [booruwf](https://booru.pixiv.pics)
- [Ranking](https://www.nanoka.top/illust/pixiv/)

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

## FAQ

### How to preset the image proxy and API instance if you build it yourself?

Refer to [#10](https://github.com/asadahimeka/pixiv-viewer/discussions/10) and [#13](https://github.com/asadahimeka/pixiv-viewer/discussions/13) to set up the environment variable. You can create a new `.env` file in the project root directory and fill in the environment variables in the following format:

```env
TEST="lalala"
ABC=DEF
```

### Some artworks cannot be viewed using US/UK IP

See pixiv official announcement: https://www.pixiv.net/info.php?id=10837

It is recommended to log in to this site with your own account before using it, and select a non-US/UK region in the official web page [settings](https://www.pixiv.net/setting_user.php). It is best to select the Japan region.

### Keep prompting that the API exceeds the limit or Rate Limit

You can switch the API instance in the settings, or directly use RefreshToken or OAuth to log in.

### How to get RefreshToken

See https://www.nanoka.top/posts/e78ef86/

### Image loading is very slow

Due to the network environment, the image loading speed may be slow. You can switch to the image proxy in the settings, or download the Android version and turn on the image direct connection function.

### Cookie/SessionID login error

It is recommended to use RefreshToken to log in

### Is there an iOS App?

Currently there are only Android and Windows versions. Download: [Releases](https://github.com/asadahimeka/pixiv-viewer/releases)

### Android version crashes after clicking download

Go to the system settings to give this application storage permissions, or download the latest version and try again.

## Contribute

This project uses [Vue I18n](https://kazupon.github.io/vue-i18n/) for internationalization, other language translations are mainly from machine translation, if there is anything wrong, welcome [contribute translation](https://github.com/asadahimeka/pixiv-viewer/tree/master/src/locales)

## Credits
- [pixiv-viewer](https://github.com/journey-ad/pixiv-viewer)
- [Vue](https://vuejs.org/)
- [Vant UI](https://vant-ui.github.io/vant/v2/)
- [Vue I18n](https://kazupon.github.io/vue-i18n/)
- [HibiAPI](https://api.obfs.dev/docs)
- [PixivNow](https://github.com/FreeNowOrg/PixivNow)
- [SauceNAO](https://saucenao.com/)
- [Cloudflare Workers](https://workers.cloudflare.com/)
- [Netlify](https://netlify.com/)

## Disclaimer

This project has no affiliation with pixiv.net(ピクシブ株式会社).

The copyright of all artworks presented in this project(Website/APP) belongs to Pixiv or its original authors.

This project is for communication and learning only and may not be used for any commercial purposes.

## LICENSE

[![MIT License Copyright (c) 2020 Jad](https://img.shields.io/github/license/journey-ad/pixiv-viewer)](https://github.com/asadahimeka/pixiv-viewer/blob/master/LICENSE)
