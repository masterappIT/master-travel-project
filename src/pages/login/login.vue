<template>
  <template v-if="isMiniProgram">
    <MiniProgramLogin v-if="miniProgramOptions" :options="miniProgramOptions" />
  </template>
  <view v-else class="login-page" :style="responsiveStyle">
    <image class="back-button" src="/static/login/back.svg" mode="scaleToFill" @tap="handleBack" />
    <image class="login-illustration" src="/static/login/illustration.svg" mode="scaleToFill" />
      <view class="login-card">
        <text class="welcome-title">Welcome</text>
        <image class="register-icon" src="/static/login/register.svg" mode="scaleToFill" />
        <text class="register-label">註冊/登入</text>

        <view v-if="phoneLoginEnabled" class="phone-field">
          <picker class="country-picker" mode="selector" :range="countryOptions" :value="countryIndex" @change="handleCountryChange"><view class="country-picker-content"><text class="country-code">{{ countryCode }}</text><image class="phone-mark" src="/static/login/phone-mark.svg" mode="scaleToFill" /></view></picker>
          <view class="phone-divider"><image src="/static/login/phone-divider.svg" mode="scaleToFill" /></view><input v-model="phone" class="phone-input" type="number" :maxlength="phoneMaxLength" />
        </view>
        <view class="agreement"><view class="agreement-checkbox" :class="{ checked: agreed }" @tap="agreed = !agreed"><text v-if="agreed">✓</text></view><text class="agreement-text">同意 </text><text class="agreement-link">私隱協議</text><text class="agreement-text"> 與 </text><text class="agreement-link">使用條款</text></view>
        <button v-if="phoneLoginEnabled" class="login-button" type="button" :disabled="loginSubmitting" @tap="handleLogin"><text>登入</text></button>
        <text v-if="availableThirdPartyMethods.length" class="third-party-label">第三方登入</text>
        <!-- #ifdef MP-WEIXIN --><view v-if="availableThirdPartyMethods.length" class="third-party-options third-party-options-single"><button class="wechat-phone-button" open-type="getPhoneNumber" :disabled="loginSubmitting || !agreed || isPreview" aria-label="微信登入並授權手機號碼" @getphonenumber="handleWechatPhoneNumber"><image class="wechat-icon" src="/static/login/wechat.svg" mode="scaleToFill" /></button></view><!-- #endif -->
        <!-- #ifdef H5 --><view v-if="availableThirdPartyMethods.length" class="third-party-options"><image v-for="method in availableThirdPartyMethods" :key="method.provider" :class="method.provider === 'wechat' ? 'wechat-icon' : 'apple-icon'" :src="method.logoUrl || (method.provider === 'wechat' ? '/static/login/wechat.svg' : '/static/login/apple.svg')" mode="scaleToFill" @tap="handleThirdPartyLogin(method.provider as 'wechat' | 'apple')" /></view><!-- #endif -->
        <!-- #ifdef APP-PLUS --><view v-if="availableThirdPartyMethods.length" class="third-party-options"><image v-for="method in availableThirdPartyMethods" :key="method.provider" :class="method.provider === 'wechat' ? 'wechat-icon' : 'apple-icon'" :src="method.logoUrl || (method.provider === 'wechat' ? '/static/login/wechat.svg' : '/static/login/apple.svg')" mode="scaleToFill" @tap="handleThirdPartyLogin(method.provider as 'wechat' | 'apple')" /></view><!-- #endif -->
      </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import MiniProgramLogin from './MiniProgramLogin.vue'
import { onLoad } from '@dcloudio/uni-app'
// #ifdef APP-IOS
import { disableInputAssistantToolbar } from '../../uni_modules/ios-keyboard-accessory'
// #endif
// #ifdef MP-WEIXIN
import { authenticateWechat, authenticateWechatPhone } from '../../services/api'
// #endif
import { useResponsiveCanvas } from '../../composables/useResponsiveCanvas'
import { authenticateThirdParty, getWechatWebAuthorizeUrl, listLoginMethods, requestPhoneVerificationCode, verifyPhoneVerificationCode, type LoginMethod } from '../../services/api'
import { setAuthenticated, isAuthenticated } from '../../utils/auth'
import { goHome } from '../../utils/navigation'
import { isAdminPreview } from '../../utils/adminPreview'
import { isAppleSignInSupported, signInWithApple } from '../../utils/appleSignIn'

defineOptions({ inheritAttrs: false })

const { responsiveStyle } = useResponsiveCanvas()
const countryOptions = ['香港 +852', '澳門 +853', '內地 +86', '美國/加拿大 +1', '英國 +44']
const countryCodes = ['+852', '+853', '+86', '+1', '+44']
const countryPhoneLengths = [8, 8, 11, 15, 15]
const countryIndex = ref(0)
const countryCode = ref(countryCodes[countryIndex.value])
const phone = ref('')
const agreed = ref(false)
const loginSubmitting = ref(false)
const loginMethods = ref<LoginMethod[]>([])
const isMiniProgram = computed(() => loginPlatform.value === 'miniProgram')
type MiniProgramMode = 'smsOnly' | 'wechatOnly' | 'wechatAndSms'
const miniProgramMode = ref<MiniProgramMode>('wechatOnly')
const phoneLoginEnabled = computed(() => loginMethods.value.some((method) => method.provider === 'phone'))
const availableThirdPartyMethods = computed(() => loginMethods.value.filter((method) => method.provider === 'wechat' || (method.provider === 'apple' && isAppleSignInSupported())))
const invitationCode = ref('')
// #ifdef MP-WEIXIN
const loginPlatform = ref<'web' | 'miniProgram'>('miniProgram')
// #endif
// #ifndef MP-WEIXIN
const loginPlatform = ref<'web' | 'miniProgram'>('web')
// #endif
const miniProgramOptions = ref<Record<string, string> | null>(null)
const miniProgramConfig = ref<Awaited<ReturnType<typeof getWechatMiniProgramConfig>> | null>(null)
const previewToken = ref('')
const isPreview = ref(false)
const phoneMaxLength = computed(() => countryPhoneLengths[countryIndex.value])

const readPreviewLoginMode = () => {
  const globalWindow = typeof globalThis !== 'undefined' ? (globalThis as typeof globalThis & { location?: { hash?: string } }) : undefined
  const hash = globalWindow?.location?.hash || ''
  const query = hash.includes('?') ? new URLSearchParams(hash.slice(hash.indexOf('?') + 1)) : null
  const mode = query?.get('loginMode')
  return mode && ['smsOnly', 'wechatOnly', 'wechatAndSms'].includes(mode) ? mode as MiniProgramMode : undefined
}

onLoad(async (options) => {
  // #ifdef APP-IOS
  disableInputAssistantToolbar()
  // #endif
  // #ifdef MP-WEIXIN
  loginPlatform.value = 'miniProgram'
  // #endif
  // #ifndef MP-WEIXIN
  loginPlatform.value = options?.platform === 'miniProgram' ? 'miniProgram' : 'web'
  // #endif
  isPreview.value = isAdminPreview(options)
  if (isMiniProgram.value) {
    miniProgramOptions.value = { ...options }
    return
  }
  if (!isPreview.value && isAuthenticated()) {
    goHome()
    return
  }
  previewToken.value = typeof options?.previewToken === 'string' ? options.previewToken : ''
  const previewMode = (typeof options?.loginMode === 'string' && ['smsOnly', 'wechatOnly', 'wechatAndSms'].includes(options.loginMode)
    ? options.loginMode as MiniProgramMode
    : readPreviewLoginMode())
  try {
    // #ifdef MP-WEIXIN
    loginMethods.value = await listLoginMethods('passenger', 'miniProgram', isPreview.value, previewToken.value, previewMode)
    // #endif
    // #ifndef MP-WEIXIN
    loginMethods.value = await listLoginMethods('passenger', loginPlatform.value, isPreview.value, previewToken.value, previewMode)
    // #endif
    if (loginPlatform.value === 'miniProgram') {
      const hasWechat = loginMethods.value.some((method) => method.provider === 'wechat')
      const hasPhone = loginMethods.value.some((method) => method.provider === 'phone')
      miniProgramMode.value = previewMode || (hasWechat && hasPhone ? 'wechatAndSms' : hasWechat ? 'wechatOnly' : 'smsOnly')
    }
  } catch {
    loginMethods.value = []
  }
  invitationCode.value = typeof options?.invite === 'string' ? options.invite.trim().toUpperCase() : ''
  // #ifdef H5
  const wechatWebCode = typeof options?.code === 'string' ? options.code : ''
  const wechatWebState = typeof options?.state === 'string' ? options.state : ''
  if (wechatWebCode && wechatWebState && !isPreview.value) {
    loginSubmitting.value = true
    try {
      const result = await authenticateThirdParty('wechat', wechatWebCode, wechatWebState)
      setAuthenticated(result.token, result.user, result.expiresAt)
      goHome()
      return
    } catch (error) {
      uni.showToast({ title: error instanceof Error ? error.message : '微信登入失敗', icon: 'none' })
    } finally {
      loginSubmitting.value = false
    }
  }
  // #endif
})

const handleMiniProgramWechatLogin = async () => {
  if (isPreview.value) {
    uni.showToast({ title: 'LIVE PREVIEW 僅供預覽，不能登入或前往其他頁面', icon: 'none' })
    return
  }
  // #ifdef MP-WEIXIN
  if (!agreed.value) {
    uni.showToast({ title: '請先同意私隱協議及使用條款', icon: 'none' })
    return
  }
  try {
    loginSubmitting.value = true
    const result = await new Promise<UniApp.LoginRes>((resolve, reject) => uni.login({ provider: 'weixin', success: resolve, fail: reject }))
    if (!result.code) throw new Error('微信授權碼無效')
    const auth = await authenticateWechat(result.code)
    setAuthenticated(auth.token, auth.user, auth.expiresAt)
    goHome()
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : '微信登入失敗', icon: 'none' })
  } finally {
    loginSubmitting.value = false
  }
  // #endif
  // #ifndef MP-WEIXIN
  uni.showToast({ title: '微信登入目前只支援小程序', icon: 'none' })
  // #endif
}
const handleCountryChange = (event: { detail: { value: string | number } }) => {
  const index = Number(event.detail.value)
  countryIndex.value = index
  countryCode.value = countryCodes[index]
  phone.value = phone.value.slice(0, countryPhoneLengths[index])
}

const handleBack = () => {
  if (isPreview.value) {
    uni.showToast({ title: 'LIVE PREVIEW 已鎖定登入頁', icon: 'none' })
    return
  }
  uni.reLaunch({ url: '/pages/index/index?guest=1', animationType: 'none', animationDuration: 0 })
}

const handleLogin = async () => {
  if (isPreview.value) {
    uni.showToast({ title: 'LIVE PREVIEW 僅供預覽，不能登入或前往其他頁面', icon: 'none' })
    return
  }
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
    const challenge = await requestPhoneVerificationCode(countryCode.value, phone.value, loginPlatform.value)
    const query = [
      `challengeId=${encodeURIComponent(challenge.challengeId)}`,
      `phone=${encodeURIComponent(`${countryCode.value}-${phone.value}`)}`,
      `countryCode=${encodeURIComponent(countryCode.value)}`,
      `phoneNumber=${encodeURIComponent(phone.value)}`,
      `platform=${loginPlatform.value}`,
      `invite=${encodeURIComponent(invitationCode.value)}`
    ].join('&')
    uni.navigateTo({ url: `/pages/login/verify?${query}`, animationType: 'none', animationDuration: 0 })
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : '驗證碼發送失敗', icon: 'none' })
  } finally {
    loginSubmitting.value = false
  }
}

// #ifdef MP-WEIXIN
const handleWechatPhoneNumber = async (event: { detail?: { code?: string; errMsg?: string } }) => {
  if (isPreview.value) {
    uni.showToast({ title: 'LIVE PREVIEW 僅供預覽，不能登入或前往其他頁面', icon: 'none' })
    return
  }
  if (loginSubmitting.value) return
  if (!agreed.value) {
    uni.showToast({ title: '請先同意私隱協議及使用條款', icon: 'none' })
    return
  }
  const phoneCode = event.detail?.code?.trim()
  if (!phoneCode) {
    uni.showToast({ title: event.detail?.errMsg || '請授權微信手機號碼', icon: 'none' })
    return
  }
  try {
    loginSubmitting.value = true
    const loginResult = await new Promise<UniApp.LoginRes>((resolve, reject) => {
      uni.login({ provider: 'weixin', success: resolve, fail: reject })
    })
    if (!loginResult.code) throw new Error('微信授權碼無效')
    let avatarUrl = ''
    let nickname = ''
    try {
      const profile = await new Promise<{ userInfo?: { avatarUrl?: string; nickName?: string } }>((resolve, reject) => {
        uni.getUserProfile({ desc: '用於設定您的頭像與暱稱', success: resolve, fail: reject })
      })
      avatarUrl = profile.userInfo?.avatarUrl?.trim() || ''
      nickname = profile.userInfo?.nickName?.trim() || ''
    } catch {
      // 頭像與暱稱授權是可選的，不影響手機號碼登入。
    }
    const result = await authenticateWechatPhone(loginResult.code, phoneCode, invitationCode.value, avatarUrl, nickname)
    setAuthenticated(result.token, result.user, result.expiresAt)
    goHome()
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : '微信手機號碼授權失敗', icon: 'none' })
  } finally {
    loginSubmitting.value = false
  }
}
// #endif

const handleThirdPartyLogin = async (provider: 'wechat' | 'apple') => {
  if (isPreview.value) {
    uni.showToast({ title: 'LIVE PREVIEW 僅供預覽，不能登入或前往其他頁面', icon: 'none' })
    return
  }
  if (provider === 'wechat') {
    // #ifdef H5
    try {
      loginSubmitting.value = true
      const { url } = await getWechatWebAuthorizeUrl()
      window.location.href = url
    } catch (error) {
      uni.showToast({ title: error instanceof Error ? error.message : '微信登入目前未開放', icon: 'none' })
      loginSubmitting.value = false
    }
    // #endif
    // #ifndef H5
    uni.showToast({ title: '微信登入目前只支援小程序', icon: 'none' })
    // #endif
    return
  }
  try {
    const providerToken = await signInWithApple()
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
.mini-program-login-card--wechatOnly .mini-program-agreement { top: 297px; }
.mini-program-login-card--wechatAndSms .mini-program-agreement { top: 367px; }
.mini-program-login-button { position: absolute; left: 36.5px; top: 399px; width: 357px; height: 62px; margin: 0; padding: 0; border: 0; border-radius: 10px; background: #285cfc; display: flex; align-items: center; justify-content: center; }
.mini-program-login-button::after { border: 0; }
 .mini-program-login-button.is-disabled { opacity: 0.55; pointer-events: none; }
.mini-program-login-button text { color: #fff; font-family: 'Noto Sans TC', sans-serif; font-size: 20px; font-weight: 700; }
.mini-program-phone-field { top: 288px; left: 34px; }
.mini-program-phone-field .phone-input { left: var(--login-phone-number-left); }
.mini-program-login-card--wechatAndSms .mini-program-phone-field { top: 291px; }
.mini-program-login-card--wechatAndSms .mini-program-other-login { top: 259px; }
.mini-program-login-card--wechatAndSms .mini-program-agreement { top: 370px; }
.mini-program-login-card--wechatAndSms .mini-program-login-button { top: 397px; }
.mini-program-login-card--smsOnly .mini-program-phone-field { top: 213px; }
.mini-program-login-card--smsOnly .mini-program-agreement { top: 297px; }
.mini-program-login-card--smsOnly .mini-program-login-button { top: 375px; }
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
</style>
