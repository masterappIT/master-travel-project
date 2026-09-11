<template>
  <view class="route-panel" :class="{ 'airport-mode': mode === 'airport', 'cross-border-mode': mode === 'cross-border' }" aria-label="路線查詢">
    <image
      class="panel-surface"
      :src="mode === 'airport' ? '/static/home/route/airport-panel.svg' : '/static/home/route/cross-panel.svg'"
      mode="scaleToFill"
    />

    <view class="ride-tab cross-border" @tap="$emit('update:mode', 'cross-border')">
      <image class="ride-tab-icon" :src="mode === 'cross-border' ? '/static/home/route/cross-active.svg' : '/static/home/route/cross-inactive.svg'" mode="scaleToFill" />
      <text>{{ '跨境出行' }}</text>
    </view>
    <view class="ride-tab airport" @tap="$emit('update:mode', 'airport')">
      <image class="ride-tab-icon" :src="mode === 'airport' ? '/static/home/route/airport-active.svg' : '/static/home/route/airport-inactive.svg'" mode="scaleToFill" />
      <text>{{ '接送機' }}</text>
    </view>

    <view v-if="mode === 'cross-border'" class="cross-fields">
      <view class="route-field" @tap="$emit('origin')">
        <image class="origin-icon" src="/static/home/route/origin.svg" mode="scaleToFill" />
        <text>{{ formatRouteValue(origin, '出發地') }}</text>
      </view>
      <view class="route-field destination-field" @tap="$emit('destination')">
        <image class="destination-icon" src="/static/home/route/destination.svg" mode="scaleToFill" />
        <text>{{ formatRouteValue(destination, '目的地') }}</text>
      </view>
      <view class="route-field time-field" @tap="$emit('departure-time')">
        <image class="time-icon" src="/static/home/route/time.svg" mode="scaleToFill" />
        <text>{{ formattedDepartureTime }}</text>
      </view>
    </view>

    <view v-else class="airport-fields">
      <view class="route-field flight-field">
        <image class="flight-icon" src="/static/home/route/flight.svg" mode="scaleToFill" />
        <input class="flight-input" :value="flightNumber" type="text" placeholder="航班號" maxlength="8" confirm-type="done" @input="handleFlightInput" />
      </view>
      <view class="route-field airport-origin-field" @tap="$emit('origin')">
        <image class="origin-icon" src="/static/home/route/airport-origin.svg" mode="scaleToFill" />
        <text>{{ formatRouteValue(origin, '出發地') }}</text>
      </view>
      <view class="route-field airport-destination-field" @tap="$emit('destination')">
        <image class="destination-icon" src="/static/home/route/airport-destination.svg" mode="scaleToFill" />
        <text>{{ formatRouteValue(destination, '目的地') }}</text>
      </view>
      <view class="route-field airport-time-field" @tap="$emit('departure-time')">
        <image class="time-icon" src="/static/home/route/airport-time.svg" mode="scaleToFill" />
        <text>{{ formattedDepartureTime }}</text>
      </view>
    </view>

  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type TravelMode = 'cross-border' | 'airport'

const props = withDefaults(defineProps<{
  mode?: TravelMode
  origin?: string
  destination?: string
  departureTime?: string
  flightNumber?: string
}>(), {
  mode: 'cross-border',
  origin: '',
  destination: '',
  departureTime: '',
  flightNumber: ''
})

const emit = defineEmits<{
  'update:mode': [mode: TravelMode]
  origin: []
  destination: []
  'departure-time': []
  'update:flight-number': [value: string]
}>()

const formattedDepartureTime = computed(() => {
  if (!props.departureTime) return '預約時間'
  const date = new Date(props.departureTime)
  if (Number.isNaN(date.valueOf())) return props.departureTime
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
})

const formatRouteValue = (value: string | undefined, placeholder: string) => {
  const maxLength = 18
  if (!value) return placeholder
  const characters = Array.from(value)
  if (characters.length <= maxLength) return value
  return `${characters.slice(0, maxLength - 3).join('')}...`
}

const handleFlightInput = (event: { detail: { value: string } }) => {
  const value = event.detail.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
  emit('update:flight-number', value)
  return value
}
</script>

<style scoped>
.route-panel{position:absolute;left:50%;top:586px;width:430px;height:331px;z-index:3;overflow:hidden;border-radius:25px;background:#56657e;color:#38434a;transform:translateX(-50%)}.panel-surface{position:absolute;left:0;bottom:0;width:430px;height:331px}.cross-border-mode .panel-surface{transform:scaleX(-1)}.ride-tab{position:absolute;top:8px;height:30px;display:flex;align-items:center;color:#fff;font-family:'Inria Sans','Noto Sans TC',sans-serif;font-size:16px;font-style:normal;font-weight:700;line-height:normal;cursor:pointer}.ride-tab-icon{width:30px;height:30px;margin-right:8px}.cross-border{left:63px;width:102px}.airport{left:286px;width:86px}.cross-border-mode .cross-border{color:#285cfc}.airport-mode .airport{left:260px;color:#285cfc}.airport-mode .cross-border{left:62px}.route-field{position:absolute;box-sizing:border-box;overflow:hidden;border:1px solid #d9d9d9;border-radius:2px;display:flex;align-items:center;justify-content:center;font-family:'Noto Sans TC',sans-serif;font-size:16px;font-weight:350;line-height:normal}.route-field>text{display:block;max-width:calc(100% - 64px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.cross-fields{position:absolute;left:15px;top:90px;width:400px;height:140px}.cross-fields .route-field{left:0;top:0;width:400px;height:40px}.cross-fields .destination-field{top:45px}.cross-fields .time-field{left:28px;top:100px;width:350px;height:38px}.origin-icon,.destination-icon,.flight-icon,.time-icon{position:absolute}.origin-icon{left:37px;width:10px;height:18.146px}.destination-icon{left:37px;width:10px;height:14.972px}.time-icon{left:10px;top:10px;width:16px;height:16px}.airport-fields{position:absolute;left:15px;top:60px;width:400px;height:180px}.airport-fields .route-field{left:0;width:400px;height:40px}.flight-field{top:0}.flight-icon{left:38px;width:15px;height:15px}.flight-input{width:100%;height:40px;padding:0 38px;box-sizing:border-box;border:0;background:transparent;color:#38434a;font-family:'Noto Sans TC',sans-serif;font-size:16px;font-weight:350;text-align:center}.flight-input::placeholder{color:#38434a}.airport-origin-field{top:45px}.airport-destination-field{top:90px}.airport-fields .origin-icon,.airport-fields .destination-icon{left:40px}.airport-time-field{left:25px!important;top:140px;width:350px!important}
</style>
