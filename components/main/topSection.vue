<template>
  <section class="main-section">
    <div class="main-section__background">
      <div class="main-section__gradient"></div>
      <div class="main-section__image">
        <img src="/img/car-hero.jpg" alt="Modern car" class="hero-car-image">
      </div>
      <div class="main-section__overlay"></div>
    </div>

    <div class="main-section__content container">
      <div class="hero-content">
        <div class="hero-badge">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 0L10.5 5.5L16 8L10.5 10.5L8 16L5.5 10.5L0 8L5.5 5.5L8 0Z" fill="#2F80ED"/>
          </svg>
          <span>{{ data['main'].badge }}</span>
        </div>
        
        <h1 class="hero-title" v-html="data['main'].title"></h1>
        
        <p class="hero-description">
          {{ data['main'].description }}
        </p>
        
        <div class="hero-actions">
          <a href="#booking-widget" class="btn btn--primary hero-btn-primary" @click="scrollToBooking">
            {{ data['main'].orderButton }}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 4L10 8L6 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </a>
          <nuxt-link to="/drivers" class="btn btn--ghost hero-btn-secondary">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2L10 6L14 6L11 9L12 13L8 11L4 13L5 9L2 6L6 6L8 2Z" fill="#FFD700"/>
            </svg>
            {{ data['main'].driverButton }}
          </nuxt-link>
        </div>
        
        <div class="hero-stats">
          <div class="stat-item">
            <div class="stat-item__icon stat-item__icon--users">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z" fill="#4CAF50"/>
                <path d="M12 14C8.13401 14 5 17.134 5 21H19C19 17.134 15.866 14 12 14Z" fill="#4CAF50"/>
              </svg>
            </div>
            <div class="stat-item__content">
              <div class="stat-item__number">50K+</div>
              <div class="stat-item__label">{{ data['main'].users }}</div>
            </div>
          </div>
          
          <div class="stat-item">
            <div class="stat-item__icon stat-item__icon--trips">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M4 16L6 18L10 14" stroke="#2F80ED" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M20 8L18 6L14 10" stroke="#2F80ED" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div class="stat-item__content">
              <div class="stat-item__number">1M+</div>
              <div class="stat-item__label">{{ data['main'].trips }}</div>
            </div>
          </div>
          
          <div class="stat-item">
            <div class="stat-item__icon stat-item__icon--rating">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L15.09 8.26L22 9L17 14L18.18 21L12 17.77L5.82 21L7 14L2 9L8.91 8.26L12 2Z" fill="#FFD700"/>
              </svg>
            </div>
            <div class="stat-item__content">
              <div class="stat-item__number">4.9</div>
              <div class="stat-item__label">{{ data['main'].rating }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
  // import prebooking from '~/components/prebookingForm.vue'


  export default {
    props: ['data'],
    components: {
    },
    computed: {
      media(){
        return this.$store.state.media;
      },
    },
    data() {
      return {}
    },
    watch: {
      $route () {
        console.log('route changed', this.$route)
      }
    },
    methods:{
      pageLoad(){
        const sectionForm = document.querySelector('.main-section__content');
        const header = document.querySelector('.header');
        sectionForm.classList.add('active');
        header.classList.add('active');
      },
      scrollToBooking(e) {
        e.preventDefault();
        const bookingWidget = document.querySelector('#booking-widget');
        if (bookingWidget) {
          bookingWidget.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
          });
        }
      }
    },
    mounted() {
      this.pageLoad();
    }
  }
</script>

<style lang="scss">
  .main-section {
    height: 100vh;
    width: 100vw;
    min-width: 100vw;
    /*background-image: url('/img/main_bg.jpg');*/
    background-size: cover;
    min-height: 665px;
    display: flex;
    align-items: center;
    position: relative;

    &__content{
      opacity: 0;
      transform: translate3d(0, 20%, 0);
      transition: 400ms all ease;
      text-align: left;
      position: relative;
      z-index: 10;

      &.active{
        opacity: 1;
        transform: translate3d(0, 0, 0);
      }
    }

    // Hero Content Styles
    .hero-content {
      max-width: 600px;
      margin: 0;
      position: relative;
      z-index: 10;
    }

    .hero-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(47, 128, 237, 0.15);
      color: #fff;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 24px;
      backdrop-filter: blur(10px);
    }

    .hero-title {
      font-size: 48px;
      font-weight: 800;
      line-height: 1.1;
      margin-bottom: 24px;
      color: #fff;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
    }

    .hero-title .subtitle {
      font-size: 0.6em !important;
      line-height: 1.4;
      display: block;
      margin-top: 10px;
      color: rgba(255, 255, 255, 0.9);
    }

    .hero-description {
      font-size: 18px;
      color: rgba(255, 255, 255, 0.9);
      max-width: 500px;
      margin: 0 0 40px 0;
      line-height: 1.6;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
    }

    .hero-actions {
      display: flex;
      gap: 16px;
      justify-content: flex-start;
      margin-bottom: 60px;
      flex-wrap: wrap;
    }

    .hero-btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #1F2E4D;
      color: #FFFFFF;
      border: 0;
      border-radius: 6px;
      line-height: 48px;
      padding: 0 22px;
      font-weight: 600;
      font-size: 16px;
      text-decoration: none;
      cursor: pointer;
      transition: background .2s ease;
    }

    .hero-btn-primary:hover {
      background: #19253E;
      color: #FFFFFF;
    }

    .hero-btn-secondary {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: transparent;
      color: #FFFFFF;
      border: 1px solid #FFFFFF;
      border-radius: 6px;
      line-height: 48px;
      padding: 0 22px;
      font-weight: 600;
      font-size: 16px;
      text-decoration: none;
      cursor: pointer;
      transition: background .2s ease;
    }

    .hero-btn-secondary:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #FFFFFF;
    }

    .hero-stats {
      display: flex;
      justify-content: flex-start;
      gap: 48px;
      flex-wrap: wrap;
    }

    .stat-item {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .stat-item__icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(10px);
    }

    .stat-item__icon--users {
      background: rgba(76, 175, 80, 0.2);
    }

    .stat-item__icon--trips {
      background: rgba(47, 128, 237, 0.2);
    }

    .stat-item__icon--rating {
      background: rgba(255, 215, 0, 0.2);
    }

    .stat-item__number {
      font-size: 24px;
      font-weight: 700;
      color: #fff;
      line-height: 1;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
    }

    .stat-item__label {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.8);
      font-weight: 500;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
    }

    &__background {
      position: absolute;
      left: 0;
      right: 0;
      top: 0;
      bottom: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }

    &__gradient {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #1a237e 0%, #0d1421 50%, #000000 100%);
      z-index: 1;
    }

    &__image {
      position: absolute;
      right: 0;
      top: 0;
      width: 50%;
      height: 100%;
      z-index: 2;
      overflow: hidden;
    }

    .hero-car-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
      opacity: 0.8;
    }

    &__overlay {
      position: absolute;
      left: 0;
      top: 0;
      height: 200vh;
      width: 35vh;
      background: linear-gradient(180deg, rgba(255, 80, 41, 0.256) 0%, rgba(229, 0, 109, 0.8) 52.49%, rgba(112, 34, 131, 0.8) 64.64%);
      filter: blur(100px);
      transform: matrix(0.58, 1, -0.63, 0.64, 0, 0) translate3d(-120%, -40%, 0);
      z-index: 3;
    }
  }

  @media all and (max-width: 1024px) {
    .main-section {
      &__image {
        width: 40%;
      }

      &__overlay {
        transform: matrix(0.59, 0.96, -0.66, 0.63, 0, 0) translate3d(-160%, -30%, 0);
      }
    }

    .hero-title {
      font-size: 40px;
    }
    
    .hero-stats {
      gap: 32px;
    }
  }

  @media all and (max-width: 767px) {
    .main-section {
      &__title {
        width: 75%;
        margin-bottom: 25px;
      }

      &__image {
        width: 30%;
      }
    }

    .hero-title {
      font-size: 32px;
    }
    
    .hero-description {
      font-size: 16px;
    }
    
    .hero-actions {
      flex-direction: column;
      align-items: flex-start;
    }
    
    .hero-stats {
      flex-direction: column;
      gap: 24px;
    }
  }

  // Глобальные стили для классов в v-html
  .subtitle {
    font-size: 0.6em !important;
    line-height: 1.4;
    display: block;
    margin-top: 10px;
  }
  
  .subtitle-small {
    font-size: 0.5em !important;
    line-height: 1.4;
    display: block;
    margin-top: 8px;
  }
</style>
