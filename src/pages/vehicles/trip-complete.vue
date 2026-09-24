<template>
  <view class="page trip-complete-page" :style="responsiveStyle">
    <view class="canvas">
      <TripRouteMap map-id="trip-complete-map" :latitude="mapLatitude" :longitude="mapLongitude" :markers="mapMarkers" :polyline="mapPolyline" :route-summary="routeSummary" :pickup-label="mapOriginLabel" :destination-label="mapDestinationLabel" :safe-bottom="243" />
      <view class="back-button" @tap="goBack">
        <image src="/static/vehicles/trip-complete/back.svg" mode="aspectFit" />
      </view>

      <view class="complete-panel">
        <image class="floor-scene" src="/static/vehicles/trip-complete/floor.svg" mode="scaleToFill" />
        <view class="status-content">
          <image src="/static/vehicles/trip-complete/arrived.svg" mode="aspectFit" />
          <text>已到達</text>
        </view>

        <view class="trip-summary">
          <view class="route-row">
            <image class="origin-icon" src="/static/vehicles/trip-complete/origin.svg" mode="aspectFit" />
            <text class="origin-label">{{ originLabel }}</text>
            <image class="route-arrow" src="/static/vehicles/trip-complete/route-arrow.svg" mode="aspectFit" />
            <image class="destination-icon" src="/static/vehicles/trip-complete/destination.svg" mode="aspectFit" />
            <text class="destination-label">{{ destinationLabel }}</text>
          </view>
          <text class="time departure-time">出發時間 ： {{ departureTime }}</text>
          <text class="time arrival-time">到達時間 ： {{ arrivalTime }}</text>
          <view class="rating-prompt">
            <text>您對此次行程滿意嗎？</text>
            <image src="/static/vehicles/trip-complete/rating-stars.svg" mode="aspectFit" />
          </view>
        </view>

        <view class="complete-button" @tap="finishTrip">完成</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import TripRouteMap from '../../components/vehicles/TripRouteMap.vue'
import { computed, ref, watch } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getClientTrip, type ClientTrip } from '../../services/api'
import { formatOrderCardAddress, formatOrderSummaryAddress } from '../../utils/orderAddress'
import { cachedPagePath, cachedPageUrl, getCachedPageOrderQuery, openCachedPage } from '../../utils/navigation'
import { useResponsiveCanvas } from '../../composables/useResponsiveCanvas'

import { useTripRouteMap } from '../../composables/useTripRouteMap'

const { responsiveStyle } = useResponsiveCanvas()
const trip = ref<ClientTrip | null>(null)
const { latitude: mapLatitude, longitude: mapLongitude, markers: mapMarkers, polyline: mapPolyline, routeSummary } = useTripRouteMap(trip)
const tripId = ref('')
const originLabel = computed(() => formatOrderCardAddress(trip.value?.originAddress || trip.value?.origin, '香港'))
const destinationLabel = computed(() => formatOrderCardAddress(trip.value?.destinationAddress || trip.value?.destination, '深圳'))
const mapOriginLabel = computed(() => formatOrderSummaryAddress(trip.value?.originAddress || trip.value?.origin, '香港'))
const mapDestinationLabel = computed(() => formatOrderSummaryAddress(trip.value?.destinationAddress || trip.value?.destination, '深圳'))

const formatTripTime = (value?: string | null) => {
  const date = value ? new Date(value) : null
  if (!date || Number.isNaN(date.valueOf())) return 'March 15 2024 14:00'
  const month = new Intl.DateTimeFormat('en', { month: 'long' }).format(date)
  const day = date.getDate()
  const year = date.getFullYear()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${month} ${day} ${year} ${hours}:${minutes}`
}

const departureTime = computed(() => formatTripTime(trip.value?.startedAt || trip.value?.scheduledAt))
const arrivalTime = computed(() => formatTripTime(trip.value?.completedAt || trip.value?.estimatedArrivalAt))

const loadTrip = async (id: string) => {
  if (!id) return
  try {
    trip.value = await getClientTrip(id)
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : '行程載入失敗', icon: 'none' })
  }
}

onLoad((options) => {
  tripId.value = options?.id || ''
  void loadTrip(tripId.value)
})
// #ifdef MP-WEIXIN || MP-TOUTIAO
watch([cachedPagePath, cachedPageUrl], ([path, url]) => {
  if (path !== '/pages/vehicles/trip-complete') return
  const id = getCachedPageOrderQuery(url).id
  if (id && id !== tripId.value) { tripId.value = id; void loadTrip(id) }
}, { immediate: true })
// #endif

const goBack = () => openCachedPage(`/pages/orders/traveling-detail?id=${encodeURIComponent(tripId.value)}`)
const finishTrip = () => openCachedPage(`/pages/orders/completed-detail?id=${encodeURIComponent(tripId.value)}`)
</script>

<style scoped>
@import '../../styles/tokens.css';

:global(html), :global(body), :global(#app) { width: 100%; height: 100%; margin: 0; overflow: hidden; background: var(--trip-viewport-background); }
.page { position: fixed; top: 0; left: 0; width: var(--trip-canvas-width); height: var(--mobile-height, 932px); transform: scale(var(--mobile-scale, 1)); transform-origin: top left; overflow: hidden; font-family: var(--trip-font); }
.canvas { position: relative; width: var(--trip-canvas-width); height: var(--mobile-height, var(--trip-canvas-height)); border-radius: var(--trip-screen-radius) var(--trip-screen-radius) 0 0; background: var(--trip-background); overflow: hidden; }
.back-button { position: absolute; z-index: 3; top: var(--trip-back-top); left: var(--trip-back-left); width: var(--trip-back-size); height: var(--trip-back-size); }
.back-button image { width: 100%; height: 100%; }
.complete-panel { position: absolute; top: var(--trip-complete-panel-top); left: 0; width: var(--trip-canvas-width); height: calc(var(--mobile-height, var(--trip-canvas-height)) - var(--trip-complete-panel-top)); border-radius: var(--trip-panel-radius) var(--trip-panel-radius) 0 0; overflow: hidden; background: var(--trip-panel-background); color: var(--trip-surface); }
.floor-scene { position: absolute; left: var(--trip-complete-floor-left); top: var(--trip-complete-floor-top); width: var(--trip-complete-floor-width); height: var(--trip-complete-floor-height); }
.status-content { position: absolute; top: var(--trip-complete-status-top); left: var(--trip-complete-status-left); width: var(--trip-complete-status-width); height: var(--trip-complete-status-height); display: flex; align-items: center; gap: var(--trip-complete-status-gap); }
.status-content image { width: var(--trip-complete-status-icon); height: var(--trip-complete-status-icon); }
.status-content text { font-size: var(--trip-title-size); line-height: var(--trip-title-line); font-weight: 700; white-space: nowrap; }
.trip-summary { position: absolute; top: var(--trip-complete-summary-top); left: var(--trip-complete-summary-left); width: var(--trip-complete-summary-width); height: var(--trip-complete-summary-height); }
.route-row { position: relative; width: 100%; height: var(--trip-route-icon-size); font-size: var(--trip-route-size); font-weight: 700; }
.route-row image, .route-row text { position: absolute; }
.origin-icon { top: var(--trip-complete-origin-top); left: var(--trip-complete-origin-left); width: var(--trip-place-icon-width); height: var(--trip-origin-icon-height); }
.origin-label { top: var(--trip-complete-label-top); left: var(--trip-complete-origin-label-left); }
.route-arrow { top: var(--trip-complete-arrow-top); left: var(--trip-complete-arrow-left); width: var(--trip-route-icon-size); height: var(--trip-route-icon-size); }
.destination-icon { top: var(--trip-complete-destination-top); left: var(--trip-complete-destination-left); width: var(--trip-place-icon-width); height: var(--trip-destination-icon-height); }
.destination-label { top: var(--trip-complete-label-top); left: var(--trip-complete-destination-label-left); }
.time { position: absolute; left: 0; width: 100%; font-size: var(--trip-departure-size); line-height: var(--trip-complete-time-line); font-weight: 100; text-align: center; white-space: nowrap; }
.departure-time { top: var(--trip-complete-departure-top); }
.arrival-time { top: var(--trip-complete-arrival-top); }
.rating-prompt { position: absolute; top: var(--trip-complete-rating-top); left: var(--trip-complete-rating-left); width: var(--trip-complete-rating-width); height: var(--trip-complete-rating-height); }
.rating-prompt text { position: absolute; top: 0; left: var(--trip-complete-rating-label-left); color: var(--trip-complete-accent); font-size: var(--trip-route-size); line-height: var(--trip-complete-time-line); font-weight: 700; white-space: nowrap; }
.rating-prompt image { position: absolute; left: 0; bottom: 0; width: var(--trip-complete-rating-width); height: var(--trip-complete-stars-height); }
.complete-button { position: absolute; top: var(--trip-complete-button-top); left: var(--trip-complete-button-left); width: var(--trip-complete-button-width); height: var(--trip-complete-button-height); display: flex; align-items: center; justify-content: center; box-sizing: border-box; border-radius: var(--trip-complete-button-radius); background: var(--trip-complete-accent); color: var(--trip-complete-button-text); font-size: var(--trip-route-size); font-weight: 700; }
</style>
