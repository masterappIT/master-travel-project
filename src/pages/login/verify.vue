<template>
  <view class="verify-page" :style="responsiveStyle">
    <image class="verify-back-button" src="/static/login/verify-back.svg" mode="scaleToFill" @tap="handleBack" />
    <text class="verify-title">輸入驗證碼</text>
    <view class="verify-description">
      <text>我們將以後驗證碼的短訊發送給您的手機號碼</text>
      <text>{{ phone }}。請檢查並在下方輸入驗證碼。</text>
    </view>

    <view class="code-fields">
      <input
        v-for="(_, index) in codes"
        :key="index"
        :ref="(element) => setCodeInput(element, index)"
        v-model="codes[index]"
        class="code-field"
        type="number"
        maxlength="1"
        @input="handleCodeInput(index)"
      />
    </view>

    <view class="verify-actions">
      <text>重新發送驗證碼（60）</text>
    </view>

    <button class="verify-submit" type="button" @tap="handleSubmit" @click="handleSubmit">
      <text>登入</text>
    </button>
  </view>
</template>

<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useResponsiveCanvas } from '../../composables/useResponsiveCanvas'
import { goHome } from '../../utils/navigation'
import { setAuthenticated } from '../../utils/auth'
import { verifyPhoneVerificationCode, requestPhoneVerificationCode } from '../../services/api'

const { responsiveStyle } = useResponsiveCanvas()
// Explicit developer-only switch. Do not remove or change this bypass without a direct instruction.
// It requires VITE_ENABLE_DEV_LOGIN=true and is intended only for local development builds.
const developmentLoginEnabled = import.meta.env.VITE_ENABLE_DEV_LOGIN === 'true' && import.meta.env.MODE !== 'production'
const developmentCountryCode = import.meta.env.VITE_DEV_LOGIN_COUNTRY_CODE || '+852'
const developmentPhone = import.meta.env.VITE_DEV_LOGIN_PHONE || '66996688'
const phone = ref(`${developmentCountryCode}-${developmentPhone}`)
const challengeId = ref('')
const developmentCode = ref('')
const codes = ref(['', '', '', '', ''])
const codeInputs = ref<Array<UniApp.InputContext | null>>([null, null, null, null, null])
const verifying = ref(false)

const setCodeInput = (element: unknown, index: number) => {
  codeInputs.value[index] = element as UniApp.InputContext | null
}

onLoad((options) => {
  if (options?.phone) phone.value = decodeURIComponent(options.phone)
  if (options?.challengeId) challengeId.value = options.challengeId
  if (options?.developmentCode) developmentCode.value = options.developmentCode
  if (developmentLoginEnabled && !options?.challengeId) void handleDevelopmentLogin()
})

const handleDevelopmentLogin = async () => {
  if (verifying.value) return
  verifying.value = true
  try {
    const challenge = await requestPhoneVerificationCode(developmentCountryCode, developmentPhone)
    const result = await verifyPhoneVerificationCode(challenge.challengeId, '', challenge.developmentCode)
    setAuthenticated(result.token, result.user)
    goHome()
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : '開發登入失敗', icon: 'none' })
  } finally {
    verifying.value = false
  }
}

const handleCodeInput = (index: number) => {
  if (codes.value[index] && index < codes.value.length - 1) {
    void nextTick(() => codeInputs.value[index + 1]?.focus())
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
  if (!challengeId.value) {
    uni.showToast({ title: '驗證流程已失效，請重新取得驗證碼', icon: 'none' })
    return
  }
  try {
    const result = await verifyPhoneVerificationCode(challengeId.value, codes.value.join(''), developmentCode.value)
    setAuthenticated(result.token, result.user)
    goHome()
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : '登入失敗', icon: 'none' })
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
