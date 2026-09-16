const AUTH_STATE_KEY = 'client-authenticated'
const AUTH_TOKEN_KEY = 'client-auth-token'
const AUTH_USER_KEY = 'client-auth-user'
const USER_CACHE_KEYS = ['account-profile', 'account-security', 'wallet-state', 'read-message-types', 'support-rider-id']
const profileListeners = new Set<(user: AuthUser) => void>()

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

export const setAuthenticated = (token?: string, user?: AuthUser) => {
  const previousUser = getAuthUser()
  const hasCachedUserData = USER_CACHE_KEYS.some((key) => uni.getStorageSync(key) !== undefined && uni.getStorageSync(key) !== null && uni.getStorageSync(key) !== '')
  const isNewLogin = Boolean(token && user?.id)
  if (user?.id && (isNewLogin || !previousUser || previousUser.id !== user.id) && hasCachedUserData) clearUserCache()
  uni.setStorageSync(AUTH_STATE_KEY, true)
  if (token) uni.setStorageSync(AUTH_TOKEN_KEY, token)
  if (user) {
    uni.setStorageSync(AUTH_USER_KEY, user)
    profileListeners.forEach((listener) => listener(user))
  }
}

export const clearAuthentication = () => {
  clearUserCache()
  uni.removeStorageSync(AUTH_STATE_KEY)
  uni.removeStorageSync(AUTH_TOKEN_KEY)
  uni.removeStorageSync(AUTH_USER_KEY)
}

export const getAuthToken = () => String(uni.getStorageSync(AUTH_TOKEN_KEY) || '')
export const getAuthUser = () => uni.getStorageSync(AUTH_USER_KEY) as AuthUser | null
export const subscribeAuthUser = (listener: (user: AuthUser) => void) => {
  profileListeners.add(listener)
  return () => profileListeners.delete(listener)
}
