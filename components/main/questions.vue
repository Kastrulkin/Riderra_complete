<template>
  <section class="site-section site-section--sm">
    <div class="container questions">
      <div class="row">
        <div class="col-sm-6 col-xs-12">
          <h2 class="h2">
            Остались вопросы?
          </h2>
        </div>
        <div class="col-sm-6 col-xs-12">
          <p>Возникли проблемы? Служба поддержки и автопарк работают 24/7. Позвоните на горячую линию и мы поможем вам в
            любое время.
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
  .questions {
    padding-top: 50px;
    margin-bottom: 120px;

    .h2 {
      margin-bottom: 30px;
    }
  }

  @media (max-width: 1024px) {

    .questions{
      margin-bottom: 95px;
    }
  }

  @media (max-width: 767px) {
    .questions {
      margin-bottom: 45px;

      p {
        font-size: 13px;
      }
    }
  }
</style>
