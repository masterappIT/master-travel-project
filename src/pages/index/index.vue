<template>
  <view v-show="activePagePath === '/pages/index/index'" class="page" :style="pageStyle">
    <view v-if="rideMode === 'cross-border'" class="page-content">
      <view class="canvas">
        <!-- #ifndef APP-PLUS -->
        <HomeMap v-if="activePagePath === '/pages/index/index'" map-id="home-main-map" :latitude="mapLatitude" :longitude="mapLongitude" :scale="mapScale" :markers="mapMarkers" :polyline="mapPolyline" :center-trigger="mapCenterTrigger" :booking-picker-open="bookingTimePicker" :pickup-label="origin" :destination-label="destination" :route-summary="routeSummary" />
        <!-- #endif -->
        <HomeHeader :location-label="locationLabel" />
        <HomeTravelModeSwitch :mode="rideMode" @update:mode="switchRideMode" />
        <!-- #ifndef APP-PLUS -->
        <HomeMapActions @location="handleMapLocation" />
        <!-- #endif -->
        <HomeRoutePanel
          :mode="travelMode"
          :origin="origin"
          :destination="destination"
          :departure-time="departureTime"
          :flight-number="flightNumber"
          @update:mode="switchTravelMode"
          @origin="chooseOrigin"
          @destination="chooseDestination"
          @departure-time="chooseDepartureTime"
          @update:flight-number="handleFlightNumberInput"
          @flight-confirm="handleFlightConfirm"
          @flight-blur="handleFlightBlur"
        />
        <view v-if="origin || destination" class="accessible-values">{{ [origin, destination].filter(Boolean).join(' · ') }}</view>
        <AddressPicker
          v-if="addressPicker"
          :selecting="addressPicker"
          :location-label="locationLabel"
          :detailed-address="detailedAddress"
          :initial-selection="addressPicker === 'origin' ? originSelection : destinationSelection"
          :can-use-current="addressPickerContext === 'business' || addressPicker === 'origin' || (!!origin && !originIsCurrent)"
          @close="addressPicker = null"
          @select="selectAddress"
          @locate="locateCurrentAddress"
          @use-current="useCurrentLocation(true)"
        />
        <!-- #ifdef H5 -->
        <Teleport to="body">
           <BookingTimePicker v-if="bookingTimePicker" @close="bookingTimePicker = false" @confirm="confirmDepartureTime" />
        </Teleport>
        <!-- #endif -->
        <!-- #ifndef H5 -->
        <BookingTimePicker v-if="bookingTimePicker" @close="bookingTimePicker = false" @confirm="confirmDepartureTime" />
        <!-- #endif -->
       <view v-if="flightCandidates.length" class="flight-modal" role="dialog" aria-label="航班選擇">
         <view class="flight-modal-mask" @tap="closeFlightCandidates" />
         <view class="flight-modal-card">
           <view class="flight-modal-title">選擇航班</view>
           <view class="flight-modal-number">{{ flightNumber }}</view>
           <view class="flight-modal-question">找到多筆航班資料，請選擇正確的行程</view>
           <view class="flight-candidate-list">
             <button v-for="(candidate, index) in flightCandidates" :key="`${candidate.direction}-${candidate.scheduledTime}-${index}`" class="flight-candidate" @tap="selectFlightCandidate(candidate)">
               <view class="flight-candidate-main">
                 <text class="flight-candidate-route">{{ candidate.origin.iata }} → {{ candidate.destination.iata }}</text>
                 <text class="flight-candidate-time">{{ candidate.scheduledTime || '時間待定' }}</text>
               </view>
               <view class="flight-candidate-detail">
                 <text>{{ candidate.direction === 'arrival' ? '抵港香港' : '離港香港' }}</text>
                 <text>{{ candidate.status || '航班資料已更新' }}</text>
               </view>
             </button>
           </view>
           <text class="flight-modal-cancel" @tap="closeFlightCandidates">返回修改</text>
         </view>
       </view>
       <view v-if="flightLookup" class="flight-modal" role="dialog" aria-label="航班資訊確認">
         <view class="flight-modal-mask" @tap="closeFlightLookup" />
         <view class="flight-modal-card">
           <view class="flight-modal-title">航班資訊</view>
           <view class="flight-modal-number">{{ flightLookup.flightNumber }}</view>
           <view class="flight-modal-status">{{ flightLookup.status || '航班資料已更新' }} · {{ flightLookup.scheduledTime }}</view>
           <view class="flight-modal-route">
             <view class="flight-modal-airport">
               <text class="flight-modal-label">出發地</text>
               <text class="flight-modal-iata">{{ flightLookup.origin.iata }}</text>
               <text>{{ airportSummary(flightLookup.origin) }}</text>
             </view>
             <text class="flight-modal-arrow">→</text>
             <view class="flight-modal-airport flight-modal-airport--right">
               <text class="flight-modal-label">到達地</text>
               <text class="flight-modal-iata">{{ flightLookup.destination.iata }}</text>
               <text>{{ airportSummary(flightLookup.destination) }}</text>
             </view>
           </view>
           <view class="flight-modal-question">請選擇接送方向</view>
           <view v-if="!canGoToAirport" class="flight-modal-notice">航班出發機場不在廣東省、香港或澳門服務範圍，只能選擇從航班到達機場出發</view>
           <view class="flight-modal-actions">
             <button class="flight-modal-action" :class="{ 'flight-modal-action--disabled': !canGoToAirport }" :disabled="!canGoToAirport" @tap="confirmFlightDirection('to-airport')">去機場</button>
             <button class="flight-modal-action flight-modal-action--primary" @tap="confirmFlightDirection('from-airport')">從機場出發</button>
           </view>
           <text class="flight-modal-cancel" @tap="closeFlightLookup">返回修改</text>
         </view>
       </view>
       <!-- #ifdef H5 || APP-PLUS || MP-WEIXIN -->
       <view v-if="airportModeHintVisible" class="airport-hint-modal" role="dialog" aria-label="接送機功能提示">
         <view class="airport-hint-mask" @tap="closeAirportModeHint" />
         <view class="airport-hint-card">
           <view class="airport-hint-icon">✈</view>
           <view class="airport-hint-title">接送機服務</view>
           <view class="airport-hint-content">輸入航班號後，系統會自動定位出發機場、到達機場及航班時間。</view>
           <button class="airport-hint-button" @tap="closeAirportModeHint">知道了</button>
         </view>
       </view>
       <!-- #endif -->
     </view>
    </view>
    <template v-else>
      <HomeTravelModeSwitch :mode="rideMode" layout="business" @update:mode="switchRideMode" />
      <BusinessCharterPanel
        :origin-region="businessOrigin.region"
        :origin-place="businessOrigin.place"
        :destination-region="businessDestination.region"
        :destination-place="businessDestination.place"
        @origin="chooseBusinessOrigin"
        @destination="chooseBusinessDestination"
        @date-time="chooseDepartureTime"
        @duration="showComingSoon('用車時間選擇')"
        @book="showComingSoon('商務包車預約')"
        @promo="showComingSoon('優惠預約')"
      />
      <AddressPicker
        v-if="addressPicker"
        :selecting="addressPicker"
        :location-label="locationLabel"
        :detailed-address="detailedAddress"
        :initial-selection="addressPicker === 'origin' ? originSelection : destinationSelection"
        @close="addressPicker = null"
        @select="selectAddress"
        @locate="locateCurrentAddress"
        @use-current="useCurrentLocation(true)"
      />
      <!-- #ifdef H5 -->
      <Teleport to="body">
        <BookingTimePicker v-if="bookingTimePicker" @close="bookingTimePicker = false" @confirm="confirmDepartureTime" />
      </Teleport>
      <!-- #endif -->
      <!-- #ifndef H5 -->
      <BookingTimePicker v-if="bookingTimePicker" @close="bookingTimePicker = false" @confirm="confirmDepartureTime" />
      <!-- #endif -->
    </template>
    <view class="nav-layer">
      <HomeBottomNav @services="openSupport" @trips="openTrips" />
    </view>
  </view>
  <!-- #ifdef MP-WEIXIN || MP-TOUTIAO -->
  <TripsPage v-if="activePagePath === '/pages/trips/trips'" />
  <ProfilePendingTripPage v-if="activePagePath === '/pages/trips/pending'" :key="cachedPageUrl" />
  <MembershipPage v-if="activePagePath === '/pages/membership/membership'" />
  <MileagePage v-if="activePagePath === '/pages/mileage/mileage'" />
  <InvitePage v-if="activePagePath === '/pages/invite/invite'" />
  <MessagesPage v-if="activePagePath === '/pages/messages/messages'" />
  <MessageDetailPage v-if="activePagePath === '/pages/messages/detail'" />
  <OrdersPage v-if="activePagePath === '/pages/orders/orders'" />
  <OrderDetailPage v-if="activePagePath === '/pages/orders/detail'" :key="cachedPageUrl" />
  <CompletedOrderDetailPage v-if="activePagePath === '/pages/orders/completed-detail'" :key="cachedPageUrl" />
   <TravelingOrderDetailPage v-if="activePagePath === '/pages/orders/traveling-detail'" :key="cachedPageUrl" />
  <PendingOrderDetailPage v-if="activePagePath === '/pages/orders/pending-detail'" :key="cachedPageUrl" />
  <CancelledOrderDetailPage v-if="activePagePath === '/pages/orders/cancelled-detail'" :key="cachedPageUrl" />
  <TripsDetailPage v-if="activePagePath === '/pages/trips/detail'" :key="cachedPageUrl" />
  <VehicleSelectPage v-if="activePagePath === '/pages/vehicles/select'" />
  <VehicleSelectedPage v-if="activePagePath === '/pages/vehicles/selected'" />
  <VehicleConfirmPage v-if="activePagePath === '/pages/vehicles/confirm'" />
  <BookingSuccessPage v-if="activePagePath === '/pages/vehicles/booking-success'" />
  <TripWaitingPage v-if="activePagePath === '/pages/vehicles/trip-waiting'" :key="cachedPageUrl" />
  <TripProgressPage v-if="activePagePath === '/pages/vehicles/trip-progress'" :key="cachedPageUrl" />
  <TripCompletePage v-if="activePagePath === '/pages/vehicles/trip-complete'" :key="cachedPageUrl" />
  <AccountPage v-if="activePagePath === '/pages/account/account'" />
  <SettingsPage v-if="activePagePath === '/pages/settings/settings'" />
  <WalletPage v-if="activePagePath === '/pages/wallet/wallet'" />
  <TopUpPage v-if="activePagePath === '/pages/top-up/top-up'" />
  <TopUpDetailPage v-if="activePagePath === '/pages/top-up/detail/detail'" :key="cachedPageUrl" />
  <VoucherClaimPage v-if="activePagePath === '/pages/voucher/claim'" />
  <WithdrawPage v-if="activePagePath === '/pages/withdraw/withdraw'" />
  <WithdrawDetailPage v-if="activePagePath === '/pages/withdraw/detail'" />
  <AlipayWithdrawPage v-if="activePagePath === '/pages/withdraw/alipay'" />
  <AlipayWithdrawDetailPage v-if="activePagePath === '/pages/withdraw/alipay-detail'" />
  <PaymentSettingsPage v-if="activePagePath === '/pages/payment-settings/payment-settings'" />
  <TransactionsPage v-if="activePagePath === '/pages/transactions/transactions'" />
  <ExpenseDetailPage v-if="activePagePath === '/pages/transactions/expense-detail'" />
  <RefundPage v-if="activePagePath === '/pages/refund/detail'" />
  <BankCardPage v-if="activePagePath === '/pages/bank-card/bank-card'" />
  <BankCardAccountPage v-if="activePagePath === '/pages/bank-card/account'" />
  <BankCardListPage v-if="activePagePath === '/pages/bank-card/list'" />
  <BankCardDetailPage v-if="activePagePath === '/pages/bank-card/detail'" />
  <CommonDataPage v-if="activePagePath === '/pages/common-data/common-data'" />
  <CouponsPage v-if="activePagePath === '/pages/coupons/coupons'" :key="cachedPageUrl" />
  <CouponDetailPage v-if="activePagePath === '/pages/coupons/detail'" :key="cachedPageUrl" />
  <ComplaintsPage v-if="activePagePath === '/pages/complaints/complaints'" />
  <SupportChatPage v-if="activePagePath === '/pages/support/chat'" />
  <!-- #endif -->
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useTripStore } from '../../stores/trip'
// #ifdef H5
import { useH5ResponsiveCanvas } from '../../composables/useH5ResponsiveCanvas'
// #endif
// #ifdef MP-WEIXIN || MP-TOUTIAO
import { useResponsiveCanvas } from '../../composables/useResponsiveCanvas'
// #endif
import HomeHeader from '../../components/home/HomeHeader.vue'
import HomeTravelModeSwitch from '../../components/home/HomeTravelModeSwitch.vue'
// #ifndef APP-PLUS
import HomeMap from '../../components/home/HomeMap.vue'
import HomeMapActions from '../../components/home/HomeMapActions.vue'
// #endif
import HomeRoutePanel from '../../components/home/HomeRoutePanel.vue'
import BusinessCharterPanel from '../../components/home/BusinessCharterPanel.vue'
import HomeBottomNav from '../../components/home/HomeBottomNav.vue'
import AddressPicker from '../../components/home/AddressPicker.vue'
import BookingTimePicker from '../../components/home/BookingTimePicker.vue'
import { activateEmbeddedPageHost, cachedPagePath, openCachedPage } from '../../utils/navigation'
import { planDrivingRoute, reverseGeocode, lookupFlight, type Coordinate, type FlightDirection, type FlightLookupResult } from '../../services/api'
import { findLocalRegion } from '../../utils/localRegions'

// #ifdef H5
const { responsiveStyle } = useH5ResponsiveCanvas()
// #endif
// #ifdef MP-WEIXIN || MP-TOUTIAO
const { responsiveStyle } = useResponsiveCanvas()
// #endif
const pageStyle = computed(() => {
  // #ifdef H5 || MP-WEIXIN || MP-TOUTIAO
  return responsiveStyle.value
  // #endif
  return {}
})
// #ifdef MP-WEIXIN || MP-TOUTIAO
import TripsPage from '../trips/trips.vue'
import ProfilePendingTripPage from '../trips/pending.vue'
import MembershipPage from '../membership/membership.vue'
import MileagePage from '../mileage/mileage.vue'
import InvitePage from '../invite/invite.vue'
import MessagesPage from '../messages/messages.vue'
import MessageDetailPage from '../messages/detail.vue'
import OrdersPage from '../orders/orders.vue'
import OrderDetailPage from '../orders/detail.vue'
import CompletedOrderDetailPage from '../orders/completed-detail.vue'
import TravelingOrderDetailPage from '../orders/traveling-detail.vue'
import PendingOrderDetailPage from '../orders/pending-detail.vue'
import CancelledOrderDetailPage from '../orders/cancelled-detail.vue'
import TripsDetailPage from '../trips/detail.vue'
import VehicleSelectPage from '../vehicles/select.vue'
import VehicleSelectedPage from '../vehicles/selected.vue'
import VehicleConfirmPage from '../vehicles/confirm.vue'
import BookingSuccessPage from '../vehicles/booking-success.vue'
import TripWaitingPage from '../vehicles/trip-waiting.vue'
import TripProgressPage from '../vehicles/trip-progress.vue'
import TripCompletePage from '../vehicles/trip-complete.vue'
import AccountPage from '../account/account.vue'
import SettingsPage from '../settings/settings.vue'
import WalletPage from '../wallet/wallet.vue'
import TopUpPage from '../top-up/top-up.vue'
import TopUpDetailPage from '../top-up/detail/detail.vue'
import VoucherClaimPage from '../voucher/claim.vue'
import WithdrawPage from '../withdraw/withdraw.vue'
import WithdrawDetailPage from '../withdraw/detail.vue'
import AlipayWithdrawPage from '../withdraw/alipay.vue'
import AlipayWithdrawDetailPage from '../withdraw/alipay-detail.vue'
import PaymentSettingsPage from '../payment-settings/payment-settings.vue'
import TransactionsPage from '../transactions/transactions.vue'
import ExpenseDetailPage from '../transactions/expense-detail.vue'
import RefundPage from '../refund/detail.vue'
import BankCardPage from '../bank-card/bank-card.vue'
import BankCardAccountPage from '../bank-card/account.vue'
import BankCardListPage from '../bank-card/list.vue'
import BankCardDetailPage from '../bank-card/detail.vue'
import CommonDataPage from '../common-data/common-data.vue'
import CouponsPage from '../coupons/coupons.vue'
import CouponDetailPage from '../coupons/detail.vue'
import ComplaintsPage from '../complaints/complaints.vue'
import SupportChatPage from '../support/chat.vue'
// #endif

type RideMode = 'cross-border' | 'business'
type TravelMode = 'cross-border' | 'airport'

const activePagePath = cachedPagePath
// #ifdef MP-WEIXIN || MP-TOUTIAO
activateEmbeddedPageHost()
// #endif

const tripStore = useTripStore()
const rideMode = ref<RideMode>('cross-border')
const travelMode = ref<TravelMode>('cross-border')
const origin = ref('')
const originIsCurrent = ref(false)
const destination = ref('')
interface BusinessLocation { region: string; place: string }
interface AddressSelection { region: '大陸' | '香港' | '澳門' | null; name: string; address: string; displayAddress?: string; latitude?: number; longitude?: number; city?: string; district?: string; landmark?: string }
type RouteSelection = AddressSelection
const originSelection = ref<RouteSelection | null>(null)
const destinationSelection = ref<RouteSelection | null>(null)
const selectedCoordinates = ref<{ origin?: Coordinate; destination?: Coordinate }>({})
type MapMarker = Coordinate & { id: number; title?: string; iconPath?: string; width?: number; height?: number }
const mapMarkers = ref<MapMarker[]>([])
const mapPolyline = ref<Array<{ points: Coordinate[]; color: string; width: number; arrowLine: boolean }>>([])
const routeSummary = ref('')
const businessOrigin = ref<BusinessLocation>({ region: '香港', place: '香港國際機場' })
const businessDestination = ref<BusinessLocation>({ region: '大陸', place: '' })
const initialBusinessOrigin: BusinessLocation = { region: '香港', place: '香港國際機場' }
const initialBusinessDestination: BusinessLocation = { region: '大陸', place: '' }
const departureTime = ref('')
const flightNumber = ref('')
const flightLookup = ref<FlightLookupResult | null>(null)
const flightCandidates = ref<FlightLookupResult[]>([])
let flightLookupRequestId = 0
const mapLatitude = ref(22.3046)
const mapLongitude = ref(114.1619)
const mapScale = ref(13)
const mapCenterTrigger = ref(0)
const locationLabel = ref('香港 · 油尖旺區')
const detailedAddress = ref('香港九龍站附近')
const bookingTimePicker = ref(false)
const airportModeHintVisible = ref(false)
let hasShown = false
const switchRideMode = (mode: RideMode) => {
  if (mode === rideMode.value) return

  tripStore.switchServiceMode(mode === 'business' ? 'business-charter' : 'cross-border')
  addressPicker.value = null
  bookingTimePicker.value = false

  if (mode === 'business') {
    origin.value = ''
    originSelection.value = null
    originIsCurrent.value = false
    destination.value = ''
    destinationSelection.value = null
    selectedCoordinates.value.origin = undefined
    selectedCoordinates.value.destination = undefined
    mapMarkers.value = []
    mapPolyline.value = []
    routeSummary.value = ''
    departureTime.value = ''
    flightNumber.value = ''
    travelMode.value = 'cross-border'
  } else {
    originSelection.value = null
    destinationSelection.value = null
    businessOrigin.value = { ...initialBusinessOrigin }
    businessDestination.value = { ...initialBusinessDestination }
  }

  rideMode.value = mode
}

onShow(() => {
  if (hasShown) {
    rideMode.value = 'cross-border'
  } else {
    void useCurrentLocation(false, true)
  }
  hasShown = true
})

const addressPicker = ref<'origin' | 'destination' | null>(null)
const addressPickerContext = ref<'cross-border' | 'business'>('cross-border')
const chooseOrigin = () => { addressPickerContext.value = 'cross-border'; addressPicker.value = 'origin' }
const chooseDestination = () => { addressPickerContext.value = 'cross-border'; addressPicker.value = 'destination' }
const chooseBusinessOrigin = () => { addressPickerContext.value = 'business'; addressPicker.value = 'origin' }
const chooseBusinessDestination = () => { addressPickerContext.value = 'business'; addressPicker.value = 'destination' }
const setRouteSelection = (target: 'origin' | 'destination', selection: RouteSelection | null) => {
  if (target === 'origin') originSelection.value = selection
  if (target === 'destination') destinationSelection.value = selection
}
const routeAddressFields = () => ({
  originRegion: originSelection.value?.region || undefined,
  originCity: originSelection.value?.city || undefined,
  originDistrict: originSelection.value?.district || undefined,
  originPlace: originSelection.value?.landmark || originSelection.value?.name || undefined,
  originDetail: originSelection.value?.displayAddress || originSelection.value?.address || undefined,
  destinationRegion: destinationSelection.value?.region || undefined,
  destinationCity: destinationSelection.value?.city || undefined,
  destinationDistrict: destinationSelection.value?.district || undefined,
  destinationPlace: destinationSelection.value?.landmark || destinationSelection.value?.name || undefined,
  destinationDetail: destinationSelection.value?.displayAddress || destinationSelection.value?.address || undefined
})
const parseBusinessLocation = (value: string): BusinessLocation => {
  const [region, ...placeParts] = value.split(' · ')
  return { region: placeParts.length ? region : '', place: placeParts.length ? placeParts.join(' · ') : region }
}
const formatBusinessLocation = (selection: AddressSelection): BusinessLocation => {
  const parts = selection.address.split('-').map(part => part.trim()).filter(Boolean)
  const cityIndex = parts.findIndex(part => part.endsWith('市') || part.endsWith('特別行政區'))
  const rawCity = cityIndex >= 0 ? parts[cityIndex] : selection.region || ''
  const region = rawCity === '香港特別行政區'
    ? '香港'
    : rawCity === '澳門特別行政區'
      ? '澳門'
      : rawCity
  const details = cityIndex >= 0 ? parts.slice(cityIndex + 1) : parts.slice(1)
  return { region, place: details.join(' · ') || selection.name }
}
const formatRouteAddress = (address: string, region?: AddressSelection['region'], city = '', district = '', landmark = '') => {
  const normalized = address.replace(/-/g, '').replace(/\s+/g, '')
  const locationText = `${city}${normalized}`
  if (region === '香港' || /香港/.test(locationText)) {
    const details = normalized.replace(/^香港(?:特別行政區|特别行政区)?/, '')
    const area = district.replace(/^香港(?:特別行政區|特别行政区)?/, '') || details.match(/^.+?區/)?.[0] || ''
    if (landmark) return `香港 · ${area}${landmark}`
    return `香港 · ${details || area || '目前位置'}`
  }
  if (region === '澳門' || /澳(?:門|门)/.test(locationText)) {
    const details = normalized.replace(/^澳(?:門|门)(?:特別行政區|特别行政区)?/, '')
    const area = district.replace(/^澳(?:門|门)(?:特別行政區|特别行政区)?/, '') || details.match(/^.+?(?:堂區|堂区|澳門半島|澳门半岛|路氹城)/)?.[0] || ''
    if (landmark) return `澳門 · ${area}${landmark}`
    return `澳門 · ${details || area || '目前位置'}`
  }
  const cityWithSuffix = city || normalized.match(/[^省自治區自治区]+市/)?.[0] || ''
  const mainlandCity = cityWithSuffix.replace(/市$/, '')
  const mainlandDistrict = district || normalized.match(/[^省市]+(?:區|区|縣|县)/)?.[0] || ''
  if (landmark) return `${mainlandCity} · ${mainlandDistrict}${landmark}`
  const cityStart = cityWithSuffix && normalized.includes(cityWithSuffix) ? normalized.slice(normalized.indexOf(cityWithSuffix) + cityWithSuffix.length) : normalized
  const roadAddress = cityStart.replace(new RegExp(`^${mainlandDistrict}`), '')
  return `${mainlandCity} · ${mainlandDistrict}${roadAddress}`
}
const formatSelectedAddressSummary = (selection: AddressSelection) => {
  const normalized = selection.address.replace(/\s+/g, '').replace(/[·/]/g, '-')
  const parts = normalized.split('-').map(part => part.trim()).filter(Boolean)
  const city = (selection.city?.trim() || parts.find(part => part.endsWith('市')) || '')
    .replace(/特別行政區$|特别行政区$/, '')
  const region = selection.region === '香港'
    ? '香港'
    : selection.region === '澳門'
      ? '澳門'
      : city.replace(/市$/, '')
  const district = (selection.district?.trim()
    || parts.find(part => /(?:區|区|堂區|堂区|縣|县)$/.test(part) && part !== city)
    || '').replace(/区/g, '區').replace(/县/g, '縣').replace(/堂区/g, '堂區')
  const placeName = selection.name.trim().replace(/\s+/g, '')
  const location = `${district}${placeName}`.trim()
  return [region, location].filter(Boolean).join(' · ')
}
const updateRoute = async () => {
  const { origin: originCoordinate, destination: destinationCoordinate } = selectedCoordinates.value
  if (!originCoordinate || !destinationCoordinate) return
  try {
    const route = await planDrivingRoute(originCoordinate, destinationCoordinate)
    mapMarkers.value = [
      { id: 1, ...originCoordinate, title: '出發地', iconPath: '/static/home/route/origin.svg', width: 10, height: 18 },
      { id: 2, ...destinationCoordinate, title: '目的地', iconPath: '/static/home/route/destination.svg', width: 10, height: 15 }
    ]
    mapPolyline.value = [{ points: route.points, color: '#285CFC', width: 6, arrowLine: true }]
      const distanceKm = route.distance / 1000
    const durationMinutes = Math.max(1, Math.round(route.duration / 60))
    routeSummary.value = `共 ${distanceKm < 10 ? distanceKm.toFixed(1) : Math.round(distanceKm)} 公里 · 約 ${durationMinutes >= 60 ? `${Math.floor(durationMinutes / 60)} 小時${durationMinutes % 60 ? ` ${durationMinutes % 60} 分鐘` : ''}` : `${durationMinutes} 分鐘`}`
    tripStore.setRoute(origin.value, destination.value, {
      ...routeAddressFields(),
      originLatitude: originCoordinate.latitude,
      originLongitude: originCoordinate.longitude,
      destinationLatitude: destinationCoordinate.latitude,
      destinationLongitude: destinationCoordinate.longitude
    })
    tripStore.setRouteDistance(route.distance, route.duration)
  } catch {
    mapPolyline.value = []
    routeSummary.value = ''
    tripStore.clearRouteDistance()
    uni.showToast({ title: '路線規劃失敗，請稍後再試', icon: 'none' })
  }
}
const selectAddress = (value: string, selection?: AddressSelection) => {
  const target = addressPicker.value
  if (addressPickerContext.value === 'business') {
    const location = selection ? formatBusinessLocation(selection) : parseBusinessLocation(value)
    if (target === 'origin') businessOrigin.value = location
    if (target === 'destination') businessDestination.value = location
  } else {
    const formattedValue = selection ? formatSelectedAddressSummary(selection) : value
    if (target === 'origin') {
      origin.value = formattedValue
      originSelection.value = selection ? { ...selection } : null
      originIsCurrent.value = false
    }
    if (target === 'destination') {
      destination.value = formattedValue
      destinationSelection.value = selection ? { ...selection } : null
    }
    tripStore.setRoute(origin.value, destination.value, {
      ...routeAddressFields()
    })
  }
  if (target && selection?.latitude !== undefined && selection.longitude !== undefined) {
    selectedCoordinates.value[target] = { latitude: selection.latitude, longitude: selection.longitude }
    void updateRoute()
  }
  addressPicker.value = null
}
const locateCurrentAddress = () => useCurrentLocation(false)
const formatCurrentBusinessLocation = (): BusinessLocation => {
  const [city, ...districtParts] = locationLabel.value.replace(/澳门/g, '澳門').split(' · ')
  const district = districtParts.join(' · ')
  const address = detailedAddress.value.replace(/澳门/g, '澳門').replace(/^澳門(?:特別行政區)?[-·\s]*/, '')
  const placeParts = [district, address].filter((part, index, values) => part && values.indexOf(part) === index)
  return { region: city || '目前位置', place: placeParts.join(' · ') || '目前位置' }
}
const selectCurrentLocation = () => {
  if (addressPickerContext.value === 'business') {
    const location = formatCurrentBusinessLocation()
    if (addressPicker.value === 'origin') businessOrigin.value = location
    if (addressPicker.value === 'destination') businessDestination.value = location
  } else {
    const currentAddress = formatRouteAddress(
      detailedAddress.value,
      locationLabel.value.startsWith('香港') ? '香港' : locationLabel.value.startsWith('澳門') ? '澳門' : '大陸',
      locationLabel.value.split(' · ')[0]
    )
    if (addressPicker.value === 'origin') {
      origin.value = currentAddress
      originIsCurrent.value = true
    }
    if (addressPicker.value === 'destination') destination.value = currentAddress
  }
  if (addressPickerContext.value === 'cross-border') {
    tripStore.setRoute(origin.value, destination.value)
    if (selectedCoordinates.value.origin && selectedCoordinates.value.destination) void updateRoute()
  }
  addressPicker.value = null
}
const handleFlightNumberInput = (value: string) => {
  flightNumber.value = value
  flightLookup.value = null
  flightCandidates.value = []
  flightLookupRequestId += 1
}
const handleFlightConfirm = () => {
  uni.hideKeyboard()
  void lookupFlightForDate(flightNumber.value)
}
const handleFlightBlur = () => {
  uni.hideKeyboard()
}
const flightLookupDate = () => {
  if (departureTime.value) return departureTime.value.slice(0, 10)
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
const lookupFlightForDate = async (value: string, direction?: FlightDirection) => {
  const normalizedFlightNumber = value.replace(/\s+/g, '').toUpperCase()
  if (!/^[A-Z0-9]{2,8}$/.test(normalizedFlightNumber)) {
    uni.showToast({ title: '請輸入正確的航班號', icon: 'none' })
    return
  }
  const date = flightLookupDate()
  const requestId = ++flightLookupRequestId
  uni.showLoading({ title: '查詢航班中', mask: true })
  try {
    const result = await lookupFlight(normalizedFlightNumber, date, direction)
    if (requestId !== flightLookupRequestId || normalizedFlightNumber !== flightNumber.value) return
    if ('matches' in result) {
      flightCandidates.value = result.matches
      flightLookup.value = null
      return
    }
    flightCandidates.value = []
    flightLookup.value = result
    if (result.scheduledTime) departureTime.value = `${date}T${result.scheduledTime}:00`
  } catch (error) {
    if (requestId !== flightLookupRequestId || normalizedFlightNumber !== flightNumber.value) return
    flightLookup.value = null
    flightCandidates.value = []
    uni.showToast({ title: error instanceof Error ? error.message : '航班資料暫時無法取得', icon: 'none' })
  } finally {
    if (requestId === flightLookupRequestId) uni.hideLoading()
  }
}
const closeFlightCandidates = () => { flightCandidates.value = [] }
const selectFlightCandidate = (candidate: FlightLookupResult) => {
  flightCandidates.value = []
  flightLookup.value = candidate
  if (candidate.scheduledTime) departureTime.value = `${flightLookupDate()}T${candidate.scheduledTime}:00`
}
const chooseDepartureTime = () => { bookingTimePicker.value = true }
const airportDisplayMetadata: Record<string, { city: string; name: string }> = {
  PKX: { city: '北京', name: '北京大興國際機場' },
  HKG: { city: '香港', name: '香港國際機場' },
  CAN: { city: '廣州', name: '廣州白雲國際機場' },
  SZX: { city: '深圳', name: '深圳寶安國際機場' },
  MFM: { city: '澳門', name: '澳門國際機場' }
}
const airportDisplay = (airport: FlightLookupResult['origin']) => {
  const fallback = airportDisplayMetadata[airport.iata]
  return {
    city: airport.city === airport.iata ? (fallback?.city || airport.city) : airport.city,
    name: airport.name === airport.iata ? (fallback?.name || airport.name) : airport.name
  }
}
const airportSummary = (airport: FlightLookupResult['origin']) => {
  const display = airportDisplay(airport)
  return `${display.city} · ${display.name}`
}
const applyFlightLookup = (result: FlightLookupResult) => {
  const airportSelection = (airport: FlightLookupResult['origin']): AddressSelection => {
    const detectedRegion = airport.latitude !== null && airport.longitude !== null
      ? findLocalRegion(airport.latitude, airport.longitude)?.region
      : undefined
    const localRegion: AddressSelection['region'] = detectedRegion === '香港'
      ? '香港'
      : detectedRegion === '澳門'
        ? '澳門'
        : detectedRegion === '中國內地'
          ? '大陸'
          : null
    return {
      region: localRegion as AddressSelection['region'],
      name: airport.name === airport.iata ? (airportDisplayMetadata[airport.iata]?.name || airport.name) : airport.name,
      address: airportSummary(airport),
      city: airport.city === airport.iata ? (airportDisplayMetadata[airport.iata]?.city || airport.city) : airport.city,
      latitude: airport.latitude ?? undefined,
      longitude: airport.longitude ?? undefined
    }
  }
  const nextOrigin = airportSelection(result.origin)
  const nextDestination = airportSelection(result.destination)
  originSelection.value = nextOrigin
  destinationSelection.value = nextDestination
  origin.value = `${nextOrigin.city} · ${nextOrigin.name}`
  destination.value = `${nextDestination.city} · ${nextDestination.name}`
  selectedCoordinates.value.origin = nextOrigin.latitude !== undefined && nextOrigin.longitude !== undefined ? { latitude: nextOrigin.latitude, longitude: nextOrigin.longitude } : undefined
  selectedCoordinates.value.destination = nextDestination.latitude !== undefined && nextDestination.longitude !== undefined ? { latitude: nextDestination.latitude, longitude: nextDestination.longitude } : undefined
  tripStore.setRoute(origin.value, destination.value, {
    ...routeAddressFields(),
    originLatitude: nextOrigin.latitude,
    originLongitude: nextOrigin.longitude,
    destinationLatitude: nextDestination.latitude,
    destinationLongitude: nextDestination.longitude
  })
  tripStore.updateActiveDraft({ route: { ...tripStore.activeDraft.route, flightNumber: result.flightNumber, flightDirection: result.direction, flightStatus: result.status, originAirportIata: result.origin.iata, destinationAirportIata: result.destination.iata } })
}
const canGoToAirport = computed(() => {
  const departureAirport = flightLookup.value?.origin
  if (!departureAirport || departureAirport.latitude === null || departureAirport.longitude === null) return false
  return Boolean(findLocalRegion(departureAirport.latitude, departureAirport.longitude))
})
const showAirportModeHint = () => {
  // #ifdef H5 || APP-PLUS || MP-WEIXIN
  airportModeHintVisible.value = true
  // #endif
}

const switchTravelMode = (mode: TravelMode) => {
  travelMode.value = mode
  if (mode === 'airport') {
    showAirportModeHint()
  }
}

const closeAirportModeHint = () => {
  airportModeHintVisible.value = false
}

const closeFlightLookup = () => { flightLookup.value = null; flightCandidates.value = [] }
const confirmFlightDirection = (direction: 'to-airport' | 'from-airport') => {
  if (!flightLookup.value) return
  if (direction === 'to-airport' && !canGoToAirport.value) {
    uni.showToast({ title: '目前出發地不在服務範圍，只能選擇從機場出發', icon: 'none' })
    return
  }
  const result = flightLookup.value
  const airport = direction === 'to-airport' ? result.origin : result.destination
  const selection = (value: FlightLookupResult['origin']): AddressSelection => {
    const detectedRegion = value.latitude !== null && value.longitude !== null ? findLocalRegion(value.latitude, value.longitude)?.region : undefined
    const region: AddressSelection['region'] = detectedRegion === '香港' ? '香港' : detectedRegion === '澳門' ? '澳門' : detectedRegion === '中國內地' ? '大陸' : null
    return { region, name: value.name === value.iata ? (airportDisplayMetadata[value.iata]?.name || value.name) : value.name, address: airportSummary(value), city: value.city === value.iata ? (airportDisplayMetadata[value.iata]?.city || value.city) : value.city, latitude: value.latitude ?? undefined, longitude: value.longitude ?? undefined }
  }
  const airportValue = selection(airport)
  if (direction === 'to-airport') {
    destinationSelection.value = airportValue
    destination.value = airportValue.address
    selectedCoordinates.value.destination = airportValue.latitude !== undefined && airportValue.longitude !== undefined ? { latitude: airportValue.latitude, longitude: airportValue.longitude } : undefined
    originSelection.value = null
    origin.value = ''
    originIsCurrent.value = false
    departureTime.value = ''
    selectedCoordinates.value.origin = undefined
  } else {
    originSelection.value = airportValue
    origin.value = airportValue.address
    destinationSelection.value = null
    destination.value = ''
    departureTime.value = ''
    selectedCoordinates.value.origin = airportValue.latitude !== undefined && airportValue.longitude !== undefined ? { latitude: airportValue.latitude, longitude: airportValue.longitude } : undefined
    selectedCoordinates.value.destination = undefined
  }
  tripStore.updateActiveDraft({ route: { ...tripStore.activeDraft.route, flightNumber: result.flightNumber, flightDirection: result.direction, flightStatus: result.status, originAirportIata: result.origin.iata, destinationAirportIata: result.destination.iata } })
  closeFlightLookup()
  bookingTimePicker.value = false
  if (direction === 'from-airport') {
    uni.showToast({ title: '請選擇目的地及預約時間', icon: 'none' })
    return
  }
  uni.showToast({ title: '已定位目的地機場，請填寫出發地及預約時間', icon: 'none' })
}
const confirmDepartureTime = async (value: string) => {
  departureTime.value = value
  tripStore.setRoute(origin.value, destination.value, {
    ...routeAddressFields(),
    originLatitude: selectedCoordinates.value.origin?.latitude,
    originLongitude: selectedCoordinates.value.origin?.longitude,
    destinationLatitude: selectedCoordinates.value.destination?.latitude,
    destinationLongitude: selectedCoordinates.value.destination?.longitude
  })
  tripStore.setDepartureTime(value)
  bookingTimePicker.value = false
  if (travelMode.value === 'airport' && (!origin.value || !destination.value)) {
    uni.showToast({ title: '請先填寫出發地及目的地', icon: 'none' })
    return
  }
  openCachedPage('/pages/vehicles/select')
}
const handleMapLocation = () => {
  const destinationCoordinate = selectedCoordinates.value.destination
  if (mapPolyline.value.length > 0 && destinationCoordinate) {
    mapLatitude.value = destinationCoordinate.latitude
    mapLongitude.value = destinationCoordinate.longitude
    mapCenterTrigger.value += 1
    return
  }
  useCurrentLocation()
}

const useCurrentLocation = (closePicker = false, setAsOrigin = false, forceCenter = false) => {
  const getLocation = () => uni.getLocation({
    type: 'gcj02',
    success: ({ latitude, longitude }) => {
      mapLatitude.value = latitude
      mapLongitude.value = longitude
      if (forceCenter || mapPolyline.value.length === 0) {
        mapScale.value = 17
        mapCenterTrigger.value += 1
      }
      if (addressPicker.value) selectedCoordinates.value[addressPicker.value] = { latitude, longitude }
      const localRegion = findLocalRegion(latitude, longitude)
      if (!localRegion) {
        uni.showToast({ title: '未開通服務', icon: 'none' })
        return
      }
      locationLabel.value = localRegion ? `${localRegion.region} · ${localRegion.district}` : '目前位置'
      detailedAddress.value = localRegion ? `${locationLabel.value}附近` : `目前位置（${latitude.toFixed(5)}, ${longitude.toFixed(5)}）`
      const target = addressPicker.value
      if (target) {
        setRouteSelection(target, {
          region: localRegion.region === '中國內地' ? '大陸' : localRegion.region as AddressSelection['region'],
          name: locationLabel.value,
          address: detailedAddress.value,
          displayAddress: detailedAddress.value,
          latitude,
          longitude,
          district: localRegion.district,
        })
      }
      if (setAsOrigin) {
        selectedCoordinates.value.origin = { latitude, longitude }
        origin.value = formatRouteAddress(detailedAddress.value, localRegion?.region || null)
        originIsCurrent.value = true
        mapMarkers.value = [{ id: 1, latitude, longitude, title: '出發地' }]
      }
      reverseGeocode(latitude, longitude)
        .then((location) => {
          if (location.address) detailedAddress.value = location.address
          if (localRegion?.region === '澳門') {
            locationLabel.value = `澳門 · ${location.district || localRegion.district}`
          } else if (location.city) {
            locationLabel.value = location.district ? `${location.city} · ${location.district}` : location.city
          }
          const currentTarget = addressPicker.value
          if (currentTarget) {
            setRouteSelection(currentTarget, {
              region: localRegion.region === '中國內地' ? '大陸' : localRegion.region as AddressSelection['region'],
              name: location.landmark || location.district || locationLabel.value,
              address: location.address || detailedAddress.value,
              displayAddress: location.address || detailedAddress.value,
              latitude,
              longitude,
              city: location.city,
              district: location.district || localRegion.district,
              landmark: location.landmark,
            })
          } else if (setAsOrigin) {
            setRouteSelection('origin', {
              region: localRegion.region === '中國內地' ? '大陸' : localRegion.region as AddressSelection['region'],
              name: location.landmark || location.district || locationLabel.value,
              address: location.address || detailedAddress.value,
              displayAddress: location.address || detailedAddress.value,
              latitude,
              longitude,
              city: location.city,
              district: location.district || localRegion.district,
              landmark: location.landmark,
            })
          }
          if (setAsOrigin) origin.value = formatRouteAddress(location.address || detailedAddress.value, localRegion?.region || null, location.city, location.district, location.landmark)
        })
        .catch(() => undefined)
        .finally(() => {
          if (closePicker) selectCurrentLocation()
        })
      uni.showToast({ title: '已定位到目前位置', icon: 'none' })
    },
    fail: (error) => uni.showToast({ title: `無法取得位置：${error.errMsg || '請允許定位權限'}`, icon: 'none' })
  })
  const requestLocation = () => {
    // 微信小程序拒絕過定位後，不會再次自動彈出授權框。
    // #ifdef MP-WEIXIN
    uni.getSetting({
      success: (settings) => {
       if (settings.authSetting?.['scope.userLocation'] === false) {
         uni.showModal({
           title: '需要定位權限',
           content: '請在微信設定中允許定位，才能取得出發地座標。',
           success: (result) => { if (result.confirm) uni.openSetting({}) },
         })
         return
       }
       uni.authorize({
         scope: 'scope.userLocation',
         success: () => getLocation(),
         fail: () => getLocation(),
       })
      },
      fail: () => getLocation(),
    })
    // #endif
    // #ifndef MP-WEIXIN
    getLocation()
    // #endif
  }
  // 微信新版本會在隱私協議未同意前攔截 getLocation。
  // #ifdef MP-WEIXIN
  const privacyApi = uni as typeof uni & { requirePrivacyAuthorize?: (options: { success: () => void; fail: () => void }) => void }
  if (typeof privacyApi.requirePrivacyAuthorize === 'function') {
    privacyApi.requirePrivacyAuthorize({ success: requestLocation, fail: () => undefined })
  } else {
    requestLocation()
  }
  // #endif
  // #ifndef MP-WEIXIN
  requestLocation()
  // #endif
}
const openTrips = () => {
  tripStore.setRoute(origin.value, destination.value)
  openCachedPage('/pages/trips/trips')
}
const openSupport = () => openCachedPage('/pages/support/chat')
const showComingSoon = (name: string) => uni.showToast({ title: `${name}功能開發中`, icon: 'none' })
</script>

<style scoped>
:global(html),:global(body),:global(#app){width:100%;min-width:0;height:auto;min-height:100%;margin:0;overflow:visible;overscroll-behavior:auto}.page{position:relative;top:auto;left:auto;width:430px;height:var(--mobile-height, 932px);min-height:var(--mobile-height, 932px);margin:0;overflow-y:auto;overflow-x:hidden;background:#fff;border-radius:35px;box-sizing:border-box;color:#38434a;font-family:'Noto Sans TC',sans-serif;transform:scale(var(--mobile-scale, 1));transform-origin:top left}.page-content{position:absolute;inset:0;width:430px;height:932px}.canvas{position:relative;width:430px;height:932px;min-height:932px}.nav-layer{position:absolute;inset:0;z-index:10;pointer-events:none}.nav-layer :deep(.bottom-nav){pointer-events:auto} .flight-modal{position:fixed;inset:0;z-index:1000;display:flex;align-items:flex-end;justify-content:center}.flight-modal-mask{position:absolute;inset:0;background:rgba(29,38,43,.42)}.flight-modal-card{position:relative;width:min(430px,100%);padding:28px 24px calc(24px + env(safe-area-inset-bottom));box-sizing:border-box;border-radius:28px 28px 0 0;background:#fff;color:#38434a;box-shadow:0 -8px 30px rgba(28,39,45,.16);text-align:center}.flight-modal-title{font-size:15px;font-weight:600;color:#778187}.flight-modal-number{margin-top:7px;font-size:28px;font-weight:700;letter-spacing:1px}.flight-modal-status{margin-top:5px;font-size:13px;color:#8a9499}.flight-modal-route{display:flex;align-items:center;gap:12px;margin:24px 0;padding:16px 12px;border-radius:16px;background:#f5f8f9}.flight-modal-airport{display:flex;flex:1;min-width:0;flex-direction:column;gap:5px;text-align:left;font-size:12px;color:#79858b}.flight-modal-airport--right{text-align:right}.flight-modal-label{font-size:12px;font-weight:600;color:#5ab8a5}.flight-modal-iata{font-size:22px;font-weight:700;color:#38434a}.flight-modal-arrow{font-size:24px;color:#9aa6aa}.flight-modal-question{margin-bottom:14px;font-size:15px;font-weight:600}.flight-modal-actions{display:flex;gap:12px}.flight-direction-actions{display:flex;gap:12px}.flight-candidate-list{display:flex;flex-direction:column;gap:10px;max-height:300px;overflow-y:auto;text-align:left}.flight-candidate{width:100%;padding:14px 16px;margin:0;border:1px solid #d8e0e3;border-radius:14px;background:#fff;color:#38434a;text-align:left}.flight-candidate-main,.flight-candidate-detail{display:flex;justify-content:space-between;gap:12px;align-items:center}.flight-candidate-route{font-size:16px;font-weight:700}.flight-candidate-time{font-size:16px;font-weight:700;color:#5ab8a5}.flight-candidate-detail{margin-top:6px;font-size:12px;color:#7b878c}.flight-modal-notice{margin:0 0 14px;padding:10px 12px;border-radius:10px;background:#fff7e6;color:#b06a00;font-size:13px;line-height:1.5}.flight-modal-action{flex:1;height:48px;margin:0;border:1px solid #d8e0e3;border-radius:14px;background:#fff;color:#526168;font-size:15px;line-height:48px}.flight-modal-action--disabled{border-color:#e3e7e8;background:#f1f3f4;color:#aeb7ba;opacity:1}.flight-modal-action--primary{border-color:#5ab8a5;background:#5ab8a5;color:#fff}.flight-modal-cancel{display:block;margin-top:17px;font-size:13px;color:#9aa4a8}
/* #ifdef H5 || APP-PLUS || MP-WEIXIN */
.airport-hint-modal{position:fixed;inset:0;z-index:1100;display:flex;align-items:center;justify-content:center;padding:24px;box-sizing:border-box}.airport-hint-mask{position:absolute;inset:0;background:rgba(24,35,41,.55)}.airport-hint-card{position:relative;width:min(360px,100%);padding:28px 24px 22px;border:1px solid rgba(255,255,255,.7);border-radius:24px;background:#fff;box-shadow:0 18px 50px rgba(18,31,38,.28);box-sizing:border-box;text-align:center}.airport-hint-icon{width:48px;height:48px;margin:0 auto 12px;border-radius:16px;background:#e7f7f3;color:#4eaf9d;font-size:25px;line-height:48px}.airport-hint-title{font-size:19px;font-weight:700;color:#38434a}.airport-hint-content{margin-top:12px;color:#66747b;font-size:14px;line-height:1.75}.airport-hint-button{width:100%;height:46px;margin-top:22px;border:0;border-radius:14px;background:#5ab8a5;color:#fff;font-size:15px;line-height:46px}
/* #endif */
/* #ifdef H5 */
@media (max-width:599px){.page{top:0;left:0;height:var(--mobile-height,100dvh);border-radius:0;transform:scale(var(--mobile-scale, 1));transform-origin:top left}.page-content{bottom:102px;height:auto}.canvas{height:100%;min-height:0}.canvas :deep(.map-layer){bottom:205px;height:auto}.canvas :deep(.map-tool){top:auto;bottom:245px}.canvas :deep(.route-panel){top:auto;bottom:-87px;width:430px;height:331px}.canvas :deep(.panel-surface){top:0;bottom:auto;width:430px;height:331px}.business-scroll{height:auto;bottom:102px}.nav-layer :deep(.bottom-nav){bottom:0}}
/* #endif */
/* #ifdef APP-PLUS */
.page{position:fixed;overflow:hidden;overscroll-behavior:none}
.page{top:50%;left:50%;width:430px;height:932px;border-radius:35px;transform:translate(-50%,-50%) scale(min(1,calc(100vw / 430px),calc(100dvh / 932px)));transform-origin:center center}.page-content{inset:0;width:430px;height:932px}.canvas{width:430px;height:932px;min-height:932px}.canvas :deep(.route-panel){top:586px;bottom:auto;width:430px;height:331px}.canvas :deep(.panel-surface){top:auto;bottom:0;width:430px;height:331px}.nav-layer :deep(.bottom-nav){bottom:0}
/* #endif */
/* #ifdef MP-WEIXIN || MP-TOUTIAO */
.page{position:fixed;overflow:hidden;overscroll-behavior:none}
.canvas :deep(.map-layer){top:106px;bottom:auto;height:480px}
.canvas :deep(.native-map){width:430px;height:480px}
.canvas :deep(.map-layer.full-screen){height:642px}
.canvas :deep(.map-layer.full-screen .native-map){height:642px}
.canvas :deep(.map-layer.booking-picker-open){height:466px!important}
.canvas :deep(.map-layer.booking-picker-open .native-map){height:466px!important}
.canvas :deep(.map-tool){top:538px;bottom:auto}
.canvas :deep(.route-panel){top:586px;bottom:auto;width:430px;height:331px}
.canvas :deep(.panel-surface){top:auto;bottom:0;width:430px;height:331px}
.nav-layer :deep(.bottom-nav){bottom:0}
/* #endif */
</style>
