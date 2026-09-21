<template>
  <view class="page" :style="responsiveStyle">
    <view v-if="loadError" class="load-error">訂單不存在或無權查看</view>
    <template v-else>
      <template v-if="loading">
        <view class="loading-state">載入中…</view>
      </template>
      <template v-else>
    <view class="header">
      <OrdersBackButton icon-src="/static/orders/traveling-back.svg" @tap="goBack" />
      <text class="number">訂單編號：{{ orderNumber }}</text>
    </view>
    <template v-if="isTraveling">
      <view class="status traveling-page-status"><image src="/static/orders/status-blue.svg" mode="aspectFit" /><text>待出行</text></view>
      <view class="assist traveling-assist"><image src="/static/orders/help.svg" mode="aspectFit" /><text>訂單協助</text></view>
      <scroll-view class="traveling-scroll" scroll-y>
      <view class="card traveling-card">
        <view class="locations"><view><image src="/static/orders/origin.svg" mode="aspectFit" /><text>{{ originLabel }}</text></view><view><image src="/static/orders/destination.svg" mode="aspectFit" /><text>{{ destinationLabel }}</text></view></view>
        <view class="times"><text>預約時間 ：{{ bookingTime }}</text><text>預計到達時間 ：{{ arrivalTime }}</text></view>
        <view class="passenger-title">乘客及聯絡資料：</view><view class="passenger"><view><image src="/static/orders/passenger.svg" mode="aspectFit" /><text>{{ passengerLabel }}</text></view><view><image src="/static/orders/phone.svg" mode="aspectFit" /><text>{{ passengerPhoneLabel }}</text></view></view>
        <view class="payment completed">
          <text class="amount">{{ amountLabel }}</text>
          <view class="paid-tag">已付款</view>
        </view>
        <view class="detail traveling-detail"><text class="detail-title">訂單詳細</text><text class="detail-date">{{ detailDateLabel }}</text><view class="line"/><view class="row"><text>{{ selectedVehicle.title }}（{{ selectedVehicle.seats }}/8座）</text><text>{{ currencyLabel }} {{ baseFareTotal.toFixed(2) }}</text></view><view v-for="item in surchargeItems" :key="item.label" class="row"><text>{{ item.label }}</text><text>{{ formatLineAmount(item) }}</text></view><view class="row"><text>優惠券抵扣</text><text>{{ discountLabel }}</text></view><view class="total completed-total">Total： {{ currencyLabel }} {{ paymentTotal.toFixed(2) }}</view><view v-if="storedOrder?.payment" class="completed-payment"><view v-if="storedOrder.payment.fareAmount > 0" class="payment-record wallet-record"><image src="/static/vehicles/payment/payment-wallet-fare.svg" mode="aspectFit" /><text>我的錢包 餘額</text><text class="record-amount">-{{ currencyLabel }} {{ storedOrder.payment.fareAmount.toFixed(2) }}</text></view><view v-if="storedOrder.payment.externalAmount > 0" class="payment-record wechat-record"><image src="/static/withdraw/visa.svg" mode="aspectFit" /><view><text>VISA Card •••• 2321</text><text class="payment-subtitle">銀行帳戶</text></view><text class="record-amount">-{{ currencyLabel }} {{ storedOrder.payment.externalAmount.toFixed(2) }}</text></view><view class="payment-divider" /><view class="record-link" @tap="showPaymentRecords">相關支付紀錄 <text>›</text></view></view></view>
      </view>
      </scroll-view>
    </template>
    <template v-else>
      <view class="assist"><image src="/static/orders/help.svg" mode="aspectFit" /><text>訂單協助</text></view>
      <view :class="['status', { 'completed-status': isCompleted }]">
        <image :src="statusIcon" mode="aspectFit" /><text>{{ statusLabel }}</text>
      </view>
      <scroll-view class="standard-scroll" scroll-y>
        <view :class="['traveling-card', 'standard-detail-card', { 'pending-card': !isCompleted, 'completed-card': isCompleted }]">
        <view class="locations"><view><image src="/static/orders/origin.svg" mode="aspectFit" /><text>{{ originLabel }}</text></view><view><image src="/static/orders/destination.svg" mode="aspectFit" /><text>{{ destinationLabel }}</text></view></view>
        <view class="times"><text>預約時間 ：{{ bookingTime }}</text><text>預計到達時間 ：{{ arrivalTime }}</text></view>
        <view class="passenger-title">乘客及聯絡資料：</view><view class="passenger"><view><image src="/static/orders/passenger.svg" mode="aspectFit" /><text>{{ passengerLabel }}</text></view><view><image src="/static/orders/phone.svg" mode="aspectFit" /><text>{{ passengerPhoneLabel }}</text></view></view>
        <view :class="['payment', { completed: isCompleted, pending: !isCompleted }]">
          <text v-if="!isCompleted">交易時間剩餘：05:00</text>
          <text v-if="!isCompleted" class="amount">{{ amountLabel }}</text>
          <view v-if="!isCompleted" class="pay-tag">待付款</view>
          <view v-else class="paid-tag">已付款</view>
        </view>
        <view class="detail"><text class="detail-title">訂單詳細</text><text class="detail-date">{{ detailDateLabel }}</text><view class="line"/><view class="row"><text>{{ vehicleLabel }}</text><text>{{ currencyLabel }} {{ baseFareTotal.toFixed(2) }}</text></view><view v-for="item in surchargeItems" :key="item.label" class="row"><text>{{ item.label }}</text><text>{{ formatLineAmount(item) }}</text></view><view class="row"><text>優惠券抵扣</text><text>{{ discountLabel }}</text></view><view :class="['total', { 'completed-total': isCompleted }]">Total： {{ currencyLabel }} {{ paymentTotal.toFixed(2) }}</view><view v-if="isCompleted && storedOrder?.payment" class="completed-payment"><view v-if="storedOrder.payment.fareAmount > 0" class="payment-record wallet-record"><image src="/static/vehicles/payment/payment-wallet-fare.svg" mode="aspectFit" /><text>車費餘額</text><text class="record-amount">-{{ currencyLabel }} {{ storedOrder.payment.fareAmount.toFixed(2) }}</text></view><view v-if="storedOrder.payment.cashAmount > 0" class="payment-record wallet-record"><image src="/static/vehicles/payment/payment-wallet-cash.svg" mode="aspectFit" /><text>現金餘額</text><text class="record-amount">-{{ currencyLabel }} {{ storedOrder.payment.cashAmount.toFixed(2) }}</text></view><view v-if="storedOrder.payment.externalAmount > 0" class="payment-record wechat-record"><image src="/static/vehicles/payment/payment-wechat.svg" mode="aspectFit" /><text>{{ paymentMethodLabel }}</text><text class="record-amount">-{{ currencyLabel }} {{ storedOrder.payment.externalAmount.toFixed(2) }}</text></view><view class="payment-divider" /><view class="record-link" @tap="showPaymentRecords">相關支付紀錄 <text>›</text></view></view><button v-if="!isCompleted" class="cancel" @tap="cancelOrder">取消</button></view>
        </view>
      </scroll-view>
    </template>
    </template>
    </template>
  </view>
</template>
<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { useResponsiveCanvas } from '../../composables/useResponsiveCanvas'
import { useTripStore } from '../../stores/trip'
import { closeCachedPage, cachedPageUrl, openCachedPage, getOrderReturnTarget } from '../../utils/navigation'
import { cancelClientTrip, getClientTrip, type ClientTrip } from '../../services/api'
import OrdersBackButton from '../../components/orders/OrdersBackButton.vue'
import { formatOrderDetailAddress } from '../../utils/orderAddress'
import { formatCurrencyAmount, normalizeCurrency } from '../../composables/useCurrency'
const tripStore = useTripStore()
const { responsiveStyle } = useResponsiveCanvas()
const isCompleted = ref(false)
const isTraveling = ref(false)
const storedOrder = ref<ClientTrip | undefined>()
const loadError = ref(false)
const loading = ref(false)
const orderNumber = computed(() => {
  const digits = String(storedOrder.value?.id || '').replace(/\D/g, '')
  return digits ? `A${digits.slice(-8).padStart(8, '0')}` : '—'
})
const returnTarget = ref<'profile' | 'orders' | 'transactions'>(getOrderReturnTarget() || 'orders')
const parseQueryParams = (url = '') => {
  const query = url.split('?')[1] || ''
  return query.split('&').reduce<Record<string, string>>((result, pair) => {
    const [key, ...value] = pair.split('=')
    if (key) result[decodeURIComponent(key)] = decodeURIComponent(value.join('=') || '')
    return result
  }, {})
}
const loadOrder = async (url = '') => {
  const id = parseQueryParams(url).id
  if (!id) return
  loading.value = true
  loadError.value = false
  try {
    storedOrder.value = await getClientTrip(id)
    const sourceQuery = returnTarget.value === 'transactions' ? '&from=transactions' : ''
    if (storedOrder.value.status === 'CANCELLED') return openCachedPage(`/pages/orders/cancelled-detail?id=${encodeURIComponent(id)}${sourceQuery}`)
    if (storedOrder.value.status === 'PENDING') return openCachedPage(`/pages/orders/pending-detail?id=${encodeURIComponent(id)}${sourceQuery}`)
    if (storedOrder.value.status === 'CONFIRMED') return openCachedPage(`/pages/orders/traveling-detail?id=${encodeURIComponent(id)}${sourceQuery}`)
    isCompleted.value = storedOrder.value.status === 'COMPLETED'
    isTraveling.value = false
  } catch (error) {
    storedOrder.value = undefined
    loadError.value = true
    uni.showToast({ title: error instanceof Error ? error.message : '訂單載入失敗', icon: 'none' })
  } finally {
    loading.value = false
  }
}
const applyStatus = (url?: string) => {
  const status = url?.match(/[?&]status=([^&#]+)/)?.[1]
  const source = url?.match(/[?&](?:from|returnTo)=([^&#]+)/)?.[1]
  isCompleted.value = status === 'completed'
  isTraveling.value = status === 'traveling'
  const storedTarget = getOrderReturnTarget()
  if (source === 'transactions') returnTarget.value = source
  else if (storedTarget) returnTarget.value = storedTarget
  else if (source === 'profile' || source === 'orders') returnTarget.value = source
  void loadOrder(url)
}
onLoad((options) => {
  const query = options ? `?status=${options.status || ''}&from=${options.from || options.returnTo || ''}&id=${options.id || ''}` : undefined
  applyStatus(query)
})
const handleHashChange = () => {
  if (typeof window !== 'undefined') applyStatus(window.location.hash)
}
onMounted(() => {
  // H5 keeps the detail component mounted while the hash route changes, so the
  // hash must be treated as the source of truth for every order status.
  // #ifndef MP-WEIXIN || MP-TOUTIAO
  if (typeof window !== 'undefined') {
    handleHashChange()
    window.addEventListener('hashchange', handleHashChange)
  }
  // #endif
})
onUnmounted(() => {
  // #ifndef MP-WEIXIN || MP-TOUTIAO
  if (typeof window !== 'undefined') window.removeEventListener('hashchange', handleHashChange)
  // #endif
})
onShow(() => {
  // #ifndef MP-WEIXIN || MP-TOUTIAO
  if (typeof window !== 'undefined') applyStatus(window.location.hash)
  // #endif
})
// #ifdef MP-WEIXIN || MP-TOUTIAO
watch(cachedPageUrl, (url) => applyStatus(url), { immediate: true })
// #endif
const statusIcon = computed(() => isCompleted.value ? '/static/orders/status-blue.svg' : '/static/orders/status-pending.svg')
const statusLabel = computed(() => isCompleted.value ? '已完成' : '待確認')
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
const selectedVehicle = computed(() => {
  const vehicle = storedOrder.value?.vehicle
  if (vehicle) return { title: vehicle.categoryName || vehicle.modelChoiceLabel || '跨境商務車', seats: vehicle.seats, price: storedOrder.value?.payment?.total || storedOrder.value?.quote?.total || 0 }
  return tripStore.chosenVehicle || { title: '跨境商務車', seats: 0, price: storedOrder.value?.payment?.total || storedOrder.value?.quote?.total || 0 }
})
const vehicleLabel = computed(() => `${storedOrder.value?.vehicle?.categoryName || tripStore.chosenVehicle?.title || '跨境商務車'}（${storedOrder.value?.vehicle?.seats || tripStore.chosenVehicle?.seats || 0}座）`)
const amountLabel = computed(() => formatCurrencyAmount(storedOrder.value?.payment?.total || storedOrder.value?.quote?.total || 0, normalizeCurrency(storedOrder.value?.payment?.currency || storedOrder.value?.quote?.currency) || 'RMB'))
const paymentTotal = computed(() => storedOrder.value?.payment?.total || storedOrder.value?.quote?.total || 0)
const currencyLabel = computed(() => normalizeCurrency(storedOrder.value?.payment?.currency || storedOrder.value?.quote?.currency) || 'RMB')
const paymentMethodLabel = computed(() => storedOrder.value?.payment?.externalPaymentMethod === 'internal' ? '內部測試付款' : storedOrder.value?.payment?.externalPaymentMethod || '外部付款')
const quoteLines = computed(() => storedOrder.value?.quote?.lines || [])
const baseFareTotal = computed(() => quoteLines.value.filter(item => item.type !== 'EXTRA' && item.type !== 'DISCOUNT').reduce((sum, item) => sum + Number(item.totalAmount || 0), 0))
const surchargeItems = computed(() => quoteLines.value.filter(item => item.type === 'EXTRA'))
const formatLineAmount = (line: { totalAmount: number; currency: string }) => formatCurrencyAmount(Math.abs(line.totalAmount), normalizeCurrency(line.currency) || normalizeCurrency(storedOrder.value?.quote?.currency) || 'RMB')
const discountLabel = computed(() => {
  const line = quoteLines.value.find(item => item.type === 'DISCOUNT' && item.totalAmount < 0)
  return line ? `-${formatCurrencyAmount(Math.abs(line.totalAmount), normalizeCurrency(line.currency) || normalizeCurrency(storedOrder.value?.quote?.currency) || 'RMB')}` : '—'
})
const detailDateLabel = computed(() => {
  const value = storedOrder.value?.scheduledAt
  const date = value ? new Date(value) : null
  return date && !Number.isNaN(date.valueOf()) ? `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}` : '—'
})
const goBack = () => {
  if (returnTarget.value === 'transactions') return closeCachedPage(`/pages/transactions/expense-detail?tripId=${encodeURIComponent(storedOrder.value?.id || '')}`)
  if (returnTarget.value === 'profile') return openCachedPage('/pages/trips/trips')
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
:global(html),:global(body),:global(#app){width:100%;height:100%;margin:0;overflow:hidden}.page{position:fixed;top:0;left:0;width:430px;height:var(--mobile-height, 932px);overflow:hidden;background:#f0f2f5;color:#38434a;font-family:'Noto Sans TC',sans-serif;transform:scale(var(--mobile-scale, 1));transform-origin:top left}.loading-state{position:absolute;top:420px;left:0;width:430px;text-align:center;color:#38434a;font-size:16px}.header{position:absolute;top:0;left:0;width:430px;height:110px;border-radius:25px;background:#fff}.number{position:absolute;top:58px;left:122px;font-size:18px;font-weight:500}.assist{position:absolute;top:130px;right:33px;display:flex;align-items:center;gap:10px;color:#285cfc;font-size:16px}.assist image{width:25px;height:25px}.status{position:absolute;top:130px;left:33px;display:flex;align-items:center;gap:5px;font-size:16px;font-weight:700}.status.completed-status{color:#285cfc}.status image{width:25px;height:25px}.pending-card{height:540px}.locations{position:absolute;top:20px;left:33px;font-size:14px}.locations view,.passenger view{display:flex;align-items:center;height:30px;gap:20px}.locations image{width:18px;height:18px}.times{position:absolute;top:80px;left:33px;display:flex;flex-direction:column;gap:5px;font-size:14px;font-weight:300}.passenger-title{position:absolute;top:135px;left:33px;font-size:14px}.passenger{position:absolute;top:165px;left:33px;font-size:14px}.passenger view{gap:10px}.passenger image{width:20px;height:20px}.passenger view:last-child image{width:15px;height:15px;margin-left:2px}.payment{position:absolute;top:20px;left:206px;width:194px;height:105px;font-size:14px;font-weight:300}.payment>text:first-child{position:absolute;top:0;right:0;line-height:20px;white-space:nowrap}.amount{position:absolute;top:0;right:0;color:#285cfc;font-weight:700;white-space:nowrap}.payment.pending .amount{top:70px}.payment.pending .pay-tag{top:30px}.payment.completed{top:0;left:0;width:430px;height:60px}.payment.completed .amount{display:none}.completed-card .paid-tag{top:15px;right:25px}.payment.cancelled .amount{top:0;color:#38434a}.payment.cancelled .cancelled-tag{top:30px}.pay-tag{position:absolute;top:30px;right:0;padding:5px 10px;border:1px solid #f95c5c;border-radius:10px;color:#f95c5c;font-size:14px;font-weight:700;line-height:20px;white-space:nowrap}.paid-tag,.cancelled-tag{position:absolute;top:30px;right:0;padding:5px 10px;border-radius:10px;white-space:nowrap}.paid-tag{border:1px solid #285cfc;color:#285cfc;font-weight:700}.cancelled-tag{border:1px solid #38434a;color:#38434a;font-weight:400}.completed-payment{position:absolute;top:311px;left:30px;width:370px;height:126px}.payment-divider{position:relative;top:auto;left:auto;width:370px;height:1px;margin-top:5px;background:#d9d9d9}.payment-record{position:relative;display:flex;align-items:flex-start;gap:10px;width:370px;min-height:40px;padding-right:95px;box-sizing:border-box;font-size:14px;line-height:20px}.payment-record image{flex:none;width:25px;height:25px}.wallet-record{margin-top:0;align-items:center}.wallet-record image{width:25px;height:25px}.wechat-record{margin-top:15px}.record-amount{position:absolute;top:0;right:0;color:#38434a;font-size:16px;line-height:25px;white-space:nowrap}.record-link{display:flex;align-items:center;justify-content:space-between;width:370px;margin-top:25px;font-size:14px;font-weight:300}.record-link text{font-size:26px;line-height:15px}.detail{position:absolute;top:225px;left:0;width:430px;height:325px;padding:0 30px;box-sizing:border-box}.detail-title{font-size:18px;font-weight:500}.detail-date{float:right;margin-top:3px;font-size:14px}.line{height:1px;margin-top:25px;background:#d9d9d9}.row{display:flex;justify-content:space-between;margin-top:20px;font-size:18px;font-weight:300}.total{margin-top:25px;text-align:right;font-size:16px;font-weight:500}.completed-total{position:absolute;top:267px;right:30px;width:370px;margin-top:0}.cancel{float:right;margin-top:35px;padding:5px 10px;border:1px solid #38434a;border-radius:10px;background:#fff;color:#38434a;font-size:18px;font-weight:300;line-height:25px}.traveling-order-number{position:absolute;top:110px;left:0;width:430px;height:56px;padding-left:38px;display:flex;align-items:center;background:#edf0f2;color:#38434a;font-size:18px;font-weight:500;line-height:27px}.traveling-map{display:none}.traveling-card{position:absolute;z-index:1;top:166px;left:25px;width:380px;height:479px;border-radius:25px;background:#fff}.traveling-status-row{position:absolute;top:0;left:0;width:100%;height:23px}.traveling-waiting{position:absolute;top:10px;left:15px;width:73px;height:23px;display:flex;align-items:center;color:#285cfc;font-size:12px;font-weight:700;line-height:normal}.waiting-mark{position:relative;width:20px;height:20px;margin-right:5px}.waiting-mark image:first-child{position:absolute;inset:0;width:20px;height:20px}.waiting-dot{position:absolute;top:7px;left:7px;width:6px;height:6px}.traveling-summary{position:absolute;top:20px;left:118px;width:144px;height:124px;text-align:center}.traveling-summary>image:first-child{position:absolute;top:0;left:57px;width:30px;height:30px}.traveling-summary>text:nth-child(2){position:absolute;top:40px;left:0;width:144px;color:#285cfc;font-size:18px;font-style:normal;font-weight:700;white-space:nowrap}.traveling-confirm{position:absolute;top:67px;left:23px;width:97px;height:20px;display:flex;align-items:center;gap:5px;color:#38434a;font-size:12px;font-weight:300;font-style:normal;white-space:nowrap}.traveling-confirm image{width:20px;height:20px}.traveling-car{position:absolute;top:92px;left:56px;width:32px;height:32px}.traveling-info{position:absolute;top:161px;left:0;width:380px;height:325px;overflow:hidden;border-radius:25px}.traveling-tesla{position:absolute;top:21px;left:30px;width:25px;height:25px}.traveling-pickup{position:absolute;top:24px;left:60px;font-size:14px;font-weight:500;white-space:nowrap}.traveling-locations{position:absolute;top:64px;left:36px;width:302px;height:50px;font-size:14px}.traveling-locations view{position:absolute;left:0;width:302px;height:20px}.traveling-locations view:first-child{top:0}.traveling-locations view:last-child{top:30px}.traveling-locations image{position:absolute;top:1px;left:0;width:18px;height:18px}.traveling-locations text{position:absolute;top:0;left:38px;line-height:normal;white-space:nowrap}.traveling-vehicle{position:absolute;top:140px;left:70px;color:#000;font-size:14px;font-weight:300;line-height:normal;white-space:nowrap}.traveling-passenger{position:absolute;top:173.02px;left:33px;width:127px;height:80px;font-size:14px}.traveling-passenger>text{position:absolute;top:0;left:0;line-height:normal;white-space:nowrap}.traveling-passenger>view{position:absolute;height:20px}.traveling-passenger>view:first-of-type{top:30px;left:0;width:117px}.traveling-passenger>view:last-child{top:55px;left:5px;width:122px}.traveling-passenger>view image,.traveling-passenger>view text{position:absolute}.traveling-passenger>view:first-of-type image{top:0;left:0;width:20px;height:20px}.traveling-passenger>view:first-of-type text{top:0;left:30px;line-height:normal;white-space:nowrap}.traveling-passenger>view:last-child image{top:3px;left:0;width:15px;height:15px}.traveling-passenger>view:last-child text{top:0;left:25px;line-height:normal;white-space:nowrap}.traveling-divider{position:absolute;top:162px;left:5px;width:370px;height:1px;overflow:hidden}.traveling-divider image{position:absolute;top:0;left:0;width:370px;height:1px;transform:none;transform-origin:center}.traveling-divider.second{top:263px}.traveling-record{position:absolute;top:284px;left:26.185px;width:327.63px;height:20px;display:flex;align-items:flex-start;justify-content:space-between;font-size:14px;font-weight:350;line-height:normal}.traveling-record image{position:absolute;top:2.04px;left:319px;width:8.63px;height:15px}@media (max-width:599px){.page{top:0;left:0;height:var(--mobile-height,100dvh);border-radius:0;transform:scale(var(--mobile-scale,1));transform-origin:top left}}.traveling-card .locations{top:20px;left:20px}.traveling-card .times{top:95px;left:20px}.traveling-card .passenger-title{top:165px;left:20px}.traveling-card .passenger{top:195px;left:20px}.traveling-card .payment{top:18px;left:320px;width:90px;height:42px}.traveling-card .payment .amount{display:none}.traveling-card .paid-tag{top:0;right:0}.traveling-card .traveling-detail{top:270px;height:500px}.traveling-card .traveling-detail .record-link{margin-top:25px}.payment-subtitle{display:block;color:#38434a;font-size:12px;font-weight:300}.traveling-card .row{font-size:18px}.traveling-card .completed-total{top:180px} .traveling-card .traveling-detail .completed-payment {
  top: 260px;
}
.traveling-header{top:33px;left:25px;width:380px;height:107px;border-radius:25px}.traveling-header .orders-back-button{top:35px;left:23px;width:28px;height:40px}.traveling-header .number{top:59px;left:120px;font-size:18px;font-weight:500;white-space:nowrap}.traveling-page-status{top:163px;left:58px;z-index:3;color:#285cfc;font-size:16px}.traveling-page-status image{width:25px;height:25px}.traveling-scroll{position:absolute;z-index:2;top:203px;left:25px;width:380px;height:calc(100% - 203px);overflow-y:scroll;background:transparent}.traveling-assist.assist{top:163px;right:58px} .traveling-title {
  position: absolute;
  top: 58px;
  left: 215px;
  transform: translateX(-50%);
  font-size: 18px;
  font-weight: 700;
  line-height: 27px;
  color: #285cfc;
  white-space: nowrap;
  z-index: 3;
} .traveling-assist {
  top: 58px;
  right: 28px;
  height: 27px;
  gap: 7px;
  font-size: 14px;
  white-space: nowrap;
  z-index: 3;
}
.traveling-assist image{width:22px;height:22px} .traveling-card.card {
  top: 110px;
  left: 0;
  width: 430px;
  height: 822px;
  border-radius: 25px 25px 0 0;
  min-height: 822px;
  overflow: hidden;
  z-index: 1;
} .traveling-card.card>.locations {
  top: 25px;
  left: 33px;
} .traveling-card.card>.times {
  top: 125px;
  left: 33px;
} .traveling-card.card>.passenger-title {
  top: 220px;
  left: 33px;
} .traveling-card.card>.passenger {
  top: 250px;
  left: 33px;
} .traveling-card.card>.payment {
  top: 20px;
  left: 320px;
  width: 90px;
  height: 55px;
} .traveling-card.card>.detail {
  position: relative;
  top: 390px;
  left: 0;
  width: 430px;
  margin-top: 242px;
  height: auto;
  min-height: 455px;
  padding: 0 30px;
  box-sizing: border-box;
}
.traveling-card.card>.detail .line{margin-top:25px}
.traveling-card.card>.detail .row{margin-top:18px;font-size:16px;line-height:22px}
.traveling-card.card>.detail .total{position:static;width:auto;margin-top:26px;text-align:right;font-size:16px}
.traveling-card.card>.detail .completed-payment{position:static;width:370px;height:auto;margin-top:25px}
.traveling-card.card>.detail .payment-record{width:370px;min-height:32px}
.traveling-card.card>.detail .wechat-record{margin-top:14px}
.traveling-card.card>.detail .record-link{width:370px;margin-top:20px}
.traveling-card.card>.detail .payment-divider{width:370px;margin-top:8px} .traveling-scroll .traveling-card.card {
  position: relative;
  top: 0;
  left: 0;
  width: 380px;
  height: auto;
  min-height: 643px;
  padding-bottom: 35px;
  border-radius: 25px;
}
.traveling-scroll .traveling-card.card>.times{top:84px}
.traveling-scroll .traveling-card.card>.passenger-title{top:135px}
.traveling-scroll .traveling-card.card>.passenger{top:165px}
.traveling-scroll .traveling-card.card>.detail{position:relative;top:auto;left:0;width:380px;margin-top:242px;padding:0 25px 35px;box-sizing:border-box}
.traveling-scroll .traveling-card.card>.detail .completed-payment,.traveling-scroll .traveling-card.card>.detail .payment-record,.traveling-scroll .traveling-card.card>.detail .record-link,.traveling-scroll .traveling-card.card>.detail .payment-divider{width:330px}
/* Shared content-driven order detail layout. */
.card {
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
.card.completed-card .payment.completed { top: 0; right: 0; }
.card.completed-card .paid-tag { top: 15px; right: 25px; }
.card .detail { position: static; width: auto; height: auto; min-height: 325px; margin: 25px -0px 0; padding: 0; }
.card .detail .row { gap: 15px; }
.card .detail .row text:last-child { white-space: nowrap; }
.card .detail .completed-payment { position: static; width: 100%; height: auto; margin-top: 25px; }
.card .detail .payment-record, .card .detail .payment-divider, .card .detail .record-link { width: 100%; }
.card .detail .total { position: static; width: auto; margin-top: 25px; }
/* Standard traveling-card geometry for the regular status detail card. */
.standard-scroll { position: absolute; top: 175px; left: 0; width: 430px; height: calc(var(--mobile-height, 932px) - 175px); }
.standard-detail-card { position: relative; top: 0; left: 0; width: 430px; min-height: 0; height: auto !important; padding: 20px 30px 0; box-sizing: border-box; border-radius: 25px; }
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
@media (max-width:599px) { .page { height: var(--mobile-height,100dvh); } }
</style>
