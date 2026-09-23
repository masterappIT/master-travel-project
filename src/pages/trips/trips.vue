<template>
  <view class="page" :style="responsiveStyle">
    <view class="profile-content">
      <view class="profile-canvas">
        <ProfileHeader
          :avatar-url="avatarUrl"
          :display-name="displayName"
          :authenticated="authenticated"
          :unread-count="unreadCount"
          @notifications="openMessages"
          @settings="openSettings"
          @avatar="openAccount"
          @login="openLogin"
        />
        <template v-if="authenticated">
          <view class="upgrade-position"><UpgradeCard @tap="openMembership" /></view>
          <view class="wallet-position"><WalletCard :cash-balance="cashBalance" @select="handleWalletAction" /></view>
          <view class="orders-position"><OrdersCard @select="handleOrderAction" /></view>
          <view class="common-position"><CommonActions @select="handleCommonAction" /></view>
        </template>
      </view>
    </view>
    <ProfileBottomNav @home="goHome" @service="openCustomerService" />
  </view>
</template>

<script setup lang="ts">
import { useResponsiveCanvas } from '../../composables/useResponsiveCanvas'
import { openCachedPage, setOrderReturnTarget } from '../../utils/navigation'

const { responsiveStyle } = useResponsiveCanvas()
import { onUnmounted, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getAuthToken, isAuthenticated, getAuthUser, isAuthSessionCurrent, subscribeAuthUser } from '../../utils/auth'
import { subscribeNotificationChanges } from '../../utils/notificationRealtime'
import ProfileHeader from '../../components/profile/ProfileHeader.vue'
import UpgradeCard from '../../components/profile/UpgradeCard.vue'
import WalletCard from '../../components/profile/WalletCard.vue'
import OrdersCard from '../../components/profile/OrdersCard.vue'
import CommonActions from '../../components/profile/CommonActions.vue'
import ProfileBottomNav from '../../components/profile/ProfileBottomNav.vue'
import { getClientProfile, listNotifications, listClientTrips } from '../../services/api'
import { persistWallet, readWallet } from '../../utils/wallet'
import { selectNextPendingTrip } from '../../utils/pendingTrip'

const unreadCount = ref(0)
const avatarUrl = ref('')
const displayName = ref('')
const cashBalance = ref(0)
const fareBalance = ref(0)
const authenticated = ref(false)
let profilePollTimer: ReturnType<typeof setInterval> | undefined

const refreshProfile = async () => {
  authenticated.value = isAuthenticated()
  const profile = uni.getStorageSync('account-profile')
  const authUser = getAuthUser()
  avatarUrl.value = ''
  displayName.value = profile?.name || profile?.displayName || authUser?.name || authUser?.displayName || ''
  const authToken = getAuthToken()
  if (authenticated.value && authToken) {
    try {
      const remote = await getClientProfile()
      if (!isAuthSessionCurrent(authToken)) return
      displayName.value = remote.name || remote.displayName || displayName.value
      avatarUrl.value = remote.avatarUrl || ''
      const { avatarUrl: _cachedAvatarUrl, ...cachedProfile } = profile || {}
      uni.setStorageSync('account-profile', { ...cachedProfile, name: remote.name || '', displayName: remote.displayName || '' })
      const wallet = readWallet()
      cashBalance.value = Number(remote.cashBalance) || 0
      fareBalance.value = Number(remote.fareBalance) || 0
      persistWallet({ ...wallet, withdrawable: cashBalance.value, fare: fareBalance.value })
    } catch { /* keep cached profile when offline */ }
    try {
      const notifications = await listNotifications()
      if (!isAuthSessionCurrent(authToken)) return
      unreadCount.value = notifications.unread
    } catch {
      unreadCount.value = 0
    }
  } else {
    unreadCount.value = 0
  }
  const wallet = readWallet()
  cashBalance.value = wallet.withdrawable
  fareBalance.value = wallet.fare
}

void refreshProfile()
const unsubscribeAuthUser = subscribeAuthUser((user) => {
  authenticated.value = Boolean(user)
  displayName.value = user?.name || user?.displayName || ''
  avatarUrl.value = user?.avatarUrl || ''
  if (!user) {
    unreadCount.value = 0
    cashBalance.value = 0
    fareBalance.value = 0
    if (profilePollTimer) clearInterval(profilePollTimer)
    profilePollTimer = undefined
  }
})
onUnmounted(unsubscribeAuthUser)
const unsubscribeNotifications = subscribeNotificationChanges(() => { void refreshProfile() })
onUnmounted(unsubscribeNotifications)

onShow(() => {
  void refreshProfile()
  if (profilePollTimer) clearInterval(profilePollTimer)
  if (isAuthenticated()) profilePollTimer = setInterval(() => { void refreshProfile() }, 15000)
})

onUnmounted(() => {
  if (profilePollTimer) clearInterval(profilePollTimer)
})

const goHome = () => openCachedPage('/pages/index/index')
const openCustomerService = () => openCachedPage('/pages/support/chat')
const openMessages = () => openCachedPage('/pages/messages/messages')
const openSettings = () => openCachedPage('/pages/settings/settings')
const openAccount = () => openCachedPage('/pages/account/account')
const openLogin = () => uni.reLaunch({ url: '/pages/login/login', animationType: 'none', animationDuration: 0 })
const openMembership = () => openCachedPage('/pages/membership/membership')
const handleOrderAction = async (name: string) => {
  if (name === '全部訂單') {
    setOrderReturnTarget('orders')
    return openCachedPage('/pages/orders/orders')
  }
  if (name === '待出行') {
    setOrderReturnTarget('profile')
    try {
      const trips = await listClientTrips()
      const traveling = selectNextPendingTrip(trips)
      if (!traveling) return uni.showToast({ title: '目前沒有待出行訂單', icon: 'none' })
      return openCachedPage(`/pages/trips/pending?id=${encodeURIComponent(traveling.id)}`)
    } catch (error) {
      return uni.showToast({ title: error instanceof Error ? error.message : '訂單載入失敗', icon: 'none' })
    }
  }
  comingSoon(name)
}
const handleWalletAction = (name: string) => {
  if (name === '里程') return openCachedPage('/pages/mileage/mileage')
   if (name === '優惠券') return openCachedPage('/pages/coupons/coupons')
  if (name === '錢包' || name === '錢包詳細' || name === '餘額') return openCachedPage('/pages/wallet/wallet')
  comingSoon(name)
}
const handleCommonAction = (name: string) => {
  if (name === '常用資料') return openCachedPage('/pages/common-data/common-data')
  if (name === '我的銀行卡') return openCachedPage('/pages/bank-card/list')
  if (name === '邀請好友') return openCachedPage('/pages/invite/invite')
  if (name === '我的投訴') return openCachedPage('/pages/complaints/complaints')
  if (name === '聯繫客服') return openCustomerService()
  comingSoon(name)
}
const comingSoon = (name: string) => uni.showToast({ title: `${name}功能開發中`, icon: 'none' })
</script>

<style scoped>
:global(html),:global(body),:global(#app){width:100%;min-width:0;height:100%;margin:0;overflow:hidden;overscroll-behavior:none;touch-action:pan-y}

.page{position:fixed;top:0;left:0;width:430px;height:var(--mobile-height, 932px);min-height:0;margin:0;overflow:hidden;background:#F0F2F5;border-radius:35px;box-sizing:border-box;color:#38434A;font-family:'Noto Sans TC',sans-serif;transform:scale(var(--mobile-scale, 1));transform-origin:top left center}.profile-content{position:absolute;inset:0;width:430px;height:932px}.profile-canvas{position:relative;width:430px;height:932px}.upgrade-position,.wallet-position,.orders-position,.common-position{position:absolute;left:15px;width:400px}.upgrade-position{top:217px}.wallet-position{top:292px}.orders-position{top:calc(50% - 38.5px)}.common-position{top:546px}

@media (max-width:599px){.page{top:0;left:0;height:var(--mobile-height,100dvh);border-radius:0;transform:scale(var(--mobile-scale, 1));transform-origin:top left}.profile-content{bottom:102px;height:auto}.profile-canvas{height:max(830px,calc(var(--mobile-height,932px) - 102px))}.orders-position{top:427.5px}.common-position{top:auto;bottom:19px}}
</style>
