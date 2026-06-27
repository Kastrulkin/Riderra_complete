<template>
  <div>
    <div class="page-background">
      <div class="page-background__gradient"></div>
      <div class="page-background__overlay"></div>
    </div>
    <section class="site-section site-section--pf business-travel-section">
      <div class="container">
        <!-- Hero -->
        <div class="bt-hero">
          <h1>{{ t.heroTitle }}</h1>
          <p class="hero-subtitle">{{ t.heroSubtitle }}</p>

          <ul class="features-list">
            <li><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17L4 12" stroke="#1a237e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>{{ t.features[0] }}</li>
            <li><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17L4 12" stroke="#1a237e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>{{ t.features[1] }}</li>
            <li><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17L4 12" stroke="#1a237e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>{{ t.features[2] }}</li>
            <li><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17L4 12" stroke="#1a237e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>{{ t.features[3] }}</li>
          </ul>

          <a href="/#booking-widget" class="btn btn--primary">{{ t.cta }}</a>
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
          heroTitle: 'Надежные перевозки в аэропорт для деловых поездок',
          heroSubtitle: 'Заказывайте частные перевозки с четкими правилами, отслеживанием рейсов, счетами-фактурами и поддержкой — без зависимости от случайных локальных такси.',
          features: [
            'Встреча в аэропорту с четкими инструкциями для встречи',
            'Отслеживание рейсов и правила времени ожидания',
            'Счета-фактуры и повторные маршруты',
            'Поддержка в случае изменения планов'
          ],
          cta: 'Создать запрос перевозки'
        },
        en: {
          heroTitle: 'Reliable airport transfers for business travel',
          heroSubtitle: 'Book private transfers with clear rules, flight tracking, invoices and support — without relying on random local taxis.',
          features: [
            'Airport pickup with clear meeting instructions',
            'Flight tracking and waiting time rules',
            'Invoices and repeat routes',
            'Support if plans change'
          ],
          cta: 'Create transfer request'
        }
      };
      return dict[this.lang] || dict.en;
    }
  }
}
</script>

<style scoped lang="scss">
.business-travel-section {
  padding-top: 100px;
  padding-bottom: 80px;

  .bt-hero {
    text-align: center;

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
      margin: 0 auto 40px;
      line-height: 1.6;
    }

    .features-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      align-items: center;
      margin-bottom: 40px;

      li {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px 24px;
        background: #f7fafc;
        border-radius: 8px;
        border: 1px solid #e2e8f0;
        font-size: 16px;
        color: #4a5568;
        line-height: 1.5;

        svg {
          flex-shrink: 0;
        }
      }
    }
  }
}

@media (max-width: 767px) {
  .business-travel-section {
    padding-top: 60px;
    padding-bottom: 40px;

    .bt-hero {
      h1 {
        font-size: 28px;
      }

      .hero-subtitle {
        font-size: 16px;
      }

      .features-list {
        li {
          font-size: 14px;
          padding: 12px 16px;
        }
      }
    }
  }
}
</style>
