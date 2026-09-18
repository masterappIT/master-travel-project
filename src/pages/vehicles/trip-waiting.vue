<template>
  <view class="page trip-waiting-page" :style="responsiveStyle">
    <view class="canvas">
      <view class="back-button" @tap="goBack">
        <image src="/static/vehicles/trip-waiting/back.svg" mode="aspectFit" />
      </view>

      <view class="driver-card">
        <image class="toyota-logo" src="/static/vehicles/trip-waiting/toyota.svg" mode="aspectFit" />
        <view class="vehicle-copy">
          <text class="vehicle-brand">{{ vehicleBrand }}</text>
          <text class="vehicle-series">{{ vehicleSeries }}</text>
        </view>
        <image class="vehicle-image" :src="vehicleImage" mode="aspectFit" />
        <view class="driver-info">
          <image class="driver-avatar" src="/static/vehicles/trip-waiting/avatar.svg" mode="aspectFit" />
          <view>
            <text class="driver-name">{{ driverName }}</text>
            <view class="rating">
              <image class="star" src="/static/vehicles/trip-waiting/star.svg" mode="aspectFit" />
              <text>{{ driverRating }}</text>
            </view>
          </view>
        </view>
        <view class="driver-actions">
          <view class="pill call" @tap="callDriver"><image src="/static/vehicles/trip-waiting/phone.svg" mode="aspectFit" /><text>打電話</text></view>
          <view class="pill seat"><image src="/static/vehicles/trip-waiting/seat.svg" mode="aspectFit" /><text>{{ vehicleSeats }}座</text></view>
          <view class="pill colour"><text>白色</text></view>
        </view>
      </view>

      <view v-if="vehiclePlates.length" class="license-plate">
        <text
          v-for="plate in vehiclePlates"
          :key="plate.kind"
          :class="[`plate-slot-${plate.slot}`, `plate-${plate.kind}`]"
        >{{ plate.value }}</text>
      </view>

      <view class="status-panel">
        <image class="city-scene" src="/static/vehicles/trip-waiting/city.svg" mode="scaleToFill" />
        <view class="quick-actions"><text @tap="showComingSoon('修改目的地')">修改目的地</text><text @tap="showComingSoon('聯繫客服')">聯繫客服</text></view>
        <view class="status-content">
          <image class="status-mark" src="/static/vehicles/trip-waiting/waiting.svg" mode="aspectFit" />
          <text class="status-title">行程等待中</text>
        </view>
      </view>
      <view class="route">
        <image class="place-icon origin-icon" src="/static/vehicles/trip-waiting/origin.svg" mode="aspectFit" />
        <text>{{ originLabel }}</text>
        <image class="route-arrow" src="/static/vehicles/trip-waiting/route-arrow.svg" mode="aspectFit" />
        <image class="place-icon destination-icon" src="/static/vehicles/trip-waiting/destination.svg" mode="aspectFit" />
        <text>{{ destinationLabel }}</text>
      </view>
      <text class="departure">出發時間 ： {{ bookingTime }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getClientTrip, listClientTrips, type ClientTrip } from '../../services/api'
import { formatOrderCardAddress } from '../../utils/orderAddress'
import { cachedPagePath, cachedPageUrl, getCachedPageOrderQuery, openCachedPage } from '../../utils/navigation'
import { layoutVehiclePlates } from '../../utils/vehiclePlate'
import { isPendingTrip, selectNextPendingTrip } from '../../utils/pendingTrip'
import { useResponsiveCanvas } from '../../composables/useResponsiveCanvas'

const { responsiveStyle } = useResponsiveCanvas()
const trip = ref<ClientTrip | null>(null)
const tripId = ref('')
const fromProfilePending = ref(false)
let pollTimer: ReturnType<typeof setInterval> | undefined
let transitioning = false
const originLabel = computed(() => formatOrderCardAddress(trip.value?.origin, '香港'))
const destinationLabel = computed(() => formatOrderCardAddress(trip.value?.destination, '深圳'))
const driverName = computed(() => trip.value?.driver?.name || '陳師傅')
const driverRating = computed(() => '5.0')
const vehicleBrand = computed(() => 'Toyota Alphard')
const vehicleSeries = computed(() => '30系')
const vehicleSeats = computed(() => trip.value?.vehicle?.seats || 8)
const vehicleImage = computed(() => '/static/vehicles/trip-waiting/vellfire.png')
const vehiclePlates = computed(() => layoutVehiclePlates(trip.value?.driver))
const bookingTime = computed(() => { const date = trip.value ? new Date(trip.value.scheduledAt) : null; return date && !Number.isNaN(date.valueOf()) ? `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}` : 'March 15 2024 14:00' })
const stopPolling = () => { if (pollTimer) clearInterval(pollTimer); pollTimer = undefined }
const startPolling = () => {
  if (!tripId.value || pollTimer) return
  pollTimer = setInterval(() => { void loadTrip() }, 15000)
}
const loadTrip = async () => {
  if (!tripId.value || transitioning) return
  try {
    const nextTrip = await getClientTrip(tripId.value)
    trip.value = nextTrip
    if (fromProfilePending.value && !isPendingTrip(nextTrip)) {
      transitioning = true
      stopPolling()
      const pendingTrip = selectNextPendingTrip(await listClientTrips(), nextTrip.id)
      if (pendingTrip) return openCachedPage(`/pages/trips/pending?id=${encodeURIComponent(pendingTrip.id)}`)
      uni.showToast({ title: '目前沒有待出行訂單', icon: 'none' })
      return openCachedPage('/pages/trips/trips')
    }
    const path = nextTrip.status === 'COMPLETED' ? '/pages/vehicles/trip-complete' : nextTrip.executionPhase === 'IN_PROGRESS' ? '/pages/vehicles/trip-progress' : ''
    if (path) {
      transitioning = true
      if (pollTimer) clearInterval(pollTimer)
      const source = fromProfilePending.value ? '&from=profile-pending' : ''
      openCachedPage(`${path}?id=${encodeURIComponent(tripId.value)}${source}`)
    }
  } catch (error) { transitioning = false; startPolling(); uni.showToast({ title: error instanceof Error ? error.message : '行程載入失敗', icon: 'none' }) }
}
const activatePage = (url: string) => {
  const query = getCachedPageOrderQuery(url)
  tripId.value = query.id || ''
  fromProfilePending.value = query.from === 'profile-pending'
  if (tripId.value) void loadTrip()
  startPolling()
}
onLoad(options => activatePage(`?id=${encodeURIComponent(options?.id || '')}&from=${encodeURIComponent(options?.from || '')}`))
// #ifdef H5
onMounted(() => activatePage(typeof window !== 'undefined' ? window.location.hash : ''))
// #endif
// #ifdef MP-WEIXIN || MP-TOUTIAO
watch([cachedPagePath, cachedPageUrl], ([path, url]) => {
  if (path !== '/pages/vehicles/trip-waiting') { stopPolling(); return }
  const query = getCachedPageOrderQuery(url)
  const id = query.id
  if (!id) { stopPolling(); return }
  fromProfilePending.value = query.from === 'profile-pending'
  if (id !== tripId.value) { transitioning = false; tripId.value = id; void loadTrip() }
  startPolling()
}, { immediate: true })
// #endif
onUnmounted(stopPolling)
const goBack = () => openCachedPage(fromProfilePending.value
  ? `/pages/trips/pending?id=${encodeURIComponent(tripId.value)}`
  : `/pages/orders/detail?status=traveling&id=${encodeURIComponent(tripId.value)}`)
const callDriver = () => { const phone = trip.value?.driver?.phone; if (phone) uni.makePhoneCall({ phoneNumber: phone }); else uni.showToast({ title: '暫無司機電話', icon: 'none' }) }
const showComingSoon = (label: string) => uni.showToast({ title: `${label}功能準備中`, icon: 'none' })
</script>

<style scoped>
@import '../../styles/tokens.css';

@keyframes waiting-icon-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

:global(html), :global(body), :global(#app) { width: 100%; height: 100%; margin: 0; overflow: hidden; background: var(--trip-viewport-background); }
.page { width: 430px; height: var(--mobile-height, 932px); transform: scale(var(--mobile-scale, 1)); transform-origin: top left; overflow: hidden; font-family: var(--trip-font); }
.canvas { position: relative; width: var(--trip-canvas-width); height: var(--trip-canvas-height); border-radius: var(--trip-screen-radius); background: var(--trip-background); overflow: hidden; }
.back-button { position: absolute; z-index: 8; top: var(--trip-back-top); left: var(--trip-back-left); width: var(--trip-back-size); height: var(--trip-back-size); }
.back-button image { width: 100%; height: 100%; }
.driver-card { position: absolute; z-index: 6; top: var(--trip-card-top); left: var(--trip-card-left); width: var(--trip-card-width); height: var(--trip-card-height); border-radius: var(--trip-card-radius); background: var(--trip-surface); overflow: hidden; }
.vehicle-copy { position: absolute; left: var(--trip-card-copy-left); top: var(--trip-card-copy-top); color: var(--trip-text); }
.toyota-logo { position: absolute; left: var(--trip-logo-left); top: var(--trip-logo-top); width: var(--trip-logo-size); height: var(--trip-logo-size); }
.vehicle-brand { display: block; font-size: var(--trip-brand-size); line-height: var(--trip-brand-line); font-weight: 300; }
.vehicle-series { display: block; font-size: var(--trip-series-size); line-height: var(--trip-series-line); font-weight: 700; }
.vehicle-image { position: absolute; right: var(--trip-car-right); top: var(--trip-car-top); width: var(--trip-car-width); height: var(--trip-car-height); }
.driver-info { position: absolute; left: var(--trip-card-copy-left); top: var(--trip-driver-top); display: flex; align-items: center; gap: var(--trip-driver-gap); color: var(--trip-text-dark); }
.driver-avatar { width: var(--trip-avatar-size); height: var(--trip-avatar-size); }
.driver-name { display: block; font-size: var(--trip-driver-size); line-height: var(--trip-driver-line); font-weight: 700; }
.rating { display: flex; align-items: center; gap: var(--trip-rating-gap); font-size: var(--trip-rating-size); }
.star { width: var(--trip-star-size); height: var(--trip-star-size); }
.driver-actions { position: absolute; inset: 0; }
.pill { display: flex; align-items: center; justify-content: center; height: var(--trip-pill-height); padding: 0 var(--trip-pill-padding); border-radius: var(--trip-pill-radius); background: var(--trip-pill-background); color: var(--trip-text-dark); font-size: var(--trip-pill-size); white-space: nowrap; }
.call { position: absolute; left: var(--trip-call-left); top: var(--trip-call-top); gap: var(--trip-call-gap); padding: 0 var(--trip-call-padding); font-size: var(--trip-call-size); }
.call image { width: var(--trip-call-icon-size); height: var(--trip-call-icon-size); }
.pill image { width: var(--trip-seat-icon-size); height: var(--trip-seat-icon-size); }
.seat { position: absolute; left: var(--trip-seat-left); top: var(--trip-seat-top); gap: var(--trip-seat-gap); }
.colour { position: absolute; left: var(--trip-colour-left); top: var(--trip-seat-top); }
.license-plate { position: absolute; z-index: 7; top: var(--trip-plate-top); left: var(--trip-plate-left); width: var(--trip-plate-width); height: var(--trip-plate-height); text-align: center; font-weight: 700; overflow: hidden; }
.license-plate > text { position: absolute; left: 0; display: block; width: 100%; box-sizing: border-box; overflow: hidden; border-radius: var(--trip-plate-radius); font-size: var(--trip-plate-cn-size); font-weight: var(--trip-plate-primary-weight); white-space: nowrap; }
.plate-slot-top { z-index: 3; top: 0; height: var(--trip-plate-gold-height); line-height: var(--trip-plate-gold-height); border: var(--trip-plate-border) solid var(--trip-surface); }
.plate-slot-middle { z-index: 2; top: var(--trip-plate-hk-top); height: var(--trip-plate-hk-height); line-height: var(--trip-plate-hk-height); border: var(--trip-plate-border) solid var(--trip-surface); }
.plate-slot-bottom { z-index: 1; top: var(--trip-plate-cn-top); height: var(--trip-plate-cn-height); padding-top: 9px; line-height: 27px; }
.plate-hong-kong { background: var(--trip-plate-gold); color: var(--trip-plate-gold-text); }
.plate-macau, .plate-mainland { background: var(--trip-plate-black); color: var(--trip-surface); }
.status-panel { position: absolute; z-index: 2; left: 0; top: var(--trip-panel-top); width: 430px; height: var(--trip-panel-height); border-radius: var(--trip-panel-radius) var(--trip-panel-radius) 0 0; background: var(--trip-panel-background); overflow: hidden; }
.city-scene { position: absolute; left: var(--trip-scene-left); top: var(--trip-scene-top); width: var(--trip-scene-width); height: var(--trip-scene-height); }
.quick-actions { position: absolute; z-index: 2; top: var(--trip-actions-top); left: var(--trip-card-left); width: var(--trip-card-width); display: flex; justify-content: center; gap: var(--trip-action-gap); color: var(--trip-surface); font-family: var(--trip-action-font); font-size: var(--trip-action-size); font-style: var(--trip-action-style); }
.status-content { position: absolute; z-index: 2; top: var(--trip-status-top); left: 0; width: var(--trip-canvas-width); display: flex; flex-direction: column; align-items: center; color: var(--trip-surface); }
.status-mark { width: var(--trip-status-icon-size); height: var(--trip-status-icon-size); margin-bottom: var(--trip-status-icon-gap); animation: waiting-icon-spin var(--trip-waiting-icon-duration) var(--trip-waiting-icon-easing) infinite; }
.status-title { font-size: var(--trip-title-size); line-height: var(--trip-title-line); font-weight: 700; }
.route { position: absolute; z-index: 4; left: var(--trip-route-left); top: var(--trip-route-top); display: flex; align-items: center; gap: var(--trip-route-gap); color: var(--trip-surface); font-size: var(--trip-route-size); font-weight: 700; }
.place-icon { width: var(--trip-place-icon-width); }
.origin-icon { height: var(--trip-origin-icon-height); }
.destination-icon { height: var(--trip-destination-icon-height); margin-left: var(--trip-destination-offset); }
.route-arrow { width: var(--trip-route-icon-size); height: var(--trip-route-icon-size); margin-left: var(--trip-arrow-offset); }
.departure { position: absolute; z-index: 4; left: 0; top: var(--trip-departure-top); width: var(--trip-canvas-width); color: var(--trip-surface); font-size: var(--trip-departure-size); font-weight: 300; text-align: center; white-space: nowrap; }
</style>
