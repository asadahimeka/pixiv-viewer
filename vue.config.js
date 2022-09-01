const path = require('path')
const autoprefixer = require('autoprefixer');
const pxtorem = require('postcss-pxtorem');

const cdn = {
  css: [
    'https://lib.baomitu.com/vant/2.12.48/index.min.css'
  ],
  js: [
    'https://lib.baomitu.com/vue/2.6.14/vue.min.js',
    'https://lib.baomitu.com/vue-router/3.5.3/vue-router.min.js',
    'https://lib.baomitu.com/vuex/3.6.2/vuex.min.js',
    'https://lib.baomitu.com/axios/0.27.2/axios.min.js',
    'https://lib.baomitu.com/vant/2.12.48/vant.min.js',
    'https://lib.baomitu.com/Swiper/5.4.5/js/swiper.min.js',
    'https://lib.baomitu.com/moment.js/2.29.4/moment.min.js',
    'https://lib.baomitu.com/jszip/3.10.1/jszip.min.js',
    'https://lib.baomitu.com/lodash.js/4.17.21/lodash.min.js',
  ]
}

const isProduction = process.env.NODE_ENV === 'production'

/** @type import('@vue/cli-service').ProjectOptions */
module.exports = {
  publicPath: isProduction ? '././' : '/',
  lintOnSave: false,
  runtimeCompiler: true,
  productionSourceMap: true,
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
      .exclude.add(path.join(__dirname, 'src/icons/svg'))
      .end()

    config.module
      .rule('icons')
      .test(/\.svg$/)
      .include.add(path.join(__dirname, 'src/icons/svg'))
      .end()
      .use('svg-sprite-loader')
      .loader('svg-sprite-loader')
      .options({
        symbolId: 'icon-[name]'
      })
      .end()

    if (isProduction) {
      config.plugins.delete('preload');
      config.plugins.delete('prefetch');
      config.optimization.minimize(true);
      config.optimization.splitChunks({
        chunks: 'all'
      })
      config.plugin('html')
        .tap(args => {
          args[0].cdn = cdn;
          return args;
        });
    }
  },
  configureWebpack: config => {
    if (isProduction) {
      config.externals = {
        vue: "Vue",
        vant: "vant",
        'vue-router': "VueRouter",
        vuex: "Vuex",
        axios: "axios",
        swiper: 'Swiper',
        moment: 'moment',
        jszip: 'JSZip',
        lodash: '_',
      }
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
              selectorBlackList: ['van']
            }),
          ],
        },
      },
    },
  },
  pwa: {
    name: 'Pixiv Viewer Kai',
    themeColor: '#0097fa',
    workboxPluginMode: 'GenerateSW',
    workboxOptions: {
      skipWaiting: true,
      clientsClaim: true,
      runtimeCaching: [
        {
          urlPattern: /.*\.css/,
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'css-cache',
            cacheableResponse: {
              statuses: [200]
            }
          }
        },
        {
          urlPattern: /.*\.js/,
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'js-cache',
            cacheableResponse: {
              statuses: [200]
            }
          }
        },
        {
          urlPattern: /\.(?:png|gif|jpg|jpeg|svg)$/,
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'image-cache',
            cacheableResponse: {
              statuses: [200]
            },
            expiration: {
              maxEntries: 100,
              maxAgeSeconds: 31536000
            }
          }
        },
        {
          urlPattern: new RegExp('^https://lib.baomitu.com'),
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'cdn-cache',
            cacheableResponse: {
              statuses: [200]
            },
            fetchOptions: {
              credentials: 'include'
            }
          }
        }
      ]
    }
  }
}
