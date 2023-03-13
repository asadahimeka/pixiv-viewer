const path = require('path')
const autoprefixer = require('autoprefixer')
const pxtorem = require('postcss-pxtorem')

const isProduction = process.env.NODE_ENV === 'production'
const svgIconDir = path.join(__dirname, 'src/icons/svg')

const cdn = {
  css: [],
  js: [
    'https://cdn.staticfile.org/vue/2.6.14/vue.min.js',
    'https://cdn.staticfile.org/vue-i18n/8.28.2/vue-i18n.min.js',
    'https://cdn.staticfile.org/vue-router/3.6.5/vue-router.min.js',
    'https://cdn.staticfile.org/vuex/3.6.2/vuex.min.js',
    'https://cdn.staticfile.org/axios/0.27.2/axios.min.js',
    'https://cdn.staticfile.org/vant/2.12.54/vant.min.js',
    'https://cdn.staticfile.org/Swiper/5.4.5/js/swiper.min.js',
    'https://cdn.staticfile.org/jszip/3.10.1/jszip.min.js',
    'https://cdn.staticfile.org/lodash.js/4.17.21/lodash.min.js',
    'https://cdn.staticfile.org/localforage/1.10.0/localforage.min.js',
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
      '/prks/s': {
        target: 'https://www.pixivs.cn',
        changeOrigin: true,
        pathRewrite: { '^/prks/s': '' },
      },
      '/prks/now': {
        target: 'https://now.pixiv.pics',
        changeOrigin: true,
        pathRewrite: { '^/prks/now': '' },
      },
    },
  },
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
    workboxPluginMode: 'GenerateSW',
    workboxOptions: {
      skipWaiting: true,
      clientsClaim: true,
      navigateFallbackDenylist: [
        /^\/prks\//,
      ],
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/.*\.kanata\.ml\/?$/,
          handler: 'StaleWhileRevalidate',
          options: { cacheName: 'index-cache', cacheableResponse: { statuses: [200] } },
        },
        {
          urlPattern: /^https:\/\/pixiv\.pics\/?$/,
          handler: 'StaleWhileRevalidate',
          options: { cacheName: 'index-cache', cacheableResponse: { statuses: [200] } },
        },
        {
          urlPattern: /.*\.html$/,
          handler: 'StaleWhileRevalidate',
          options: { cacheName: 'html-cache', cacheableResponse: { statuses: [200] } },
        },
        {
          urlPattern: /\.(?:css|js)$/,
          handler: 'CacheFirst',
          options: { cacheName: 'css-js-cache', cacheableResponse: { statuses: [200] } },
        },
        {
          urlPattern: /\.(?:png|gif|jpg|jpeg|svg)$/,
          handler: 'CacheFirst',
          options: { cacheName: 'image-cache', cacheableResponse: { statuses: [200] } },
        },
        {
          urlPattern: /^https:\/\/cdn\.staticfile\.org/,
          handler: 'StaleWhileRevalidate',
          options: { cacheName: 'cdn-cache', cacheableResponse: { statuses: [200] } },
        },
      ],
    },
  },
}
