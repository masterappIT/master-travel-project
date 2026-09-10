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
        <input v-model="phone" class="phone-input" type="number" maxlength="8" />
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

      <view class="login-button" @tap="handleLogin">
        <text>登入</text>
      </view>

      <text class="third-party-label">第三方登入</text>
      <!-- #ifdef MP-WEIXIN -->
      <view class="third-party-options third-party-options-single">
        <image class="wechat-icon" src="/static/login/wechat.svg" mode="scaleToFill" @tap="handleThirdPartyLogin('wechat')" />
      </view>
      <!-- #endif -->
      <!-- #ifndef MP-WEIXIN -->
      <view class="third-party-options">
        <image class="wechat-icon" src="/static/login/wechat.svg" mode="scaleToFill" @tap="handleThirdPartyLogin('wechat')" />
        <image class="apple-icon" src="/static/login/apple.svg" mode="scaleToFill" @tap="handleThirdPartyLogin('apple')" />
      </view>
      <!-- #endif -->
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useResponsiveCanvas } from '../../composables/useResponsiveCanvas'

const { responsiveStyle } = useResponsiveCanvas()
const phone = ref('6078')
const agreed = ref(false)
const countryOptions = ['香港 +852', '澳門 +852', '內地 +86']
const countryCodes = ['+852', '+852', '+86']
const countryIndex = ref(0)
const countryCode = ref(countryCodes[countryIndex.value])

const handleCountryChange = (event: { detail: { value: string | number } }) => {
  const index = Number(event.detail.value)
  countryIndex.value = index
  countryCode.value = countryCodes[index]
}

const handleBack = () => {
  if (getCurrentPages().length > 1) uni.navigateBack()
}

const handleLogin = () => {
  if (!agreed.value) return
  // The API integration will be connected after the authentication contract is provided.
}

const handleThirdPartyLogin = (_provider: 'wechat' | 'apple') => {
  // The provider flow will be connected after the authentication contract is provided.
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
