function clearStaffSession() {
  localStorage.removeItem('authToken')
  localStorage.removeItem('user')
}

function parseJwtPayload(token) {
  try {
    const payload = String(token || '').split('.')[1]
    if (!payload) return null
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
    return JSON.parse(atob(padded))
  } catch (error) {
    return null
  }
}

export default function ({ store, redirect }) {
  if (process.client) {
    const token = localStorage.getItem('authToken')
    const user = localStorage.getItem('user')

    if (!token || !user) {
      return redirect('/staff-login')
    }

    const tokenPayload = parseJwtPayload(token)
    if (tokenPayload?.exp && Number(tokenPayload.exp) * 1000 <= Date.now()) {
      clearStaffSession()
      if (store) store.commit('clearUser')
      return redirect('/staff-login')
    }

    try {
      const userData = JSON.parse(user)
      const permissions = userData.permissions || []
      const canAccess =
        userData.role === 'admin' ||
        permissions.includes('*') ||
        permissions.includes('admin.panel') ||
        permissions.includes('orders.read') ||
        permissions.includes('drivers.read') ||
        permissions.includes('crm.read') ||
        permissions.includes('pricing.read') ||
        permissions.includes('ops.read')

      if (!canAccess) {
        return redirect('/staff-login')
      }

      if (store) store.commit('setUser', userData)
    } catch (e) {
      clearStaffSession()
      if (store) store.commit('clearUser')
      return redirect('/staff-login')
    }
  }
}
