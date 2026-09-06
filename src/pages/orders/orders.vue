<template>
  <view class="page" :style="responsiveStyle">
    <view class="header">
      <OrdersBackButton @tap="goBack" />
      <text class="title">全部訂單</text>
      <view class="tabs">
        <view v-for="tab in tabs" :key="tab.value" :class="['tab', { active: activeTab === tab.value }]" @tap="activeTab = tab.value">
          <text>{{ tab.label }}</text><image v-if="activeTab === tab.value" src="/static/orders/tab-line.svg" mode="fill" />
        </view>
      </view>
    </view>
    <scroll-view class="content" scroll-y :show-scrollbar="false">
      <text class="date">2024年3月15日</text>
      <view class="orders-list">
        <view v-for="order in visibleOrders" :key="order.id" class="order-card" @tap="openOrder(order)">
          <view class="status"><image :src="statusIcon(order.status)" mode="aspectFit" /><text :class="{ 'in-progress': order.status === '進行中', 'pending-status': order.status === '待確認', 'cancelled-status': order.status === '取消', 'traveling-status': order.status === '待出行' }">{{ order.status }}</text></view>
          <text v-if="order.countdown" class="countdown">交易時間剩餘：{{ order.countdown }}</text>
          <view v-if="order.payment && order.status !== '取消'" :class="['payment', { refunded: order.payment === '已退款' }]">{{ order.payment }}</view>
          <text v-else class="price">RMB¥800.00</text>
          <view class="route"><text>香港</text><image src="/static/orders/route-arrow.svg" mode="aspectFit" /><text>深圳</text><text :class="['order-kind', { urgent: order.kind === '加急訂單' }]">（{{ order.kind }}）</text></view>
          <text class="pickup">上車時間 ：2024年3月15日 14:00</text>
          <text class="arrival">{{ order.status === '已完成' ? '到達時間' : '預計到達時間' }} ：2024年3月15日 14:00</text>
          <view class="divider" /><text class="vehicle">高級跨境商務車（7座）</text>
        </view>
      </view><view class="bottom-space" />
    </scroll-view>
  </view>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useResponsiveCanvas } from '../../composables/useResponsiveCanvas'
import { openCachedPage } from '../../utils/navigation'
import { usePendingOrderStatus } from '../../utils/pendingOrderStatus'
import OrdersBackButton from '../../components/orders/OrdersBackButton.vue'
type Tab = 'all' | 'completed' | 'cancelled'
type OrderStatus = '已完成' | '待確認' | '待出行' | '取消' | '進行中'
interface Order { id: number; status: OrderStatus; kind: '加急訂單' | '預約訂單'; countdown?: string; payment?: '待付款' | '已退款' | '不需退款' }
const { responsiveStyle } = useResponsiveCanvas()
const { status: pendingOrderStatus, readStoredStatus } = usePendingOrderStatus()
readStoredStatus()
const activeTab = ref<Tab>('all')
const tabs: Array<{ label: string; value: Tab }> = [{ label: '全部', value: 'all' }, { label: '已完成', value: 'completed' }, { label: '取消', value: 'cancelled' }]
const orders = computed<Order[]>(() => [
  { id: 1, status: '已完成', kind: '加急訂單' },
  { id: 2, status: pendingOrderStatus.value, kind: '預約訂單', countdown: pendingOrderStatus.value === '待確認' ? '05:00' : undefined, payment: pendingOrderStatus.value === '待確認' ? '待付款' : '不需退款' },
  { id: 3, status: '待出行', kind: '預約訂單' },
  { id: 4, status: '取消', kind: '預約訂單', payment: '不需退款' },
  { id: 5, status: '進行中', kind: '預約訂單' }
])
const visibleOrders = computed(() => activeTab.value === 'completed' ? orders.value.filter((order) => order.status === '已完成') : activeTab.value === 'cancelled' ? orders.value.filter((order) => order.status === '取消') : orders.value)
const statusIcon = (status: OrderStatus) => status === '進行中' ? '/static/orders/status-green.svg' : status === '已完成' || status === '待出行' ? '/static/orders/status-blue.svg' : status === '待確認' ? '/static/orders/status-pending.svg' : '/static/orders/status-gray.svg'
const openOrder = (order: Order) => {
  if (order.status === '已完成' || order.status === '取消' || order.status === '待確認' || order.status === '待出行') {
    if (order.status === '取消') return openCachedPage('/pages/orders/cancelled-detail')
      if (order.status === '待確認') return openCachedPage('/pages/orders/pending-detail')
      const detailStatus = order.status === '已完成' ? 'completed' : 'traveling'
    openCachedPage(`/pages/orders/detail?status=${detailStatus}`)
  }
}
const goBack = () => openCachedPage('/pages/trips/trips')
</script>
<style scoped>
:global(html),:global(body),:global(#app){width:100%;min-width:0;height:100%;margin:0;overflow:hidden;overscroll-behavior:none}.page{position:fixed;top:50%;left:50%;width:430px;height:932px;overflow:hidden;border-radius:35px;background:#f0f2f5;color:#38434a;font-family:'Noto Sans TC',sans-serif;transform:translate(-50%,-50%) scale(min(1,calc(100vw / 430px),calc(100dvh / 932px)));transform-origin:center}.header{position:absolute;z-index:2;top:0;left:0;width:430px;height:155px;overflow:hidden;border-radius:25px;background:#fff}.title{position:absolute;top:56px;left:50%;transform:translateX(-50%);font-size:18px;font-weight:500;line-height:27px;white-space:nowrap}.tabs{position:absolute;top:123px;left:49px;width:332px;height:32px;display:flex;justify-content:space-between}.tab{position:relative;height:32px;color:#38434a;font-size:16px;font-weight:700;line-height:23px}.tab.active{color:#285cfc}.tab image{position:absolute;bottom:0;left:50%;width:32px;height:2px;transform:translateX(-50%)}.content{position:absolute;top:155px;left:0;width:430px;height:calc(100% - 155px)}.date{display:block;height:23px;margin:6px 0 10px 17px;font-size:16px;line-height:23px}.orders-list{display:flex;flex-direction:column;gap:10px}.order-card{position:relative;width:430px;height:240px;flex:none;overflow:hidden;background:#fff;font-size:14px}.status{position:absolute;top:21px;left:30px;height:25px;display:flex;align-items:center;gap:5px;color:#285cfc;font-size:16px;font-weight:700}.status image{width:25px;height:25px}.status .in-progress{color:#1effaa}.status .pending-status,.status .cancelled-status{color:#38434a}.status .traveling-status{color:#285cfc}.countdown{position:absolute;top:24px;right:108px;font-weight:300;line-height:20px;white-space:nowrap}.payment{position:absolute;top:19px;right:30px;padding:5px 10px;border:1px solid #f95c5c;border-radius:10px;box-sizing:border-box;color:#f95c5c;font-weight:700;line-height:20px}.payment.refunded{border-color:#38434a;color:#38434a;font-weight:400}.price{position:absolute;top:23px;right:30px;color:#285cfc;font-weight:700;line-height:20px}.route{position:absolute;top:57px;left:72px;height:25px;display:flex;align-items:center;gap:15px;line-height:20px}.route image{width:25px;height:25px}.order-kind{margin-left:1px}.order-kind.urgent{color:#f95c5c}.pickup,.arrival,.vehicle{position:absolute;left:70px;line-height:20px;white-space:nowrap}.pickup{top:89px}.arrival{top:114px}.divider{position:absolute;top:162px;left:30px;width:370px;height:1px;background:#d9d9d9}.vehicle{top:170px;color:#000;font-weight:300}.bottom-space{height:12px}@media (max-width:599px){.page{top:0;left:0;height:var(--mobile-height,100dvh);border-radius:0;transform:scale(var(--mobile-scale,1));transform-origin:top left}}
</style>
