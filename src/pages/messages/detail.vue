<template>
  <view class="page" :style="responsiveStyle">
    <view class="header">
      <image class="back" src="/static/messages/back.svg" mode="aspectFit" @tap="goBack" />
      <text class="header-title">消息詳情</text>
    </view>

    <view class="content">
      <view class="status-card">
        <image class="type-icon" :src="detail.icon" mode="aspectFit" />
        <text class="title">{{ detail.title }}</text>
        <text class="status">{{ detail.status }}</text>
        <text class="time">2024年1月1日 10:30</text>
      </view>

      <view class="detail-card">
        <view v-for="row in detail.rows" :key="row.label" class="detail-row">
          <text class="label">{{ row.label }}</text>
          <text class="value">{{ row.value }}</text>
        </view>
      </view>

      <view class="notice-card">
        <text class="notice-title">溫馨提示</text>
        <text class="notice-text">{{ detail.notice }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { useResponsiveCanvas } from '../../composables/useResponsiveCanvas'

import { closeCachedPage } from '../../utils/navigation'
import { computed, ref } from 'vue'
import { formatCurrencyAmount } from '../../composables/useCurrency'
import { onLoad } from '@dcloudio/uni-app'
import type { Notification } from '../../services/api'

type MessageType = 'order' | 'top-up' | 'withdrawal' | 'refund'

const hkd = (amount: number) => formatCurrencyAmount(amount, 'HKD')

const details = {
  order: {
    title: '您的跨境出行訂單已確認',
    status: '訂單已確認',
    icon: '/static/messages/order.svg',
    rows: [
      { label: '訂單編號', value: 'A82678634' },
      { label: '出發地', value: '香港' },
      { label: '目的地', value: '深圳機場' },
      { label: '出發時間', value: '2024年3月15日 10:30' },
      { label: '訂單狀態', value: '司機接單中' }
    ],
    notice: '司機資料確認後將透過消息通知，請留意最新行程狀態。'
  },
  'top-up': {
    title: '您的餘額增值已到帳',
    status: '增值成功',
    icon: '/static/messages/top-up.svg',
    rows: [
      { label: '交易編號', value: 'TOP282678634' },
      { label: '增值金額', value: hkd(500) },
      { label: '付款方式', value: '信用卡' },
      { label: '到帳時間', value: '2024年1月1日 10:30' },
      { label: '錢包餘額', value: hkd(500) }
    ],
    notice: '增值金額已存入您的錢包，可於下次行程付款時使用。'
  },
  withdrawal: {
    title: '您的餘額提現已到帳',
    status: '提現成功',
    icon: '/static/messages/wallet.svg',
    rows: [
      { label: '交易編號', value: 'OUT282678634' },
      { label: '提現金額', value: hkd(500) },
      { label: '收款方式', value: '銀行帳戶' },
      { label: '到帳時間', value: '2024年1月1日 10:30' },
      { label: '錢包餘額', value: hkd(0) }
    ],
    notice: '款項已轉入指定收款帳戶，實際入帳時間以銀行處理進度為準。'
  },
  refund: {
    title: '您的訂單退款已到帳',
    status: '退款成功',
    icon: '/static/messages/wallet.svg',
    rows: [
      { label: '訂單編號', value: 'A82678634' },
      { label: '行程', value: '香港 - 深圳機場' },
      { label: '退款金額', value: hkd(320) },
      { label: '退款方式', value: '原付款方式' },
      { label: '到帳時間', value: '2024年1月1日 10:30' }
    ],
    notice: '退款已按原付款方式退回，實際到帳時間以支付機構為準。'
  }
} as const

const requestedType = uni.getStorageSync('selected-message-type') as MessageType
const type = ref<MessageType>(requestedType && requestedType in details ? requestedType : 'order')
const { responsiveStyle } = useResponsiveCanvas()

const notification = ref<Notification | null>(null)
const detail = computed(() => notification.value ? {
  title: notification.value.title,
  status: notification.value.readAt ? '已讀' : '新消息',
  icon: '/static/messages/top-up.svg',
  rows: [{ label: '受眾', value: notification.value.audience.includes('DRIVER') ? '司機端' : '用戶端' }, { label: '發送時間', value: new Date(notification.value.createdAt).toLocaleString() }],
  notice: notification.value.content
} : details[type.value])

onLoad((options) => {
  const stored = uni.getStorageSync('selected-notification')
  if (stored?.id) notification.value = stored as Notification
  const requestedType = options?.type as MessageType
  if (requestedType && requestedType in details) type.value = requestedType
})

const goBack = () => closeCachedPage('/pages/messages/messages')
</script>

<style scoped>
:global(html),:global(body),:global(#app){width:100%;min-width:0;height:100%;margin:0;overflow:hidden;overscroll-behavior:none}.page{position:fixed;top:0;left:0;width:430px;height:var(--mobile-height, 932px);overflow:hidden;border-radius:35px;background:#F0F2F5;color:#38434A;font-family:'Noto Sans TC',sans-serif;transform:scale(var(--mobile-scale, 1));transform-origin:top left}.header{position:absolute;top:0;left:0;width:430px;height:112px;border-radius:25px;background:#fff}.back{position:absolute;top:53px;left:26px;width:26px;height:39px;padding:7px;box-sizing:border-box}.header-title{position:absolute;top:56px;left:50%;transform:translateX(-50%);font-size:18px;font-weight:500;white-space:nowrap}.content{position:absolute;top:132px;left:25px;width:380px}.status-card,.detail-card,.notice-card{box-sizing:border-box;border-radius:16px;background:#fff}.status-card{display:flex;height:172px;flex-direction:column;align-items:center;padding-top:20px}.type-icon{width:48px;height:48px}.title{margin-top:10px;font-size:17px;font-weight:700}.status{margin-top:6px;color:#285CFC;font-size:14px;font-weight:600}.time{margin-top:8px;color:#8A939A;font-size:12px}.detail-card{margin-top:14px;padding:5px 18px}.detail-row{display:flex;min-height:52px;align-items:center;justify-content:space-between;border-bottom:1px solid #EEF0F3}.detail-row:last-child{border-bottom:0}.label{color:#7A858D;font-size:14px}.value{max-width:235px;color:#38434A;font-size:14px;font-weight:500;text-align:right}.notice-card{margin-top:14px;padding:18px}.notice-title{display:block;color:#285CFC;font-size:15px;font-weight:700}.notice-text{display:block;margin-top:8px;color:#666;font-size:13px;line-height:21px}

@media (max-width:599px){.page{top:0;left:0;height:var(--mobile-height,100dvh);border-radius:0;transform:scale(var(--mobile-scale, 1));transform-origin:top left}}
</style>
