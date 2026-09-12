<template>
  <view :class="['page', { 'has-load-error': loadError }]" :style="responsiveStyle">
    <view v-if="loadError" class="load-error">訂單不存在或無權查看</view>
    <template v-if="!loadError">
      <view class="header">
        <OrdersBackButton icon-src="/static/orders/traveling-back.svg" @tap="goBack" />
        <text v-if="isTraveling" class="traveling-title">待出行</text>
        <text v-else class="number">訂單編號：{{ orderNumber }}</text>
      </view>
    </template>
    <template v-if="!loadError && isTraveling">
      <text class="traveling-order-number">訂單編號：{{ orderNumber }}</text>
      <view class="traveling-card">
        <view class="traveling-status-row">
          <view class="traveling-waiting"><view class="waiting-mark"><image src="/static/orders/traveling-wait-ring.svg" mode="aspectFit" /><image class="waiting-dot" src="/static/orders/traveling-wait-dot.svg" mode="aspectFit" /></view><text>等待中</text></view>
        </view>
        <view class="traveling-summary">
          <image src="/static/orders/traveling-status.svg" mode="aspectFit" />
          <text>正在為您安排司機</text>
          <view class="traveling-confirm"><image src="/static/orders/traveling-clock.svg" mode="aspectFit" /><text>三小時內確認</text></view>
          <image class="traveling-car" src="/static/orders/traveling-car.svg" mode="aspectFit" />
        </view>
        <view class="traveling-info">
          <image class="traveling-tesla" src="/static/orders/traveling-tesla.svg" mode="aspectFit" />
          <text class="traveling-pickup">預約時間 ：{{ bookingTime }}</text>
          <view class="traveling-locations"><view><image src="/static/orders/traveling-origin.svg" mode="aspectFit" /><text>{{ originLabel }}</text></view><view><image src="/static/orders/traveling-destination.svg" mode="aspectFit" /><text>{{ destinationLabel }}</text></view></view>
          <text class="traveling-vehicle">{{ vehicleLabel }}</text>
          <view class="traveling-passenger"><text>乘客及聯絡資料：</text><view><image src="/static/orders/traveling-passenger.svg" mode="aspectFit" /><text>{{ passengerLabel }}</text></view><view><image src="/static/orders/traveling-phone.svg" mode="aspectFit" /><text>{{ passengerPhoneLabel }}</text></view></view>
          <view class="traveling-divider"><image src="/static/orders/traveling-divider.svg" mode="aspectFit" /></view>
          <view class="traveling-divider second"><image src="/static/orders/traveling-divider.svg" mode="aspectFit" /></view>
          <view class="traveling-record" @tap="showPaymentRecords">相關支付紀錄 <image src="/static/orders/traveling-arrow.svg" mode="aspectFit" /></view>
        </view>
      </view>
    </template>
    <template v-else-if="!loadError">
      <view class="assist"><image src="/static/orders/help.svg" mode="aspectFit" /><text>訂單協助</text></view>
      <view class="status"><image :src="statusIcon" mode="aspectFit" /><text>取消</text></view>
      <view class="traveling-card standard-detail-card">
      <view class="locations"><view><image src="/static/orders/origin.svg" mode="aspectFit" /><text>{{ originLabel }}</text></view><view><image src="/static/orders/destination.svg" mode="aspectFit" /><text>{{ destinationLabel }}</text></view></view>
      <view class="times"><text>預約時間 ：{{ bookingTime }}</text><text>到達時間 ：{{ arrivalTime }}</text></view>
      <view class="passenger-title">乘客及聯絡資料：</view><view class="passenger"><view><image src="/static/orders/passenger.svg" mode="aspectFit" /><text>{{ passengerLabel }}</text></view><view><image src="/static/orders/phone.svg" mode="aspectFit" /><text>{{ passengerPhoneLabel }}</text></view></view>
      <view :class="['payment', { completed: isCompleted, cancelled: isCancelled, pending: !isCompleted && !isCancelled }]">
        <text v-if="!isCompleted && !isCancelled">交易時間剩餘：05:00</text>
        <text v-if="!isCancelled" class="amount">{{ amountLabel }}</text>
        <view v-if="!isCompleted && !isCancelled" class="pay-tag">待付款</view>
        <view v-else-if="isCancelled" class="cancelled-tag">已退款</view>
        <view v-else class="paid-tag">已付款</view>
      </view>
      <view class="detail"><text class="detail-title">訂單詳細</text><text class="detail-date">{{ detailDateLabel }}</text><view class="line"/><view class="row"><text>{{ vehicleLabel }}</text><text>{{ currencyLabel }} {{ baseFareTotal.toFixed(2) }}</text></view><view v-for="(item, index) in surchargeItems" :key="`extra-${item.sourceId || item.label}-${index}`" class="row"><text>{{ item.label }}</text><text>{{ formatLineAmount(item) }}</text></view><view class="row"><text>優惠券抵扣</text><text>{{ discountLabel }}</text></view><view class="total">Total： {{ currencyLabel }} {{ paymentTotal.toFixed(2) }}</view><view v-if="isCancelled && storedOrder?.payment" class="completed-payment"><view v-if="storedOrder.payment.fareAmount > 0" class="payment-record wallet-record"><image src="/static/vehicles/payment/payment-wallet-fare.svg" mode="aspectFit" /><text>車費餘額</text><text class="record-amount">-{{ currencyLabel }} {{ storedOrder.payment.fareAmount.toFixed(2) }}</text></view><view v-if="storedOrder.payment.cashAmount > 0" class="payment-record wallet-record"><image src="/static/vehicles/payment/payment-wallet-cash.svg" mode="aspectFit" /><text>現金餘額</text><text class="record-amount">-{{ currencyLabel }} {{ storedOrder.payment.cashAmount.toFixed(2) }}</text></view><view v-if="storedOrder.payment.externalAmount > 0" class="payment-record wechat-record"><image src="/static/vehicles/payment/payment-wechat.svg" mode="aspectFit" /><text>{{ paymentMethodLabel }}</text><text class="record-amount">-{{ currencyLabel }} {{ storedOrder.payment.externalAmount.toFixed(2) }}</text></view><view class="record-link" @tap="showPaymentRecords">相關支付紀錄 <text>›</text></view></view><button v-if="!isCompleted && !isCancelled" class="cancel" @tap="cancelOrder">取消</button></view>
      </view>
    </template>
  </view>
</template>
<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { useResponsiveCanvas } from '../../composables/useResponsiveCanvas'
import { useTripStore } from '../../stores/trip'
import { closeCachedPage, cachedPageUrl, cachedPageStack, openCachedPage } from '../../utils/navigation'
import { getClientTrip, type ClientTrip } from '../../services/api'
import OrdersBackButton from '../../components/orders/OrdersBackButton.vue'
import { formatOrderDetailAddress } from '../../utils/orderAddress'
import { formatCurrencyAmount, normalizeCurrency } from '../../composables/useCurrency'
const tripStore = useTripStore()
const { responsiveStyle } = useResponsiveCanvas()
const isCompleted = ref(false)
const isCancelled = ref(true)
const isTraveling = ref(false)
const storedOrder = ref<ClientTrip | undefined>()
const loadError = ref(false)
const orderNumber = computed(() => {
  const digits = String(storedOrder.value?.id || '').replace(/\D/g, '')
  return digits ? `A${digits.slice(-8).padStart(8, '0')}` : '—'
})
const parseQueryParams = (url = '') => Object.fromEntries((url.split('?')[1] || '').split('&').filter(Boolean).map(pair => { const [key, ...value] = pair.split('='); return [decodeURIComponent(key), decodeURIComponent(value.join('=') || '')] }))
const loadOrder = async (url = '') => {
  const id = parseQueryParams(url).id
  if (!id) return
  loadError.value = false
  try {
    storedOrder.value = await getClientTrip(id)
    isCancelled.value = storedOrder.value.status === 'CANCELLED'
  } catch (error) {
    storedOrder.value = undefined
    loadError.value = true
    uni.showToast({ title: error instanceof Error ? error.message : '訂單載入失敗', icon: 'none' })
  }
}
const applyStatus = () => {
  const currentUrl = typeof window !== 'undefined' && window.location.hash ? window.location.hash : cachedPageUrl.value
  void loadOrder(currentUrl)
  isCompleted.value = false
  isCancelled.value = true
  isTraveling.value = false
}
onLoad(() => { applyStatus() })
onMounted(() => {
  // #ifndef MP-WEIXIN || MP-TOUTIAO
  if (typeof window !== 'undefined') applyStatus()
  // #endif
})
onShow(() => {
  // #ifndef MP-WEIXIN || MP-TOUTIAO
  if (typeof window !== 'undefined') applyStatus()
  // #endif
})
// #ifdef MP-WEIXIN || MP-TOUTIAO
watch(cachedPageUrl, () => applyStatus(), { immediate: true })
// #endif
const statusIcon = computed(() => isCompleted.value ? '/static/orders/status-blue.svg' : isCancelled.value ? '/static/orders/status-gray.svg' : '/static/orders/status-pending.svg')
const addressLabel = (value: string | undefined, fallback: string) => formatOrderDetailAddress(value, fallback)
const originLabel = computed(() => addressLabel(storedOrder.value?.origin || tripStore.activeTrip?.origin, '香港國際機場'))
const destinationLabel = computed(() => addressLabel(storedOrder.value?.destination || tripStore.activeTrip?.destination, '深圳灣口岸'))
const formatDateTime = (value?: string) => {
  const date = value ? new Date(value) : null
  return date && !Number.isNaN(date.valueOf())
    ? `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    : '—'
}
const bookingTime = computed(() => formatDateTime(storedOrder.value?.scheduledAt || tripStore.departureTime))
const arrivalTime = computed(() => formatDateTime(storedOrder.value?.estimatedArrivalAt || storedOrder.value?.scheduledAt || tripStore.departureTime))
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
const selectedVehicle = computed(() => tripStore.chosenVehicle || { title: storedOrder.value?.vehicle?.categoryName || '高級跨境商務車', seats: storedOrder.value?.vehicle?.seats || 7, price: Number(storedOrder.value?.payment?.total ?? storedOrder.value?.quote?.total ?? 0) })
const vehicleLabel = computed(() => `${storedOrder.value?.vehicle?.categoryName || selectedVehicle.value.title}（${storedOrder.value?.vehicle?.seats || selectedVehicle.value.seats}座）`)
const amountValue = computed(() => Number(storedOrder.value?.payment?.total ?? storedOrder.value?.quote?.total ?? selectedVehicle.value.price ?? 0))
const amountLabel = computed(() => formatCurrencyAmount(amountValue.value, normalizeCurrency(storedOrder.value?.payment?.currency || storedOrder.value?.quote?.currency) || 'RMB'))
const paymentTotal = computed(() => amountValue.value)
const currencyLabel = computed(() => formatCurrencyAmount(0, normalizeCurrency(storedOrder.value?.payment?.currency || storedOrder.value?.quote?.currency) || 'RMB').replace('0.00', ''))
const paymentMethodLabel = computed(() => storedOrder.value?.payment?.externalPaymentMethod === 'internal' ? '內部測試付款' : storedOrder.value?.payment?.externalPaymentMethod || '外部付款')
const detailDateLabel = computed(() => {
  const value = storedOrder.value?.scheduledAt
  const date = value ? new Date(value) : null
  return date && !Number.isNaN(date.valueOf()) ? `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}` : '—'
})
const quoteLines = computed(() => storedOrder.value?.quote?.lines || [])
const baseFareTotal = computed(() => quoteLines.value.filter(item => item.type !== 'EXTRA' && item.type !== 'DISCOUNT').reduce((sum, item) => sum + Number(item.totalAmount || 0), 0))
const surchargeItems = computed(() => quoteLines.value.filter(item => item.type === 'EXTRA'))
const formatLineAmount = (line: { totalAmount: number; currency: string }) => formatCurrencyAmount(Math.abs(line.totalAmount), normalizeCurrency(line.currency) || normalizeCurrency(storedOrder.value?.quote?.currency) || 'RMB')
const discountLabel = computed(() => {
  const line = quoteLines.value.find(item => item.type === 'DISCOUNT' && item.totalAmount < 0)
  return line ? `-${formatCurrencyAmount(Math.abs(line.totalAmount), normalizeCurrency(line.currency) || normalizeCurrency(storedOrder.value?.quote?.currency) || 'RMB')}` : '—'
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
  const currentIndex = cachedPageStack.value.findIndex((entry) => (entry || '').split('?')[0] === '/pages/orders/detail')
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
  const currentIndex = cachedPageStack.value.findIndex((entry) => (entry || '').split('?')[0] === '/pages/orders/detail')
  if (currentIndex <= 0) return ''
  return (cachedPageStack.value[currentIndex - 1] || '').split('?')[0]
}

const goBack = () => {
  const explicitSource = getCurrentPageSource() || getSourceFromStack()
  if (explicitSource === 'profile') return openCachedPage('/pages/trips/trips')
  return openCachedPage('/pages/orders/orders')
}
const cancelOrder = () => uni.showToast({ title: '訂單取消功能開發中', icon: 'none' })
const showPaymentRecords = () => openCachedPage(`/pages/transactions/expense-detail?tripId=${encodeURIComponent(storedOrder.value?.id || '')}`)
</script>
<style scoped>
:global(html),:global(body),:global(#app){width:100%;height:100%;margin:0;overflow:hidden}.page{position:fixed;top:0;left:0;width:430px;height:var(--mobile-height, 932px);overflow:hidden;background:#f0f2f5;color:#38434a;font-family:'Noto Sans TC',sans-serif;transform:scale(var(--mobile-scale, 1));transform-origin:top left}.header{position:absolute;top:0;left:0;width:430px;height:110px;border-radius:25px;background:#fff}.number{position:absolute;top:58px;left:122px;font-size:18px;font-weight:500}.assist{position:absolute;top:130px;right:33px;display:flex;align-items:center;gap:10px;color:#285cfc;font-size:16px}.assist image{width:25px;height:25px}.status{position:absolute;top:130px;left:33px;display:flex;align-items:center;gap:5px;color:#38434a;font-size:16px;font-weight:700}.status image{width:25px;height:25px}.card{position:absolute;top:175px;left:0;width:430px;height:540px;border-radius:25px;background:#fff}.locations{position:absolute;top:20px;left:33px;font-size:14px}.locations view,.passenger view{display:flex;align-items:center;height:30px;gap:20px}.locations image{width:18px;height:18px}.times{position:absolute;top:80px;left:33px;display:flex;flex-direction:column;gap:5px;font-size:14px;font-weight:300}.passenger-title{position:absolute;top:135px;left:33px;font-size:14px}.passenger{position:absolute;top:165px;left:33px;font-size:14px}.passenger view{gap:10px}.passenger image{width:20px;height:20px}.passenger view:last-child image{width:15px;height:15px;margin-left:2px}.payment{position:absolute;top:20px;left:206px;width:194px;height:105px;font-size:14px;font-weight:300}.payment>text:first-child{position:absolute;top:0;right:0;line-height:20px;white-space:nowrap}.amount{position:absolute;top:0;right:0;color:#285cfc;font-weight:700;white-space:nowrap}.payment.pending .amount{top:70px}.payment.pending .pay-tag{top:30px}.payment.completed .amount{top:0}.payment.cancelled .amount{top:0;color:#38434a}.payment.cancelled .cancelled-tag{top:30px}.pay-tag{position:absolute;top:30px;right:0;padding:5px 10px;border:1px solid #f95c5c;border-radius:10px;color:#f95c5c;font-size:14px;font-weight:700;line-height:20px;white-space:nowrap}.paid-tag,.cancelled-tag{position:absolute;top:30px;right:0;padding:5px 10px;border-radius:10px;white-space:nowrap}.paid-tag{border:1px solid #285cfc;color:#285cfc;font-weight:700}.cancelled-tag{border:1px solid #38434a;color:#38434a;font-weight:400}.completed-payment{position:absolute;top:311px;left:30px;width:370px;height:126px}.payment-record{position:relative;display:flex;align-items:flex-start;gap:10px;width:370px;min-height:40px;padding-right:95px;box-sizing:border-box;font-size:14px;line-height:20px}.payment-record image{flex:none;width:25px;height:25px}.wallet-record{margin-top:0;align-items:center}.wallet-record image{width:25px;height:25px}.wechat-record{margin-top:15px}.record-amount{position:absolute;top:0;right:0;color:#38434a;font-size:16px;line-height:25px;white-space:nowrap}.record-link{display:flex;align-items:center;justify-content:space-between;width:370px;margin-top:20px;font-size:14px;font-weight:300}.record-link text{font-size:26px;line-height:15px}.detail{position:absolute;top:225px;left:0;width:430px;height:325px;padding:0 25px;box-sizing:border-box}.detail-title{font-size:18px;font-weight:500}.detail-date{float:right;margin-top:3px;font-size:14px}.line{height:1px;margin-top:25px;background:#d9d9d9}.row{display:flex;justify-content:space-between;margin-top:20px;font-size:18px;font-weight:300}.total{margin-top:48px;text-align:right;font-size:16px;font-weight:500}.cancel{float:right;margin-top:35px;padding:5px 10px;border:1px solid #38434a;border-radius:10px;background:#fff;color:#38434a;font-size:18px;font-weight:300;line-height:25px}.traveling-title{position:absolute;top:58px;left:50%;transform:translateX(-50%);font-size:18px;font-weight:500;line-height:27px}.traveling-order-number{position:absolute;top:110px;left:0;width:430px;height:56px;padding-left:38px;display:flex;align-items:center;background:#edf0f2;color:#38434a;font-size:18px;font-weight:500;line-height:27px}.traveling-map{display:none}.traveling-card{position:absolute;z-index:1;top:166px;left:25px;width:380px;height:479px;border-radius:25px;background:#fff}.traveling-status-row{position:absolute;top:0;left:0;width:100%;height:23px}.traveling-waiting{position:absolute;top:10px;left:15px;width:73px;height:23px;display:flex;align-items:center;color:#285cfc;font-size:12px;font-weight:700;line-height:normal}.waiting-mark{position:relative;width:20px;height:20px;margin-right:5px}.waiting-mark image:first-child{position:absolute;inset:0;width:20px;height:20px}.waiting-dot{position:absolute;top:7px;left:7px;width:6px;height:6px}.traveling-summary{position:absolute;top:20px;left:118px;width:144px;height:124px;text-align:center}.traveling-summary>image:first-child{position:absolute;top:0;left:57px;width:30px;height:30px}.traveling-summary>text:nth-child(2){position:absolute;top:40px;left:0;width:144px;color:#285cfc;font-size:18px;font-style:normal;font-weight:700;white-space:nowrap}.traveling-confirm{position:absolute;top:67px;left:23px;width:97px;height:20px;display:flex;align-items:center;gap:5px;color:#38434a;font-size:12px;font-weight:300;font-style:normal;white-space:nowrap}.traveling-confirm image{width:20px;height:20px}.traveling-car{position:absolute;top:92px;left:56px;width:32px;height:32px}.traveling-info{position:absolute;top:161px;left:0;width:380px;height:325px;overflow:hidden;border-radius:25px}.traveling-tesla{position:absolute;top:21px;left:30px;width:25px;height:25px}.traveling-pickup{position:absolute;top:24px;left:60px;font-size:14px;font-weight:500;white-space:nowrap}.traveling-locations{position:absolute;top:64px;left:36px;width:302px;height:50px;font-size:14px}.traveling-locations view{position:absolute;left:0;width:302px;height:20px}.traveling-locations view:first-child{top:0}.traveling-locations view:last-child{top:30px}.traveling-locations image{position:absolute;top:1px;left:0;width:18px;height:18px}.traveling-locations text{position:absolute;top:0;left:38px;line-height:normal;white-space:nowrap}.traveling-vehicle{position:absolute;top:140px;left:70px;color:#000;font-size:14px;font-weight:300;line-height:normal;white-space:nowrap}.traveling-passenger{position:absolute;top:173.02px;left:33px;width:127px;height:80px;font-size:14px}.traveling-passenger>text{position:absolute;top:0;left:0;line-height:normal;white-space:nowrap}.traveling-passenger>view{position:absolute;height:20px}.traveling-passenger>view:first-of-type{top:30px;left:0;width:117px}.traveling-passenger>view:last-child{top:55px;left:5px;width:122px}.traveling-passenger>view image,.traveling-passenger>view text{position:absolute}.traveling-passenger>view:first-of-type image{top:0;left:0;width:20px;height:20px}.traveling-passenger>view:first-of-type text{top:0;left:30px;line-height:normal;white-space:nowrap}.traveling-passenger>view:last-child image{top:3px;left:0;width:15px;height:15px}.traveling-passenger>view:last-child text{top:0;left:25px;line-height:normal;white-space:nowrap}.traveling-divider{position:absolute;top:162px;left:5px;width:370px;height:1px;overflow:hidden}.traveling-divider image{position:absolute;top:0;left:0;width:370px;height:1px;transform:none;transform-origin:center}.traveling-divider.second{top:263px}.traveling-record{position:absolute;top:284px;left:26.185px;width:327.63px;height:20px;display:flex;align-items:flex-start;justify-content:space-between;font-size:14px;font-weight:350;line-height:normal}.traveling-record image{position:absolute;top:2.04px;left:319px;width:8.63px;height:15px}@media (max-width:599px){.page{top:0;left:0;height:var(--mobile-height,100dvh);border-radius:0;transform:scale(var(--mobile-scale,1));transform-origin:top left}}
</style>
<style scoped>
.load-error { position: absolute; top: 50%; left: 0; width: 100%; transform: translateY(-50%); text-align: center; color: #38434a; font-size: 16px; }
/* Shared content-driven order detail layout. */
.page { overflow-y: auto; }
.card { position: relative; top: 175px; left: 0; width: 430px; height: auto !important; min-height: 540px; padding: 20px 30px 35px; box-sizing: border-box; }
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
.standard-detail-card { position: relative; top: 175px; left: 0; width: 430px; min-height: 700px; height: auto !important; padding: 20px 30px 35px; box-sizing: border-box; border-radius: 25px; }
.standard-detail-card .locations { position: static; width: 270px; }
.standard-detail-card .locations view { display: flex; align-items: flex-start; gap: 20px; min-height: 30px; height: auto; }
.standard-detail-card .locations image { flex: none; margin-top: 6px; }
.standard-detail-card .locations text { flex: 1; min-width: 0; line-height: 30px; white-space: pre-line; overflow-wrap: anywhere; word-break: break-all; }
.standard-detail-card .times { position: static; margin-top: 20px; }
.standard-detail-card .passenger-title { position: static; margin-top: 25px; }
.standard-detail-card .passenger { position: static; margin-top: 8px; }
.standard-detail-card .payment { top: 20px; left: auto; right: 30px; width: 164px; min-height: 70px; height: auto; }
.standard-detail-card .detail { position: static; width: auto; height: auto; min-height: 325px; margin: 25px 0 0; padding: 0; }
.standard-detail-card .detail .row { gap: 15px; }
.standard-detail-card .detail .row text:last-child { white-space: nowrap; }
.standard-detail-card .detail .completed-payment { position: static; width: 100%; height: auto; margin-top: 25px; }
.standard-detail-card .detail .payment-record, .standard-detail-card .detail .payment-divider, .standard-detail-card .detail .record-link { width: 100%; }
.standard-detail-card .detail .total { position: static; width: auto; margin-top: 25px; }
.standard-detail-card .payment .paid-tag { position: static; display: block; width: max-content; margin-left: auto; margin-top: 0; }
.standard-detail-card .payment.cancelled { position: static; width: 0; min-height: 0; height: 0; }
.standard-detail-card .payment.cancelled .cancelled-tag { position: absolute; top: 15px; right: 25px; }
@media (max-width:599px) { .page { height: var(--mobile-height,100dvh); overflow-y: auto; } }
</style>
