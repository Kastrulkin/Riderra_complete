<template>
  <div>
    <div class="page-background">
      <div class="page-background__gradient"></div>
      <div class="page-background__overlay"></div>
    </div>
    <section class="site-section site-section--pf services-section">
      <div class="container">
        <!-- Hero -->
        <div class="services-hero">
          <h1>{{ t.heroTitle }}</h1>
          <p class="hero-subtitle">{{ t.heroSubtitle }}</p>
        </div>

        <!-- Services Grid -->
        <div class="services-grid">
          <div class="service-item" v-for="(service, index) in t.services" :key="index">
            <div class="service-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 6L9 17L4 12" stroke="#1a237e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <h3>{{ service.title }}</h3>
            <p>{{ service.desc }}</p>
          </div>
        </div>

        <!-- CTA -->
        <div class="services-cta">
          <h2>{{ t.ctaTitle }}</h2>
          <a href="#booking-widget" class="btn btn--primary">{{ t.cta }}</a>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
export default {
  layout: 'default',
  computed: {
    lang() { return this.$store.state.language },
    t() {
      const dict = {
        ru: {
          heroTitle: 'Наши услуги',
          heroSubtitle: 'Мы предлагаем широкий спектр услуг по перевозкам для любых потребностей',
          services: [
            {
              title: 'Трансферы в аэропорт',
              desc: 'Надежные перевозки в аэропорт и обратно с отслеживанием рейсов'
            },
            {
              title: 'Городские перевозки',
              desc: 'Перемещение по городу для деловых и личных нужд'
            },
            {
              title: 'Бизнес-перевозки',
              desc: 'Управляемые перевозки для бизнес-клиентов с счетами-фактурами'
            },
            {
              title: 'Семейные перевозки',
              desc: 'Безопасные перевозки для семей с детьми'
            },
            {
              title: 'Групповые и событийные перевозки',
              desc: 'Перевозки для мероприятий, свадеб и групповых поездок'
            }
          ],
          ctaTitle: 'Нужна перевозка?',
          cta: 'Создать запрос перевозки'
        },
        en: {
          heroTitle: 'Our Services',
          heroSubtitle: 'We offer a wide range of transfer services for any need',
          services: [
            {
              title: 'Airport Transfers',
              desc: 'Reliable airport pickups and drop-offs with flight tracking'
            },
            {
              title: 'City Transfers',
              desc: 'City transportation for business and personal needs'
            },
            {
              title: 'Business Transfers',
              desc: 'Managed transfers for business clients with invoicing'
            },
            {
              title: 'Family Transfers',
              desc: 'Safe transportation for families with children'
            },
            {
              title: 'Group & Event Transfers',
              desc: 'Transportation for events, weddings, and group trips'
            }
          ],
          ctaTitle: 'Need a transfer?',
          cta: 'Create transfer request'
        }
      };
      return dict[this.lang] || dict.en;
    }
  },
  data() {
    return {
      siteData: {}
    };
  }
}
</script>

<style scoped lang="scss">
.services-section {
  padding-top: 100px;
  padding-bottom: 80px;

  .services-hero {
    text-align: center;
    margin-bottom: 60px;

    h1 {
      font-size: 42px;
      font-weight: 800;
      color: #17233d;
      margin-bottom: 20px;
    }

    .hero-subtitle {
      font-size: 18px;
      color: #4a5568;
      max-width: 700px;
      margin: 0 auto;
      line-height: 1.6;
    }
  }

  .services-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
    max-width: 1000px;
    margin: 0 auto 60px;

    .service-item {
      background: #f7fafc;
      border-radius: 12px;
      padding: 32px;
      border: 1px solid #e2e8f0;
      text-align: center;
      transition: transform 0.3s ease, box-shadow 0.3s ease;

      &:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 24px rgba(0,0,0,0.1);
      }

      .service-icon {
        margin-bottom: 20px;

        svg {
          color: #1a237e;
        }
      }

      h3 {
        font-size: 20px;
        font-weight: 700;
        color: #17233d;
        margin-bottom: 12px;
      }

      p {
        font-size: 15px;
        color: #4a5568;
        line-height: 1.6;
      }
    }
  }

  .services-cta {
    text-align: center;
    margin-top: 60px;

    h2 {
      font-size: 28px;
      font-weight: 700;
      color: #17233d;
      margin-bottom: 20px;
    }
  }
}

@media (max-width: 767px) {
  .services-section {
    padding-top: 60px;
    padding-bottom: 40px;

    .services-hero {
      h1 {
        font-size: 28px;
      }
    }

    .services-grid {
      grid-template-columns: 1fr;
      gap: 16px;
    }

    .service-item {
      padding: 20px;
    }
  }
}
</style>
