module.exports = {
  /*
  ** Headers of the page
  */
  server: {
    port: Number(process.env.PORT) || 3000,
    host: process.env.HOST || '0.0.0.0',
  },
  ssr: false,
  target: 'server',
  router: {
    prefetchLinks: false
  },
  render: {
    resourceHints: false
  },
  head: {
    title: 'Riderra - a network of fleets',
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, user-scalable=no'},
      { name: 'verify-paysera', content: '62146bc5c4017c962d28da066b8510c2'},

    ],
    link: [
      { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
    ],
    noscript: [
      {
        hid: 'yandex-metrika-noscript',
        innerHTML: '<div><img src="https://mc.yandex.ru/watch/108482177" style="position:absolute; left:-9999px;" alt="" /></div>'
      }
    ],
    __dangerouslyDisableSanitizersByTagID: {
      'yandex-metrika': ['innerHTML'],
      'yandex-metrika-noscript': ['innerHTML']
    }
  },
  serverMiddleware: [
    '~/server/index.js'
  ],
  /*
  ** Customize the progress bar color
  */
  modules: [
    'vue-scrollto/nuxt'
  ],
  loading: { color: '#2F80ED' },

  plugins: [
    { src: '~/plugins/chunk-reload.js', mode: 'client' },
    { src: '~/plugins/axios.js', mode: 'client' },
    { src: '~/plugins/supabase.js', mode: 'client' },
    { src: '~/plugins/client-head-assets.js', mode: 'client' },
    { src: '~/plugins/plugins.js', ssr: false }
  ],
  css: [
    {src: '~/assets/css/swiper.css', lang: 'css'},
    {src: '~/assets/css/main.scss', lang: 'sass'},
    {src: '~/assets/css/base.scss', lang: 'sass'},


  ],

/*
** Build configuration
*/
  build: {
    filenames: {
      app: ({ isDev }) => isDev ? '[name].js' : '[contenthash:8].js',
      chunk: ({ isDev }) => isDev ? '[name].js' : '[contenthash:8].js',
      css: ({ isDev }) => isDev ? '[name].css' : '[contenthash:8].css'
    },
    optimization: {
      splitChunks: {
        chunks: 'all',
        automaticNameDelimiter: '.',
        cacheGroups: {
          commons: false,
          vendors: false,
          default: false,
          styles: false
        }
      },
      runtimeChunk: 'single'
    },
    /*
    ** Run ESLint on save
    */
    extend (config, { isDev, isClient }) {
      if (isDev && isClient) {
        config.module.rules.push({
          enforce: 'pre',
          test: /\.(js|vue)$/,
          loader: 'eslint-loader',
          exclude: /(node_modules)/
        })
      }
    }
  }
}
