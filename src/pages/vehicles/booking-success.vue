<template>
  <view class="page" :style="responsiveStyle">
    <HomeMap map-id="booking-success-map" :latitude="22.3080" :longitude="114.1719" :pickup-label="originLabel" :destination-label="destinationLabel" full-screen />
    <view class="back" @tap="goBack"><image class="page-back" src="/static/vehicles/confirm-back.svg" mode="aspectFit" /></view>
    <view class="status-panel">
      <view class="route-card">
        <view class="route-row">
          <image class="origin-icon" src="/static/vehicles/booking-success/origin.svg" mode="aspectFit" /><text class="origin-label">{{ originLabel }}</text>
          <image class="route-arrow" src="/static/vehicles/booking-success/route-arrow.svg" mode="aspectFit" />
          <image class="destination-icon" src="/static/vehicles/booking-success/destination.svg" mode="aspectFit" /><text class="destination-label">{{ destinationLabel }}</text>
        </view>
        <text class="booking-time">預約時間 ： {{ bookingTime }}</text>
      </view>
      <view class="status-heading"><image class="status-icon" src="/static/vehicles/booking-success/status-icon.svg" mode="scaleToFill" /><text>正在為您安排司機</text></view>
      <view class="confirmation-time"><image src="/static/vehicles/booking-success/clock.svg" mode="aspectFit" /><text>三小時內確認</text></view>
      <image class="vehicle-illustration" src="/static/vehicles/booking-success/vehicle-scene.png" mode="scaleToFill" />
      <image class="waiting-state" src="/static/vehicles/booking-success/waiting.svg" mode="aspectFit" />
      <view class="cancel-action" @tap="cancelBooking"><image src="/static/vehicles/booking-success/cancel.svg" mode="aspectFit" /><text>取消用車</text></view>
      <view class="detail-action" @tap="showBookingDetail">訂單詳細</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import HomeMap from '../../components/home/HomeMap.vue'
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getClientTrip, type ClientTrip } from '../../services/api'
import { openCachedPage } from '../../utils/navigation'
import { useResponsiveCanvas } from '../../composables/useResponsiveCanvas'

const { responsiveStyle } = useResponsiveCanvas()
const trip = ref<ClientTrip | null>(null)
const tripId = ref('')
const originLabel = computed(() => trip.value?.origin || '香港')
const destinationLabel = computed(() => trip.value?.destination || '深圳')
const bookingTime = computed(() => {
  const date = trip.value ? new Date(trip.value.scheduledAt) : null
  return date && !Number.isNaN(date.valueOf()) ? `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}` : '—'
})
onLoad(async (options) => {
  tripId.value = options?.id || ''
  if (!tripId.value) return
  try {
    trip.value = await getClientTrip(tripId.value)
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : '訂單載入失敗', icon: 'none' })
  }
})

const goBack = () => openCachedPage('/pages/index/index')
const cancelBooking = () => openCachedPage(`/pages/orders/pending-detail?id=${encodeURIComponent(tripId.value)}`)
const showBookingDetail = () => openCachedPage(`/pages/orders/detail?status=traveling&from=orders&id=${encodeURIComponent(tripId.value)}`)
</script>

<style scoped>
:global(html),
:global(body),
:global(#app) {
  width: 100%;
  min-width: 0;
  height: 100%;
  margin: 0;
  overflow: hidden;
  background: #25292f;
}

.page {
  position: fixed;
  top: 0;
  left: 0;
  width: 430px;
  height: 932px;
  overflow: hidden;
  background: #25292f;
  font-family: 'Noto Sans TC', sans-serif;
  transform-origin: top left;
}

.status-heading text {
  font-family: 'Inria Sans', sans-serif;
  font-size: 18px;
  font-weight: 700;
  font-style: normal;
  line-height: normal;
  white-space: nowrap;
}

.page {
  height: var(--mobile-height, 100dvh);
  transform: scale(var(--mobile-scale, 1));
}

.cancel-action text,
.detail-action {
  font-family: 'Inria Sans', sans-serif;
  font-style: normal;
  line-height: normal;
  white-space: nowrap;
}

.status-heading {
  position: absolute;
  z-index: 4;
  top: 100px;
  left: 81.5px;
  width: 267px;
  height: 111px;
  padding: 21px 39px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  overflow: hidden;
  border-radius: 25px;
  color: #fff;
}

.status-heading image {
  width: 30px;
  height: 30px;
  flex: 0 0 30px;
}

.confirmation-time text {
  font-family: 'Noto Sans TC', sans-serif;
  font-size: 12px;
  font-weight: 300;
  line-height: normal;
}

.dynamic-island {
  position: absolute;
  z-index: 6;
  top: 11px;
  left: 94px;
  width: 241px;
  height: 38px;
  border-radius: 37px;
  background: #000;
  color: #fecf62;
  font-size: 10px;
  font-weight: 700;
}

.island-copy {
  position: absolute;
  top: 11px;
  left: 28px;
  line-height: normal;
}

.view-trip {
  position: absolute;
  top: 11px;
  left: 190px;
  line-height: normal;
  white-space: nowrap;
}

.back {
  position: absolute;
  z-index: 6;
  top: 60px;
  left: 33px;
  width: 38px;
  height: 38px;
}

 .page-back {
   display: block;
   width: 38px;
   height: 38px;
   background: transparent;
 }

.route-card {
  position: absolute;
  top: 45px;
  left: 53px;
  width: 324px;
  height: 62px;
  color: #fff;
}

.route-row{position:absolute;top:0;left:0;width:324px;height:30px;font-size:14px;font-weight:700}.route-row image{position:absolute;display:block}.route-row .origin-icon{left:69px;top:12px;width:8px;height:14.517px}.route-row .origin-label{position:absolute;left:94px;top:9px;line-height:normal;white-space:nowrap}.route-row .route-arrow{left:139px;top:4px;width:30px;height:30px}.route-row .destination-icon{left:186px;top:13px;width:8px;height:11.978px}.route-row .destination-label{position:absolute;left:211px;top:9px;line-height:normal;white-space:nowrap}
.booking-time { position:absolute;top:38px;left:62px;width:200px;color:#fefefe;font-size:14px;font-weight:100;white-space:nowrap;text-align:left;border:0!important;outline:0!important;box-shadow:none!important;background:transparent!important;text-decoration:none!important }
.booking-time span { border:0!important;outline:0!important;box-shadow:none!important;background:transparent!important;text-decoration:none!important }

.status-panel {
  position: absolute;
  z-index: 3;
  top: 399px;
  left: 0;
  width: 430px;
  height: 533px;
  overflow: hidden;
  border-radius: 25px;
  background: #56657e;
}

.status-heading text{font-family:'Inria Sans',sans-serif;font-size:18px;font-weight:700;font-style:normal;line-height:normal;white-space:nowrap}.confirmation-time{position:absolute;z-index:4;top:189px;left:0;width:100%;justify-content:center;display:flex;align-items:center;gap:5px;color:#d9d9d9}.confirmation-time image{width:20px;height:20px}.confirmation-time text{font-family:'Noto Sans TC',sans-serif;font-size:12px;font-weight:300;line-height:normal}.vehicle-illustration{position:absolute;z-index:1;top:144px;left:0;width:430px;height:389px}
.waiting-state{position:absolute;z-index:5;top:200px;left:204px;width:32px;height:32px}

.cancel-action{position:absolute;z-index:4;top:20px;left:337px;display:flex;align-items:center;color:#d9d9d9}.cancel-action image{width:25px;height:25px}.cancel-action text{height:20px;padding:3px 7px;border:1px solid #d9d9d9;border-radius:5px;box-sizing:border-box;font-family:'Inria Sans',sans-serif;font-size:10px;font-weight:400;font-style:normal;line-height:normal;white-space:nowrap}.detail-action{position:absolute;z-index:4;top:22.5px;left:30px;height:20px;padding:3px 7px;border:1px solid #d9d9d9;border-radius:5px;box-sizing:border-box;color:#d9d9d9;font-family:'Inria Sans',sans-serif;font-size:10px;font-weight:400;font-style:normal;line-height:normal;white-space:nowrap}

.actions { display:none }
</style>
