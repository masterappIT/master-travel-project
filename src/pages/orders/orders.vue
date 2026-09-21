<template>
  <view class="page" :style="responsiveStyle">
    <view class="header">
      <OrdersBackButton @tap="goBack" />
      <text class="title">全部訂單</text>
      <view class="tabs">
        <view v-for="tab in tabs" :key="tab.value" :class="['tab', { active: activeTab === tab.value }]" @tap="activeTab = tab.value">
          <text>{{ tab.label }}</text><image v-if="activeTab === tab.value" src="/static/orders/tab-line.svg" mode="fill" />
        </view>
      </view>
    </view>
    <scroll-view class="content" scroll-y :show-scrollbar="false">
      <view v-if="orderGroups.length" class="order-groups">
        <view v-for="group in orderGroups" :key="group.key" class="order-group">
          <text class="date">{{ group.label }}</text>
          <view class="orders-list">
            <view v-for="order in group.orders" :key="order.id" class="order-card" @tap="openOrder(order)">
              <view class="status"><image :src="statusIcon(order.status)" mode="aspectFit" /><text :class="{ 'in-progress': order.status === '進行中', 'pending-status': order.status === '待確認', 'cancelled-status': order.status === '取消', 'traveling-status': order.status === '待出行' }">{{ order.status }}</text></view>
              <text v-if="order.status === '待確認'" class="countdown">交易時間剩餘：{{ order.countdown }}</text>
              <view v-if="order.status === '待確認'" class="payment">待付款</view>
              <text v-else-if="order.status === '待出行' || order.status === '已完成'" class="price">{{ formatAmount(order.total, order.currency) }}</text>
              <view v-else-if="order.status === '取消' && order.payment" :class="['payment', { refunded: order.payment === '已退款', 'refund-pending': order.payment === '退款申請中' }]">{{ order.payment }}</view>
              <view class="route"><text>{{ order.origin || '香港' }}</text><image src="/static/orders/route-arrow.svg" mode="aspectFit" /><text>{{ order.destination || '深圳' }}</text><text :class="['order-kind', { urgent: order.kind === '加急訂單' }]">（{{ order.kind }}）</text></view>
              <text class="pickup">預約時間 ：{{ formatDateTime(order.scheduledAt) }}</text>
              <text class="arrival">預計到達時間 ：{{ formatDateTime(order.estimatedArrivalAt || order.scheduledAt) }}</text>
              <view class="divider" /><text class="vehicle">{{ order.vehicleTitle || '高級跨境商務車' }}（{{ order.seats || 7 }}座）</text>
            </view>
          </view>
        </view>
      </view><view class="bottom-space" />
    </scroll-view>
  </view>
</template>
<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useResponsiveCanvas } from '../../composables/useResponsiveCanvas'
import { openCachedPage, cachedPagePath, setOrderReturnTarget } from '../../utils/navigation'
import { listClientTrips, type ClientTrip } from '../../services/api'
import { listStoredOrders, type StoredTripOrder } from '../../utils/orderStore'
import { formatOrderCardAddress } from '../../utils/orderAddress'
import OrdersBackButton from '../../components/orders/OrdersBackButton.vue'
type Tab = 'all' | 'completed' | 'cancelled'
type OrderStatus = '已完成' | '待確認' | '待出行' | '取消' | '進行中'
interface Order { id: string; status: OrderStatus; kind: '加急訂單' | '預約訂單'; countdown?: string; payment?: '已付款' | '已退款' | '退款申請中'; origin: string; destination: string; scheduledAt: string; estimatedArrivalAt?: string | null; paymentExpiresAt?: string | null; createdAt: string; vehicleTitle: string; seats: number; total: number; currency: string }
const { responsiveStyle } = useResponsiveCanvas()
const orders = ref<Order[]>([])
let loadingOrders: Promise<void> | null = null

let countdownTimer: ReturnType<typeof setInterval> | null = null
const addressLabel = (value: Parameters<typeof formatOrderCardAddress>[0], fallback: string) => formatOrderCardAddress(value, fallback)
const formatCountdown = (expiresAt?: string | null) => {
  const expiry = expiresAt ? new Date(expiresAt).getTime() : NaN
  const seconds = Number.isFinite(expiry) ? Math.max(0, Math.floor((expiry - Date.now()) / 1000)) : 0
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}
const refreshCountdowns = () => {
  orders.value = orders.value.map((order) => order.status === '待確認' ? { ...order, countdown: formatCountdown(order.paymentExpiresAt) } : order)
}
const startCountdownRefresh = () => {
  if (countdownTimer) clearInterval(countdownTimer)
  refreshCountdowns()
  countdownTimer = setInterval(refreshCountdowns, 1000)
}
const statusText = (trip: ClientTrip): OrderStatus => {
  if (trip.status === 'CONFIRMED' && trip.executionPhase === 'IN_PROGRESS') return '進行中'
  return ({ PENDING: '待確認', CONFIRMED: '待出行', COMPLETED: '已完成', CANCELLED: '取消' } as const)[trip.status]
}
const storedOrderToView = (order: StoredTripOrder): Order => ({
  id: order.id,
  status: order.status,
  kind: order.kind,
  payment: order.payment === '待付款' ? undefined : order.payment,
  origin: addressLabel(order.origin, '香港'),
  destination: addressLabel(order.destination, '深圳'),
  scheduledAt: order.scheduledAt,
  estimatedArrivalAt: order.scheduledAt,
  paymentExpiresAt: order.paymentExpiresAt,
  createdAt: order.createdAt,
  vehicleTitle: order.vehicleTitle,
  seats: order.seats,
  total: order.total,
  currency: order.currency
})
const loadOrders = async () => {
  if (loadingOrders) return loadingOrders
  loadingOrders = (async () => {
    try {
      const trips = await listClientTrips()
      orders.value = trips.map((trip) => ({
      id: trip.id,
      status: statusText(trip),
      kind: '預約訂單',
      countdown: trip.status === 'PENDING' ? formatCountdown(trip.paymentExpiresAt) : undefined,
      paymentExpiresAt: trip.paymentExpiresAt,
      payment: trip.payment?.status === 'REFUNDED' || trip.payment?.refundedAt ? '已退款' : trip.status === 'CANCELLED' && trip.payment ? '退款申請中' : trip.payment ? '已付款' : undefined,
      origin: addressLabel(trip.originAddress || trip.origin, '香港'),
      destination: addressLabel(trip.destinationAddress || trip.destination, '深圳'),
      scheduledAt: trip.scheduledAt,
      estimatedArrivalAt: trip.estimatedArrivalAt,
      createdAt: trip.createdAt,
      vehicleTitle: trip.vehicle?.categoryName || '跨境商務車',
      seats: trip.vehicle?.seats || 0,
      total: trip.quote?.total || trip.payment?.total || 0,
    currency: trip.quote?.currency || trip.payment?.currency || 'RMB¥'    }))
    startCountdownRefresh()
    } catch (error) {
      orders.value = listStoredOrders().map(storedOrderToView)
      startCountdownRefresh()
      if (!orders.value.length) {
        uni.showToast({ title: error instanceof Error ? error.message : '訂單載入失敗', icon: 'none' })
      }
    } finally {
      loadingOrders = null
    }
  })()
  return loadingOrders
}
onShow(() => { void loadOrders() })
onMounted(() => { void loadOrders() })
watch(cachedPagePath, (path, previousPath) => {
  if (path === '/pages/orders/orders' && previousPath !== path) void loadOrders()
})
onUnmounted(() => { if (countdownTimer) clearInterval(countdownTimer) })
const activeTab = ref<Tab>('all')
const tabs: Array<{ label: string; value: Tab }> = [{ label: '全部', value: 'all' }, { label: '已完成', value: 'completed' }, { label: '取消', value: 'cancelled' }]
const visibleOrders = computed(() => activeTab.value === 'completed' ? orders.value.filter((order) => order.status === '已完成') : activeTab.value === 'cancelled' ? orders.value.filter((order) => order.status === '取消') : orders.value)
const statusIcon = (status: OrderStatus) => status === '進行中' ? '/static/orders/status-green.svg' : status === '已完成' || status === '待出行' ? '/static/orders/status-blue.svg' : status === '待確認' ? '/static/orders/status-pending.svg' : '/static/orders/status-gray.svg'
const formatAmount = (amount = 0, currency = 'HKD') => `${currency.includes('HKD') ? 'HK$' : currency.includes('RMB') ? 'RMB¥' : currency} ${amount.toFixed(2)}`
const formatDateTime = (value?: string) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.valueOf())) return value
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}
const formatOrderDate = (value?: string) => {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.valueOf()) ? value : `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}
const orderGroups = computed(() => {
  const groups = new Map<string, { key: string; label: string; orders: Order[] }>()
  visibleOrders.value.forEach((order) => {
    const date = new Date(order.scheduledAt)
    const validDate = !Number.isNaN(date.valueOf())
    const key = validDate ? `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}` : order.scheduledAt
    const group = groups.get(key) || { key, label: formatOrderDate(order.scheduledAt), orders: [] }
    group.orders.push(order)
    groups.set(key, group)
  })
  return Array.from(groups.values())
})
const openOrder = (order: Order) => {
  if (order.status === '已完成' || order.status === '取消' || order.status === '待確認' || order.status === '待出行' || order.status === '進行中') {
    setOrderReturnTarget('orders')
    if (order.status === '取消') return openCachedPage(`/pages/orders/cancelled-detail?id=${encodeURIComponent(String(order.id))}`)
    if (order.status === '待確認') return openCachedPage(`/pages/orders/pending-detail?id=${encodeURIComponent(String(order.id))}`)
    if (order.status === '待出行' || order.status === '進行中') return openCachedPage(`/pages/orders/traveling-detail?id=${encodeURIComponent(String(order.id))}`)
    return openCachedPage(`/pages/orders/completed-detail?status=completed&from=orders&id=${encodeURIComponent(String(order.id))}`)
  }
}
const goBack = () => openCachedPage('/pages/trips/trips')
</script>
<style scoped>
:global(html),:global(body),:global(#app){width:100%;min-width:0;height:100%;margin:0;overflow:hidden;overscroll-behavior:none}.page{position:fixed;top:0;left:0;width:430px;height:var(--mobile-height, 932px);overflow:hidden;border-radius:35px;background:#f0f2f5;color:#38434a;font-family:'Noto Sans TC',sans-serif;transform:scale(var(--mobile-scale, 1));transform-origin:top left}.header{position:absolute;z-index:2;top:0;left:0;width:430px;height:155px;overflow:hidden;border-radius:25px;background:#fff}.title{position:absolute;top:56px;left:50%;transform:translateX(-50%);font-size:18px;font-weight:500;line-height:27px;white-space:nowrap}.tabs{position:absolute;top:123px;left:49px;width:332px;height:32px;display:flex;justify-content:space-between}.tab{position:relative;height:32px;color:#38434a;font-size:16px;font-weight:700;line-height:23px}.tab.active{color:#285cfc}.tab image{position:absolute;bottom:0;left:50%;width:32px;height:2px;transform:translateX(-50%)}.content{position:absolute;top:155px;left:0;width:430px;height:calc(100% - 155px)}.order-groups,.order-group{display:flex;flex-direction:column}.order-group+.order-group{margin-top:10px}.date{display:block;height:23px;margin:6px 0 10px 17px;font-size:16px;line-height:23px}.orders-list{display:flex;flex-direction:column;gap:10px}.order-card{position:relative;width:430px;height:240px;flex:none;overflow:hidden;background:#fff;font-size:14px}.status{position:absolute;top:21px;left:30px;height:25px;display:flex;align-items:center;gap:5px;color:#285cfc;font-size:16px;font-weight:700}.status image{width:25px;height:25px}.status .in-progress{color:#1effaa}.status .pending-status,.status .cancelled-status{color:#38434a}.status .traveling-status{color:#285cfc}.countdown{position:absolute;top:24px;right:108px;font-weight:300;line-height:20px;white-space:nowrap}.payment{position:absolute;top:19px;right:30px;padding:5px 10px;border:1px solid #f95c5c;border-radius:10px;box-sizing:border-box;color:#f95c5c;font-weight:700;line-height:20px}.payment.refunded,.payment.refund-pending{border-color:#f95c5c;color:#f95c5c;font-weight:700}.price{position:absolute;top:23px;right:30px;color:#285cfc;font-weight:700;line-height:20px}.route{position:absolute;top:57px;left:72px;height:25px;display:flex;align-items:center;gap:15px;line-height:20px}.route image{width:25px;height:25px}.order-kind{margin-left:1px}.order-kind.urgent{color:#f95c5c}.pickup,.arrival,.vehicle{position:absolute;left:70px;line-height:20px;white-space:nowrap}.pickup{top:89px}.arrival{top:114px}.divider{position:absolute;top:162px;left:30px;width:370px;height:1px;background:#d9d9d9}.vehicle{top:170px;color:#000;font-weight:300}.bottom-space{height:12px}@media (max-width:599px){.page{top:0;left:0;height:var(--mobile-height,100dvh);border-radius:0;transform:scale(var(--mobile-scale,1));transform-origin:top left}}
</style>
