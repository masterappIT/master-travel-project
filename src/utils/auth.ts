const AUTH_STATE_KEY = 'client-authenticated'
const AUTH_TOKEN_KEY = 'client-auth-token'
const AUTH_USER_KEY = 'client-auth-user'

export const isAuthenticated = () => uni.getStorageSync(AUTH_STATE_KEY) === true

export type AuthUser = {
  id: string
  countryCode: string
  phoneNumber: string
  name: string | null
}

export const setAuthenticated = (token?: string, user?: AuthUser) => {
  uni.setStorageSync(AUTH_STATE_KEY, true)
  if (token) uni.setStorageSync(AUTH_TOKEN_KEY, token)
  if (user) uni.setStorageSync(AUTH_USER_KEY, user)
}

export const clearAuthentication = () => {
  uni.removeStorageSync(AUTH_STATE_KEY)
  uni.removeStorageSync(AUTH_TOKEN_KEY)
  uni.removeStorageSync(AUTH_USER_KEY)
}

export const getAuthToken = () => String(uni.getStorageSync(AUTH_TOKEN_KEY) || '')
export const getAuthUser = () => uni.getStorageSync(AUTH_USER_KEY) as AuthUser | null
