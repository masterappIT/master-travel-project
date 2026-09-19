const AUTH_STATE_KEY = 'client-authenticated'
const AUTH_TOKEN_KEY = 'client-auth-token'
const AUTH_USER_KEY = 'client-auth-user'
const USER_CACHE_KEYS = [
  'account-profile',
  'account-security',
  'wallet-state',
  'fare-vouchers',
  'common-passengers',
  'complaint-records',
  'master-travel-project-orders',
  'master-travel-project-pending-order-status',
  'read-message-types',
  'selected-message-type',
  'selected-notification',
  'support-rider-id',
]
const profileListeners = new Set<(user: AuthUser | null) => void>()

export const isAuthenticated = () => uni.getStorageSync(AUTH_STATE_KEY) === true

export type AuthUser = {
  id: string
  countryCode: string
  phoneNumber: string
  name: string | null
  displayName?: string | null
  avatarUrl?: string | null
}

export const clearUserCache = () => {
  USER_CACHE_KEYS.forEach((key) => uni.removeStorageSync(key))
}

const persistedAuthUser = (user: AuthUser): AuthUser => {
  const { avatarUrl: _avatarUrl, ...persisted } = user
  return persisted
}

const removePersistedAvatarUrl = <T extends Record<string, unknown>>(key: string, value: T): T => {
  if (!Object.prototype.hasOwnProperty.call(value, 'avatarUrl')) return value
  const { avatarUrl: _avatarUrl, ...persisted } = value
  uni.setStorageSync(key, persisted)
  return persisted as T
}

export const setAuthenticated = (token?: string, user?: AuthUser) => {
  if (!token && !getAuthToken()) return false
  const previousUser = getAuthUser()
  const hasCachedUserData = USER_CACHE_KEYS.some((key) => uni.getStorageSync(key) !== undefined && uni.getStorageSync(key) !== null && uni.getStorageSync(key) !== '')
  const isNewLogin = Boolean(token && user?.id)
  if (user?.id && (isNewLogin || !previousUser || previousUser.id !== user.id) && hasCachedUserData) clearUserCache()
  uni.setStorageSync(AUTH_STATE_KEY, true)
  if (token) uni.setStorageSync(AUTH_TOKEN_KEY, token)
  if (user) {
    uni.setStorageSync(AUTH_USER_KEY, persistedAuthUser(user))
    profileListeners.forEach((listener) => listener(user))
  }
  return true
}

export const clearAuthentication = () => {
  clearUserCache()
  uni.removeStorageSync(AUTH_STATE_KEY)
  uni.removeStorageSync(AUTH_TOKEN_KEY)
  uni.removeStorageSync(AUTH_USER_KEY)
  profileListeners.forEach((listener) => listener(null))
}

export const getAuthToken = () => String(uni.getStorageSync(AUTH_TOKEN_KEY) || '')
export const isAuthSessionCurrent = (token: string) => Boolean(token) && token === getAuthToken() && isAuthenticated()
export const getAuthUser = () => {
  const user = uni.getStorageSync(AUTH_USER_KEY) as AuthUser | null
  if (!user || typeof user !== 'object') return null
  return removePersistedAvatarUrl(AUTH_USER_KEY, user)
}
export const subscribeAuthUser = (listener: (user: AuthUser | null) => void) => {
  profileListeners.add(listener)
  return () => profileListeners.delete(listener)
}
