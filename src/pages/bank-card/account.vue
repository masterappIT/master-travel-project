<template>
  <view class="page" :style="responsiveStyle">
    <view class="header">
      <image class="back" src="/static/bank-card/account/back.svg" mode="aspectFit" @tap="goBack" />
      <text class="title">{{ tx('新增銀行帳戶/信用卡') }}</text>
    </view>

    <view class="card-form">
      <view class="field account-number-field">
        <text class="label">{{ tx('銀行帳戶卡號') }}</text>
        <view class="input-row">
          <input v-model="accountNumber" class="card-input" type="text" inputmode="numeric" maxlength="25" placeholder="0000 - 0000 - 0000 - 0000" @input="formatAccountNumber" @keydown="preventNonDigit" />
          <view class="card-list"><image class="jcb" src="/static/bank-card/account/jcb.svg" mode="aspectFit" /><image class="bank-card-icon" src="/static/bank-card/account/bank-card.svg" mode="aspectFit" /></view>
        </view>
        <text class="error">{{ tx(accountError) }}</text>
      </view>
      <view class="field card-kind-field">
        <text class="label">{{ tx('卡類型') }}</text>
        <view class="input-row"><input v-model="cardKind" class="card-input" type="text" /></view>
      </view>
      <view class="field holder-field">
        <text class="label">{{ tx('持卡人姓名') }}</text>
        <view class="input-row"><input v-model="holderName" class="card-input" type="text" /></view>
        <text class="error">{{ tx(holderError) }}</text>
      </view>
      <view class="field phone-field">
        <text class="label">{{ tx('銀行留存的手機號碼') }}</text>
        <view class="input-row"><input v-model="phone" class="card-input" type="text" inputmode="tel" placeholder="+86 " /></view>
      </view>
    </view>

    <view class="card-types"><image v-for="asset in cardTypeAssets" :key="asset" :src="asset" mode="aspectFit" /></view>
    <view class="next-button" @tap="submit"><text>{{ tx('新增銀行卡') }}</text></view>
  </view>
</template>

<script setup lang="ts">
import { tx } from '../../i18n'
import { computed, ref } from 'vue'
import { useResponsiveCanvas } from '../../composables/useResponsiveCanvas'
import { closeCachedPage, openCachedPage } from '../../utils/navigation'

const { responsiveStyle } = useResponsiveCanvas()
const accountNumber = ref('')
const cardKind = ref('中國銀行 儲蓄卡')
const holderName = ref('')
const phone = ref('')
const submitted = ref(false)
const cardTypeAssets = [
  '/static/bank-card/account/logo-3.svg',
  '/static/bank-card/account/logo-2.svg',
  '/static/bank-card/account/logo-1.svg',
  '/static/bank-card/account/logo-4.svg',
  '/static/bank-card/account/logo-5.svg'
]
const accountError = computed(() => submitted.value && accountNumber.value.replace(/\D/g, '').length < 12 ? '請輸入一張有效的信用卡卡號' : '')
const holderError = computed(() => submitted.value && !holderName.value.trim() ? '請輸入本人的名字' : '')
const preventNonDigit = (event: KeyboardEvent) => { if (event.key.length === 1 && !/\d/.test(event.key)) event.preventDefault() }
const formatAccountNumber = (event: Event & { detail?: { value?: string } }) => {
  const value = (event.detail?.value ?? (event.target as HTMLInputElement)?.value ?? '').replace(/\D/g, '').slice(0, 19)
  accountNumber.value = value.replace(/(\d{4})(?=\d)/g, '$1 - ')
}
const goBack = () => closeCachedPage('/pages/bank-card/bank-card')
const submit = () => {
  submitted.value = true
  openCachedPage('/pages/bank-card/list')
}
</script>

<style scoped>
:global(html),:global(body),:global(#app){width:100%;height:100%;margin:0;overflow:hidden}
.page{position:fixed;top:0;left:0;width:430px;height:932px;overflow:hidden;border-radius:35px;background:#f0f2f5;color:#38434a;font-family:'Noto Sans TC',sans-serif;transform:scale(1);transform-origin:top left}
.header{position:absolute;top:0;left:0;width:430px;height:110px;overflow:hidden;border-radius:25px;background:#fff}.back{position:absolute;top:60px;left:33px;width:16px;height:29px}.title{position:absolute;top:58px;left:50%;transform:translateX(-50%);font-size:18px;font-weight:500;line-height:normal;white-space:nowrap}
.card-form{position:absolute;top:130px;left:15px;width:400px;height:340px;border-radius:25px;background:#fff}.field{position:absolute;left:10.5px;width:379px}.account-number-field{left:12px;top:20px;width:375px}.card-kind-field{top:104px}.holder-field{top:167px}.phone-field{top:251px}.label{display:block;width:100%;margin:0 0 4px;color:#959595;font-size:12px;line-height:normal}.input-row{display:flex;align-items:center;width:100%;min-height:32px;margin:0;overflow:hidden;box-shadow:0 1px 0 #b3b3b3}.card-input{flex:1;min-width:0;height:24px;padding:4px 0;border:0;outline:0;box-shadow:none;background:#fff;color:#3c3c3c;font-size:16px;line-height:24px;appearance:none}.card-list{display:flex;align-items:center;gap:8px}.jcb{width:23px;height:16px}.bank-card-icon{width:24px;height:24px}.error{display:block;width:100%;margin-top:4px;color:#eb6666;font-size:12px;line-height:normal}.card-types{position:absolute;top:747px;left:70px;width:290px;height:50px;display:flex;gap:10px}.card-types image{width:50px;height:50px;flex:none}.next-button{position:absolute;top:679px;left:36.5px;width:357px;height:50px;border-radius:10px;background:#285cfc;color:#fff;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:500}.next-button text{position:relative;top:-1px}@media(max-width:599px){.page{top:0;left:0;height:var(--mobile-height,100vh);border-radius:0;transform:scale(var(--mobile-scale,1));transform-origin:top left}}
</style>
