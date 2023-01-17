const path = require('path')
const autoprefixer = require('autoprefixer');
const pxtorem = require('postcss-pxtorem');
// const { ContextReplacementPlugin } = require('webpack')

const isProduction = process.env.NODE_ENV === 'production'
const svgIconDir = path.join(__dirname, 'src/icons/svg')

/** @type import('@vue/cli-service').ProjectOptions */
module.exports = {
  publicPath: '/',
  lintOnSave: false,
  runtimeCompiler: false,
  productionSourceMap: false,
  configureWebpack: config => {
    // 生产环境取消 console.log
    if (isProduction) {
      config.optimization.minimizer[0].options.minimizer.options.compress.drop_console = true
    }

    // moment 语言包只加载 zh-cn; load `moment/locale/zh-cn.js`
    // config.plugins.push(new ContextReplacementPlugin(/moment[/\\]locale$/, /zh-cn/))
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
        symbolId: 'icon-[name]'
      })
      .end()

    if (isProduction) {
      config.plugins.delete('preload');
      config.plugins.delete('prefetch');
      config.optimization.minimize(true);
      config.optimization
        .splitChunks({
          chunks: 'all',
          cacheGroups: {
            deps: {
              name: 'chunk-deps',
              test: /[\\/]node_modules[\\/]/,
              priority: 10,
              chunks: 'initial' // only package third parties that are initially dependent
            },
            libs1: {
              name: 'chunk-libs1', // split ant-design-vue into a single package
              priority: 20, // the weight needs to be larger than libs and app or it will be packaged into libs or app
              test: /[\\/]node_modules[\\/]_?(axios|vue|@vue|@vant|vant|swiper|vue-svg-icon|buffer)(.*)/ // in order to adapt to cnpm
            },
            libs2: {
              name: 'chunk-libs2', // split ant-design-vue into a single package
              priority: 20, // the weight needs to be larger than libs and app or it will be packaged into libs or app
              test: /[\\/]node_modules[\\/]_?(vuex|vue-router|vue-awesome-swiper|v-calendar|vue-masonry-css|vue-lazyload)(.*)/ // in order to adapt to cnpm
            },
          }
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
              selectorBlackList: ['van']
            })
          ]
        }
      }
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
        /^\/api/,
        /^\/prks/,
      ],
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
          }
        },
      ]
    }
  }
}
