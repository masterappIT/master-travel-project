import { openCachedPage } from './navigation'

type SupportOrder = {
  id: string
  status: string
  executionPhase?: string | null
}

export const supportOrderStatusLabel = (order: SupportOrder) => {
  if (order.status === 'CANCELLED') return '已取消'
  if (order.status === 'COMPLETED') return '已完成'
  if (order.status === 'PENDING') return '待確認'
  if (order.executionPhase === 'IN_PROGRESS') return '行程進行中'
  if (order.executionPhase === 'DRIVER_ASSIGNED') return '司機已安排'
  return '待出行'
}

export const openOrderSupport = (order?: SupportOrder | null) => {
  if (!order?.id) return openCachedPage('/pages/support/chat')
  const query = `orderId=${encodeURIComponent(order.id)}&orderStatus=${encodeURIComponent(supportOrderStatusLabel(order))}`
  return openCachedPage(`/pages/support/chat?${query}`)
}
