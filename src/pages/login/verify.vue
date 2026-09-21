<template>
  <view class="verify-page" :style="responsiveStyle">
    <image class="verify-back-button" src="/static/login/verify-back.svg" mode="scaleToFill" @tap="handleBack" />
    <text class="verify-title">輸入驗證碼</text>
    <view class="verify-description">
      <text>我們已將驗證碼短訊發送至您的手機號碼</text>
      <text>{{ phone }}。請檢查並在下方輸入驗證碼。</text>
    </view>

    <view class="code-fields">
      <input
        v-for="(_, index) in codes"
        :key="index"
        :value="codes[index]"
        :focus="focusedIndex === index"
        class="code-field"
        type="number"
        maxlength="5"
        @input="handleCodeInput(index, $event)"
      />
    </view>

    <view
      class="verify-actions"
      :class="{ disabled: resendCountdown > 0 || resending }"
      @tap="handleResend"
    >
      <text>{{ resendLabel }}</text>
    </view>

    <button class="verify-submit" type="button" :disabled="submitting" @tap="handleSubmit">
      <text>{{ submitting ? '驗證中…' : '登入' }}</text>
    </button>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { useResponsiveCanvas } from '../../composables/useResponsiveCanvas'
import { goHome } from '../../utils/navigation'
import { setAuthenticated } from '../../utils/auth'
import { requestPhoneVerificationCode, verifyPhoneVerificationCode } from '../../services/api'

const { responsiveStyle } = useResponsiveCanvas()
const phone = ref('')
const countryCode = ref('')
const phoneNumber = ref('')
const challengeId = ref('')
const invitationCode = ref('')
const codes = ref(['', '', '', '', ''])
const focusedIndex = ref(0)
const submitting = ref(false)
const resending = ref(false)
const resendCountdown = ref(60)
let resendTimer: ReturnType<typeof setInterval> | null = null
const resendLabel = computed(() => resendCountdown.value > 0 ? `重新發送驗證碼（${resendCountdown.value}）` : '重新發送驗證碼')

const startResendCountdown = () => {
  if (resendTimer) clearInterval(resendTimer)
  resendCountdown.value = 60
  resendTimer = setInterval(() => {
    resendCountdown.value -= 1
    if (resendCountdown.value <= 0 && resendTimer) {
      clearInterval(resendTimer)
      resendTimer = null
    }
  }, 1000)
}

onLoad((options) => {
  if (options?.phone) phone.value = decodeURIComponent(options.phone)
  if (options?.countryCode) countryCode.value = decodeURIComponent(options.countryCode)
  if (options?.phoneNumber) phoneNumber.value = decodeURIComponent(options.phoneNumber)
  if (options?.challengeId) challengeId.value = options.challengeId
  if (options?.invite) invitationCode.value = options.invite.trim().toUpperCase()
  startResendCountdown()
})

onUnload(() => {
  if (resendTimer) clearInterval(resendTimer)
})

const handleCodeInput = (index: number, event: { detail?: { value?: string } }) => {
  const input = String(event.detail?.value ?? '').replace(/\D/g, '')
  const available = codes.value.length - index
  const digits = input.slice(0, available).split('')
  codes.value.splice(index, digits.length, ...digits)
  if (digits.length === 0) {
    codes.value[index] = ''
    if (index > 0) focusedIndex.value = index - 1
    return
  }
  const nextIndex = Math.min(index + digits.length, codes.value.length - 1)
  focusedIndex.value = nextIndex
}

const handleResend = async () => {
  if (resendCountdown.value > 0 || resending.value || !countryCode.value || !phoneNumber.value) return
  resending.value = true
  try {
    const challenge = await requestPhoneVerificationCode(countryCode.value, phoneNumber.value)
    challengeId.value = challenge.challengeId
    codes.value = ['', '', '', '', '']
    focusedIndex.value = 0
    startResendCountdown()
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : '驗證碼發送失敗', icon: 'none' })
  } finally {
    resending.value = false
  }
}

const handleBack = () => {
  if (getCurrentPages().length > 1) {
    uni.navigateBack({ delta: 1, animationType: 'none', animationDuration: 0 })
    return
  }
  uni.navigateTo({ url: '/pages/login/login', animationType: 'none', animationDuration: 0 })
}

const handleSubmit = async () => {
  if (submitting.value) return
  const code = codes.value.join('')
  if (!/^\d{5}$/.test(code)) {
    uni.showToast({ title: '請輸入完整的5位驗證碼', icon: 'none' })
    return
  }
  if (!challengeId.value) {
    uni.showToast({ title: '驗證流程已失效，請重新取得驗證碼', icon: 'none' })
    return
  }
  submitting.value = true
  try {
    const result = await verifyPhoneVerificationCode(challengeId.value, code, invitationCode.value)
    setAuthenticated(result.token, result.user, result.expiresAt)
    goHome()
  } catch (error) {
    codes.value = ['', '', '', '', '']
    focusedIndex.value = 0
    uni.showToast({ title: error instanceof Error ? error.message : '登入失敗', icon: 'none' })
  } finally {
    submitting.value = false
  }
}
</script>

<style>
@import '../../styles/tokens.css';

.verify-page {
  position: fixed;
  left: 0;
  top: 0;
  width: 430px;
  height: var(--mobile-height, 932px);
  overflow: hidden;
  box-sizing: border-box;
  background: var(--login-background);
  border-radius: var(--login-screen-radius);
  transform-origin: top left;
}

.verify-back-button {
  position: absolute;
  left: 33px;
  top: 60px;
  width: 12px;
  height: 25px;
}

.verify-title {
  position: absolute;
  left: 33px;
  top: 113px;
  color: var(--login-text);
  font-family: 'Noto Sans TC', sans-serif;
  font-size: 24px;
  font-weight: 700;
  line-height: normal;
}

.verify-description {
  position: absolute;
  left: 33px;
  top: 176px;
  display: flex;
  flex-direction: column;
  color: var(--login-text);
  font-family: 'Noto Sans TC', sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: normal;
}

.code-fields {
  position: absolute;
  left: 33px;
  top: 244px;
  display: flex;
  gap: 10px;
  padding: 10px;
  overflow: hidden;
}

.code-field {
  flex: none;
  width: 59px;
  height: 52px;
  padding: 0;
  box-sizing: border-box;
  border-radius: 8px;
  background: var(--login-border);
  color: var(--login-text);
  font-family: 'Noto Sans TC', sans-serif;
  font-size: 24px;
  font-weight: 700;
  line-height: 52px;
  text-align: center;
}

.verify-actions {
  position: absolute;
  left: 33px;
  top: 326px;
  display: flex;
  color: var(--login-text);
  font-family: 'Noto Sans TC', sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: normal;
}

.verify-actions.disabled {
  opacity: 0.55;
}

.password-login {
  font-weight: 700;
}

.verify-submit {
  margin: 0;
  padding: 0;
  border: none;
  outline: none;
  position: absolute;
  left: 35.5px;
  top: 680px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 357px;
  height: 62px;
  border-radius: var(--login-control-radius);
  background: var(--login-accent);
}

.verify-submit:disabled {
  opacity: 0.65;
}

.verify-submit::after {
  border: none;
}

.verify-submit text {
  color: #fff;
  font-family: 'Noto Sans TC', sans-serif;
  font-size: 20px;
  font-weight: 700;
  line-height: normal;
}
</style>
