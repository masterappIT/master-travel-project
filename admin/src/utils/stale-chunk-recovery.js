// A tab left open across a release still references the previous build's hashed
// chunks, which the new image no longer serves, so its lazy imports fail.
const reloadMarkerKey = 'admin-stale-chunk-reload-at'
const reloadCooldownMs = 60000

export const STALE_BUILD_ERROR_KIND = 'stale-build'

export function createStaleChunkRecovery({ storage, reload, now = Date.now }) {
  let prompt = null
  let prompting = false

  function reloadedRecently() {
    try {
      const lastReloadAt = Number(storage.getItem(reloadMarkerKey))
      return Number.isFinite(lastReloadAt) && lastReloadAt > 0 && now() - lastReloadAt < reloadCooldownMs
    } catch {
      return false
    }
  }

  function reloadOnce() {
    if (reloadedRecently()) return false
    try {
      storage.setItem(reloadMarkerKey, String(now()))
    } catch {
      // Without a marker a repeated failure would reload forever.
      return false
    }
    reload()
    return true
  }

  async function handlePreloadError(event) {
    const error = event?.payload
    if (error && typeof error === 'object') error.kind = STALE_BUILD_ERROR_KIND

    // Nothing is on screen before the app starts, so a reload cannot lose work.
    if (!prompt) {
      reloadOnce()
      return
    }
    if (prompting) return
    prompting = true
    try {
      if (await prompt()) reload()
    } finally {
      prompting = false
    }
  }

  return {
    handlePreloadError,
    // Once the app is running a reload discards unsaved drafts, so the user decides.
    setPrompt(nextPrompt) { prompt = nextPrompt }
  }
}

let installedRecovery = null

export function installStaleChunkRecovery(target = window) {
  if (installedRecovery) return installedRecovery
  installedRecovery = createStaleChunkRecovery({
    storage: target.sessionStorage,
    reload: () => target.location.reload()
  })
  target.addEventListener('vite:preloadError', installedRecovery.handlePreloadError)
  return installedRecovery
}
