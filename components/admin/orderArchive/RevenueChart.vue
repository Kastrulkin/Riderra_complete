<template>
  <section class="chart-card">
    <div class="chart-card__head">
      <div>
        <h3>Выручка по времени, EUR</h3>
        <p>Все валюты приведены к евро по аналитическому курсу.</p>
      </div>
    </div>
    <svg class="chart" viewBox="0 0 760 260" preserveAspectRatio="none" role="img" aria-label="Выручка по времени в евро">
      <g class="chart-y-axis">
        <g v-for="tick in yTicks" :key="tick.value">
          <line :x1="chartLeft" :y1="tick.y" :x2="chartRight" :y2="tick.y" stroke="#edf2f7" />
          <text :x="chartLeft - 10" :y="tick.y + 3" text-anchor="end" fill="#64748b" font-size="10">{{ tick.label }}</text>
        </g>
      </g>
      <line :x1="chartLeft" :y1="chartBottom" :x2="chartRight" :y2="chartBottom" stroke="#dbe3ef" />
      <line :x1="chartLeft" :y1="chartTop" :x2="chartLeft" :y2="chartBottom" stroke="#dbe3ef" />
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
  data: () => ({
    chartLeft: 72,
    chartRight: 736,
    chartTop: 44,
    chartBottom: 216
  }),
  computed: {
    values () {
      return this.months.map((m) => archiveUtils.totalEur(m.grossByCurrency))
    },
    maxValue () {
      return Math.max(...this.values, 1)
    },
    chartMax () {
      return this.niceMax(this.maxValue)
    },
    chartHeight () {
      return this.chartBottom - this.chartTop
    },
    chartWidth () {
      return this.chartRight - this.chartLeft
    },
    yTicks () {
      const steps = 4
      return Array.from({ length: steps + 1 }, (_, index) => {
        const ratio = index / steps
        const value = this.chartMax * (1 - ratio)
        return {
          value: Number(value.toFixed(2)),
          label: this.formatAxisValue(value),
          y: Number((this.chartTop + (ratio * this.chartHeight)).toFixed(2))
        }
      })
    },
    axisLabels () {
      const count = Math.max(this.months.length - 1, 1)
      return this.months.map((month, index) => ({
        x: this.chartLeft + (index * (this.chartWidth / count)),
        label: String(month.monthLabel || '').slice(2)
      }))
    }
  },
  methods: {
    niceMax (value) {
      const raw = Math.max(Number(value || 0), 1)
      const power = Math.pow(10, Math.floor(Math.log10(raw)))
      const fraction = raw / power
      const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10
      return niceFraction * power
    },
    formatAxisValue (value) {
      const number = Number(value || 0)
      if (number >= 1000000) return `${Number((number / 1000000).toFixed(1))}M`
      if (number >= 1000) return `${Number((number / 1000).toFixed(1))}k`
      return String(Math.round(number))
    },
    linePoints (values) {
      const count = Math.max(this.months.length - 1, 1)
      return values.map((value, index) => {
        const x = this.chartLeft + (index * (this.chartWidth / count))
        const y = this.chartBottom - ((Number(value || 0) / this.chartMax) * this.chartHeight)
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
