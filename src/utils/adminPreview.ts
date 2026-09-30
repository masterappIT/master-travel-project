const PREVIEW_KEY = 'master-admin-preview-active'
const PREVIEW_REVISION_KEY = 'master-admin-preview-revision'
const PREVIEW_PLATFORM_KEY = 'master-admin-preview-platform'
const PREVIEW_STARTED_KEY = 'master-admin-preview-started-at'
const PREVIEW_TTL_MS = 30 * 60 * 1000

const canUseStorage = () => typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined'

const hasExpired = () => {
  if (!canUseStorage()) return true
  const startedAt = Number(window.sessionStorage.getItem(PREVIEW_STARTED_KEY))
  return !Number.isFinite(startedAt) || Date.now() - startedAt > PREVIEW_TTL_MS
}

const readHashQuery = () => {
  if (typeof window === 'undefined') return null
  const hash = window.location.hash || ''
  const query = hash.split('?')[1] || ''
  return new URLSearchParams(query)
}

export const enableAdminPreview = (revision?: string | number, platform: 'web' | 'miniProgram' = 'web') => {
  if (!canUseStorage()) return
  window.sessionStorage.setItem(PREVIEW_KEY, '1')
  window.sessionStorage.setItem(PREVIEW_PLATFORM_KEY, platform)
  if (!window.sessionStorage.getItem(PREVIEW_STARTED_KEY)) {
    window.sessionStorage.setItem(PREVIEW_STARTED_KEY, String(Date.now()))
  }
  if (revision !== undefined && revision !== '') {
    window.sessionStorage.setItem(PREVIEW_REVISION_KEY, String(revision))
  }
}

export const isAdminPreview = (options?: Record<string, unknown> | null) => {
  const queryValue = options?.adminPreview
  const hash = typeof window === 'undefined' ? '' : window.location.hash || ''
  const query = readHashQuery()
  const hashValue = query?.get('adminPreview')
  const hasExplicitPreview = queryValue === '1' || hashValue === '1'
  const requestedPlatform = options?.platform ?? query?.get('platform')
  const storedPlatform = canUseStorage() && window.sessionStorage.getItem(PREVIEW_PLATFORM_KEY) === 'miniProgram' ? 'miniProgram' : 'web'
  const platformValue = requestedPlatform === 'miniProgram' ? 'miniProgram' : requestedPlatform === 'web' || hasExplicitPreview ? 'web' : storedPlatform
  const storedPreview = canUseStorage() && window.sessionStorage.getItem(PREVIEW_KEY) === '1'
  if (!hasExplicitPreview && storedPreview && hasExpired()) {
    clearAdminPreview()
  }
  const active = hasExplicitPreview || (storedPreview && !hasExpired())
  if (active) enableAdminPreview(options?.previewRevision as string | number | undefined, platformValue)
  return active
}

export const clearAdminPreview = () => {
  if (!canUseStorage()) return
  window.sessionStorage.removeItem(PREVIEW_KEY)
  window.sessionStorage.removeItem(PREVIEW_REVISION_KEY)
  window.sessionStorage.removeItem(PREVIEW_PLATFORM_KEY)
  window.sessionStorage.removeItem(PREVIEW_STARTED_KEY)
}

export const getAdminPreviewPlatform = (): 'web' | 'miniProgram' => {
  if (!canUseStorage()) return 'web'
  return window.sessionStorage.getItem(PREVIEW_PLATFORM_KEY) === 'miniProgram' ? 'miniProgram' : 'web'
}

export const adminPreviewLoginHash = () => {
  const revision = canUseStorage() ? window.sessionStorage.getItem(PREVIEW_REVISION_KEY) : null
  const platform = canUseStorage() && window.sessionStorage.getItem(PREVIEW_PLATFORM_KEY) === 'miniProgram' ? '&platform=miniProgram' : ''
  return `#/pages/login/login?adminPreview=1${revision ? `&previewRevision=${encodeURIComponent(revision)}` : ''}${platform}`
}
