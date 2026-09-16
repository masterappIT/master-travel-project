<template>
  <view class="page" :style="responsiveStyle">
    <view class="header">
      <image class="back" src="/static/messages/back.svg" mode="aspectFit" @tap="goBack" />
      <text class="title">我的消息</text>
      <view class="tabs">
        <view :class="['tab', { active: activeTab === 'all' }]" @tap="activeTab = 'all'">全部消息</view>
        <view :class="['tab', { active: activeTab === 'important' }]" @tap="activeTab = 'important'">重要消息</view>
        <image :class="['active-line', activeTab]" src="/static/messages/active-line.svg" mode="fill" />
      </view>
    </view>
    <view class="message-content">
      <view class="message-list">
        <view v-for="message in sortedMessages" :key="message.id" :class="['message-card', { unread: isUnread(message) }]" @tap="openMessage(message)">
          <image v-if="isUnread(message)" class="unread-dot" src="/static/messages/unread.svg" mode="aspectFit" />
          <image class="message-icon" :src="message.audience.includes('DRIVER') ? '/static/messages/order.svg' : '/static/messages/top-up.svg'" mode="aspectFit" />
          <view class="message-copy"><text class="message-title">{{ message.title }}</text><text class="message-desc">{{ message.content }}</text></view>
          <text class="message-date">{{ new Date(message.createdAt).toLocaleDateString() }}</text>
          <image class="chevron" src="/static/messages/chevron.svg" mode="aspectFit" />
        </view>
      </view>
    </view>
    <view v-if="!sortedMessages.length" class="empty-state">
      <image class="empty-image" src="/static/messages/empty.svg" mode="aspectFit" />
      <text class="empty-text">沒有消息</text>
    </view>
  </view>
</template>
<script setup lang="ts">
import { useResponsiveCanvas } from '../../composables/useResponsiveCanvas'
import { formatCurrencyAmount } from '../../composables/useCurrency'

import { closeCachedPage, openCachedPage } from '../../utils/navigation'

const { responsiveStyle } = useResponsiveCanvas()
import { computed, ref } from 'vue'
import { listNotifications, markNotificationRead, type Notification } from '../../services/api'
import { onShow } from '@dcloudio/uni-app'
const activeTab = ref<'all' | 'important'>('all')
const hkd = (amount: number) => formatCurrencyAmount(amount, 'HKD')
const messages = [
  { type: 'order', title: '您的跨境出行訂單已確認', description: '您的行程：香港 - 深圳機場（訂單編號：A82678634）', icon: '/static/messages/order.svg' },
  { type: 'top-up', title: '您的餘額增值已到帳', description: `您的錢包餘額 ${hkd(0)}`, icon: '/static/messages/top-up.svg' },
  { type: 'withdrawal', title: '您的餘額提現已到帳', description: `您的錢包餘額 ${hkd(0)}`, icon: '/static/messages/wallet.svg' },
  { type: 'refund', title: '您的訂單退款已到帳', description: '行程：香港 - 深圳機場（訂單編號：A82678634）', icon: '/static/messages/wallet.svg' }
] as const
const notifications = ref<Notification[]>([])
const isUnread = (message: Notification) => !message.readAt
  const visibleMessages = computed(() => activeTab.value === 'important' ? notifications.value.filter(message => message.important) : notifications.value)
  const sortedMessages = computed(() => [...visibleMessages.value].sort((a, b) => Number(isUnread(b)) - Number(isUnread(a))))

onShow(async () => {
  try {
    notifications.value = (await listNotifications()).data
  } catch {
    notifications.value = []
  }
})

const openMessage = async (message: Notification) => {
  if (isUnread(message)) {
    await markNotificationRead(message.id).catch(() => undefined)
    message.readAt = new Date().toISOString()
  }
  uni.setStorageSync('selected-notification', message)
  openCachedPage(`/pages/messages/detail?id=${encodeURIComponent(message.id)}`)
}
const goBack = () => closeCachedPage('/pages/trips/trips')
</script>
<style scoped>
:global(html),:global(body),:global(#app){width:100%;min-width:0;height:100%;margin:0;overflow:hidden;overscroll-behavior:none}.page{position:fixed;top:0;left:0;width:430px;height:var(--mobile-height, 932px);overflow:hidden;border-radius:35px;background:#F0F2F5;color:#38434A;font-family:'Noto Sans TC',sans-serif;transform:scale(var(--mobile-scale, 1));transform-origin:top left}.header{position:absolute;top:0;left:0;width:430px;height:155px;overflow:hidden;border-radius:25px;background:#fff}.back{position:absolute;top:53px;left:26px;width:26px;height:39px;padding:7px;box-sizing:border-box}.title{position:absolute;top:56px;left:50%;transform:translateX(-50%);font-size:18px;font-weight:500;white-space:nowrap}.tabs{position:absolute;bottom:0;left:131px;width:168px;height:33px}.tab{position:absolute;top:0;font-size:16px;font-weight:700;line-height:23px}.tab:first-child{left:0}.tab:nth-child(2){left:104px}.tab.active{color:#285CFC}.active-line{position:absolute;bottom:0;width:64px;height:2px;transition:left .2s ease}.active-line.all{left:0}.active-line.important{left:104px}.message-content{position:absolute;top:155px;left:0;width:430px;padding-top:14px;box-sizing:border-box}.message-list{display:flex;flex-direction:column;gap:10px}.message-card{position:relative;width:380px;height:50px;margin:0 auto;overflow:hidden;border:1px solid transparent;border-radius:10px;box-sizing:border-box;background:#F0F2F5}.message-card.unread{border-color:#285CFC}.unread-dot{position:absolute;top:17px;left:4px;width:15px;height:15px}.message-icon{position:absolute;top:7px;left:24px;width:35px;height:35px}.message-copy{position:absolute;top:3px;left:69px;width:280px;display:flex;flex-direction:column}.message-title{font-size:14px;line-height:20px}.message-desc{overflow:hidden;color:#666;font-size:12px;line-height:18px;white-space:nowrap;text-overflow:ellipsis}.message-date{position:absolute;top:5px;right:30px;color:#666;font-size:10px}.chevron{position:absolute;top:17px;left:357px;width:9px;height:15px}.empty-state{position:absolute;top:346px;left:115px;width:200px;display:flex;flex-direction:column;align-items:center}.empty-image{width:200px;height:200px}.empty-text{margin-top:20px;color:#D9D9D9;font-size:20px;font-weight:500}

@media (max-width:599px){.page{top:0;left:0;height:var(--mobile-height,100dvh);border-radius:0;transform:scale(var(--mobile-scale, 1));transform-origin:top left}}
</style>
