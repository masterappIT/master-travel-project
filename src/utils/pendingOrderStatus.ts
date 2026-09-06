import { ref } from 'vue'

export type OrderStatus = '待確認' | '取消'

const STORAGE_KEY = 'taxi-pending-order-status'
const pendingOrderStatus = ref<OrderStatus>('待確認')

const readStoredStatus = () => {
  try {
    const stored = uni.getStorageSync(STORAGE_KEY)
    if (stored === '取消' || stored === '待確認') pendingOrderStatus.value = stored
  } catch {
    // Storage is unavailable in some preview environments; keep the default state.
  }
}

export const usePendingOrderStatus = () => {
  const setStatus = (status: OrderStatus) => {
    pendingOrderStatus.value = status
    try {
      uni.setStorageSync(STORAGE_KEY, status)
    } catch {
      // The in-memory state still keeps the current session consistent.
    }
  }

  return { status: pendingOrderStatus, setStatus, readStoredStatus }
}
