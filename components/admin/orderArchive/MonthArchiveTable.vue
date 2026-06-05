<template>
  <section class="archive-table-card">
    <div class="archive-table-card__head">
      <div>
        <h3>Месяцы архива</h3>
        <p>Компактный список с быстрыми действиями.</p>
      </div>
      <button class="btn btn--small" type="button" @click="collapsed = !collapsed">
        {{ collapsed ? 'Показать' : 'Свернуть' }}
      </button>
    </div>
    <div v-if="!collapsed" class="archive-table">
      <div v-for="group in groupedRows" :key="group.year" class="year-group">
        <button type="button" class="year-group__head" @click="toggleYear(group.year)">
          <strong>{{ group.year }}</strong>
          <span>{{ group.rows.length }} мес.</span>
        </button>
        <div v-if="!closedYears[group.year]">
          <div v-for="month in group.rows" :key="month.monthLabel" class="month-row" role="button" tabindex="0" @click="openMonth(month)" @keyup.enter="openMonth(month)">
            <div>
              <strong>{{ month.displayName || month.monthLabel }}</strong>
              <span>{{ month.monthLabel }} · {{ month.sourceSheetId || 'sheet id не указан' }}</span>
            </div>
            <div>
              <strong>{{ month.total || 0 }}</strong>
              <span>{{ month.completed || 0 }} вып. · {{ month.cancelled || 0 }} отмен</span>
            </div>
            <div>
              <strong>{{ eur(month.grossByCurrency) }}</strong>
              <span>{{ month.complaints || 0 }} жалоб · {{ month.issueCount || 0 }} рисков</span>
            </div>
            <div class="month-row__actions">
              <a class="icon-action" :href="monthUrl(month)" title="Открыть дашборд месяца" @click.stop>↗</a>
              <a class="icon-action" :href="monthUrl(month, { tab: 'trips' })" title="Открыть поездки" @click.stop>≡</a>
              <a class="icon-action" :href="analyticsUrl(month)" title="Открыть аналитику" @click.stop>⌁</a>
              <a v-if="month.sourceSheetUrl" class="icon-action" :href="month.sourceSheetUrl" target="_blank" rel="noopener" title="Открыть Google Sheet" @click.stop>G</a>
            </div>
          </div>
        </div>
      </div>
      <div v-if="!rows.length" class="empty-state">Архивных месяцев не найдено</div>
    </div>
  </section>
</template>

<script>
const archiveUtils = require('~/utils/orderArchiveDashboard')

export default {
  props: {
    rows: { type: Array, default: () => [] }
  },
  data: () => ({
    collapsed: false,
    closedYears: {}
  }),
  computed: {
    groupedRows () {
      const groups = new Map()
      for (const row of this.rows) {
        const year = String(row.monthLabel || '').slice(0, 4) || 'Без года'
        if (!groups.has(year)) groups.set(year, [])
        groups.get(year).push(row)
      }
      return [...groups.entries()]
        .map(([year, rows]) => ({ year, rows }))
        .sort((a, b) => b.year.localeCompare(a.year))
    }
  },
  methods: {
    eur (value) {
      return archiveUtils.formatEur(archiveUtils.totalEur(value))
    },
    monthLabel (month) {
      return String(month?.monthLabel || '').trim()
    },
    monthUrl (month, query = {}) {
      const monthLabel = this.monthLabel(month)
      if (!monthLabel) return '#'
      const params = new URLSearchParams(query)
      const queryString = params.toString()
      return `/admin-order-archive/${encodeURIComponent(monthLabel)}${queryString ? `?${queryString}` : ''}`
    },
    analyticsUrl (month) {
      const monthLabel = this.monthLabel(month)
      if (!monthLabel) return '#'
      const params = new URLSearchParams({ fromMonth: monthLabel, toMonth: monthLabel })
      return `/admin-order-analytics?${params.toString()}`
    },
    navigateToMonth (monthLabel, query = {}) {
      if (!monthLabel) return
      const target = { path: `/admin-order-archive/${encodeURIComponent(monthLabel)}`, query }
      if (this.$router) this.$router.push(target).catch(() => {})
    },
    openMonth (month) {
      const monthLabel = this.monthLabel(month)
      if (!monthLabel) return
      this.navigateToMonth(monthLabel)
    },
    openTrips (month) {
      const monthLabel = this.monthLabel(month)
      if (!monthLabel) return
      this.navigateToMonth(monthLabel, { tab: 'trips' })
    },
    openAnalytics (month) {
      const monthLabel = this.monthLabel(month)
      if (!monthLabel) return
      if (this.$router) {
        this.$router.push({
          path: '/admin-order-analytics',
          query: { fromMonth: monthLabel, toMonth: monthLabel }
        }).catch(() => {})
      }
    },
    toggleYear (year) {
      this.$set(this.closedYears, year, !this.closedYears[year])
    }
  }
}
</script>

<style scoped>
.archive-table-card {
  border: 1px solid #dbe3ef;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 12px 24px rgba(15, 23, 42, .045);
}
.archive-table-card__head {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  padding: 16px;
  border-bottom: 1px solid #eef2f7;
}
.archive-table-card h3 {
  margin: 0;
  color: #17233d;
  font-size: 16px;
}
.archive-table-card p {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 12px;
}
.year-group__head {
  display: flex;
  justify-content: space-between;
  width: 100%;
  padding: 12px 16px;
  border: 0;
  border-top: 1px solid #eef2f7;
  background: #f8fafc;
  color: #17233d;
  cursor: pointer;
}
.month-row {
  display: grid;
  grid-template-columns: minmax(220px, 1.3fr) minmax(150px, .8fr) minmax(220px, 1.1fr) minmax(170px, .8fr);
  gap: 14px;
  align-items: center;
  padding: 14px 16px;
  border-top: 1px solid #eef2f7;
  cursor: pointer;
}
.month-row:hover { background: #f8fbff; }
.month-row strong {
  display: block;
  color: #17233d;
}
.month-row span {
  display: block;
  margin-top: 4px;
  color: #64748b;
  font-size: 12px;
}
.month-row__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.icon-action {
  display: inline-grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 1px solid #dbe3ef;
  border-radius: 8px;
  background: #fff;
  color: #17233d;
  font-weight: 900;
  text-decoration: none;
  cursor: pointer;
}
.icon-action:hover,
.icon-action:focus {
  border-color: #9db5d8;
  outline: none;
  background: #f8fbff;
}
.empty-state {
  padding: 16px;
  color: #64748b;
}
@media (max-width: 860px) {
  .month-row { grid-template-columns: 1fr; }
  .month-row__actions { justify-content: flex-start; }
}
</style>
