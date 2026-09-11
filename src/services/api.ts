import type { CrossBorderTrip } from '../../shared/types/trip'
import { clearAuthentication, getAuthToken } from '../utils/auth'

let API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:3010'
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

export type PhoneAuthChallenge = {
  challengeId: string
  expiresAt: string
  developmentCode?: string
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

export async function verifyPhoneVerificationCode(challengeId: string, code = '', developmentCode?: string): Promise<AuthResult> {
  const response = await uni.request({
    url: `${API_BASE_URL}/auth/phone/verify`,
    method: 'POST',
    data: { challengeId, code, developmentCode }
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

export async function getHealth(): Promise<{ status: string }> {
  const response = await uni.request({ url: `${API_BASE_URL}/health` })
  return response.data as { status: string }
}

export type AppSettings = {
  language: string
  region: string
  currency: string
  pricingCurrency?: string
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

export type PublicVehicleCategory = { id: string; name: string; tabLabel: string; order: number; enabled: boolean }
export type PublicVehicle = {
  id: string
  categoryId: string | null
  brand: string
  model: string
  series: string
  seats: number
  image: string
  colorLabel: string
  modelChoiceLabel: string
  enabled: boolean
  order: number
}
export type PublicVehicleExtra = { id: string; name: string; label: string; price: number; currency: string; enabled: boolean; order: number; requiredForImmediate: boolean; requiredWithinMinutes: number | null; triggerType: 'NONE' | 'IMMEDIATE' | 'NIGHT' | 'WEATHER'; triggerEnabled: boolean; nightStartTime: string | null; nightEndTime: string | null }
export type PublicVehicleCatalog = { categories: PublicVehicleCategory[]; data: PublicVehicle[]; extras: PublicVehicleExtra[]; severeWeatherEnabled: boolean }

export async function listPublicVehicles(): Promise<PublicVehicleCatalog> {
  const response = await uni.request({ url: `${API_BASE_URL}/vehicles` })
  if (response.statusCode >= 400) throw new Error('車型資料暫時無法載入')
  return response.data as PublicVehicleCatalog
}

export type FareQuote = {
  id: string
  distanceMeters: number
  distanceKm: number
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

export async function createFareQuote(input: { categoryId: string; vehicleId: string; distanceMeters: number; extraIds?: string[]; displayCurrency?: 'RMB' | 'HKD'; couponCode?: string; originRegion?: string; originCity?: string; destinationRegion?: string; destinationCity?: string; scheduledAt?: string }): Promise<FareQuote> {
  const response = await uni.request({ url: `${API_BASE_URL}/quotes`, method: 'POST', data: input })
  if (response.statusCode >= 400) throw new Error((response.data as { message?: string })?.message || '報價暫時無法取得')
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

export type MembershipPlan = { id: string; level: string; name: string; monthly: number; yearly: number; recommended: boolean; benefits: string[]; enabled: boolean; order: number }

export async function listMembershipPlans(): Promise<MembershipPlan[]> {
  const response = await uni.request({ url: `${API_BASE_URL}/membership-plans` })
  if (response.statusCode >= 400) throw new Error('會員方案暫時無法載入')
  return (response.data as { data: MembershipPlan[] }).data
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
}): Promise<{ message: string; data: WalletInfo }> {
  const response = await uni.request({
    url: `${API_BASE_URL}/wallet/top-up`,
    method: 'POST',
    data: params
  })
  if (response.statusCode >= 400) throw apiError(response, '增值失敗')
  return response.data as { message: string; data: WalletInfo }
}

export type TripPayRequest = {
  userId?: string
  quoteId: string
  useFareBalance?: boolean
  useCashBalance?: boolean
  externalPaymentMethod?: 'internal'
  origin?: string
  destination?: string
  scheduledAt?: string
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
  origin: string
  destination: string
  region: string
  scheduledAt: string
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'
  createdAt: string
  payment: Omit<ClientPayment, 'tripId' | 'refundedAt' | 'trip'> & { refundedAt?: string | null } | null
}

export async function listClientTrips(): Promise<ClientTrip[]> {
  const response = await uni.request({ url: `${API_BASE_URL}/client/trips`, header: authHeaders() })
  if (response.statusCode >= 400) throw apiError(response, '無法載入訂單')
  return (response.data as { data: ClientTrip[] }).data
}

export async function getClientTrip(id: string): Promise<ClientTrip> {
  const response = await uni.request({ url: `${API_BASE_URL}/client/trips/${encodeURIComponent(id)}`, header: authHeaders() })
  if (response.statusCode === 404) throw new Error('訂單不存在或無權查看')
  if (response.statusCode >= 400) throw apiError(response, '無法載入訂單')
  return response.data as ClientTrip
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
