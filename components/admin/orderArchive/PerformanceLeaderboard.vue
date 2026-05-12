<template>
  <section class="leader-card">
    <div class="leader-card__head">
      <div>
        <h3>{{ title }}</h3>
        <p>{{ hint }}</p>
      </div>
      <div v-if="toggle" class="leader-toggle" role="group" aria-label="Режим рейтинга">
        <button type="button" :class="{ active: mode === 'absolute' }" @click="$emit('mode', 'absolute')">Абс.</button>
        <button type="button" :class="{ active: mode === 'rate' }" @click="$emit('mode', 'rate')">%</button>
      </div>
    </div>
    <div class="leader-table">
      <button
        v-for="row in rows"
        :key="row.name"
        type="button"
        class="leader-row"
        @click="$emit('select', row)"
      >
        <span class="leader-row__name">{{ row.name }}</span>
        <span><strong>{{ row.completed || 0 }}</strong><small>вып.</small></span>
        <span><strong>{{ eur(row.grossByCurrency) }}</strong><small>выручка EUR</small></span>
        <span><strong>{{ qualityValue(row) }}</strong><small>{{ problem ? 'инциденты' : 'качество' }}</small></span>
      </button>
      <div v-if="!rows.length" class="empty-state">Нет данных для рейтинга</div>
    </div>
  </section>
</template>

<script>
const archiveUtils = require('~/utils/orderArchiveDashboard')

export default {
  props: {
    title: { type: String, required: true },
    hint: { type: String, default: '' },
    rows: { type: Array, default: () => [] },
    mode: { type: String, default: 'absolute' },
    problem: { type: Boolean, default: false },
    toggle: { type: Boolean, default: false }
  },
  methods: {
    eur (value) {
      return archiveUtils.formatEur(archiveUtils.totalEur(value))
    },
    qualityValue (row) {
      if (this.problem) return row.incidentCount || 0
      return archiveUtils.formatRate(row.completedRate)
    }
  }
}
</script>

<style scoped>
.leader-card {
  min-width: 0;
  border: 1px solid #dbe3ef;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 12px 24px rgba(15, 23, 42, .045);
}
.leader-card__head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid #eef2f7;
}
.leader-card h3 {
  margin: 0;
  color: #17233d;
  font-size: 16px;
}
.leader-card p {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 12px;
}
.leader-toggle {
  display: inline-flex;
  align-self: flex-start;
  padding: 3px;
  border: 1px solid #dbe3ef;
  border-radius: 8px;
  background: #f8fafc;
}
.leader-toggle button {
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #64748b;
  font-weight: 800;
  cursor: pointer;
  padding: 6px 9px;
}
.leader-toggle button.active {
  background: #17233d;
  color: #fff;
}
.leader-table {
  display: grid;
}
.leader-row {
  display: grid;
  grid-template-columns: minmax(180px, 1.4fr) minmax(80px, .55fr) minmax(150px, 1fr) minmax(90px, .65fr);
  gap: 12px;
  align-items: center;
  width: 100%;
  padding: 13px 16px;
  border: 0;
  border-bottom: 1px solid #eef2f7;
  background: #fff;
  color: #17233d;
  text-align: left;
  cursor: pointer;
}
.leader-row:hover,
.leader-row:focus {
  outline: none;
  background: #f8fbff;
}
.leader-row__name {
  font-weight: 800;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.leader-row strong {
  display: block;
  font-size: 13px;
}
.leader-row small {
  display: block;
  margin-top: 3px;
  color: #64748b;
  font-size: 11px;
}
.empty-state {
  padding: 16px;
  color: #64748b;
}
@media (max-width: 680px) {
  .leader-row { grid-template-columns: 1fr 1fr; }
}
</style>
