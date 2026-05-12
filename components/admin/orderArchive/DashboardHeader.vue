<template>
  <div class="archive-header">
    <div>
      <p class="archive-header__eyebrow">Экономика</p>
      <h1>Архив заказов</h1>
      <p>Финансово-операционный обзор прошлых месяцев: поездки, выручка, качество и вклад клиентов/исполнителей.</p>
    </div>
    <div class="archive-header__actions">
      <button class="btn btn--primary" :disabled="loading" @click="$emit('refresh')">
        {{ loading ? 'Загружаю...' : 'Обновить' }}
      </button>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    loading: { type: Boolean, default: false }
  }
}
</script>

<style scoped>
.archive-header {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  align-items: flex-start;
  margin-bottom: 18px;
}
.archive-header__eyebrow {
  margin: 0 0 8px;
  color: #53627c;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: .08em;
  text-transform: uppercase;
}
.archive-header h1 {
  margin: 0;
  color: #17233d;
  font-size: 32px;
  line-height: 1.15;
}
.archive-header p {
  max-width: 780px;
  margin: 10px 0 0;
  color: #64748b;
  line-height: 1.55;
}
.archive-header__actions {
  flex: 0 0 auto;
}
@media (max-width: 760px) {
  .archive-header {
    display: grid;
  }
}
</style>
