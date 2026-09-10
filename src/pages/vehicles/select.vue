<template>
  <view class="page" :style="responsiveStyle">
    <view class="header">
      <view class="back-button" @tap.stop="goBack"><image src="/static/vehicles/back.svg" mode="aspectFit" /></view>
      <view class="route-summary" @tap="editSheetOpen = true">
        <image class="origin-icon" src="/static/vehicles/origin.svg" mode="aspectFit" /><text class="origin">{{ originLabel }}</text>
        <image class="route-icon" src="/static/vehicles/route.svg" mode="aspectFit" />
        <image class="destination-icon" src="/static/vehicles/destination.svg" mode="aspectFit" /><text class="destination">{{ destinationLabel }}</text>
        <text class="booking-time">預約時間 ： {{ bookingTime }}</text>
      </view>
      <view class="tabs"><view v-for="tab in tabs" :key="tab.value" :class="['tab',{active:activeCategory===tab.value}]" @tap="activeCategory=tab.value"><text>{{ tab.label }}</text><image v-if="activeCategory===tab.value" src="/static/vehicles/tab-line.svg" mode="scaleToFill" /></view></view>
    </view>
    <view v-if="catalogError" class="catalog-message" @tap="loadCatalog">{{ catalogError }}，點擊重試</view>
    <scroll-view v-else class="vehicle-scroll" scroll-y :show-scrollbar="false">
      <view v-for="group in visibleGroups" :key="group.category" class="vehicle-group">
        <text class="group-label">{{ group.title }}</text>
        <VehicleCard v-for="vehicle in group.vehicles" :key="`${group.category}-${vehicle.id}`" :vehicle="vehicle" :quote="tripStore.fareQuotes[vehicle.id]" :selectable="vehicle.selectable" :selected="selectedVehicleId === vehicle.id" @select="selectVehicle(vehicle)" />
      </view><view class="bottom-space" />
    </scroll-view>
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
import { computed, onMounted, ref, watch } from 'vue'
import { useResponsiveCanvas } from '../../composables/useResponsiveCanvas'
import { useTripStore } from '../../stores/trip'
import { openCachedPage, closeCachedPage } from '../../utils/navigation'
import { createFareQuote, listPublicVehicles, type FareQuote, type PublicVehicleCatalog } from '../../services/api'
import { useCurrency } from '../../composables/useCurrency'
import TripEditSheet from '../../components/home/TripEditSheet.vue'
import VehicleCard from '../../components/vehicles/VehicleCard.vue'
import type { Vehicle } from '../../types/vehicle'
type Category = 'all' | string
interface VehicleGroup { category: string; title: string; vehicles: Vehicle[] }
const { responsiveStyle } = useResponsiveCanvas()
const tripStore = useTripStore()
const { currency } = useCurrency()
const activeCategory = ref<Category>('all')
const editSheetOpen = ref(false)
const catalog = ref<PublicVehicleCatalog>({ categories: [], data: [], extras: [] })
const catalogError = ref('')
const tabs = computed(() => [{ label: '全部', value: 'all' as Category }, ...catalog.value.categories.map(category => ({ label: category.tabLabel, value: category.id }))])
const groups = computed<VehicleGroup[]>(() => catalog.value.categories.map(category => ({
  category: category.id,
  title: category.name,
  vehicles: catalog.value.data.filter(vehicle => vehicle.categoryId === category.id).map(vehicle => ({ ...vehicle, selectable: true, modelChoice: Boolean(vehicle.modelChoiceLabel) }))
})))
const visibleGroups = computed(() => {
  const available = groups.value.filter(group => group.vehicles.length)
  return activeCategory.value === 'all' ? available : available.filter(group => group.category === activeCategory.value)
})
const selectedVehicleId = computed(() => tripStore.chosenVehicle?.id || '')
const routeRegion = (value: string | undefined, fallback: string) => {
  const text = value?.trim() || ''
  if (text.includes('香港')) return '香港'
  if (text.includes('澳門') || text.includes('澳门')) return '澳門'
  if (text.includes('廣東') || text.includes('广东') || text.includes('深圳') || text.includes('珠海') || text.includes('廣州') || text.includes('广州')) return '大陸'
  return fallback
}
let quoteRequestId = 0
const loadQuotes = async () => {
  const requestId = ++quoteRequestId
  const distanceMeters = tripStore.activeDraft.distanceMeters
  const vehicles = catalog.value.data.filter(vehicle => vehicle.categoryId)
  if (!Number.isFinite(distanceMeters) || !vehicles.length) {
    if (requestId === quoteRequestId) tripStore.setFareQuotes([])
    return
  }

  const results = await Promise.allSettled(vehicles.map(vehicle => createFareQuote({
    categoryId: vehicle.categoryId!,
    vehicleId: vehicle.id,
    distanceMeters: distanceMeters!,
    originRegion: tripStore.activeDraft.route.originRegion || routeRegion(tripStore.activeDraft.route.origin, ''),
    originCity: tripStore.activeDraft.route.originCity,
    destinationRegion: tripStore.activeDraft.route.destinationRegion || routeRegion(tripStore.activeDraft.route.destination, ''),
    destinationCity: tripStore.activeDraft.route.destinationCity,
    scheduledAt: tripStore.departureTime,
    displayCurrency: currency.value
  })))
  if (requestId !== quoteRequestId) return
  const rejected = results.find((result): result is PromiseRejectedResult => result.status === 'rejected')
  if (rejected && results.every(result => result.status === 'rejected')) {
    catalogError.value = rejected.reason instanceof Error ? rejected.reason.message : '報價暫時無法取得'
  }
  tripStore.setFareQuotes(results
    .filter((result): result is PromiseFulfilledResult<FareQuote> => result.status === 'fulfilled')
    .map(result => result.value))
}
const loadCatalog = async () => {
  catalogError.value = ''
  try {
    catalog.value = await listPublicVehicles()
    if (activeCategory.value !== 'all' && !catalog.value.categories.some(category => category.id === activeCategory.value)) activeCategory.value = 'all'
    await loadQuotes()
  } catch (error) {
    catalogError.value = error instanceof Error ? error.message : '車型資料暫時無法載入'
  }
}
onMounted(loadCatalog)
watch([currency, () => tripStore.activeDraft.distanceMeters], () => { void loadQuotes() })
const cityName = (value: string | undefined, fallback: string) => {
  const text = value?.trim() || ''
  if (text.includes('香港')) return '香港'
  if (text.includes('深圳') || text.includes('廣東')) return '深圳'
  if (text.includes('廣州')) return '廣州'
  if (text.includes('珠海')) return '珠海'
  if (text.includes('澳門')) return '澳門'
  return text.split(/[·，,\s]/)[0] || fallback
}
const originLabel = computed(() => cityName(tripStore.activeTrip?.origin, '香港'))
const destinationLabel = computed(() => cityName(tripStore.activeTrip?.destination, '深圳'))
const bookingTime = computed(() => {
  if (!tripStore.departureTime) return 'March 15 2024 14:00'
  const date = new Date(tripStore.departureTime)
  return Number.isNaN(date.valueOf())
    ? tripStore.departureTime
    : `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
})
const selectVehicle = (vehicle: Vehicle) => { if (!vehicle.selectable) return; tripStore.setChosenVehicle(vehicle); openCachedPage('/pages/vehicles/selected') }
const saveTripChanges = (origin: string, destination: string, departureTime: string) => { tripStore.setRoute(origin, destination); tripStore.setDepartureTime(departureTime); editSheetOpen.value = false }
const goBack = () => closeCachedPage('/pages/index/index')
</script>
<style scoped>
:global(html),:global(body),:global(#app){width:100%;min-width:0;height:100%;margin:0;overflow:hidden;overscroll-behavior:none}.page{position:fixed;top:50%;left:50%;width:430px;height:932px;overflow:hidden;border-radius:35px;background:#56657e;color:#38434a;font-family:'Noto Sans TC',sans-serif;transform:translate(-50%,-50%) scale(min(1,calc(100vw / 430px),calc(100dvh / 932px)));transform-origin:center}.header{position:absolute;z-index:3;top:0;left:0;width:430px;height:155px;overflow:hidden;border-radius:25px;background:#56657e;color:#fff}.back-button{position:absolute;top:53px;left:25px;width:28px;height:40px;display:flex;align-items:center;justify-content:center}.back-button image{width:16px;height:29px}.route-summary{position:absolute;top:56px;left:53px;width:324px;height:59px}.origin-icon{position:absolute;top:12px;left:69px;width:8px;height:14.517px}.origin{position:absolute;top:9px;left:94px;font-size:14px;font-weight:700;line-height:20px}.route-icon{position:absolute;top:4px;left:139px;width:30px;height:30px}.destination-icon{position:absolute;top:13px;left:186px;width:8px;height:11.978px}.destination{position:absolute;top:9px;left:214px;font-size:14px;font-weight:700;line-height:20px}.booking-time{position:absolute;top:39px;left:0;width:324px;text-align:center;font-size:14px;font-weight:100;line-height:20px;white-space:nowrap}.tabs{position:absolute;bottom:0;left:26px;width:378px;height:30px;display:flex;justify-content:space-between}.tab{position:relative;height:30px;font-size:14px;line-height:20px;white-space:nowrap}.tab.active{color:#1effaa;font-weight:700}.tab image{position:absolute;bottom:1px;left:0;width:32px;height:2px}.vehicle-scroll{position:absolute;top:155px;left:0;width:430px;height:calc(100% - 155px)}.vehicle-group{padding-top:10px}.group-label{display:flex;width:max-content;height:18px;margin:0 0 5px 24px;padding:0 6px;align-items:center;border-radius:25px;background:#d9d9d9;font-size:8px;font-weight:500;line-height:12px}.vehicle-card{position:relative;width:380px;height:180px;margin:0 auto 10px;overflow:hidden;border-radius:25px;background:#fff;color:#25292f}.vehicle-name{position:absolute;z-index:2;top:43px;left:27px;width:95px;font-size:8px;font-weight:900;line-height:12px}.vehicle-name .brand{font-weight:100}.vehicle-name .series{display:block;margin-left:7px;font-size:12px;line-height:17px}.radio{position:absolute;z-index:2;top:24px;left:43px;width:20px;height:20px}.vehicle-image{position:absolute;top:0;left:150px;width:230px;height:153px}.vehicle-image.tesla-s{height:132px}.double-image{position:absolute;top:0;left:0;width:380px;height:153px;display:flex}.double-image image{width:230px;height:153px;flex:none}.double-image image+image{margin-left:-80px}.spec{position:absolute;z-index:2;top:141px;height:20px;display:flex;align-items:center;justify-content:center;box-sizing:border-box;border-radius:25px;background:#d9d9d9;color:#000;font-size:10px;line-height:14px}.seat{left:27px;width:54px}.seat image{width:16px;height:16px;margin-right:6px}.color{left:85px;width:54px;font-weight:350}.model-choice{left:145px;width:54px;background:#fff;font-weight:700}.price{position:absolute;z-index:2;top:141px;left:255px;width:98px;height:20px;border-radius:25px;background:#1effaa;font-size:14px;font-weight:700;line-height:20px;text-align:center}.discount{position:absolute;z-index:2;top:161px;left:276px;color:#f95c5c;font-size:12px;line-height:17px}.vehicle-group:first-child .spec,.vehicle-group:first-child .price{top:143px}.bottom-space{height:20px}@media (max-width:599px){.page{top:0;left:0;height:var(--mobile-height,100dvh);border-radius:0;transform:scale(var(--mobile-scale,1));transform-origin:top left}}
</style>
