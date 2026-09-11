<template>
  <view class="page" :style="responsiveStyle">
    <HomeMap v-if="confirmMapVisible" map-id="vehicle-confirm-map" :latitude="mapCenter.latitude" :longitude="mapCenter.longitude" :scale="13" :markers="mapMarkers" :polyline="mapPolyline" :pickup-label="mapOriginLabel" :destination-label="mapDestinationLabel" :route-summary="mapRouteSummary" :native-height="confirmMapHeight" :map-top="0" />
    <view class="back" @tap="goBack"><image src="/static/vehicles/confirm-back.svg" mode="aspectFit" /></view>
    <view class="summary-panel">
      <view class="route" @tap="editSheetOpen = true">
        <image class="route-dot" src="/static/vehicles/confirm-origin.svg" mode="aspectFit" /><text>{{ originLabel }}</text>
        <image class="route-arrow" src="/static/vehicles/route.svg" mode="aspectFit" />
        <image class="route-dot destination" src="/static/vehicles/destination.svg" mode="aspectFit" /><text>{{ destinationLabel }}</text>
        <text class="booking-time">預約時間 ： {{ bookingTime }}</text>
      </view>
      <scroll-view class="charge-lines" scroll-y :show-scrollbar="false">
        <view v-for="(line, index) in summaryLines" :key="`${index}-${line.label}`" :class="['charge-row', { first: index === 0, discount: line.type === 'DISCOUNT' }]"><text class="charge-label">{{ line.label }}</text><text class="charge-price">{{ formatSummaryAmount(line.amount) }}</text></view>
        <view v-if="!summaryLines.length" class="charge-row"><text class="charge-label">報價</text><text class="charge-price">暫無報價</text></view>
      </scroll-view>
      <view class="divider first-divider" />
      <view class="divider second-divider" />
      <image class="coupon-info" src="/static/vehicles/coupon-info.svg" mode="aspectFit" @tap.stop="detailPriceOpen = true" />
      <view class="payment-bar">
        <view class="available" @tap="openCoupons">可用優惠</view>
        <view class="total"><text class="price-label">優惠價</text><text class="amount">{{ format(total) }}</text></view>
        <view class="pay" @tap="payNow">立即出行</view>
      </view>
      <view class="notice"><image src="/static/vehicles/confirm-notice.svg" mode="aspectFit" /><text>訂單成功支付後，若取消或修改訂單規則。</text></view>
    </view>
    <view class="selected-card"><VehicleCard :vehicle="vehicle" :quote="selectedFareQuote" :selected="true" selectable /></view>
    <view class="quick-links"><text class="edit-trip" @tap="editSheetOpen = true">修改行程</text><text @tap="rideForOtherOpen = true">幫人叫車</text><text>聯繫客服</text></view>
    <view v-if="rideForOtherOpen" class="ride-for-other-mask" @tap="rideForOtherOpen = false">
      <view class="ride-for-other-sheet" @tap.stop>
        <image class="ride-for-other-graphic" src="/static/vehicles/ride-for-other-graphic.svg" mode="aspectFit" />
        <text class="ride-for-other-title">幫人叫車</text>
        <image class="ride-for-other-close" src="/static/vehicles/ride-for-other-close.svg" mode="aspectFit" @tap="rideForOtherOpen = false" />
        <input class="ride-for-other-field" type="number" placeholder="請輸入乘車人手機號碼" placeholder-class="ride-for-other-placeholder" />
        <input class="ride-for-other-field name" type="text" placeholder="乘車人姓名" placeholder-class="ride-for-other-placeholder" />
        <button class="ride-for-other-confirm">確認</button>
      </view>
    </view>
    <view v-if="paymentOpen" class="payment-mask" @tap="closePayment">
      <view class="payment-sheet" @tap.stop>
        <image class="payment-close" src="/static/vehicles/payment/payment-close.svg" mode="aspectFit" @tap="closePayment" />
        <image class="payment-back" src="/static/vehicles/payment/payment-back.svg" mode="aspectFit" @tap="closePayment" />
        <text class="payment-title">訂單詳細</text>
        <text class="payment-countdown">交易時間剩餘：{{ formattedCountdown }}</text>
        <view class="payment-amount"><text class="payment-currency">{{ quoteCurrency }}</text><text class="payment-number">{{ formatQuoteNumber(total) }}</text></view>
        <text class="payment-method-label">支付方式</text>
        <view class="payment-options wallet-options">
          <view v-if="paymentSettings.fareBalancePayEnabled !== false" class="payment-option" @tap="toggleWallet('fare')"><image src="/static/vehicles/payment/payment-wallet-fare.svg" mode="aspectFit" /><view class="payment-option-copy"><text>車費餘額</text><text class="payment-balance">（{{ format(wallet.fare, 2) }}）</text></view><image class="payment-radio" :src="walletSelections.fare ? '/static/vehicles/payment/payment-radio-selected.svg' : '/static/vehicles/payment/payment-radio-unselected.svg'" mode="aspectFit" /></view>
          <view v-if="paymentSettings.cashBalancePayEnabled !== false" class="payment-option" @tap="toggleWallet('cash')"><image src="/static/vehicles/payment/payment-wallet-cash.svg" mode="aspectFit" /><view class="payment-option-copy"><text>現金餘額</text><text class="payment-balance">（{{ format(wallet.withdrawable, 2) }}）</text></view><image class="payment-radio" :src="walletSelections.cash ? '/static/vehicles/payment/payment-radio-selected.svg' : '/static/vehicles/payment/payment-radio-unselected.svg'" mode="aspectFit" /></view>
        </view>
        <view v-if="externalAllocation > 0" class="payment-options external-options">
          <view v-if="paymentSettings.wechatPayEnabled !== false" class="payment-option" @tap="selectedPayment = 'wechat'"><image src="/static/vehicles/payment/payment-wechat.svg" mode="aspectFit" /><text>微信支付（支持香港/澳門）</text><image class="payment-radio" :src="selectedPayment === 'wechat' ? '/static/vehicles/payment/payment-radio-selected.svg' : '/static/vehicles/payment/payment-radio-unselected.svg'" mode="aspectFit" /></view>
          <!-- #ifndef MP-WEIXIN || MP-TOUTIAO -->
          <view v-if="paymentSettings.alipayPayEnabled !== false" class="payment-option" @tap="selectedPayment = 'alipay'"><image src="/static/vehicles/payment/payment-alipay.svg" mode="aspectFit" /><text>支付寶支付</text><image class="payment-radio" :src="selectedPayment === 'alipay' ? '/static/vehicles/payment/payment-radio-selected.svg' : '/static/vehicles/payment/payment-radio-unselected.svg'" mode="aspectFit" /></view>
          <view v-if="paymentSettings.bankCardPayEnabled !== false" class="payment-option bank-option" @tap="selectedPayment = 'bank'"><image src="/static/vehicles/payment/payment-bank.svg" mode="aspectFit" /><text>銀行帳戶 支付</text><image class="payment-chevron" src="/static/vehicles/payment/payment-chevron.svg" mode="aspectFit" /></view>
          <!-- #endif -->
        </view>
        <view class="payment-confirm" @tap="confirmPayment">確認支付</view>
      </view>
    </view>
    <view v-if="paymentSuccessOpen" class="payment-success-mask" @tap="closePaymentSuccess">
      <view class="payment-success-dialog" @tap.stop>
        <image class="payment-success-icon" src="/static/vehicles/payment/payment-success.svg" mode="aspectFit" />
        <text class="payment-success-message">支付成功 {{ formatQuoteAmount(total) }}</text>
        <view class="payment-success-button" @tap="closePaymentSuccess">完成</view>
      </view>
    </view>
    <TripEditSheet v-if="editSheetOpen" :origin="tripStore.activeTrip?.origin || '香港 · 九龍站'" :destination="tripStore.activeTrip?.destination || '廣東 · 深圳灣口岸'" :departure-time="tripStore.departureTime" :origin-selection="originSelection" :destination-selection="destinationSelection" @close="editSheetOpen = false" @confirm="saveTripChanges" />
    <view v-if="detailPriceOpen" class="detail-price-page">
      <text class="detail-price-title">詳細價格</text>
      <image class="detail-price-back" src="/static/vehicles/detail-price-back.svg" mode="aspectFit" @tap="detailPriceOpen = false" />
      <view class="detail-price-amount"><text class="amount-number">{{ formatDetailAmount(total) }}</text></view>
      <text class="detail-price-time-label">用車時間</text><text class="detail-price-time">{{ bookingTime }}</text>
      <view v-for="(line, index) in detailLines" :key="`${line.order}-${line.sourceId || line.label}`" :class="['detail-price-row', line.type.toLowerCase()]" :style="{ top: `${detailRowTop(line, index)}px` }"><text>{{ line.label }}</text><text class="detail-price-value">{{ formatDetailAmount(line.totalAmount) }}</text></view>
      <view v-if="!detailLines.length" class="detail-price-row vehicle" :style="{ top: `${detailRowTop(null, 0)}px` }"><text>報價</text><text class="detail-price-value">暫無報價</text></view>
      <view class="detail-price-line first"></view>
      <text class="detail-price-service" :style="{ top: `${detailFooterTop}px` }">用車服務費（包含高速費、停車費、路橋費）</text>
      <view class="detail-price-line second" :style="{ top: `${detailFooterTop + 19}px` }"></view>
      <text class="detail-price-total" :style="{ top: `${detailFooterTop + 30}px` }">Total： {{ formatDetailAmount(total) }}</text>
    </view>
    <view v-if="confirmLoading" class="confirm-loading"><text>載入確認資料…</text></view>
    <view v-if="confirmError" class="confirm-error" @tap="returnToVehicleSelection">
      <text class="confirm-error-title">確認資料暫時無法載入</text>
      <text class="confirm-error-message">{{ confirmError }}</text>
      <text class="confirm-error-action">返回選擇車型</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, nextTick } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useResponsiveCanvas } from '../../composables/useResponsiveCanvas'
import { useTripStore } from '../../stores/trip'
import { createFareQuote, planDrivingRoute, getSettings, getWalletMe, payTrip, type AppSettings } from '../../services/api'
import type { Coordinate } from '../../services/api'
import type { AddressSelection } from '../../components/home/AddressPicker.vue'
import { cachedPagePath, closeCachedPage, openCachedPage } from '../../utils/navigation'
import TripEditSheet from '../../components/home/TripEditSheet.vue'
import VehicleCard from '../../components/vehicles/VehicleCard.vue'
import HomeMap from '../../components/home/HomeMap.vue'
import { useCurrency } from '../../composables/useCurrency'
import { reactive } from 'vue'
import { persistWallet, readWallet, type WalletState } from '../../utils/wallet'
const { responsiveStyle } = useResponsiveCanvas()
const { currency, format } = useCurrency()
const wallet = reactive<WalletState>(readWallet())
const paymentSettings = ref<AppSettings>({
  language: "zh-HK",
  region: "香港",
  currency: "HKD",
  fareBalancePayEnabled: true,
  cashBalancePayEnabled: true,
  wechatPayEnabled: true,
  alipayPayEnabled: true,
  bankCardPayEnabled: true,
  sandboxMode: false
})
const walletSelections = reactive({ fare: true, cash: true })
const fareAllocation = computed(() => (walletSelections.fare && paymentSettings.value.fareBalancePayEnabled !== false) ? Math.min(wallet.fare, Number(total.value)) : 0)
const cashAllocation = computed(() => (walletSelections.cash && paymentSettings.value.cashBalancePayEnabled !== false) ? Math.min(wallet.withdrawable, Math.max(0, Number(total.value) - fareAllocation.value)) : 0)
const externalAllocation = computed(() => Math.max(0, Number(total.value) - fareAllocation.value - cashAllocation.value))
const tripStore = useTripStore()
const editSheetOpen = ref(false)
const rideForOtherOpen = ref(false)
const detailPriceOpen = ref(false)
const paymentOpen = ref(false)
const paymentSuccessOpen = ref(false)
const paidTripId = ref('')
const selectedPayment = ref('wechat')
const countdownSeconds = ref(300)
let countdownTimer: ReturnType<typeof setInterval> | null = null

const formattedCountdown = computed(() => {
  const m = Math.floor(countdownSeconds.value / 60)
  const s = countdownSeconds.value % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
})

const startCountdown = () => {
  if (countdownTimer) clearInterval(countdownTimer)
  countdownSeconds.value = 300
  countdownTimer = setInterval(() => {
    if (countdownSeconds.value > 0) {
      countdownSeconds.value--
    } else {
      if (countdownTimer) clearInterval(countdownTimer)
    }
  }, 1000)
}

const stopCountdown = () => {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
}
const mapMarkers = ref<Array<Coordinate & { id: number; title?: string; iconPath?: string; width?: number; height?: number }>>([])
const mapPolyline = ref<Array<{ points: Coordinate[]; color: string; width: number; arrowLine: boolean }>>([])
const mapCenter = computed(() => {
  const route = tripStore.activeDraft.route
  return {
    latitude: route.destinationLatitude ?? route.originLatitude ?? 22.3193,
    longitude: route.destinationLongitude ?? route.originLongitude ?? 114.1694
  }
})
const mapOriginLabel = computed(() => tripStore.activeDraft.route.origin || '出發地')
const mapDestinationLabel = computed(() => tripStore.activeDraft.route.destination || '目的地')
const mapRouteSummary = ref('')
const confirmMapHeight = 642
const confirmMapVisible = computed(() => {
  // #ifdef MP-WEIXIN || MP-TOUTIAO
  return cachedPagePath.value === '/pages/vehicles/confirm'
  // #endif
  return true
})
const confirmLoading = ref(true)
const confirmError = ref('')
let confirmationTask: Promise<void> | null = null
const requiredDataReady = () => {
  const route = tripStore.activeDraft.route
  return Boolean(tripStore.chosenVehicle && route.origin && route.destination &&
    Number.isFinite(tripStore.activeDraft.distanceMeters))
}
const restoreQuote = async () => {
  const vehicle = tripStore.chosenVehicle
  const route = tripStore.activeDraft.route
  const distanceMeters = tripStore.activeDraft.distanceMeters
  if (!vehicle?.categoryId || !Number.isFinite(distanceMeters)) return false
  const quote = await createFareQuote({
    categoryId: vehicle.categoryId,
    vehicleId: vehicle.id,
    distanceMeters: distanceMeters!,
    originRegion: route.originRegion || routeRegion(route.origin, ''),
    originCity: route.originCity,
    destinationRegion: route.destinationRegion || routeRegion(route.destination, ''),
    destinationCity: route.destinationCity,
    scheduledAt: tripStore.departureTime,
    couponCode: tripStore.activeDraft.couponCode,
    extraIds: tripStore.activeDraft.extras,
    displayCurrency: currency.value
  })
  tripStore.setFareQuote(quote)
}
const validateConfirmation = async () => {
  if (confirmationTask) return confirmationTask
  confirmationTask = (async () => {
    confirmLoading.value = true
    confirmError.value = ''
    if (!requiredDataReady()) {
      confirmError.value = '行程或車型資料已失效，請重新選擇。'
      confirmLoading.value = false
      return
    }
    try {
      if (!tripStore.selectedFareQuote) await restoreQuote()
      await nextTick()
      if (!tripStore.selectedFareQuote) throw new Error('報價暫時無法取得，請稍後重試。')
      void updateConfirmMap()
    } catch (error) {
      confirmError.value = error instanceof Error ? error.message : '確認資料載入失敗，請稍後重試。'
    } finally {
      confirmLoading.value = false
    }
  })()
  try {
    await confirmationTask
  } finally {
    confirmationTask = null
  }
}

const vehicle = computed(() => tripStore.chosenVehicle || {
  id: 'premium-vellfire',
  brand: 'Toyota',
  model: 'Vellfire',
  series: '20系',
  seats: 7,
  image: '/static/vehicles/vellfire.png',
  selectable: true
})
const selectedFareQuote = computed(() => tripStore.selectedFareQuote)
const fareLines = computed(() => selectedFareQuote.value?.lines || [])
const total = computed(() => selectedFareQuote.value?.total ?? 0)
const vehicleLabel = computed(() => `${selectedFareQuote.value?.pricing?.categoryName || '高級跨境商務車'}（${selectedFareQuote.value?.vehicle?.seats || vehicle.value.seats}座）`)
const vehicleAmount = computed(() => fareLines.value
  .filter(line => line.type === 'DISTANCE_TIER')
  .reduce((sum, line) => sum + line.totalAmount, 0))
const detailLines = computed(() => selectedFareQuote.value
  ? [{ type: 'VEHICLE', sourceId: selectedFareQuote.value.vehicle?.id || vehicle.value.id, label: vehicleLabel.value, totalAmount: vehicleAmount.value, order: 0 }, ...fareLines.value.filter(line => line.type !== 'DISTANCE_TIER').map(line => ({ ...line, label: line.label }))]
  : [])
const summaryLines = computed(() => {
  const lines = fareLines.value
  if (!lines.length) return []
  const discountAmount = lines
    .filter(line => line.type === 'DISCOUNT')
    .reduce((sum, line) => sum + line.totalAmount, 0)
  const extraLine = lines.find(line => line.type === 'EXTRA')
  return [
    { type: 'VEHICLE', label: vehicleLabel.value, amount: vehicleAmount.value },
    ...(extraLine ? [{ type: extraLine.type, label: extraLine.label, amount: extraLine.totalAmount }] : []),
    ...(discountAmount < 0 ? [{ type: 'DISCOUNT', label: '優惠券抵扣', amount: discountAmount }] : [])
  ]
})
const formatSummaryAmount = (amount: number) => `${amount < 0 ? '-' : ''}${currencySymbol(selectedFareQuote.value?.currency)}${Math.abs(amount).toFixed(0)}`
const formatDetailAmount = (amount: number) => `${amount < 0 ? '-' : ''}${currencySymbol(selectedFareQuote.value?.currency)} ${Math.abs(amount).toFixed(0)}`
const detailRowTop = (_line: { type: string } | null, index: number) => 309 + index * 41
const detailFooterTop = computed(() => 370 + Math.max(0, detailLines.value.length - 1) * 41)
const originLabel = computed(() => cityName(tripStore.activeTrip?.origin, '香港'))
const destinationLabel = computed(() => cityName(tripStore.activeTrip?.destination, '深圳'))
const bookingTime = computed(() => {
  if (!tripStore.departureTime) return 'March 15 2024 14:00'
  const date = new Date(tripStore.departureTime)
  return Number.isNaN(date.valueOf())
    ? tripStore.departureTime
    : `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
})
const currencySymbol = (value: string | undefined) => {
  if (value === 'HKD' || value === 'HKD$') return 'HK$'
  if (value === 'RMB' || value === 'RMB¥') return '¥'
  return ''
}
const quoteCurrency = computed(() => currencySymbol(selectedFareQuote.value?.currency))
const formatQuoteNumber = (amount: number) => amount.toFixed(2)
const formatQuoteAmount = (amount: number) => {
  if (!selectedFareQuote.value) return '—'
  return `${amount < 0 ? '-' : ''}${quoteCurrency.value}${formatQuoteNumber(Math.abs(amount))}`
}
const cityName = (value: string | undefined, fallback: string) => { const text = value?.trim() || ''; if (text.includes('香港')) return '香港'; if (text.includes('深圳') || text.includes('廣東')) return '深圳'; return text.split(/[·，,\s]/)[0] || fallback }
const routeRegion = (value: string | undefined, fallback: string) => {
  const text = value?.trim() || ''
  if (text.includes('香港')) return '香港'
  if (text.includes('澳門') || text.includes('澳门')) return '澳門'
  if (text.includes('廣東') || text.includes('广东') || text.includes('深圳') || text.includes('珠海') || text.includes('廣州') || text.includes('广州')) return '大陸'
  return fallback
}
const originSelection = computed<AddressSelection | null>(() => {
  const route = tripStore.activeDraft.route
  return route.originLatitude !== undefined && route.originLongitude !== undefined ? { name: route.origin, address: route.origin, region: (route.originRegion as AddressSelection['region']) || null, city: route.originCity, latitude: route.originLatitude, longitude: route.originLongitude } : null
})
const destinationSelection = computed<AddressSelection | null>(() => {
  const route = tripStore.activeDraft.route
  return route.destinationLatitude !== undefined && route.destinationLongitude !== undefined ? { name: route.destination, address: route.destination, region: (route.destinationRegion as AddressSelection['region']) || null, city: route.destinationCity, latitude: route.destinationLatitude, longitude: route.destinationLongitude } : null
})
const updateConfirmMap = async () => {
  const route = tripStore.activeDraft.route
  if (route.originLatitude === undefined || route.originLongitude === undefined || route.destinationLatitude === undefined || route.destinationLongitude === undefined) return
  const origin = { latitude: route.originLatitude, longitude: route.originLongitude }
  const destination = { latitude: route.destinationLatitude, longitude: route.destinationLongitude }
  mapMarkers.value = [
    { id: 1, ...origin, title: '出發地', iconPath: '/static/home/route/origin.svg', width: 20, height: 36 },
    { id: 2, ...destination, title: '目的地', iconPath: '/static/home/route/destination.svg', width: 24, height: 36 }
  ]
  try {
    const routeResult = await planDrivingRoute(origin, destination)
    mapPolyline.value = [{ points: routeResult.points, color: '#285CFC', width: 6, arrowLine: true }]
    const distanceKm = routeResult.distance / 1000
    const durationMinutes = Math.max(1, Math.round(routeResult.duration / 60))
    mapRouteSummary.value = `共 ${distanceKm < 10 ? distanceKm.toFixed(1) : Math.round(distanceKm)} 公里 · 約 ${durationMinutes >= 60 ? `${Math.floor(durationMinutes / 60)} 小時${durationMinutes % 60 ? ` ${durationMinutes % 60} 分鐘` : ''}` : `${durationMinutes} 分鐘`}`
  } catch (error) {
    mapPolyline.value = []
    mapRouteSummary.value = ''
  }
}
const loadSettingsAndWallet = async () => {
  try {
    const [settingsData, walletData] = await Promise.allSettled([getSettings(), getWalletMe()])
    if (settingsData.status === "fulfilled" && settingsData.value) {
      paymentSettings.value = { ...paymentSettings.value, ...settingsData.value }
    }
    if (walletData.status === "fulfilled" && walletData.value) {
      wallet.fare = walletData.value.fareBalance
      wallet.withdrawable = walletData.value.cashBalance
      persistWallet(wallet)
    }
  } catch (e) {
    console.warn("Failed to load settings or wallet from remote", e)
  }
}
onMounted(() => {
  void validateConfirmation()
  void loadSettingsAndWallet()
})
onShow(() => {
  void validateConfirmation()
})
const returnToVehicleSelection = () => openCachedPage('/pages/vehicles/select')
const saveTripChanges = async (origin: string, destination: string, departureTime: string, nextOriginSelection: AddressSelection | null, nextDestinationSelection: AddressSelection | null) => {
  const currentRoute = tripStore.activeDraft.route
  const originCoordinate = nextOriginSelection?.latitude !== undefined && nextOriginSelection.longitude !== undefined ? { latitude: nextOriginSelection.latitude, longitude: nextOriginSelection.longitude } : currentRoute.originLatitude !== undefined && currentRoute.originLongitude !== undefined ? { latitude: currentRoute.originLatitude, longitude: currentRoute.originLongitude } : undefined
  const destinationCoordinate = nextDestinationSelection?.latitude !== undefined && nextDestinationSelection.longitude !== undefined ? { latitude: nextDestinationSelection.latitude, longitude: nextDestinationSelection.longitude } : currentRoute.destinationLatitude !== undefined && currentRoute.destinationLongitude !== undefined ? { latitude: currentRoute.destinationLatitude, longitude: currentRoute.destinationLongitude } : undefined
  tripStore.setRoute(origin, destination, { originRegion: nextOriginSelection?.region || undefined, originCity: nextOriginSelection?.city || undefined, destinationRegion: nextDestinationSelection?.region || undefined, destinationCity: nextDestinationSelection?.city || undefined, originLatitude: originCoordinate?.latitude, originLongitude: originCoordinate?.longitude, destinationLatitude: destinationCoordinate?.latitude, destinationLongitude: destinationCoordinate?.longitude })
  tripStore.setDepartureTime(departureTime)
  editSheetOpen.value = false
  if (!originCoordinate || !destinationCoordinate) return
  try {
    const route = await planDrivingRoute(originCoordinate, destinationCoordinate)
    tripStore.setRouteDistance(route.distance, route.duration)
    mapMarkers.value = [
      { id: 1, ...originCoordinate, title: '出發地', iconPath: '/static/home/route/origin.svg', width: 20, height: 36 },
      { id: 2, ...destinationCoordinate, title: '目的地', iconPath: '/static/home/route/destination.svg', width: 24, height: 36 }
    ]
    mapPolyline.value = [{ points: route.points, color: '#285CFC', width: 6, arrowLine: true }]
    const distanceKm = route.distance / 1000
    const durationMinutes = Math.max(1, Math.round(route.duration / 60))
    mapRouteSummary.value = `共 ${distanceKm < 10 ? distanceKm.toFixed(1) : Math.round(distanceKm)} 公里 · 約 ${durationMinutes >= 60 ? `${Math.floor(durationMinutes / 60)} 小時${durationMinutes % 60 ? ` ${durationMinutes % 60} 分鐘` : ''}` : `${durationMinutes} 分鐘`}`
  } catch (error) {
    tripStore.clearRouteDistance()
    uni.showToast({ title: error instanceof Error ? error.message : '路線規劃失敗，請稍後再試', icon: 'none' })
  }
}
const goBack = () => openCachedPage('/pages/index/index')
const openCoupons = () => openCachedPage('/pages/coupons/coupons')
const payNow = () => {
  if (!selectedFareQuote.value) {
    uni.showToast({ title: '報價暫時無法取得', icon: 'none' })
    return
  }
  // Auto pick available external payment channel if wechat is disabled
  if (paymentSettings.value.wechatPayEnabled !== false) {
    selectedPayment.value = 'wechat'
  } else if (paymentSettings.value.alipayPayEnabled !== false) {
    selectedPayment.value = 'alipay'
  } else if (paymentSettings.value.bankCardPayEnabled !== false) {
    selectedPayment.value = 'bank'
  }
  paymentOpen.value = true
  startCountdown()
}
const closePayment = () => {
  paymentOpen.value = false
  stopCountdown()
}
const toggleWallet = (type: 'fare' | 'cash') => { walletSelections[type] = !walletSelections[type] }
const confirmPayment = async () => {
  if (!selectedFareQuote.value) {
    uni.showToast({ title: '報價暫時無法取得', icon: 'none' })
    return
  }
  if (externalAllocation.value > 0 && !selectedPayment.value) {
    uni.showToast({ title: '請選擇外部付款方式', icon: 'none' })
    return
  }

  uni.showLoading({ title: '支付處理中...' })
  try {
    const extChannel = externalAllocation.value > 0 ? (selectedPayment.value === 'bank' ? 'bank_card' : selectedPayment.value as 'wechat' | 'alipay' | 'bank_card') : undefined
    const res = await payTrip({
      quoteId: selectedFareQuote.value.id,
      origin: tripStore.activeDraft.route.origin || originLabel.value,
      destination: tripStore.activeDraft.route.destination || destinationLabel.value,
      scheduledAt: tripStore.departureTime || undefined,
      useFareBalance: walletSelections.fare,
      useCashBalance: walletSelections.cash,
      externalPaymentMethod: extChannel
    })

    if (res && res.paidSummary) {
      wallet.fare = res.user.fareBalance
      wallet.withdrawable = res.user.cashBalance
      wallet.records.unshift({
        id: Date.now(),
        type: '出行支付',
        amount: -Number(res.total),
        time: new Date().toISOString(),
        balanceType: 'fare'
      })
      persistWallet(wallet)
    } else {
      wallet.fare = Math.max(0, wallet.fare - fareAllocation.value)
      wallet.withdrawable = Math.max(0, wallet.withdrawable - cashAllocation.value)
      wallet.records.unshift({ id: Date.now(), type: '出行支付', amount: -Number(total.value), time: new Date().toISOString(), balanceType: 'fare' })
      persistWallet(wallet)
    }

    paidTripId.value = res.tripId
    uni.hideLoading()
    paymentOpen.value = false
    paymentSuccessOpen.value = true
  } catch (error) {
    uni.hideLoading()
    uni.showToast({ title: error instanceof Error ? error.message : '支付失敗', icon: 'none' })
  }
}
const closePaymentSuccess = () => {
  paymentSuccessOpen.value = false
  openCachedPage(`/pages/vehicles/booking-success?id=${encodeURIComponent(paidTripId.value)}`)
}
</script>

<style scoped>
:global(html),:global(body),:global(#app){width:100%;height:100%;margin:0;overflow:hidden;background:#25292f}.page{position:fixed;top:50%;left:50%;width:430px;height:932px;overflow:hidden;border-radius:35px;background:#25292f;color:#fff;font-family:'Noto Sans TC',sans-serif;transform:translate(-50%,-50%) scale(min(1,calc(100vw / 430px),calc(100dvh / 932px)));transform-origin:center}.back{position:absolute;z-index:5;top:60px;left:33px;width:38px;height:38px}.back image{width:38px;height:38px}.summary-panel{position:absolute;z-index:3;top:552px;left:0;width:430px;height:380px;border-radius:25px 25px 0 0;background:#56657e}.selected-card{position:absolute;z-index:4;top:470px;left:25px;width:380px;height:180px}.selected-card :deep(.vehicle-card){margin:0}.quick-links{position:absolute;z-index:5;top:642px;left:25px;width:380px;height:40px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;gap:90px;padding:0;color:#fff;font-family:'Inria Sans',sans-serif;font-size:12px;line-height:normal;white-space:nowrap}.quick-links text{display:block;flex:0 0 auto;width:auto;white-space:nowrap;line-height:normal}.route{position:absolute;top:128px;left:53px;width:324px;height:62px;font-size:14px;font-weight:700}.route-dot{position:absolute;top:12px;left:69px;width:8px;height:15px}.route text:nth-of-type(1){position:absolute;top:9px;left:94px}.route-arrow{position:absolute;top:4px;left:139px;width:30px;height:30px}.route-dot.destination{top:13px;left:186px;height:12px}.route text:nth-of-type(2){position:absolute;top:9px;left:214px}.booking-time{position:absolute!important;top:38px!important;left:0!important;width:324px;text-align:center;font-size:14px;font-weight:100;white-space:nowrap}.charge-row{position:absolute;top:214px;left:0;width:430px;height:18px;display:block;font-size:12px;font-weight:100;line-height:normal;white-space:nowrap}.charge-row.first{top:196px}.charge-row.discount{top:232px;height:18px;font-size:14px;font-weight:700}.charge-label,.charge-price{position:absolute;top:0;display:block;width:max-content;line-height:normal;text-align:center;transform:translateX(-50%)}.charge-row.first .charge-label{left:156.5px}.charge-row:not(.first) .charge-label{left:123px}.charge-price{left:319.5px}.charge-row.discount .charge-label{left:128px}.charge-row.discount .charge-price{left:316.5px}.divider{position:absolute;height:0;border-top:1px solid rgba(255,255,255,.35)}.first-divider{top:214px;left:94px;width:244px}.second-divider{top:232px;left:94px;width:244px}.coupon-info{position:absolute;left:60px;top:210px;width:25px;height:25px}.payment-bar{position:absolute;top:272px;left:25px;width:380px;height:48px;border-radius:25px;background:#1effaa;color:#000;overflow:hidden}.available{position:absolute;left:-1px;top:0;width:95px;height:48px;border-radius:25px;background:#f95c5c;color:#fff;text-align:left;line-height:48px;padding-left:24px;box-sizing:border-box;font-family:'Inria Sans',sans-serif;font-size:12px;font-style:normal;font-weight:300;white-space:nowrap}.total{position:absolute;left:0;top:0;width:380px;height:48px;pointer-events:none}.price-label{position:absolute;top:22px;left:94px;font-size:10px;font-weight:300;line-height:normal;white-space:nowrap}.amount{position:absolute;top:50%;left:134px;width:112px;transform:translateY(-50%);font-family:'Noto Sans TC',sans-serif;font-size:24px;font-style:normal;font-weight:700;line-height:normal;text-align:left;white-space:nowrap}.pay{position:absolute;left:246px;right:auto;top:0;width:134px;height:48px;border-radius:25px;background:#fecf62;color:#fff;text-align:center;line-height:48px;padding-left:0;box-sizing:border-box;font-size:20px;font-weight:900;white-space:nowrap}.notice{position:absolute;top:325px;left:0;width:430px;display:flex;align-items:center;justify-content:center;gap:5px;color:#d9d9d9;font-family:'Inria Sans',sans-serif;font-size:14px;white-space:nowrap}.notice image{width:20px;height:20px}.ride-for-other-mask{position:absolute;inset:0;z-index:30;background:rgba(56,67,74,.9)}.ride-for-other-sheet{position:absolute;left:0;top:420px;width:430px;height:512px;box-sizing:border-box;border-radius:35px 35px 0 0;background:#38434a;color:#fff;overflow:hidden;animation:ride-for-other-slide-up .28s ease-out both}.ride-for-other-graphic{position:absolute;top:115px;left:103px;width:224px;height:281px}.ride-for-other-title{position:absolute;top:43px;left:40px;font-family:'Noto Sans TC',sans-serif;font-size:20px;font-weight:400;line-height:normal;white-space:nowrap}.ride-for-other-close{position:absolute;top:17px;left:380px;width:26px;height:26px}.ride-for-other-field{position:absolute;top:183px;left:25px;width:380px;height:63px;box-sizing:border-box;border:1px solid rgba(217,217,217,.2);border-radius:18px;padding:0 40px;color:rgba(255,255,255,.8);font-family:'Noto Sans TC',sans-serif;font-size:16px;font-weight:700;line-height:63px;text-align:center}.ride-for-other-field.name{top:251px}.ride-for-other-placeholder{color:rgba(255,255,255,.8)}.ride-for-other-confirm{position:absolute;top:406px;left:80px;width:270px;height:48px;padding:0;border:0;border-radius:25px;background:#1effaa;color:#38434a;font-family:'Noto Sans TC',sans-serif;font-size:16px;font-weight:900;line-height:48px}.ride-for-other-confirm::after{border:0}@keyframes ride-for-other-slide-up{from{transform:translateY(100%)}to{transform:translateY(0)}}.detail-price-page{position:absolute;inset:0;z-index:40;background:#56657e;color:#fff;overflow:hidden}.detail-price-title{position:absolute;top:66px;left:175px;color:#d9d9d9;font-family:'Noto Sans TC',sans-serif;font-size:20px;font-weight:500;line-height:normal;white-space:nowrap}.detail-price-back{position:absolute;top:60px;left:33px;width:38px;height:38px}.detail-price-amount{position:absolute;top:133px;left:0;width:430px;display:flex;align-items:baseline;justify-content:center;color:#fff;font-family:'Noto Sans TC',sans-serif;line-height:normal;white-space:nowrap}.currency{font-size:30px;font-weight:500;white-space:nowrap}.amount-number{margin-left:8px;font-size:50px;font-weight:500;white-space:nowrap}.detail-price-time-label{position:absolute;top:240px;left:78px;width:auto;transform:translateX(-50%);color:#fff;font-family:'Noto Sans TC',sans-serif;font-size:18px;font-weight:500;line-height:normal;text-align:center;white-space:nowrap}.detail-price-time{position:absolute;top:243px;left:334.5px;transform:translateX(-50%);color:#fff;font-family:'Noto Sans TC',sans-serif;font-size:14px;font-weight:300;line-height:normal;text-align:center;white-space:nowrap}.detail-price-row,.detail-price-value{color:#fff;font-family:'Noto Sans TC',sans-serif;font-weight:100;line-height:normal;white-space:nowrap}.detail-price-row{position:absolute;left:0;width:430px;font-size:18px;transform:none}.detail-price-row>text:first-child{position:absolute;left:42px;top:0;text-align:left;transform:none}.detail-price-value{position:absolute;left:334.5px;font-size:16px;text-align:center;transform:translateX(-50%)}.detail-price-row.discount,.detail-price-row.discount .detail-price-value{font-weight:100}.detail-price-line{position:absolute;z-index:1;left:0;width:430px;height:1px;background:rgba(217,217,217,.45)}.detail-price-line.first{top:275px}.detail-price-line.second{top:471px}.detail-price-service{position:absolute;top:452px;left:95px;width:240px;color:#fff;font-family:'Noto Sans TC',sans-serif;font-size:12px;font-weight:500;line-height:normal;white-space:nowrap}.detail-price-total{position:absolute;top:482px;left:320px;transform:translateX(-50%);color:#fff;font-family:'Noto Sans TC',sans-serif;font-size:16px;font-weight:500;line-height:normal;text-align:center;white-space:nowrap}.payment-mask{position:absolute;inset:0;z-index:50;background:rgba(56,67,74,.9)}.payment-sheet{position:absolute;left:0;bottom:0;width:430px;height:643px;border-radius:18px 18px 0 0;background:#fff;color:#38434a;overflow:hidden}.payment-close{position:absolute;top:17px;left:389px;width:26px;height:26px}.payment-back{position:absolute;top:18px;left:17px;width:24px;height:24px}.payment-title{position:absolute;top:17px;left:calc(50% - 36px);font-size:18px;font-weight:500;white-space:nowrap}.payment-countdown{position:absolute;top:72px;left:149px;color:#000;font-size:14px;font-weight:300;white-space:nowrap}.payment-amount{position:absolute;top:98px;left:0;width:430px;display:flex;align-items:baseline;justify-content:center;color:#000;line-height:normal}.payment-currency{font-size:16px;font-weight:500}.payment-number{margin-left:6px;font-size:28px;font-weight:500}.payment-method-label{position:absolute;top:162px;left:17px;color:#000;font-size:12px;font-weight:300;white-space:nowrap}.payment-options{position:absolute;left:14.5px;width:401px;overflow:hidden;border-radius:25px}.wallet-options{top:189px;height:142px}.external-options{top:341px;height:177px}.payment-option{position:relative;width:100%;height:59px;display:flex;align-items:center;box-sizing:border-box;padding-left:49px;font-size:14px;white-space:nowrap}.wallet-options .payment-option{position:absolute;left:0;height:71px;align-items:flex-start;padding-top:14px}.wallet-options .payment-option:nth-child(2){top:72px}.wallet-options .payment-option>image:first-child{top:10px}.wallet-options .payment-option:nth-child(2)>image:first-child{top:10px}.wallet-options .payment-option .payment-radio{top:17px}.wallet-options .payment-option:nth-child(2) .payment-radio{top:19px}.wallet-options .payment-option:nth-child(2) .payment-option-copy{margin-top:0}.payment-option>image:first-child{position:absolute;left:9px;width:25px;height:25px}.payment-option-copy{display:flex;flex-direction:column;gap:3px}.payment-balance{color:#f95c5c;font-weight:700}.payment-radio{position:absolute;right:31px;width:15px!important;height:15px!important}.bank-option{height:59px}.payment-chevron{position:absolute;right:30px;width:10px!important;height:18px!important}.payment-options:after{content:'';position:absolute;left:49px;right:33px;top:59px;height:1px;background:#d9d9d9;box-shadow:0 59px #d9d9d9}.wallet-options:after{top:70px}.payment-confirm{position:absolute;top:545px;left:80px;width:270px;height:48px;border-radius:25px;background:#1effaa;color:#38434a;text-align:center;line-height:48px;font-size:16px;font-weight:900;white-space:nowrap}<!-- #ifdef MP-WEIXIN || MP-TOUTIAO -->.payment-options.external-options:after{box-shadow:none}<!-- #endif -->.payment-success-mask{position:absolute;inset:0;z-index:60;background:rgba(56,67,74,.9)}.payment-success-dialog{position:absolute;top:calc(50% - 69.5px);left:calc(50% - 119px);width:238px;height:139px;border-radius:25px;background:#fff;color:#25292f}.payment-success-icon{position:absolute;top:32px;left:81.5px;width:75px;height:75px}.payment-success-message{position:absolute;top:20px;left:0;width:238px;font-size:20px;font-weight:500;line-height:normal;text-align:center;white-space:nowrap}.payment-success-button{position:absolute;top:93px;left:73px;width:92px;height:31px;border-radius:25px;background:#1effaa;color:#38434a;text-align:center;line-height:31px;font-size:14px;font-weight:700;white-space:nowrap}.selected-card{position:absolute;z-index:4;top:462px;left:25px;width:380px;height:180px}.selected-card :deep(.vehicle-card){margin:0}@media (max-width:599px){.page{top:0;left:0;height:var(--mobile-height,100dvh);border-radius:0;transform:scale(var(--mobile-scale,1));transform-origin:top left}}
</style>
<style scoped>
.payment-amount {
  left: 0;
  width: 430px;
  text-align: center;
}

.charge-lines{position:absolute;top:194px;left:94px;width:244px;height:64px}.charge-lines .charge-row{position:relative;left:auto;top:auto;width:100%;height:20px;display:flex;align-items:center;justify-content:space-between;font-size:12px;font-weight:100}.charge-lines .charge-row.discount,.charge-lines .charge-row.discount .charge-label,.charge-lines .charge-row.discount .charge-price{font-weight:700}.charge-lines .charge-label,.charge-lines .charge-price{position:static;display:block;width:auto;transform:none;text-align:left}.charge-lines .charge-price{text-align:right}.coupon-info{top:231px}.detail-price-lines{position:absolute;top:289px;left:55px;width:320px;height:154px}.detail-price-line-row{height:36px;display:flex;align-items:center;justify-content:space-between;color:#fff;font-family:'Noto Sans TC',sans-serif;font-size:16px;font-weight:100;line-height:normal;white-space:nowrap}.detail-price-line-row text:last-child{text-align:right}.detail-price-row.discount,.detail-price-row.discount .detail-price-value{font-weight:700}
.confirm-loading,.confirm-error{position:fixed;z-index:1000;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(255,255,255,.96);color:#1f2937;text-align:center;padding:32px;box-sizing:border-box}.confirm-error-title{font-size:18px;font-weight:700;margin-bottom:12px}.confirm-error-message{font-size:14px;color:#6b7280;margin-bottom:20px}.confirm-error-action{padding:12px 24px;border-radius:22px;background:#285cfc;color:#fff;font-size:14px}
.map-background{height:462px}
</style>
