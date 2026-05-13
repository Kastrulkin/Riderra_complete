<template>
  <section class="chart-card">
    <div class="chart-card__head">
      <div>
        <h3>{{ title }}</h3>
        <p>{{ subtitle }}</p>
      </div>
    </div>
    <svg class="chart" viewBox="0 0 760 260" preserveAspectRatio="none" role="img" :aria-label="title">
      <g class="chart-y-axis">
        <g v-for="tick in yTicks" :key="tick.value">
          <line :x1="chartLeft" :y1="tick.y" :x2="chartRight" :y2="tick.y" stroke="#edf2f7" />
          <text :x="chartLeft - 10" :y="tick.y + 3" text-anchor="end" fill="#64748b" font-size="10">{{ tick.label }}</text>
        </g>
      </g>
      <line :x1="chartLeft" :y1="chartBottom" :x2="chartRight" :y2="chartBottom" stroke="#dbe3ef" />
      <line :x1="chartLeft" :y1="chartTop" :x2="chartLeft" :y2="chartBottom" stroke="#dbe3ef" />
      <polyline :points="linePoints(primaryValues)" fill="none" stroke="#2457a6" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
      <polyline v-if="secondaryKey" :points="linePoints(secondaryValues)" fill="none" stroke="#c2410c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
      <g v-for="point in points(primaryValues)" :key="point.label">
        <circle class="chart-hit" :cx="point.x" :cy="point.y" r="6" fill="#2457a6" tabindex="0" @click="$emit('month', point.month)" @keyup.enter="$emit('month', point.month)" />
        <text :x="point.x" y="238" text-anchor="middle" fill="#64748b" font-size="10">{{ point.label }}</text>
      </g>
    </svg>
    <div class="chart-card__legend">
      <span><i class="legend-dot legend-dot--primary"></i>{{ primaryLabel }}</span>
      <span v-if="secondaryKey"><i class="legend-dot legend-dot--secondary"></i>{{ secondaryLabel }}</span>
    </div>
  </section>
</template>

<script>
export default {
  props: {
    title: { type: String, required: true },
    subtitle: { type: String, default: '' },
    months: { type: Array, default: () => [] },
    primaryKey: { type: String, default: 'total' },
    primaryLabel: { type: String, default: 'Значение' },
    secondaryKey: { type: String, default: '' },
    secondaryLabel: { type: String, default: '' }
  },
  data: () => ({
    chartLeft: 72,
    chartRight: 736,
    chartTop: 44,
    chartBottom: 216
  }),
  computed: {
    primaryValues () { return this.months.map((m) => Number(m[this.primaryKey] || 0)) },
    secondaryValues () { return this.months.map((m) => Number(m[this.secondaryKey] || 0)) },
    maxValue () {
      return Math.max(...this.primaryValues, ...this.secondaryValues, 1)
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
    valuePoint (value, index) {
      const count = Math.max(this.months.length - 1, 1)
      const x = this.chartLeft + (index * (this.chartWidth / count))
      const y = this.chartBottom - ((Number(value || 0) / this.chartMax) * this.chartHeight)
      return { x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) }
    },
    linePoints (values) {
      return values.map((value, index) => {
        const point = this.valuePoint(value, index)
        return `${point.x},${point.y}`
      }).join(' ')
    },
    points (values) {
      return values.map((value, index) => {
        const point = this.valuePoint(value, index)
        const month = this.months[index] || {}
        return {
          ...point,
          month,
          label: String(month.monthLabel || '').slice(2)
        }
      })
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
.chart-card__head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
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
.chart-hit {
  cursor: pointer;
}
.chart-card__legend {
  display: flex;
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
}
.legend-dot--primary { background: #2457a6; }
.legend-dot--secondary { background: #c2410c; }
</style>
