<template>
  <section class="site-section b2b-section">
    <div class="container">
      <div class="b2b-content">
        <h2 class="b2b-title">{{ b2bData.title }}</h2>
        <p v-if="b2bData.subtitle" class="b2b-subtitle">{{ b2bData.subtitle }}</p>

        <div class="b2b-cards">
          <div class="b2b-card" v-for="(card, index) in b2bData.cards" :key="index">
            <h3 class="b2b-card__title">{{ card.title }}</h3>
            <p class="b2b-card__text">{{ card.subtitle }}</p>
            <nuxt-link :to="card.link" class="b2b-card__link">
              {{ card.cta }}
            </nuxt-link>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
export default {
  props: ['data'],
  data() {
    return {
      dictionaries: {
        ru: {
          title: 'Для тех, кто бронирует поездки за других',
          subtitle: '',
          travelPlanners: {
            title: 'Тревел-планировщики',
            subtitle: 'Получайте нетто-цены от локальных автопарков, добавляйте свою маржу, отправляйте клиенту готовый ваучер, а Riderra возьмёт операционную часть на себя.',
            cta: 'Получить доступ',
            link: '/login'
          },
          businessTravel: {
            title: 'Бизнес-поездки',
            subtitle: 'Надёжные трансферы в аэропорт с понятными правилами, отслеживанием рейса, документами и поддержкой.',
            cta: 'Бизнес-поездки',
            link: '/business-travel'
          },
          aiAgents: {
            title: 'AI-агенты',
            subtitle: 'AI-агенты могут создавать структурированные draft-заявки. Riderra подтверждает цену и доступность перед финальным бронированием.',
            cta: 'Протокол для AI-агентов',
            link: '/ai'
          }
        },
        en: {
          title: 'Built for people who book travel for others',
          subtitle: '',
          travelPlanners: {
            title: 'Travel planners',
            subtitle: 'Get local fleet net rates, add your margin, send a client-ready voucher, and let Riderra handle the operation.',
            cta: 'Get access',
            link: '/login'
          },
          businessTravel: {
            title: 'Business travel',
            subtitle: 'Reliable airport transfers with clear rules, flight tracking, invoices and support.',
            cta: 'Business travel',
            link: '/business-travel'
          },
          aiAgents: {
            title: 'AI agents',
            subtitle: 'AI travel agents can create structured draft transfer requests. Riderra confirms price and availability before final booking.',
            cta: 'AI booking protocol',
            link: '/ai'
          }
        }
      }
    };
  },
  computed: {
    b2bData() {
      const lang = this.$store.state.language;
      const dict = this.dictionaries[lang] || this.dictionaries.en;
      return {
        title: dict.title,
        subtitle: dict.subtitle,
        cards: [
          dict.travelPlanners,
          dict.businessTravel,
          dict.aiAgents
        ]
      };
    }
  }
}
</script>

<style scoped lang="scss">
.b2b-section {
  padding: 80px 0;
  background: #fff;

  .b2b-content {
    text-align: center;

    .b2b-title {
      font-size: 36px;
      font-weight: 800;
      color: #17233d;
      margin-bottom: 20px;
    }

    .b2b-subtitle {
      font-size: 18px;
      color: #4a5568;
      max-width: 700px;
      margin: 0 auto 48px;
      line-height: 1.6;
    }

    .b2b-cards {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 24px;
    }

    .b2b-card {
      background: #f7fafc;
      border-radius: 8px;
      padding: 32px;
      border: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      transition: transform 0.2s ease, box-shadow 0.2s ease;

      &:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08);
      }

      &__title {
        font-size: 20px;
        font-weight: 700;
        color: #17233d;
        margin-bottom: 16px;
      }

      &__text {
        font-size: 14px;
        color: #4a5568;
        line-height: 1.6;
        margin-bottom: 20px;
        flex: 1;
      }

      &__link {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        color: #1a237e;
        text-decoration: none;
        font-weight: 600;
        font-size: 14px;

        &:after {
          content: '→';
          margin-left: 4px;
        }

        &:hover {
          text-decoration: underline;
        }
      }
    }
  }
}

@media (max-width: 767px) {
  .b2b-section {
    padding: 40px 0;

    .b2b-content {
      .b2b-title {
        font-size: 28px;
      }

      .b2b-subtitle {
        font-size: 16px;
      }

      .b2b-cards {
        gap: 16px;
      }

      .b2b-card {
        padding: 24px;
      }
    }
  }
}

@media (min-width: 768px) and (max-width: 1024px) {
  .b2b-section {
    .b2b-content {
      .b2b-cards {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
  }
}

@media (max-width: 767px) {
  .b2b-section {
    .b2b-content {
      .b2b-cards {
        grid-template-columns: 1fr;
      }
    }
  }
}
</style>
