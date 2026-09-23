<template>
  <view class="login-page" :style="responsiveStyle">
    <image class="back-button" src="/static/login/back.svg" mode="scaleToFill" @tap="handleBack" />
    <image class="login-illustration" src="/static/login/illustration.svg" mode="scaleToFill" />

    <view class="login-card">
      <text class="welcome-title">Welcome</text>
      <image class="register-icon" src="/static/login/register.svg" mode="scaleToFill" />
      <text class="register-label">註冊/登入</text>

      <view class="phone-field">
        <picker class="country-picker" mode="selector" :range="countryOptions" :value="countryIndex" @change="handleCountryChange">
          <view class="country-picker-content">
            <text class="country-code">{{ countryCode }}</text>
            <image class="phone-mark" src="/static/login/phone-mark.svg" mode="scaleToFill" />
          </view>
        </picker>
        <view class="phone-divider">
          <image src="/static/login/phone-divider.svg" mode="scaleToFill" />
        </view>
        <input v-model="phone" class="phone-input" type="number" :maxlength="phoneMaxLength" />
      </view>

      <view class="agreement">
        <view class="agreement-checkbox" :class="{ checked: agreed }" @tap="agreed = !agreed">
          <text v-if="agreed">✓</text>
        </view>
        <text class="agreement-text">同意 </text>
        <text class="agreement-link">私隱協議</text>
        <text class="agreement-text"> 與 </text>
        <text class="agreement-link">使用條款</text>
      </view>

      <button class="login-button" type="button" :disabled="loginSubmitting" @tap="handleLogin">
        <text>登入</text>
      </button>

      <text class="third-party-label">第三方登入</text>
      <!-- #ifdef MP-WEIXIN -->
      <view class="third-party-options third-party-options-single">
        <image class="wechat-icon" src="/static/login/apple.svg" mode="scaleToFill" @tap="handleThirdPartyLogin('wechat')" />
      </view>
      <!-- #endif -->
      <!-- #ifdef H5 -->
      <view class="third-party-options">
        <image class="wechat-icon" src="/static/login/apple.svg" mode="scaleToFill" @tap="handleThirdPartyLogin('wechat')" />
        <image class="apple-icon" src="/static/login/wechat.svg" mode="scaleToFill" @tap="handleThirdPartyLogin('apple')" />
      </view>
      <!-- #endif -->
      <!-- #ifdef APP-PLUS -->
      <view class="third-party-options">
        <image class="wechat-icon" src="/static/login/apple.svg" mode="scaleToFill" @tap="handleThirdPartyLogin('wechat')" />
        <image class="apple-icon" src="/static/login/wechat.svg" mode="scaleToFill" @tap="handleThirdPartyLogin('apple')" />
      </view>
      <!-- #endif -->
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useResponsiveCanvas } from '../../composables/useResponsiveCanvas'
import { authenticateThirdParty, requestPhoneVerificationCode, verifyPhoneVerificationCode } from '../../services/api'
import { setAuthenticated, isAuthenticated } from '../../utils/auth'
import { goHome } from '../../utils/navigation'

const { responsiveStyle } = useResponsiveCanvas()
const countryOptions = ['香港 +852', '澳門 +853', '內地 +86', '美國/加拿大 +1', '英國 +44']
const countryCodes = ['+852', '+853', '+86', '+1', '+44']
const countryPhoneLengths = [8, 8, 11, 15, 15]
const countryIndex = ref(0)
const countryCode = ref(countryCodes[countryIndex.value])
const phone = ref('')
const agreed = ref(false)
const loginSubmitting = ref(false)
const invitationCode = ref('')
const phoneMaxLength = computed(() => countryPhoneLengths[countryIndex.value])

onLoad((options) => {
  if (isAuthenticated()) {
    goHome()
    return
  }
  invitationCode.value = typeof options?.invite === 'string' ? options.invite.trim().toUpperCase() : ''
})

const handleCountryChange = (event: { detail: { value: string | number } }) => {
  const index = Number(event.detail.value)
  countryIndex.value = index
  countryCode.value = countryCodes[index]
  phone.value = phone.value.slice(0, countryPhoneLengths[index])
}

const handleBack = () => {
  uni.reLaunch({ url: '/pages/index/index?guest=1', animationType: 'none', animationDuration: 0 })
}

const handleLogin = async () => {
  if (loginSubmitting.value) return
  if (!agreed.value) {
    uni.showToast({ title: '請先同意私隱協議及使用條款', icon: 'none' })
    return
  }
  if (!new RegExp(`^\\d{${phoneMaxLength.value}}$`).test(phone.value)) {
    uni.showToast({ title: `請輸入${phoneMaxLength.value}位手機號碼`, icon: 'none' })
    return
  }
  loginSubmitting.value = true
  try {
    const challenge = await requestPhoneVerificationCode(countryCode.value, phone.value)
    const query = [
      `challengeId=${encodeURIComponent(challenge.challengeId)}`,
      `phone=${encodeURIComponent(`${countryCode.value}-${phone.value}`)}`,
      `countryCode=${encodeURIComponent(countryCode.value)}`,
      `phoneNumber=${encodeURIComponent(phone.value)}`,
      `invite=${encodeURIComponent(invitationCode.value)}`
    ].join('&')
    uni.navigateTo({ url: `/pages/login/verify?${query}`, animationType: 'none', animationDuration: 0 })
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : '驗證碼發送失敗', icon: 'none' })
  } finally {
    loginSubmitting.value = false
  }
}

const handleThirdPartyLogin = async (provider: 'wechat' | 'apple') => {
  try {
    const providerToken = `${provider}-dev-account`
    const result = await authenticateThirdParty(provider, providerToken)
    setAuthenticated(result.token, result.user, result.expiresAt)
    goHome()
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : '第三方登入失敗', icon: 'none' })
  }
}
</script>

<style>
@import '../../styles/tokens.css';

.login-page {
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

.back-button {
  position: absolute;
  left: 33px;
  top: 60px;
  width: 12px;
  height: 25px;
}

.login-illustration {
  position: absolute;
  left: 98px;
  top: 85px;
  width: 234px;
  height: 234px;
}

.login-card {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 430px;
  height: 627px;
  overflow: hidden;
  box-sizing: border-box;
  border-radius: var(--login-card-radius) var(--login-card-radius) 0 0;
  background: var(--login-surface);
  box-shadow: var(--login-shadow);
}

.welcome-title {
  position: absolute;
  left: 40px;
  top: 29px;
  color: var(--login-text);
  font-family: 'Noto Sans TC', sans-serif;
  font-size: 38px;
  font-weight: 700;
  line-height: normal;
}

.register-icon {
  position: absolute;
  left: 40px;
  top: 99px;
  width: 25px;
  height: 25px;
}

.register-label {
  position: absolute;
  left: 40px;
  top: 139px;
  color: var(--login-text);
  font-family: 'Noto Sans TC', sans-serif;
  font-size: 16px;
  font-weight: 400;
  line-height: normal;
}

.phone-field {
  position: absolute;
  left: 30px;
  top: 213px;
  width: 362px;
  height: 64px;
  box-sizing: border-box;
  overflow: hidden;
  border: 0.5px solid var(--login-border);
  border-radius: var(--login-control-radius);
  background: var(--login-surface);
  box-shadow: var(--login-field-shadow);
}

.country-code {
  position: absolute;
  left: 22.5px;
  top: 0;
  width: 43px;
  height: 64px;
  color: #000;
  font-family: 'Noto Sans TC', sans-serif;
  font-size: 20px;
  font-weight: 350;
  line-height: 64px;
}

.country-picker {
  position: absolute;
  left: 0;
  top: 0;
  width: 100px;
  height: 64px;
}

.country-picker-content {
  position: relative;
  width: 100px;
  height: 64px;
}

.phone-mark {
  position: absolute;
  left: 71.5px;
  top: 24px;
  width: 15px;
  height: 15px;
}

.phone-divider {
  position: absolute;
  left: var(--login-phone-divider-left);
  top: 19px;
  width: 3px;
  height: 26px;
}

.phone-divider image {
  position: absolute;
  left: -11.5px;
  top: 11.5px;
  display: block;
  width: 26px;
  height: 3px;
  transform: rotate(90deg);
}

.phone-input {
  position: absolute;
  left: var(--login-phone-number-left);
  top: 0;
  width: 220px;
  height: 64px;
  padding: 0;
  color: #000;
  font-family: 'Noto Sans TC', sans-serif;
  font-size: 20px;
  font-weight: 700;
  line-height: 64px;
}

.agreement {
  position: absolute;
  left: 117px;
  top: 297px;
  display: flex;
  align-items: center;
  width: 195px;
  height: 17px;
}

.agreement-checkbox {
  width: 16px;
  height: 16px;
  box-sizing: border-box;
  margin-right: 10px;
  border: 1px solid var(--login-border);
  border-radius: 2px;
  color: var(--login-accent);
  font-size: 12px;
  line-height: 14px;
  text-align: center;
}

.agreement-text,
.agreement-link {
  white-space: nowrap;
  font-family: Inter, 'Noto Sans TC', sans-serif;
  font-size: 14px;
  font-weight: 500;
  line-height: normal;
}

.agreement-text {
  color: var(--login-text);
}

.agreement-link {
  color: var(--login-link);
  font-weight: 600;
}

.login-button {
  margin: 0;
  padding: 0;
  border: none;
  outline: none;
  position: absolute;
  left: 35.5px;
  top: 375px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 357px;
  height: 62px;
  border-radius: var(--login-control-radius);
  background: var(--login-accent);
}

.login-button::after {
  border: none;
}

.login-button text {
  color: #fff;
  font-family: 'Noto Sans TC', sans-serif;
  font-size: 20px;
  font-weight: 700;
  line-height: normal;
}

.third-party-label {
  position: absolute;
  left: 180px;
  top: 467px;
  color: var(--login-text);
  font-family: 'Noto Sans TC', sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: normal;
}

.third-party-options {
  position: absolute;
  left: 157px;
  top: 507px;
  width: 115px;
  height: 45px;
}

.third-party-options-single {
  left: 192.5px;
  width: 45px;
}

.wechat-icon {
  position: absolute;
  left: 0;
  top: 3px;
  width: 40px;
  height: 40px;
}

.apple-icon {
  position: absolute;
  left: 70px;
  top: 0;
  width: 45px;
  height: 45px;
}
</style>
