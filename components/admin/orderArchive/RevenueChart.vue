<template>
  <section class="chart-card">
    <div class="chart-card__head">
      <div>
        <h3>Выручка по времени, EUR</h3>
        <p>Все валюты приведены к евро по аналитическому курсу.</p>
      </div>
    </div>
    <svg class="chart" viewBox="0 0 720 260" preserveAspectRatio="none" role="img" aria-label="Выручка по времени в евро">
      <line x1="36" y1="216" x2="700" y2="216" stroke="#e2e8f0" />
      <line x1="36" y1="44" x2="36" y2="216" stroke="#e2e8f0" />
      <polyline :points="linePoints(values)" fill="none" stroke="#047857" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
      <text v-for="month in axisLabels" :key="month.x" :x="month.x" y="238" text-anchor="middle" fill="#64748b" font-size="10">{{ month.label }}</text>
    </svg>
    <div class="chart-card__legend">
      <span><i class="legend-dot"></i>EUR</span>
    </div>
  </section>
</template>

<script>
const archiveUtils = require('~/utils/orderArchiveDashboard')

export default {
  props: {
    months: { type: Array, default: () => [] }
  },
  computed: {
    values () {
      return this.months.map((m) => archiveUtils.totalEur(m.grossByCurrency))
    },
    maxValue () {
      return Math.max(...this.values, 1)
    },
    axisLabels () {
      const count = Math.max(this.months.length - 1, 1)
      return this.months.map((month, index) => ({
        x: 36 + (index * (664 / count)),
        label: String(month.monthLabel || '').slice(2)
      }))
    }
  },
  methods: {
    linePoints (values) {
      const count = Math.max(this.months.length - 1, 1)
      return values.map((value, index) => {
        const x = 36 + (index * (664 / count))
        const y = 216 - ((Number(value || 0) / this.maxValue) * 172)
        return `${Number(x.toFixed(2))},${Number(y.toFixed(2))}`
      }).join(' ')
    }
  }
}
</script>

<style scoped>
.chart-card {
  min-width: 0;
  border: 1px solid #dbe3ef;
  border-radius: 8px;
  background: #fff;
  padding: 16px;
  box-shadow: 0 12px 24px rgba(15, 23, 42, .045);
}
.chart-card h3 {
  margin: 0;
  color: #17233d;
  font-size: 16px;
}
.chart-card p {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 12px;
}
.chart {
  width: 100%;
  height: 260px;
  margin-top: 10px;
}
.chart-card__legend {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
}
.legend-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  margin-right: 6px;
  border-radius: 99px;
  background: #047857;
}
</style>
