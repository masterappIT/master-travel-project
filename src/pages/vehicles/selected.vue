<template>
  <view class="page" :style="responsiveStyle">
    <view class="header">
      <view class="back-button" @tap="goBack"><image src="/static/vehicles/back.svg" mode="aspectFit" /></view>
      <view class="route-summary" @tap="editSheetOpen = true">
        <image class="origin-icon" src="/static/vehicles/origin.svg" mode="aspectFit" /><text class="origin-label">{{ originLabel }}</text>
        <image class="route-icon" src="/static/vehicles/route.svg" mode="aspectFit" />
        <image class="destination-icon" src="/static/vehicles/destination.svg" mode="aspectFit" /><text class="destination-label">{{ destinationLabel }}</text>
        <text class="booking-time">預約時間 ： {{ bookingTime }}</text>
      </view>
      <view class="tabs"><view v-for="tab in tabs" :key="tab.label" :class="['tab',{active:tab.active}]"><text>{{ tab.label }}</text><image v-if="tab.active" src="/static/vehicles/tab-line.svg" mode="scaleToFill" /></view></view>
    </view>

    <view class="vehicle-tag">高級跨境商務車</view>
    <view class="selected-vehicle-card"><VehicleCard :vehicle="vehicle" :quote="tripStore.selectedFareQuote" selectable :selected="true" /></view>
    <view class="promo-card"><text class="promo-copy">{{ promoApplied ? '已使用組合優惠“現金券50”' : '可使用組合優惠“現金券50”' }}</text><view class="promo-action" @tap="togglePromo"><text>{{ promoApplied ? '取消使用' : '立即使用' }}</text></view></view>

    <view class="extras">
      <view class="extras-title"><image src="/static/vehicles/extra-cart.svg" mode="aspectFit" /><text>額外選擇</text></view>
      <view v-for="extra in extras" :key="extra.id" class="extra-row" @tap="toggleExtra(extra.id)"><image :src="selectedExtras.includes(extra.id) ? '/static/vehicles/extra-selected.svg' : '/static/vehicles/extra-radio.svg'" mode="aspectFit" /><text>{{ extra.label }}</text><text class="extra-price">HKD${{ extra.price }}</text></view>
    </view>
    <view class="next-button" @tap="goNext">下一步</view>
    <TripEditSheet
      v-if="editSheetOpen"
      :origin="tripStore.activeTrip?.origin || '香港 · 九龍站'"
      :destination="tripStore.activeTrip?.destination || '廣東 · 深圳灣口岸'"
      :departure-time="tripStore.departureTime"
      @close="editSheetOpen = false"
      @confirm="saveTripChanges"
    />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useResponsiveCanvas } from '../../composables/useResponsiveCanvas'
import { useTripStore } from '../../stores/trip'
import { closeCachedPage, openCachedPage } from '../../utils/navigation'
import TripEditSheet from '../../components/home/TripEditSheet.vue'
import VehicleCard from '../../components/vehicles/VehicleCard.vue'
import type { Vehicle } from '../../types/vehicle'
const { responsiveStyle } = useResponsiveCanvas()
const tripStore = useTripStore()
const editSheetOpen = ref(false)
const vehicle = computed<Vehicle>(() => tripStore.chosenVehicle || { id: 'premium-alphard', brand: 'Toyota', model: 'Alphard', series: '30系', seats: 6, price: 800, image: '/static/vehicles/alphard.png', selectable: true })
const originLabel = computed(() => cityName(tripStore.activeTrip?.origin, '香港'))
const destinationLabel = computed(() => cityName(tripStore.activeTrip?.destination, '深圳'))
const cityName = (value: string | undefined, fallback: string) => {
  const text = value?.trim() || ''
  if (text.includes('香港')) return '香港'
  if (text.includes('深圳') || text.includes('廣東')) return '深圳'
  return text.split(/[·，,\s]/)[0] || fallback
}
const tabs = [{ label: '全部', active: false }, { label: '普通MPV', active: false }, { label: '高級MPV', active: true }, { label: '普通轎車', active: false }, { label: '頂級轎車', active: false }]
const bookingTime = computed(() => tripStore.departureTime || 'March 15 2024 14:00')
const saveTripChanges = (origin: string, destination: string, departureTime: string) => {
  tripStore.setRoute(origin, destination)
  tripStore.setDepartureTime(departureTime)
  editSheetOpen.value = false
}
const promoApplied = ref(false)
const selectedExtras = ref<string[]>(['priority'])
const extras = [
  { id: 'priority', label: '加急訂單附加費', price: 100 },
  { id: 'baby-seat', label: '嬰兒座椅', price: 100 },
  { id: 'late-night', label: '深夜加班費', price: 100 },
]
const goBack = () => closeCachedPage('/pages/vehicles/select')
const togglePromo = () => {
  promoApplied.value = !promoApplied.value
  uni.showToast({ title: promoApplied.value ? '優惠已使用' : '已取消優惠', icon: 'none' })
}
const toggleExtra = (id: string) => {
  selectedExtras.value = selectedExtras.value.includes(id)
    ? selectedExtras.value.filter((extraId) => extraId !== id)
    : [...selectedExtras.value, id]
}
const goNext = () => openCachedPage('/pages/vehicles/confirm')
</script>

<style scoped>
:global(html),:global(body),:global(#app){width:100%;min-width:0;height:100%;margin:0;overflow:hidden;background:#56657e}.page{position:fixed;top:50%;left:50%;width:430px;height:932px;overflow:hidden;background:#56657e;color:#fff;font-family:'Noto Sans TC',sans-serif;transform:translate(-50%,-50%) scale(min(1,calc(100vw / 430px),calc(100dvh / 932px)));transform-origin:center}.header{position:absolute;z-index:3;top:0;left:0;width:430px;height:155px;overflow:hidden;border-radius:25px;background:#56657e;color:#fff}.back-button{position:absolute;top:53px;left:25px;width:28px;height:40px;display:flex;align-items:center;justify-content:center}.back-button image{width:16px;height:29px}.route-summary{position:absolute;top:56px;left:53px;width:324px;height:59px}.origin-icon{position:absolute;top:12px;left:69px;width:8px;height:14.517px}.origin-label{position:absolute;top:9px;left:94px;font-size:14px;font-weight:700;line-height:20px}.route-icon{position:absolute;top:4px;left:139px;width:30px;height:30px}.destination-icon{position:absolute;top:13px;left:186px;width:8px;height:11.978px}.destination-label{position:absolute;top:9px;left:214px;font-size:14px;font-weight:700;line-height:20px}.booking-time{position:absolute;top:39px;left:0;width:324px;text-align:center;font-size:14px;font-weight:100;line-height:20px;white-space:nowrap}.tabs{position:absolute;bottom:0;left:26px;width:378px;height:30px;display:flex;justify-content:space-between}.tab{position:relative;height:30px;font-size:14px;line-height:20px;white-space:nowrap}.tab.active{color:#1effaa;font-weight:700}.tab image{position:absolute;bottom:1px;left:0;width:32px;height:2px}.vehicle-tag{position:absolute;left:24px;top:165px;width:66px;height:18px;border-radius:25px;background:#d9d9d9;color:#38434a;text-align:center;font-size:8px;font-weight:500;line-height:18px;white-space:nowrap}.selected-vehicle-card{position:absolute;z-index:3;top:193px;left:25px;width:380px;height:180px}.selected-vehicle-card :deep(.vehicle-card){margin:0}
.promo-card{position:absolute;z-index:2;top:306px;left:25px;width:380px;height:104px;overflow:hidden;border-radius:25px;background:#38434a;color:#fff}.promo-copy{position:absolute;left:27px;top:77px;font-size:12px;font-weight:500;white-space:nowrap}.promo-action{position:absolute;top:74px;right:25px;height:26px;padding:5px 10px;box-sizing:border-box;border:1px solid #1effaa;border-radius:10px;color:#1effaa;font-size:10px;line-height:14px}.extras{position:absolute;top:423px;left:26px;width:351px;height:155px}.extras-title{position:absolute;left:0;top:0;width:220px;height:30px;display:flex;align-items:center;gap:10px;color:#fff;font-size:14px;font-weight:300;white-space:nowrap}.extras-title image{width:30px;height:30px}.extra-row{position:absolute;left:29px;width:322px;height:20px;display:flex;align-items:center;gap:10px;font-size:16px;font-weight:500;white-space:nowrap}.extra-row image{width:18px;height:18px}.extra-row:nth-of-type(2){top:54px}.extra-row:nth-of-type(3){top:92px}.extra-row:nth-of-type(4){top:130px}.extra-price{position:absolute;left:260px;color:#1effaa}.next-button{position:absolute;left:80px;top:826px;width:270px;height:48px;border-radius:25px;background:#1effaa;color:#38434a;text-align:center;line-height:48px;font-size:16px;font-weight:900}@media (max-width:599px){.page{top:0;left:0;height:var(--mobile-height,100dvh);border-radius:0;transform:scale(var(--mobile-scale,1));transform-origin:top left}}
</style>
