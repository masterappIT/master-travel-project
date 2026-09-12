import type { FareQuote } from '../services/api'

export type StoredTripOrderStatus = '待確認' | '待出行' | '進行中' | '已完成' | '取消'

export interface StoredTripOrder {
  id: string
  tripId?: string
  status: StoredTripOrderStatus
  kind: '加急訂單' | '預約訂單'
  origin: string
  destination: string
  scheduledAt: string
  paymentExpiresAt?: string | null
  vehicleTitle: string
  seats: number
  total: number
  currency: string
  payment: '待付款' | '已付款' | '已退款'
  createdAt: string
}

const STORAGE_KEY = 'master-travel-project-orders'

const readOrders = (): StoredTripOrder[] => {
  try {
    const value = uni.getStorageSync(STORAGE_KEY)
    return Array.isArray(value) ? value as StoredTripOrder[] : []
  } catch {
    return []
  }
}

export const listStoredOrders = () => readOrders()

export const getStoredOrder = (id?: string) => id ? readOrders().find(order => order.id === id || order.tripId === id) : undefined

export const updateStoredOrderStatus = (id: string, status: StoredTripOrderStatus, payment?: StoredTripOrder['payment']) => {
  const orders = readOrders().map(order => order.id === id || order.tripId === id ? { ...order, status, payment: payment || order.payment } : order)
  try { uni.setStorageSync(STORAGE_KEY, orders) } catch {}
  return orders.find(order => order.id === id || order.tripId === id)
}

export const savePaidOrder = (input: {
  tripId?: string
  origin: string
  destination: string
  scheduledAt?: string
  quote: FareQuote
  urgent?: boolean
}) => {
  const vehicle = input.quote.vehicle
  const order: StoredTripOrder = {
    id: input.tripId || `local-${Date.now()}`,
    tripId: input.tripId,
    status: '待出行',
    kind: input.urgent ? '加急訂單' : '預約訂單',
    origin: input.origin,
    destination: input.destination,
    scheduledAt: input.scheduledAt || new Date().toISOString(),
    vehicleTitle: vehicle ? `${vehicle.brand} ${vehicle.model}` : '高級跨境商務車',
    seats: vehicle?.seats || 7,
    total: input.quote.total,
    currency: input.quote.currency,
    payment: '已付款',
    createdAt: new Date().toISOString()
  }
  const orders = [order, ...readOrders().filter(item => item.id !== order.id)].slice(0, 50)
  try {
    uni.setStorageSync(STORAGE_KEY, orders)
  } catch {
    // Keep the payment flow usable in preview environments without storage.
  }
  return order
}
