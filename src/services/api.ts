import type { CrossBorderTrip } from '../../../shared/types/trip'

let API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:3010'
// #ifdef H5
API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'
// #endif

export async function getHealth(): Promise<{ status: string }> {
  const response = await uni.request({ url: `${API_BASE_URL}/health` })
  return response.data as { status: string }
}

export type AppSettings = { language: string; region: string; currency: string; exchangeRate?: number }

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
  return response.data as LocationDetails
}

export async function searchPlaces(keyword: string, region?: string, city?: string): Promise<PlaceSearchResult[]> {
  const response = await uni.request({
    url: `${API_BASE_URL}/location/search`,
    data: { keyword, region: region || '', city: city || '' }
  })
  if (response.statusCode === 403) throw new Error('未開通服務')
  if (response.statusCode >= 400) throw new Error('位置搜索暫時無法使用')
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
  if (response.statusCode >= 400) throw new Error('路線規劃暫時無法使用')
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
export type PublicVehicleExtra = { id: string; name: string; label: string; price: number; currency: string; enabled: boolean; order: number }
export type PublicVehicleCatalog = { categories: PublicVehicleCategory[]; data: PublicVehicle[]; extras: PublicVehicleExtra[] }

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
  lines: Array<{ type: string; sourceId: string | null; label: string; quantity: number; unitAmount: number; totalAmount: number; currency: string; order: number }>
}

export async function createFareQuote(input: { categoryId: string; vehicleId: string; distanceMeters: number; extraIds?: string[]; displayCurrency?: 'RMB' | 'HKD' }): Promise<FareQuote> {
  const response = await uni.request({ url: `${API_BASE_URL}/quotes`, method: 'POST', data: input })
  if (response.statusCode >= 400) throw new Error((response.data as { message?: string })?.message || '報價暫時無法取得')
  return response.data as FareQuote
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
    data: options.data,
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

export type { CrossBorderTrip }
