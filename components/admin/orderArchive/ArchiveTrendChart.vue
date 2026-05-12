<template>
  <section class="chart-card">
    <div class="chart-card__head">
      <div>
        <h3>{{ title }}</h3>
        <p>{{ subtitle }}</p>
      </div>
    </div>
    <svg class="chart" viewBox="0 0 720 260" preserveAspectRatio="none" role="img" :aria-label="title">
      <line x1="36" y1="216" x2="700" y2="216" stroke="#e2e8f0" />
      <line x1="36" y1="44" x2="36" y2="216" stroke="#e2e8f0" />
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
  computed: {
    primaryValues () { return this.months.map((m) => Number(m[this.primaryKey] || 0)) },
    secondaryValues () { return this.months.map((m) => Number(m[this.secondaryKey] || 0)) },
    maxValue () {
      return Math.max(...this.primaryValues, ...this.secondaryValues, 1)
    }
  },
  methods: {
    valuePoint (value, index) {
      const count = Math.max(this.months.length - 1, 1)
      const x = 36 + (index * (664 / count))
      const y = 216 - ((Number(value || 0) / this.maxValue) * 172)
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
