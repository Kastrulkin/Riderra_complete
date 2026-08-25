<template>
  <section class="site-section layers-section">
    <div class="container">
      <div class="layers-content">
        <h2 class="layers-title">{{ layersData.title }}</h2>

        <p class="layers-text">
          {{ layersData.text }}
        </p>

        <div class="layers-comparison">
          <div class="layer-block">
            <h3 class="layer-block__title">{{ layersData.typicalTitle }}</h3>
            <div class="layer-chain">
              <span class="layer-step">{{ layersData.typicalSteps[0] }}</span>
              <span
                v-for="(step, index) in layersData.typicalSteps.slice(1)"
                :key="`typical-${index}`"
                class="layer-segment"
              >
                <span class="layer-arrow" aria-hidden="true">→</span>
                <span class="layer-step">{{ step }}</span>
              </span>
            </div>
          </div>

          <div class="layer-block">
            <h3 class="layer-block__title">{{ layersData.riderraTitle }}</h3>
            <div class="layer-chain">
              <span class="layer-step">{{ layersData.riderraSteps[0] }}</span>
              <span
                v-for="(step, index) in layersData.riderraSteps.slice(1)"
                :key="`riderra-${index}`"
                class="layer-segment"
              >
                <span class="layer-arrow" aria-hidden="true">→</span>
                <span class="layer-step">{{ step }}</span>
              </span>
            </div>
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
          title: 'Меньше коммерческих слоёв. Понятнее ответственность.',
          text: 'Во многих международных трансферах заказ проходит через несколько коммерческих слоёв, прежде чем доходит до локального исполнителя. Riderra делает цепочку короче: один операционный центр, проверенный локальный автопарк и понятная ответственность.',
          typicalTitle: 'Обычная цепочка:',
          riderraTitle: 'Как работает Riderra:',
          typicalSteps: ['Клиент', 'Тревел-платформа', 'Трансферный агрегатор', 'Локальный посредник', 'Автопарк', 'Водитель'],
          riderraSteps: ['Турагент / AI-агент / бизнес-клиент', 'Операционный центр Riderra', 'Проверенный локальный автопарк', 'Водитель']
        },
        en: {
          title: 'Fewer commercial layers. Clearer responsibility.',
          text: 'Many international transfer bookings pass through several commercial layers before reaching the local fleet. Riderra keeps the chain shorter: one managed operation, verified local fleet execution, and clear responsibility.',
          typicalTitle: 'Typical transfer chain:',
          riderraTitle: 'Riderra way:',
          typicalSteps: ['Client', 'Travel platform', 'Transfer aggregator', 'Local reseller', 'Fleet', 'Driver'],
          riderraSteps: ['Tour agency / AI agent / business client', 'Riderra managed transfer desk', 'Verified local fleet', 'Driver']
        }
      }
    };
  },
  computed: {
    layersData() {
      const lang = this.$store.state.language;
      const dict = this.dictionaries[lang] || this.dictionaries.en;
      return {
        title: dict.title,
        text: dict.text,
        typicalTitle: dict.typicalTitle,
        riderraTitle: dict.riderraTitle,
        typicalSteps: dict.typicalSteps,
        riderraSteps: dict.riderraSteps
      };
    }
  }
}
</script>

<style scoped lang="scss">
.layers-section {
  padding: 80px 0;
  background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);

  .layers-content {
    max-width: 1200px;
    margin: 0 auto;

    .layers-title {
      font-size: 36px;
      font-weight: 800;
      color: #17233d;
      text-align: center;
      margin-bottom: 32px;
    }

    .layers-text {
      font-size: 18px;
      color: #4a5568;
      text-align: center;
      max-width: 800px;
      margin: 0 auto 48px;
      line-height: 1.6;
    }

    .layers-comparison {
      display: grid;
      grid-template-columns: 1fr;
      gap: 24px;

      .layer-block {
        background: #fff;
        border-radius: 12px;
        padding: 24px;
        border: 1px solid #e2e8f0;

        &__title {
          font-size: 18px;
          font-weight: 700;
          color: #17233d;
          margin-bottom: 16px;
        }

        .layer-chain {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
          gap: 12px;
          font-size: 13px;
          color: #4a5568;

          .layer-segment {
            display: inline-flex;
            align-items: center;
            gap: 12px;
            min-width: 0;
          }

          .layer-step {
            background: #e2e8f0;
            padding: 8px 16px;
            border-radius: 8px;
            font-weight: 600;
            max-width: 100%;
            overflow-wrap: anywhere;
          }

          .layer-arrow {
            color: #94a3b8;
            flex: 0 0 auto;
          }
        }
      }
    }
  }
}

@media (max-width: 767px) {
  .layers-section {
    padding: 40px 0;

    .layers-content {
      .layers-title {
        font-size: 28px;
      }

      .layers-text {
        font-size: 16px;
      }

      .layers-comparison {
        grid-template-columns: 1fr;
        gap: 24px;
      }

      .layer-block {
        padding: 20px;

        .layer-chain {
          align-items: stretch;
          flex-direction: column;

          .layer-segment {
            align-items: stretch;
            flex-direction: column;
          }

          .layer-step {
            text-align: center;
          }

          .layer-arrow {
            transform: rotate(90deg);
          }
        }
      }
    }
  }
}
</style>
