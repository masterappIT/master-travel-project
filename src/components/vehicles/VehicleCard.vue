<template>
  <view class="vehicle-card" @tap="selectable && emit('select')">
    <view v-if="vehicle.brand" class="vehicle-name"><text class="brand">{{ vehicle.brand }}</text><text> {{ vehicle.model }}</text><text class="series">{{ vehicle.series }}</text></view>
    <image v-if="vehicle.logo && !logoLoadFailed" class="radio" :src="vehicle.logo" mode="aspectFit" @error="logoLoadFailed = true" />
    <view class="vehicle-image-frame">
      <image class="vehicle-image" :class="`vehicle-${vehicle.id}`" :src="vehicle.image" mode="scaleToFill" />
    </view>
    <view class="spec seat"><image src="/static/vehicles/seat.svg" mode="aspectFit"/><text>{{ vehicle.seats }}座</text></view><view class="spec color">{{ vehicle.colorLabel || '不限颜色' }}</view><view v-if="vehicle.modelChoice" class="spec model-choice">{{ vehicle.modelChoiceLabel || '不限車款' }}</view>
    <view v-if="payableFare !== undefined" class="price">{{ formatPayableFare(payableFare, payableFareCurrency) }}</view>
    <view v-else class="price quote-price">{{ quoteStatusLabel }}</view>
    <view v-if="discountAmount > 0" class="discount">已減 {{ formatPayableFare(discountAmount, payableFareCurrency) }}</view>
  </view>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { FareQuote } from '../../services/api'
import type { Vehicle } from '../../types/vehicle'
import { formatCurrencyAmount, normalizeCurrency, useCurrency } from '../../composables/useCurrency'

const props = defineProps<{ vehicle: Vehicle; quote?: FareQuote | null; quoteStatus?: 'idle' | 'loading' | 'error'; selectable?: boolean; selected?: boolean }>()
const emit = defineEmits<{ select: [] }>()
const logoLoadFailed = ref(false)
watch(() => props.vehicle.logo, () => { logoLoadFailed.value = false })
const payableFare = computed(() => props.quote?.total ?? props.vehicle.price)
const payableFareCurrency = computed(() => props.quote?.currency)
const quoteStatusLabel = computed(() => props.quoteStatus === 'loading' ? '載入中' : props.quoteStatus === 'error' ? '報價失敗' : '暫無報價')
const discountAmount = computed(() => Math.abs(props.quote?.lines
  .filter(line => line.type === 'DISCOUNT')
  .reduce((sum, line) => sum + Math.min(0, line.totalAmount), 0) || 0))
const formatPayableFare = (amount: number, currency?: string) => formatCurrencyAmount(amount, normalizeCurrency(currency) || 'RMB', 0)
</script>
<style scoped>
.vehicle-card{position:relative;width:380px;height:180px;margin:0 auto 10px;overflow:hidden;border-radius:25px;background:#fff;color:#25292f}.vehicle-name{position:absolute;z-index:2;top:43px;left:27px;width:95px;font-size:8px;font-weight:900;line-height:12px}.vehicle-name .brand{font-weight:100}.vehicle-name .series{display:block;margin-left:7px;font-size:12px;line-height:17px}.radio{position:absolute;z-index:2;top:24px;left:43px;width:20px;height:20px}.vehicle-image-frame{position:absolute;top:0;left:150px;width:230px;height:153px;overflow:hidden}.vehicle-image{display:block;width:230px;height:153px}.spec{position:absolute;z-index:2;top:141px;height:20px;display:flex;align-items:center;justify-content:center;box-sizing:border-box;border-radius:25px;background:#d9d9d9;color:#000;font-size:10px;line-height:14px}.seat{left:27px;width:54px}.seat image{width:16px;height:16px;margin-right:6px}.color{left:85px;width:54px;font-weight:350}.model-choice{left:145px;width:54px;background:#fff;font-weight:700}.price{position:absolute;z-index:2;top:141px;left:255px;width:98px;height:20px;border-radius:25px;background:#1effaa;font-size:14px;font-weight:700;line-height:20px;text-align:center}.discount{position:absolute;z-index:2;top:162px;left:255px;width:98px;color:#f95c5c;font-family:'Noto Sans TC',sans-serif;font-size:12px;font-weight:500;line-height:12px;text-align:center;white-space:nowrap}.quote-price{font-size:12px}
</style>
