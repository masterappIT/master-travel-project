const cacheMigrationKey = 'admin-cache-migration-v1'

async function clearLegacyBrowserCaches() {
  if (localStorage.getItem(cacheMigrationKey) === 'done') return

  const registrations = await navigator.serviceWorker?.getRegistrations?.() ?? []
  await Promise.all(registrations.map(registration => registration.unregister()))

  if ('caches' in window) {
    const cacheNames = await caches.keys()
    await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)))
  }

  localStorage.setItem(cacheMigrationKey, 'done')

  if (registrations.length > 0) {
    window.location.reload()
    await new Promise(() => {})
  }
}

clearLegacyBrowserCaches()
  .catch(error => {
    console.warn('Unable to clear legacy admin caches; continuing without migration.', error)
  })
  .then(() => import('./main.js'))
