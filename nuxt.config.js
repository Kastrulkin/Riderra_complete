module.exports = {
  /*
  ** Headers of the page
  */
/*  server: {
    port: 8000, // default: 3000
    host: '0.0.0.0', // default: localhost
  },*/
  ssr: false,
  target: 'static',
  head: {
    title: 'Riderra - the network of fleets',
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, user-scalable=no'},
      { name: 'verify-paysera', content: '62146bc5c4017c962d28da066b8510c2'},

    ],
    link: [
      { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
      { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css?family=Montserrat:300,400,500,700,800&amp;subset=cyrillic-ext' }
    ]
  },
  serverMiddleware: [
    '~/server/index.js'
  ],
  /*
  ** Customize the progress bar color
  */
  modules: [
    ['@nuxtjs/axios', {rejectUnauthorized: false}],
    'vue-scrollto/nuxt',
    ['nuxt-google-maps-module', {
      key: 'AIzaSyBf3Lh9cG-h6AjZlUPKyAFUxNhKbC7QKZs',
    }],
  ],
  axios: {
    // proxyHeaders: false
    rejectUnauthorized: false,
    baseURL: process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : ''
  },
  maps: {
    key: 'AIzaSyBf3Lh9cG-h6AjZlUPKyAFUxNhKbC7QKZs',
  },
  loading: { color: '#3B8070' },

  plugins: [
    { src: '~/plugins/supabase.js', mode: 'client' },
    { src: '~/plugins/plugins.js', ssr: false }
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

