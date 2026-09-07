<template>
  <view v-show="activePagePath === '/pages/index/index'" class="page" :style="responsiveStyle">
    <view v-if="rideMode === 'cross-border'" class="page-content">
      <view class="canvas">
        <HomeMap :latitude="mapLatitude" :longitude="mapLongitude" />
        <HomeHeader :location-label="locationLabel" />
        <HomeTravelModeSwitch :mode="rideMode" @update:mode="switchRideMode" />
        <HomeMapActions @location="useCurrentLocation" />
        <HomeRoutePanel
          v-model:mode="travelMode"
          :origin="origin"
          :destination="destination"
          :departure-time="departureTime"
          :flight-number="flightNumber"
          @origin="chooseOrigin"
          @destination="chooseDestination"
          @departure-time="chooseDepartureTime"
          @update:flight-number="flightNumber = $event"
        />
        <view class="accessible-values">{{ origin }} · {{ destination }}</view>
        <AddressPicker
          v-if="addressPicker"
          :selecting="addressPicker"
          :location-label="locationLabel"
          :detailed-address="detailedAddress"
          @close="addressPicker = null"
          @select="selectAddress"
          @locate="locateCurrentAddress"
          @use-current="useCurrentLocation(true)"
        />
        <BookingTimePicker v-if="bookingTimePicker" @close="bookingTimePicker = false" @confirm="confirmDepartureTime" />
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
        @close="addressPicker = null"
        @select="selectAddress"
        @locate="locateCurrentAddress"
        @use-current="useCurrentLocation(true)"
      />
      <BookingTimePicker v-if="bookingTimePicker" @close="bookingTimePicker = false" @confirm="confirmDepartureTime" />
    </template>
    <view class="nav-layer">
      <HomeBottomNav @services="openSupport" @trips="openTrips" />
    </view>
  </view>
  <!-- #ifdef MP-WEIXIN || MP-TOUTIAO -->
  <TripsPage v-if="visitedPages.has('/pages/trips/trips')" v-show="activePagePath === '/pages/trips/trips'" />
  <MembershipPage v-if="visitedPages.has('/pages/membership/membership')" v-show="activePagePath === '/pages/membership/membership'" />
  <MileagePage v-if="visitedPages.has('/pages/mileage/mileage')" v-show="activePagePath === '/pages/mileage/mileage'" />
  <InvitePage v-if="visitedPages.has('/pages/invite/invite')" v-show="activePagePath === '/pages/invite/invite'" />
  <MessagesPage v-if="visitedPages.has('/pages/messages/messages')" v-show="activePagePath === '/pages/messages/messages'" />
  <MessageDetailPage v-if="visitedPages.has('/pages/messages/detail')" v-show="activePagePath === '/pages/messages/detail'" />
  <OrdersPage v-if="visitedPages.has('/pages/orders/orders')" v-show="activePagePath === '/pages/orders/orders'" />
  <OrderDetailPage v-if="visitedPages.has('/pages/orders/detail')" :key="cachedPageUrl" v-show="activePagePath === '/pages/orders/detail'" />
  <PendingOrderDetailPage v-if="visitedPages.has('/pages/orders/pending-detail')" :key="cachedPageUrl" v-show="activePagePath === '/pages/orders/pending-detail'" />
  <CancelledOrderDetailPage v-if="visitedPages.has('/pages/orders/cancelled-detail')" :key="cachedPageUrl" v-show="activePagePath === '/pages/orders/cancelled-detail'" />
  <TripsDetailPage v-if="visitedPages.has('/pages/trips/detail')" :key="cachedPageUrl" v-show="activePagePath === '/pages/trips/detail'" />
  <VehicleSelectPage v-if="visitedPages.has('/pages/vehicles/select')" v-show="activePagePath === '/pages/vehicles/select'" />
  <VehicleSelectedPage v-if="visitedPages.has('/pages/vehicles/selected')" v-show="activePagePath === '/pages/vehicles/selected'" />
  <VehicleConfirmPage v-if="visitedPages.has('/pages/vehicles/confirm')" v-show="activePagePath === '/pages/vehicles/confirm'" />
  <BookingSuccessPage v-if="visitedPages.has('/pages/vehicles/booking-success')" v-show="activePagePath === '/pages/vehicles/booking-success'" />
  <AccountPage v-if="visitedPages.has('/pages/account/account')" v-show="activePagePath === '/pages/account/account'" />
  <SettingsPage v-if="visitedPages.has('/pages/settings/settings')" v-show="activePagePath === '/pages/settings/settings'" />
  <WalletPage v-if="visitedPages.has('/pages/wallet/wallet')" v-show="activePagePath === '/pages/wallet/wallet'" />
  <TopUpPage v-if="visitedPages.has('/pages/top-up/top-up')" v-show="activePagePath === '/pages/top-up/top-up'" />
  <TopUpDetailPage v-if="visitedPages.has('/pages/top-up/detail/detail')" :key="cachedPageUrl" v-show="activePagePath === '/pages/top-up/detail/detail'" />
  <VoucherClaimPage v-if="visitedPages.has('/pages/voucher/claim')" v-show="activePagePath === '/pages/voucher/claim'" />
  <WithdrawPage v-if="visitedPages.has('/pages/withdraw/withdraw')" v-show="activePagePath === '/pages/withdraw/withdraw'" />
  <WithdrawDetailPage v-if="visitedPages.has('/pages/withdraw/detail')" v-show="activePagePath === '/pages/withdraw/detail'" />
  <AlipayWithdrawDetailPage v-if="visitedPages.has('/pages/withdraw/alipay-detail')" v-show="activePagePath === '/pages/withdraw/alipay-detail'" />
  <PaymentSettingsPage v-if="visitedPages.has('/pages/payment-settings/payment-settings')" v-show="activePagePath === '/pages/payment-settings/payment-settings'" />
  <TransactionsPage v-if="visitedPages.has('/pages/transactions/transactions')" v-show="activePagePath === '/pages/transactions/transactions'" />
  <ExpenseDetailPage v-if="visitedPages.has('/pages/transactions/expense-detail')" v-show="activePagePath === '/pages/transactions/expense-detail'" />
  <RefundPage v-if="visitedPages.has('/pages/refund/detail')" v-show="activePagePath === '/pages/refund/detail'" />
  <BankCardPage v-if="visitedPages.has('/pages/bank-card/bank-card')" v-show="activePagePath === '/pages/bank-card/bank-card'" />
  <BankCardAccountPage v-if="visitedPages.has('/pages/bank-card/account')" v-show="activePagePath === '/pages/bank-card/account'" />
  <BankCardListPage v-if="visitedPages.has('/pages/bank-card/list')" v-show="activePagePath === '/pages/bank-card/list'" />
  <BankCardDetailPage v-if="visitedPages.has('/pages/bank-card/detail')" v-show="activePagePath === '/pages/bank-card/detail'" />
  <CommonDataPage v-if="visitedPages.has('/pages/common-data/common-data')" v-show="activePagePath === '/pages/common-data/common-data'" />
  <CouponsPage v-if="visitedPages.has('/pages/coupons/coupons')" v-show="activePagePath === '/pages/coupons/coupons'" />
  <ComplaintsPage v-if="visitedPages.has('/pages/complaints/complaints')" v-show="activePagePath === '/pages/complaints/complaints'" />
  <SupportChatPage v-if="visitedPages.has('/pages/support/chat')" v-show="activePagePath === '/pages/support/chat'" />
  <!-- #endif -->
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useTripStore } from '../../stores/trip'
import HomeHeader from '../../components/home/HomeHeader.vue'
import HomeMap from '../../components/home/HomeMap.vue'
import HomeTravelModeSwitch from '../../components/home/HomeTravelModeSwitch.vue'
import HomeMapActions from '../../components/home/HomeMapActions.vue'
import HomeRoutePanel from '../../components/home/HomeRoutePanel.vue'
import BusinessCharterPanel from '../../components/home/BusinessCharterPanel.vue'
import HomeBottomNav from '../../components/home/HomeBottomNav.vue'
import AddressPicker from '../../components/home/AddressPicker.vue'
import BookingTimePicker from '../../components/home/BookingTimePicker.vue'
import { useResponsiveCanvas } from '../../composables/useResponsiveCanvas'
import { activateEmbeddedPageHost, cachedPagePath, visitedPages, openCachedPage } from '../../utils/navigation'
import { reverseGeocode } from '../../services/api'
import { findLocalRegion } from '../../utils/localRegions'

const { responsiveStyle } = useResponsiveCanvas()
// #ifdef MP-WEIXIN || MP-TOUTIAO
import TripsPage from '../trips/trips.vue'
import MembershipPage from '../membership/membership.vue'
import MileagePage from '../mileage/mileage.vue'
import InvitePage from '../invite/invite.vue'
import MessagesPage from '../messages/messages.vue'
import MessageDetailPage from '../messages/detail.vue'
import OrdersPage from '../orders/orders.vue'
import OrderDetailPage from '../orders/detail.vue'
import PendingOrderDetailPage from '../orders/pending-detail.vue'
import CancelledOrderDetailPage from '../orders/cancelled-detail.vue'
import TripsDetailPage from '../trips/detail.vue'
import VehicleSelectPage from '../vehicles/select.vue'
import VehicleSelectedPage from '../vehicles/selected.vue'
import VehicleConfirmPage from '../vehicles/confirm.vue'
import BookingSuccessPage from '../vehicles/booking-success.vue'
import AccountPage from '../account/account.vue'
import SettingsPage from '../settings/settings.vue'
import WalletPage from '../wallet/wallet.vue'
import TopUpPage from '../top-up/top-up.vue'
import TopUpDetailPage from '../top-up/detail/detail.vue'
import VoucherClaimPage from '../voucher/claim.vue'
import WithdrawPage from '../withdraw/withdraw.vue'
import WithdrawDetailPage from '../withdraw/detail.vue'
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
const origin = ref('香港 · 九龍站')
const destination = ref('廣東 · 深圳灣口岸')
interface BusinessLocation { region: string; place: string }
interface AddressSelection { region: '大陸' | '香港' | '澳門' | null; name: string; address: string }
const businessOrigin = ref<BusinessLocation>({ region: '香港', place: '香港國際機場' })
const businessDestination = ref<BusinessLocation>({ region: '大陸', place: '' })
const initialBusinessOrigin: BusinessLocation = { region: '香港', place: '香港國際機場' }
const initialBusinessDestination: BusinessLocation = { region: '大陸', place: '' }
const departureTime = ref('')
const flightNumber = ref('')
const mapLatitude = ref(22.3046)
const mapLongitude = ref(114.1619)
const locationLabel = ref('香港 · 油尖旺區')
const detailedAddress = ref('香港九龍站附近')
const bookingTimePicker = ref(false)
let hasShown = false
const switchRideMode = (mode: RideMode) => {
  if (mode === rideMode.value) return

  tripStore.switchServiceMode(mode === 'business' ? 'business-charter' : 'cross-border')
  addressPicker.value = null
  bookingTimePicker.value = false

  if (mode === 'business') {
    origin.value = '香港 · 九龍站'
    destination.value = '廣東 · 深圳灣口岸'
    departureTime.value = ''
    flightNumber.value = ''
    travelMode.value = 'cross-border'
  } else {
    businessOrigin.value = { ...initialBusinessOrigin }
    businessDestination.value = { ...initialBusinessDestination }
  }

  rideMode.value = mode
}

onShow(() => {
  if (hasShown) rideMode.value = 'cross-border'
  hasShown = true
})

const addressPicker = ref<'origin' | 'destination' | null>(null)
const addressPickerContext = ref<'cross-border' | 'business'>('cross-border')
const chooseOrigin = () => { addressPickerContext.value = 'cross-border'; addressPicker.value = 'origin' }
const chooseDestination = () => { addressPickerContext.value = 'cross-border'; addressPicker.value = 'destination' }
const chooseBusinessOrigin = () => { addressPickerContext.value = 'business'; addressPicker.value = 'origin' }
const chooseBusinessDestination = () => { addressPickerContext.value = 'business'; addressPicker.value = 'destination' }
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
const selectAddress = (value: string, selection?: AddressSelection) => {
  if (addressPickerContext.value === 'business') {
    const location = selection ? formatBusinessLocation(selection) : parseBusinessLocation(value)
    if (addressPicker.value === 'origin') businessOrigin.value = location
    if (addressPicker.value === 'destination') businessDestination.value = location
  } else {
    if (addressPicker.value === 'origin') origin.value = value
    if (addressPicker.value === 'destination') destination.value = value
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
    const currentAddress = locationLabel.value.startsWith('澳門')
      ? `${locationLabel.value} · ${detailedAddress.value.replace(/澳门/g, '澳門')}`
      : detailedAddress.value
    if (addressPicker.value === 'origin') origin.value = currentAddress
    if (addressPicker.value === 'destination') destination.value = currentAddress
  }
  addressPicker.value = null
}
const chooseDepartureTime = () => { bookingTimePicker.value = true }
const confirmDepartureTime = (value: string) => {
  if (travelMode.value === 'airport' && !flightNumber.value.trim()) {
    uni.showToast({ title: '請先填寫航班號', icon: 'none' })
    return
  }
  departureTime.value = value
  tripStore.setRoute(origin.value, destination.value)
  tripStore.setDepartureTime(value)
  bookingTimePicker.value = false
  openCachedPage('/pages/vehicles/select')
}

const useCurrentLocation = (closePicker = false) => {
  uni.getLocation({
    type: 'gcj02',
    success: ({ latitude, longitude }) => {
      mapLatitude.value = latitude
      mapLongitude.value = longitude
      const localRegion = findLocalRegion(latitude, longitude)
      locationLabel.value = localRegion ? `${localRegion.region} · ${localRegion.district}` : '目前位置'
      detailedAddress.value = localRegion ? `${locationLabel.value}附近` : `目前位置（${latitude.toFixed(5)}, ${longitude.toFixed(5)}）`
      reverseGeocode(latitude, longitude)
        .then((location) => {
          if (location.address) detailedAddress.value = location.address
          if (localRegion?.region === '澳門') {
            locationLabel.value = `澳門 · ${location.district || localRegion.district}`
          } else if (location.city) {
            locationLabel.value = location.district ? `${location.city} · ${location.district}` : location.city
          }
        })
        .catch(() => undefined)
        .finally(() => {
          if (closePicker) selectCurrentLocation()
        })
      uni.showToast({ title: '已定位到目前位置', icon: 'none' })
    },
    fail: () => uni.showToast({ title: '無法取得位置，請允許定位權限', icon: 'none' })
  })
}
const openTrips = () => {
  tripStore.setRoute(origin.value, destination.value)
  openCachedPage('/pages/trips/trips')
}
const openSupport = () => openCachedPage('/pages/support/chat')
const showComingSoon = (name: string) => uni.showToast({ title: `${name}功能開發中`, icon: 'none' })
</script>

<style scoped>
:global(html),:global(body),:global(#app){width:100%;min-width:0;height:100%;margin:0;overflow:hidden;overscroll-behavior:none}.page{position:fixed;top:50%;left:50%;width:430px;height:932px;min-height:0;margin:0;overflow:hidden;background:#fff;border-radius:35px;box-sizing:border-box;color:#38434a;font-family:'Noto Sans TC',sans-serif;transform:translate(-50%,-50%) scale(min(1,calc(100vw / 430px),calc(100dvh / 932px)));transform-origin:center center}.page-content{position:absolute;inset:0;width:430px;height:932px}.canvas{position:relative;width:430px;height:932px;min-height:932px}.nav-layer{position:absolute;inset:0;z-index:10;pointer-events:none}.nav-layer :deep(.bottom-nav){pointer-events:auto}.accessible-values{position:absolute;width:1px;height:1px;overflow:hidden;opacity:0}
@media (max-width:599px){.page{top:0;left:0;height:var(--mobile-height,100dvh);border-radius:0;transform:scale(var(--mobile-scale, 1));transform-origin:top left}.page-content{bottom:102px;height:auto;overflow:hidden}.canvas{height:100%;min-height:0}.canvas :deep(.map-layer){bottom:205px;height:auto}.canvas :deep(.map-tool){top:auto;bottom:245px}.canvas :deep(.route-panel){top:auto;bottom:-87px;width:430px;height:331px}.canvas :deep(.panel-surface){top:0;bottom:auto;width:430px;height:331px}.business-scroll{height:auto;bottom:102px}.nav-layer :deep(.bottom-nav){bottom:0}}
</style>
