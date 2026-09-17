<template>
  <view class="page" :style="responsiveStyle">
    <view class="header">
      <image class="back" src="/static/messages/back.svg" mode="aspectFit" @tap="goBack" />
      <text class="header-title">個人帳戶</text>
      <view class="tabs">
        <text class="tab" :class="{ active: activeTab === 'profile' }" @tap="activeTab = 'profile'">個人資料</text>
        <text class="tab" :class="{ active: activeTab === 'security' }" @tap="activeTab = 'security'">安全</text>
        <text class="tab" @tap="comingSoon('私隱和其他')">私隱和其他</text>
        <view class="active-line" :class="activeTab" />
      </view>
    </view>

    <template v-if="activeTab === 'profile'">
      <view class="avatar-wrap" @tap="chooseAvatar"><image class="avatar" :src="avatarUrl || '/static/account/avatar.svg'" mode="aspectFill" /></view>
      <view class="form-card">
        <view class="field"><image src="/static/account/name.svg" mode="aspectFit" /><text>姓名</text><input class="value-input" :class="{ filled: !!form.name.trim(), empty: !form.name.trim() }" v-model="form.name" /></view>
        <view class="field"><image src="/static/account/display-name.svg" mode="aspectFit" /><text>顯示名稱</text><input class="value-input" :class="{ filled: !!form.displayName.trim(), empty: !form.displayName.trim() }" v-model="form.displayName" /></view>
        <view class="field"><image src="/static/account/gender.svg" mode="aspectFit" /><text>性別</text><view class="gender"><text :class="{ selected: form.gender === '先生', empty: !form.gender }" @tap="form.gender = '先生'">先生</text><text :class="{ selected: form.gender === '女士', empty: !form.gender }" @tap="form.gender = '女士'">女士</text></view></view>
        <view class="field" @tap="chooseRegion"><image src="/static/account/region.svg" mode="aspectFit" /><text>地區</text><text class="value" :class="{ filled: !!form.region, empty: !form.region }">{{ form.region || '請選擇' }}</text></view>
        <picker mode="date" :value="form.birthday" @change="changeBirthday"><view class="field"><image src="/static/account/birthday.svg" mode="aspectFit" /><text>生日</text><text class="value" :class="{ filled: !!form.birthday, empty: !form.birthday }">{{ form.birthday || '請選擇' }}</text></view></picker>
      </view>
      <view class="save" @tap="save"><text>保存</text></view>
    </template>

    <template v-else>
      <view class="security-card">
        <view class="security-row phone-row" @tap="startPhoneChange"><image class="security-icon phone" src="/static/security/phone.svg" mode="aspectFit" /><text class="security-label">已連接電話：</text><view class="country-picker"><view class="country-code">{{ countryCode }}</view></view><input class="security-input phone-input" v-model="phoneNumber" type="number" readonly /><view class="verified"><image src="/static/security/verified.svg" mode="aspectFit" /><text>已獲驗證</text></view></view>
        <view class="security-row email-row" @tap="startEmailSetup"><image class="security-icon email" src="/static/security/email.svg" mode="aspectFit" /><text class="security-label">已連接email：</text><text class="email-status" :class="{ connected: emailConnected }">{{ emailConnected ? security.email : '未連接' }}</text></view>
        <view class="security-row password-row" @tap="startPasswordSetup"><image class="security-icon password" src="/static/security/password.svg" mode="aspectFit" /><text class="security-label">密碼：</text><text class="password-status" :class="{ connected: passwordConnected }">{{ passwordConnected ? '已設定' : '未設定' }}</text></view>
      </view>
      <view class="third-party-card">
        <text class="third-party-title">第三方登入帳戶</text>
        <view class="provider-row apple-row"><image class="provider-icon apple" src="/static/security/apple.svg" mode="aspectFit" /><text>Apple</text><view class="link-button linked" @tap="toggleProvider('apple')"><text>{{ security.appleLinked ? '解除連結' : '連結' }}</text></view></view>
        <view class="provider-row"><image class="provider-icon wechat" src="/static/security/wechat.svg" mode="aspectFit" /><text>Wechat</text><view class="link-button" :class="{ linked: security.wechatLinked }" @tap="toggleProvider('wechat')"><text>{{ security.wechatLinked ? '解除連結' : '連結' }}</text></view></view>
      </view>
    </template>
    <view v-if="passwordDialogVisible" class="email-dialog-mask" @tap="closePasswordDialog">
      <view class="email-dialog" @tap.stop>
        <view class="email-dialog-header"><text class="email-dialog-title">設定密碼</text><text class="email-dialog-close" @tap="closePasswordDialog">×</text></view>
        <view class="email-dialog-body"><text class="email-dialog-hint">{{ passwordConnected ? '請輸入新的密碼' : '尚未設定密碼，請先輸入密碼' }}</text><input class="email-input-dialog" v-model="passwordDialogValue" password placeholder="請輸入密碼" @input="passwordDialogError = ''" /><text v-if="passwordDialogError" class="email-dialog-error">{{ passwordDialogError }}</text><view class="email-dialog-actions"><view class="email-dialog-button secondary" @tap="closePasswordDialog">取消</view><view class="email-dialog-button primary" @tap="savePasswordSetup">保存</view></view></view>
      </view>
    </view>
    <view v-if="emailDialogVisible" class="email-dialog-mask" @tap="closeEmailDialog">
      <view class="email-dialog" @tap.stop>
        <view class="email-dialog-header"><text class="email-dialog-title">連接 email</text><text class="email-dialog-close" @tap="closeEmailDialog">×</text></view>
        <view class="email-dialog-body"><text class="email-dialog-hint">{{ emailConnected ? '請輸入 email 地址' : '尚未連接 email，請填寫 email 地址' }}</text><input class="email-input-dialog" v-model="emailDialogValue" type="text" placeholder="請輸入 email" @input="emailDialogError = ''" /><text v-if="emailDialogError" class="email-dialog-error">{{ emailDialogError }}</text><view class="email-dialog-actions"><view class="email-dialog-button secondary" @tap="closeEmailDialog">取消</view><view class="email-dialog-button primary" @tap="saveEmailSetup">保存</view></view></view>
      </view>
    </view>
    <view v-if="phoneDialogVisible" class="phone-dialog-mask" @tap="closePhoneDialog">
      <view class="phone-dialog" @tap.stop>
        <view class="phone-dialog-header"><text class="phone-dialog-title">{{ phoneDialogStep === 'confirm' ? '修改登入電話' : phoneDialogStep === 'country' ? '選擇區號' : phoneDialogStep === 'phone' ? '填寫電話號碼' : '輸入驗證碼' }}</text><text class="phone-dialog-close" @tap="closePhoneDialog">×</text></view>
        <view v-if="phoneDialogStep === 'confirm'" class="phone-dialog-body"><text class="phone-dialog-message">修改登入電話後，需要重新接收驗證碼驗證。驗證成功後才會完成更新。</text><view class="phone-dialog-actions"><view class="phone-dialog-button secondary" @tap="closePhoneDialog">取消</view><view class="phone-dialog-button primary" @tap="continuePhoneChange">開始修改</view></view></view>
        <view v-else-if="phoneDialogStep === 'country'" class="phone-dialog-body"><text class="phone-dialog-hint">請選擇新電話的國家或地區號碼</text><view class="country-options"><view v-for="code in countryCodes" :key="code" class="country-option" :class="{ selected: phoneDialogCountry === code }" @tap="selectPhoneCountry(code)"><text>{{ code }}</text><text v-if="phoneDialogCountry === code">✓</text></view></view></view>
        <view v-else-if="phoneDialogStep === 'phone'" class="phone-dialog-body"><text class="phone-dialog-hint">電話號碼將發送驗證碼</text><view class="phone-entry"><text>{{ phoneDialogCountry }}</text><input v-model="phoneDialogNumber" type="number" :maxlength="phoneLength" placeholder="請輸入電話號碼" /></view><text v-if="phoneDialogError" class="phone-dialog-error">{{ phoneDialogError }}</text><view class="phone-dialog-actions"><view class="phone-dialog-button secondary" @tap="backToCountry">返回</view><view class="phone-dialog-button primary" @tap="requestPhoneCode">{{ phoneDialogBusy ? '發送中...' : '接收驗證碼' }}</view></view></view>
        <view v-else class="phone-dialog-body"><text class="phone-dialog-hint">驗證碼已發送至 {{ phoneDialogCountry }} {{ phoneDialogNumber }}</text><input class="verification-input" v-model="phoneDialogCode" type="number" maxlength="6" placeholder="請輸入驗證碼" /><text v-if="phoneDialogError" class="phone-dialog-error">{{ phoneDialogError }}</text><view class="phone-dialog-actions"><view class="phone-dialog-button secondary" @tap="backToPhone">返回</view><view class="phone-dialog-button primary" @tap="verifyPhoneCode">{{ phoneDialogBusy ? '驗證中...' : '確認驗證' }}</view></view></view>
      </view>
    </view>
  </view>
</template>
<script setup lang="ts">
import { useResponsiveCanvas } from '../../composables/useResponsiveCanvas'

import { closeCachedPage } from '../../utils/navigation'

const { responsiveStyle } = useResponsiveCanvas()
import { onShow } from '@dcloudio/uni-app'
import { computed, reactive, ref, onMounted } from 'vue'
import { getAuthUser, setAuthenticated } from '../../utils/auth'
import { getClientProfile, updateClientProfile, uploadClientAvatar, getClientSecurity, updateClientSecurity, requestClientPhoneChange, verifyClientPhoneChange, linkClientProvider, unlinkClientProvider } from '../../services/api'
type Provider = 'apple' | 'wechat'
const stored = uni.getStorageSync('account-profile') || {}
const storedSecurity = uni.getStorageSync('account-security') || {}
const authenticatedUser = getAuthUser()
const activeTab = ref<'profile' | 'security'>('profile')
const avatarUrl = ref<string>(stored.avatarUrl || '')
const form = reactive({ name: stored.name || '', displayName: stored.displayName || '', gender: stored.gender || '先生', region: stored.region || '香港', birthday: stored.birthday || '1990-01-01' })
const registeredPhone = authenticatedUser?.countryCode && authenticatedUser.phoneNumber ? `${authenticatedUser.countryCode} ${authenticatedUser.phoneNumber}` : ''
const security = reactive({ phone: registeredPhone || storedSecurity.phone || '', password: '', email: storedSecurity.email || '', passwordSet: storedSecurity.passwordSet ?? false, appleLinked: storedSecurity.appleLinked ?? false, wechatLinked: storedSecurity.wechatLinked ?? true })
const emailDialogVisible = ref(false)
const emailDialogValue = ref('')
const emailDialogError = ref('')
const emailConnected = computed(() => !!security.email.trim())
const passwordDialogVisible = ref(false)
const passwordDialogValue = ref('')
const passwordDialogError = ref('')
const passwordConnected = computed(() => security.passwordSet)
const countryCodes = ['+852', '+853', '+86', '+1', '+44']
const phoneParts = security.phone.trim().split(/\s+/)
const countryCode = ref(countryCodes.includes(phoneParts[0]) ? phoneParts[0] : '')
const countryCodeIndex = ref(Math.max(0, countryCodes.indexOf(countryCode.value)))
const phoneNumber = ref(countryCodes.includes(phoneParts[0]) ? phoneParts.slice(1).join(' ') : '')
const startPasswordSetup = () => { passwordDialogValue.value = ''; passwordDialogError.value = ''; passwordDialogVisible.value = true }
const closePasswordDialog = () => { passwordDialogVisible.value = false; passwordDialogError.value = '' }
const savePasswordSetup = async () => {
  const password = passwordDialogValue.value.trim()
  if (!password) { passwordDialogError.value = '請填寫密碼'; return }
  if (password.length < 8 || password.length > 200) { passwordDialogError.value = '密碼長度需為 8 至 200 個字元'; return }
  try {
    const result = await updateClientSecurity({ email: security.email, password })
    security.passwordSet = result.passwordSet
    uni.setStorageSync('account-security', { ...security })
    closePasswordDialog()
    uni.showToast({ title: '密碼已保存', icon: 'success' })
  } catch (error) { passwordDialogError.value = error instanceof Error ? error.message : '密碼保存失敗' }
}
const startEmailSetup = () => { emailDialogValue.value = security.email; emailDialogError.value = ''; emailDialogVisible.value = true }
const closeEmailDialog = () => { emailDialogVisible.value = false; emailDialogError.value = '' }
const saveEmailSetup = async () => {
  const email = emailDialogValue.value.trim()
  if (!email) { emailDialogError.value = '請填寫 email 地址'; return }
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { emailDialogError.value = '請輸入有效的 email 地址'; return }
  try {
    await updateClientSecurity({ email })
    security.email = email
    uni.setStorageSync('account-security', { ...security })
    closeEmailDialog()
    uni.showToast({ title: 'email 已保存', icon: 'success' })
  } catch (error) { emailDialogError.value = error instanceof Error ? error.message : 'email 保存失敗' }
}
const phoneDialogVisible = ref(false)
const phoneDialogStep = ref<'confirm' | 'country' | 'phone' | 'verify'>('confirm')
const phoneDialogCountry = ref(countryCode.value)
const phoneDialogNumber = ref('')
const phoneDialogCode = ref('')
const phoneDialogError = ref('')
const phoneDialogBusy = ref(false)
const phoneChallengeId = ref('')
const phoneLength = computed(() => phoneDialogCountry.value === '+86' ? 11 : phoneDialogCountry.value === '+852' || phoneDialogCountry.value === '+853' ? 8 : 15)
const validatePhoneNumber = (value: string) => {
  if (!/^\d+$/.test(value)) return '電話號碼只能包含數字'
  if ((phoneDialogCountry.value === '+852' || phoneDialogCountry.value === '+853') && value.length !== 8) return '香港及澳門電話號碼必須為8位數'
  if (phoneDialogCountry.value === '+86' && value.length !== 11) return '中國內地電話號碼必須為11位數'
  if (value.length < 4 || value.length > 15) return '電話號碼格式不正確'
  return ''
}
let phoneDialogRun = 0
const startPhoneChange = () => {
  if (phoneDialogVisible.value) return
  phoneDialogRun += 1
  phoneDialogStep.value = 'confirm'
  phoneDialogCountry.value = countryCode.value
  phoneDialogNumber.value = ''
  phoneDialogCode.value = ''
  phoneDialogError.value = ''
  phoneChallengeId.value = ''
  phoneDialogVisible.value = true
}
const closePhoneDialog = () => {
  phoneDialogRun += 1
  phoneDialogVisible.value = false
  phoneDialogBusy.value = false
  phoneChallengeId.value = ''
}
const continuePhoneChange = () => { phoneDialogError.value = ''; phoneDialogStep.value = 'country' }
const backToCountry = () => { phoneDialogError.value = ''; phoneDialogStep.value = 'country' }
const backToPhone = () => { phoneDialogError.value = ''; phoneDialogStep.value = 'phone' }
const selectPhoneCountry = (code: string) => {
  phoneDialogCountry.value = code
  phoneDialogError.value = ''
  phoneDialogStep.value = 'phone'
}
const requestPhoneCode = async () => {
  if (phoneDialogBusy.value) return
  const nextPhone = phoneDialogNumber.value.trim()
  if (!nextPhone) { phoneDialogError.value = '請填寫電話號碼'; return }
  const phoneError = validatePhoneNumber(nextPhone)
  if (phoneError) { phoneDialogError.value = phoneError; return }
  if (phoneDialogCountry.value === countryCode.value && nextPhone === phoneNumber.value) { phoneDialogError.value = '請填寫新的電話號碼'; return }
  const run = phoneDialogRun
  phoneDialogBusy.value = true
  phoneDialogError.value = ''
  try {
    const challenge = await requestClientPhoneChange(phoneDialogCountry.value, nextPhone)
    if (run !== phoneDialogRun) return
    phoneChallengeId.value = challenge.challengeId
    phoneDialogCode.value = ''
    phoneDialogStep.value = 'verify'
  } catch (error) {
    if (run === phoneDialogRun) phoneDialogError.value = error instanceof Error ? error.message : '驗證碼發送失敗'
  } finally {
    if (run === phoneDialogRun) phoneDialogBusy.value = false
  }
}
const verifyPhoneCode = async () => {
  if (phoneDialogBusy.value) return
  const code = phoneDialogCode.value.trim()
  if (!code) { phoneDialogError.value = '請輸入驗證碼'; return }
  const run = phoneDialogRun
  phoneDialogBusy.value = true
  phoneDialogError.value = ''
  try {
    const result = await verifyClientPhoneChange(phoneChallengeId.value, code)
    if (run !== phoneDialogRun) { void loadSecurity(); return }
    countryCode.value = result.countryCode
    countryCodeIndex.value = Math.max(0, countryCodes.indexOf(result.countryCode))
    phoneNumber.value = result.phoneNumber
    security.phone = `${result.countryCode} ${result.phoneNumber}`
    uni.setStorageSync('account-security', { ...security })
    closePhoneDialog()
    uni.showToast({ title: '電話已更新', icon: 'success' })
  } catch (error) {
    if (run === phoneDialogRun) {
      phoneDialogError.value = `驗證碼錯誤或已過期，請重新輸入電話號碼獲取驗證碼。${error instanceof Error ? `（${error.message}）` : ''}`
      phoneChallengeId.value = ''
      phoneDialogCode.value = ''
      phoneDialogStep.value = 'phone'
    }
  } finally {
    if (run === phoneDialogRun) phoneDialogBusy.value = false
  }
}
const toggleProvider = async (provider: Provider) => {
  const key = `${provider}Linked` as 'appleLinked' | 'wechatLinked'
  try {
    const result = security[key] ? await unlinkClientProvider(provider) : await linkClientProvider(provider)
    security.appleLinked = result.linkedProviders.includes('apple')
    security.wechatLinked = result.linkedProviders.includes('wechat')
    uni.setStorageSync('account-security', { ...security })
    uni.showToast({ title: security[key] ? '已連結' : '已解除連結', icon: 'none' })
  } catch (error) { uni.showToast({ title: error instanceof Error ? error.message : '操作失敗', icon: 'none' }) }
}
const chooseRegion = () => uni.showActionSheet({ itemList: ['香港', '澳門', '中國內地'], success: ({ tapIndex }) => { form.region = ['香港', '澳門', '中國內地'][tapIndex] } })
const changeBirthday = (event: { detail: { value: string } }) => { form.birthday = event.detail.value }
const chooseAvatar = () => uni.chooseImage({ count: 1, sizeType: ['compressed'], sourceType: ['album', 'camera'], success: async ({ tempFilePaths }) => {
  const filePath = tempFilePaths[0]
  if (!filePath) return
  try {
    const user = await uploadClientAvatar(filePath)
    avatarUrl.value = user.avatarUrl || ''
    uni.setStorageSync('account-profile', { ...form, avatarUrl: avatarUrl.value })
    setAuthenticated(undefined, user)
    uni.showToast({ title: '頭像已更新', icon: 'success' })
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : '頭像上傳失敗', icon: 'none' })
  }
} })
const save = async () => {
  try {
    const user = await updateClientProfile({ ...form, email: security.email })
    form.name = user.name || ''
    form.displayName = user.displayName || ''
    form.gender = user.gender || ''
    form.region = user.region || ''
    form.birthday = user.birthday || ''
    avatarUrl.value = user.avatarUrl || ''
    security.email = user.email || ''
    countryCode.value = user.countryCode || countryCode.value
    phoneNumber.value = user.phoneNumber || phoneNumber.value
    security.phone = `${countryCode.value} ${phoneNumber.value}`
    uni.setStorageSync('account-profile', { ...form, avatarUrl: avatarUrl.value })
    setAuthenticated(undefined, user)
    uni.showToast({ title: '已保存', icon: 'success' })
  } catch {
    uni.showToast({ title: '保存失敗，請稍後再試', icon: 'none' })
  }
}
const comingSoon = (name: string) => uni.showToast({ title: `${name}功能開發中`, icon: 'none' })
const goBack = () => closeCachedPage('/pages/trips/trips')

const loadSecurity = async () => {
  try {
    const result = await getClientSecurity()
    countryCode.value = result.countryCode
    countryCodeIndex.value = Math.max(0, countryCodes.indexOf(result.countryCode))
    phoneNumber.value = result.phoneNumber
    security.phone = `${result.countryCode} ${result.phoneNumber}`
    security.email = result.email || ''
    security.passwordSet = result.passwordSet
    security.appleLinked = result.linkedProviders.includes('apple')
    security.wechatLinked = result.linkedProviders.includes('wechat')
    uni.setStorageSync('account-security', { ...security })
  } catch { /* Keep the authenticated user's cached phone when the API is unavailable. */ }
}

onMounted(async () => {
  try {
    const user = await getClientProfile()
    form.name = user.name || form.name
    form.displayName = user.displayName || form.displayName
    form.gender = user.gender || form.gender
    form.region = user.region || form.region
    form.birthday = user.birthday || form.birthday
    avatarUrl.value = user.avatarUrl || ''
    security.email = user.email || security.email
    countryCode.value = user.countryCode || countryCode.value
    phoneNumber.value = user.phoneNumber || phoneNumber.value
    security.phone = `${countryCode.value} ${phoneNumber.value}`
    uni.setStorageSync('account-profile', { ...form, avatarUrl: avatarUrl.value })
    uni.setStorageSync('account-security', { ...security })
    setAuthenticated(undefined, user)
    void loadSecurity()
  } catch {
    // Keep cached profile values when the API is unavailable.
  }
})

onShow(() => {
  void getClientProfile().then((user) => {
    avatarUrl.value = user.avatarUrl || ''
    form.name = user.name || ''
    form.displayName = user.displayName || ''
    countryCode.value = user.countryCode
    countryCodeIndex.value = Math.max(0, countryCodes.indexOf(user.countryCode))
    phoneNumber.value = user.phoneNumber
    security.phone = `${user.countryCode} ${user.phoneNumber}`
    uni.setStorageSync('account-profile', { ...form, avatarUrl: avatarUrl.value })
    uni.setStorageSync('account-security', { ...security })
    setAuthenticated(undefined, user)
    void loadSecurity()
  }).catch(() => undefined)
})
</script>
<style scoped>
.value-input{margin-left:auto;margin-right:30px;width:190px;height:22px;box-sizing:border-box;padding:0;border:0;background:transparent;color:#285CFC;font-size:14px;font-weight:600;text-align:right;line-height:22px}.value-input.empty{color:#9AA4B2}.value-input.filled{color:#285CFC}.value-input:focus{outline:none}
.security-input{margin-left:28px;width:150px;height:24px;box-sizing:border-box;padding:0;border:0;background:transparent;color:#38434A;font-size:15px;font-weight:400;line-height:24px}.security-input:focus{outline:none}.phone-row .security-input{margin-left:5px;width:108px}.country-picker{margin-left:8px}.country-code{width:auto;color:#38434A;font-size:14px;font-weight:500}.phone-row .verified{position:static;left:auto;margin-left:10px}.password-input{margin-left:32px}
.password-status{margin-left:18px;color:#9AA4B2;font-size:14px}.password-status.connected{color:#38434A;font-weight:400}
.email-status{margin-left:18px;max-width:270px;overflow:hidden;color:#9AA4B2;font-size:14px;text-overflow:ellipsis;white-space:nowrap}.email-status.connected{color:#38434A;font-weight:400}.email-dialog-mask{position:absolute;z-index:100;top:0;left:0;width:430px;height:var(--mobile-height,932px);display:flex;align-items:center;justify-content:center;background:rgba(20,29,38,.52)}.email-dialog{width:356px;overflow:hidden;border-radius:18px;background:#fff;box-shadow:0 16px 40px rgba(15,28,45,.18)}.email-dialog-header{position:relative;height:64px;display:flex;align-items:center;justify-content:center;border-bottom:1px solid #EEF0F4}.email-dialog-title{color:#202A33;font-size:20px;font-weight:700}.email-dialog-close{position:absolute;right:18px;top:14px;width:36px;height:36px;text-align:center;color:#87919D;font-size:28px;line-height:32px}.email-dialog-body{padding:22px 24px 24px}.email-dialog-hint{display:block;margin-bottom:16px;color:#7C8793;font-size:14px;line-height:21px}.email-input-dialog{width:100%;height:50px;padding:0 13px;border:1px solid #DCE1E7;border-radius:10px;box-sizing:border-box;color:#26323D;font-size:16px}.email-dialog-error{display:block;margin-top:10px;color:#E74C3C;font-size:13px}.email-dialog-actions{display:flex;gap:12px;margin-top:24px}.email-dialog-button{height:46px;display:flex;flex:1;align-items:center;justify-content:center;border-radius:10px;font-size:15px;font-weight:600}.email-dialog-button.secondary{border:1px solid #DCE1E7;color:#55616D}.email-dialog-button.primary{background:#285CFC;color:#fff}
:global(html),:global(body),:global(#app){width:100%;min-width:0;height:100%;margin:0;overflow:hidden;overscroll-behavior:none}.page{position:fixed;top:0;left:0;width:430px;height:var(--mobile-height, 932px);overflow:hidden;border-radius:35px;background:#F0F2F5;color:#38434A;font-family:'Noto Sans TC',sans-serif;transform:scale(var(--mobile-scale, 1));transform-origin:top left;}.header{position:absolute;top:0;left:0;width:430px;height:155px;overflow:hidden;border-radius:25px;background:#fff}.back{position:absolute;top:53px;left:26px;width:26px;height:39px;padding:7px;box-sizing:border-box}.header-title{position:absolute;top:56px;left:50%;transform:translateX(-50%);font-size:18px;font-weight:500}.tabs{position:absolute;bottom:0;left:37px;width:356px;height:33px;display:flex;justify-content:space-between}.tab{font-size:16px;font-weight:700}.tab.active{color:#285CFC}.active-line{position:absolute;bottom:0;width:32px;height:2px;background:#285CFC;transition:left .2s}.active-line.profile{left:0;width:64px}.active-line.security{left:154px}.avatar-wrap{position:absolute;top:175px;left:175px;width:80px;height:80px;border-radius:50%;overflow:hidden}.avatar{width:80px;height:80px}.form-card{position:absolute;top:275px;left:15px;width:400px;height:250px;overflow:hidden;border-radius:10px;background:#fff}.field{display:flex;height:50px;align-items:center;border-bottom:1px solid #D9D9D9;box-sizing:border-box}.field:last-child{border-bottom:0}.field image{width:20px;height:20px;margin-left:30px;margin-right:10px}.field>text:not(.value){font-size:16px;font-weight:500}.value{margin-left:auto;margin-right:30px;color:#285CFC;font-size:14px!important;font-weight:600!important}.value.filled{color:#285CFC}.value.empty{color:#9AA4B2}.gender{display:flex;gap:20px;margin-left:auto;margin-right:30px;font-size:14px;font-weight:700}.gender .selected{color:#285CFC}.gender .empty{color:#9AA4B2}.save{position:absolute;top:679px;left:36px;width:357px;height:50px;display:flex;align-items:center;justify-content:center;border-radius:10px;background:#285CFC;color:#fff;font-size:16px;font-weight:500}
.security-card,.third-party-card{position:absolute;left:15px;width:400px;overflow:hidden;border-radius:10px;background:#fff}.security-card{top:165px;height:150px}.security-row{position:relative;height:50px;display:flex;align-items:center;border-bottom:1px solid #d9d9d9;box-sizing:border-box;font-size:15px}.security-row:last-child{border-bottom:0}.security-icon{margin-left:13px;margin-right:10px;flex:none}.security-icon.phone{width:15px;height:15px}.security-icon.password{width:15px;height:18px}.security-icon.email{width:16px;height:13px}.security-label{font-weight:500;white-space:nowrap}.security-value{margin-left:28px;font-weight:400;white-space:nowrap}.phone-value{margin-left:29px}.password-value{margin-left:32px}.chevron{position:absolute;right:12px;width:20px;height:20px}.verified{position:absolute;left:277px;display:flex;align-items:center;gap:1px;color:#285CFC;font-size:8px;font-weight:500;white-space:nowrap}.verified image{width:15px;height:15px;flex:none}.third-party-card{top:335px;height:150px}.third-party-title{display:flex;height:50px;align-items:center;padding-left:10px;border-bottom:1px solid #d9d9d9;box-sizing:border-box;font-size:15px;font-weight:700}.provider-row{position:relative;height:50px;display:flex;align-items:center;border-bottom:1px solid #d9d9d9;box-sizing:border-box;color:#000;font-size:15px}.provider-row:last-child{border-bottom:0}.provider-icon{margin-left:11px;margin-right:10px;flex:none}.provider-icon.apple{width:30px;height:30px}.provider-icon.wechat{width:25px;height:25px;margin-left:15px;margin-right:10px}.link-button{position:absolute;right:40px;width:50px;height:20px;display:flex;align-items:center;justify-content:center;border-radius:10px;background:#285CFC;color:#fff;font-size:12px}.link-button.linked{width:80px;right:10px;border:1px solid #285CFC;box-sizing:border-box;background:#fff;color:#285CFC}
.phone-dialog-mask{position:absolute;z-index:100;top:0;left:0;width:430px;height:var(--mobile-height,932px);display:flex;align-items:center;justify-content:center;background:rgba(20,29,38,.52)}.phone-dialog{width:356px;overflow:hidden;border-radius:18px;background:#fff;box-shadow:0 16px 40px rgba(15,28,45,.18)}.phone-dialog-header{position:relative;height:64px;display:flex;align-items:center;justify-content:center;border-bottom:1px solid #EEF0F4}.phone-dialog-title{color:#202A33;font-size:20px;font-weight:700}.phone-dialog-close{position:absolute;right:18px;top:14px;width:36px;height:36px;text-align:center;color:#87919D;font-size:28px;line-height:32px}.phone-dialog-body{padding:22px 24px 24px}.phone-dialog-message{display:block;color:#66727E;font-size:15px;line-height:24px}.phone-dialog-hint{display:block;margin-bottom:16px;color:#7C8793;font-size:14px;line-height:21px}.phone-dialog-actions{display:flex;gap:12px;margin-top:24px}.phone-dialog-button{height:46px;display:flex;flex:1;align-items:center;justify-content:center;border-radius:10px;font-size:15px;font-weight:600}.phone-dialog-button.secondary{border:1px solid #DCE1E7;color:#55616D}.phone-dialog-button.primary{background:#285CFC;color:#fff}.country-options{display:flex;flex-direction:column;gap:8px}.country-option{height:45px;display:flex;align-items:center;justify-content:space-between;padding:0 16px;border:1px solid #E2E6EB;border-radius:10px;box-sizing:border-box;color:#38434A;font-size:15px}.country-option.selected{border-color:#285CFC;background:#F1F5FF;color:#285CFC;font-weight:600}.phone-entry{height:50px;display:flex;align-items:center;border:1px solid #DCE1E7;border-radius:10px;box-sizing:border-box}.phone-entry>text{padding:0 13px;border-right:1px solid #E2E6EB;color:#285CFC;font-size:15px;font-weight:600}.phone-entry input{height:48px;flex:1;padding:0 13px;color:#26323D;font-size:16px}.verification-input{width:100%;height:50px;padding:0 15px;border:1px solid #DCE1E7;border-radius:10px;box-sizing:border-box;color:#26323D;font-size:15px;letter-spacing:2px}.phone-dialog-error{display:block;margin-top:10px;color:#E74C3C;font-size:13px}

@media (max-width:599px){.page{top:0;left:0;height:var(--mobile-height,100dvh);border-radius:0;transform:scale(var(--mobile-scale, 1));transform-origin:top left}.save{top:auto;bottom:24px}}
</style>
