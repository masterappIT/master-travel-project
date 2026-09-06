<template>
  <view class="page" :style="responsiveStyle">
    <view class="header">
      <image class="back" src="/static/wallet/back.svg" mode="aspectFit" @tap="goBack" />
      <text class="title">交易紀錄</text>
      <view class="filter" @tap="openFilter"><text>{{ filterTitle }}</text><image src="/static/transactions/caret-down.svg" mode="aspectFit" /></view>
    </view>
    <view class="month current-month"><text>本月</text><image src="/static/transactions/section-mark.svg" mode="aspectFit" /></view>
    <view class="summary current-summary"><text>支出 HKD$ 0.00</text><view class="summary-divider" /><text>收入 HKD$0.00</text></view>
    <view class="records-card">
      <view class="table-head"><text>類型</text><text>詳細</text><text>金額</text></view>
      <view
        v-for="(record, index) in visibleRecords"
        :key="record.id"
        :class="['record-row', `record-slot-${index}`]"
        @tap="openRecord(record)"
      >
        <image v-if="index < visibleRecords.length - 1" class="row-divider" src="/static/transactions/row-divider.svg" mode="aspectFit" />
        <text class="record-kind">{{ record.kind }}</text>
        <view class="record-detail"><text>{{ record.detail }}</text><text class="record-time">{{ record.time }}</text></view>
        <view :class="['record-amount', record.amountTone]"><text>{{ record.amount }}</text></view>
        <text v-if="record.status" class="record-status">{{ record.status }}</text>
        <text v-if="record.order" class="record-order">{{ record.order }}</text>
      </view>
    </view>
    <view class="month previous-month" :style="previousMonthStyle"><text class="month-number">3</text><text>/2024</text><image src="/static/transactions/section-mark.svg" mode="aspectFit" /></view>
    <view class="summary previous-summary" :style="previousSummaryStyle"><text>支出 HKD$ 0.00</text><view class="summary-divider" /><text>收入 HKD$0.00</text></view>
    <view v-if="filterOpen" class="filter-layer" @tap="closeFilter">
      <image class="filter-mask" src="/static/transactions/filter-overlay.svg" mode="scaleToFill" />
      <view class="filter-sheet" @tap.stop>
        <view class="filter-actions"><view class="filter-action cancel" @tap="closeFilter"><text>取消</text></view><view class="filter-action confirm" @tap="applyFilter"><text>確定</text></view></view>
        <view class="filter-group income-group">
          <text class="filter-label">收支類型</text>
          <view :class="['filter-option', 'income-all-option', { selected: pendingIncomeType === 'all' }]" @tap="pendingIncomeType = 'all'"><text>全部</text></view>
          <view :class="['filter-option', 'income-income-option', { selected: pendingIncomeType === 'income', disabled: !isIncomeTypeAllowed('income') }]" @tap="selectIncomeType('income')"><text>收入</text></view>
          <view :class="['filter-option', 'income-expense-option', { selected: pendingIncomeType === 'expense', disabled: !isIncomeTypeAllowed('expense') }]" @tap="selectIncomeType('expense')"><text>支出</text></view>
        </view>
        <text class="filter-label transaction-label">交易類型</text>
        <view class="transaction-options">
          <view :class="['filter-option', { selected: pendingTransactionType === 'all' }]" @tap="selectTransactionType('all')"><text>全部</text></view>
          <view :class="['filter-option', { selected: pendingTransactionType === 'travel-order' }]" @tap="selectTransactionType('travel-order')"><text>出行訂單</text></view>
          <view :class="['filter-option', { selected: pendingTransactionType === 'withdraw' }]" @tap="selectTransactionType('withdraw')"><text>餘額提現</text></view>
          <view :class="['filter-option', { selected: pendingTransactionType === 'topup' }]" @tap="selectTransactionType('topup')"><text>餘額增值</text></view>
          <view :class="['filter-option', { selected: pendingTransactionType === 'cancel-order' }]" @tap="selectTransactionType('cancel-order')"><text>取消訂單</text></view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { useResponsiveCanvas } from '../../composables/useResponsiveCanvas'
import { cachedPageUrl, closeCachedPage, openCachedPage } from '../../utils/navigation'

const { responsiveStyle } = useResponsiveCanvas()
const filterOpen = ref(false)
const incomeType = ref<'all' | 'income' | 'expense'>('all')
const pendingIncomeType = ref(incomeType.value)
const transactionType = ref<'all' | 'travel-order' | 'withdraw' | 'topup' | 'cancel-order'>('all')
const pendingTransactionType = ref(transactionType.value)
const records = [
  { id: 'topup-success', type: 'topup' as const, kind: '收入', detail: '餘額增值', time: '01/01 12:00:00', amount: '+HKD$1000', amountTone: 'positive' as const, transactionStatus: 'success' as const },
  { id: 'topup-card-failed', type: 'topup' as const, kind: '收入', detail: '餘額增值（信用卡）', time: '01/01 12:00:00', amount: '+HKD$101', amountTone: 'positive' as const, status: '失敗', transactionStatus: 'failed' as const, payment: 'card' as const },
  { id: 'topup-alipay-failed', type: 'topup' as const, kind: '收入', detail: '餘額增值（支付寶）', time: '01/01 12:00:00', amount: '+HKD$101', amountTone: 'positive' as const, status: '失敗', transactionStatus: 'failed' as const, payment: 'alipay' as const },
  { id: 'topup-wechat-failed', type: 'topup' as const, kind: '收入', detail: '餘額增值（微信支付）', time: '01/01 12:00:00', amount: '+HKD$101', amountTone: 'positive' as const, status: '失敗', transactionStatus: 'failed' as const, payment: 'wechat' as const },
  { id: 'cancel-order-success', type: 'cancel-order' as const, kind: '退款', detail: '跨境出行 取消訂單', time: '01/01 12:00:00', amount: '-HKD$1000', amountTone: 'negative' as const, transactionStatus: 'success' as const },
  { id: 'withdraw-success', type: 'withdraw' as const, kind: '提現', detail: '餘額提現', time: '01/01 12:00:00', amount: '+HKD$1000', amountTone: 'positive' as const, status: '已到帳', transactionStatus: 'success' as const },
  { id: 'travel-order-success', type: 'travel-order' as const, kind: '支出', detail: '跨境出行 餘額支付', time: '01/01 12:00:00', amount: '-HKD$1000', amountTone: 'negative' as const, order: '訂單編號：282678634', transactionStatus: 'success' as const },
  { id: 'alipay-withdraw-success', type: 'alipay-withdraw' as const, kind: '提現', detail: '支付寶提現', time: '01/01 12:00:00', amount: '+HKD$1000', amountTone: 'positive' as const, status: '已到帳', transactionStatus: 'success' as const }
]
const readRequestedTransactionType = (url?: string) => {
  const value = url?.match(/[?&]transactionType=([^&#]+)/)?.[1]
  return value === 'travel-order' || value === 'withdraw' || value === 'topup' || value === 'cancel-order'
    ? value
    : 'all'
}
const applyRequestedTransactionType = (url?: string) => {
  const nextType = readRequestedTransactionType(url)
  if (nextType === 'all') return
  transactionType.value = nextType
  pendingTransactionType.value = nextType
  incomeType.value = nextType === 'travel-order' || nextType === 'cancel-order' ? 'expense' : 'all'
  pendingIncomeType.value = incomeType.value
}
onLoad((options) => {
  const nextUrl = options ? `?transactionType=${options.transactionType || ''}` : undefined
  applyRequestedTransactionType(nextUrl)
})
onMounted(() => {
  if (typeof window !== 'undefined' && !cachedPageUrl.value.includes('/pages/transactions/transactions')) {
    applyRequestedTransactionType(window.location.hash)
  }
})
onShow(() => {
  if (typeof window !== 'undefined' && !cachedPageUrl.value.includes('/pages/transactions/transactions')) {
    applyRequestedTransactionType(window.location.hash)
  }
})
watch(cachedPageUrl, (url) => {
  if (url.includes('/pages/transactions/transactions')) {
    applyRequestedTransactionType(url)
  }
}, { immediate: true })
const filterTitle = computed(() => {
  if (incomeType.value === 'all' && transactionType.value === 'all') return '全部紀錄'
  if (transactionType.value !== 'all') {
    return { 'travel-order': '出行訂單', withdraw: '餘額提現', topup: '餘額增值', 'cancel-order': '取消訂單' }[transactionType.value]
  }
  return incomeType.value === 'income' ? '收入紀錄' : '支出紀錄'
})
const visibleRecords = computed(() => records.filter((record) => isRecordVisible(record.type)))
const previousMonthTop = computed(() => {
  const rowHeights = [60, 60, 60, 60, 60]
  const cardHeight = 40 + (visibleRecords.value.length ? 12 : 0)
    + visibleRecords.value.reduce((height, _, index) => height + (rowHeights[index] ?? 60), 0)
  return `${243 + cardHeight + 20}px`
})
const previousMonthStyle = computed(() => ({ top: previousMonthTop.value }))
const previousSummaryStyle = computed(() => ({ top: `${Number.parseFloat(previousMonthTop.value) + 34}px` }))
const goBack = () => openCachedPage('/pages/wallet/wallet')
const openTopUpDetail = () => openCachedPage('/pages/top-up/detail/detail')
const openFailureDetail = (amount: string, payment: 'card' | 'alipay' | 'wechat') => openCachedPage(`/pages/top-up/detail/detail?status=failed&amount=${encodeURIComponent(amount.replace(/[^\d.]/g, ''))}&payment=${payment}`)
const openWithdrawDetail = () => openCachedPage('/pages/withdraw/detail')
const openAlipayDetail = () => openCachedPage('/pages/withdraw/alipay-detail')
const openRefundDetail = () => openCachedPage('/pages/refund/detail')
const openExpenseDetail = () => openCachedPage('/pages/transactions/expense-detail')
const openRecord = (record: typeof records[number]) => {
  if (record.transactionStatus === 'failed') {
    openFailureDetail(record.amount, record.payment)
    return
  }
  const { type } = record
  if (type === 'topup') openTopUpDetail()
  else if (type === 'cancel-order') openRefundDetail()
  else if (type === 'withdraw') openWithdrawDetail()
  else if (type === 'alipay-withdraw') openAlipayDetail()
  else openExpenseDetail()
}
const openFilter = () => {
  pendingIncomeType.value = incomeType.value
  pendingTransactionType.value = transactionType.value
  filterOpen.value = true
}
const transactionIncomeType = (type: typeof pendingTransactionType.value) => {
  if (type === 'travel-order' || type === 'cancel-order') return 'expense'
  if (type === 'withdraw' || type === 'alipay-withdraw' || type === 'topup') return 'income'
  return 'all'
}
const isIncomeTypeAllowed = (type: 'income' | 'expense') => {
  if (pendingTransactionType.value === 'all') return true
  return transactionIncomeType(pendingTransactionType.value) === type
}
const selectIncomeType = (type: 'income' | 'expense') => {
  if (isIncomeTypeAllowed(type)) pendingIncomeType.value = type
}
const selectTransactionType = (type: typeof pendingTransactionType.value) => {
  pendingTransactionType.value = type
  const relatedIncomeType = transactionIncomeType(type)
  if (relatedIncomeType !== 'all') pendingIncomeType.value = relatedIncomeType
}
const closeFilter = () => { filterOpen.value = false }
const applyFilter = () => {
  incomeType.value = pendingIncomeType.value
  transactionType.value = pendingTransactionType.value
  filterOpen.value = false
}
const isRecordVisible = (type: typeof records[number]['type']) => {
  const incomeMatches = incomeType.value === 'all'
    || (incomeType.value === 'income' && (type === 'topup' || type === 'withdraw' || type === 'alipay-withdraw'))
    || (incomeType.value === 'expense' && (type === 'cancel-order' || type === 'travel-order'))
  const transactionMatches = transactionType.value === 'all'
    || (transactionType.value === 'withdraw' && (type === 'withdraw' || type === 'alipay-withdraw'))
    || transactionType.value === type
  return incomeMatches && transactionMatches
}
</script>

<style scoped>
:global(html),:global(body),:global(#app){width:100%;min-width:0;height:100%;margin:0;overflow:hidden}.page{position:fixed;top:50%;left:50%;width:430px;height:932px;overflow:hidden;border-radius:35px;background:#F0F2F5;color:#38434A;font-family:'Noto Sans TC',sans-serif;transform:translate(-50%,-50%) scale(min(1,calc(100vw / 430px),calc(100dvh / 932px)));transform-origin:center}.header{position:absolute;top:0;left:0;width:430px;height:155px;overflow:hidden;border-radius:25px;background:#fff}.back{position:absolute;top:53px;left:26px;width:26px;height:39px;padding:7px;box-sizing:border-box}.title{position:absolute;top:58px;left:calc(50% - 36px);font-size:18px;font-weight:500;line-height:normal;white-space:nowrap}.filter{position:absolute;top:112px;left:33px;display:flex;align-items:center;gap:5px;padding:5px 10px;border-radius:25px;background:#F0F2F5;font-size:16px;font-weight:500;line-height:normal;white-space:nowrap}.filter image{width:18px;height:18px;flex:none}.month{position:absolute;left:33px;height:29px;font-size:16px;font-weight:700;line-height:normal;white-space:nowrap}.current-month{top:175px;width:51.773px;height:23px}.previous-month{top:568px;width:75.773px}.month image{position:absolute;right:0;top:10px;width:14.773px;height:6.537px}.previous-month image{top:15px}.month-number{font-size:20px}.summary{position:absolute;left:33px;width:auto;height:24px;display:flex;align-items:center;gap:10px;font-size:14px;line-height:normal;white-space:nowrap}.summary>text{position:static;display:block;width:auto;white-space:nowrap!important;line-height:1.65}.summary-divider{position:static;width:1px;height:20px;margin:0;background:#38434A;flex:none}.current-summary{top:203px}.previous-summary{top:602px}.records-card{position:absolute;top:243px;left:15px;width:400px;height:auto;min-height:40px;padding-top:40px;box-sizing:border-box;overflow:hidden;border-radius:10px;background:#fff}.table-head{position:absolute;top:0;left:0;width:400px;height:40px;overflow:hidden;border:1px solid #1097D5;border-radius:10px;box-sizing:border-box;font-size:12px;font-weight:500;line-height:normal;white-space:nowrap}.table-head text{position:absolute;top:12px}.table-head text:nth-child(1){left:29px}.table-head text:nth-child(2){left:107px}.table-head text:nth-child(3){left:347px}.record-row{position:relative;left:30px;width:359px;height:60px;font-weight:500;line-height:normal;white-space:nowrap}.record-slot-0{margin-top:12px}.record-slot-2,.record-slot-3{height:60px}.row-divider{position:absolute;top:48px;left:-20px;width:380px;height:1px}.record-kind{position:absolute;top:8px;left:0;font-size:14px}.record-detail{position:absolute;top:0;left:78px;width:210px;height:36px;overflow:visible;display:flex;flex-direction:column;gap:12px;font-size:12px}.record-detail>text{display:block;position:static;width:210px;white-space:nowrap}.record-time{width:120px;font-size:10px;font-weight:400;white-space:nowrap}.record-amount{position:absolute;top:8px;left:auto;right:4px;width:125px;font-size:14px;text-align:right;white-space:nowrap}.record-status{position:absolute;top:28px;right:17px;width:50px;color:#38434A;font-size:10px;text-align:center;white-space:nowrap}.record-order{position:absolute;top:28px;right:6px;width:125px;color:#38434A;font-size:10px;text-align:right;white-space:nowrap}.positive{color:#285CFC}.negative{color:#F95C5C}.filter-layer{position:absolute;inset:0;z-index:20;background:rgba(56,67,74,.5)}.filter-mask{display:none}.filter-sheet{position:absolute;left:0;bottom:0;width:430px;height:512px;border-radius:25px 25px 0 0;background:#fff;color:#38434A}.filter-label{position:absolute;font-size:16px;font-weight:350;line-height:normal;white-space:nowrap}.income-group,.transaction-options{position:absolute;left:22px;width:386px;height:116px}.income-group{top:100px}.transaction-options{top:211px;display:flex;flex-wrap:wrap;column-gap:10px;row-gap:20px}.income-group .filter-label{top:-43px;left:0}.transaction-label{top:168px;left:23px}.filter-option{position:absolute;width:122px;height:48px;border-radius:10px;background:#F0F2F5;font-size:14px;font-weight:500;line-height:48px;text-align:center;white-space:nowrap}.filter-option.selected{background:rgba(4,161,58,.2);border:1px solid #04A13A;box-sizing:border-box;color:#04A13A;line-height:46px}.filter-option.disabled{opacity:.45}.income-all-option{left:0}.income-income-option{left:132px}.income-expense-option{left:264px}.transaction-options .filter-option{position:relative;flex:none}.filter-actions{position:absolute;left:85px;top:369px;width:259px;height:48px}.filter-action{position:absolute;top:0;width:122px;height:48px;border-radius:10px;font-size:14px;font-weight:500;line-height:48px;text-align:center;white-space:nowrap}.filter-action.cancel{left:0;background:#F0F2F5}.filter-action.confirm{left:137px;background:#285CFC;color:#fff}@media(max-width:599px){.page{top:0;left:0;height:var(--mobile-height,100dvh);border-radius:0;transform:scale(var(--mobile-scale,1));transform-origin:top left}}
</style>
