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
          <a :href="data['main'].ctaPrimaryLink || '#booking-widget'" class="btn btn--primary hero-btn-primary" @click="scrollToBooking">
            {{ data['main'].ctaPrimary || data['main'].orderButton }}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 4L10 8L6 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </a>
          <nuxt-link :to="data['main'].ctaSecondaryLink || '/drivers'" class="btn btn--ghost hero-btn-secondary">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2L10 6L14 6L11 9L12 13L8 11L4 13L5 9L2 6L6 6L8 2Z" fill="#FFD700"/>
            </svg>
            {{ data['main'].ctaSecondary || data['main'].driverButton }}
          </nuxt-link>
        </div>

        <!-- B2B Value Proposition Cards -->
        <div class="b2b-cards" v-if="b2bCards && b2bCards.length">
          <div class="b2b-card" v-for="(card, index) in b2bCards" :key="index">
            <h3 class="b2b-card__title">{{ card.title }}</h3>
            <p class="b2b-card__subtitle">{{ card.subtitle }}</p>
            <nuxt-link :to="card.link" class="b2b-card__link">
              {{ card.cta }}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 4L10 8L6 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </nuxt-link>
          </div>
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
      b2bCards() {
        const b2b = this.data['b2b'] || {};
        return [
          {
            title: b2b.travelPlannersCta || 'Get agency access',
            subtitle: b2b.travelPlannersText || 'Get local fleet net rates, add your margin, send a client-ready voucher, and let Riderra handle the operation.',
            cta: b2b.travelPlannersCta || 'Get agency access',
            link: '/for-travel-planners'
          },
          {
            title: b2b.businessTravelCta || 'Business travel',
            subtitle: b2b.businessTravelText || 'Reliable airport transfers with clear rules, flight tracking, invoices and support.',
            cta: b2b.businessTravelCta || 'Business travel',
            link: '/business-travel'
          },
          {
            title: b2b.aiAgentsCta || 'AI booking protocol',
            subtitle: b2b.aiAgentsText || 'AI travel agents can create structured draft transfer requests. Riderra confirms price and availability before final booking.',
            cta: b2b.aiAgentsCta || 'AI booking protocol',
            link: '/ai'
          }
        ];
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
    height: 88svh;
    width: 100vw;
    min-width: 100vw;
    /*background-image: url('/img/main_bg.jpg');*/
    background-size: cover;
    min-height: 620px;
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
      border-radius: 8px;
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

    // B2B Cards
    .b2b-cards {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
      margin-top: 40px;
    }

    .b2b-card {
      flex: 1;
      min-width: 280px;
      max-width: 320px;
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      border-radius: 12px;
      padding: 24px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      transition: background 0.2s ease;

      &:hover {
        background: rgba(255, 255, 255, 0.15);
      }

      &__title {
        font-size: 20px;
        font-weight: 700;
        color: #fff;
        margin-bottom: 12px;
      }

      &__subtitle {
        font-size: 14px;
        color: rgba(255, 255, 255, 0.9);
        line-height: 1.5;
        margin-bottom: 16px;
      }

      &__link {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        color: #fff;
        text-decoration: none;
        font-weight: 600;
        font-size: 14px;

        &:hover {
          text-decoration: underline;
        }
      }
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
      &__overlay {
        background: linear-gradient(90deg, rgba(7, 12, 22, 0.86) 0%, rgba(7, 12, 22, 0.68) 56%, rgba(7, 12, 22, 0.34) 100%);
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

      min-height: 680px;
      height: auto;

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

    .hero-actions {
      flex-direction: column;
      align-items: flex-start;
      margin-bottom: 28px;
    }

    .hero-stats {
      gap: 12px;
      width: 100%;
    }

    .stat-item {
      flex: 1 1 0;
      min-width: 0;
      gap: 8px;
    }

    .stat-item__icon {
      display: none;
    }

    .stat-item__number {
      font-size: 20px;
    }

    .stat-item__label {
      font-size: 12px;
      line-height: 1.25;
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
