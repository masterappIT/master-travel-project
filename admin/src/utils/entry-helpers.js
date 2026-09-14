import { computed } from 'vue'

export function generateRandomCouponCodeStr() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length))
  return `PROMO${code}`
}

export function createTimeOptions() {
  return Array.from({ length: 48 }, (_, index) => `${String(Math.floor(index / 2)).padStart(2, '0')}:${index % 2 ? '30' : '00'}`)
}

export function createOperationsDisplay({ trips, charterOrders, expenseItems }) {
  const incomeRows = computed(() => [...trips.value.map((item, index) => ({ id: item.id, date: item.scheduledAt, category: '接送服務', description: `${item.origin} → ${item.destination}`, amount: 680 + index * 120 })), ...charterOrders.value.map(item => ({ id: item.id, date: item.scheduledAt, category: '包車服務', description: `${item.origin} → ${item.destination}`, amount: item.durationHours * 500 }))])
  const incomeTotal = computed(() => incomeRows.value.reduce((total, item) => total + (Number(item.amount) || 0), 0))
  const expenseTotal = computed(() => expenseItems.value.reduce((total, item) => total + (Number(item.amount) || 0), 0))
  return { incomeRows, incomeTotal, expenseTotal }
}
