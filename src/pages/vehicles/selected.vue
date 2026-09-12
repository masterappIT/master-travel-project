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
    <view class="promo-card"><text class="promo-copy">{{ `${promoApplied ? '已使用優惠' : (hasCombinablePromotion ? '可使用組合優惠' : '可使用優惠')}“現金券${displayedPromotionAmount > 0 ? formatCouponAmount(displayedPromotionAmount, tripStore.selectedFareQuote?.currency) : ''}”` }}</text><view class="promo-action" :class="{ 'used-action': promoApplied }" @tap="togglePromo"><text>{{ promoApplied ? '已使用' : '立即使用' }}</text></view></view>

    <scroll-view v-if="visibleExtras.length" class="extras" scroll-y :show-scrollbar="false">
      <view class="extras-title"><image src="/static/vehicles/extra-cart.svg" mode="aspectFit" /><text>額外選擇</text></view>
      <view v-for="extra in visibleExtras" :key="extra.id" class="extra-row" :aria-disabled="isRequiredExtra(extra) ? 'true' : 'false'" @tap="handleExtraTap(extra)"><image :src="selectedExtras.includes(extra.id) ? '/static/vehicles/extra-selected.svg' : '/static/vehicles/extra-radio.svg'" mode="aspectFit" /><text>{{ extra.label }}</text><text class="extra-price">{{ formatExtraPrice(extra.price, extra.currency) }}</text></view>
    </scroll-view>
    <view class="next-button" @tap="goNext">下一步</view>
    <TripEditSheet
      v-if="editSheetOpen"
      :origin="tripStore.activeTrip?.origin || '香港 · 九龍站'"
      :destination="tripStore.activeTrip?.destination || '廣東 · 深圳灣口岸'"
      :departure-time="tripStore.departureTime"
      :origin-selection="originSelection"
      :destination-selection="destinationSelection"
      @close="editSheetOpen = false"
      @confirm="saveTripChanges"
    />
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useResponsiveCanvas } from '../../composables/useResponsiveCanvas'
import { useTripStore } from '../../stores/trip'
import { closeCachedPage, openCachedPage } from '../../utils/navigation'
import { createFareQuote, listPublicPromotions, listPublicVehicles, planDrivingRoute, type PublicPromotion, type PublicVehicleExtra } from '../../services/api'
import { useCurrency, normalizeCurrency, formatCurrencyAmount } from '../../composables/useCurrency'
import TripEditSheet from '../../components/home/TripEditSheet.vue'
import VehicleCard from '../../components/vehicles/VehicleCard.vue'
import type { Vehicle } from '../../types/vehicle'
import type { AddressSelection } from '../../components/home/AddressPicker.vue'
const { responsiveStyle } = useResponsiveCanvas()
const tripStore = useTripStore()
const { currency, exchangeRate } = useCurrency()
const editSheetOpen = ref(false)
const vehicle = computed<Vehicle>(() => tripStore.chosenVehicle || { id: 'premium-alphard', brand: 'Toyota', model: 'Alphard', series: '30系', seats: 6, image: '/static/vehicles/alphard.png', selectable: true })
const originLabel = computed(() => cityName(tripStore.activeTrip?.origin, '香港'))
const destinationLabel = computed(() => cityName(tripStore.activeTrip?.destination, '深圳'))
const cityName = (value: string | undefined, fallback: string) => {
  const text = value?.trim() || ''
  if (text.includes('香港')) return '香港'
  if (text.includes('深圳') || text.includes('廣東')) return '深圳'
  return text.split(/[·，,\s]/)[0] || fallback
}
const tabs = [{ label: '全部', active: false }, { label: '普通MPV', active: false }, { label: '高級MPV', active: true }, { label: '普通轎車', active: false }, { label: '頂級轎車', active: false }]
const bookingTime = computed(() => {
  if (!tripStore.departureTime) return 'March 15 2024 14:00'
  const date = new Date(tripStore.departureTime)
  return Number.isNaN(date.valueOf())
    ? tripStore.departureTime
    : `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
})
const originSelection = computed<AddressSelection | null>(() => {
  const route = tripStore.activeDraft.route
  return route.originLatitude !== undefined && route.originLongitude !== undefined
    ? { name: route.origin, address: route.origin, region: (route.originRegion as AddressSelection['region']) || null, city: route.originCity, latitude: route.originLatitude, longitude: route.originLongitude }
    : null
})
const destinationSelection = computed<AddressSelection | null>(() => {
  const route = tripStore.activeDraft.route
  return route.destinationLatitude !== undefined && route.destinationLongitude !== undefined
    ? { name: route.destination, address: route.destination, region: (route.destinationRegion as AddressSelection['region']) || null, city: route.destinationCity, latitude: route.destinationLatitude, longitude: route.destinationLongitude }
    : null
})
const saveTripChanges = async (
  origin: string,
  destination: string,
  departureTime: string,
  nextOriginSelection: AddressSelection | null,
  nextDestinationSelection: AddressSelection | null
) => {
  const currentRoute = tripStore.activeDraft.route
  const originCoordinate = nextOriginSelection?.latitude !== undefined && nextOriginSelection.longitude !== undefined ? { latitude: nextOriginSelection.latitude, longitude: nextOriginSelection.longitude } : currentRoute.originLatitude !== undefined && currentRoute.originLongitude !== undefined ? { latitude: currentRoute.originLatitude, longitude: currentRoute.originLongitude } : undefined
  const destinationCoordinate = nextDestinationSelection?.latitude !== undefined && nextDestinationSelection.longitude !== undefined ? { latitude: nextDestinationSelection.latitude, longitude: nextDestinationSelection.longitude } : currentRoute.destinationLatitude !== undefined && currentRoute.destinationLongitude !== undefined ? { latitude: currentRoute.destinationLatitude, longitude: currentRoute.destinationLongitude } : undefined
  tripStore.setRoute(origin, destination, {
    originRegion: nextOriginSelection?.region || undefined,
    originCity: nextOriginSelection?.city || undefined,
    destinationRegion: nextDestinationSelection?.region || undefined,
    destinationCity: nextDestinationSelection?.city || undefined,
    originLatitude: originCoordinate?.latitude,
    originLongitude: originCoordinate?.longitude,
    destinationLatitude: destinationCoordinate?.latitude,
    destinationLongitude: destinationCoordinate?.longitude
  })
  tripStore.setDepartureTime(departureTime)
  editSheetOpen.value = false
  if (!originCoordinate || !destinationCoordinate) return
  try {
    const route = await planDrivingRoute(originCoordinate, destinationCoordinate)
    tripStore.setRouteDistance(route.distance, route.duration)
    await refreshQuote()
  } catch (error) {
    tripStore.clearRouteDistance()
    uni.showToast({ title: error instanceof Error ? error.message : '路線規劃失敗，請稍後再試', icon: 'none' })
  }
}
const promoApplied = ref(false)
const promotions = ref<PublicPromotion[]>([])
const extras = ref<PublicVehicleExtra[]>([])
const severeWeatherEnabled = ref(false)
const selectedExtras = computed(() => tripStore.activeDraft.extras)
const cashCoupon = computed(() => {
  const couponCode = tripStore.activeDraft.couponCode?.trim().toUpperCase()
  return promotions.value.find(promotion =>
    promotion.kind === 'COUPON' &&
    promotion.couponCode &&
    (!couponCode || promotion.couponCode.toUpperCase() === couponCode)
  )
})
const hasCombinablePromotion = computed(() => promotions.value.some(promotion =>
  promotion.kind !== 'COUPON' &&
  (promotion.stackingMode === 'ALL' || promotion.stackingMode === 'PERCENTAGE_AND_VOUCHER')
))
const couponDiscountAmount = computed(() => {
  const promotion = cashCoupon.value
  if (!promotion || promotion.discountType !== 'FIXED_AMOUNT') return 0
  const sourceCurrency = normalizeCurrency(promotion.currency) || 'RMB'
  if (currency.value === sourceCurrency) return promotion.discountValue
  return sourceCurrency === 'RMB' ? promotion.discountValue / exchangeRate.value : promotion.discountValue * exchangeRate.value
})
const displayedPromotionAmount = computed(() => {
  if (promoApplied.value && cashCoupon.value) {
    const appliedCouponDiscount = tripStore.selectedFareQuote?.lines
      .filter(line => line.type === 'DISCOUNT' && line.sourceId === cashCoupon.value?.id)
      .reduce((sum, line) => sum + Math.abs(Math.min(0, line.totalAmount)), 0)
    if (appliedCouponDiscount !== undefined && appliedCouponDiscount > 0) return appliedCouponDiscount
  }
  return couponDiscountAmount.value
})
const loadPromotions = async () => {
  try {
    promotions.value = await listPublicPromotions()
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : '優惠資料暫時無法載入', icon: 'none' })
  }
}
const localTimeMinutes = (value: Date) => {
  if (Number.isNaN(value.valueOf())) return null
  const hongKongTime = new Date(value.getTime() + 8 * 60 * 60 * 1000)
  return hongKongTime.getUTCHours() * 60 + hongKongTime.getUTCMinutes()
}
const timeMinutes = (value: string | null) => {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return null
  const [hour, minute] = value.split(':').map(Number)
  return hour <= 23 && minute <= 59 ? hour * 60 + minute : null
}
const isTriggeredExtra = (extra: PublicVehicleExtra) => {
  const triggerType = extra.triggerType || (extra.requiredForImmediate ? 'IMMEDIATE' : 'NONE')
  if (!extra.triggerEnabled) return false
  if (triggerType === 'WEATHER') return severeWeatherEnabled.value
  if (!tripStore.departureTime) return false
  if (triggerType === 'NIGHT') {
    const start = timeMinutes(extra.nightStartTime)
    const end = timeMinutes(extra.nightEndTime)
    const departure = new Date(tripStore.departureTime)
    const current = localTimeMinutes(departure)
    if (start === null || end === null || current === null) return false
    return start <= end ? current >= start && current <= end : current >= start || current <= end
  }
  if (triggerType !== 'IMMEDIATE' || extra.requiredWithinMinutes === null) return false
  const departure = new Date(tripStore.departureTime)
  return !Number.isNaN(departure.valueOf()) && departure.getTime() - Date.now() <= extra.requiredWithinMinutes * 60 * 1000
}
const isRequiredExtra = (extra: PublicVehicleExtra) => isTriggeredExtra(extra)
const isTriggeredRule = (extra: PublicVehicleExtra) => isTriggeredExtra(extra)
const isTriggerExtra = (extra: PublicVehicleExtra) => (extra.triggerType || (extra.requiredForImmediate ? 'IMMEDIATE' : 'NONE')) !== 'NONE'
const visibleExtras = computed(() => extras.value
  .filter(extra => isTriggerExtra(extra) ? isTriggeredExtra(extra) : extra.enabled)
  .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id)))
const syncRequiredExtras = () => {
  const requiredIds = new Set(extras.value.filter(isTriggeredExtra).map(extra => extra.id))
  const synchronizedIds = selectedExtras.value
    .filter(id => extras.value.some(extra => extra.id === id && (extra.enabled || requiredIds.has(id))))
  for (const id of requiredIds) {
    if (!synchronizedIds.includes(id)) synchronizedIds.push(id)
  }
  if (synchronizedIds.length !== selectedExtras.value.length || synchronizedIds.some((id, index) => id !== selectedExtras.value[index])) {
    tripStore.updateActiveDraft({ extras: synchronizedIds })
  }
}
const routeRegion = (value: string | undefined, fallback: string) => {
  const text = value?.trim() || ''
  if (text.includes('香港')) return '香港'
  if (text.includes('澳門') || text.includes('澳门')) return '澳門'
  if (text.includes('廣東') || text.includes('广东') || text.includes('深圳') || text.includes('珠海') || text.includes('廣州') || text.includes('广州')) return '大陸'
  return fallback
}
let quoteRequestId = 0
const formatExtraPrice = (amount: number, extraCurrency: string) => formatCurrencyAmount(amount, normalizeCurrency(extraCurrency) || 'RMB', 0)
const refreshQuote = async (extraIds = selectedExtras.value) => {
  syncRequiredExtras()
  const requiredIds = new Set(extras.value.filter(isTriggeredExtra).map(extra => extra.id))
  const synchronizedExtraIds = Array.from(new Set([
    ...extraIds.filter(id => !extras.value.some(extra => extra.id === id && isTriggeredRule(extra)) || requiredIds.has(id)),
    ...requiredIds
  ]))
  const chosenVehicle = tripStore.chosenVehicle
  const categoryId = chosenVehicle?.categoryId || tripStore.selectedFareQuote?.pricing?.categoryId
  const distanceMeters = tripStore.activeDraft.distanceMeters
  if (!chosenVehicle || !categoryId || !Number.isFinite(distanceMeters)) return

  const requestId = ++quoteRequestId
  try {
    const quote = await createFareQuote({
      categoryId,
      vehicleId: chosenVehicle.id,
      distanceMeters: distanceMeters!,
      durationSeconds: (tripStore.activeDraft.durationHours || 0) * 3600,
      originRegion: tripStore.activeDraft.route.originRegion || routeRegion(tripStore.activeDraft.route.origin, ''),
      originCity: tripStore.activeDraft.route.originCity,
      destinationRegion: tripStore.activeDraft.route.destinationRegion || routeRegion(tripStore.activeDraft.route.destination, ''),
      destinationCity: tripStore.activeDraft.route.destinationCity,
      scheduledAt: tripStore.departureTime,
      couponCode: tripStore.activeDraft.couponCode,
      extraIds: synchronizedExtraIds,
      displayCurrency: currency.value
    })
    if (requestId !== quoteRequestId) return
    if (tripStore.activeDraft.couponCode && !quote.appliedPromotion) {
      tripStore.setCouponCode()
      promoApplied.value = false
      tripStore.setFareQuote(quote)
      showPromoToast('優惠已失效，已取消使用')
      return
    }
    tripStore.setFareQuote(quote)
  } catch (error) {
    if (requestId === quoteRequestId) uni.showToast({ title: error instanceof Error ? error.message : '報價暫時無法取得', icon: 'none' })
  }
}
const loadExtras = async () => {
  try {
    const catalog = await listPublicVehicles()
    extras.value = [...catalog.extras].sort((a, b) => a.order - b.order)
    severeWeatherEnabled.value = catalog.severeWeatherEnabled
    syncRequiredExtras()
    const availableExtraIds = new Set(extras.value.map(extra => extra.id))
    const validExtraIds = selectedExtras.value.filter(id => availableExtraIds.has(id))
    if (validExtraIds.length !== selectedExtras.value.length) tripStore.updateActiveDraft({ extras: validExtraIds })
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : '額外選擇暫時無法載入', icon: 'none' })
  }
}
onMounted(async () => {
  await loadPromotions()
  await loadExtras()
  await refreshQuote()
})
onShow(async () => {
  await loadPromotions()
  await loadExtras()
  await refreshQuote()
  const applied = Boolean(tripStore.activeDraft.couponCode)
  if (promoApplied.value !== applied) {
    promoApplied.value = applied
    await refreshQuote()
  }
})
const goBack = () => closeCachedPage('/pages/vehicles/select')
const showPromoToast = (title: string) => {
  uni.showToast({ title, icon: 'none', duration: 2000 })
}
const togglePromo = () => {
  if (promoApplied.value) {
    tripStore.setCouponCode()
    promoApplied.value = false
    void refreshQuote()
    showPromoToast('已取消優惠')
    return
  }
  if (couponDiscountAmount.value <= 0) {
    uni.showToast({ title: '目前沒有可使用的組合優惠', icon: 'none' })
    return
  }
  const couponCode = cashCoupon.value?.couponCode
  if (!couponCode) {
    uni.showToast({ title: '目前沒有可使用的現金券', icon: 'none' })
    return
  }
  tripStore.setCouponCode(couponCode)
  promoApplied.value = true
  void refreshQuote()
  showPromoToast('優惠已使用，已扣減車資')
}
const toggleExtra = (id: string) => {
  const extra = extras.value.find(item => item.id === id)
  if (extra && isRequiredExtra(extra)) return
  const extraIds = selectedExtras.value.includes(id)
    ? selectedExtras.value.filter((extraId) => extraId !== id)
    : [...selectedExtras.value, id]
  tripStore.updateActiveDraft({ extras: extraIds })
  void refreshQuote(extraIds)
}
const handleExtraTap = (extra: PublicVehicleExtra) => {
  if (isRequiredExtra(extra)) return
  toggleExtra(extra.id)
}
const goNext = async () => {
  await refreshQuote()
  if (!tripStore.selectedFareQuote) {
    uni.showToast({ title: '報價暫時無法取得', icon: 'none' })
    return
  }
  openCachedPage('/pages/vehicles/confirm')
}
</script>

<style scoped>
:global(html),:global(body),:global(#app){width:100%;min-width:0;height:100%;margin:0;overflow:hidden;background:#56657e}.page{position:fixed;top:0;left:0;width:430px;height:var(--mobile-height, 932px);overflow:hidden;background:#56657e;color:#fff;font-family:'Noto Sans TC',sans-serif;transform:scale(var(--mobile-scale, 1));transform-origin:top left}.header{position:absolute;z-index:3;top:0;left:0;width:430px;height:155px;overflow:hidden;border-radius:25px;background:#56657e;color:#fff}.back-button{position:absolute;top:53px;left:25px;width:28px;height:40px;display:flex;align-items:center;justify-content:center}.back-button image{width:16px;height:29px}.route-summary{position:absolute;top:56px;left:53px;width:324px;height:59px}.origin-icon{position:absolute;top:12px;left:69px;width:8px;height:14.517px}.origin-label{position:absolute;top:9px;left:94px;font-size:14px;font-weight:700;line-height:20px}.route-icon{position:absolute;top:4px;left:139px;width:30px;height:30px}.destination-icon{position:absolute;top:13px;left:186px;width:8px;height:11.978px}.destination-label{position:absolute;top:9px;left:214px;font-size:14px;font-weight:700;line-height:20px}.booking-time{position:absolute;top:39px;left:0;width:324px;text-align:center;font-size:14px;font-weight:100;line-height:20px;white-space:nowrap}.tabs{position:absolute;bottom:0;left:26px;width:378px;height:30px;display:flex;justify-content:space-between}.tab{position:relative;height:30px;font-size:14px;line-height:20px;white-space:nowrap}.tab.active{color:#1effaa;font-weight:700}.tab image{position:absolute;bottom:1px;left:0;width:32px;height:2px}.vehicle-tag{position:absolute;left:24px;top:165px;width:66px;height:18px;border-radius:25px;background:#d9d9d9;color:#38434a;text-align:center;font-size:8px;font-weight:500;line-height:18px;white-space:nowrap}.selected-vehicle-card{position:absolute;z-index:3;top:193px;left:25px;width:380px;height:180px}.selected-vehicle-card :deep(.vehicle-card){margin:0}
.promo-card{position:absolute;z-index:2;top:306px;left:25px;width:380px;height:104px;overflow:hidden;border-radius:25px;background:#38434a;color:#fff}.promo-copy{position:absolute;left:27px;top:77px;font-size:12px;font-weight:500;white-space:nowrap}.promo-action{position:absolute;top:74px;right:25px;height:26px;padding:5px 10px;box-sizing:border-box;border:1px solid #1effaa;border-radius:10px;color:#1effaa;font-size:10px;line-height:14px}.promo-action.used-action{border-color:#f95c5c;color:#f95c5c}.extras{position:absolute;top:423px;left:26px;width:351px;height:360px}.extras-title{width:220px;height:30px;display:flex;align-items:center;gap:10px;color:#fff;font-size:14px;font-weight:300;white-space:nowrap}.extras-title image{width:30px;height:30px}.extra-row{position:relative;left:29px;width:322px;height:20px;display:flex;align-items:center;gap:10px;margin-top:18px;font-size:16px;font-weight:500;white-space:nowrap}.extras-title+.extra-row{margin-top:24px}.extra-row image{width:18px;height:18px}.extra-price{position:absolute;left:260px;color:#1effaa}.next-button{position:absolute;left:80px;top:826px;width:270px;height:48px;border-radius:25px;background:#1effaa;color:#38434a;text-align:center;line-height:48px;font-size:16px;font-weight:900}@media (max-width:599px){.page{top:0;left:0;height:var(--mobile-height,100dvh);border-radius:0;transform:scale(var(--mobile-scale,1));transform-origin:top left}}
</style>
