<template>
  <view class="page" :style="responsiveStyle">
    <view class="header">
      <image class="back" src="/static/messages/back.svg" mode="aspectFit" @tap="goBack" />
      <text class="title">{{ tx('我的消息') }}</text>
      <text v-if="unreadCount > 0" :class="['read-all', { pending: readAllPending }]" @tap="readAll">{{ tx('全部已讀') }}</text>
      <view class="tabs">
        <view :class="['tab', { active: activeTab === 'all' }]" @tap="activeTab = 'all'">{{ tx('全部消息') }}</view>
        <view :class="['tab', { active: activeTab === 'important' }]" @tap="activeTab = 'important'">{{ tx('重要消息') }}</view>
        <image :class="['active-line', activeTab]" src="/static/messages/active-line.svg" mode="fill" />
      </view>
    </view>
    <view class="message-content">
      <view class="message-list">
        <view v-for="message in sortedMessages" :key="message.id" :class="['message-card', { unread: isUnread(message) }]" @tap="openMessage(message)">
          <image v-if="isUnread(message)" class="unread-dot" src="/static/messages/unread.svg" mode="aspectFit" />
          <image class="message-icon" :src="messageIcon(message)" mode="aspectFit" />
          <view class="message-copy"><text class="message-title">{{ tx(message.title) }}</text><text class="message-desc">{{ tx(message.content) }}</text></view>
          <text class="message-date">{{ tx(new Date(message.createdAt).toLocaleDateString()) }}</text>
          <image class="chevron" src="/static/messages/chevron.svg" mode="aspectFit" />
        </view>
      </view>
    </view>
    <view v-if="!sortedMessages.length" class="empty-state">
      <image class="empty-image" src="/static/messages/empty.svg" mode="aspectFit" />
      <text class="empty-text" @tap="loadError && retryNotifications()">{{ tx(loading ? '載入消息中' : loadError ? '載入失敗，點擊重試' : '沒有消息') }}</text>
    </view>
  </view>
</template>
<script setup lang="ts">
import { tx } from '../../i18n'
import { useResponsiveCanvas } from '../../composables/useResponsiveCanvas'

import { closeCachedPage, openCachedPage } from '../../utils/navigation'

const { responsiveStyle } = useResponsiveCanvas()
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { listNotifications, markAllNotificationsRead, type Notification } from '../../services/api'
import { subscribeNotificationChanges } from '../../utils/notificationRealtime'
import { notificationIcon } from './notificationIcon'
import { onShow } from '@dcloudio/uni-app'
const activeTab = ref<'all' | 'important'>('all')
const notifications = ref<Notification[]>([])
const loading = ref(true)
const loadError = ref(false)
const unreadCount = ref(0)
const readAllPending = ref(false)
let latestRequest = 0
const isUnread = (message: Notification) => !message.readAt
const messageIcon = (message: Notification) => notificationIcon(message.templateType, message.audience)
const visibleMessages = computed(() => activeTab.value === 'important' ? notifications.value.filter(message => message.important) : notifications.value)
const sortedMessages = computed(() => [...visibleMessages.value].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))

const refreshNotifications = async () => {
  const request = ++latestRequest
  try {
    const result = await listNotifications()
    if (request !== latestRequest) return
    notifications.value = result.data
    unreadCount.value = result.unread
    loadError.value = false
  } catch {
    if (request === latestRequest) loadError.value = true
    // Keep the last successful snapshot during transient reconnect failures.
  } finally {
    if (request === latestRequest) loading.value = false
  }
}
const retryNotifications = () => {
  loading.value = true
  loadError.value = false
  void refreshNotifications()
}

// The mini-program embeds this view in the home page, so its page onShow hook
// does not run when the embedded view is first mounted.
// #ifdef MP-WEIXIN || MP-TOUTIAO
onMounted(() => { void refreshNotifications() })
// #endif
onShow(refreshNotifications)
const unsubscribeNotifications = subscribeNotificationChanges(() => { void refreshNotifications() })
onUnmounted(unsubscribeNotifications)

const readAll = async () => {
  if (readAllPending.value) return
  readAllPending.value = true
  try {
    await markAllNotificationsRead()
    await refreshNotifications()
  } catch {
    uni.showToast({ title: '操作失敗，請稍後再試', icon: 'none' })
  } finally {
    readAllPending.value = false
  }
}
const openMessage = async (message: Notification) => {
  uni.setStorageSync('selected-notification', message)
  openCachedPage(`/pages/messages/detail?id=${encodeURIComponent(message.id)}`)
}
const goBack = () => closeCachedPage('/pages/trips/trips')
</script>
<style scoped>
:global(html),:global(body),:global(#app){width:100%;min-width:0;height:100%;margin:0;overflow:hidden;overscroll-behavior:none}.page{position:fixed;top:0;left:0;width:430px;height:var(--mobile-height, 932px);overflow:hidden;border-radius:35px;background:#F0F2F5;color:#38434A;font-family:'Noto Sans TC',sans-serif;transform:scale(var(--mobile-scale, 1));transform-origin:top left}.header{position:absolute;top:0;left:0;width:430px;height:155px;overflow:hidden;border-radius:25px;background:#fff}.back{position:absolute;top:53px;left:26px;width:26px;height:39px;padding:7px;box-sizing:border-box}.title{position:absolute;top:56px;left:50%;transform:translateX(-50%);font-size:18px;font-weight:500;white-space:nowrap}.read-all{position:absolute;top:47px;right:15px;padding:11px;color:#285CFC;font-size:14px;line-height:23px;white-space:nowrap}.read-all.pending{opacity:.5;pointer-events:none}.tabs{position:absolute;bottom:0;left:131px;width:168px;height:33px}.tab{position:absolute;top:0;font-size:16px;font-weight:700;line-height:23px}.tab:first-child{left:0}.tab:nth-child(2){left:104px}.tab.active{color:#285CFC}.active-line{position:absolute;bottom:0;width:64px;height:2px;transition:left .2s ease}.active-line.all{left:0}.active-line.important{left:104px}.message-content{position:absolute;top:155px;left:0;width:430px;padding-top:14px;box-sizing:border-box}.message-list{display:flex;flex-direction:column;gap:10px}.message-card:not(:last-child){overflow:visible}.message-card:not(:last-child)::after{position:absolute;right:24px;bottom:-6px;left:24px;height:1px;background:#D9D9D9;content:""}.message-card{position:relative;width:420px;height:50px;margin:0 auto;overflow:hidden;border:1px solid transparent;border-radius:10px;box-sizing:border-box;background:#F0F2F5}.message-card.unread{border-color:#285CFC}.unread-dot{position:absolute;top:17px;left:4px;width:15px;height:15px}.message-icon{position:absolute;top:7px;left:24px;width:35px;height:35px}.message-copy{position:absolute;top:3px;left:69px;width:309px;display:flex;flex-direction:column}.message-title{max-width:225px;overflow:hidden;font-size:14px;line-height:20px;white-space:nowrap;text-overflow:ellipsis}.message-desc{overflow:hidden;color:#666;font-size:12px;line-height:18px;white-space:nowrap;text-overflow:ellipsis}.message-date{position:absolute;top:5px;right:52px;color:#666;font-size:10px}.chevron{position:absolute;top:17px;right:24px;width:9px;height:15px}.empty-state{position:absolute;top:346px;left:115px;width:200px;display:flex;flex-direction:column;align-items:center}.empty-image{width:200px;height:200px}.empty-text{margin-top:20px;color:#D9D9D9;font-size:20px;font-weight:500}

@media (max-width:599px){.page{top:0;left:0;height:var(--mobile-height,100dvh);border-radius:0;transform:scale(var(--mobile-scale, 1));transform-origin:top left}}
</style>
