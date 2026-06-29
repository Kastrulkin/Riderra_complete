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

        <h1 class="hero-title">
          {{ data['main'].title }}
          <span v-if="data['main'].subtitle" class="hero-title__subtitle">{{ data['main'].subtitle }}</span>
        </h1>

        <p class="hero-description">
          {{ data['main'].description }}
        </p>

        <div class="hero-actions">
          <a :href="primaryLink" class="btn btn--primary hero-btn-primary" @click="handleCtaClick($event, primaryLink)">
            {{ data['main'].ctaPrimary || data['main'].orderButton }}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 4L10 8L6 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </a>
          <a :href="secondaryLink" class="btn btn--ghost hero-btn-secondary" @click="handleCtaClick($event, secondaryLink)">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2L10 6L14 6L11 9L12 13L8 11L4 13L5 9L2 6L6 6L8 2Z" fill="#FFD700"/>
            </svg>
            {{ data['main'].ctaSecondary || data['main'].driverButton }}
          </a>
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
      primaryLink() {
        return this.data['main'].ctaPrimaryLink || '/for-travel-planners';
      },
      secondaryLink() {
        return this.data['main'].ctaSecondaryLink || '/#booking-widget';
      }
    },
    methods:{
      handleCtaClick(e, link) {
        if (link !== '#booking-widget' && link !== '/#booking-widget') return;
        e.preventDefault();
        const bookingWidget = document.querySelector('#booking-widget');
        if (bookingWidget) {
          bookingWidget.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
          if (window.history && window.history.replaceState) {
            window.history.replaceState(null, '', '/#booking-widget');
          }
          return;
        }
        window.location.href = '/#booking-widget';
      }
    }
  }
</script>

<style lang="scss">
  .main-section {
    min-height: 680px;
    width: 100%;
    /*background-image: url('/img/main_bg.jpg');*/
    background-size: cover;
    display: flex;
    align-items: center;
    position: relative;
    padding: 150px 0 90px;

    &__content{
      opacity: 1;
      transform: none;
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
      border-radius: 8px;
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
      max-width: 720px;
    }

    .hero-title__accent {
      display: block;
      color: #fff;
    }

    .hero-title .subtitle {
      font-size: 0.6em !important;
      line-height: 1.4;
      display: block;
      margin-top: 10px;
      color: rgba(255, 255, 255, 0.9);
    }

    .hero-title__subtitle {
      display: block;
      font-size: 0.6em;
      line-height: 1.35;
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
      margin-bottom: 36px;
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
      background: rgba(7, 12, 22, 0.56);
      z-index: 1;
    }

    &__image {
      position: absolute;
      right: 0;
      top: 0;
      width: 100%;
      height: 100%;
      z-index: 0;
      overflow: hidden;
    }

    .hero-car-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center right;
      opacity: 1;
    }

    &__overlay {
      position: absolute;
      left: 0;
      top: 0;
      right: 0;
      bottom: 0;
      height: 100%;
      width: 100%;
      background: linear-gradient(90deg, rgba(7, 12, 22, 0.82) 0%, rgba(7, 12, 22, 0.58) 44%, rgba(7, 12, 22, 0.22) 100%);
      z-index: 3;
    }
  }

  @media all and (max-width: 1024px) {
    .main-section {
      min-height: 620px;
      padding: 130px 0 72px;

      &__overlay {
        background: linear-gradient(90deg, rgba(7, 12, 22, 0.86) 0%, rgba(7, 12, 22, 0.68) 56%, rgba(7, 12, 22, 0.34) 100%);
      }
    }

    .hero-title {
      font-size: 40px;
    }
  }

  @media all and (max-width: 767px) {
    .main-section {
      &__title {
        width: 75%;
        margin-bottom: 25px;
      }

      min-height: auto;
      height: auto;
      padding: 0;

      &__content {
        padding-top: 110px;
        padding-bottom: 56px;
      }

      &__overlay {
        background: rgba(7, 12, 22, 0.78);
      }
    }

    .hero-title {
      font-size: 30px;
      margin-bottom: 16px;
    }

    .hero-description {
      font-size: 16px;
      margin-bottom: 28px;
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
