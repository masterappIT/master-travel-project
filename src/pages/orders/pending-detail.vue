<template>
  <view class="page" :style="responsiveStyle">
    <view class="header">
      <OrdersBackButton icon-src="/static/orders/traveling-back.svg" @tap="goBack" />
      <text v-if="isTraveling" class="traveling-title">待出行</text>
      <text v-else class="number">訂單編號：{{ orderNumber }}</text>
    </view>
    <template v-if="isTraveling">
      <text class="traveling-order-number">訂單編號：{{ orderNumber }}</text>
      <view class="traveling-card">
        <view class="traveling-status-row">
          <view class="traveling-waiting"><view class="waiting-mark"><image src="/static/orders/traveling-wait-ring.svg" mode="aspectFit" /><image class="waiting-dot" src="/static/orders/traveling-wait-dot.svg" mode="aspectFit" /></view><text>等待中</text></view>
        </view>
        <view class="traveling-summary">
          <image src="/static/orders/traveling-status.svg" mode="aspectFit" />
          <text>正在為您安排司機</text>
          <view class="traveling-confirm"><image src="/static/orders/traveling-clock.svg" mode="aspectFit" /><text>三小時內確認</text></view>
          <text class="confirmation-countdown">{{ confirmationCountdownLabel }}</text>
        </view>
        <view class="traveling-info">
          <image class="traveling-tesla" src="/static/orders/traveling-tesla.svg" mode="aspectFit" />
          <text class="traveling-pickup">出發時間 ：{{ bookingTime }}</text>
          <view :class="['traveling-locations', { 'long-addresses': hasLongAddress, 'origin-long': isLongAddress(originLabel) }]"><view :class="{ 'long-location': isLongAddress(originLabel) }"><image src="/static/orders/traveling-origin.svg" mode="aspectFit" /><text>{{ formatAddressLabel(originLabel) }}</text></view><view :class="{ 'long-location': isLongAddress(destinationLabel) }"><image src="/static/orders/traveling-destination.svg" mode="aspectFit" /><text>{{ formatAddressLabel(destinationLabel) }}</text></view></view>
          <text class="traveling-vehicle">{{ vehicleLabel }}</text>
          <view class="traveling-passenger"><text>乘客及聯絡資料：</text><view><image src="/static/orders/traveling-passenger.svg" mode="aspectFit" /><text>{{ passengerLabel }}</text></view><view><image src="/static/orders/traveling-phone.svg" mode="aspectFit" /><text>{{ passengerPhoneLabel }}</text></view></view>
          <view class="traveling-divider"><image src="/static/orders/traveling-divider.svg" mode="aspectFit" /></view>
          <view class="traveling-divider second"><image src="/static/orders/traveling-divider.svg" mode="aspectFit" /></view>
          <view class="traveling-record" @tap="showPaymentRecords">相關支付紀錄 <image src="/static/orders/traveling-arrow.svg" mode="aspectFit" /></view>
        </view>
      </view>
    </template>
    <template v-else>
      <view class="assist"><image src="/static/orders/help.svg" mode="aspectFit" /><text>訂單協助</text></view>
      <view class="status"><image src="/static/orders/status-pending.svg" mode="aspectFit" /><text>待確認</text></view>
      <view class="traveling-card standard-detail-card pending-card" :class="{ 'long-addresses': hasLongAddress }">
      <view class="locations"><view :class="{ 'long-location': isLongAddress(originLabel) }"><image src="/static/orders/origin.svg" mode="aspectFit" /><text>{{ formatAddressLabel(originLabel) }}</text></view><view :class="{ 'long-location': isLongAddress(destinationLabel) }"><image src="/static/orders/destination.svg" mode="aspectFit" /><text>{{ formatAddressLabel(destinationLabel) }}</text></view></view>
      <view class="times"><text>預約時間 ：{{ bookingTime }}</text><text>預計到達時間 ：{{ arrivalTime }}</text></view>
      <view class="passenger-title">乘客及聯絡資料：</view><view class="passenger"><view><image src="/static/orders/passenger.svg" mode="aspectFit" /><text>{{ passengerLabel }}</text></view><view><image src="/static/orders/phone.svg" mode="aspectFit" /><text>{{ passengerPhoneLabel }}</text></view></view>
      <view :class="['payment', { completed: isCompleted, pending: !isCompleted }]">
        <text v-if="!isCompleted">交易時間剩餘：{{ pendingCountdownLabel }}</text>
        <text class="amount">{{ amountLabel }}</text>
        <view v-if="!isCompleted && !paymentExpired" class="pay-tag" @tap.stop="openPayment">待付款</view>
        <view v-else-if="!isCompleted && paymentExpired" class="expired-tag">取消處理中</view>
        <view v-else class="paid-tag">已付款</view>
      </view>
      <view class="detail"><text class="detail-title">訂單詳細</text><text class="detail-date">{{ detailDateLabel }}</text><view class="line"/><view class="row"><text>{{ vehicleLabel }}</text><text>{{ currencyLabel }} {{ baseFareTotal.toFixed(2) }}</text></view><view v-for="(item, index) in surchargeItems" :key="`extra-${item.sourceId || item.label}-${index}`" class="row"><text>{{ item.label }}</text><text>{{ formatLineAmount(item) }}</text></view><view class="row"><text>優惠券抵扣</text><text>{{ discountLabel }}</text></view><view class="total">Total： {{ currencyLabel }} {{ paymentTotal.toFixed(2) }}</view><view v-if="isCompleted && storedOrder?.payment" class="completed-payment"><view v-if="storedOrder.payment.fareAmount > 0" class="payment-record wallet-record"><image src="/static/vehicles/payment/payment-wallet-fare.svg" mode="aspectFit" /><text>車費餘額</text><text class="record-amount">-{{ currencyLabel }} {{ storedOrder.payment.fareAmount.toFixed(2) }}</text></view><view v-if="storedOrder.payment.cashAmount > 0" class="payment-record wallet-record"><image src="/static/vehicles/payment/payment-wallet-cash.svg" mode="aspectFit" /><text>現金餘額</text><text class="record-amount">-{{ currencyLabel }} {{ storedOrder.payment.cashAmount.toFixed(2) }}</text></view><view v-if="storedOrder.payment.externalAmount > 0" class="payment-record wechat-record"><image src="/static/vehicles/payment/payment-wechat.svg" mode="aspectFit" /><text>{{ paymentMethodLabel }}</text><text class="record-amount">-{{ currencyLabel }} {{ storedOrder.payment.externalAmount.toFixed(2) }}</text></view><view class="record-link" @tap="showPaymentRecords">相關支付紀錄 <text>›</text></view></view><button v-if="!isCompleted" class="cancel" @tap="cancelOrder">取消</button></view>
      </view>
    </template>
    <view v-if="paymentOpen" class="payment-mask" @tap="closePayment">
      <view class="payment-sheet" @tap.stop>
        <image class="payment-close" src="/static/vehicles/payment/payment-close.svg" mode="aspectFit" @tap="closePayment" />
        <text class="payment-title">訂單詳細</text>
        <text class="payment-countdown">交易時間剩餘：{{ pendingCountdownLabel }}</text>
        <view class="payment-amount"><text class="payment-currency">{{ currencyLabel }}</text><text class="payment-number">{{ paymentTotal.toFixed(2) }}</text></view>
        <text class="payment-method-label">支付方式</text>
        <view class="payment-options">
          <view class="payment-option" @tap="walletSelections.fare = !walletSelections.fare"><image src="/static/vehicles/payment/payment-wallet-fare.svg" mode="aspectFit" /><view class="payment-option-copy"><text>車費餘額</text><text class="payment-balance">（{{ formatCurrencyAmount(wallet.fare, normalizeCurrency(storedOrder?.payment?.currency) || 'HKD') }}）</text></view><image class="payment-radio" :src="walletSelections.fare ? '/static/vehicles/payment/payment-radio-selected.svg' : '/static/vehicles/payment/payment-radio-unselected.svg'" mode="aspectFit" /></view>
          <view class="payment-option" @tap="walletSelections.cash = !walletSelections.cash"><image src="/static/vehicles/payment/payment-wallet-cash.svg" mode="aspectFit" /><view class="payment-option-copy"><text>現金餘額</text><text class="payment-balance">（{{ formatCurrencyAmount(wallet.withdrawable, normalizeCurrency(storedOrder?.payment?.currency) || 'HKD') }}）</text></view><image class="payment-radio" :src="walletSelections.cash ? '/static/vehicles/payment/payment-radio-selected.svg' : '/static/vehicles/payment/payment-radio-unselected.svg'" mode="aspectFit" /></view>
        </view>
        <view class="payment-confirm" @tap="confirmPayment">確認支付</view>
      </view>
    </view>
  </view>
</template>
<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, reactive, watch } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { useResponsiveCanvas } from '../../composables/useResponsiveCanvas'
import { useTripStore } from '../../stores/trip'
import { closeCachedPage, cachedPageUrl, cachedPageStack, openCachedPage } from '../../utils/navigation'
import OrdersBackButton from '../../components/orders/OrdersBackButton.vue'
import { formatOrderDetailAddress } from '../../utils/orderAddress'
import { formatCurrencyAmount, normalizeCurrency } from '../../composables/useCurrency'
import { cancelClientTrip, getClientTrip, getFareQuote, getWalletMe, payTrip, type ClientTrip, type FareQuote } from '../../services/api'
import { readWallet } from '../../utils/wallet'
const isCompleted = ref(false)
const paymentOpen = ref(false)
const paymentSettings = reactive({ fareBalancePayEnabled: true, cashBalancePayEnabled: true, wechatPayEnabled: true, alipayPayEnabled: true, bankCardPayEnabled: true })
const wallet = reactive({ ...readWallet(), fare: 0, withdrawable: 0 })
const loadWalletBalances = async () => {
  try {
    const current = await getWalletMe()
    wallet.fare = Number(current.fareBalance) || 0
    wallet.withdrawable = Number(current.cashBalance) || 0
  } catch {
    const cached = readWallet()
    wallet.fare = cached.fare
    wallet.withdrawable = cached.withdrawable
  }
}
const walletSelections = reactive({ fare: true, cash: true })
const selectedPayment = ref<'wechat' | 'alipay' | 'bank'>('wechat')
const paymentQuote = ref<FareQuote | null>(null)
const paymentError = ref('')
const paymentLoading = ref(false)
const paymentCountdown = ref(0)
const confirmationCountdown = ref(3 * 60 * 60)
const paymentExpired = ref(false)
const pendingCountdownLabel = computed(() => `${String(Math.floor(paymentCountdown.value / 60)).padStart(2, '0')}:${String(paymentCountdown.value % 60).padStart(2, '0')}`)
const confirmationCountdownLabel = computed(() => {
  const hours = Math.floor(confirmationCountdown.value / 3600)
  const minutes = Math.floor((confirmationCountdown.value % 3600) / 60)
  const seconds = confirmationCountdown.value % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})
let paymentTimer: ReturnType<typeof setInterval> | null = null
let confirmationTimer: ReturnType<typeof setInterval> | null = null
const refreshPendingCountdown = () => {
  const expiry = storedOrder.value?.paymentExpiresAt ? new Date(storedOrder.value.paymentExpiresAt).getTime() : NaN
  paymentCountdown.value = Number.isFinite(expiry) ? Math.max(0, Math.floor((expiry - Date.now()) / 1000)) : 0
}
let expiringPending = false
const expirePendingOrder = async () => {
  if (expiringPending || !storedOrder.value?.id || storedOrder.value.status !== 'PENDING') return
  expiringPending = true
  if (paymentTimer) { clearInterval(paymentTimer); paymentTimer = null }
  try {
    const cancelled = await cancelClientTrip(storedOrder.value.id)
    storedOrder.value = cancelled
    uni.showToast({ title: '付款時間已結束，訂單已取消', icon: 'none' })
    setTimeout(() => uni.redirectTo({ url: `/pages/orders/cancelled-detail?id=${encodeURIComponent(cancelled.id)}` }), 500)
  } catch (error) {
    expiringPending = false
    uni.showToast({ title: error instanceof Error ? error.message : '訂單自動取消失敗', icon: 'none' })
  }
}
const startPendingCountdown = () => {
  if (paymentTimer) clearInterval(paymentTimer)
  refreshPendingCountdown()
  if (paymentCountdown.value <= 0) { paymentExpired.value = true; void expirePendingOrder(); return }
  paymentTimer = setInterval(() => {
    refreshPendingCountdown()
    if (paymentCountdown.value <= 0) { paymentExpired.value = true; void expirePendingOrder() }
  }, 1000)
}
const startConfirmationCountdown = () => {
  if (confirmationTimer) clearInterval(confirmationTimer)
  confirmationCountdown.value = 3 * 60 * 60
  confirmationTimer = setInterval(() => {
    if (confirmationCountdown.value > 0) confirmationCountdown.value -= 1
  }, 1000)
}

const openPayment = async () => {
  if (paymentExpired.value) return uni.showToast({ title: '付款時間已結束，訂單取消處理中', icon: 'none' })
  if (!storedOrder.value?.quoteId) return uni.showToast({ title: '報價資料不存在，無法付款', icon: 'none' })
  paymentError.value = ''
  await loadWalletBalances()
  paymentOpen.value = true
  refreshPendingCountdown()
  paymentLoading.value = true
  try {
    paymentQuote.value = await getFareQuote(storedOrder.value.quoteId)
    refreshPendingCountdown()
  } catch (error) {
    paymentError.value = error instanceof Error ? error.message : '付款資料載入失敗'
    uni.showToast({ title: paymentError.value, icon: 'none' })
  } finally { paymentLoading.value = false }
}
const closePayment = () => { paymentOpen.value = false; if (paymentTimer) clearInterval(paymentTimer) }
const confirmPayment = async () => {
  if (!storedOrder.value?.quoteId) return
  paymentLoading.value = true
  try {
    await payTrip({ quoteId: storedOrder.value.quoteId, origin: storedOrder.value.origin, destination: storedOrder.value.destination, scheduledAt: storedOrder.value.scheduledAt, useFareBalance: walletSelections.fare, useCashBalance: walletSelections.cash, externalPaymentMethod: 'internal' })
    closePayment()
    await loadOrder(cachedPageUrl.value)
    uni.showToast({ title: '支付成功', icon: 'success' })
  } catch (error) { uni.showToast({ title: error instanceof Error ? error.message : '支付失敗', icon: 'none' }) } finally { paymentLoading.value = false }
}
import { cancelClientTrip, getClientTrip, getFareQuote, getWalletMe, payTrip, type ClientTrip, type FareQuote } from '../../services/api'
const tripStore = useTripStore()
const { responsiveStyle } = useResponsiveCanvas()
const storedOrder = ref<ClientTrip | undefined>()
const isTraveling = ref(false)
const currentOrderUrl = ref('')
const resetTimers = () => {
  if (paymentTimer) { clearInterval(paymentTimer); paymentTimer = null }
  if (confirmationTimer) { clearInterval(confirmationTimer); confirmationTimer = null }
}
const orderNumber = computed(() => {
  const digits = (storedOrder.value?.id || '').replace(/\D/g, '')
  return digits ? `A${digits.slice(-8).padStart(8, '0')}` : '—'
})
const parseQueryParams = (url = '') => Object.fromEntries((url.split('?')[1] || '').split('&').filter(Boolean).map(pair => { const [key, ...value] = pair.split('='); return [decodeURIComponent(key), decodeURIComponent(value.join('=') || '')] }))
const loadOrder = async (url = '') => {
  const params = parseQueryParams(url)
  const id = params.id
  const fromProfile = params.from === 'profile'
  isTraveling.value = fromProfile
  currentOrderUrl.value = url
  resetTimers()
  if (!id) {
    storedOrder.value = undefined
    return
  }
  try {
    storedOrder.value = await getClientTrip(id)
    paymentExpired.value = false
    if (storedOrder.value.status === 'PENDING') startPendingCountdown()
    else if (storedOrder.value.status === 'CONFIRMED' && fromProfile) startConfirmationCountdown()
    else if (storedOrder.value.status === 'CONFIRMED' && !fromProfile) uni.redirectTo({ url: `/pages/orders/traveling-detail?id=${encodeURIComponent(storedOrder.value.id)}` })
    else if (storedOrder.value.status === 'COMPLETED') uni.redirectTo({ url: `/pages/orders/detail?status=completed&id=${encodeURIComponent(storedOrder.value.id)}` })
    else if (storedOrder.value.status === 'CANCELLED') uni.redirectTo({ url: `/pages/orders/cancelled-detail?id=${encodeURIComponent(storedOrder.value.id)}` })
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : '訂單載入失敗', icon: 'none' })
  }
}
const loadCurrentOrder = () => {
  const candidates = [cachedPageUrl.value]
  if (typeof window !== 'undefined' && window.location.hash) candidates.push(window.location.hash)
  const source = candidates.find(candidate => parseQueryParams(candidate).id)
  if (source) void loadOrder(source)
}
onLoad((options) => {
  const fromProfile = options?.from === 'profile'
  const query = options ? `?id=${encodeURIComponent(options.id || '')}&from=${encodeURIComponent(options.from || '')}` : ''
  currentOrderUrl.value = query
  isTraveling.value = fromProfile
  void loadOrder(query)
  isCompleted.value = false
})
onMounted(() => {
  isCompleted.value = false
  loadCurrentOrder()
})
// #ifdef MP-WEIXIN || MP-TOUTIAO
watch(cachedPageUrl, loadCurrentOrder)
// #endif
onUnmounted(() => {
  if (paymentTimer) clearInterval(paymentTimer)
  if (confirmationTimer) clearInterval(confirmationTimer)
})
onShow(() => {
  isCompleted.value = false
})
const addressLabel = (value: string | undefined, fallback: string) => formatOrderDetailAddress(value, fallback)
const originLabel = computed(() => addressLabel(storedOrder.value?.origin || tripStore.activeTrip?.origin, '香港國際機場'))
const destinationLabel = computed(() => addressLabel(storedOrder.value?.destination || tripStore.activeTrip?.destination, '深圳灣口岸'))
const passengerLabel = computed(() => {
  const passenger = storedOrder.value?.passenger
  if (!passenger) return '—'
  const genderLabel = passenger.gender === 'MALE' ? '先生' : passenger.gender === 'FEMALE' ? '女士' : ''
  return `${passenger.name}${genderLabel ? `（${genderLabel}）` : ''}`
})
const passengerPhoneLabel = computed(() => {
  const passenger = storedOrder.value?.passenger
  return passenger ? `${passenger.countryCode} - ${passenger.phoneNumber}` : '—'
})
const isLongAddress = (value: string) => Array.from(value.replace(/\s/g, '')).length > 20
const formatAddressLabel = (value: string) => {
  const characters = Array.from(value)
  let nonWhitespaceCount = 0
  const splitIndex = characters.findIndex(character => {
    if (!/\s/.test(character)) nonWhitespaceCount += 1
    return nonWhitespaceCount === 21
  })
  if (splitIndex < 0) return value
  return `${characters.slice(0, splitIndex).join('')}\n${characters.slice(splitIndex).join('')}`
}
const hasLongAddress = computed(() => isLongAddress(originLabel.value) || isLongAddress(destinationLabel.value))
const formatDateTime = (value?: string) => {
  const date = value ? new Date(value) : null
  return date && !Number.isNaN(date.valueOf())
    ? `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    : '—'
}
const bookingTime = computed(() => formatDateTime(storedOrder.value?.scheduledAt || tripStore.departureTime))
const arrivalTime = computed(() => formatDateTime(storedOrder.value?.estimatedArrivalAt || storedOrder.value?.scheduledAt || tripStore.departureTime))
const selectedVehicle = computed(() => tripStore.chosenVehicle || { title: storedOrder.value?.vehicle?.categoryName || '跨境商務車', seats: storedOrder.value?.vehicle?.seats || 0, price: 0 })
const vehicleLabel = computed(() => `${storedOrder.value?.vehicle?.categoryName || selectedVehicle.value.title}（${storedOrder.value?.vehicle?.seats || selectedVehicle.value.seats}座）`)
const quoteLines = computed(() => storedOrder.value?.quote?.lines || [])
const amountValue = computed(() => Number(storedOrder.value?.payment?.total ?? storedOrder.value?.quote?.total ?? selectedVehicle.value.price ?? 0))
const amountLabel = computed(() => formatCurrencyAmount(amountValue.value, normalizeCurrency(storedOrder.value?.payment?.currency || storedOrder.value?.quote?.currency) || 'RMB'))
const paymentTotal = computed(() => amountValue.value)
const currencyLabel = computed(() => formatCurrencyAmount(0, normalizeCurrency(storedOrder.value?.payment?.currency || storedOrder.value?.quote?.currency) || 'RMB').replace('0.00', ''))
const baseFareTotal = computed(() => quoteLines.value.filter(item => item.type !== 'EXTRA' && item.type !== 'DISCOUNT').reduce((sum, item) => sum + Number(item.totalAmount || 0), 0))
const surchargeItems = computed(() => quoteLines.value.filter(item => item.type === 'EXTRA'))
const formatLineAmount = (line: { totalAmount: number; currency: string }) => formatCurrencyAmount(Math.abs(line.totalAmount), normalizeCurrency(line.currency) || normalizeCurrency(storedOrder.value?.quote?.currency) || 'RMB')
const surchargeLabel = computed(() => {
  const total = surchargeItems.value.reduce((sum, line) => sum + Math.abs(line.totalAmount), 0)
  return total > 0 ? formatCurrencyAmount(total, normalizeCurrency(storedOrder.value?.quote?.currency) || 'RMB') : '—'
})
const discountLabel = computed(() => {
  const line = quoteLines.value.find(item => item.type === 'DISCOUNT' && item.totalAmount < 0)
  return line ? `-${formatCurrencyAmount(Math.abs(line.totalAmount), normalizeCurrency(line.currency) || normalizeCurrency(storedOrder.value?.quote?.currency) || 'RMB')}` : '—'
})
const paymentMethodLabel = computed(() => storedOrder.value?.payment?.externalPaymentMethod === 'internal' ? '內部測試付款' : storedOrder.value?.payment?.externalPaymentMethod || '外部付款')
const detailDateLabel = computed(() => {
  const value = storedOrder.value?.scheduledAt
  const date = value ? new Date(value) : null
  return date && !Number.isNaN(date.valueOf()) ? `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}` : '—'
})
const getCurrentPageSource = () => {
  const candidates: string[] = []
  if (cachedPageUrl.value) candidates.push(cachedPageUrl.value)
  if (typeof window !== 'undefined' && window.location.hash) candidates.push(window.location.hash)

  for (const candidate of candidates) {
    const params = parseQueryParams(candidate)
    const source = params.from || params.returnTo || ''
    if (source) return source
  }

  return ''
}

const getSourceFromStack = () => {
  const currentIndex = cachedPageStack.value.findIndex((entry) => (entry || '').split('?')[0] === '/pages/orders/pending-detail')
  if (currentIndex < 0) return ''

  const stackEntries = cachedPageStack.value.slice(0, currentIndex + 1)
  for (let index = stackEntries.length - 1; index >= 0; index -= 1) {
    const params = parseQueryParams(stackEntries[index])
    if (params.from === 'profile' || params.returnTo === 'profile') return 'profile'
    if (params.from === 'orders' || params.returnTo === 'orders') return 'orders'
  }
  return ''
}

const getPreviousStackPath = () => {
  const currentIndex = cachedPageStack.value.findIndex((entry) => (entry || '').split('?')[0] === '/pages/orders/pending-detail')
  if (currentIndex <= 0) return ''
  return (cachedPageStack.value[currentIndex - 1] || '').split('?')[0]
}

const goBack = () => {
  const explicitSource = getCurrentPageSource() || getSourceFromStack()
  if (explicitSource === 'profile') return closeCachedPage('/pages/trips/trips')

  const previousStackPath = getPreviousStackPath()
  if (previousStackPath === '/pages/trips/trips') return closeCachedPage('/pages/trips/trips')
  return closeCachedPage('/pages/orders/orders')
}
const cancelOrder = async () => {
  if (!storedOrder.value) return uni.showToast({ title: '找不到訂單', icon: 'none' })
  try {
    await cancelClientTrip(storedOrder.value.id)
    openCachedPage(`/pages/orders/cancelled-detail?id=${encodeURIComponent(storedOrder.value.id)}`)
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : '訂單取消失敗', icon: 'none' })
  }
}
const showPaymentRecords = () => openCachedPage(`/pages/transactions/expense-detail?tripId=${encodeURIComponent(storedOrder.value?.id || '')}`)
</script>
<style scoped>
:global(html),:global(body),:global(#app){width:100%;height:100%;margin:0;overflow:hidden}.page{position:fixed;top:0;left:0;width:430px;height:var(--mobile-height, 932px);overflow:hidden;background:#f0f2f5;color:#38434a;font-family:'Noto Sans TC',sans-serif;transform:scale(var(--mobile-scale, 1));transform-origin:top left}.header{position:absolute;top:0;left:0;width:430px;height:110px;border-radius:25px;background:#fff}.number{position:absolute;top:58px;left:122px;font-size:18px;font-weight:500}.assist{position:absolute;top:130px;right:33px;display:flex;align-items:center;gap:10px;color:#285cfc;font-size:16px}.assist image{width:25px;height:25px}.status{position:absolute;top:130px;left:33px;display:flex;align-items:center;gap:5px;color:#38434a;font-size:16px;font-weight:700}.status image{width:25px;height:25px}.pending-card{height:585px}.locations{position:absolute;top:20px;left:33px;font-size:14px}.locations view,.passenger view{display:flex;align-items:center;height:30px;gap:20px}.locations image{width:18px;height:18px}.times{position:absolute;top:80px;left:33px;display:flex;flex-direction:column;gap:5px;font-size:14px;font-weight:300}.passenger-title{position:absolute;top:135px;left:33px;font-size:14px}.passenger{position:absolute;top:165px;left:33px;font-size:14px}.passenger view{gap:10px}.passenger image{width:20px;height:20px}.passenger view:last-child image{width:15px;height:15px;margin-left:2px}.payment{position:absolute;top:20px;left:206px;width:194px;height:105px;font-size:14px;font-weight:300}.payment>text:first-child{position:absolute;top:0;right:-8px;line-height:20px;white-space:nowrap}.amount{position:absolute;top:0;right:0;color:#285cfc;font-weight:700;white-space:nowrap}.payment.pending .amount{top:70px}.payment.pending .pay-tag{top:30px}.payment.completed .amount{top:0}.payment.cancelled .amount{top:0;color:#38434a}.payment.cancelled .cancelled-tag{top:30px}.pay-tag{position:absolute;top:30px;right:0;padding:5px 10px;border:1px solid #f95c5c;border-radius:10px;color:#f95c5c;font-size:14px;font-weight:700;line-height:20px;white-space:nowrap}.paid-tag,.cancelled-tag{position:absolute;top:30px;right:0;padding:5px 10px;border-radius:10px;white-space:nowrap}.paid-tag{border:1px solid #285cfc;color:#285cfc;font-weight:700}.cancelled-tag{border:1px solid #38434a;color:#38434a;font-weight:400}.completed-payment{position:absolute;top:311px;left:30px;width:370px;height:126px}.payment-record{position:relative;display:flex;align-items:flex-start;gap:10px;width:370px;min-height:40px;padding-right:95px;box-sizing:border-box;font-size:14px;line-height:20px}.payment-record image{flex:none;width:25px;height:25px}.wallet-record{margin-top:0;align-items:center}.wallet-record image{width:25px;height:25px}.wechat-record{margin-top:15px}.record-amount{position:absolute;top:0;right:0;color:#38434a;font-size:16px;line-height:25px;white-space:nowrap}.record-link{display:flex;align-items:center;justify-content:space-between;width:370px;margin-top:20px;font-size:14px;font-weight:300}.record-link text{font-size:26px;line-height:15px}.detail{position:absolute;top:225px;left:0;width:430px;height:325px;padding:0 25px;box-sizing:border-box}.detail-title{font-size:18px;font-weight:500}.detail-date{float:right;margin-top:3px;font-size:14px}.line{height:1px;margin-top:25px;background:#d9d9d9}.row{display:flex;justify-content:space-between;margin-top:20px;font-size:18px;font-weight:300}.total{margin-top:48px;text-align:right;font-size:16px;font-weight:500}.cancel{display:block;width:max-content;margin:35px 0 0 auto;padding:5px 10px;border:1px solid #38434a;border-radius:10px;background:#fff;color:#38434a;font-size:18px;font-weight:700;line-height:25px}.pending-card.long-addresses .locations view{height:auto;min-height:44px;align-items:flex-start}.pending-card.long-addresses .locations view image{margin-top:2px}.pending-card.long-addresses .locations text{line-height:22px;white-space:pre-line}.pending-card.long-addresses .times{top:102px}.pending-card.long-addresses .passenger-title{top:157px}.pending-card.long-addresses .passenger{top:187px}.pending-card.long-addresses .detail{top:247px}.traveling-title{position:absolute;top:58px;left:50%;transform:translateX(-50%);font-size:18px;font-weight:500;line-height:27px}.traveling-order-number{position:absolute;top:110px;left:0;width:430px;height:56px;padding-left:38px;box-sizing:border-box;display:flex;align-items:center;background:#edf0f2;color:#38434a;font-size:18px;font-weight:500;line-height:27px}.traveling-map{display:none}.traveling-card{position:absolute;z-index:1;top:166px;left:25px;width:380px;height:479px;border-radius:25px;background:#fff}.traveling-status-row{position:absolute;top:0;left:0;width:100%;height:23px}.traveling-waiting{position:absolute;top:10px;left:15px;width:73px;height:23px;display:flex;align-items:center;color:#285cfc;font-size:12px;font-weight:700;line-height:normal}.waiting-mark{position:relative;width:20px;height:20px;margin-right:5px}.waiting-mark image:first-child{position:absolute;inset:0;width:20px;height:20px}.waiting-dot{position:absolute;top:7px;left:7px;width:6px;height:6px}.traveling-summary{position:absolute;top:20px;left:118px;width:144px;height:144px;text-align:center}.traveling-summary>image:first-child{position:absolute;top:0;left:57px;width:30px;height:30px}.traveling-summary>text:nth-child(2){position:absolute;top:40px;left:0;width:144px;height:22px;color:#285cfc;font-size:18px;font-style:normal;font-weight:700;line-height:22px;white-space:nowrap}.traveling-confirm{position:absolute;top:72px;left:23px;width:97px;height:20px;display:flex;align-items:center;gap:5px;color:#38434a;font-size:12px;font-weight:700;font-style:normal;line-height:20px;white-space:nowrap}.traveling-confirm image{width:20px;height:20px}.confirmation-countdown{position:absolute;top:112px;left:0;width:144px;color:#38434a;font-size:18px;font-weight:500;line-height:24px;text-align:center;white-space:nowrap}.traveling-info{position:absolute;top:161px;left:0;width:380px;height:325px;overflow:hidden;border-radius:25px}.traveling-tesla{position:absolute;top:21px;left:30px;width:25px;height:25px}.traveling-pickup{position:absolute;top:24px;left:60px;font-size:14px;font-weight:500;white-space:nowrap}.traveling-locations{position:absolute;top:54px;left:36px;width:302px;height:50px;font-size:14px}.traveling-locations view{position:absolute;left:0;width:302px;height:20px}.traveling-locations view:first-child{top:0}.traveling-locations view:last-child{top:30px}.traveling-locations.origin-long view:last-child{top:54px}.traveling-locations image{position:absolute;top:6px;left:0;width:18px;height:18px}.traveling-locations text{position:absolute;top:0;left:38px;width:302px;display:block;line-height:30px;white-space:pre-line;word-break:keep-all}.traveling-locations .long-location{height:auto;min-height:44px;align-items:flex-start}.traveling-locations .long-location image{top:2px}.traveling-locations .long-location text{line-height:22px;white-space:pre-line;word-break:keep-all}.traveling-vehicle{position:absolute;top:140px;left:70px;color:#000;font-size:14px;font-weight:300;line-height:normal;white-space:nowrap}.traveling-passenger{position:absolute;top:173.02px;left:33px;width:127px;height:80px;font-size:14px}.traveling-passenger>text{position:absolute;top:0;left:0;line-height:normal;white-space:nowrap}.traveling-passenger>view{position:absolute;height:20px}.traveling-passenger>view:first-of-type{top:30px;left:0;width:117px}.traveling-passenger>view:last-child{top:55px;left:5px;width:122px}.traveling-passenger>view image,.traveling-passenger>view text{position:absolute}.traveling-passenger>view:first-of-type image{top:0;left:0;width:20px;height:20px}.traveling-passenger>view:first-of-type text{top:0;left:30px;line-height:normal;white-space:nowrap}.traveling-passenger>view:last-child image{top:3px;left:0;width:15px;height:15px}.traveling-passenger>view:last-child text{top:0;left:25px;line-height:normal;white-space:nowrap}.traveling-divider{position:absolute;top:162px;left:5px;width:370px;height:1px;overflow:hidden}.traveling-divider image{position:absolute;top:0;left:0;width:370px;height:1px;transform:none;transform-origin:center}.traveling-divider.second{top:263px}.traveling-record{position:absolute;top:284px;left:26.185px;width:327.63px;height:20px;display:flex;align-items:center;justify-content:space-between;font-size:14px;font-weight:350;line-height:normal}.traveling-record image{flex:none;width:9px;height:15px}.payment-mask{position:absolute;inset:0;z-index:50;background:rgba(56,67,74,.9)}.payment-sheet{position:absolute;left:0;bottom:0;width:430px;height:643px;border-radius:18px 18px 0 0;background:#fff;color:#38434a;overflow:hidden}.payment-close{position:absolute;top:17px;left:389px;width:26px;height:26px}.payment-title{position:absolute;top:17px;left:calc(50% - 36px);font-size:18px;font-weight:500;white-space:nowrap}.payment-countdown{position:absolute;top:72px;left:149px;color:#000;font-size:14px;font-weight:300;white-space:nowrap}.payment-amount{position:absolute;top:98px;left:0;width:430px;display:flex;align-items:baseline;justify-content:center;color:#000;line-height:normal}.payment-currency{font-size:16px;font-weight:500}.payment-number{margin-left:6px;font-size:28px;font-weight:500}.payment-method-label{position:absolute;top:162px;left:17px;color:#000;font-size:12px;font-weight:300;white-space:nowrap}.payment-options{position:absolute;top:189px;left:14.5px;width:401px;height:142px;overflow:hidden;border-radius:25px}.payment-option{position:relative;width:100%;height:71px;display:flex;align-items:flex-start;box-sizing:border-box;padding:14px 49px;font-size:14px;white-space:nowrap}.payment-option>image:first-child{position:absolute;top:10px;left:9px;width:25px;height:25px}.payment-option-copy{display:flex;flex-direction:column;gap:3px}.payment-balance{color:#f95c5c;font-weight:700}.payment-radio{position:absolute;top:17px;right:31px;width:15px!important;height:15px!important}.payment-options:after{content:'';position:absolute;left:49px;right:33px;top:70px;height:1px;background:#d9d9d9;box-shadow:0 70px #d9d9d9}.payment-confirm{position:absolute;top:545px;left:80px;width:270px;height:48px;border-radius:25px;background:#1effaa;color:#38434a;text-align:center;line-height:48px;font-size:16px;font-weight:900;white-space:nowrap}
/* Shared content-driven order detail layout. */
.page { overflow-y: auto; } .card {
  position: relative;
  top: 175px;
  left: 0;
  width: 430px;
  height: auto !important;
  border-radius: 25px;
  background: #fff;
  min-height: 540px;
  padding: 20px 30px 35px;
  box-sizing: border-box;
}
.card .locations { position: static; width: 270px; }
.card .locations view { display: flex; align-items: flex-start; gap: 20px; min-height: 30px; height: auto; }
.card .locations image { flex: none; margin-top: 6px; }
.card .locations text { flex: 1; min-width: 0; line-height: 30px; white-space: pre-line; overflow-wrap: anywhere; word-break: break-all; }
.card .locations .long-location text { line-height: 22px; }
.card .times { position: static; margin-top: 20px; }
.card .passenger-title { position: static; margin-top: 25px; }
.card .passenger { position: static; margin-top: 8px; }
.card .payment { top: 20px; left: auto; right: 0; }
.card .detail { position: static; width: auto; height: auto; min-height: 325px; margin: 25px 0 0; padding: 0; }
.card .detail .row { gap: 15px; }
.card .detail .row text:last-child { white-space: nowrap; }
.card .detail .completed-payment { position: static; width: 100%; height: auto; margin-top: 25px; }
.card .detail .payment-record, .card .detail .payment-divider, .card .detail .record-link { width: 100%; }
.card .detail .total { position: static; width: auto; margin-top: 25px; }
/* Standard traveling-card geometry for the regular status detail card. */
.standard-detail-card { position: relative; top: 175px; left: 0; width: 430px; min-height: 0; height: auto !important; padding: 20px 30px 0; box-sizing: border-box; border-radius: 25px; }
.standard-detail-card .locations { position: static; width: 270px; }
.standard-detail-card .locations view { display: flex; align-items: flex-start; gap: 20px; min-height: 30px; height: auto; }
.standard-detail-card .locations image { flex: none; margin-top: 6px; }
.standard-detail-card .locations text { flex: 1; min-width: 0; line-height: 30px; white-space: pre-line; overflow-wrap: anywhere; word-break: break-all; }
.standard-detail-card .times { position: static; margin-top: 20px; }
.standard-detail-card .passenger-title { position: static; margin-top: 25px; }
.standard-detail-card .passenger { position: static; margin-top: 8px; }
.standard-detail-card .detail { position: static; width: auto; height: auto; min-height: 0; margin: 25px 0 0; padding: 0 0 32px; }
.standard-detail-card .detail .row { gap: 15px; }
.standard-detail-card .detail .row text:last-child { white-space: nowrap; }
.standard-detail-card .detail .completed-payment { position: static; width: 100%; height: auto; margin-top: 25px; }
.standard-detail-card .detail .payment-record, .standard-detail-card .detail .payment-divider, .standard-detail-card .detail .record-link { width: 100%; }
.standard-detail-card .detail .total { position: static; width: auto; margin-top: 25px; } .standard-detail-card .payment {
  top: 20px;
  left: auto;
  right: 30px;
  width: 164px;
  min-height: 70px;
  height: auto;
}
.standard-detail-card .payment .paid-tag { position: static; display: block; width: max-content; margin-left: auto; margin-top: 0; }
@media (max-width:599px) { .page { height: var(--mobile-height,100dvh); overflow-y: auto; } }
</style>
