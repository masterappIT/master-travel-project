import type { CrossBorderTrip } from '../../shared/types/trip'
import { clearAuthentication, getAuthToken, type AuthUser } from '../utils/auth'

let API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://192.168.0.185:3010'
// #ifdef H5
API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'
// #endif
const apiError = (response: UniApp.RequestSuccessCallbackResult, fallback: string) => {
  if (response.statusCode === 401) {
    clearAuthentication()
    uni.reLaunch({ url: '/pages/login/login' })
  }
  const message = typeof response.data === 'object' && response.data !== null && 'message' in response.data
    ? String((response.data as { message?: unknown }).message || '')
    : ''
  return new Error(message || `${fallback}（HTTP ${response.statusCode || 0}，請確認小程序可連線至 ${API_BASE_URL}）`)
}

const authHeaders = () => {
  const token = getAuthToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export type Notification = {
  id: string
  title: string
  content: string
  audience: string
  audience: string
  templateType: string | null
  important: boolean
  readAt: string | null
  createdAt: string
}

export async function listNotifications(): Promise<{ data: Notification[]; unread: number }> {
  const response = await uni.request({ url: `${API_BASE_URL}/notifications/me`, header: authHeaders() })
  if (response.statusCode >= 400) throw apiError(response, '無法載入消息')
  return response.data as { data: Notification[]; unread: number }
}

export async function markNotificationRead(id: string): Promise<void> {
  const response = await uni.request({ url: `${API_BASE_URL}/notifications/${encodeURIComponent(id)}/read`, method: 'POST', header: authHeaders() })
  if (response.statusCode >= 400) throw apiError(response, '消息已讀失敗')
}

export type PhoneAuthChallenge = {
  challengeId: string
  expiresAt: string
}

export type AuthResult = {
  token: string
  expiresAt: string
  user: {
    id: string
    countryCode: string
    phoneNumber: string
    name: string | null
  }
}

export async function requestPhoneVerificationCode(countryCode: string, phoneNumber: string): Promise<PhoneAuthChallenge> {
  const response = await uni.request({
    url: `${API_BASE_URL}/auth/phone/request`,
    method: 'POST',
    data: { countryCode, phoneNumber }
  })
  if (response.statusCode >= 400) throw apiError(response, '驗證碼發送失敗')
  return response.data as PhoneAuthChallenge
}

export async function verifyPhoneVerificationCode(challengeId: string, code = '', invitationCode = ''): Promise<AuthResult> {
  const response = await uni.request({
    url: `${API_BASE_URL}/auth/phone/verify`,
    method: 'POST',
    data: { challengeId, code, invitationCode: invitationCode || undefined }
  })
  if (response.statusCode >= 400) throw apiError(response, '驗證碼錯誤或已過期')
  return response.data as AuthResult
}

export async function authenticateThirdParty(provider: 'wechat' | 'apple', providerToken: string): Promise<AuthResult> {
  const response = await uni.request({
    url: `${API_BASE_URL}/auth/third-party`,
    method: 'POST',
    data: { provider, providerToken }
  })
  if (response.statusCode >= 400) throw apiError(response, '第三方登入失敗')
  return response.data as AuthResult
}

export async function logoutClient(): Promise<void> {
  const response = await uni.request({ url: `${API_BASE_URL}/auth/logout`, method: 'POST', header: authHeaders() })
  if (response.statusCode >= 400) throw apiError(response, '登出失敗')
}

export type InvitationDashboard = {
  code: string
  enabled: boolean
  shareUrl: string
  rewards: { inviterMileage: number; inviteeFare: number; currency: 'RMB' | 'HKD' }
  qualificationDays: number
  mileageValidityMonths: number
  summary: { month: number; invited: number; rewarded: number; pending: number; mileageEarned: number }
  records: Array<{ id: string; name: string; status: 'REGISTERED' | 'REWARDED' | 'EXPIRED'; reward: number; registeredAt: string; rewardedAt: string | null }>
}

export async function getInvitationDashboard(): Promise<InvitationDashboard> {
  const response = await uni.request({ url: `${API_BASE_URL}/client/invitations/me`, header: authHeaders() })
  if (response.statusCode >= 400) throw apiError(response, '無法載入邀請資料')
  return response.data as InvitationDashboard
}

export type ClientProfile = AuthUser & { avatarUrl: string | null; displayName: string | null; email: string | null; gender: string | null; region: string | null; birthday: string | null; cashBalance: number; fareBalance: number; membershipLevel?: string | null }

export async function getClientProfile(): Promise<ClientProfile> {
  const response = await uni.request({ url: `${API_BASE_URL}/client/me`, header: authHeaders() })
  const profile = response.data as ClientProfile
  // #ifdef H5
  profile.avatarUrl = await resolveClientAvatarUrl(profile.avatarUrl)
  // #endif
  return profile
}

export type ClientSecurity = {
  countryCode: string
  phoneNumber: string
  email: string | null
  passwordSet: boolean
  linkedProviders: Array<'apple' | 'wechat'>
}

export async function getClientSecurity(): Promise<ClientSecurity> {
  const response = await uni.request({ url: `${API_BASE_URL}/client/security`, header: authHeaders() })
  if (response.statusCode >= 400) throw apiError(response, '無法獲取安全設定')
  return response.data as ClientSecurity
}

export async function updateClientSecurity(security: { email: string; password?: string }): Promise<ClientSecurity> {
  const response = await uni.request({ url: `${API_BASE_URL}/client/security`, method: 'PATCH' as UniApp.RequestOptions['method'], header: authHeaders(), data: security })
  if (response.statusCode >= 400) throw apiError(response, '安全設定保存失敗')
  return response.data as ClientSecurity
}

export type PhoneChangeChallenge = {
  challengeId: string
  expiresAt: string
  developmentCode?: string
}

export async function requestClientPhoneChange(countryCode: string, phoneNumber: string): Promise<PhoneChangeChallenge> {
  const response = await uni.request({ url: `${API_BASE_URL}/client/security/phone/request`, method: 'POST', header: authHeaders(), data: { countryCode, phoneNumber } })
  if (response.statusCode >= 400) throw apiError(response, '驗證碼發送失敗')
  return response.data as PhoneChangeChallenge
}

export async function verifyClientPhoneChange(challengeId: string, code: string): Promise<ClientSecurity> {
  const response = await uni.request({ url: `${API_BASE_URL}/client/security/phone/verify`, method: 'POST', header: authHeaders(), data: { challengeId, code } })
  if (response.statusCode >= 400) throw apiError(response, '驗證碼錯誤或已過期')
  return response.data as ClientSecurity
}


export async function linkClientProvider(provider: 'wechat' | 'apple', providerToken = `${provider}-dev-account`): Promise<ClientSecurity> {
  const response = await uni.request({ url: `${API_BASE_URL}/client/security/providers`, method: 'POST', header: authHeaders(), data: { provider, providerToken } })
  if (response.statusCode >= 400) throw apiError(response, '第三方帳戶連結失敗')
  return response.data as ClientSecurity
}

export async function unlinkClientProvider(provider: 'wechat' | 'apple'): Promise<ClientSecurity> {
  const response = await uni.request({ url: `${API_BASE_URL}/client/security/providers/${provider}`, method: 'DELETE', header: authHeaders() })
  if (response.statusCode >= 400) throw apiError(response, '第三方帳戶解除連結失敗')
  return response.data as ClientSecurity
}

export async function resolveClientAvatarUrl(url: string | null | undefined): Promise<string> {
  if (!url) return ''
  // #ifdef H5
  if (url.startsWith('/client/me/avatar')) {
    const response = await fetch(`${API_BASE_URL}${url}`, { headers: authHeaders() })
    if (!response.ok) throw new Error(`頭像載入失敗（HTTP ${response.status}）`)
    return URL.createObjectURL(await response.blob())
  }
  // #endif
  return url
}

export async function uploadClientAvatar(filePath: string): Promise<ClientProfile> {
  // #ifdef H5
  const source = await fetch(filePath)
  const blob = await source.blob()
  const form = new FormData()
  form.append('file', blob, 'avatar.jpg')
  const response = await fetch(`${API_BASE_URL}/client/me/avatar`, { method: 'POST', headers: authHeaders(), body: form })
  if (!response.ok) throw new Error(`頭像上傳失敗（HTTP ${response.status}）`)
  const profile = await response.json() as ClientProfile
  profile.avatarUrl = await resolveClientAvatarUrl(profile.avatarUrl)
  return profile
  // #endif
  // #ifndef H5
  return new Promise((resolve, reject) => {
    uni.uploadFile({ url: `${API_BASE_URL}/client/me/avatar`, filePath, name: 'file', header: authHeaders(), success: (response) => {
      if (response.statusCode >= 400) { reject(new Error(`頭像上傳失敗（HTTP ${response.statusCode}）`)); return }
      try { resolve(JSON.parse(response.data) as ClientProfile) } catch { reject(new Error('頭像回應格式錯誤')) }
    }, fail: reject })
  })
  // #endif
}

export type CommonPassenger = {
  id: string
  name: string
  phone: string
  phoneRegion: string
  gender: string
  documentType: string
  passportCountry: string | null
  isDefault: boolean
  sortOrder: number
}

export async function listCommonPassengers(): Promise<CommonPassenger[]> {
  const response = await uni.request({ url: `${API_BASE_URL}/client/common-passengers`, header: authHeaders() })
  if (response.statusCode >= 400) throw apiError(response, '常用資料載入失敗')
  return (response.data as { data: CommonPassenger[] }).data
}

export async function createCommonPassenger(passenger: Partial<CommonPassenger>): Promise<CommonPassenger> {
  const response = await uni.request({ url: `${API_BASE_URL}/client/common-passengers`, method: 'POST', header: authHeaders(), data: passenger })
  if (response.statusCode >= 400) throw apiError(response, '常用資料保存失敗')
  return response.data as CommonPassenger
}

export async function updateCommonPassenger(id: string, passenger: Partial<CommonPassenger>): Promise<CommonPassenger> {
  const response = await uni.request({ url: `${API_BASE_URL}/client/common-passengers/${encodeURIComponent(id)}`, method: 'PATCH' as UniApp.RequestOptions['method'], header: authHeaders(), data: passenger })
  if (response.statusCode >= 400) throw apiError(response, '常用資料更新失敗')
  return response.data as CommonPassenger
}

export async function deleteCommonPassenger(id: string): Promise<void> {
  const response = await uni.request({ url: `${API_BASE_URL}/client/common-passengers/${encodeURIComponent(id)}`, method: 'DELETE', header: authHeaders() })
  if (response.statusCode >= 400) throw apiError(response, '常用資料刪除失敗')
}


export type ClientProfileUpdate = {
  name?: string
  displayName?: string
  gender?: string
  region?: string
  birthday?: string | null
  email?: string | null
}

export async function updateClientProfile(profile: ClientProfileUpdate): Promise<ClientProfile> {
  const response = await uni.request({ url: `${API_BASE_URL}/client/me`, method: 'PATCH' as UniApp.RequestOptions['method'], header: authHeaders(), data: profile })
  if (response.statusCode >= 400) throw apiError(response, '個人資料保存失敗')
  return response.data as ClientProfile
}

export async function getHealth(): Promise<{ status: string }> {
  const response = await uni.request({ url: `${API_BASE_URL}/health` })
  return response.data as { status: string }
}

export type AppSettings = {
  language: string
  region: string
  currency: string
  pricingCurrency?: string
  walletCurrency?: string
  exchangeRate?: number
  fareBalancePayEnabled?: boolean
  cashBalancePayEnabled?: boolean
  wechatPayEnabled?: boolean
  alipayPayEnabled?: boolean
  bankCardPayEnabled?: boolean
  sandboxMode?: boolean
}

export async function getSettings(): Promise<AppSettings> {
  const response = await uni.request({ url: `${API_BASE_URL}/settings` })
  return response.data as AppSettings
}

export async function updateSettings(settings: AppSettings): Promise<AppSettings> {
  const response = await uni.request({ url: `${API_BASE_URL}/settings`, method: 'POST', data: settings })
  return response.data as AppSettings
}

export type LocationDetails = { city: string; address: string; district?: string; landmark?: string }
export type Coordinate = { latitude: number; longitude: number }
export type PlaceSearchResult = Coordinate & {
  id: string
  name: string
  address: string
  displayAddress?: string
  region: '大陸' | '香港' | '澳門' | null
  city?: string
  district?: string
  landmark?: string
}
export type DrivingRoute = {
  distance: number
  duration: number
  points: Coordinate[]
}

export async function reverseGeocode(latitude: number, longitude: number): Promise<LocationDetails> {
  const response = await uni.request({ url: `${API_BASE_URL}/location/reverse-geocode`, data: { latitude, longitude } })
  if (response.statusCode >= 400) throw apiError(response, '地址解析失敗')
  return response.data as LocationDetails
}

export async function searchPlaces(keyword: string, region?: string, city?: string): Promise<PlaceSearchResult[]> {
  const response = await uni.request({
    url: `${API_BASE_URL}/location/search`,
    data: { keyword, region: region || '', city: city || '' }
  })
  if (response.statusCode === 403) throw new Error('未開通服務')
  if (response.statusCode >= 400) throw apiError(response, '位置搜索暫時無法使用')
  return (response.data as { data: PlaceSearchResult[] }).data
}

export async function planDrivingRoute(origin: Coordinate, destination: Coordinate): Promise<DrivingRoute> {
  const response = await uni.request({
    url: `${API_BASE_URL}/location/driving-route`,
    data: {
      origin: `${origin.longitude},${origin.latitude}`,
      destination: `${destination.longitude},${destination.latitude}`
    }
  })
  if (response.statusCode >= 400) throw apiError(response, '路線規劃暫時無法使用')
  return response.data as DrivingRoute
}

export type FlightAirport = {
  iata: string
  name: string
  city: string
  latitude: number | null
  longitude: number | null
}

export type FlightLookupResult = {
  flightNumber: string
  direction: 'arrival' | 'departure'
  status: string
  scheduledTime: string
  origin: FlightAirport
  destination: FlightAirport
}

export async function lookupFlight(flightNumber: string, date: string): Promise<FlightLookupResult> {
  const response = await uni.request({
    url: `${API_BASE_URL}/location/flight-information/lookup`,
    data: { flightNumber, date }
  })
  if (response.statusCode >= 400) throw apiError(response, '航班資料暫時無法取得')
  return response.data as FlightLookupResult
}

export type PublicVehicleCategory = { id: string; name: string; tabLabel: string; order: number; enabled: boolean }
export type PublicVehicle = {
  id: string
  categoryId: string | null
  brand: string
  model: string
  series: string
  seats: number
  image: string
  logo: string | null
  colorLabel: string
  modelChoiceLabel: string
  enabled: boolean
  order: number
}
export type PublicVehicleExtra = { id: string; name: string; label: string; price: number; currency: string; enabled: boolean; order: number; requiredForImmediate: boolean; requiredWithinMinutes: number | null; triggerType: 'NONE' | 'IMMEDIATE' | 'NIGHT' | 'WEATHER'; triggerEnabled: boolean; nightStartTime: string | null; nightEndTime: string | null }
export type PublicVehicleCatalog = { categories: PublicVehicleCategory[]; data: PublicVehicle[]; extras: PublicVehicleExtra[]; severeWeatherEnabled: boolean }

function resolvePublicAssetUrl(url: string | null | undefined): string {
  if (!url) return ''
  return url.startsWith('/') ? `${API_BASE_URL.replace(/\/$/, '')}${url}` : url
}

export async function listPublicVehicles(): Promise<PublicVehicleCatalog> {
  const response = await uni.request({ url: `${API_BASE_URL}/vehicles` })
  if (response.statusCode >= 400) throw new Error('車型資料暫時無法載入')
  const catalog = response.data as PublicVehicleCatalog
  return {
    ...catalog,
    data: catalog.data.map(vehicle => ({
      ...vehicle,
      image: resolvePublicAssetUrl(vehicle.image),
      logo: resolvePublicAssetUrl(vehicle.logo) || null
    }))
  }
}

export type FareQuote = {
  id: string
  distanceMeters: number
  distanceKm: number
  durationSeconds: number
  currency: string
  subtotal: number
  total: number
  createdAt: string
  expiresAt: string | null
  pricing: { categoryId: string; categoryName: string; tabLabel: string; minimumFare: number; currency: string; tiers: Array<{ id: string; fromKm: number; toKm: number | null; pricePerKm: number; order: number }> } | null
  vehicle: PublicVehicle | null
  appliedPromotion: { id: string | null; label: string; discount: number; currency: string } | null
  lines: Array<{ type: string; sourceId: string | null; label: string; quantity: number; unitAmount: number; totalAmount: number; currency: string; order: number }>
}

export async function createFareQuote(input: { categoryId: string; vehicleId: string; distanceMeters: number; durationSeconds: number; extraIds?: string[]; displayCurrency?: 'RMB' | 'HKD'; couponCode?: string; originRegion?: string; originCity?: string; destinationRegion?: string; destinationCity?: string; scheduledAt?: string }): Promise<FareQuote> {
  const response = await uni.request({ url: `${API_BASE_URL}/quotes`, method: 'POST', data: input })
  if (response.statusCode >= 400) throw new Error((response.data as { message?: string })?.message || '報價暫時無法取得')
  return response.data as FareQuote
}

export async function getFareQuote(id: string): Promise<FareQuote> {
  const response = await uni.request({ url: `${API_BASE_URL}/quotes/${encodeURIComponent(id)}` })
  if (response.statusCode >= 400) throw apiError(response, '報價資料無法載入')
  return response.data as FareQuote
}
export async function consumeFareQuote(quoteId: string): Promise<void> {
  const response = await uni.request({ url: `${API_BASE_URL}/quotes/${encodeURIComponent(quoteId)}/consume`, method: 'POST' })
  if (response.statusCode >= 400) throw new Error((response.data as { message?: string })?.message || '優惠使用失敗')
}

export async function releaseFareQuote(quoteId: string): Promise<void> {
  const response = await uni.request({ url: `${API_BASE_URL}/quotes/${encodeURIComponent(quoteId)}/release`, method: 'POST' })
  if (response.statusCode >= 400) throw new Error((response.data as { message?: string })?.message || '優惠釋放失敗')
}

export type RecommendedAddress = {
  id: string
  region: '大陸' | '香港' | '澳門'
  city?: string | null
  name: string
  address: string
  displayAddress?: string
  latitude: number | null
  longitude: number | null
  enabled: boolean
  order: number
}

export async function listRecommendedAddresses(): Promise<RecommendedAddress[]> {
  const response = await uni.request({ url: `${API_BASE_URL}/recommended-addresses` })
  if (response.statusCode >= 400) throw new Error('推薦地址暫時無法載入')
  return (response.data as { data: RecommendedAddress[] }).data
}
export type MainlandCity = { id: string; name: string; enabled: boolean; order: number }

export async function listMainlandCities(): Promise<MainlandCity[]> {
  const response = await uni.request({ url: `${API_BASE_URL}/recommended-addresses/mainland-cities` })
  if (response.statusCode >= 400) throw new Error('大陸城市暫時無法載入')
  return (response.data as { data: MainlandCity[] }).data
}

export type MembershipPlan = {
  id: string
  level: string
  name: string
  description: string
  monthly: number
  yearly: number
  currency: string
  benefits: string[]
  voucherCount: number
  mileageRate: number
  recommended: boolean
  enabled: boolean
  order: number
}

export type MembershipSummary = {
  user: { id: string; name: string }
  membershipLevel: string | null
  subscription: null | {
    id: string
    status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED'
    billingPeriod: 'MONTHLY' | 'YEARLY'
    currentPeriodStartsAt: string
    currentPeriodEndsAt: string
    cancelAtPeriodEnd: boolean
    plan: MembershipPlan
  }
  pendingOrder: null | {
    id: string
    status: 'PENDING'
    billingPeriod: 'MONTHLY' | 'YEARLY'
    amount: number
    currency: string
    createdAt: string
    plan: MembershipPlan
  }
  plans: MembershipPlan[]
  events: Array<{ id: string; type: string; title: string; createdAt: string }>
}

export async function listMembershipPlans(): Promise<MembershipPlan[]> {
  const response = await uni.request({ url: `${API_BASE_URL}/membership-plans` })
  if (response.statusCode >= 400) throw new Error('會員方案暫時無法載入')
  return (response.data as { data: MembershipPlan[] }).data
}

export async function getMembershipSummary(): Promise<MembershipSummary> {
  const response = await uni.request({ url: `${API_BASE_URL}/client/membership/summary`, header: authHeaders() })
  if (response.statusCode >= 400) throw apiError(response, '無法載入會員資料')
  return response.data as MembershipSummary
}

export async function createMembershipOrder(planId: string, billingPeriod: 'MONTHLY' | 'YEARLY', idempotencyKey: string) {
  const response = await uni.request({ url: `${API_BASE_URL}/client/membership/orders`, method: 'POST', header: authHeaders(), data: { planId, billingPeriod, idempotencyKey } })
  if (response.statusCode >= 400) throw apiError(response, '無法建立會員訂單')
  return response.data as { data: MembershipSummary['pendingOrder']; message: string }
}

export async function cancelMembershipOrder(orderId: string): Promise<void> {
  const response = await uni.request({ url: `${API_BASE_URL}/client/membership/orders/${orderId}/cancel`, method: 'POST', header: authHeaders() })
  if (response.statusCode >= 400) throw apiError(response, '無法取消會員訂單')
}

export async function cancelMembershipRenewal(): Promise<void> {
  const response = await uni.request({ url: `${API_BASE_URL}/client/membership/subscription/cancel-renewal`, method: 'POST', header: authHeaders() })
  if (response.statusCode >= 400) throw apiError(response, '無法取消會員續期')
}

export type PublicPromotion = {
  id: string
  name: string
  kind: 'CAMPAIGN' | 'COUPON' | 'MEMBER'
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'TOTAL_PRICE'
  stackingMode: 'NONE' | 'PERCENTAGE_AND_VOUCHER' | 'ALL'
  discountValue: number
  currency: string
  startsAt: string | null
  endsAt: string | null
  minimumSpend: number
  originRegion: string | null
  destinationRegion: string | null
  couponCode: string | null
}

export async function listPublicPromotions(): Promise<PublicPromotion[]> {
  const response = await uni.request({ url: `${API_BASE_URL}/promotions?_=${Date.now()}` })
  if (response.statusCode >= 400) throw new Error('優惠資料暫時無法載入')
  return (response.data as { data: PublicPromotion[] }).data
}

export async function redeemPromotionCode(couponCode: string): Promise<{ promotion: PublicPromotion; message: string }> {
  const response = await uni.request({ url: `${API_BASE_URL}/promotions/redeem`, method: 'POST', data: { couponCode } })
  if (response.statusCode >= 400) throw new Error((response.data as { message?: string })?.message || '優惠代碼兌換失敗')
  const data = response.data as { data: PublicPromotion; message: string }
  return { promotion: data.data, message: data.message }
}
export type MileageLedger = { id: string; amount: number; balanceAfter: number; type: 'EARN' | 'REDEEM' | 'EXPIRE' | 'ADJUST' | 'REFUND'; reason: string; expiresAt: string | null; createdAt: string }
export type MileageReward = { id: string; name: string; description: string; cost: number; enabled: boolean; stock: number | null }
export type MileageSummary = { balance: number; lifetimeEarned: number; lifetimeRedeemed: number; monthlyEarned: number; yearlyEarned: number; expiringAmount: number; expiringAt: string | null; ledger: MileageLedger[]; rewards: MileageReward[] }

export async function getMileageSummary(): Promise<MileageSummary> {
  const response = await uni.request({ url: `${API_BASE_URL}/client/mileage/summary`, header: authHeaders() })
  if (response.statusCode >= 400) throw apiError(response, '無法載入會員里程')
  return response.data as MileageSummary
}

export async function redeemMileageReward(rewardId: string): Promise<{ data: { id: string }; message: string }> {
  const response = await uni.request({ url: `${API_BASE_URL}/client/mileage/redeem`, method: 'POST', header: authHeaders(), data: { rewardId } })
  if (response.statusCode >= 400) throw apiError(response, '里程兌換失敗')
  return response.data as { data: { id: string }; message: string }
}

export type CardNetwork = 'visa' | 'mastercard' | 'unionpay' | 'amex' | 'jcb' | 'unknown'

export type CardIdentification = {
  network: CardNetwork
  valid: boolean
  maskedNumber: string
}

export async function identifyPaymentCard(cardNumber: string): Promise<CardIdentification> {
  const response = await uni.request({
    url: `${API_BASE_URL}/payment-cards/identify`,
    method: 'POST',
    data: { cardNumber: cardNumber.replace(/\D/g, '') }
  })
  if (response.statusCode >= 400) throw new Error('銀行卡號暫時無法識別')
  return response.data as CardIdentification
}

export type SupportMessage = {
  id: string
  direction: 'inbound' | 'outbound' | string
  content: { type?: string; text?: string } | string
  createdAt: string
}

let supportToken = ''

async function supportRequest<T>(path: string, options: { method?: 'GET' | 'POST'; data?: unknown } = {}): Promise<T> {
  const response = await uni.request({
    url: `${API_BASE_URL}/support${path}`,
    method: options.method || 'GET',
    data: options.data as string | AnyObject | ArrayBuffer | undefined,
    header: supportToken ? { Authorization: `Bearer ${supportToken}` } : {}
  })
  if (response.statusCode >= 400) throw new Error((response.data as { message?: string })?.message || '客服服務暫時無法使用')
  return response.data as T
}

export async function startSupportSession(riderId: string, displayName?: string) {
  const result = await supportRequest<{ token: string; expiresAt: string }>('/session', { method: 'POST', data: { riderId, displayName } })
  supportToken = result.token
  return result
}

export async function listSupportMessages(): Promise<SupportMessage[]> {
  const result = await supportRequest<{ data: SupportMessage[] }>('/messages')
  return result.data
}

export async function sendSupportMessage(text: string): Promise<SupportMessage> {
  const clientId = `master-travel-project-${Date.now()}-${Math.random().toString(36).slice(2)}`
  return supportRequest<SupportMessage>('/messages', { method: 'POST', data: { text, clientId } })
}

export type WalletInfo = {
  id: string
  name: string
  phone: string
  email?: string
  memberLevel: string
  fareBalance: number
  cashBalance: number
  walletCurrency: 'RMB'
  totalBalance: number
}

export async function getWalletMe(userIdOrPhone?: string): Promise<WalletInfo> {
  const url = userIdOrPhone
    ? `${API_BASE_URL}/wallet/me?userId=${encodeURIComponent(userIdOrPhone)}`
    : `${API_BASE_URL}/wallet/me`
  const response = await uni.request({ url, header: authHeaders() })
  if (response.statusCode >= 400) throw apiError(response, '無法獲取錢包餘額')
  return response.data as WalletInfo
}

export async function topUpWallet(params: {
  amount: number
  balanceType?: 'fare' | 'cash'
  channel?: string
  userId?: string
}): Promise<{ ok: boolean; user: WalletInfo; transaction: unknown }> {
  const response = await uni.request({
    url: `${API_BASE_URL}/wallet/top-up`,
    method: 'POST',
    header: authHeaders(),
    data: { amount: params.amount, method: params.channel }
  })
  if (response.statusCode >= 400) throw apiError(response, '增值失敗')
  return response.data as { ok: boolean; user: WalletInfo; transaction: unknown }
}

export type TripPassenger = {
  name: string
  phone: string
  phoneRegion: string
  gender?: string | null
  documentType?: string | null
  passportCountry?: string | null
}

export type TripAddress = {
  region?: string | null
  city?: string | null
  district?: string | null
  place?: string | null
  detail?: string | null
}

export type TripPayRequest = {
  userId?: string
  quoteId: string
  useFareBalance?: boolean
  useCashBalance?: boolean
  externalPaymentMethod?: 'internal'
  origin?: string
  destination?: string
  originAddress?: TripAddress
  destinationAddress?: TripAddress
  scheduledAt?: string
  passenger?: TripPassenger
}

export type TripPayResult = {
  ok: boolean
  tripId: string
  quoteId: string
  total: number
  currency: string
  paidSummary: {
    fareBalance: number
    cashBalance: number
    external: number
    externalMethod: string | null
  }
  user: {
    id: string
    fareBalance: number
    cashBalance: number
  }
}

export type CreatePendingTripRequest = {
  quoteId: string
  origin?: string
  destination?: string
  originAddress?: TripAddress
  destinationAddress?: TripAddress
  scheduledAt?: string
  durationSeconds?: number
  passenger?: TripPassenger
}

export type CreatePendingTripResult = {
  ok: boolean
  tripId: string
  quoteId: string
  status: 'PENDING'
}

export async function createPendingTrip(params: CreatePendingTripRequest): Promise<CreatePendingTripResult> {
  const response = await uni.request({
    url: `${API_BASE_URL}/payments/trip-pending`,
    method: 'POST',
    data: params,
    header: authHeaders()
  })
  if (response.statusCode >= 400) throw apiError(response, '待付款訂單建立失敗')
  return response.data as CreatePendingTripResult
}

export async function payTrip(params: TripPayRequest): Promise<TripPayResult> {
  const response = await uni.request({
    url: `${API_BASE_URL}/payments/trip-pay`,
    method: 'POST',
    data: params,
    header: authHeaders()
  })
  if (response.statusCode >= 400) throw apiError(response, '支付失敗')
  return response.data as TripPayResult
}

export type ClientPayment = {
  id: string
  tripId: string
  total: number
  currency: string
  status: 'PAID' | 'REFUNDED'
  fareAmount: number
  cashAmount: number
  externalAmount: number
  externalPaymentMethod: string | null
  createdAt: string
  refundedAt: string | null
  trip: { origin: string; destination: string; status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' }
}

export type ClientTrip = {
  id: string
  quoteId: string | null
  origin: string
  destination: string
  originAddress: TripAddress | null
  destinationAddress: TripAddress | null
  region: string
  scheduledAt: string
  estimatedArrivalAt: string | null
  quote?: { total: number; currency: string; lines: Array<{ type: string; label: string; totalAmount: number; currency: string }> } | null
  passenger: { name: string; gender: string | null; countryCode: string; phoneNumber: string }
  vehicle: { id: string; categoryId: string | null; categoryName: string | null; brand: string; model: string; series: string; seats: number; modelChoiceLabel: string; logo: string | null } | null
  createdAt: string
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'
  executionPhase: 'WAITING_DRIVER' | 'DRIVER_PENDING_ACCEPTANCE' | 'DRIVER_ASSIGNED' | 'IN_PROGRESS' | null
  driver: { name: string; phone: string; vehiclePlate: string | null; hkPlate: string | null; macauPlate: string | null; mainlandPlate: string | null } | null
  assignedAt: string | null
  acceptedAt: string | null
  arrivedAt: string | null
  startedAt: string | null
  completedAt: string | null
  paymentExpiresAt: string | null
  assignmentExpiresAt: string
  assignmentExpired: boolean
  payment: Omit<ClientPayment, 'tripId' | 'refundedAt' | 'trip'> & { refundedAt?: string | null } | null
}

function normalizeClientTrip(trip: ClientTrip): ClientTrip {
  return trip.vehicle
    ? { ...trip, vehicle: { ...trip.vehicle, logo: resolvePublicAssetUrl(trip.vehicle.logo) || null } }
    : trip
}

export async function listClientTrips(): Promise<ClientTrip[]> {
  const response = await uni.request({ url: `${API_BASE_URL}/client/trips`, header: authHeaders() })
  if (response.statusCode >= 400) throw apiError(response, '無法載入訂單')
  return (response.data as { data: ClientTrip[] }).data.map(normalizeClientTrip)
}

export async function getClientTrip(id: string): Promise<ClientTrip> {
  const response = await uni.request({ url: `${API_BASE_URL}/client/trips/${encodeURIComponent(id)}`, header: authHeaders() })
  if (response.statusCode === 404) throw new Error('訂單不存在或無權查看')
  if (response.statusCode >= 400) throw apiError(response, '無法載入訂單')
  return normalizeClientTrip(response.data as ClientTrip)
}

export async function cancelClientTrip(id: string): Promise<ClientTrip> {
  const response = await uni.request({ url: `${API_BASE_URL}/client/trips/${encodeURIComponent(id)}/cancel`, method: 'POST', header: authHeaders() })
  if (response.statusCode >= 400) throw apiError(response, '訂單取消失敗')
  return response.data as ClientTrip
}

export async function listClientTransactions(): Promise<ClientPayment[]> {
  const response = await uni.request({ url: `${API_BASE_URL}/client/transactions`, header: authHeaders() })
  if (response.statusCode >= 400) throw apiError(response, '無法載入交易紀錄')
  return (response.data as { data: ClientPayment[] }).data
}

export type { CrossBorderTrip }
