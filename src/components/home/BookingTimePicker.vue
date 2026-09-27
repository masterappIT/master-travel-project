<template>
  <view class="booking-mask" @tap="close">
    <view class="booking-sheet" @tap.stop>
      <view class="sheet-head"><text class="sheet-title">預約時間</text><text class="sheet-close" @tap="close">×</text></view>
      <view class="picker-labels" aria-hidden="true">
        <text class="picker-label">日期</text>
        <text class="picker-label">小時</text>
        <text class="picker-label">分鐘</text>
      </view>
      <picker-view
        class="booking-picker"
        :value="pickerValue"
        indicator-style="height: 44px; border-top: 1px solid #285cfc; border-bottom: 1px solid #285cfc; background: rgba(40,92,252,.06);"
        mask-style="background: linear-gradient(to bottom, rgba(255,255,255,.98), rgba(255,255,255,.32), rgba(255,255,255,.32), rgba(255,255,255,.98));"
        @change="changePicker"
      >
        <picker-view-column>
          <view v-for="(option, index) in dateOptions" :key="option" class="picker-item" :class="{ 'picker-item-selected': index === dateIndex }">{{ option }}</view>
        </picker-view-column>
        <picker-view-column>
          <view v-for="(option, index) in hourOptions" :key="option" class="picker-item time-item" :class="{ 'picker-item-selected': index === hourIndex }">{{ option }}</view>
        </picker-view-column>
        <picker-view-column>
          <view v-for="(option, index) in minuteOptions" :key="option" class="picker-item time-item" :class="{ 'picker-item-selected': index === minuteIndex }">{{ option }}</view>
        </picker-view-column>
      </picker-view>
      <text class="booking-hint">已選 {{ selectedDate }} {{ selectedTime }} · 最早提前 1 小時</text>
      <button class="confirm-button" @tap="confirm">確認預約時間</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const props = withDefaults(defineProps<{ value?: string }>(), { value: '' })
const emit = defineEmits<{ close: []; confirm: [value: string] }>()
const now = new Date()
const earliest = new Date(now.getTime() + 60 * 60 * 1000)
earliest.setMinutes(Math.ceil(earliest.getMinutes() / 10) * 10, 0, 0)
const sameDay = (left: Date, right: Date) => left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate()
const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
const dates = Array.from({ length: 30 }, (_, index) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + index))
  .filter(date => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999) >= earliest)
const dateOptions = dates.map(date => `${sameDay(date, now) ? '今天 · ' : sameDay(date, tomorrow) ? '明天 · ' : ''}${date.getMonth() + 1}月${date.getDate()}日`)
const requestedDate = props.value ? new Date(props.value) : null
const lastAvailableDate = dates[dates.length - 1]
const initialDate = requestedDate && !Number.isNaN(requestedDate.valueOf()) && requestedDate >= earliest && requestedDate <= new Date(lastAvailableDate.getFullYear(), lastAvailableDate.getMonth(), lastAvailableDate.getDate(), 23, 59, 59, 999)
  ? requestedDate
  : earliest
const initialDateIndex = dates.findIndex(date => sameDay(date, initialDate))
const dateIndex = ref(Math.max(0, initialDateIndex))
const initialFirstMinutes = sameDay(initialDate, earliest) ? earliest.getHours() * 60 + earliest.getMinutes() : 0
const initialMinutes = initialDate.getHours() * 60 + initialDate.getMinutes()
const initialSlotMinutes = Math.min(23 * 60 + 50, Math.max(initialFirstMinutes, Math.ceil(initialMinutes / 10) * 10))
const hourIndex = ref(Math.floor(initialSlotMinutes / 60) - Math.floor(initialFirstMinutes / 60))
const minuteIndex = ref((initialSlotMinutes % 60 - (hourIndex.value === 0 ? initialFirstMinutes % 60 : 0)) / 10)
const hourOptions = computed(() => {
  const firstHour = sameDay(dates[dateIndex.value], earliest) ? earliest.getHours() : 0
  return Array.from({ length: 24 - firstHour }, (_, index) => String(firstHour + index).padStart(2, '0'))
})
const minuteOptions = computed(() => {
  const firstMinute = sameDay(dates[dateIndex.value], earliest) && Number(hourOptions.value[hourIndex.value]) === earliest.getHours()
    ? earliest.getMinutes()
    : 0
  return Array.from({ length: (60 - firstMinute) / 10 }, (_, index) => String(firstMinute + index * 10).padStart(2, '0'))
})
const selectedDate = computed(() => dateOptions[dateIndex.value] || '')
const selectedTime = computed(() => `${hourOptions.value[hourIndex.value] || ''}:${minuteOptions.value[minuteIndex.value] || ''}`)
const pickerValue = computed(() => [dateIndex.value, hourIndex.value, minuteIndex.value])
const changePicker = (event: { detail: { value: number[] } }) => {
  const [nextDateIndex = 0, nextHourIndex = 0, nextMinuteIndex = 0] = event.detail.value
  const dateChanged = nextDateIndex !== dateIndex.value
  const hourChanged = nextHourIndex !== hourIndex.value
  const previousMinute = minuteOptions.value[minuteIndex.value]
  dateIndex.value = nextDateIndex
  hourIndex.value = dateChanged ? 0 : Math.min(nextHourIndex, hourOptions.value.length - 1)
  minuteIndex.value = dateChanged ? 0 : hourChanged
    ? Math.max(0, minuteOptions.value.indexOf(previousMinute))
    : Math.min(nextMinuteIndex, minuteOptions.value.length - 1)
}
const close = () => emit('close')
const confirm = () => {
  const date = dates[dateIndex.value]
  const scheduledAt = new Date(date.getFullYear(), date.getMonth(), date.getDate(), Number(hourOptions.value[hourIndex.value]), Number(minuteOptions.value[minuteIndex.value]))
  emit('confirm', scheduledAt.toISOString())
}
</script>

<style scoped>
.booking-mask{position:absolute;inset:0;z-index:40;background:rgba(20,28,42,.42);display:flex;align-items:flex-end}.booking-sheet{width:430px;height:316px;padding:18px 20px 10px;box-sizing:border-box;border-radius:25px 25px 0 0;background:#fff;color:#38434a;box-shadow:0 -8px 24px rgba(40,53,76,.18);display:flex;flex-direction:column}.sheet-head{display:flex;align-items:center;justify-content:space-between;flex:none}.sheet-title{font-size:20px;font-weight:600}.sheet-close{font-size:28px;line-height:20px;color:#8995a8}.picker-labels{display:flex;margin-top:14px;color:#8995a8;font-size:12px;font-weight:600;line-height:18px}.picker-label{width:33.333%;text-align:center}.booking-picker{width:390px;height:132px;margin-top:2px;flex:none}.picker-item{display:flex;height:44px;align-items:center;justify-content:center;color:#647184;font-size:16px;line-height:44px;text-align:center;transition:color .15s,font-size .15s}.picker-item-selected{color:#285cfc;font-size:17px;font-weight:700}.time-item{font-variant-numeric:tabular-nums;letter-spacing:.3px}.booking-hint{display:block;margin-top:6px;color:#8995a8;font-size:12px;text-align:center;flex:none}.confirm-button{width:181px;height:48px;margin:10px auto 0;border:0;border-radius:12px;background:#285cfc;color:#fff;font-size:16px;line-height:48px;text-align:center;flex:none}.confirm-button::after{border:0}
/* #ifdef H5 */
.booking-mask{position:fixed;justify-content:center}.booking-sheet{width:min(430px,100vw)}.booking-picker{width:100%}
/* #endif */
</style>
