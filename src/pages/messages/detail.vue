<template>
  <view class="page" :style="responsiveStyle">
    <view class="header">
      <PageNavBar :title="tx('消息詳情')" @back="goBack" />
    </view>

    <view class="content">
      <view class="status-card">
        <image class="type-icon" :src="detail.icon" mode="aspectFit" />
        <text class="title">{{ tx(detail.title) }}</text>
        <text class="status">{{ tx(detail.status) }}</text>
        <text class="time">{{ tx(detail.time) }}</text>
      </view>

      <view v-if="detail.rows.length" class="detail-card">
        <view v-for="row in detail.rows" :key="row.label" class="detail-row">
          <text class="label">{{ tx(row.label) }}</text>
          <text class="value">{{ tx(row.value) }}</text>
        </view>
      </view>

      <view v-if="detail.notice" class="notice-card">
        <text class="notice-title">{{ tx('溫馨提示') }}</text>
        <text class="notice-text">{{ tx(detail.notice) }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import PageNavBar from '../../components/common/PageNavBar.vue'
import { tx } from '../../i18n'
import { useResponsiveCanvas } from '../../composables/useResponsiveCanvas'

import { closeCachedPage } from '../../utils/navigation'
import { computed, onMounted, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getNotification, markNotificationRead, type Notification } from '../../services/api'
import { notificationIcon } from './notificationIcon'

const { responsiveStyle } = useResponsiveCanvas()

const notification = ref<Notification | null>(null)
const loadError = ref(false)
const detail = computed(() => notification.value ? {
  title: notification.value.title,
  status: notification.value.readAt ? '已讀' : '新消息',
  icon: notificationIcon(notification.value.templateType, notification.value.audience),
  time: new Date(notification.value.createdAt).toLocaleString(),
  rows: [{ label: '發送時間', value: new Date(notification.value.createdAt).toLocaleString() }],
  notice: notification.value.content
} : { title: loadError.value ? '無法載入消息' : '載入消息中', status: '', icon: notificationIcon(null, ''), time: '', rows: [], notice: '' })

let detailLoaded = false
const loadDetail = async (options?: Record<string, string>) => {
  if (detailLoaded) return
  detailLoaded = true
  const stored = uni.getStorageSync('selected-notification')
  const requestedId = options?.id || ''
  if (requestedId && stored?.id !== requestedId) {
    notification.value = await getNotification(requestedId).catch(() => null)
  }
  if (!notification.value && stored?.id) notification.value = stored as Notification
  if (!notification.value) loadError.value = true
  if (notification.value?.id && !notification.value.readAt) {
    await markNotificationRead(notification.value.id).catch(() => undefined)
    notification.value.readAt = new Date().toISOString()
    uni.setStorageSync('selected-notification', notification.value)
  }
}

onLoad((options) => { void loadDetail(options) })
// The mini-program embeds this page in the home host, where page onLoad does not run.
// #ifdef MP-WEIXIN || MP-TOUTIAO
onMounted(() => { void loadDetail() })
// #endif

const goBack = () => closeCachedPage('/pages/messages/messages')
</script>

<style scoped>
:global(html),:global(body),:global(#app){width:100%;min-width:0;height:100%;margin:0;overflow:hidden;overscroll-behavior:none}.page{position:fixed;top:0;left:0;width:430px;height:var(--mobile-height, 932px);overflow:hidden;border-radius:35px;background:#F0F2F5;color:#38434A;font-family:'Noto Sans TC',sans-serif;transform:scale(var(--mobile-scale, 1));transform-origin:top left}.header{position:absolute;top:0;left:0;width:430px;height:112px;border-radius:25px;background:#fff}.content{position:absolute;top:132px;left:25px;width:380px}.status-card,.detail-card,.notice-card{box-sizing:border-box;border-radius:16px;background:#fff}.status-card{display:flex;height:172px;flex-direction:column;align-items:center;padding-top:20px}.type-icon{width:48px;height:48px}.title{margin-top:10px;font-size:17px;font-weight:700}.status{margin-top:6px;color:#285CFC;font-size:14px;font-weight:600}.time{margin-top:8px;color:#8A939A;font-size:12px}.detail-card{margin-top:14px;padding:5px 18px}.detail-row{display:flex;min-height:52px;align-items:center;justify-content:space-between;border-bottom:1px solid #EEF0F3}.detail-row:last-child{border-bottom:0}.label{color:#7A858D;font-size:14px}.value{max-width:235px;color:#38434A;font-size:14px;font-weight:500;text-align:right}.notice-card{margin-top:14px;padding:18px}.notice-title{display:block;color:#285CFC;font-size:15px;font-weight:700}.notice-text{display:block;margin-top:8px;color:#666;font-size:13px;line-height:21px}

@media (max-width:599px){.page{top:0;left:0;height:var(--mobile-height,100dvh);border-radius:0;transform:scale(var(--mobile-scale, 1));transform-origin:top left}}
</style>
