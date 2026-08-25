<template>
  <div>
    <div class="page-background">
      <div class="page-background__gradient"></div>
      <div class="page-background__overlay"></div>
    </div>
    <section class="site-section site-section--pf contact-section">
      <div class="container">
        <!-- Hero -->
        <div class="contact-hero">
          <h1>{{ t.heroTitle }}</h1>
          <p class="hero-subtitle">{{ t.heroSubtitle }}</p>
        </div>

        <!-- Contact Info -->
        <div class="contact-info">
          <p>{{ t.infoText }}</p>
        </div>

        <!-- CTA -->
        <div class="contact-cta">
          <h2>{{ t.ctaTitle }}</h2>
          <a href="/#booking-widget" class="btn btn--primary">{{ t.cta }}</a>
        </div>

        <!-- Support Placeholder -->
        <div class="contact-support">
          <h3>{{ t.supportTitle }}</h3>
          <p>{{ t.supportText }}</p>
          <a href="mailto:info@riderra.com" class="btn btn--secondary">info@riderra.com</a>
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
          heroTitle: 'Свяжитесь с нами',
          heroSubtitle: 'Мы готовы помочь с вашими перевозками и ответить на вопросы',
          infoText: 'Если у вас есть вопросы о наших услугах, бронировании или вам нужна помощь в организации перевозки, свяжитесь с нами.',
          ctaTitle: 'Нужна перевозка?',
          cta: 'Создать запрос перевозки',
          supportTitle: 'Поддержка',
          supportText: 'Наша команда поддержки готова помочь с любыми вопросами. Свяжитесь с нами по электронной почте.'
        },
        en: {
          heroTitle: 'Contact Us',
          heroSubtitle: 'We are ready to help with your transfers and answer questions',
          infoText: 'If you have questions about our services, bookings, or need assistance with organizing a transfer, contact us.',
          ctaTitle: 'Need a transfer?',
          cta: 'Create transfer request',
          supportTitle: 'Support',
          supportText: 'Our support team is ready to assist with any questions. Contact us by email.'
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
.contact-section {
  padding-top: 100px;
  padding-bottom: 80px;

  .contact-hero {
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

  .contact-info {
    max-width: 700px;
    margin: 0 auto 60px;

    p {
      font-size: 16px;
      color: #4a5568;
      line-height: 1.6;
      text-align: center;
    }
  }

  .contact-cta {
    text-align: center;
    margin-bottom: 60px;

    h2 {
      font-size: 28px;
      font-weight: 700;
      color: #17233d;
      margin-bottom: 20px;
    }
  }

  .contact-support {
    text-align: center;
    background: #f7fafc;
    padding: 40px;
    border-radius: 8px;
    border: 1px solid #e2e8f0;

    h3 {
      font-size: 24px;
      font-weight: 700;
      color: #1a237e;
      margin-bottom: 12px;
    }

    p {
      font-size: 16px;
      color: #4a5568;
      margin-bottom: 20px;
    }

    .btn--secondary {
      background: transparent;
      border: 2px solid #1a237e;
      color: #1a237e;
      padding: 12px 32px;
      font-weight: 700;

      &:hover {
        background: #1a237e;
        color: #fff;
      }
    }
  }
}

@media (max-width: 767px) {
  .contact-section {
    padding-top: 60px;
    padding-bottom: 40px;

    .contact-hero {
      h1 {
        font-size: 28px;
      }
    }

    .contact-support {
      padding: 24px;
    }
  }
}
</style>
