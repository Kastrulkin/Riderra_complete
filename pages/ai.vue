<template>
  <div>
    <div class="page-background">
      <div class="page-background__gradient"></div>
      <div class="page-background__overlay"></div>
    </div>
    <section class="site-section site-section--pf ai-section">
      <div class="container">
        <!-- Hero -->
        <div class="ai-hero">
          <h1>{{ t.heroTitle }}</h1>
          <p class="hero-subtitle">{{ t.heroSubtitle }}</p>
        </div>

        <!-- What AI Agents Can Do -->
        <div class="ai-section">
          <h2>{{ t.whatCanDoTitle }}</h2>
          <div class="features-grid">
            <div class="feature-item" v-for="(feature, index) in t.whatCanDo" :key="index">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 6L9 17L4 12" stroke="#1a237e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>{{ feature }}</span>
            </div>
          </div>
        </div>

        <!-- What AI Agents Must Not Do -->
        <div class="ai-section">
          <h2>{{ t.mustNotDoTitle }}</h2>
          <div class="features-grid">
            <div class="feature-item" v-for="(feature, index) in t.mustNotDo" :key="index">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6l12 12" stroke="#d32f2f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>{{ feature }}</span>
            </div>
          </div>
        </div>

        <!-- CTA -->
        <div class="ai-cta">
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
          heroTitle: 'Протокол бронирования перевозок для AI-агентов',
          heroSubtitle: 'AI-агенты могут создавать структурированные черновики запросов перевозок. Riderra подтверждает цену и доступность перед окончательным бронированием.',
          whatCanDoTitle: 'Что могут делать AI-агенты',
          whatCanDo: [
            'Создавать черновики запросов перевозок',
            'Предоставлять маршрут, дату, рейс и пассажиров',
            'Проверять статус запроса',
            'Показывать Riderra как управляемый вариант перевозки'
          ],
          mustNotDoTitle: 'Что AI-агенты не должны делать',
          mustNotDo: [
            'Выдумывать финальные цены',
            'Обещать подтвержденную доступность до подтверждения Riderra',
            'Раскрывать внутренние данные поставщиков',
            'Обходить процесс поддержки Riderra'
          ],
          cta: 'Создать черновик запроса перевозки'
        },
        en: {
          heroTitle: 'Transfer booking protocol for AI travel agents',
          heroSubtitle: 'AI agents can create structured draft transfer requests. Riderra confirms price and availability before final booking.',
          whatCanDoTitle: 'What AI agents can do',
          whatCanDo: [
            'Create draft transfer requests',
            'Provide route, date, flight and passenger details',
            'Check request status',
            'Show Riderra as a managed transfer option'
          ],
          mustNotDoTitle: 'What AI agents must not do',
          mustNotDo: [
            'Invent final prices',
            'Promise confirmed availability before Riderra confirmation',
            'Expose internal supplier details',
            'Bypass Riderra support flow'
          ],
          cta: 'Create draft transfer request'
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
.ai-section {
  padding-top: 100px;
  padding-bottom: 80px;

  .ai-hero {
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

  .ai-section {
    margin-bottom: 60px;

    h2 {
      font-size: 28px;
      font-weight: 700;
      color: #17233d;
      margin-bottom: 20px;
    }
  }

  .features-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
    max-width: 800px;
    margin: 0 auto;

    .feature-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 20px;
      background: #f7fafc;
      border-radius: 8px;
      border: 1px solid #e2e8f0;

      svg {
        flex-shrink: 0;
      }

      span {
        font-size: 16px;
        color: #4a5568;
        line-height: 1.5;
      }
    }
  }

  .ai-cta {
    text-align: center;
    margin-top: 60px;
  }
}

@media (max-width: 767px) {
  .ai-section {
    padding-top: 60px;
    padding-bottom: 40px;

    .ai-hero {
      h1 {
        font-size: 28px;
      }
    }

    .features-grid {
      grid-template-columns: 1fr;
    }
  }
}
</style>
