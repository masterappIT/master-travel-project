<template>
  <view class="edit-mask" @tap="handleMaskTap">
    <view class="edit-sheet" @tap.stop>
      <image class="sheet-logo" src="/static/vehicles/edit/logo.svg" mode="aspectFit" />
      <view class="route-field" @tap="openAddressPicker('origin')">
        <image src="/static/vehicles/edit/origin.svg" mode="aspectFit" />
        <text class="route-value">{{ draftOrigin }}</text>
      </view>
      <view class="route-field" @tap="openAddressPicker('destination')">
        <image src="/static/vehicles/edit/destination.svg" mode="aspectFit" />
        <text class="route-value">{{ draftDestination }}</text>
      </view>
      <view class="date-time-row">
        <view class="date-time-field" @tap="openTimePicker"><text class="field-label">日期</text><text class="field-value date-value">{{ draftDate }}</text></view>
        <view class="date-time-field" @tap="openTimePicker"><text class="field-label">時間</text><text class="field-value">{{ draftTime }}</text></view>
      </view>
      <view class="action-row"><button class="cancel-button" @tap="cancel">取消</button><button class="confirm-button" @tap="confirm">完成修改</button></view>
    </view>
    <BookingTimePicker v-if="timePickerOpen" :value="draftDepartureTime" @close="timePickerOpen = false" @confirm="updateTime" />
    <AddressPicker
      v-if="addressPicker"
      :selecting="addressPicker"
      location-label="香港 · 油尖旺區"
      detailed-address="香港九龍站附近"
      :initial-selection="addressPicker === 'origin' ? originSelection : destinationSelection"
      @close="addressPicker = null"
      @select="selectAddress"
      @locate="showLocationUnavailable"
      @use-current="useCurrentLocation"
    />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import BookingTimePicker from './BookingTimePicker.vue'
import AddressPicker, { type AddressSelection } from './AddressPicker.vue'

const props = defineProps<{
  origin: string
  destination: string
  departureTime: string
  originSelection?: AddressSelection | null
  destinationSelection?: AddressSelection | null
}>()
const emit = defineEmits<{
  close: []
  confirm: [origin: string, destination: string, departureTime: string, originSelection: AddressSelection | null, destinationSelection: AddressSelection | null]
}>()
const draftOrigin = ref(props.origin)
const draftDestination = ref(props.destination)
const draftDepartureTime = ref(props.departureTime)
const originSelection = ref<AddressSelection | null>(props.originSelection || null)
const destinationSelection = ref<AddressSelection | null>(props.destinationSelection || null)
const timePickerOpen = ref(false)
const addressPicker = ref<'origin' | 'destination' | null>(null)
const parsedDepartureTime = computed(() => {
  if (!draftDepartureTime.value) return null
  const date = new Date(draftDepartureTime.value)
  return Number.isNaN(date.valueOf()) ? null : date
})
const draftDate = computed(() => {
  const date = parsedDepartureTime.value
  return date ? `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日` : '選擇日期'
})
const draftTime = computed(() => {
  const date = parsedDepartureTime.value
  return date ? `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}` : '選擇時間'
})
const openAddressPicker = (type: 'origin' | 'destination') => { addressPicker.value = type }
const selectAddress = (value: string, selection: AddressSelection) => {
  if (addressPicker.value === 'origin') {
    draftOrigin.value = value
    originSelection.value = selection
  }
  if (addressPicker.value === 'destination') {
    draftDestination.value = value
    destinationSelection.value = selection
  }
  addressPicker.value = null
}
const useCurrentLocation = () => {
  if (addressPicker.value === 'origin') {
    draftOrigin.value = '香港九龍站附近'
    originSelection.value = null
  }
  if (addressPicker.value === 'destination') {
    draftDestination.value = '香港九龍站附近'
    destinationSelection.value = null
  }
  addressPicker.value = null
}
const showLocationUnavailable = () => uni.showToast({ title: '定位功能暫時不可用', icon: 'none' })
const openTimePicker = () => { timePickerOpen.value = true }
const updateTime = (value: string) => { draftDepartureTime.value = value; timePickerOpen.value = false }
const cancel = () => emit('close')
const handleMaskTap = () => {
  if (!timePickerOpen.value && !addressPicker.value) cancel()
}
const confirm = () => {
  const origin = draftOrigin.value.trim()
  const destination = draftDestination.value.trim()
  if (!origin || !destination) {
    uni.showToast({ title: '請填寫出發地及目的地', icon: 'none' })
    return
  }
  emit('confirm', origin, destination, draftDepartureTime.value, originSelection.value, destinationSelection.value)
}
</script>

<style scoped>
.edit-mask{position:absolute;inset:0;z-index:30;background:rgba(56,67,74,.8)}
.edit-sheet{position:absolute;top:0;left:0;width:430px;height:500px;box-sizing:border-box;padding-top:149px;border-radius:35px 35px 25px 25px;background:#56657e;color:#fff;box-shadow:0 4px 4px rgba(0,0,0,.25);overflow:hidden;animation:slide-down .28s ease-out both}
.sheet-logo{position:absolute;top:64px;left:190px;width:49.133px;height:38px}
.route-field,.date-time-field{box-sizing:border-box;border:1px solid #d9d9d9;border-radius:10px}.route-field{width:380px;height:57px;margin:0 auto 19px;display:flex;align-items:center;padding:0 32px;gap:20px}.route-field image{width:15px;height:27.22px;flex:none}.route-field:nth-of-type(3) image{height:22.458px}.route-value{overflow:hidden;min-width:0;flex:1;color:#fff;font-size:18px;font-weight:300;line-height:55px;white-space:nowrap;text-overflow:ellipsis}.route-input{height:55px;min-width:0;flex:1;color:#fff;font-size:18px;font-weight:300;line-height:55px}.date-time-row{display:flex;gap:10px;margin:18px 25px 0}.date-time-field{width:185px;height:69px;padding:4px 20px;display:flex;flex-direction:column;justify-content:space-between;font-size:16px}.field-label{font-size:12px;font-weight:200}.field-value{overflow:hidden;line-height:24px;white-space:nowrap;text-overflow:ellipsis;font-variant-numeric:tabular-nums}.date-value{font-size:15px}.action-row{display:flex;gap:10px;width:370px;margin:30px auto 0}.action-row button{width:180px;height:60px;padding:0;border:0;border-radius:25px;color:#38434a;font-size:18px;font-weight:700;line-height:60px}.action-row button::after{border:0}.cancel-button{background:#d9d9d9}.confirm-button{background:#1effaa}@keyframes slide-down{from{transform:translateY(-100%)}to{transform:translateY(0)}}
</style>
