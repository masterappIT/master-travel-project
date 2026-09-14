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
      <text v-if="visibleOrders.length" class="date">{{ formatOrderDate(visibleOrders[0].createdAt || visibleOrders[0].scheduledAt) }}</text>
      <view v-if="visibleOrders.length" class="orders-list">
        <view v-for="order in visibleOrders" :key="order.id" class="order-card" @tap="openOrder(order)">
           <view class="order-topline">
             <view class="status"><image :src="statusIcon(order.status)" mode="aspectFit" /><text :class="{ 'in-progress': order.status === '進行中', 'pending-status': order.status === '待確認', 'cancelled-status': order.status === '取消', 'traveling-status': order.status === '待出行' }">{{ order.status }}</text></view>
             <text v-if="order.status === '待確認'" class="countdown">交易時間剩餘 {{ order.countdown }}</text>
             <view v-if="order.status === '待確認'" class="payment">待付款</view>
             <text v-else-if="order.status === '待出行' || order.status === '已完成'" class="price">{{ formatAmount(order.total, order.currency) }}</text>
             <view v-else-if="order.status === '取消' && order.payment" :class="['payment', { refunded: order.payment === '已退款', 'refund-pending': order.payment === '退款申請中' }]">{{ order.payment }}</view>
           </view>
           <view class="route"><view class="route-point"><text class="route-label">出發地</text><text class="route-name">{{ order.origin || '香港' }}</text></view><image src="/static/orders/route-arrow.svg" mode="aspectFit" /><view class="route-point destination-point"><text class="route-label">目的地</text><text class="route-name">{{ order.destination || '深圳' }}</text></view></view>
           <view class="route-kind" :class="{ urgent: order.kind === '加急訂單' }">{{ order.kind }}</view>
           <view class="schedule"><view><text class="info-label">上車時間</text><text class="info-value">{{ formatDateTime(order.scheduledAt) }}</text></view><view><text class="info-label">預計到達</text><text class="info-value">{{ formatDateTime(order.estimatedArrivalAt || order.scheduledAt) }}</text></view></view>
           <view class="divider" /><view class="vehicle"><text>{{ order.vehicleTitle || '高級跨境商務車' }}</text><text class="vehicle-seats">{{ order.seats || 7 }}座</text></view>
        </view>
      </view><view class="bottom-space" />
    </scroll-view>
  </view>
</template>
<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useResponsiveCanvas } from '../../composables/useResponsiveCanvas'
import { openCachedPage, setOrderReturnTarget } from '../../utils/navigation'
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
const addressLabel = (value: string | undefined, fallback: string) => formatOrderCardAddress(value, fallback)
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
      origin: addressLabel(trip.origin, '香港'),
      destination: addressLabel(trip.destination, '深圳'),
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
const openOrder = (order: Order) => {
  if (order.status === '已完成' || order.status === '取消' || order.status === '待確認' || order.status === '待出行' || order.status === '進行中') {
    setOrderReturnTarget('orders')
    if (order.status === '取消') return openCachedPage(`/pages/orders/cancelled-detail?id=${encodeURIComponent(String(order.id))}`)
    if (order.status === '待確認') return openCachedPage(`/pages/orders/pending-detail?id=${encodeURIComponent(String(order.id))}`)
    if (order.status === '待出行' || order.status === '進行中') return openCachedPage(`/pages/orders/traveling-detail?id=${encodeURIComponent(String(order.id))}`)
    return openCachedPage(`/pages/orders/completed-detail?from=orders&id=${encodeURIComponent(String(order.id))}`)
  }
}
const goBack = () => openCachedPage('/pages/trips/trips')
</script>
<style scoped>
:global(html),:global(body),:global(#app){width:100%;min-width:0;height:100%;margin:0;overflow:hidden;overscroll-behavior:none}.page{position:fixed;top:0;left:0;width:430px;height:var(--mobile-height, 932px);overflow:hidden;border-radius:35px;background:#f0f2f5;color:#38434a;font-family:'Noto Sans TC',sans-serif;transform:scale(var(--mobile-scale, 1));transform-origin:top left}.header{position:absolute;z-index:2;top:0;left:0;width:430px;height:155px;overflow:hidden;border-radius:25px;background:#fff}.title{position:absolute;top:56px;left:50%;transform:translateX(-50%);font-size:18px;font-weight:500;line-height:27px;white-space:nowrap}.tabs{position:absolute;top:123px;left:49px;width:332px;height:32px;display:flex;justify-content:space-between}.tab{position:relative;height:32px;color:#38434a;font-size:16px;font-weight:700;line-height:23px}.tab.active{color:#285cfc}.tab image{position:absolute;bottom:0;left:50%;width:32px;height:2px;transform:translateX(-50%)}.content{position:absolute;top:155px;left:0;width:430px;height:calc(100% - 155px)}.date{display:block;height:23px;margin:14px 18px 10px;color:#68747b;font-size:14px;line-height:23px}.orders-list{display:flex;flex-direction:column;gap:12px;padding:0 15px}.order-card{position:relative;width:400px;height:247px;flex:none;overflow:hidden;border:1px solid #edf0f2;border-radius:25px;background:#fff;box-shadow:0 4px 14px rgba(56,67,74,.06);box-sizing:border-box;font-size:14px}.order-topline{position:absolute;top:18px;left:20px;right:20px;height:28px;display:flex;align-items:center}.status{position:static;height:25px;display:flex;align-items:center;gap:6px;color:#285cfc;font-size:16px;font-weight:700}.status image{width:25px;height:25px}.status .in-progress{color:#13b878}.status .pending-status,.status .cancelled-status{color:#68747b}.status .traveling-status{color:#285cfc}.countdown{margin-left:auto;margin-right:10px;color:#68747b;font-size:12px;line-height:20px;white-space:nowrap}.payment{margin-left:auto;padding:4px 9px;border:1px solid #f95c5c;border-radius:10px;box-sizing:border-box;color:#f95c5c;font-size:13px;font-weight:700;line-height:20px;white-space:nowrap}.price{margin-left:auto;color:#285cfc;font-size:16px;font-weight:700;line-height:20px;white-space:nowrap}.route{position:absolute;top:62px;left:20px;right:20px;height:53px;display:flex;align-items:center;gap:12px}.route image{width:25px;height:25px;flex:none}.route-point{min-width:0;display:flex;flex:1;flex-direction:column;gap:3px}.destination-point{align-items:flex-end;text-align:right}.route-label,.info-label{color:#8a969c;font-size:12px;line-height:18px}.route-name{overflow:hidden;color:#38434a;font-size:16px;font-weight:700;line-height:22px;text-overflow:ellipsis;white-space:nowrap}.route-kind{position:absolute;top:118px;left:20px;color:#68747b;font-size:12px;line-height:18px}.route-kind.urgent{color:#f95c5c}.schedule{position:absolute;top:146px;left:20px;right:20px;display:flex;gap:24px}.schedule>view{display:flex;min-width:0;flex:1;flex-direction:column;gap:2px}.info-value{overflow:hidden;color:#38434a;font-size:13px;line-height:20px;text-overflow:ellipsis;white-space:nowrap}.divider{position:absolute;top:198px;left:20px;width:360px;height:1px;background:#edf0f2}.vehicle{position:absolute;top:211px;left:20px;right:20px;display:flex;align-items:center;justify-content:space-between;color:#38434a;font-size:13px;line-height:20px}.vehicle-seats{color:#68747b}.bottom-space{height:16px}@media (max-width:599px){.page{top:0;left:0;height:var(--mobile-height,100dvh);border-radius:0;transform:scale(var(--mobile-scale,1));transform-origin:top left}.content{top:155px;width:430px;height:calc(100% - 155px)}.orders-list{padding:0 15px}.order-card{width:400px}}
</style>
