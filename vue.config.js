const path = require('path')
const autoprefixer = require('autoprefixer')
const pxtorem = require('postcss-pxtorem')

const isProduction = process.env.NODE_ENV === 'production'
const svgIconDir = path.join(__dirname, 'src/icons/svg')

const cdn = {
  css: [],
  js: [
    'https://cdn.bootcdn.net/ajax/libs/vue/2.6.14/vue.min.js',
    'https://cdn.bootcdn.net/ajax/libs/vue-i18n/8.28.2/vue-i18n.min.js',
    'https://cdn.bootcdn.net/ajax/libs/vue-router/3.6.5/vue-router.min.js',
    'https://cdn.bootcdn.net/ajax/libs/vuex/3.6.2/vuex.min.js',
    'https://cdn.bootcdn.net/ajax/libs/axios/0.27.2/axios.min.js',
    'https://cdn.bootcdn.net/ajax/libs/vant/2.12.54/vant.min.js',
    'https://cdn.bootcdn.net/ajax/libs/Swiper/5.4.5/js/swiper.min.js',
    'https://cdn.bootcdn.net/ajax/libs/jszip/3.10.1/jszip.min.js',
    'https://cdn.bootcdn.net/ajax/libs/lodash.js/4.17.21/lodash.min.js',
    'https://cdn.bootcdn.net/ajax/libs/localforage/1.10.0/localforage.min.js',
    'https://cdn.bootcdn.net/ajax/libs/crypto-js/4.1.1/crypto-js.min.js',
  ],
}

/** @type import('@vue/cli-service').ProjectOptions */
module.exports = {
  publicPath: '/',
  lintOnSave: false,
  runtimeCompiler: false,
  productionSourceMap: false,
  devServer: {
    proxy: {
      '/prks/now': {
        target: 'https://now.pixiv.pics',
        changeOrigin: true,
        pathRewrite: { '^/prks/now': '' },
      },
      '/prks/obfs': {
        target: 'https://api.obfs.dev',
        changeOrigin: true,
        pathRewrite: { '^/prks/obfs': '' },
      },
    },
  },
  transpileDependencies: ['mint-filter'],
  configureWebpack: config => {
    if (isProduction) {
      config.optimization.minimizer[0].options.minimizer.options.compress.drop_console = true
      config.externals = {
        'vue': 'Vue',
        'vue-i18n': 'VueI18n',
        'vant': 'vant',
        'vue-router': 'VueRouter',
        'vuex': 'Vuex',
        'axios': 'axios',
        'swiper': 'Swiper',
        'jszip': 'JSZip',
        'lodash': '_',
        'localforage': 'localforage',
        'crypto-js': 'CryptoJS',
      }
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
      .use('svg-sprite-loader')
      .loader('svg-sprite-loader')
      .options({
        symbolId: 'icon-[name]',
      })
      .end()

    if (isProduction) {
      config.plugins.delete('preload')
      config.plugins.delete('prefetch')
      config.plugin('html')
        .tap(args => {
          args[0].cdn = cdn
          return args
        })
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
      exclude: [/\.map$/, /^manifest.*\.js$/, /lang-.*-json\..*\.js$/],
      navigateFallbackDenylist: [/^\/prks\//],
      runtimeCaching: [
        {
          urlPattern: /.*\.html$/,
          handler: 'StaleWhileRevalidate',
          options: { cacheName: 'html-cache', cacheableResponse: { statuses: [200] } },
        },
        {
          urlPattern: /^https:\/\/cdn\.bootcdn\.net\/.*\.(css|js)$/,
          handler: 'CacheFirst',
          options: {
            cacheName: 'cdn-cache',
            cacheableResponse: { statuses: [200] },
            fetchOptions: { credentials: 'omit', mode: 'cors' },
          },
        },
      ],
    },
  },
}
