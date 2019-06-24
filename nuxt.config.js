module.exports = {
  /*
  ** Headers of the page
  */
/*  server: {
    port: 8000, // default: 3000
    host: '0.0.0.0', // default: localhost
  },*/
  mode: 'spa',
  head: {
    title: 'ridera',
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, user-scalable=no'},
    ], meta: [
      { name: 'verify-paysera', content: '786155b65babe25bf1107c05564237de'},
    ],
    link: [
      { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
      { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css?family=Montserrat:300,400,500,700,800&amp;subset=cyrillic-ext' }
    ]
  },
  /*
  ** Customize the progress bar color
  */
  modules: [
    'vue-scrollto/nuxt',
    ['nuxt-google-maps-module', {
      key: 'AIzaSyBf3Lh9cG-h6AjZlUPKyAFUxNhKbC7QKZs',
    }],
  ],
  maps: {
    key: 'AIzaSyBf3Lh9cG-h6AjZlUPKyAFUxNhKbC7QKZs',
  },
  loading: { color: '#3B8070' },

  plugins: [
    {src: '~/plugins/plugins.js', ssr: false},

  ],
  css: [
    {src: '~/assets/css/swiper.css', lang: 'css'},
    {src: '~/assets/css/main.scss', lang: 'sass'},
    {src: '~/assets/css/base.scss', lang: 'sass'},
    {src: '~/assets/css/payment.scss', lang: 'sass'},


  ],

/*
** Build configuration
*/
  build: {
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

