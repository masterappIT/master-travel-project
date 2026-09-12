<template>
  <view class="page" :style="responsiveStyle">
    <view v-if="loadError" class="load-error">訂單不存在或無權查看</view>
    <template v-else>
      <view class="header">
        <OrdersBackButton icon-src="/static/orders/traveling-back.svg" @tap="goBack" />
        <text class="number">訂單編號：{{ orderNumber }}</text>
      </view>
      <view class="assist"><image src="/static/orders/help.svg" mode="aspectFit" /><text>訂單協助</text></view>
      <view class="status"><image src="/static/orders/status-blue.svg" mode="aspectFit" /><text>待出行</text></view>
      <scroll-view class="traveling-scroll" scroll-y>
        <view class="traveling-content">
          <view :class="['traveling-card', { 'long-addresses': hasLongAddress }]">
            <view class="card-top"><view class="locations"><view :class="{ 'long-location': isLongAddress(originLabel) }"><image src="/static/orders/origin.svg" mode="aspectFit" /><text>{{ formatAddressLabel(originLabel) }}</text></view><view :class="{ 'long-location': isLongAddress(destinationLabel) }"><image src="/static/orders/destination.svg" mode="aspectFit" /><text>{{ formatAddressLabel(destinationLabel) }}</text></view></view><view class="payment completed"><view class="paid-tag">已付款</view></view></view>
            <view class="times"><text>預約時間 ：{{ bookingTime }}</text><text>到達時間 ：{{ arrivalTime }}</text></view>
            <view class="passenger-title">乘客及聯絡資料：</view>
            <view class="passenger"><view><image src="/static/orders/passenger.svg" mode="aspectFit" /><text>{{ passengerLabel }}</text></view><view><image src="/static/orders/phone.svg" mode="aspectFit" /><text>{{ passengerPhoneLabel }}</text></view>            </view>
            <view class="detail">
              <text class="detail-title">訂單詳細</text><text class="detail-date">{{ detailDateLabel }}</text><view class="line" />
              <view class="row"><text>{{ vehicleLabel }}</text><text>{{ currencyLabel }} {{ baseFareTotal.toFixed(2) }}</text></view>
              <view v-for="item in surchargeItems" :key="item.label" class="row"><text>{{ item.label }}</text><text>{{ formatLineAmount(item) }}</text></view>
              <view class="row"><text>優惠券抵扣</text><text>{{ discountLabel }}</text></view>
              <view class="total">Total： {{ currencyLabel }} {{ paymentTotal.toFixed(2) }}</view>
              <view v-if="storedOrder?.payment" class="completed-payment"><view v-if="storedOrder.payment.fareAmount > 0" class="payment-record"><image src="/static/vehicles/payment/payment-wallet-fare.svg" mode="aspectFit" /><text>車費餘額</text><text class="record-amount">-{{ currencyLabel }} {{ storedOrder.payment.fareAmount.toFixed(2) }}</text></view><view v-if="storedOrder.payment.cashAmount > 0" class="payment-record"><image src="/static/vehicles/payment/payment-wallet-cash.svg" mode="aspectFit" /><text>現金餘額</text><text class="record-amount">-{{ currencyLabel }} {{ storedOrder.payment.cashAmount.toFixed(2) }}</text></view><view class="payment-divider" /><view class="record-link" @tap="showPaymentRecords">相關支付紀錄 <text>›</text></view></view>
            </view>
          </view>
        </view>
      </scroll-view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useResponsiveCanvas } from '../../composables/useResponsiveCanvas'
import { useTripStore } from '../../stores/trip'
import { closeCachedPage, cachedPageUrl, cachedPageStack, openCachedPage } from '../../utils/navigation'
import OrdersBackButton from '../../components/orders/OrdersBackButton.vue'
import { formatOrderDetailAddress } from '../../utils/orderAddress'
import { getClientTrip, type ClientTrip } from '../../services/api'
import { formatCurrencyAmount, normalizeCurrency } from '../../composables/useCurrency'

const { responsiveStyle } = useResponsiveCanvas()
const tripStore = useTripStore()
const storedOrder = ref<ClientTrip>()
const orderNumber = computed(() => {
  const digits = (storedOrder.value?.id || '').replace(/\D/g, '')
  return digits ? `A${digits.slice(-8).padStart(8, '0')}` : '—'
})
const parseQueryParams = (url = '') => Object.fromEntries((url.split('?')[1] || '').split('&').filter(Boolean).map(pair => { const [key, ...value] = pair.split('='); return [decodeURIComponent(key), decodeURIComponent(value.join('=') || '')] }))
const loadError = ref(false)
const loadOrder = async (url = '') => {
  const id = parseQueryParams(url).id
  if (!id) {
    loadError.value = true
    return
  }
  loadError.value = false
  try { storedOrder.value = await getClientTrip(id) }
  catch (error) { loadError.value = true; uni.showToast({ title: error instanceof Error ? error.message : '訂單載入失敗', icon: 'none' }) }
}
const loadCurrentOrder = () => {
  const candidates = [cachedPageUrl.value]
  if (typeof window !== 'undefined' && window.location.hash) candidates.push(window.location.hash)
  const source = candidates.find(candidate => parseQueryParams(candidate).id)
  if (source) void loadOrder(source)
}
onLoad(options => { void loadOrder(options ? `?id=${options.id || ''}` : '') })
onMounted(loadCurrentOrder)
// #ifdef MP-WEIXIN || MP-TOUTIAO
watch(cachedPageUrl, loadCurrentOrder)
// #endif
const addressLabel = (value: string | undefined, fallback: string) => formatOrderDetailAddress(value, fallback)
const originLabel = computed(() => addressLabel(storedOrder.value?.origin || tripStore.activeTrip?.origin, '香港國際機場'))
const destinationLabel = computed(() => addressLabel(storedOrder.value?.destination || tripStore.activeTrip?.destination, '深圳灣口岸'))
const passengerLabel = computed(() => {
  const passenger = storedOrder.value?.passenger
  if (!passenger) return '—'
  const genderLabel = passenger.gender === 'MALE' ? '先生' : passenger.gender === 'FEMALE' ? '女士' : ''
  return `${passenger.name}${genderLabel ? `（${genderLabel}）` : ''}`
})
const passengerPhoneLabel = computed(() => storedOrder.value?.passenger ? `${storedOrder.value.passenger.countryCode} - ${storedOrder.value.passenger.phoneNumber}` : '—')
const formatDateTime = (value?: string) => { const date = value ? new Date(value) : null; return date && !Number.isNaN(date.valueOf()) ? `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}` : '—' }
const bookingTime = computed(() => formatDateTime(storedOrder.value?.scheduledAt || tripStore.departureTime))
const arrivalTime = computed(() => formatDateTime(storedOrder.value?.estimatedArrivalAt))
const vehicleLabel = computed(() => `${storedOrder.value?.vehicle?.categoryName || tripStore.chosenVehicle?.title || '跨境商務車'}（${storedOrder.value?.vehicle?.seats || tripStore.chosenVehicle?.seats || 0}座）`)
const amountLabel = computed(() => formatCurrencyAmount(storedOrder.value?.payment?.total || storedOrder.value?.quote?.total || 0, normalizeCurrency(storedOrder.value?.payment?.currency || storedOrder.value?.quote?.currency) || 'RMB'))
const currencyLabel = computed(() => normalizeCurrency(storedOrder.value?.payment?.currency || storedOrder.value?.quote?.currency) || 'RMB')
const quoteLines = computed(() => storedOrder.value?.quote?.lines || [])
const baseFareTotal = computed(() => quoteLines.value.filter(item => item.type !== 'EXTRA' && item.type !== 'DISCOUNT').reduce((sum, item) => sum + Number(item.totalAmount || 0), 0))
const surchargeItems = computed(() => quoteLines.value.filter(item => item.type === 'EXTRA'))
const formatLineAmount = (line: { totalAmount: number; currency: string }) => formatCurrencyAmount(Math.abs(line.totalAmount), normalizeCurrency(line.currency) || currencyLabel.value)
const discountLabel = computed(() => { const line = quoteLines.value.find(item => item.type === 'DISCOUNT' && item.totalAmount < 0); return line ? `-${formatCurrencyAmount(Math.abs(line.totalAmount), normalizeCurrency(line.currency) || currencyLabel.value)}` : '—' })
const paymentTotal = computed(() => storedOrder.value?.payment?.total || storedOrder.value?.quote?.total || 0)
const detailDateLabel = computed(() => { const value = storedOrder.value?.scheduledAt; const date = value ? new Date(value) : null; return date && !Number.isNaN(date.valueOf()) ? `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}` : '—' })
const isLongAddress = (value: string) => Array.from(value.replace(/\s/g, '')).length > 14
const formatAddressLabel = (value: string) => {
  const characters = Array.from(value)
  let nonWhitespaceCount = 0
  const splitIndex = characters.findIndex(character => {
    if (!/\s/.test(character)) nonWhitespaceCount += 1
    return nonWhitespaceCount === 15
  })
  if (splitIndex < 0) return value
  return `${characters.slice(0, splitIndex).join('')}\n${characters.slice(splitIndex).join('')}`
}
const hasLongAddress = computed(() => isLongAddress(originLabel.value) || isLongAddress(destinationLabel.value))
const cardHeight = computed(() => {
  const surchargeHeight = surchargeItems.value.length * 40
  const paymentRecords = storedOrder.value?.payment ? [storedOrder.value.payment.fareAmount, storedOrder.value.payment.cashAmount].filter(amount => amount > 0).length : 0
  const addressOffset = hasLongAddress.value ? 22 : 0
  return 530 + surchargeHeight + paymentRecords * 40 + addressOffset
})
const summaryLabel = computed(() => storedOrder.value?.executionPhase === 'IN_PROGRESS' ? '行程進行中' : storedOrder.value?.executionPhase === 'DRIVER_ASSIGNED' ? '司機已安排' : '正在為您安排司機')
const getCurrentPageSource = () => { const candidates = [cachedPageUrl.value, typeof window !== 'undefined' ? window.location.hash : '']; for (const candidate of candidates) { const params = parseQueryParams(candidate); if (params.from || params.returnTo) return params.from || params.returnTo } return '' }
const goBack = () => {
  if (getCurrentPageSource() === 'profile') return closeCachedPage('/pages/trips/trips')
  const currentIndex = cachedPageStack.value.findIndex(entry => (entry || '').split('?')[0] === '/pages/orders/traveling-detail')
  const previous = currentIndex > 0 ? (cachedPageStack.value[currentIndex - 1] || '').split('?')[0] : ''
  return closeCachedPage(previous === '/pages/trips/trips' ? previous : '/pages/orders/orders')
}
const showPaymentRecords = () => openCachedPage(`/pages/transactions/expense-detail?tripId=${encodeURIComponent(storedOrder.value?.id || '')}`)
</script>
<style scoped>
:global(html), :global(body), :global(#app) { width: 100%; height: 100%; margin: 0; overflow: hidden; }
.page { position: fixed; inset: 0 auto auto 0; width: 430px; height: var(--mobile-height, 932px); overflow: hidden; background: #f0f2f5; color: #38434a; font-family: 'Noto Sans TC', sans-serif; transform: scale(var(--mobile-scale, 1)); transform-origin: top left; }
.header { position: absolute; z-index: 2; top: 0; left: 0; width: 430px; height: 110px; border-radius: 0 0 25px 25px; background: #fff; }
.traveling-title { position: absolute; top: 58px; left: 50%; transform: translateX(-50%); font-size: 18px; font-weight: 500; line-height: 27px; }
.traveling-scroll { position: absolute; top: 170px; right: 0; bottom: 0; left: 0; width: 430px; height: calc(var(--mobile-height, 932px) - 170px); overflow: auto; }
.traveling-order-number { display: flex; align-items: center; height: 56px; padding: 0 38px; box-sizing: border-box; background: #edf0f2; font-size: 18px; font-weight: 500; }
.traveling-status-row { display: flex; height: 23px; padding: 10px 15px 0; box-sizing: content-box; }
.traveling-waiting { display: flex; align-items: center; color: #285cfc; font-size: 12px; font-weight: 700; }
.waiting-mark { position: relative; width: 20px; height: 20px; margin-right: 5px; }
.waiting-mark image { position: absolute; inset: 0; width: 20px; height: 20px; }
.waiting-dot { top: 7px !important; left: 7px !important; width: 6px !important; height: 6px !important; }
.traveling-summary { display: flex; flex-direction: column; align-items: center; gap: 10px; height: 124px; text-align: center; color: #285cfc; }
.traveling-summary > image:first-child { width: 30px; height: 30px; }
.traveling-summary > text { font-size: 18px; font-weight: 700; }
.traveling-confirm { display: flex; align-items: center; gap: 5px; color: #38434a; font-size: 12px; font-weight: 300; }
.traveling-confirm image { width: 20px; height: 20px; }
.traveling-car { width: 32px; height: 32px; }
.traveling-time { display: flex; align-items: center; gap: 5px; font-size: 14px; font-weight: 500; }
.traveling-time image { width: 25px; height: 25px; }
.traveling-locations { display: flex; flex-direction: column; gap: 10px; margin: 18px 6px 0; font-size: 14px; }
.traveling-locations image { width: 18px; height: 18px; flex: none; }
.traveling-vehicle { margin: 17px 0 0 40px; color: #000; font-size: 14px; font-weight: 300; }
.traveling-passenger { display: flex; flex-direction: column; gap: 10px; margin-top: 20px; font-size: 14px; }
.traveling-passenger view { display: flex; align-items: center; gap: 10px; }
.traveling-passenger view image { width: 20px; height: 20px; }
.traveling-passenger view:last-child image { width: 15px; height: 15px; margin-left: 2px; }
.traveling-divider { width: 100%; height: 1px; margin-top: 20px; overflow: hidden; }
.traveling-divider image { width: 100%; height: 1px; }
.traveling-record image { width: 20px; height: 20px; }
.number { position: absolute; top: 58px; left: 122px; font-size: 18px; font-weight: 500; }
.long-addresses .times { top: 102px; }
.long-addresses .passenger-title { top: 157px; }
.long-addresses .passenger { top: 187px; }
.long-addresses .detail { top: 247px; } .passenger view {
  display: flex;
  align-items: center;
  height: 30px;
  gap: 10px;
} .passenger image {
  width: 20px;
  height: 20px;
} .passenger view:last-child image {
  width: 15px;
  height: 15px;
  margin-left: 2px;
}
.amount { position: absolute; top: 0; right: 0; color: #285cfc; font-weight: 700; white-space: nowrap; }
.detail-title { font-size: 18px; font-weight: 500; }
.detail-date { float: right; margin-top: 3px; font-size: 14px; }
.line { height: 1px; margin-top: 25px; background: #d9d9d9; }
.row { display: flex; justify-content: space-between; gap: 15px; margin-top: 20px; font-size: 18px; font-weight: 300; }
.row text:last-child { white-space: nowrap; }
.total { margin-top: 25px; text-align: right; font-size: 16px; font-weight: 500; }
.payment-divider { width: 370px; height: 1px; margin-top: 5px; background: #d9d9d9; }
.payment-record { display: flex; align-items: center; gap: 10px; min-height: 40px; box-sizing: border-box; font-size: 14px; }
.payment-record image { flex: none; width: 25px; height: 25px; }
.record-amount { margin-left: auto; color: #38434a; font-size: 16px; line-height: 25px; white-space: nowrap; }
.record-link { display: flex; align-items: center; justify-content: space-between; width: 370px; margin-top: 25px; font-size: 14px; font-weight: 300; }
.record-link text { font-size: 26px; line-height: 15px; }
.assist { position: absolute; z-index: 1; top: 130px; right: 33px; display: flex; align-items: center; gap: 10px; color: #285cfc; font-size: 16px; }
.assist image { width: 25px; height: 25px; }
.status { position: absolute; z-index: 1; top: 130px; left: 33px; display: flex; align-items: center; gap: 5px; color: #285cfc; font-size: 16px; font-weight: 700; }
.status image { width: 25px; height: 25px; }
.load-error { padding-top: 200px; text-align: center; color: #38434a; font-size: 16px; }

.traveling-card {
  position: relative;
  width: 430px;
  min-height: 643px;
  margin: 0;
  border-radius: 25px;
  background: #fff;
  padding: 20px 30px;
  box-sizing: border-box;
}
.card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  min-height: 70px;
} .locations {
  position: static;
  top: 20px;
  left: 33px;
  font-size: 14px;
  width: 270px;
} .locations view {
  display: flex;
  align-items: flex-start;
  min-height: 30px;
  gap: 20px;
} .locations image {
  flex: none;
  width: 18px;
  height: 18px;
  margin-top: 6px;
} .locations .long-location image {
  margin-top: 2px;
} .locations text {
  display: block;
  line-height: 30px;
  white-space: pre-line;
  flex: 1;
  min-width: 0;
} .locations .long-location {
  min-height: 44px;
  align-items: flex-start;
} .locations .long-location text {
  width: auto;
  line-height: 22px;
  white-space: pre-line;
  overflow-wrap: normal;
  word-break: keep-all;
} .payment {
  position: absolute;
  top: 15px;
  left: auto;
  width: 164px;
  height: auto;
  font-size: 14px;
  font-weight: 300;
  right: 25px;
  min-height: 70px;
}
.payment .paid-tag {
  margin-top: 0;
}
.amount,
.paid-tag {
  position: static;
  display: block;
  width: max-content;
  margin-left: auto;
} .paid-tag {
  position: absolute;
  top: 0;
  right: 0;
  padding: 5px 10px;
  border: 1px solid #285cfc;
  border-radius: 10px;
  color: #285cfc;
  font-weight: 700;
  line-height: 20px;
  white-space: nowrap;
  margin-top: 0;
}
.times,
.passenger-title,
.passenger,
.detail {
  position: static;
} .times {
  position: absolute;
  top: 80px;
  left: 33px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 14px;
  font-weight: 300;
  margin-top: 10px;
} .passenger-title {
  position: absolute;
  top: 135px;
  left: 33px;
  font-size: 14px;
  margin-top: 22px;
} .passenger {
  position: absolute;
  top: 165px;
  left: 33px;
  font-size: 14px;
  margin-top: 8px;
} .detail {
  position: absolute;
  top: 225px;
  left: 0;
  width: auto;
  min-height: 0;
  padding: 0;
  box-sizing: border-box;
  margin: 25px 0 0;
}
.long-addresses .times,
.long-addresses .passenger-title,
.long-addresses .passenger,
.long-addresses .detail { position: static; } .completed-payment {
  margin-top: 25px;
  width: 370px;
  margin-bottom: 0;
  padding-bottom: 0;
}
.payment-divider,
.record-link {
  width: 370px;
} .traveling-content {
  padding-bottom: 32px;
  padding-top: 0;
}
</style>
