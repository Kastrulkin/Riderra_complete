<template>
  <section class="site-section b2b-section">
    <div class="container">
      <div class="b2b-content">
        <h2 class="b2b-title">{{ b2bData.title }}</h2>
        <p class="b2b-subtitle">{{ b2bData.subtitle }}</p>

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
  computed: {
    b2bData() {
      const b2b = this.data['b2b'] || {};
      return {
        title: b2b.subtitle || 'Private transfers for people who book travel for others',
        subtitle: 'Riderra helps travel planners, business travelers and AI agents book reliable private transfers through one managed transfer desk connected to local fleet partners.',
        cards: [
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
      display: flex;
      gap: 24px;
      justify-content: center;
      flex-wrap: wrap;
    }

    .b2b-card {
      flex: 1;
      min-width: 280px;
      max-width: 320px;
      background: #f7fafc;
      border-radius: 12px;
      padding: 32px;
      border: 1px solid #e2e8f0;
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
        min-width: 100%;
        max-width: 100%;
        padding: 24px;
      }
    }
  }
}
</style>
