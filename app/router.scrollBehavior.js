export default function (to, from, savedPosition) {
  if (savedPosition) return savedPosition

  const fromPath = String(from?.path || '')
  const toPath = String(to?.path || '')
  const fromAdmin = fromPath.startsWith('/admin')
  const toAdmin = toPath.startsWith('/admin')

  if (fromAdmin && toAdmin) return false
  if (to.hash) return { selector: to.hash }

  return { x: 0, y: 0 }
}
