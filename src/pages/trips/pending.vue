<template>
  <view class="page" :style="responsiveStyle">
    <view class="header">
      <OrdersBackButton icon-src="/static/orders/traveling-back.svg" @tap="goBack" />
      <text class="title">待出行</text>
    </view>
    <text class="order-number">訂單編號：{{ orderNumber }}</text>
    <view :class="['trip-card', { accepted: hasDriver }]">
      <view :class="['waiting', { progress: isTripInProgress }]"><view class="waiting-mark"><image :src="isTripInProgress ? '/static/vehicles/trip-progress/pending-status-ring.svg' : '/static/orders/traveling-wait-ring.svg'" mode="aspectFit" /><image class="waiting-dot" :src="isTripInProgress ? '/static/vehicles/trip-progress/status-dot.svg' : '/static/orders/traveling-wait-dot.svg'" mode="aspectFit" /></view><text>{{ isTripInProgress ? '進行中' : '等待中' }}</text></view>
      <view v-if="!hasDriver" class="assignment-summary">
        <image src="/static/orders/traveling-status.svg" mode="aspectFit" />
        <text>正在為您安排司機</text>
        <view class="confirmation"><image src="/static/orders/traveling-clock.svg" mode="aspectFit" /><text>三小時內確認</text></view>
        <text class="countdown">{{ confirmationCountdownLabel }}</text>
      </view>
      <view v-else class="accepted-driver">
        <image v-if="acceptedVehicleLogo && !logoLoadFailed" class="accepted-logo" :src="acceptedVehicleLogo" mode="aspectFit" @error="logoLoadFailed = true" />
        <view class="accepted-vehicle-copy"><text>{{ acceptedVehicleBrand }}</text><text>{{ acceptedVehicleSeries }}</text></view>
        <view class="accepted-driver-info"><image src="/static/vehicles/trip-waiting/avatar.svg" mode="aspectFit" /><view><text>{{ acceptedDriverName }}</text><view><image src="/static/vehicles/trip-waiting/star.svg" mode="aspectFit" /><text>5.0</text></view></view></view>
        <view class="accepted-actions"><view @tap="callAcceptedDriver"><image src="/static/vehicles/trip-waiting/phone.svg" mode="aspectFit" /><text>打電話</text></view><view><image src="/static/vehicles/trip-waiting/seat.svg" mode="aspectFit" /><text>{{ acceptedVehicleSeats }}座</text></view><view><text>白色</text></view></view>
        <view v-if="acceptedVehiclePlates.length" class="accepted-plate">
          <text
            v-for="plate in acceptedVehiclePlates"
            :key="plate.kind"
            :class="[`plate-slot-${plate.slot}`, `plate-${plate.kind}`]"
          >{{ plate.value }}</text>
        </view>
      </view>
      <view class="trip-info">
        <image class="vehicle-icon" src="/static/orders/traveling-tesla.svg" mode="aspectFit" />
        <text class="pickup-time">{{ hasDriver ? '上車時間' : '出發時間' }} ：{{ bookingTime }}</text>
        <view class="locations"><view><image src="/static/orders/traveling-origin.svg" mode="aspectFit" /><text>{{ originLabel }}</text></view><view><image src="/static/orders/traveling-destination.svg" mode="aspectFit" /><text>{{ destinationLabel }}</text></view></view>
        <text class="vehicle-label">{{ vehicleLabel }}</text>
        <view class="passenger"><text>乘客及聯絡資料：</text><view><image src="/static/orders/traveling-passenger.svg" mode="aspectFit" /><text>{{ passengerLabel }}</text></view><view><image src="/static/orders/traveling-phone.svg" mode="aspectFit" /><text>{{ passengerPhoneLabel }}</text></view></view>
        <view class="divider first"><image src="/static/orders/traveling-divider.svg" mode="aspectFit" /></view>
        <view class="divider second"><image src="/static/orders/traveling-divider.svg" mode="aspectFit" /></view>
        <view class="payment-records" @tap="showPaymentRecords">相關支付紀錄 <image src="/static/orders/traveling-arrow.svg" mode="aspectFit" /></view>
        <view class="divider third"><image src="/static/orders/traveling-divider.svg" mode="aspectFit" /></view>
        <view class="related-trip" @tap="showRelatedTrip">相關行程 <image src="/static/orders/traveling-arrow.svg" mode="aspectFit" /></view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import OrdersBackButton from '../../components/orders/OrdersBackButton.vue'
import { useResponsiveCanvas } from '../../composables/useResponsiveCanvas'
import { getClientTrip, listClientTrips, type ClientTrip } from '../../services/api'
import { formatAssignmentCountdown, getAssignmentCountdownSeconds } from '../../utils/assignmentCountdown'
import { cachedPageUrl, closeCachedPage, getCachedPageOrderQuery, getCachedPageUrl, openCachedPage, pagePath } from '../../utils/navigation'
import { formatOrderDetailAddress } from '../../utils/orderAddress'
import { isPendingTrip, selectNextPendingTrip } from '../../utils/pendingTrip'
import { layoutVehiclePlates } from '../../utils/vehiclePlate'

const { responsiveStyle } = useResponsiveCanvas()
const trip = ref<ClientTrip>()
const tripId = ref('')
const countdown = ref(0)
const logoLoadFailed = ref(false)
let countdownTimer: ReturnType<typeof setInterval> | undefined
let pollTimer: ReturnType<typeof setInterval> | undefined
let transitioning = false

const isDriverAccepted = computed(() => trip.value?.executionPhase === 'DRIVER_ASSIGNED' && Boolean(trip.value.acceptedAt))
const isTripInProgress = computed(() => trip.value?.executionPhase === 'IN_PROGRESS')
const hasDriver = computed(() => isDriverAccepted.value || isTripInProgress.value)
const confirmationCountdownLabel = computed(() => formatAssignmentCountdown(countdown.value))
const orderNumber = computed(() => {
  const digits = (trip.value?.id || '').replace(/\D/g, '')
  return digits ? `A${digits.slice(-8).padStart(8, '0')}` : '—'
})
const acceptedDriverName = computed(() => trip.value?.driver?.name || '—')
const acceptedVehicleBrand = computed(() => trip.value?.vehicle ? `${trip.value.vehicle.brand} ${trip.value.vehicle.model}` : '—')
const acceptedVehicleSeries = computed(() => trip.value?.vehicle?.series || '—')
const acceptedVehicleSeats = computed(() => trip.value?.vehicle?.seats || 0)
const acceptedVehicleLogo = computed(() => trip.value?.vehicle?.logo || '')
const acceptedVehiclePlates = computed(() => layoutVehiclePlates(trip.value?.driver))
const originLabel = computed(() => formatOrderDetailAddress(trip.value?.origin, '香港國際機場'))
const destinationLabel = computed(() => formatOrderDetailAddress(trip.value?.destination, '深圳灣口岸'))
const passengerLabel = computed(() => {
  const passenger = trip.value?.passenger
  if (!passenger) return '—'
  const gender = passenger.gender === 'MALE' ? '先生' : passenger.gender === 'FEMALE' ? '女士' : ''
  return `${passenger.name}${gender ? `（${gender}）` : ''}`
})
const passengerPhoneLabel = computed(() => trip.value?.passenger ? `${trip.value.passenger.countryCode} - ${trip.value.passenger.phoneNumber}` : '—')
const bookingTime = computed(() => {
  const date = trip.value?.scheduledAt ? new Date(trip.value.scheduledAt) : null
  return date && !Number.isNaN(date.valueOf()) ? `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}` : '—'
})
const vehicleLabel = computed(() => `${trip.value?.vehicle?.categoryName || '跨境商務車'}（${trip.value?.vehicle?.seats || 0}座）`)

const stopTimers = () => {
  if (countdownTimer) clearInterval(countdownTimer)
  if (pollTimer) clearInterval(pollTimer)
  countdownTimer = undefined
  pollTimer = undefined
}
const refreshCountdown = () => { countdown.value = getAssignmentCountdownSeconds(trip.value) }
const startTimers = () => {
  if (!countdownTimer) countdownTimer = setInterval(refreshCountdown, 1000)
  if (!pollTimer) pollTimer = setInterval(() => { void loadTrip() }, 15000)
}
const loadTrip = async () => {
  if (!tripId.value || transitioning) return
  try {
    const loadedTrip = await getClientTrip(tripId.value)
    if (loadedTrip.vehicle?.logo !== trip.value?.vehicle?.logo) logoLoadFailed.value = false
    if (!isPendingTrip(loadedTrip)) {
      transitioning = true
      stopTimers()
      const nextTrip = selectNextPendingTrip(await listClientTrips(), loadedTrip.id)
      if (nextTrip) return openCachedPage(`/pages/trips/pending?id=${encodeURIComponent(nextTrip.id)}`)
      uni.showToast({ title: '目前沒有待出行訂單', icon: 'none' })
      return openCachedPage('/pages/trips/trips')
    }
    trip.value = loadedTrip
    refreshCountdown()
  } catch (error) {
    transitioning = false
    startTimers()
    uni.showToast({ title: error instanceof Error ? error.message : '訂單載入失敗', icon: 'none' })
  }
}
const activatePage = (url: string) => {
  const query = getCachedPageOrderQuery(url)
  const id = query.id
  if (!id) return
  transitioning = false
  tripId.value = id
  void loadTrip()
  startTimers()
}

onLoad(options => {
  if (!options?.id) return
  activatePage(`?id=${encodeURIComponent(options.id)}`)
})
// #ifdef H5
onMounted(() => activatePage(typeof window !== 'undefined' ? window.location.hash : getCachedPageUrl()))
// #endif
// #ifdef MP-WEIXIN || MP-TOUTIAO
watch(cachedPageUrl, url => {
  if (pagePath(url) !== '/pages/trips/pending') return stopTimers()
  activatePage(url)
}, { immediate: true })
// #endif
onShow(() => { if (tripId.value) { void loadTrip(); startTimers() } })
onUnmounted(stopTimers)

const goBack = () => closeCachedPage('/pages/trips/trips')
const callAcceptedDriver = () => {
  const phone = trip.value?.driver?.phone
  if (phone) uni.makePhoneCall({ phoneNumber: phone })
  else uni.showToast({ title: '暫無司機電話', icon: 'none' })
}
const showPaymentRecords = () => openCachedPage(`/pages/transactions/expense-detail?from=profile&tripId=${encodeURIComponent(trip.value?.id || '')}`)
const showRelatedTrip = () => {
  const path = isTripInProgress.value
    ? '/pages/vehicles/trip-progress'
    : isDriverAccepted.value
      ? '/pages/vehicles/trip-waiting'
      : '/pages/vehicles/booking-success'
  openCachedPage(`${path}?id=${encodeURIComponent(tripId.value)}&from=profile-pending`)
}
</script>

<style scoped>
:global(html),:global(body),:global(#app){width:100%;height:100%;margin:0;overflow:hidden}.page{position:fixed;top:0;left:0;width:430px;height:var(--mobile-height,932px);overflow:hidden;background:#f0f2f5;color:#38434a;font-family:'Noto Sans TC',sans-serif;transform:scale(var(--mobile-scale,1));transform-origin:top left}.header{position:absolute;top:0;left:0;width:430px;height:110px;border-radius:25px;background:#fff}.title{position:absolute;top:58px;left:50%;transform:translateX(-50%);font-size:18px;font-weight:500;line-height:27px}.order-number{position:absolute;top:110px;left:0;width:430px;height:56px;padding-left:38px;box-sizing:border-box;display:flex;align-items:center;background:#edf0f2;font-size:18px;font-weight:500}.trip-card{position:absolute;top:166px;left:25px;width:380px;height:535px;border-radius:25px;background:#fff}.trip-card.accepted{height:586px}.waiting{position:absolute;top:10px;left:15px;display:flex;align-items:center;color:#285cfc;font-size:12px;font-weight:700}.waiting-mark{position:relative;width:20px;height:20px;margin-right:5px}.waiting-mark image:first-child{position:absolute;inset:0;width:20px;height:20px}.waiting-dot{position:absolute;top:7px;left:7px;width:6px;height:6px}.waiting.progress{color:#1effaa}.assignment-summary{position:absolute;top:20px;left:118px;width:144px;height:144px;text-align:center}.assignment-summary>image{width:30px;height:30px}.assignment-summary>text:nth-child(2){display:block;margin-top:10px;color:#285cfc;font-size:18px;font-weight:700;white-space:nowrap}.confirmation{display:flex;justify-content:center;align-items:center;gap:5px;margin-top:10px;font-size:12px;font-weight:700}.confirmation image{width:20px;height:20px}.countdown{display:block;margin-top:15px;font-size:18px;font-weight:500}.accepted-driver{position:absolute;top:27px;left:0;width:380px;height:180px;overflow:hidden}.accepted-logo{position:absolute;top:24px;left:43px;width:20px;height:20px}.accepted-vehicle-copy{position:absolute;top:44px;left:27px;color:#25292f}.accepted-vehicle-copy>text{display:block;white-space:nowrap}.accepted-vehicle-copy>text:first-child{font-size:8px;font-weight:300}.accepted-vehicle-copy>text:last-child{font-size:12px;font-weight:900}.accepted-driver-info{position:absolute;top:90px;left:27px;display:flex;gap:10px}.accepted-driver-info>image{width:36px;height:36px}.accepted-driver-info>view>text{display:block;font-size:14px;font-weight:700}.accepted-driver-info>view>view{position:absolute;top:21px;left:52px;width:25px;height:12px}.accepted-driver-info>view>view image{position:absolute;top:0;left:0;width:12px;height:12px}.accepted-driver-info>view>view text{position:absolute;top:1px;left:14px;font-size:8px;line-height:12px;color:#000}.accepted-actions{position:absolute;top:141px;left:27px;width:276px;height:24px}.accepted-actions>view{position:absolute;padding:0;border-radius:25px;background:#d9d9d9;display:flex;align-items:center;box-sizing:border-box;font-size:10px}.accepted-actions>view:first-child{top:0;left:0;width:80px;height:24px;padding:2px 10px;align-items:flex-end;font-size:14px}.accepted-actions>view:first-child image{width:18px;height:18px}.accepted-actions>view:nth-child(2){top:2px;left:184px;width:54px;height:20px}.accepted-actions>view:nth-child(2) image{position:absolute;top:2px;left:8px;width:16px;height:16px}.accepted-actions>view:nth-child(2) text{position:absolute;top:3px;left:30px}.accepted-actions>view:nth-child(3){top:2px;left:242px;height:20px;padding:3px 7px}.accepted-plate{position:absolute;top:26px;left:203px;width:149px;height:86px;color:#fff;font-size:20px;font-weight:700;text-align:center}.accepted-plate>text{position:absolute;left:0;width:149px;border-radius:5px;box-sizing:border-box;font-size:20px;font-weight:700;white-space:nowrap;overflow:hidden}.accepted-plate>.plate-slot-top{z-index:3;top:0;height:33px;line-height:33px;border:1px solid #fff}.accepted-plate>.plate-slot-middle{z-index:2;top:26px;height:33px;line-height:33px;border:1px solid #fff}.accepted-plate>.plate-slot-bottom{z-index:1;top:50px;height:36px;padding-top:9px;line-height:27px}.accepted-plate>.plate-hong-kong{background:#e6a206;color:#000}.accepted-plate>.plate-macau,.accepted-plate>.plate-mainland{background:#000;color:#fff}.trip-info{position:absolute;top:161px;left:0;width:380px;height:379px;overflow:hidden}.accepted .trip-info{top:207px}.vehicle-icon{position:absolute;top:21px;left:30px;width:25px;height:25px}.pickup-time{position:absolute;top:24px;left:65px;font-size:14px}.locations{position:absolute;top:66px;left:30px;font-size:14px}.locations view{display:flex;align-items:center;gap:12px;height:30px}.locations image{width:18px;height:18px}.locations text{max-width:300px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.vehicle-label{position:absolute;top:134px;left:30px;font-size:14px}.passenger{position:absolute;top:173.02px;left:33px;width:127px;height:80px;font-size:14px}.passenger>text{position:absolute;top:0;left:0;line-height:normal;white-space:nowrap}.passenger>view{position:absolute;height:20px}.passenger>view:first-of-type{top:30px;left:0;width:117px}.passenger>view:last-child{top:55px;left:5px;width:122px}.passenger>view image,.passenger>view text{position:absolute}.passenger>view:first-of-type image{top:0;left:0;width:20px;height:20px}.passenger>view:first-of-type text{top:0;left:30px;line-height:normal;white-space:nowrap}.passenger>view:last-child image{top:3px;left:0;width:15px;height:15px}.passenger>view:last-child text{top:0;left:25px;line-height:normal;white-space:nowrap}.divider{position:absolute;left:5px;width:370px;height:1px;overflow:hidden}.divider image{position:absolute;top:0;left:0;width:370px;height:1px;transform:none;transform-origin:center}.divider.first{top:162px}.divider.second{top:263px}.payment-records{position:absolute;top:284px;left:26.185px;width:327.63px;height:20px;display:flex;align-items:center;justify-content:space-between;font-size:14px}.payment-records image{width:8px;height:14px}.divider.third{top:323.04px}.related-trip{position:absolute;top:338.04px;left:26.185px;width:327.63px;height:20px;display:flex;align-items:center;justify-content:space-between;font-size:14px}.related-trip image{width:8px;height:14px}.accepted .trip-info{top:207px}.accepted .pickup-time{top:24px;left:60px;color:#38434a;font-weight:500}.accepted .locations{top:64px;left:39px}.accepted .locations view{gap:20px;height:30px}.accepted .locations text{color:#38434a}.accepted .vehicle-label{top:140px;left:70px;color:#000;font-weight:300}.accepted .passenger{top:173.02px;left:33px}.accepted .divider.first{top:162px}.accepted .divider.second{top:263.02px}.accepted .payment-records{top:284.04px}.accepted .payment-records image{width:8.63px;height:15px}@media(max-width:599px){.page{height:var(--mobile-height,100dvh)}}
</style>
