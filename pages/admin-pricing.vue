<template>
  <div>
    <navigation></navigation>
    <div class="page-background"><div class="page-background__gradient"></div><div class="page-background__overlay"></div></div>
    <section class="site-section site-section--pf admin-section">
      <div class="container">
        <h1 class="h2">{{ t.title }}</h1>
        <admin-tabs />

        <div class="subtabs">
          <button class="btn btn--small" :class="{active: tab==='base'}" @click="tab='base'">{{ t.base }}</button>
          <button class="btn btn--small" :class="{active: tab==='counterparty'}" @click="tab='counterparty'">{{ t.counterparty }}</button>
          <button class="btn btn--small" :class="{active: tab==='driver'}" @click="tab='driver'">{{ t.driver }}</button>
          <button class="btn btn--small" :class="{active: tab==='conflicts'}" @click="tab='conflicts'">{{ t.conflicts }}</button>
        </div>

        <div class="toolbar">
          <button class="btn btn--primary" @click="reloadAll">{{ t.refresh }}</button>
          <button v-if="tab==='base'" class="btn" @click="openBaseForm()">{{ t.addRow }}</button>
          <button class="btn" @click="downloadEtaTemplate">{{ t.etaTemplate }}</button>
          <button v-if="tab==='conflicts'" class="btn btn--danger" @click="recalc">{{ t.recalc }}</button>
        </div>
        <div v-if="notice" class="hint">{{ notice }}</div>

        <div v-if="tab==='base'" class="panel">
          <h3>{{ t.base }}</h3>
          <div class="grid-head grid-head--base"><div>{{ t.country }}</div><div>{{ t.from }}</div><div>{{ t.to }}</div><div>{{ t.vehicleClass }}</div><div>{{ t.sale }}</div><div>{{ t.currency }}</div><div>{{ t.actions }}</div></div>
          <div v-for="r in baseRows" :key="r.id" class="grid-row grid-row--base">
            <div>{{ r.country || '-' }}</div>
            <div>{{ r.routeFrom || '-' }}</div>
            <div>{{ r.routeTo || '-' }}</div>
            <div><span :class="['class-badge', { 'class-badge--missing': !r.vehicleType }]">{{ r.vehicleType || t.missingClass }}</span></div>
            <div>{{ r.fixedPrice || '-' }}</div>
            <div>{{ r.currency || '-' }}</div>
            <div class="row-actions">
              <button class="btn btn--small btn--primary" @click="openBaseForm(r)">{{ t.edit }}</button>
              <button class="btn btn--small btn--danger" @click="removeBaseRow(r)">{{ t.delete }}</button>
            </div>
          </div>
        </div>

        <div v-if="tab==='counterparty'" class="panel">
          <h3>{{ t.counterparty }}</h3>
          <div class="grid-head grid-head--counterparty"><div>{{ t.counterpartyName }}</div><div>{{ t.city }}</div><div>{{ t.route }}</div><div>{{ t.vehicleClass }}</div><div>{{ t.sale }}</div><div>{{ t.markup }}</div><div>{{ t.status }}</div></div>
          <div v-for="r in cpRows" :key="r.id" class="grid-row grid-row--counterparty">
            <div>{{ r.counterpartyName }}</div><div>{{ r.city || '-' }}</div><div>{{ r.routeFrom || '-' }} -> {{ r.routeTo || '-' }}</div><div><span :class="['class-badge', { 'class-badge--missing': !r.vehicleType }]">{{ r.vehicleType || t.missingClass }}</span></div><div>{{ r.sellPrice || '-' }} {{ r.currency }}</div><div>{{ r.markupPercent || '-' }}%</div><div>{{ r.isActive ? 'active' : 'off' }}</div>
          </div>
        </div>

        <div v-if="tab==='driver'" class="panel">
          <h3>{{ t.driver }}</h3>
          <div class="grid-head"><div>{{ t.name }}</div><div>{{ t.country }}</div><div>{{ t.city }}</div><div>{{ t.perKm }}</div><div>{{ t.hourly }}</div><div>{{ t.childSeat }}</div><div>{{ t.comment }}</div></div>
          <div v-for="d in driverRows" :key="d.id" class="grid-row">
            <div>{{ d.name }}</div><div>{{ d.country || '-' }}</div><div>{{ d.city || '-' }}</div><div>{{ d.kmRate || '-' }}</div><div>{{ d.hourlyRate || '-' }}</div><div>{{ d.childSeatPrice || '-' }}</div><div>{{ d.comment || '-' }}</div>
          </div>
        </div>

        <div v-if="tab==='conflicts'" class="panel">
          <h3>{{ t.conflicts }}</h3>
          <div class="grid-head"><div>{{ t.issue }}</div><div>ID</div><div>{{ t.route }}</div><div>{{ t.sale }}</div><div>{{ t.driverCost }}</div><div>{{ t.margin }}</div><div>{{ t.severity }}</div></div>
          <div v-for="c in conflictRows" :key="c.id" class="grid-row">
            <div>{{ c.issueType }}</div><div>{{ c.orderId || '-' }}</div><div>{{ c.order ? (c.order.fromPoint + ' -> ' + c.order.toPoint) : '-' }}</div><div>{{ c.sellPrice }}</div><div>{{ c.driverCost }}</div><div>{{ c.marginAbs }} ({{ c.marginPct.toFixed(1) }}%)</div><div>{{ c.severity }}</div>
          </div>
        </div>
      </div>
    </section>

    <div v-if="editingBase" class="modal-overlay" @click="closeBaseForm">
      <div class="modal" @click.stop>
        <h3>{{ editingBase.id ? t.editRow : t.addRow }}</h3>
        <div class="form-grid">
          <div>
            <label>{{ t.country }}</label>
            <input v-model="baseForm.country" class="input" />
          </div>
          <div>
            <label>{{ t.from }}</label>
            <input v-model="baseForm.routeFrom" class="input" />
          </div>
          <div>
            <label>{{ t.to }}</label>
            <input v-model="baseForm.routeTo" class="input" />
          </div>
          <div>
            <label>{{ t.vehicleClass }} *</label>
            <input v-model="baseForm.vehicleType" class="input" />
          </div>
          <div>
            <label>{{ t.sale }} *</label>
            <input v-model="baseForm.fixedPrice" class="input" type="number" step="0.01" min="0" />
          </div>
          <div>
            <label>{{ t.currency }} *</label>
            <input v-model="baseForm.currency" class="input" />
          </div>
        </div>
        <div class="actions">
          <button class="btn btn--primary" @click="saveBaseRow">{{ t.save }}</button>
          <button class="btn" @click="closeBaseForm">{{ t.cancel }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import navigation from '~/components/partials/nav.vue'
import adminTabs from '~/components/partials/adminTabs.vue'

export default {
  middleware: 'staff',
  components: { navigation, adminTabs },
  data: () => ({
    tab: 'base',
    baseRows: [],
    cpRows: [],
    conflictRows: [],
    driverRows: [],
    notice: '',
    editingBase: null,
    baseForm: {
      country: '',
      routeFrom: '',
      routeTo: '',
      vehicleType: '',
      fixedPrice: '',
      currency: 'EUR'
    }
  }),
  computed: {
    t () {
      return this.$store.state.language === 'ru'
        ? {
            title: 'Прайс и контроль маржи',
            base: 'Продажа (базовый)',
            counterparty: 'Контрагенты',
            driver: 'Цены водителей',
            conflicts: 'Риски/расхождения',
            refresh: 'Обновить',
            addRow: 'Добавить строку',
            editRow: 'Редактировать строку',
            edit: 'Изменить',
            delete: 'Удалить',
            actions: 'Действия',
            etaTemplate: 'Шаблон для ETA',
            recalc: 'Пересчитать риски',
            city: 'Город',
            route: 'Маршрут',
            from: 'Откуда',
            to: 'Куда',
            vehicleClass: 'Класс авто',
            missingClass: 'Класс не задан',
            sale: 'Цена',
            currency: 'Валюта',
            perKm: 'За км',
            hourly: 'Почасовая',
            childSeat: 'Детское кресло',
            source: 'Источник',
            counterpartyName: 'Контрагент',
            markup: 'Наценка',
            status: 'Статус',
            name: 'Водитель',
            country: 'Страна',
            comment: 'Комментарий',
            issue: 'Проблема',
            driverCost: 'Цена водителя',
            margin: 'Маржа',
            severity: 'Критичность',
            loadedRows: 'Загружено строк базового прайса',
            save: 'Сохранить',
            cancel: 'Отмена'
          }
        : {
            title: 'Pricing & Margin Control',
            base: 'Base Sell',
            counterparty: 'Counterparty',
            driver: 'Driver Prices',
            conflicts: 'Conflicts',
            refresh: 'Refresh',
            addRow: 'Add row',
            editRow: 'Edit row',
            edit: 'Edit',
            delete: 'Delete',
            actions: 'Actions',
            etaTemplate: 'ETA Template',
            recalc: 'Recalculate',
            city: 'City',
            route: 'Route',
            from: 'From',
            to: 'To',
            vehicleClass: 'Vehicle class',
            missingClass: 'Class missing',
            sale: 'Price',
            currency: 'Currency',
            perKm: 'Per km',
            hourly: 'Hourly',
            childSeat: 'Child seat',
            source: 'Source',
            counterpartyName: 'Counterparty',
            markup: 'Markup',
            status: 'Status',
            name: 'Driver',
            country: 'Country',
            comment: 'Comment',
            issue: 'Issue',
            driverCost: 'Driver cost',
            margin: 'Margin',
            severity: 'Severity',
            loadedRows: 'Loaded base price rows',
            save: 'Save',
            cancel: 'Cancel'
          }
    }
  },
  mounted () { this.reloadAll() },
  methods: {
    headers () { const token = localStorage.getItem('authToken'); return { Authorization: token ? `Bearer ${token}` : '' } },
    async fetchJson (url, options = {}) {
      const response = await fetch(url, { headers: this.headers(), ...options })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(body.error || `HTTP ${response.status}`)
      }
      return body
    },
    openBaseForm (row = null) {
      this.editingBase = row || {}
      this.baseForm = {
        country: row?.country || '',
        routeFrom: row?.routeFrom || '',
        routeTo: row?.routeTo || '',
        vehicleType: row?.vehicleType || '',
        fixedPrice: row?.fixedPrice ?? '',
        currency: row?.currency || 'EUR'
      }
    },
    closeBaseForm () {
      this.editingBase = null
    },
    async saveBaseRow () {
      const payload = {
        country: this.baseForm.country || null,
        routeFrom: this.baseForm.routeFrom || null,
        routeTo: this.baseForm.routeTo || null,
        vehicleType: String(this.baseForm.vehicleType || '').trim(),
        fixedPrice: this.baseForm.fixedPrice === '' ? null : parseFloat(this.baseForm.fixedPrice),
        currency: String(this.baseForm.currency || 'EUR').trim().toUpperCase()
      }
      if (!payload.vehicleType) throw new Error('vehicleType is required')
      if (payload.fixedPrice === null || Number.isNaN(payload.fixedPrice)) throw new Error('fixedPrice is required')

      if (this.editingBase?.id) {
        await this.fetchJson(`/api/admin/pricing/cities/${this.editingBase.id}`, {
          method: 'PUT',
          headers: {
            ...this.headers(),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        })
      } else {
        await this.fetchJson('/api/admin/pricing/cities', {
          method: 'POST',
          headers: {
            ...this.headers(),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        })
      }
      this.closeBaseForm()
      await this.reloadAll()
    },
    async removeBaseRow (row) {
      if (!row?.id) return
      await this.fetchJson(`/api/admin/pricing/cities/${row.id}`, {
        method: 'DELETE',
        headers: this.headers()
      })
      await this.reloadAll()
    },
    async reloadAll () {
      this.notice = ''
      const [base, cp, cf, dr] = await Promise.allSettled([
        this.fetchJson('/api/admin/pricing/cities?limit=5000'),
        this.fetchJson('/api/admin/pricing/counterparty-rules'),
        this.fetchJson('/api/admin/pricing/conflicts?status=open&limit=500'),
        this.fetchJson('/api/admin/drivers')
      ])
      this.baseRows = base.status === 'fulfilled' ? (base.value.rows || []) : []
      this.cpRows = cp.status === 'fulfilled' ? (cp.value.rows || []) : []
      this.conflictRows = cf.status === 'fulfilled' ? (cf.value.rows || []) : []
      this.driverRows = dr.status === 'fulfilled' ? (Array.isArray(dr.value) ? dr.value : []) : []

      const errors = [base, cp, cf, dr]
        .filter((x) => x.status === 'rejected')
        .map((x) => x.reason?.message || 'unknown')
      this.notice = errors.length
        ? `Часть данных не загружена: ${errors.join('; ')}`
        : `${this.t.loadedRows}: ${this.baseRows.length}`
    },
    async recalc () {
      await fetch('/api/admin/pricing/conflicts/recalculate', { method: 'POST', headers: this.headers() })
      await this.reloadAll()
    },
    async downloadEtaTemplate () {
      const response = await fetch('/api/admin/pricing/export-eta-template', { headers: this.headers() })
      if (!response.ok) return
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'ETA_Fixed_Price_template.csv'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }
}
</script>

<style scoped>
.admin-section {
  padding-top: 150px;
  color: #17233d;
}
.subtabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}
.btn.active {
  background: #0ea5e9;
  color: #fff;
}
.toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}
.hint {
  margin-bottom: 10px;
  color: #4a628c;
}
.panel {
  background: #fff;
  border: 1px solid #d8d8e6;
  border-radius: 12px;
  padding: 12px;
}
.grid-head,
.grid-row {
  display: grid;
  grid-template-columns: .9fr 1fr 1.2fr 1fr .8fr .8fr .9fr .9fr;
  gap: 10px;
  min-width: 1260px;
  padding: 9px 6px;
}
.grid-head--base,
.grid-row--base {
  grid-template-columns: .9fr 1fr 1fr .9fr .8fr .7fr .9fr;
  min-width: 1180px;
}
.grid-head--counterparty,
.grid-row--counterparty {
  grid-template-columns: 1.1fr .8fr 1.1fr .8fr .8fr .7fr .6fr;
  min-width: 1180px;
}
.class-badge {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 999px;
  background: #e5f4ff;
  color: #0b3a66;
  font-weight: 600;
  font-size: 12px;
}
.class-badge--missing {
  background: #ffe8e8;
  color: #8a1f1f;
}
.row-actions {
  display: flex;
  gap: 6px;
}
.grid-head {
  font-weight: 700;
  color: #1d2c4a;
  border-bottom: 1px solid #e4e7f0;
}
.grid-row {
  color: #2f3e60;
  border-bottom: 1px solid #f0f2f7;
}
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}
.modal {
  width: min(760px, 95vw);
  background: #ffffff;
  border-radius: 12px;
  padding: 16px;
  border: 1px solid #d8d8e6;
}
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.actions {
  display: flex;
  gap: 8px;
  margin-top: 14px;
}
</style>
