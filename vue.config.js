const path = require('path')
const autoprefixer = require('autoprefixer')
const pxtorem = require('postcss-pxtorem')

const isProduction = process.env.NODE_ENV === 'production'
const svgIconDir = path.join(__dirname, 'src/icons/svg')

const cdn = {
  css: [
    // 'https://cdnjs.cloudflare.com/ajax/libs/vant/2.12.54/index.min.css',
    // 'https://cdnjs.cloudflare.com/ajax/libs/Swiper/5.4.5/css/swiper.min.css',
    'https://lib.baomitu.com/lxgw-wenkai-screen-webfont/1.7.0/style.min.css',
  ],
  js: [
    // 'https://cdnjs.cloudflare.com/ajax/libs/vue/2.7.16/vue.min.js',
    // 'https://cdnjs.cloudflare.com/ajax/libs/vue-i18n/8.28.2/vue-i18n.min.js',
    // 'https://cdnjs.cloudflare.com/ajax/libs/vue-router/3.6.5/vue-router.min.js',
    // 'https://cdnjs.cloudflare.com/ajax/libs/vuex/3.6.2/vuex.min.js',
    // 'https://cdnjs.cloudflare.com/ajax/libs/axios/0.27.2/axios.min.js',
    // 'https://cdnjs.cloudflare.com/ajax/libs/vant/2.12.54/vant.min.js',
    // 'https://cdnjs.cloudflare.com/ajax/libs/Swiper/5.4.5/js/swiper.min.js',
    // 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
    // 'https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.21/lodash.min.js',
    // 'https://cdnjs.cloudflare.com/ajax/libs/localforage/1.10.0/localforage.min.js',
    // 'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.2.0/crypto-js.min.js',
  ],
}

/** @type import('@vue/cli-service').ProjectOptions */
module.exports = {
  publicPath: '/',
  lintOnSave: false,
  runtimeCompiler: false,
  productionSourceMap: false,
  // devServer: {
  //   proxy: {
  //     '/prks/now': {
  //       target: 'https://pxnow.cocomi.eu.org',
  //       changeOrigin: true,
  //       pathRewrite: { '^/prks/now': '' },
  //     },
  //   },
  // },
  transpileDependencies: ['mint-filter'],
  configureWebpack: config => {
    if (isProduction) {
      config.optimization.minimizer[0].options.minimizer.options.compress.drop_console = true
      // config.externals = {
      //   'vue': 'Vue',
      //   'vue-i18n': 'VueI18n',
      //   'vant': 'vant',
      //   'vue-router': 'VueRouter',
      //   'vuex': 'Vuex',
      //   'axios': 'axios',
      //   'swiper': 'Swiper',
      //   'jszip': 'JSZip',
      //   'lodash': '_',
      //   'localforage': 'localforage',
      //   'crypto-js': 'CryptoJS',
      // }
    }
  },
  chainWebpack: config => {
    config
      .module
      .rule('vue')
      .use('vue-loader')
      .tap(args => {
        args.compilerOptions.whitespace = 'preserve'
      })

    config.module
      .rule('svg')
      .exclude.add(svgIconDir)
      .end()

    config.module
      .rule('icons')
      .test(/\.svg$/)
      .include.add(svgIconDir)
      .end()
      .use('xml-loader')
      .loader('xml-loader')
      .end()

    config.plugin('html')
      .tap(args => {
        args[0].cdn = cdn
        return args
      })
    if (isProduction) {
      config.plugins.delete('preload')
      config.plugins.delete('prefetch')
      config.optimization.minimize(true)
      config.optimization
        .splitChunks({
          chunks: 'all',
        })
    }
  },
  css: {
    sourceMap: false,
    loaderOptions: {
      postcss: {
        postcssOptions: {
          plugins: [
            autoprefixer(),
            pxtorem({
              rootValue: 75,
              propList: ['*'],
              selectorBlackList: ['van', 'ispx'],
            }),
          ],
        },
      },
    },
  },
  pwa: {
    name: 'Pixiv Viewer',
    themeColor: '#FFFFFF',
    iconPaths: {
      faviconSVG: null,
      favicon32: null,
      favicon16: null,
    },
    workboxPluginMode: 'GenerateSW',
    workboxOptions: {
      skipWaiting: true,
      clientsClaim: true,
      exclude: [
        /_headers/,
        /_redirects/,
        /\.map$/,
        /^manifest.*\.js$/,
        /lang-.*-json\..*\.js$/,
        /vant-locale-.*\.js$/,
        /robots\.txt$/,
        /sitemap\.txt$/,
        /\.user\.js$/,
      ],
      navigateFallbackDenylist: [/^\/prks\//],
      runtimeCaching: [
        {
          urlPattern: /.*\.html$/,
          handler: 'StaleWhileRevalidate',
          options: { cacheName: 'html-cache', cacheableResponse: { statuses: [200] } },
        },
        {
          urlPattern: /^https:\/\/cdnjs\.cloudflare\.com\/.*\.(css|js)$/,
          handler: 'CacheFirst',
          options: {
            cacheName: 'cdn-cache',
            cacheableResponse: { statuses: [200] },
            fetchOptions: { credentials: 'omit', mode: 'cors' },
          },
        },
        {
          urlPattern: /^https:\/\/lib\.baomitu\.com\/.*$/,
          handler: 'CacheFirst',
          options: {
            cacheName: 'font-cache',
            cacheableResponse: { statuses: [200] },
            fetchOptions: { credentials: 'omit', mode: 'cors' },
          },
        },
      ],
    },
  },
}
