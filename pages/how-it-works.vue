<template>
  <div>
    <div class="page-background">
      <div class="page-background__gradient"></div>
      <div class="page-background__overlay"></div>
    </div>
    <section class="site-section site-section--pf how-it-works-section">
      <div class="container">
        <!-- Hero -->
        <div class="how-hero">
          <h1>{{ t.heroTitle }}</h1>
        </div>

        <!-- Content -->
        <div class="how-content">
          <h2>{{ t.subtitle }}</h2>
          
          <div class="transfer-chains">
            <!-- Typical Chain -->
            <div class="chain-box">
              <h3>{{ t.typicalTitle }}</h3>
              <ol class="chain-list">
                <li>{{ t.typical1 }}</li>
                <li>{{ t.typical2 }}</li>
                <li>{{ t.typical3 }}</li>
                <li>{{ t.typical4 }}</li>
                <li>{{ t.typical5 }}</li>
                <li>{{ t.typical6 }}</li>
              </ol>
            </div>

            <!-- Riderra Chain -->
            <div class="chain-box riderra-chain">
              <h3>{{ t.riderraTitle }}</h3>
              <ol class="chain-list">
                <li>{{ t.riderra1 }}</li>
                <li>{{ t.riderra2 }}</li>
                <li>{{ t.riderra3 }}</li>
                <li>{{ t.riderra4 }}</li>
              </ol>
            </div>
          </div>
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
          heroTitle: 'Меньше слоев. Ясная ответственность.',
          subtitle: 'Сравните две цепочки:',
          typicalTitle: 'Типичная цепочка перевозок',
          typical1: 'Клиент',
          typical2: 'Платформа для путешествий',
          typical3: 'Агрегатор перевозок',
          typical4: 'Локальный реселлер',
          typical5: 'Автопарк',
          typical6: 'Водитель',
          riderraTitle: 'Riderra',
          riderra1: 'Планировщик путешествий / AI-агент / бизнес-клиент',
          riderra2: 'Управляемый деск перевозок Riderra',
          riderra3: 'Проверенный локальный автопарк',
          riderra4: 'Водитель'
        },
        en: {
          heroTitle: 'Fewer layers. Clearer responsibility.',
          subtitle: 'Compare two chains:',
          typicalTitle: 'Typical transfer chain',
          typical1: 'Client',
          typical2: 'Travel platform',
          typical3: 'Transfer aggregator',
          typical4: 'Local reseller',
          typical5: 'Fleet',
          typical6: 'Driver',
          riderraTitle: 'Riderra way',
          riderra1: 'Travel planner / AI agent / business client',
          riderra2: 'Riderra managed transfer desk',
          riderra3: 'Verified local fleet',
          riderra4: 'Driver'
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
.how-it-works-section {
  padding-top: 100px;
  padding-bottom: 80px;

  .how-hero {
    text-align: center;
    margin-bottom: 60px;

    h1 {
      font-size: 42px;
      font-weight: 800;
      color: #17233d;
      margin-bottom: 20px;
    }
  }

  .how-content {
    max-width: 1000px;
    margin: 0 auto;

    h2 {
      font-size: 24px;
      font-weight: 700;
      color: #17233d;
      margin-bottom: 40px;
      text-align: center;
    }
  }

  .transfer-chains {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 32px;

    .chain-box {
      background: #f7fafc;
      border-radius: 12px;
      padding: 32px;
      border: 1px solid #e2e8f0;

      h3 {
        font-size: 20px;
        font-weight: 700;
        color: #1a237e;
        margin-bottom: 20px;
      }
    }

    .riderra-chain {
      border: 2px solid #1a237e;
    }
  }

  .chain-list {
    padding-left: 24px;

    li {
      margin-bottom: 12px;
      font-size: 16px;
      color: #4a5568;
      line-height: 1.5;
    }
  }
}

@media (max-width: 767px) {
  .how-it-works-section {
    padding-top: 60px;
    padding-bottom: 40px;

    .how-hero {
      h1 {
        font-size: 28px;
      }
    }

    .transfer-chains {
      grid-template-columns: 1fr;
      gap: 20px;
    }

    .chain-box {
      padding: 20px;
    }

    .chain-list {
      li {
        font-size: 14px;
      }
    }
  }
}
</style>
