<template>
  <div v-if="entity" class="drawer-backdrop" @click.self="$emit('close')">
    <aside class="drawer" role="dialog" aria-modal="true" :aria-label="entity.name">
      <button class="drawer__close" type="button" aria-label="Закрыть" @click="$emit('close')">×</button>
      <p class="drawer__eyebrow">{{ typeLabel }}</p>
      <h3>{{ entity.name }}</h3>
      <div class="drawer-metrics">
        <div><strong>{{ entity.total || 0 }}</strong><span>поездок</span></div>
        <div><strong>{{ entity.completed || 0 }}</strong><span>выполнено</span></div>
        <div><strong>{{ entity.incidentCount || 0 }}</strong><span>инцидентов</span></div>
        <div><strong>{{ eur(entity.grossByCurrency) }}</strong><span>выручка EUR</span></div>
      </div>
      <div class="drawer-links">
        <button class="btn btn--primary" type="button" @click="$emit('filter-trips', entity)">Показать связанные поездки</button>
        <button class="btn" type="button" @click="$emit('close')">Закрыть</button>
      </div>
      <p class="drawer-note">Детализация по конкретным поездкам откроется фильтром в месячном архиве, когда выбран месяц.</p>
    </aside>
  </div>
</template>

<script>
const archiveUtils = require('~/utils/orderArchiveDashboard')

export default {
  props: {
    entity: { type: Object, default: null },
    type: { type: String, default: 'client' }
  },
  computed: {
    typeLabel () {
      return this.type === 'driver' ? 'Исполнитель' : 'Заказчик'
    }
  },
  methods: {
    eur (value) {
      return archiveUtils.formatEur(archiveUtils.totalEur(value))
    }
  }
}
</script>

<style scoped>
.drawer-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(15, 23, 42, .28);
  display: flex;
  justify-content: flex-end;
}
.drawer {
  position: relative;
  width: min(440px, 100vw);
  height: 100%;
  padding: 26px;
  background: #fff;
  box-shadow: -20px 0 48px rgba(15, 23, 42, .18);
  overflow: auto;
}
.drawer__close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 34px;
  height: 34px;
  border: 1px solid #dbe3ef;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  font-size: 24px;
  line-height: 1;
}
.drawer__eyebrow {
  margin: 0 0 8px;
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
}
.drawer h3 {
  margin: 0 42px 18px 0;
  color: #17233d;
  font-size: 24px;
}
.drawer-metrics {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.drawer-metrics div {
  padding: 12px;
  border: 1px solid #dbe3ef;
  border-radius: 8px;
  background: #f8fafc;
}
.drawer-metrics strong {
  display: block;
  color: #17233d;
  font-size: 18px;
}
.drawer-metrics span,
.drawer-note {
  display: block;
  margin-top: 5px;
  color: #64748b;
  font-size: 12px;
}
.drawer-links {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 18px;
}
</style>
