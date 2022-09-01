const autoprefixer = require('autoprefixer');
const pxtorem = require('postcss-pxtorem');

const cdn = {
  css: [
    'https://lib.baomitu.com/vant/2.12.48/index.min.css',
    'https://lib.baomitu.com/Swiper/5.4.5/css/swiper.min.css'
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

module.exports = {
  publicPath: isProduction ? '././' : '/',
  chainWebpack: config => {
    config
      .module
      .rule('vue')
      .use('vue-loader')
      .tap(args => {
        args.compilerOptions.whitespace = 'preserve'
      })

    if (isProduction) {
      // 删除预加载
      config.plugins.delete('preload');
      config.plugins.delete('prefetch');
      // 压缩代码
      config.optimization.minimize(true);
      // 分割代码
      config.optimization.splitChunks({
        chunks: 'all'
      })
      // 生产环境注入cdn
      config.plugin('html')
        .tap(args => {
          args[0].cdn = cdn;
          return args;
        });
    }
  },
  configureWebpack: config => {
    if (isProduction) {
      // 用cdn方式引入
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
    loaderOptions: {
      postcss: {
        plugins: [
          autoprefixer(),
          pxtorem({
            rootValue: 75,
            propList: ['*'],
            selectorBlackList: ['van']
          })
        ]
      }
    },
    sourceMap: false
  },
  lintOnSave: false,
  runtimeCompiler: true,
  productionSourceMap: false,
}
