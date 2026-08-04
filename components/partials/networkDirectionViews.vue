<template>
  <nav class="network-view-switch" :aria-label="t.label">
    <nuxt-link to="/admin-directions-matrix" class="network-view-switch__item" active-class="network-view-switch__item--active" exact>
      <strong>{{ t.coverage }}</strong>
      <small>{{ t.coverageHint }}</small>
    </nuxt-link>
    <nuxt-link to="/admin-city-routes" class="network-view-switch__item" active-class="network-view-switch__item--active">
      <strong>{{ t.routes }}</strong>
      <small>{{ t.routesHint }}</small>
    </nuxt-link>
  </nav>
</template>

<script>
export default {
  computed: {
    t () {
      return this.$store.state.language === 'ru'
        ? {
            label: 'Режим раздела направлений',
            coverage: 'Покрытие',
            coverageHint: 'Заказчики и исполнители',
            routes: 'Маршруты',
            routesHint: 'Откуда, куда и тариф'
          }
        : {
            label: 'Directions section view',
            coverage: 'Coverage',
            coverageHint: 'Clients and suppliers',
            routes: 'Routes',
            routesHint: 'Pickup, destination and fare'
          }
    }
  }
}
</script>

<style scoped>
.network-view-switch {
  display: inline-grid;
  grid-template-columns: repeat(2, minmax(180px, 1fr));
  gap: 6px;
  margin: 0 0 18px;
  padding: 5px;
  border: 1px solid #d8e0ef;
  border-radius: 14px;
  background: #f7f9fc;
}

.network-view-switch__item {
  display: grid;
  gap: 2px;
  padding: 9px 13px;
  border-radius: 10px;
  color: #52627b;
  text-decoration: none;
}

.network-view-switch__item strong { color: #17233d; }
.network-view-switch__item small { font-size: 11px; }

.network-view-switch__item--active {
  background: #fff;
  box-shadow: 0 6px 18px rgba(23, 35, 61, 0.08);
}

@media (max-width: 560px) {
  .network-view-switch { display: grid; grid-template-columns: 1fr; width: 100%; }
}
</style>
