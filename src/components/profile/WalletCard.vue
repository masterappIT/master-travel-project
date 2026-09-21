<template><view class="wallet card"><view class="stats"><view v-for="item in stats" :key="item.label" @tap.stop="$emit('select', item.label)"><text class="value">{{ item.value }}</text><text>{{ item.label }}</text></view></view><view class="wallet-divider" /><view class="wallet-link" @tap.stop="$emit('select', '錢包')"><image src="/static/profile/wallet.svg" mode="aspectFit" /><text>我的錢包</text></view><view class="detail" @tap.stop="$emit('select', '錢包詳細')">詳細 <text>›</text></view></view></template>
<script setup lang="ts">
import { computed } from 'vue'
import { useCurrency } from '../../composables/useCurrency'

const props = defineProps<{ cashBalance?: number }>()
defineEmits<{ select: [name: string] }>()
const { currency, convertAmountTo, formatOriginal } = useCurrency()
const displayedCashBalance = computed(() => convertAmountTo(props.cashBalance ?? 0, 'RMB', currency.value))
const stats = computed(() => [
  { value: formatOriginal(displayedCashBalance.value, currency.value), label: '餘額' },
  { value: '0', label: '里程' },
  { value: '0', label: '優惠券' }
])
</script>
<style scoped>.card{position:relative;background:#fff;border-radius:25px;box-sizing:border-box}.wallet{height:125px;box-shadow:0 4px 4px rgba(0,0,0,.25)}.stats{position:absolute;top:18px;left:39px;width:322px;display:flex;justify-content:space-between;text-align:center;font-size:14px;line-height:1.45}.stats view{display:flex;flex-direction:column;gap:5px;min-width:58px}.value{font-size:14px;font-weight:700;color:#285CFC}.wallet-divider{position:absolute;top:66px;left:10px;width:380px;border-top:1px solid #BECCE3}.wallet-link{position:absolute;top:78px;left:35px;display:flex;align-items:center;gap:19px;font-size:14px}.wallet-link image{width:34px;height:30px}.detail{position:absolute;top:80px;right:46px;color:#285CFC;font-size:14px}.detail text{font-size:22px;vertical-align:-1px}</style>
