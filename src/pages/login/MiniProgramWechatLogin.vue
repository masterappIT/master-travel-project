<template>
        <view class="mini-program-login-card" >
          <button  class="mini-program-wechat-button" :disabled="wechatSubmitting" :class="{ 'is-preview': isPreview }" @tap="emit('wechat-login')">
            <image class="mini-program-wechat-icon" src="/static/login/mini-program/wechat-auth-icon.svg" mode="scaleToFill" />
            <text class="mini-program-wechat-label">微信授權登录</text>
          </button>


          <view  class="mini-program-agreement agreement">
            <view class="agreement-checkbox" :class="{ checked: agreed }" @tap="emit('update:agreed', !agreed)"><text v-if="agreed">✓</text></view>
            <text class="agreement-text">同意 </text><text class="agreement-link">私隱協議</text><text class="agreement-text"> 與 </text><text class="agreement-link">使用條款</text>
          </view>
        </view>
</template>

<script setup lang="ts">
defineProps<{
  countryOptions: string[]
  countryIndex: number
  countryCode: string
  phone: string
  phoneMaxLength: number
  agreed: boolean
  loginSubmitting: boolean
  wechatSubmitting: boolean
  isPreview: boolean
}>()
const emit = defineEmits<{
  'update:phone': [value: string]
  'update:agreed': [value: boolean]
  'country-change': [event: { detail: { value: string | number } }]
  'wechat-login': []
  'phone-login': []
}>()
</script>

<style scoped>

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

.mini-program-login-shell {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 430px;
  height: 627px;
  overflow: hidden;
  box-sizing: border-box;
  border-radius: 25px 25px 0 0;
  background: #fff;
  box-shadow: 0 4px 4px rgba(56, 67, 74, 0.5);
}

.mini-program-login-card {
  position: absolute;
  left: 0;
  top: 0;
  width: 430px;
  height: 627px;
  overflow: hidden;
  box-sizing: border-box;
}

.mini-program-welcome { position: absolute; left: 40px; top: 29px; color: #38434a; font-family: 'Noto Sans TC', sans-serif; font-size: 38px; font-weight: 700; line-height: normal; }
.mini-program-register-icon { position: absolute; left: 40px; top: 99px; width: 25px; height: 25px; }
.mini-program-register-label { position: absolute; left: 40px; top: 139px; color: #38434a; font-family: 'Noto Sans TC', sans-serif; font-size: 16px; line-height: normal; }
.mini-program-wechat-button { position: absolute; left: 34px; top: 183px; width: 362px; height: 64px; margin: 0; padding: 0; border: 0; border-radius: 10px; background: #07c160; display: flex; align-items: center; justify-content: center; gap: 10px; }
.mini-program-wechat-button::after { border: 0; }
.mini-program-wechat-button.is-preview { opacity: 1; background: #07c160; }
.mini-program-wechat-button.is-preview::after { border: 0; }
 .mini-program-wechat-button.is-disabled { opacity: 0.55; pointer-events: none; }
.mini-program-wechat-icon { width: 30px; height: 25px; margin-right: 0; }
.mini-program-wechat-label { color: #fff; font-family: Inter, sans-serif; font-size: 20px; font-weight: 700; line-height: normal; }
.mini-program-phone-field { position: absolute; left: 34px; top: 288px; width: 362px; height: 64px; box-sizing: border-box; overflow: hidden; border: .5px solid #d9d9d9; border-radius: 10px; background: #fff; box-shadow: 0 4px 4px #d9d9d9; }
.mini-program-other-login { position: absolute; left: 140px; top: 264px; width: 150px; text-align: center; color: #38434a; background: #fff; font-size: 14px; line-height: 20px; }
.mini-program-agreement { left: 117px; }
.mini-program-agreement { top: 297px; }
.mini-program-login-button { position: absolute; left: 36.5px; top: 399px; width: 357px; height: 62px; margin: 0; padding: 0; border: 0; border-radius: 10px; background: #285cfc; display: flex; align-items: center; justify-content: center; }
.mini-program-login-button::after { border: 0; }
 .mini-program-login-button.is-disabled { opacity: 0.55; pointer-events: none; }
.mini-program-login-button text { color: #fff; font-family: 'Noto Sans TC', sans-serif; font-size: 20px; font-weight: 700; }
.mini-program-phone-field { top: 288px; left: 34px; }
.mini-program-phone-field .phone-input { left: var(--login-phone-number-left); }
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

.wechat-phone-button {
  margin: 0;
  padding: 0;
  border: none;
  outline: none;
  width: 45px;
  height: 45px;
  border-radius: 50%;
  background: transparent;
  line-height: 45px;
}

.wechat-phone-button::after {
  border: none;
}

.wechat-phone-button[disabled] {
  opacity: 0.45;
}

.wechat-phone-button .wechat-icon {
  position: static;
  display: block;
  width: 40px;
  height: 40px;
  margin: 2.5px;
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
.mini-program-agreement { top: 297px; }
</style>
