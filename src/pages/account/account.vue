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
        <view class="security-row phone-row"><image class="security-icon phone" src="/static/security/phone.svg" mode="aspectFit" /><text class="security-label">已連接電話：</text><picker class="country-picker" mode="selector" :range="countryCodes" :value="countryCodeIndex" @change="changeCountryCode"><view class="country-code">{{ countryCode }}</view></picker><input class="security-input phone-input" v-model="phoneNumber" type="number" @blur="savePhone" /><view class="verified"><image src="/static/security/verified.svg" mode="aspectFit" /><text>已獲驗證</text></view></view>
        <view class="security-row"><image class="security-icon password" src="/static/security/password.svg" mode="aspectFit" /><text class="security-label">密碼：</text><input class="security-input password-input" v-model="security.password" password placeholder="請輸入密碼" @blur="persistSecurity" /></view>
        <view class="security-row"><image class="security-icon email" src="/static/security/email.svg" mode="aspectFit" /><text class="security-label">已連接email：</text><input class="security-input email-input" v-model="security.email" type="text" placeholder="請輸入email" @blur="persistSecurity" /></view>
      </view>
      <view class="third-party-card">
        <text class="third-party-title">第三方登入帳戶</text>
        <view class="provider-row apple-row"><image class="provider-icon apple" src="/static/security/apple.svg" mode="aspectFit" /><text>Apple</text><view class="link-button linked" @tap="toggleProvider('apple')"><text>{{ security.appleLinked ? '解除連結' : '連結' }}</text></view></view>
        <view class="provider-row"><image class="provider-icon wechat" src="/static/security/wechat.svg" mode="aspectFit" /><text>Wechat</text><view class="link-button" :class="{ linked: security.wechatLinked }" @tap="toggleProvider('wechat')"><text>{{ security.wechatLinked ? '解除連結' : '連結' }}</text></view></view>
      </view>
    </template>
  </view>
</template>
<script setup lang="ts">
import { useResponsiveCanvas } from '../../composables/useResponsiveCanvas'

import { closeCachedPage } from '../../utils/navigation'

const { responsiveStyle } = useResponsiveCanvas()
import { onShow } from '@dcloudio/uni-app'
import { reactive, ref, onMounted } from 'vue'
import { setAuthenticated } from '../../utils/auth'
import { getClientProfile, updateClientProfile, uploadClientAvatar, getClientSecurity, updateClientSecurity, requestClientPhoneChange, verifyClientPhoneChange, linkClientProvider, unlinkClientProvider } from '../../services/api'
type Provider = 'apple' | 'wechat'
const stored = uni.getStorageSync('account-profile') || {}
const storedSecurity = uni.getStorageSync('account-security') || {}
const activeTab = ref<'profile' | 'security'>('profile')
const avatarUrl = ref<string>(stored.avatarUrl || '')
const form = reactive({ name: stored.name || 'John', displayName: stored.displayName || 'John', gender: stored.gender || '先生', region: stored.region || '香港', birthday: stored.birthday || '1990-01-01' })
const security = reactive({ phone: storedSecurity.phone || '+852 60556543', password: '', email: storedSecurity.email || 'info@mail.com', appleLinked: storedSecurity.appleLinked ?? false, wechatLinked: storedSecurity.wechatLinked ?? true })
const countryCodes = ['+852', '+853', '+86', '+1', '+44']
const phoneParts = security.phone.trim().split(/\s+/)
const countryCode = ref(countryCodes.includes(phoneParts[0]) ? phoneParts[0] : '+852')
const countryCodeIndex = ref(Math.max(0, countryCodes.indexOf(countryCode.value)))
const phoneNumber = ref(phoneParts.slice(1).join(' ') || security.phone)
const persistSecurity = async () => {
  try {
    const result = await updateClientSecurity({ email: security.email, password: security.password || undefined })
    security.email = result.email || ''
    security.password = ''
    security.appleLinked = result.linkedProviders.includes('apple')
    security.wechatLinked = result.linkedProviders.includes('wechat')
    security.phone = `${result.countryCode} ${result.phoneNumber}`
    uni.setStorageSync('account-security', { ...security })
  } catch { uni.showToast({ title: '安全設定保存失敗', icon: 'none' }) }
}
const savePhone = async () => {
  const nextPhone = phoneNumber.value.trim()
  const currentParts = security.phone.split(' ')
  if (!nextPhone || (countryCode.value === currentParts[0] && nextPhone === currentParts.slice(1).join(' '))) return
  const confirmed = await new Promise<boolean>((resolve) => uni.showModal({ title: '修改登入電話', content: '修改電話後需要重新接收驗證碼，驗證成功後才會完成更新。是否繼續？', success: (result) => resolve(result.confirm) }))
  if (!confirmed) return
  try {
    const challenge = await requestClientPhoneChange(countryCode.value, nextPhone)
    const code = challenge.developmentCode || await new Promise<string | null>((resolve) => uni.showModal({ title: '輸入驗證碼', editable: true, placeholderText: '請輸入短信驗證碼', success: (result) => resolve(result.confirm ? result.content?.trim() || null : null) }))
    if (!code) return
    const result = await verifyClientPhoneChange(challenge.challengeId, code)
    security.phone = `${result.countryCode} ${result.phoneNumber}`
    countryCode.value = result.countryCode
    phoneNumber.value = result.phoneNumber
    uni.setStorageSync('account-security', { ...security })
    uni.showToast({ title: '電話已更新', icon: 'success' })
  } catch (error) { uni.showToast({ title: error instanceof Error ? error.message : '電話驗證失敗', icon: 'none' }) }
}
const changeCountryCode = (event: { detail: { value: number } }) => { countryCodeIndex.value = Number(event.detail.value); countryCode.value = countryCodes[countryCodeIndex.value] }
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
    security.appleLinked = result.linkedProviders.includes('apple')
    security.wechatLinked = result.linkedProviders.includes('wechat')
  } catch { /* Keep cached security values when the API is unavailable. */ }
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
    uni.setStorageSync('client-auth-user', user)
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
    uni.setStorageSync('account-profile', { ...form, avatarUrl: avatarUrl.value })
  }).catch(() => undefined)
})
</script>
<style scoped>
.value-input{margin-left:auto;margin-right:30px;width:190px;height:22px;box-sizing:border-box;padding:0;border:0;background:transparent;color:#285CFC;font-size:14px;font-weight:600;text-align:right;line-height:22px}.value-input.empty{color:#9AA4B2}.value-input.filled{color:#285CFC}.value-input:focus{outline:none}
.security-input{margin-left:28px;width:150px;height:24px;box-sizing:border-box;padding:0;border:0;background:transparent;color:#38434A;font-size:15px;font-weight:400;line-height:24px}.security-input:focus{outline:none}.phone-row .security-input{margin-left:8px;width:108px}.country-picker{margin-left:8px}.country-code{width:42px;color:#285CFC;font-size:14px;font-weight:500}.phone-row .verified{left:277px}.password-input{margin-left:32px}.email-input{margin-left:28px;width:170px}
:global(html),:global(body),:global(#app){width:100%;min-width:0;height:100%;margin:0;overflow:hidden;overscroll-behavior:none}.page{position:fixed;top:0;left:0;width:430px;height:var(--mobile-height, 932px);overflow:hidden;border-radius:35px;background:#F0F2F5;color:#38434A;font-family:'Noto Sans TC',sans-serif;transform:scale(var(--mobile-scale, 1));transform-origin:top left;}.header{position:absolute;top:0;left:0;width:430px;height:155px;overflow:hidden;border-radius:25px;background:#fff}.back{position:absolute;top:53px;left:26px;width:26px;height:39px;padding:7px;box-sizing:border-box}.header-title{position:absolute;top:56px;left:50%;transform:translateX(-50%);font-size:18px;font-weight:500}.tabs{position:absolute;bottom:0;left:37px;width:356px;height:33px;display:flex;justify-content:space-between}.tab{font-size:16px;font-weight:700}.tab.active{color:#285CFC}.active-line{position:absolute;bottom:0;width:32px;height:2px;background:#285CFC;transition:left .2s}.active-line.profile{left:0;width:64px}.active-line.security{left:154px}.avatar-wrap{position:absolute;top:175px;left:175px;width:80px;height:80px;border-radius:50%;overflow:hidden}.avatar{width:80px;height:80px}.form-card{position:absolute;top:275px;left:15px;width:400px;height:250px;overflow:hidden;border-radius:10px;background:#fff}.field{display:flex;height:50px;align-items:center;border-bottom:1px solid #D9D9D9;box-sizing:border-box}.field:last-child{border-bottom:0}.field image{width:20px;height:20px;margin-left:30px;margin-right:10px}.field>text:not(.value){font-size:16px;font-weight:500}.value{margin-left:auto;margin-right:30px;color:#285CFC;font-size:14px!important;font-weight:600!important}.value.filled{color:#285CFC}.value.empty{color:#9AA4B2}.gender{display:flex;gap:20px;margin-left:auto;margin-right:30px;font-size:14px;font-weight:700}.gender .selected{color:#285CFC}.gender .empty{color:#9AA4B2}.save{position:absolute;top:679px;left:36px;width:357px;height:50px;display:flex;align-items:center;justify-content:center;border-radius:10px;background:#285CFC;color:#fff;font-size:16px;font-weight:500}
.security-card,.third-party-card{position:absolute;left:15px;width:400px;overflow:hidden;border-radius:10px;background:#fff}.security-card{top:165px;height:150px}.security-row{position:relative;height:50px;display:flex;align-items:center;border-bottom:1px solid #d9d9d9;box-sizing:border-box;font-size:15px}.security-row:last-child{border-bottom:0}.security-icon{margin-left:13px;margin-right:10px;flex:none}.security-icon.phone{width:15px;height:15px}.security-icon.password{width:15px;height:18px}.security-icon.email{width:16px;height:13px}.security-label{font-weight:500;white-space:nowrap}.security-value{margin-left:28px;font-weight:400;white-space:nowrap}.phone-value{margin-left:29px}.password-value{margin-left:32px}.chevron{position:absolute;right:12px;width:20px;height:20px}.verified{position:absolute;left:277px;display:flex;align-items:center;gap:1px;color:#285CFC;font-size:8px;font-weight:500;white-space:nowrap}.verified image{width:15px;height:15px;flex:none}.third-party-card{top:335px;height:150px}.third-party-title{display:flex;height:50px;align-items:center;padding-left:10px;border-bottom:1px solid #d9d9d9;box-sizing:border-box;font-size:15px;font-weight:700}.provider-row{position:relative;height:50px;display:flex;align-items:center;border-bottom:1px solid #d9d9d9;box-sizing:border-box;color:#000;font-size:15px}.provider-row:last-child{border-bottom:0}.provider-icon{margin-left:11px;margin-right:10px;flex:none}.provider-icon.apple{width:30px;height:30px}.provider-icon.wechat{width:25px;height:25px;margin-left:15px;margin-right:10px}.link-button{position:absolute;right:40px;width:50px;height:20px;display:flex;align-items:center;justify-content:center;border-radius:10px;background:#285CFC;color:#fff;font-size:12px}.link-button.linked{width:80px;right:10px;border:1px solid #285CFC;box-sizing:border-box;background:#fff;color:#285CFC}

@media (max-width:599px){.page{top:0;left:0;height:var(--mobile-height,100dvh);border-radius:0;transform:scale(var(--mobile-scale, 1));transform-origin:top left}.save{top:auto;bottom:24px}}
</style>
