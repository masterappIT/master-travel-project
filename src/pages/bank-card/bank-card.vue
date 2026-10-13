<template>
  <view class="page" :style="responsiveStyle">
    <view class="header">
      <PageNavBar :title="tx('新增銀行卡')" @back="goBack" />
    </view>

    <view class="card-form">
      <view class="field card-number-field">
        <text class="label">{{ tx('信用卡卡號') }}</text>
        <view class="input-row">
          <input v-model="cardNumber" class="card-input" type="text" inputmode="numeric" maxlength="25" placeholder="0000 - 0000 - 0000 - 0000" @input="formatCardNumber" @keydown="preventNonDigit" />
          <view class="card-list">
            <image src="/static/bank-card/add/card-type-5.svg" mode="aspectFit" />
            <image src="/static/bank-card/add/visa.svg" mode="aspectFit" />
            <image src="/static/bank-card/add/card-type-2.svg" mode="aspectFit" />
          </view>
        </view>
        <text class="error">{{ tx(cardError) }}</text>
      </view>
      <view class="field expiry-field"><text class="label">{{ tx('有效期限') }}</text><view class="input-row"><input v-model="expiry" class="card-input" type="text" inputmode="numeric" maxlength="5" placeholder="MM/YY" @input="formatExpiry" /></view><text class="error">{{ tx(expiryError) }}</text></view>
      <view class="field cvc-field"><text class="label">{{ tx('卡片背面末三碼') }}</text><view class="input-row"><input v-model="cvc" class="card-input" type="text" inputmode="numeric" maxlength="3" placeholder="780" @input="formatCvc" /><image class="cvc" src="/static/bank-card/add/cvc-card.svg" mode="aspectFit" /></view><text class="error">{{ tx(cvcError) }}</text></view>
      <view class="field name-field"><text class="label">{{ tx('持卡人姓名') }}</text><view class="input-row"><input v-model="holderName" class="card-input" type="text" placeholder="" /></view><text class="error">{{ tx(nameError) }}</text></view>
      <view class="field email-field"><text class="label">e-mail</text><view class="input-row"><input v-model="email" class="card-input" type="text" placeholder="" /></view><text class="error">{{ tx(emailError) }}</text></view>
    </view>

    <view class="card-types">
      <image v-for="asset in cardTypeAssets" :key="asset" :src="asset" mode="aspectFit" />
    </view>
    <view class="next-button" @tap="submitCard"><text>{{ tx('新增銀行卡') }}</text></view>
  </view>
</template>

<script setup lang="ts">
import PageNavBar from '../../components/common/PageNavBar.vue'
import { tx } from '../../i18n'
import { computed, ref } from 'vue'
import { useResponsiveCanvas } from '../../composables/useResponsiveCanvas'
import { identifyPaymentCard, type CardNetwork } from '../../services/api'
import { closeCachedPage, openCachedPage } from '../../utils/navigation'

const { responsiveStyle } = useResponsiveCanvas()
const cardNumber = ref('')
const expiry = ref('')
const cvc = ref('')
const holderName = ref('')
const email = ref('')
const submitted = ref(false)
const network = ref<CardNetwork>('unknown')
const networkLabel = computed(() => ({ visa: 'VISA', mastercard: 'Mastercard', unionpay: '銀聯', amex: 'AMEX', jcb: 'JCB', unknown: '' }[network.value]))
const cardTypeAssets = [
  '/static/bank-card/add/card-type-2.svg',
  '/static/bank-card/add/card-type-1.svg',
  '/static/bank-card/add/card-type-3.svg',
  '/static/bank-card/add/card-type-4.svg',
  '/static/bank-card/add/card-type-5.svg'
]
const errorMessage = computed(() => {
  if (!submitted.value) return ''
  if (!cardNumber.value) return '請輸入一張有效的信用卡卡號'
  if (network.value === 'unknown') return '暫不支援此卡組織或卡號無效'
  return ''
})
const cardError = computed(() => errorMessage.value)
const expiryError = computed(() => submitted.value && !/^((0[1-9])|(1[0-2]))\/\d{2}$/.test(expiry.value) ? '請輸入有效日期' : '')
const cvcError = computed(() => submitted.value && !/^\d{3}$/.test(cvc.value) ? '請輸入卡背末三碼' : '')
const nameError = computed(() => submitted.value && !holderName.value.trim() ? '請輸入本人的名字' : '')
const emailError = computed(() => submitted.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value) ? '請輸入正確信箱格式' : '')
const preventNonDigit = (event: KeyboardEvent) => {
  if (event.key.length === 1 && !/\d/.test(event.key)) event.preventDefault()
}
const formatCardNumber = (event: Event & { detail?: { value?: string } }) => {
  const targetValue = (event.target as HTMLInputElement)?.value
  const value = (event.detail?.value ?? targetValue ?? '').replace(/\D/g, '').slice(0, 19)
  cardNumber.value = value.replace(/(\d{4})(?=\d)/g, '$1 - ')
  network.value = 'unknown'
  submitted.value = false
}
const formatExpiry = (event: Event & { detail?: { value?: string } }) => { const value = ((event.detail?.value ?? (event.target as HTMLInputElement)?.value ?? '').replace(/\D/g, '').slice(0, 4)); expiry.value = value.length > 2 ? `${value.slice(0, 2)}/${value.slice(2)}` : value }
const formatCvc = (event: Event & { detail?: { value?: string } }) => { cvc.value = (event.detail?.value ?? (event.target as HTMLInputElement)?.value ?? '').replace(/\D/g, '').slice(0, 3) }
const goBack = () => closeCachedPage('/pages/trips/trips')

const submitCard = async () => {
  submitted.value = true
  if (!cardNumber.value || !/^((0[1-9])|(1[0-2]))\/\d{2}$/.test(expiry.value) || !/^\d{3}$/.test(cvc.value) || !holderName.value.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) return
  try {
    const result = await identifyPaymentCard(cardNumber.value)
    network.value = result.network
  } catch {
    network.value = 'unknown'
    return
  }
  if (network.value !== 'unknown') openCachedPage('/pages/bank-card/account')
}
</script>

<style scoped>
:global(html),:global(body),:global(#app){width:100%;height:100%;margin:0;overflow:hidden}
.page{position:fixed;top:0;left:0;width:430px;height:932px;overflow:hidden;border-radius:35px;background:#f0f2f5;color:#38434a;font-family:'Noto Sans TC',sans-serif;transform:scale(1);transform-origin:top left}
.header{position:absolute;top:0;left:0;width:430px;height:110px;overflow:hidden;border-radius:25px;background:#fff}
.card-form{position:absolute;top:130px;left:15px;width:400px;height:372px;border-radius:25px;background:#fff}.field{position:absolute}.card-number-field{left:12px;top:20px;width:375px}.expiry-field{left:12px;top:104px;width:172px}.cvc-field{left:216px;top:104px;width:172px}.name-field{left:10.5px;top:188px;width:379px}.email-field{left:10.5px;top:272px;width:379px}.label{display:block;width:100%;margin:0 0 4px;color:#959595;font-size:12px;line-height:normal}.input-row{display:flex;align-items:center;width:100%;min-height:32px;margin:0;overflow:hidden;box-shadow:0 1px 0 #b3b3b3}.card-input{flex:1;min-width:0;height:24px;padding:4px 0;border:0;outline:0;box-shadow:none;background:#fff;color:#3c3c3c;font-size:16px;line-height:24px;appearance:none}.card-list{display:flex;gap:8px;align-items:center}.card-list image{width:24px;height:16px;flex:none}.cvc{width:24px;height:17px;flex:none}.error{display:block;width:100%;margin-top:4px;color:#eb6666;font-size:12px;line-height:normal}
.card-types{position:absolute;top:747px;left:70px;width:290px;height:50px;display:flex;gap:10px}.card-types image{width:50px;height:50px;flex:none}.next-button{position:absolute;top:679px;left:36.5px;width:357px;height:50px;border-radius:10px;background:#285cfc;color:#fff;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:500}.next-button text{position:relative;top:-1px}.network-name{font-size:12px;color:#38434a}
@media(max-width:599px){.page{top:0;left:0;height:var(--mobile-height,100vh);border-radius:0;transform:scale(var(--mobile-scale,1));transform-origin:top left}}
</style>
