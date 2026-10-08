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

    <view class="vehicle-tag">{{ selectedCategoryName }}</view>
    <view v-if="vehicle" class="selected-vehicle-card"><VehicleCard :vehicle="vehicle" :quote="tripStore.selectedFareQuote" selectable :selected="true" /></view>
    <view v-if="showPromoCard" class="promo-card"><text class="promo-copy">{{ promoCopy }}</text><view class="promo-action" :class="{ 'used-action': promoApplied }" @tap="togglePromo"><text>{{ promoLoading ? '載入中' : promoApplied ? '取消使用' : '立即使用' }}</text></view></view>

    <scroll-view v-if="visibleExtras.length" class="extras" :class="{ 'without-promo': !showPromoCard }" scroll-y :show-scrollbar="false">
      <view class="extras-title"><image src="/static/vehicles/extra-cart.svg" mode="aspectFit" /><text>額外選擇</text></view>
      <view v-for="extra in visibleExtras" :key="extra.id" class="extra-row" :aria-disabled="isRequiredExtra(extra) ? 'true' : 'false'" @tap="handleExtraTap(extra)"><image :src="(isTriggerExtra(extra) ? quoteExtraIds.has(extra.id) : selectedExtras.includes(extra.id)) ? '/static/vehicles/extra-selected.svg' : '/static/vehicles/extra-radio.svg'" mode="aspectFit" /><text>{{ extra.label }}</text><text class="extra-price">{{ formatExtraPrice(extra.price, extra.currency) }}</text></view>
    </scroll-view>
    <view v-if="!vehicle" class="selected-vehicle-card" @tap="goBack">請重新選擇車型</view>
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
import { createFareQuote, listPublicPromotions, listPublicVehicles, planDrivingRoute, redeemPromotionCode, type FareQuote, type PublicPromotion, type PublicVehicleCategory, type PublicVehicleExtra } from '../../services/api'
import { useCurrency, normalizeCurrency, formatCurrencyAmount } from '../../composables/useCurrency'
import TripEditSheet from '../../components/home/TripEditSheet.vue'
import VehicleCard from '../../components/vehicles/VehicleCard.vue'
import type { AddressSelection } from '../../components/home/AddressPicker.vue'
const { responsiveStyle } = useResponsiveCanvas()
const tripStore = useTripStore()
const { currency } = useCurrency()
const editSheetOpen = ref(false)
const vehicle = computed(() => tripStore.chosenVehicle)
const categories = ref<PublicVehicleCategory[]>([])
const selectedCategory = computed(() => {
  const categoryId = vehicle.value?.categoryId || tripStore.selectedFareQuote?.pricing?.categoryId
  return categories.value.find(category => category.id === categoryId)
})
const selectedCategoryName = computed(() => selectedCategory.value?.name || tripStore.selectedFareQuote?.pricing?.categoryName || '未分類')
const originLabel = computed(() => cityName(tripStore.activeTrip?.origin, '香港'))
const destinationLabel = computed(() => cityName(tripStore.activeTrip?.destination, '深圳'))
const cityName = (value: string | undefined, fallback: string) => {
  const text = value?.trim() || ''
  if (text.includes('香港')) return '香港'
  if (text.includes('深圳') || text.includes('廣東')) return '深圳'
  return text.split(/[·，,\s]/)[0] || fallback
}
const tabs = computed(() => [{ label: '全部', active: false }, ...categories.value.map(category => ({ label: category.tabLabel, active: category.id === selectedCategory.value?.id }))])
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
    ? { name: route.originPlace || route.origin, address: route.originDetail || route.origin, region: (route.originRegion as AddressSelection['region']) || null, city: route.originCity, district: route.originDistrict, landmark: route.originPlace, latitude: route.originLatitude, longitude: route.originLongitude }
    : null
})
const destinationSelection = computed<AddressSelection | null>(() => {
  const route = tripStore.activeDraft.route
  return route.destinationLatitude !== undefined && route.destinationLongitude !== undefined
    ? { name: route.destinationPlace || route.destination, address: route.destinationDetail || route.destination, region: (route.destinationRegion as AddressSelection['region']) || null, city: route.destinationCity, district: route.destinationDistrict, landmark: route.destinationPlace, latitude: route.destinationLatitude, longitude: route.destinationLongitude }
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
    originDistrict: nextOriginSelection?.district || undefined,
    originPlace: nextOriginSelection?.landmark || nextOriginSelection?.name || undefined,
    originDetail: nextOriginSelection?.displayAddress || nextOriginSelection?.address || undefined,
    destinationRegion: nextDestinationSelection?.region || undefined,
    destinationCity: nextDestinationSelection?.city || undefined,
    destinationDistrict: nextDestinationSelection?.district || undefined,
    destinationPlace: nextDestinationSelection?.landmark || nextDestinationSelection?.name || undefined,
    destinationDetail: nextDestinationSelection?.displayAddress || nextDestinationSelection?.address || undefined,
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
const promotions = ref<PublicPromotion[]>([])
const combinationPreview = ref<{ promotion: PublicPromotion; quote: FareQuote } | null>(null)
const extras = ref<PublicVehicleExtra[]>([])
const severeWeatherEnabled = ref(false)
const selectedExtras = computed(() => tripStore.activeDraft.extras)
const quoteExtraIds = computed(() => new Set(tripStore.selectedFareQuote?.lines.filter(line => line.type === 'EXTRA').map(line => line.sourceId) || []))
const cashCoupon = computed(() => {
  const couponCode = tripStore.activeDraft.couponCode?.trim().toUpperCase()
  return promotions.value.find(promotion =>
    promotion.kind === 'COUPON' &&
    promotion.couponCode &&
    promotion.couponCode.toUpperCase() === couponCode
  )
})
const hasCombinationForQuote = (quote: FareQuote | null | undefined, couponId?: string) => {
  if (!quote || !couponId) return false
  const discountLines = quote.lines.filter(line => line.type === 'DISCOUNT' && line.totalAmount < 0)
  return discountLines.some(line => line.sourceId === couponId) && discountLines.some(line => line.sourceId !== couponId)
}
const hasAppliedCombination = computed(() => hasCombinationForQuote(tripStore.selectedFareQuote, cashCoupon.value?.id))
const promoApplied = computed(() => hasAppliedCombination.value)
const promoLoading = ref(false)
const combinationDiscount = (quote: FareQuote | null | undefined) => quote?.lines
  .filter(line => line.type === 'DISCOUNT' && line.totalAmount < 0)
  .reduce((sum, line) => sum + Math.abs(line.totalAmount), 0) || 0
const promoCopy = computed(() => {
  const quote = promoApplied.value ? tripStore.selectedFareQuote : combinationPreview.value?.quote
  const amount = combinationDiscount(quote)
  const formatted = amount > 0
    ? `（最高優惠 ${formatCouponAmount(amount, quote?.currency)}）`
    : ''
  return promoApplied.value ? `已使用優惠${formatted}` : `可使用組合優惠${formatted}`
})
const showPromoCard = computed(() => promoApplied.value || Boolean(combinationPreview.value && hasCombinationForQuote(combinationPreview.value.quote, combinationPreview.value.promotion.id)))
let previewRequestId = 0
const quoteContext = () => JSON.stringify({ vehicleId: vehicle.value?.id, categoryId: vehicle.value?.categoryId, draft: tripStore.activeDraft, currency: currency.value })
const loadCombinationPreview = async () => {
  const requestId = ++previewRequestId
  const context = quoteContext()
  const activeQuoteRequest = quoteRequestId
  combinationPreview.value = null
  if (tripStore.activeDraft.couponCode || !vehicle.value || !tripStore.activeDraft.distanceMeters || !promotions.value.length) return
  const couponPromotions = promotions.value.filter(item => item.kind === 'COUPON' && item.couponCode)
  const previews = await Promise.allSettled(couponPromotions.map(async promotion => ({
    promotion,
    quote: await createFareQuote({
      categoryId: vehicle.value!.categoryId!,
      vehicleId: vehicle.value!.id,
      distanceMeters: tripStore.activeDraft.distanceMeters!,
      durationSeconds: (tripStore.activeDraft.durationHours || 0) * 3600,
      originRegion: tripStore.activeDraft.route.originRegion || routeRegion(tripStore.activeDraft.route.origin, ''),
      originCity: tripStore.activeDraft.route.originCity,
      destinationRegion: tripStore.activeDraft.route.destinationRegion || routeRegion(tripStore.activeDraft.route.destination, ''),
      destinationCity: tripStore.activeDraft.route.destinationCity,
      couponCode: promotion.couponCode || undefined,
      reservePromotion: false,
      extraIds: [...selectedExtras.value],
      displayCurrency: currency.value
    })
  })))
  const best = previews
    .filter((result): result is PromiseFulfilledResult<{ promotion: PublicPromotion; quote: FareQuote }> => result.status === 'fulfilled')
    .filter(result => hasCombinationForQuote(result.value.quote, result.value.promotion.id))
    .sort((a, b) => combinationDiscount(b.value.quote) - combinationDiscount(a.value.quote))[0]
  if (requestId !== previewRequestId || activeQuoteRequest !== quoteRequestId || context !== quoteContext()) return
  combinationPreview.value = best?.value || null
}
const loadPromotions = async () => {
  try {
    promotions.value = await listPublicPromotions()
    const selectedCode = tripStore.activeDraft.couponCode?.trim().toUpperCase()
    if (selectedCode && !promotions.value.some(item => item.couponCode?.toUpperCase() === selectedCode)) {
      tripStore.setCouponCode()
      showPromoToast('優惠已失效，已自動移除')
    } else if (selectedCode) {
      try {
        await redeemPromotionCode(selectedCode)
      } catch (error) {
        tripStore.setCouponCode()
        showPromoToast(error instanceof Error ? `${error.message}，已自動移除` : '優惠已失效，已自動移除')
      }
    }
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
const isTriggerExtra = (extra: PublicVehicleExtra) => extra.triggerType !== 'NONE' || extra.requiredForImmediate
const visibleExtras = computed(() => extras.value
  .filter(extra => isTriggerExtra(extra) ? isTriggeredExtra(extra) : extra.enabled)
  .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id)))
const syncManualExtras = () => {
  const manualIds = selectedExtras.value.filter(id => extras.value.some(extra => extra.id === id && extra.enabled && !isTriggerExtra(extra)))
  if (manualIds.length !== selectedExtras.value.length || manualIds.some((id, index) => id !== selectedExtras.value[index])) {
    tripStore.updateActiveDraft({ extras: manualIds })
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
const formatCouponAmount = (amount: number, couponCurrency?: string) => formatCurrencyAmount(amount, normalizeCurrency(couponCurrency) || currency.value, 0)
const refreshQuote = async (reservePromotion = false): Promise<boolean> => {
  if (extras.value.length) syncManualExtras()
  const chosenVehicle = tripStore.chosenVehicle
  const categoryId = chosenVehicle?.categoryId || tripStore.selectedFareQuote?.pricing?.categoryId
  const distanceMeters = tripStore.activeDraft.distanceMeters
  if (!chosenVehicle || !categoryId || !Number.isFinite(distanceMeters)) return false

  const requestId = ++quoteRequestId
  const departureTime = tripStore.departureTime
  const selectedIds = [...selectedExtras.value]
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
      scheduledAt: departureTime,
      couponCode: tripStore.activeDraft.couponCode,
      reservePromotion,
      previousQuoteId: tripStore.selectedFareQuote?.id,
      extraIds: selectedIds,
      displayCurrency: currency.value
    })
    if (requestId !== quoteRequestId || departureTime !== tripStore.departureTime ||
      selectedIds.join(',') !== selectedExtras.value.join(',')) return false
    if (tripStore.activeDraft.couponCode && !quote.appliedPromotion) {
      tripStore.setCouponCode()
      tripStore.setFareQuote(quote)
      showPromoToast('優惠已失效，已取消使用')
      return true
    }
    tripStore.setFareQuote(quote)
    if (!tripStore.activeDraft.couponCode) await loadCombinationPreview()
    return true
  } catch (error) {
    if (requestId === quoteRequestId) uni.showToast({ title: error instanceof Error ? error.message : '報價暫時無法取得', icon: 'none' })
    return false
  }
}
const loadExtras = async () => {
  try {
    const catalog = await listPublicVehicles()
    const currentVehicle = tripStore.chosenVehicle
    categories.value = [...catalog.categories].sort((a, b) => a.order - b.order)
    const refreshedVehicle = currentVehicle && catalog.data.find(item => item.id === currentVehicle.id)
    if (refreshedVehicle) {
      tripStore.setChosenVehicle({ ...refreshedVehicle, selectable: currentVehicle.selectable, modelChoice: Boolean(refreshedVehicle.modelChoiceLabel) })
    } else if (currentVehicle) {
      tripStore.clearChosenVehicle()
      uni.showToast({ title: '所選車型已失效，請重新選擇', icon: 'none' })
      return
    }
    extras.value = [...catalog.extras].sort((a, b) => a.order - b.order)
    severeWeatherEnabled.value = catalog.severeWeatherEnabled
    syncManualExtras()
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
  await loadCombinationPreview()
})
const goBack = () => closeCachedPage('/pages/vehicles/select')
const showPromoToast = (title: string) => {
  uni.showToast({ title, icon: 'none', duration: 2000 })
}
const togglePromo = async () => {
  if (promoLoading.value) return
  promoLoading.value = true
  try {
    if (promoApplied.value) {
      tripStore.setCouponCode()
      await refreshQuote()
      combinationPreview.value = null
      showPromoToast('已取消優惠')
      return
    }
    const couponCode = combinationPreview.value?.promotion.couponCode
    if (!couponCode) {
      uni.showToast({ title: '目前沒有可使用的組合優惠', icon: 'none' })
      return
    }
    tripStore.setCouponCode(couponCode)
    if (!await refreshQuote() || !tripStore.selectedFareQuote) return
    const couponId = cashCoupon.value?.id
    const applied = Boolean(couponId && hasCombinationForQuote(tripStore.selectedFareQuote, couponId))
    if (!applied) {
      tripStore.setCouponCode()
      await refreshQuote()
      uni.showToast({ title: '目前沒有可使用的組合優惠', icon: 'none' })
      return
    }
    showPromoToast('優惠已使用，已扣減車資')
  } finally {
    promoLoading.value = false
  }
}
const toggleExtra = (id: string) => {
  const extra = extras.value.find(item => item.id === id)
  if (extra && isTriggerExtra(extra)) return
  const extraIds = selectedExtras.value.includes(id)
    ? selectedExtras.value.filter((extraId) => extraId !== id)
    : [...selectedExtras.value, id]
  tripStore.updateActiveDraft({ extras: extraIds })
  void refreshQuote()
}
const handleExtraTap = (extra: PublicVehicleExtra) => {
  if (isTriggerExtra(extra)) return
  toggleExtra(extra.id)
}
const goNext = async () => {
  if (!tripStore.chosenVehicle) {
    uni.showToast({ title: '請重新選擇車型', icon: 'none' })
    return
  }
  const requestedCouponCode = tripStore.activeDraft.couponCode
  const couponId = requestedCouponCode ? cashCoupon.value?.id : undefined
  if (!await refreshQuote(true) || !tripStore.selectedFareQuote ||
      (requestedCouponCode && (!couponId || !tripStore.selectedFareQuote.lines.some(line => line.type === 'DISCOUNT' && line.sourceId === couponId)))) {
    uni.showToast({ title: requestedCouponCode ? '優惠已失效，請重新選擇優惠' : '報價暫時無法取得', icon: 'none' })
    return
  }
  openCachedPage('/pages/vehicles/confirm')
}
</script>

<style scoped>
:global(html),:global(body),:global(#app){width:100%;min-width:0;height:100%;margin:0;overflow:hidden;background:#56657e}.page{position:fixed;top:0;left:0;width:430px;height:var(--mobile-height, 932px);overflow:hidden;background:#56657e;color:#fff;font-family:'Noto Sans TC',sans-serif;transform:scale(var(--mobile-scale, 1));transform-origin:top left}.header{position:absolute;z-index:3;top:0;left:0;width:430px;height:155px;overflow:hidden;border-radius:25px;background:#56657e;color:#fff}.back-button{position:absolute;top:53px;left:25px;width:28px;height:40px;display:flex;align-items:center;justify-content:center}.back-button image{width:16px;height:29px}.route-summary{position:absolute;top:56px;left:53px;width:324px;height:59px}.origin-icon{position:absolute;top:12px;left:69px;width:8px;height:14.517px}.origin-label{position:absolute;top:9px;left:94px;font-size:14px;font-weight:700;line-height:20px}.route-icon{position:absolute;top:4px;left:139px;width:30px;height:30px}.destination-icon{position:absolute;top:13px;left:186px;width:8px;height:11.978px}.destination-label{position:absolute;top:9px;left:214px;font-size:14px;font-weight:700;line-height:20px}.booking-time{position:absolute;top:39px;left:0;width:324px;text-align:center;font-size:14px;font-weight:100;line-height:20px;white-space:nowrap}.tabs{position:absolute;bottom:0;left:26px;width:378px;height:30px;display:flex;justify-content:space-between}.tab{position:relative;height:30px;font-size:14px;line-height:20px;white-space:nowrap}.tab.active{color:#1effaa;font-weight:700}.tab image{position:absolute;bottom:1px;left:0;width:32px;height:2px}.vehicle-tag{position:absolute;left:24px;top:165px;display:inline-flex;width:max-content;max-width:calc(100% - 48px);height:18px;padding:0 6px;box-sizing:border-box;align-items:center;border-radius:25px;background:#d9d9d9;color:#38434a;text-align:center;font-size:10px;font-weight:500;line-height:18px;white-space:nowrap}.selected-vehicle-card{position:absolute;z-index:3;top:193px;left:25px;width:380px;height:180px}.selected-vehicle-card :deep(.vehicle-card){margin:0}
.promo-card{position:absolute;z-index:2;top:306px;left:25px;width:380px;height:104px;overflow:hidden;border-radius:25px;background:#38434a;color:#fff}.promo-copy{position:absolute;left:27px;top:77px;font-size:12px;font-weight:500;white-space:nowrap}.promo-action{position:absolute;top:74px;right:25px;height:26px;padding:5px 10px;box-sizing:border-box;border:1px solid #1effaa;border-radius:10px;color:#1effaa;font-size:10px;line-height:14px}.promo-action.used-action{border-color:#f95c5c;color:#f95c5c}.extras{position:absolute;top:423px;left:26px;width:351px;height:360px}.extras.without-promo{top:386px;height:397px}.extras-title{width:220px;height:30px;display:flex;align-items:center;gap:10px;color:#fff;font-size:14px;font-weight:300;white-space:nowrap}.extras-title image{width:30px;height:30px}.extra-row{position:relative;left:29px;width:322px;height:20px;display:flex;align-items:center;gap:10px;margin-top:18px;font-size:16px;font-weight:500;white-space:nowrap}.extras-title+.extra-row{margin-top:24px}.extra-row image{width:18px;height:18px}.extra-price{position:absolute;left:260px;color:#1effaa}.next-button{position:absolute;left:80px;top:826px;width:270px;height:48px;border-radius:25px;background:#1effaa;color:#38434a;text-align:center;line-height:48px;font-size:16px;font-weight:900}@media (max-width:599px){.page{top:0;left:0;height:var(--mobile-height,100dvh);border-radius:0;transform:scale(var(--mobile-scale,1));transform-origin:top left}}
</style>
