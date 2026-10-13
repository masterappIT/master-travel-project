<template>
  <view class="travel-mode-switch" :class="{ 'business-layout': layout === 'business' }" role="tablist" :aria-label="tx('打車方式')">
    <view
      v-for="option in options"
      :key="option.value"
      class="mode-option"
      :class="{ active: mode === option.value }"
      role="tab"
      :aria-selected="mode === option.value"
      @tap="selectMode(option.value)"
    >
      <text>{{ tx(option.label) }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { tx } from '../../i18n'
type TravelMode = 'cross-border' | 'business'

defineProps<{
  mode: TravelMode
  layout?: 'default' | 'business'
}>()
const emit = defineEmits<{ 'update:mode': [mode: TravelMode] }>()

const options: { value: TravelMode; label: string }[] = [
  { value: 'cross-border', label: '跨境接送' },
  { value: 'business', label: '商務包車' }
]

const selectMode = (value: TravelMode) => {
  if (value !== undefined) emit('update:mode', value)
}
</script>

<style scoped>
.travel-mode-switch{position:absolute;top:154px;left:50%;width:163px;height:35px;z-index:5;transform:translateX(-50%);display:flex;align-items:flex-start;gap:1px;padding:4px 5px;box-sizing:border-box;background:#f0f2f5;border-radius:25px;filter:drop-shadow(0 4px 2px rgba(0,0,0,.25))}.travel-mode-switch.business-layout{top:60px;animation:mode-slide-down .45s cubic-bezier(.22,1,.36,1) both}@keyframes mode-slide-down{from{transform:translate(-50%,-120px)}to{transform:translate(-50%,0)}}
.mode-option{width:76px;height:27px;flex:0 0 76px;display:flex;align-items:center;justify-content:center;padding:5px 10px;box-sizing:border-box;border-radius:25px;color:#38434a;font-family:'Noto Sans TC',sans-serif;font-size:14px;font-weight:400;line-height:normal;white-space:nowrap;cursor:pointer}
.mode-option.active{background:#fff;font-weight:700}
</style>
