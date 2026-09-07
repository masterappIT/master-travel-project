import type { CrossBorderTrip } from '../../../shared/types/trip'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'

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

export type LocationDetails = { city: string; address: string; district?: string }

export async function reverseGeocode(latitude: number, longitude: number): Promise<LocationDetails> {
  const response = await uni.request({ url: `${API_BASE_URL}/location/reverse-geocode`, data: { latitude, longitude } })
  return response.data as LocationDetails
}

export type RecommendedAddress = {
  id: string
  region: '大陸' | '香港' | '澳門'
  name: string
  address: string
  enabled: boolean
  order: number
}

export async function listRecommendedAddresses(): Promise<RecommendedAddress[]> {
  const response = await uni.request({ url: `${API_BASE_URL}/recommended-addresses` })
  if (response.statusCode >= 400) throw new Error('推薦地址暫時無法載入')
  return (response.data as { data: RecommendedAddress[] }).data
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
