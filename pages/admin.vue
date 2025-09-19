<template>
  <div>
    <section class="site-section admin-section">
      <div class="container">
        <h1 class="h2">Admin</h1>

        <div v-if="!authed" class="login">
          <input class="login__input" v-model="token" placeholder="Admin token" type="password" />
          <button class="btn" @click="load">Login</button>
        </div>

        <div v-else class="grids">
          <h2 class="h3">Requests</h2>
          <div class="table" v-if="requests.length">
            <div class="table__row table__row--head">
              <div>Name</div><div>From</div><div>To</div><div>Date</div><div>Passengers</div><div>Created</div>
            </div>
            <div class="table__row" v-for="r in requests" :key="r.id">
              <div>{{r.name}}</div><div>{{r.fromPoint}}</div><div>{{r.toPoint}}</div><div>{{fmt(r.date)}}</div><div>{{r.passengers}}</div><div>{{fmt(r.createdAt)}}</div>
            </div>
          </div>

          <h2 class="h3" style="margin-top:32px">Drivers</h2>
          <div class="table" v-if="drivers.length">
            <div class="table__row table__row--head">
              <div>Name</div><div>City</div><div>Fixed</div><div>Per km</div><div>Created</div>
            </div>
            <div class="table__row" v-for="d in drivers" :key="d.id">
              <div>{{d.name}}</div><div>{{d.city}}</div><div>{{d.fixedRoutes}}</div><div>{{d.pricePerKm}}</div><div>{{fmt(d.createdAt)}}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
export default {
  data(){
    return { token: '', authed: false, requests: [], drivers: [] }
  },
  methods: {
    async load(){
      try{
        const headers = { 'x-admin-token': this.token }
        const [reqs, drs] = await Promise.all([
          this.$axios.$get('/api/admin/requests', { headers }),
          this.$axios.$get('/api/admin/drivers', { headers })
        ])
        this.requests = reqs; this.drivers = drs; this.authed = true
      }catch(e){ alert('Unauthorized or error') }
    },
    fmt(v){ if(!v) return ''; return new Date(v).toLocaleString() }
  }
}
</script>

<style scoped lang="scss">
.admin-section{ padding-top: 120px; padding-bottom: 40px; }
.login{ display:flex; gap:10px; margin: 10px 0 20px; }
.login__input{ border:1px solid #D8D8E6; border-radius:6px; padding: 8px 10px; }
.btn{ background:#2F80ED; color:#fff; border:0; border-radius:20px; line-height:36px; padding:0 14px; cursor:pointer; }
.table{ display:block; }
.table__row{ display:grid; grid-template-columns: 1.2fr 1fr 1fr 1fr 0.8fr 1fr; gap:10px; padding:8px 0; border-bottom:1px solid #eee; }
.table__row--head{ font-weight:600; }
@media (max-width: 767px){
  .table__row{ grid-template-columns: 1fr; }
}
</style>


