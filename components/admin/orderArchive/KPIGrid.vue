<template>
  <div class="kpi-grid">
    <button
      v-for="card in cards"
      :key="card.key"
      class="kpi-card"
      type="button"
      :title="card.description"
      @click="$emit('select', card)"
    >
      <span class="kpi-card__label">{{ card.label }}</span>
      <strong>{{ card.value }}</strong>
      <span class="kpi-card__delta" :class="deltaClass(card.delta)">
        {{ deltaText(card.delta) }}
      </span>
      <svg class="kpi-card__spark" viewBox="0 0 120 28" preserveAspectRatio="none" aria-hidden="true">
        <polyline :points="sparkPoints(card.sparkline)" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
  </div>
</template>

<script>
export default {
  props: {
    cards: { type: Array, default: () => [] }
  },
  methods: {
    deltaText (value) {
      if (value === null || value === undefined) return 'новый период'
      const number = Number(value || 0)
      if (!number) return 'без изменений'
      return `${number > 0 ? '+' : ''}${Math.round(number * 100)}%`
    },
    deltaClass (value) {
      const number = Number(value || 0)
      return {
        'kpi-card__delta--up': number > 0,
        'kpi-card__delta--down': number < 0
      }
    },
    sparkPoints (values = []) {
      const series = values.length ? values.map((v) => Number(v || 0)) : [0, 0]
      const max = Math.max(...series, 1)
      const step = 120 / Math.max(series.length - 1, 1)
      return series.map((value, index) => `${Number((index * step).toFixed(2))},${Number((26 - (value / max) * 22).toFixed(2))}`).join(' ')
    }
  }
}
</script>

<style scoped>
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}
.kpi-card {
  display: grid;
  gap: 7px;
  min-height: 138px;
  padding: 16px;
  border: 1px solid #dbe3ef;
  border-radius: 8px;
  background: #fff;
  color: #17233d;
  text-align: left;
  cursor: pointer;
  box-shadow: 0 12px 24px rgba(15, 23, 42, .045);
}
.kpi-card:hover,
.kpi-card:focus {
  border-color: #9db5d8;
  outline: none;
  box-shadow: 0 16px 32px rgba(15, 23, 42, .08);
}
.kpi-card__label {
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
}
.kpi-card strong {
  font-size: 25px;
  line-height: 1.15;
}
.kpi-card__delta {
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
}
.kpi-card__delta--up { color: #047857; }
.kpi-card__delta--down { color: #b91c1c; }
.kpi-card__spark {
  align-self: end;
  width: 100%;
  height: 28px;
  color: #315c9d;
  opacity: .8;
}
@media (max-width: 1180px) {
  .kpi-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
@media (max-width: 760px) {
  .kpi-grid { grid-template-columns: 1fr; }
}
</style>
