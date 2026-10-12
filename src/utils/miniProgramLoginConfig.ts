import { getWechatMiniProgramConfig, listLoginMethods, type LoginMethod, type WechatMiniProgramConfig } from '../services/api'

export type MiniProgramLoginConfig = {
  methods: LoginMethod[]
  capabilities: WechatMiniProgramConfig['capabilities']
}

const CACHE_KEY = 'passenger-mini-program-login-config'
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000
const PROVIDERS = ['phone', 'wechat', 'apple']

const isLoginMethod = (value: unknown): value is LoginMethod => typeof value === 'object' && value !== null
  && PROVIDERS.includes((value as LoginMethod).provider)

const isCapabilities = (value: unknown): value is MiniProgramLoginConfig['capabilities'] => typeof value === 'object' && value !== null
  && ['phone', 'avatar', 'nickname'].every((key) => typeof (value as Record<string, unknown>)[key] === 'boolean')

// 快取只用來先畫出登入方式；每次登入仍由後端重新驗證登入方式是否啟用。
export const readCachedMiniProgramLoginConfig = (): MiniProgramLoginConfig | null => {
  try {
    const cached = uni.getStorageSync(CACHE_KEY) as { savedAt?: unknown; methods?: unknown; capabilities?: unknown } | ''
    if (!cached || typeof cached !== 'object') return null
    const age = Date.now() - Number(cached.savedAt)
    if (!Number.isFinite(age) || age < 0 || age > CACHE_MAX_AGE_MS) return null
    if (!Array.isArray(cached.methods) || !cached.methods.length || !cached.methods.every(isLoginMethod)) return null
    if (!isCapabilities(cached.capabilities)) return null
    return { methods: cached.methods, capabilities: cached.capabilities }
  } catch {
    return null
  }
}

const loadMiniProgramLoginConfig = async (): Promise<MiniProgramLoginConfig> => {
  // 兩個請求同時發出；微信配置只有在微信登入啟用時才是必要資料。
  const capabilitiesRequest = getWechatMiniProgramConfig().then((config) => config.capabilities, () => null)
  const methods = await listLoginMethods('passenger', 'miniProgram')
  let capabilities: MiniProgramLoginConfig['capabilities'] = { phone: false, avatar: false, nickname: false }
  if (methods.some((method) => method.provider === 'wechat')) {
    const loaded = await capabilitiesRequest
    if (!loaded) throw new Error('無法載入微信小程序配置')
    capabilities = loaded
  }
  const config = { methods, capabilities }
  try {
    if (methods.length) uni.setStorageSync(CACHE_KEY, { ...config, savedAt: Date.now() })
    else uni.removeStorageSync(CACHE_KEY)
  } catch {
    // 寫入快取失敗不影響本次登入。
  }
  return config
}

let pendingRefresh: Promise<MiniProgramLoginConfig> | null = null

export const refreshMiniProgramLoginConfig = (): Promise<MiniProgramLoginConfig> => {
  if (!pendingRefresh) {
    const clearPending = () => { pendingRefresh = null }
    pendingRefresh = loadMiniProgramLoginConfig()
    pendingRefresh.then(clearPending, clearPending)
  }
  return pendingRefresh
}

export const preloadMiniProgramLoginConfig = () => {
  refreshMiniProgramLoginConfig().catch(() => undefined)
}
