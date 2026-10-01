import { computed, inject, onMounted, reactive, ref, watch } from 'vue'

const platformDefinitions = [
  { id: 'web', label: 'Web' },
  { id: 'android', label: 'Android' },
  { id: 'ios', label: 'iOS' }
]

const miniProgramDefinition = { id: 'miniProgram', label: '乘客端微信小程序' }

const applePlatformDefinitions = [
  { id: 'appleIos', label: 'iOS' },
  { id: 'appleWeb', label: 'Web／Android' }
]

const createPlatform = () => reactive({ enabled: false, appId: '', appSecret: '', callbackDomain: '', packageName: '', appSignature: '', bundleId: '', universalLink: '', phoneCapability: false, loginMode: 'wechatOnly' })
const createApplePlatform = () => reactive({ enabled: false, teamId: '', keyId: '', clientId: '', redirectUri: '', privateKey: '', bundleId: '' })

export const LoginSettingsPage = {
  name: 'LoginSettingsPage',
  setup() {
    const { view, t, canWrite, api } = inject('adminLoginSettingsContext')
    const activePlatform = ref('miniProgram')
    const activeApplePlatform = ref('appleIos')
    const activeSmsPlatform = ref('domestic')
    const activeLoginTab = ref('methods')
    const saved = ref(false)
    const saveMessage = ref('')
    const loading = ref(false)
    const checking = ref(false)
    const smsChecking = ref(false)
    const error = ref('')
    const wechatStatus = reactive({ status: 'unknown', message: '尚未檢查', checkedAt: '' })
    const appleStatus = reactive({ status: 'unknown', message: '尚未檢查', checkedAt: '' })
    const appSecretConfigured = ref(false)
    const dirty = ref(false)
    const showAppSecret = ref(false)
    const appSecretValue = ref('')
    const loadingSecret = ref(false)
    const smsSettings = reactive({ enabled: true, provider: '253', endpoint: 'https://smssh1.253.com', sendUrl: '', variableUrl: '', balanceUrl: '', reportUrl: '', account: '', password: '', template: '【253云通讯】您的验证码是{code}。如非本人操作，请忽略。', report: false, variableReport: false, variableTemplate: '', variableParams: '', testPhone: '' })
    const smsSettingsDirty = ref(false)
    const smsSettingsInitialized = ref(false)
    const smsInternationalSettings = reactive({ enabled: false, endpoint: '', sendUrl: '', variableUrl: '', balanceUrl: '', reportUrl: '', account: '', password: '', template: '', variableTemplate: '', variableParams: '', report: false, variableReport: false, testPhone: '' })
    const smsInternationalDirty = ref(false)
    const smsInternationalInitialized = ref(false)
    const smsInternationalAction = reactive({ loading: false, balance: '', message: '' })
    const smsInternationalStatus = reactive({ status: 'unknown', message: '尚未檢查', checkedAt: '' })
    const smsStatus = reactive({ status: 'unknown', message: '尚未檢查', checkedAt: '' })
    const smsAction = reactive({ loading: false, balance: '', message: '' })
    const checkSmsStatus = async () => {
      smsChecking.value = true
      try {
        Object.assign(smsStatus, await api('/settings/sms253/status'))
      } catch (cause) {
        Object.assign(smsStatus, { status: 'error', message: cause?.message || '狀態檢查失敗' })
      } finally {
        smsChecking.value = false
      }
    }
    const statusLabel = status => ({ ok: '正常', error: '連線失敗', not_configured: '未配置', checking: '檢查中', unknown: '未檢查' }[status] || '未檢查')
    const statusActionLabel = status => status === 'checking' ? '檢查中…' : '檢查服務連線'
    const configurations = reactive({ miniProgram: createPlatform(), ...Object.fromEntries(platformDefinitions.map(platform => [platform.id, createPlatform()])) })
    const appleConfigurations = reactive(Object.fromEntries(applePlatformDefinitions.map(platform => [platform.id, createApplePlatform()])))
    const checkWechatStatus = async () => {
      checking.value = true
      try {
        Object.assign(wechatStatus, await api('/settings/wechat/status'))
      } catch (cause) {
        Object.assign(wechatStatus, { status: 'error', message: cause?.message || '狀態檢查失敗' })
      } finally {
        checking.value = false
      }
    }
    const checkAppleStatus = async () => {
      try {
        Object.assign(appleStatus, { status: 'checking', message: '檢查中…' }, await api('/settings/apple/status'))
      } catch (cause) {
        Object.assign(appleStatus, { status: 'error', message: cause?.message || '狀態檢查失敗' })
      }
    }
    const revealAppSecret = async () => {
      if (showAppSecret.value) {
        showAppSecret.value = false
        appSecretValue.value = ''
        return
      }
      loadingSecret.value = true
      error.value = ''
      try {
        const result = await api('/settings/wechat/secret')
        appSecretValue.value = result.appSecret || ''
        showAppSecret.value = true
      } catch (cause) {
        error.value = cause?.message || '無法讀取 AppSecret'
      } finally {
        loadingSecret.value = false
      }
    }
    const checkSmsInternationalStatus = async () => { smsInternationalStatus.status = 'checking'; try { Object.assign(smsInternationalStatus, await api('/settings/sms253/international/status')) } catch (cause) { Object.assign(smsInternationalStatus, { status: 'error', message: cause?.message || '狀態檢查失敗' }) } }
    const checkSmsInternationalBalance = async () => { smsInternationalAction.loading = true; try { const result = await api('/settings/sms253/international/balance'); smsInternationalAction.balance = String(result.balance ?? result.amount ?? result.data ?? '查詢成功'); smsInternationalAction.message = '餘額查詢成功' } catch (cause) { smsInternationalAction.message = cause?.message || '餘額查詢失敗' } finally { smsInternationalAction.loading = false } }
    const sendSmsInternationalTest = async (variable = false) => { smsInternationalAction.loading = true; try { await api('/settings/sms253/international/test', { method: 'POST', body: JSON.stringify({ phone: smsInternationalSettings.testPhone, variable, message: variable ? smsInternationalSettings.variableTemplate : smsInternationalSettings.template, params: smsInternationalSettings.variableParams }) }); smsInternationalAction.message = variable ? '國際變量短信測試已發送' : '國際普通短信測試已發送' } catch (cause) { smsInternationalAction.message = cause?.message || '測試短信發送失敗' } finally { smsInternationalAction.loading = false } }
    const checkSmsBalance = async () => {
      smsAction.loading = true
      smsAction.message = ''
      try {
        const result = await api('/settings/sms253/balance')
        smsAction.balance = String(result.balance ?? result.amount ?? result.data ?? '查詢成功')
        smsAction.message = '餘額查詢成功'
      } catch (cause) { smsAction.message = cause?.message || '餘額查詢失敗' } finally { smsAction.loading = false }
    }
    const sendSmsTest = async (variable = false) => {
      smsAction.loading = true
      smsAction.message = ''
      try {
        await api('/settings/sms253/test', { method: 'POST', body: JSON.stringify({ phone: smsSettings.testPhone, variable, message: variable ? smsSettings.variableTemplate : smsSettings.template, params: smsSettings.variableParams }) })
        smsAction.message = variable ? '變量短信測試已發送' : '普通短信測試已發送'
      } catch (cause) { smsAction.message = cause?.message || '測試短信發送失敗' } finally { smsAction.loading = false }
    }
    const loginMethods = reactive([])
    const previewClient = ref('passenger')
    const previewRevision = ref(0)
    const previewBaseUrls = { passenger: import.meta.env.VITE_PASSENGER_PREVIEW_URL || 'http://127.0.0.1:5173', miniProgram: import.meta.env.VITE_PASSENGER_PREVIEW_URL || 'http://127.0.0.1:5173', driver: import.meta.env.VITE_DRIVER_PREVIEW_URL || 'http://127.0.0.1:8080' }
    const previewToken = ref('')
    const previewUrl = computed(() => {
      const baseUrl = previewBaseUrls[previewClient.value]
      const revision = `adminPreview=1&previewRevision=${previewRevision.value}`
      const platform = previewClient.value === 'miniProgram' ? '&platform=miniProgram' : ''
      const mode = previewClient.value === 'miniProgram' && configurations.miniProgram.loginMode
        ? `&loginMode=${encodeURIComponent(configurations.miniProgram.loginMode)}`
        : ''
      const token = previewToken.value ? `&preview=1&previewToken=${encodeURIComponent(previewToken.value)}` : ''
      return previewClient.value === 'driver'
        ? `${baseUrl.replace(/\/$/, '')}/?${revision}${mode}${token}`
        : `${baseUrl.replace(/\/$/, '')}/#/pages/login/login?${revision}${platform}${mode}${token}`
    })
    const previewMethods = computed(() => {
      const client = previewClient.value === 'driver' ? 'driverEnabled' : 'passengerEnabled'
      const allocatedMethods = loginMethods.filter(method => method[client])
      if (previewClient.value !== 'miniProgram') return allocatedMethods
      const mode = configurations.miniProgram.loginMode
      return allocatedMethods.filter(method => mode === 'wechatOnly'
        ? method.provider === 'wechat'
        : mode === 'smsOnly'
          ? method.provider === 'phone'
          : method.provider === 'wechat' || method.provider === 'phone')
    })
    const defaultLoginMethodLogos = { phone: '/login-methods/sms.svg', wechat: '/login-methods/wechat.svg', apple: '/login-methods/apple.svg' }
    const loginMethodLogoUrl = method => method.provider === 'phone' ? defaultLoginMethodLogos.phone : method.logoUrl || defaultLoginMethodLogos[method.provider] || ''
    const managementMethods = computed(() => loginMethods)
    const miniProgramLoginModeOptions = [
      { value: 'smsOnly', label: '僅手機短信登入' },
      { value: 'wechatOnly', label: '僅微信登入' },
      { value: 'wechatAndSms', label: '微信或手機短信登入' }
    ]
    const isMiniProgramMethodEnabled = method => {
      const mode = configurations.miniProgram.loginMode
      return mode === 'wechatOnly' ? method.provider === 'wechat' : mode === 'smsOnly' ? method.provider === 'phone' : method.provider === 'wechat' || method.provider === 'phone'
    }
    const miniProgramMethodStatus = method => isMiniProgramMethodEnabled(method) ? '目前已啟用' : '目前未啟用'
    const previewLabel = computed(() => ({ passenger: '乘客端', miniProgram: '乘客端微信小程序', driver: '司機端' }[previewClient.value] || '乘客端'))
    const selectPreviewClient = client => {
      previewClient.value = client
      previewRevision.value += 1
    }
    const setMiniProgramLoginMode = mode => {
      configurations.miniProgram.loginMode = mode
      loginMethodsDirty.value = true
      loginMethodsMessage.value = ''
      previewRevision.value += 1
    }
    const refreshLoginPreview = () => { previewRevision.value += 1 }
    const collapsedLoginMethods = reactive(new Set())
    const loginMethodsLoading = ref(false)
    const loginMethodsSaving = ref(false)
    const loginMethodsMessage = ref('')
    const loginMethodsDirty = ref(false)
    const toggleLoginMethodExpanded = method => {
      if (collapsedLoginMethods.has(method.provider)) collapsedLoginMethods.delete(method.provider)
      else collapsedLoginMethods.add(method.provider)
    }
    const isLoginMethodExpanded = method => !collapsedLoginMethods.has(method.provider)
    const handleLoginMethodCollapseKeydown = (event, method) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        toggleLoginMethodExpanded(method)
      }
    }
    const loadLoginMethods = async () => {
      loginMethodsLoading.value = true
      try {
        const tokenResponse = await api('/settings/login-methods/preview-token')
        previewToken.value = tokenResponse.token || ''
        const result = await api('/settings/login-methods')
        loginMethods.splice(0, loginMethods.length, ...(result.data || []))
        if (result.miniProgram?.loginMode) configurations.miniProgram.loginMode = result.miniProgram.loginMode
        loginMethodsDirty.value = false
      } catch (cause) { error.value = cause?.message || '讀取登入方式配置失敗' } finally { loginMethodsLoading.value = false }
    }
    const uploadLoginMethodLogo = async (event, method) => {
      const file = event.target.files?.[0]
      event.target.value = ''
      if (!file) return
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 1024 * 1024) {
        error.value = '登入方式 Logo 只支援 PNG、JPEG 或 WebP，且不可超過 1 MB'
        return
      }
      try {
        method.logoUrl = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file) })
        loginMethodsDirty.value = true
        loginMethodsMessage.value = ''
      } catch (cause) { error.value = cause?.message || 'Logo 上傳失敗' }
    }
    const toggleLoginMethod = (method, field) => {
      if (!canWrite.value) return
      method[field] = !method[field]
      loginMethodsDirty.value = true
      loginMethodsMessage.value = ''
    }
    const clearLoginMethodLogo = method => {
      if (canWrite.value) {
        method.logoUrl = null
        loginMethodsDirty.value = true
        loginMethodsMessage.value = ''
      }
    }
    const handleLoginMethodsSaveKeydown = event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        saveLoginMethods()
      }
    }
    const loginMethodsPublished = ref(false)
    const publishLoginMethods = async () => {
      if (!canWrite.value || loginMethodsSaving.value || loginMethodsDirty.value) return
      loginMethodsSaving.value = true
      try {
        const result = await api('/settings/login-methods/publish', { method: 'POST' })
        loginMethodsPublished.value = true
        loginMethodsMessage.value = '登入方式已發布，正式端下次載入登入頁時生效'
        previewRevision.value += 1
        window.setTimeout(() => { loginMethodsPublished.value = false }, 2400)
        return result
      } catch (cause) { error.value = cause?.message || '發布登入方式失敗' } finally { loginMethodsSaving.value = false }
    }
    const saveLoginMethods = async ({ silent = false } = {}) => {
      if (!canWrite.value || loginMethodsSaving.value) return false
      loginMethodsSaving.value = true
      try {
        const result = await api('/settings/login-methods', { method: 'POST', body: JSON.stringify({ methods: loginMethods, miniProgram: { loginMode: configurations.miniProgram.loginMode } }) })
        loginMethods.splice(0, loginMethods.length, ...(result.data || []))
        const published = await api('/settings/login-methods/publish', { method: 'POST' })
        loginMethods.splice(0, loginMethods.length, ...(published.data || result.data || []))
        loginMethodsDirty.value = false
        if (!silent) loginMethodsMessage.value = '登入方式已保存並發布'
        previewRevision.value += 1
        return true
      } catch (cause) {
        error.value = cause?.message || '保存登入方式配置失敗'
        return false
      } finally { loginMethodsSaving.value = false }
    }
    const hasSmsInternationalConfiguration = () => {
      const { enabled, endpoint, sendUrl, variableUrl, balanceUrl, reportUrl, account, password, template, variableTemplate, variableParams, testPhone, report, variableReport } = smsInternationalSettings
      return Boolean(enabled || endpoint || sendUrl || variableUrl || balanceUrl || reportUrl || account || password || template || variableTemplate || variableParams || testPhone || report || variableReport)
    }
    const buildSmsPayload = () => {
      if (!smsSettingsDirty.value && !smsInternationalDirty.value) return undefined
      const payload = { ...smsSettings }
      if (smsInternationalDirty.value || hasSmsInternationalConfiguration()) payload.international = { ...smsInternationalSettings }
      return payload
    }
    const save = async () => {
      if (!canWrite.value || loading.value) return
      loading.value = true
      error.value = ''
      try {
        const smsPayload = buildSmsPayload()
        const { loginMode: _loginMode, ...wechatConfiguration } = configurations.miniProgram
        const settingsPayload = { wechatMiniProgram: wechatConfiguration, appleLogin: { ios: appleConfigurations.appleIos, web: appleConfigurations.appleWeb } }
        if (smsPayload) settingsPayload.sms253 = smsPayload
        const response = await api('/settings', { method: 'POST', body: JSON.stringify(settingsPayload) })
        const persisted = response?.wechatMiniProgram
        if (persisted && persisted.appId !== configurations.miniProgram.appId) throw new Error('保存後驗證失敗，AppID 與後端資料不一致')
        appSecretConfigured.value = Boolean(persisted?.appSecretConfigured) || Boolean(configurations.miniProgram.appSecret)
        configurations.miniProgram.appSecret = ''
        appleConfigurations.appleIos.privateKey = ''
        appleConfigurations.appleWeb.privateKey = ''
        smsSettings.password = ''
        smsInternationalSettings.password = ''
        smsSettingsDirty.value = false
        smsInternationalDirty.value = false
        dirty.value = false
        await checkWechatStatus()
        await checkAppleStatus()
        await checkSmsStatus()
        await checkSmsInternationalStatus()
        saved.value = true
        saveMessage.value = `已保存${new Date().toLocaleTimeString('zh-HK', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
        window.setTimeout(() => { saved.value = false }, 2400)
      } catch (cause) {
        error.value = cause?.message || '保存失敗'
      } finally {
        loading.value = false
      }
    }
    onMounted(async () => {
      loading.value = true
      try {
        const settings = await api('/settings')
        const config = settings.wechatMiniProgram || {}
        const apple = settings.appleLogin || {}
        const appleIos = apple.ios || {}
        const appleWeb = apple.web || {}
        const sms = settings.sms253 || {}
        const international = sms.international || {}
        Object.assign(smsInternationalSettings, { ...international, password: '' })
        smsInternationalDirty.value = false
        smsInternationalInitialized.value = true
        Object.assign(smsSettings, {
          enabled: Boolean(sms.enabled),
          provider: '253',
          endpoint: sms.endpoint || 'https://smssh1.253.com',
          sendUrl: sms.sendUrl || '',
          variableUrl: sms.variableUrl || '',
          balanceUrl: sms.balanceUrl || '',
          reportUrl: sms.reportUrl || '',
          account: sms.account || '',
          password: '',
          template: sms.template || '【253云通讯】您的验证码是{code}。如非本人操作，请忽略。',
          report: Boolean(sms.report),
          variableReport: Boolean(sms.variableReport),
          variableTemplate: sms.variableTemplate || '',
          variableParams: sms.variableParams || '',
          testPhone: sms.testPhone || ''
        })
        smsSettingsDirty.value = false
        smsSettingsInitialized.value = true
        Object.assign(configurations.miniProgram, {
          enabled: Boolean(config.enabled),
          appId: config.appId || '',
          appSecret: '',
          phoneCapability: Boolean(config.phoneCapability),
          loginMode: config.loginMode || 'wechatOnly',
        })
        Object.assign(appleConfigurations.appleIos, { enabled: Boolean(appleIos.enabled), teamId: appleIos.teamId || '', keyId: appleIos.keyId || '', clientId: appleIos.clientId || '', privateKey: '', bundleId: appleIos.bundleId || '' })
        Object.assign(appleConfigurations.appleWeb, { enabled: Boolean(appleWeb.enabled), teamId: appleWeb.teamId || '', keyId: appleWeb.keyId || '', clientId: appleWeb.clientId || '', privateKey: '', redirectUri: appleWeb.redirectUri || '', bundleId: '' })
        appSecretConfigured.value = Boolean(config.appSecretConfigured)
        dirty.value = false
        await checkWechatStatus()
        await checkAppleStatus()
        await checkSmsStatus()
        await checkSmsInternationalStatus()
        await loadLoginMethods()
      } catch (cause) {
        error.value = cause?.message || '讀取失敗'
      } finally {
        loading.value = false
      }
    })
    watch(() => ({ enabled: configurations.miniProgram.enabled, appId: configurations.miniProgram.appId, appSecret: configurations.miniProgram.appSecret, phoneCapability: configurations.miniProgram.phoneCapability }), () => { dirty.value = true }, { deep: true })
    watch(() => ({ ...smsSettings }), () => {
      if (smsSettingsInitialized.value && !loading.value) smsSettingsDirty.value = true
    }, { deep: true })
    watch(() => ({ ...smsInternationalSettings }), () => {
      if (smsInternationalInitialized.value && !loading.value) smsInternationalDirty.value = true
    }, { deep: true })
    return { view, t, canWrite, activeLoginTab, activePlatform, activeApplePlatform, activeSmsPlatform, saved, saveMessage, loading, checking, smsChecking, error, dirty, appSecretConfigured, showAppSecret, appSecretValue, loadingSecret, wechatStatus, appleStatus, smsStatus, smsSettings, smsInternationalSettings, smsAction, smsInternationalAction, smsStatus, smsInternationalStatus, configurations, appleConfigurations, platformDefinitions, applePlatformDefinitions, miniProgramDefinition, loginMethods, managementMethods, defaultLoginMethodLogos, loginMethodLogoUrl, previewClient, previewToken, previewUrl, previewMethods, previewLabel, miniProgramLoginModeOptions, isMiniProgramMethodEnabled, miniProgramMethodStatus, setMiniProgramLoginMode, selectPreviewClient, refreshLoginPreview, collapsedLoginMethods, loginMethodsLoading, loginMethodsSaving, loginMethodsMessage, loginMethodsDirty, loginMethodsPublished, uploadLoginMethodLogo, toggleLoginMethod, clearLoginMethodLogo, toggleLoginMethodExpanded, isLoginMethodExpanded, handleLoginMethodCollapseKeydown, handleLoginMethodsSaveKeydown, saveLoginMethods, publishLoginMethods, statusLabel, statusActionLabel, save, checkWechatStatus, checkSmsStatus, checkSmsInternationalStatus, checkSmsBalance, checkSmsInternationalBalance, sendSmsTest, sendSmsInternationalTest, revealAppSecret, checkAppleStatus }
  },
  template: String.raw`<section v-if="view==='login-settings'" class="login-settings-admin">
    <div class="login-settings-header"><span class="eyebrow">ACCESS & AUTHENTICATION</span><h2>{{t('loginSettings')}}</h2><p class="section-desc">{{t('loginSettingsDesc')}}</p></div>
    <div class="login-settings-scope"><span class="badge-internal">後端第三方接入配置</span><strong>{{t('sharedConfigAudience')}}</strong><span>{{t('sharedConfigDesc')}}</span></div>
    <div class="login-settings-tabs" role="tablist" aria-label="登入配置分類"><button type="button" role="tab" :aria-selected="activeLoginTab==='methods'" :class="{active: activeLoginTab==='methods'}" @click="activeLoginTab='methods'">登入方式管理</button><button type="button" role="tab" :aria-selected="activeLoginTab==='sms'" :class="{active: activeLoginTab==='sms'}" @click="activeLoginTab='sms'">短信登入</button><button type="button" role="tab" :aria-selected="activeLoginTab==='wechat'" :class="{active: activeLoginTab==='wechat'}" @click="activeLoginTab='wechat'">微信登入</button><button type="button" role="tab" :aria-selected="activeLoginTab==='apple'" :class="{active: activeLoginTab==='apple'}" @click="activeLoginTab='apple'">Apple 登入</button></div>
    <div v-show="activeLoginTab==='methods'" class="login-method-management login-settings-card"><div class="login-settings-card-header"><div><span class="section-kicker">LOGIN CHANNELS</span><h3>登入方式管理</h3><p>LIVE PREVIEW 直接載入現有登入 UI；各端別開關決定該端登入入口是否顯示。確認後再保存。</p></div><span class="login-method-count">{{loginMethods.length}} 種方式</span></div><div class="login-preview-toolbar" role="tablist" aria-label="登入端別預覽"><button type="button" :class="{active: previewClient==='passenger'}" @click="selectPreviewClient('passenger')">乘客端登入頁</button><button type="button" :class="{active: previewClient==='miniProgram'}" @click="selectPreviewClient('miniProgram')">乘客端微信小程序登入頁</button><button type="button" :class="{active: previewClient==='driver'}" @click="selectPreviewClient('driver')">司機端登入頁</button><button type="button" class="preview-refresh" @click="refreshLoginPreview">重新載入預覽</button></div><div class="login-preview-layout"><div class="login-preview-frame"><div class="login-preview-device" :class="'is-' + previewClient"><div class="login-preview-device-speaker" aria-hidden="true"></div><div class="login-preview-device-screen"><iframe v-if="previewToken" :key="previewUrl" :src="previewUrl" :title="previewLabel + ' LIVE PREVIEW'" loading="eager" sandbox="allow-forms allow-scripts allow-same-origin"/><div v-else class="login-preview-loading">正在取得預覽授權…</div><div class="login-preview-lock" aria-label="登入頁預覽已鎖定"><span aria-hidden="true">🔒</span><span>登入頁預覽已鎖定</span></div></div><div class="login-preview-home-indicator" aria-hidden="true"></div></div><div class="login-preview-caption">LIVE PREVIEW · {{previewLabel}} · 目前可用 {{previewMethods.length}} 種方式</div></div><div class="login-preview-config"><div class="login-settings-note">預覽載入正式登入 UI；模擬器本身不改動端別既有版面。</div><div v-if="previewClient==='miniProgram'" class="mini-program-mode-control"><div><span class="mini-program-mode-label">小程序登入模式</span><small>統一控制微信小程序可使用的登入入口</small></div><div class="mini-program-mode-options" role="radiogroup" aria-label="小程序登入模式"><button v-for="option in miniProgramLoginModeOptions" :key="option.value" type="button" class="mini-program-mode-option" :class="{active: configurations.miniProgram.loginMode===option.value}" role="radio" :aria-checked="configurations.miniProgram.loginMode===option.value" :disabled="!canWrite" @click="setMiniProgramLoginMode(option.value)">{{option.label}}</button></div></div><div v-if="loginMethodsLoading" class="login-settings-note">載入登入方式…</div><div v-else class="login-method-list"><article v-for="method in managementMethods" :key="method.provider" class="login-method-row" :class="{ 'is-enabled': method[previewClient==='driver' ? 'driverEnabled' : 'passengerEnabled'], 'is-collapsed': !isLoginMethodExpanded(method) }"><div class="login-method-summary" role="button" tabindex="0" :aria-expanded="isLoginMethodExpanded(method)" @click="toggleLoginMethodExpanded(method)" @keydown="handleLoginMethodCollapseKeydown($event, method)"><div class="login-method-logo-preview"><img v-if="loginMethodLogoUrl(method)" :src="loginMethodLogoUrl(method)" :alt="method.displayName"/><span v-else>{{method.displayName.slice(0, 1)}}</span></div><div class="login-method-title"><strong>{{method.displayName}}</strong><span class="login-method-provider">{{method.provider}}</span></div><span class="login-method-collapse-icon" aria-hidden="true">⌄</span></div><div v-show="isLoginMethodExpanded(method)" class="login-method-details"><template v-if="previewClient!=='miniProgram'"><div class="login-method-switches"><button type="button" class="method-switch" :class="{ active: method[previewClient==='driver' ? 'driverEnabled' : 'passengerEnabled'] }" :role="'switch'" :aria-checked="method[previewClient==='driver' ? 'driverEnabled' : 'passengerEnabled']" :aria-label="(previewClient==='driver' ? '司機端' : '乘客端') + method.displayName" :disabled="!canWrite || loginMethodsSaving" @click="toggleLoginMethod(method, previewClient==='driver' ? 'driverEnabled' : 'passengerEnabled')"><i aria-hidden="true"></i><span>{{previewClient==='driver' ? '司機端' : '乘客端'}}登入：{{method[previewClient==='driver' ? 'driverEnabled' : 'passengerEnabled'] ? '已開啟' : '已關閉'}}</span></button></div><div v-if="method.provider !== 'phone'" class="login-method-logo-actions"><label class="logo-upload-button"><span>{{method.logoUrl ? '更換 Logo' : '上傳 Logo'}}</span><input type="file" accept="image/png,image/jpeg,image/webp" :disabled="!canWrite" @change="uploadLoginMethodLogo($event, method)"/></label><button v-if="method.logoUrl" type="button" class="logo-clear-button" :disabled="!canWrite" @click="clearLoginMethodLogo(method)">移除</button><span class="logo-help">{{method.logoUrl ? '已上傳 · ' : '尚未上傳 · '}}PNG／JPG／WebP · 1 MB 內</span></div></template><template v-else><div class="mini-program-method-status"><span>小程序入口狀態</span><strong :class="{active: isMiniProgramMethodEnabled(method)}">{{miniProgramMethodStatus(method)}}</strong><small>由上方登入模式統一控制</small></div></template></div></article></div></div></div><div class="login-method-actions"><span v-if="loginMethodsDirty" class="unsaved-hint">尚未保存</span><span v-if="loginMethodsMessage" class="success-hint">{{loginMethodsMessage}}</span><div v-if="!loginMethodsDirty && !loginMethodsMessage" class="login-settings-note">登入方式設定獨立保存並發布，不受短信／微信／Apple 配置影響</div><div class="login-method-save" :class="{ disabled: !canWrite || loginMethodsSaving || !loginMethodsDirty }" role="button" tabindex="0" :aria-disabled="!canWrite || loginMethodsSaving || !loginMethodsDirty" @click="saveLoginMethods" @keydown="handleLoginMethodsSaveKeydown">{{loginMethodsSaving ? '保存中…' : '保存並發布登入方式'}}</div></div></div>
<div v-show="activeLoginTab==='sms'" class="login-settings-card sms-settings-card"><div class="login-settings-card-header"><div><h3>{{t('smsLoginSettings')}}</h3><p>{{t('smsLoginSettingsDesc')}}</p></div><div class="login-settings-card-meta"><span class="badge-internal">{{activeSmsPlatform==='domestic' ? '253 Domestic' : '253 International'}}</span><label v-if="activeSmsPlatform==='domestic'" class="switch"><input type="checkbox" v-model="smsSettings.enabled" :disabled="!canWrite"/><span class="slider"></span></label><label v-else class="switch"><input type="checkbox" v-model="smsInternationalSettings.enabled" :disabled="!canWrite"/><span class="slider"></span></label></div></div><div class="platform-tabs sms-platform-tabs" role="tablist" aria-label="短信配置"><button type="button" :class="{active: activeSmsPlatform==='domestic'}" @click="activeSmsPlatform='domestic'">國內短信</button><button type="button" :class="{active: activeSmsPlatform==='international'}" @click="activeSmsPlatform='international'">國際短信</button></div>    <div v-show="activeSmsPlatform==='domestic'" class="sms-platform-panel"><div class="sms-status-panel" :class="'status-' + smsStatus.status"><div class="wechat-status-indicator"><span class="status-dot"></span><strong>{{statusLabel(smsStatus.status)}}</strong></div><span>{{smsStatus.message}}</span><button type="button" class="secondary status-check-button" :disabled="smsChecking" @click="checkSmsStatus">{{statusActionLabel(smsStatus.status)}}</button></div><div class="login-settings-form-grid sms-settings-grid"><label><span>{{t('smsProvider')}}</span><input v-model="smsSettings.provider" placeholder="253" disabled/></label><label><span>API Host</span><input v-model="smsSettings.endpoint" placeholder="https://smssh1.253.com" :disabled="!canWrite"/></label><label><span>普通短信 URL</span><input v-model="smsSettings.sendUrl" placeholder="可留空使用 Host + /msg/send/json" :disabled="!canWrite"/></label><label><span>變量短信 URL</span><input v-model="smsSettings.variableUrl" placeholder="可留空使用 Host + /msg/variable/json" :disabled="!canWrite"/></label><label><span>餘額查詢 URL</span><input v-model="smsSettings.balanceUrl" placeholder="可留空使用 Host + /msg/balance/json" :disabled="!canWrite"/></label><label><span>狀態報告 URL</span><input v-model="smsSettings.reportUrl" placeholder="可選" :disabled="!canWrite"/></label><label><span>API Account</span><input v-model="smsSettings.account" autocomplete="off" :disabled="!canWrite"/></label><label><span>API Password</span><input v-model="smsSettings.password" type="password" autocomplete="new-password" placeholder="已配置則留空" :disabled="!canWrite"/></label><label><span>普通短信模板</span><textarea v-model="smsSettings.template" rows="3" placeholder="{code}" :disabled="!canWrite"></textarea></label><label><span>變量短信模板</span><input v-model="smsSettings.variableTemplate" placeholder="例如：您好，您的订单号是{1}" :disabled="!canWrite"/></label><label><span>變量 params</span><input v-model="smsSettings.variableParams" placeholder="例如：13800138000,张先生" :disabled="!canWrite"/></label><label><span>測試手機號碼</span><input v-model="smsSettings.testPhone" placeholder="+8613800138000" :disabled="!canWrite"/></label><label class="login-settings-toggle"><input type="checkbox" v-model="smsSettings.report" :disabled="!canWrite"/><span>普通短信狀態報告</span></label><label class="login-settings-toggle"><input type="checkbox" v-model="smsSettings.variableReport" :disabled="!canWrite"/><span>變量短信狀態報告</span></label><div class="sms-actions"><button type="button" class="secondary" :disabled="!canWrite || smsAction.loading" @click="sendSmsTest(false)">測試普通短信</button><button type="button" class="secondary" :disabled="!canWrite || smsAction.loading" @click="sendSmsTest(true)">測試變量短信</button><button type="button" class="secondary" :disabled="!canWrite || smsAction.loading" @click="checkSmsBalance">查詢餘額</button><span v-if="smsAction.message">{{smsAction.message}}</span><span v-if="smsAction.balance">餘額：{{smsAction.balance}}</span></div></div></div>
    <div v-show="activeSmsPlatform==='international'" class="sms-platform-panel"><div class="sms-status-panel" :class="'status-' + smsInternationalStatus.status"><div class="wechat-status-indicator"><span class="status-dot"></span><strong>{{statusLabel(smsInternationalStatus.status)}}</strong></div><span>{{smsInternationalStatus.message}}</span><button type="button" class="secondary status-check-button" :disabled="smsChecking" @click="checkSmsInternationalStatus">檢查服務連線</button></div><div class="login-settings-form-grid sms-settings-grid"><label><span>API Host</span><input v-model="smsInternationalSettings.endpoint" placeholder="由 253 國際帳戶提供" :disabled="!canWrite"/></label><label><span>普通短信 URL</span><input v-model="smsInternationalSettings.sendUrl" :disabled="!canWrite"/></label><label><span>變量短信 URL</span><input v-model="smsInternationalSettings.variableUrl" :disabled="!canWrite"/></label><label><span>餘額查詢 URL</span><input v-model="smsInternationalSettings.balanceUrl" :disabled="!canWrite"/></label><label><span>狀態報告 URL</span><input v-model="smsInternationalSettings.reportUrl" :disabled="!canWrite"/></label><label><span>API Account</span><input v-model="smsInternationalSettings.account" :disabled="!canWrite"/></label><label><span>API Password</span><input v-model="smsInternationalSettings.password" type="password" placeholder="已配置則留空" :disabled="!canWrite"/></label><label><span>普通短信模板</span><textarea v-model="smsInternationalSettings.template" rows="3" placeholder="{code}" :disabled="!canWrite"></textarea></label><label><span>變量短信模板</span><input v-model="smsInternationalSettings.variableTemplate" :disabled="!canWrite"/></label><label><span>變量 params</span><input v-model="smsInternationalSettings.variableParams" :disabled="!canWrite"/></label><label><span>測試手機號碼</span><input v-model="smsInternationalSettings.testPhone" placeholder="含國碼，例如 +852..." :disabled="!canWrite"/></label><label class="login-settings-toggle"><input type="checkbox" v-model="smsInternationalSettings.report" :disabled="!canWrite"/><span>普通短信狀態報告</span></label><label class="login-settings-toggle"><input type="checkbox" v-model="smsInternationalSettings.variableReport" :disabled="!canWrite"/><span>變量短信狀態報告</span></label><div class="sms-actions"><button type="button" class="secondary" :disabled="!canWrite || smsInternationalAction.loading" @click="sendSmsInternationalTest(false)">測試國際普通短信</button><button type="button" class="secondary" :disabled="!canWrite || smsInternationalAction.loading" @click="sendSmsInternationalTest(true)">測試國際變量短信</button><button type="button" class="secondary" :disabled="!canWrite || smsInternationalAction.loading" @click="checkSmsInternationalBalance">查詢國際餘額</button><span v-if="smsInternationalAction.message">{{smsInternationalAction.message}}</span><span v-if="smsInternationalAction.balance">餘額：{{smsInternationalAction.balance}}</span></div></div></div>

    </div>
    <div v-show="activeLoginTab==='wechat'" class="login-settings-card wechat-settings-card"><div class="login-settings-card-header"><div><h3>{{t('wechatLoginSettings')}}</h3><p>{{t('wechatLoginSettingsDesc')}}</p></div><div class="login-settings-card-meta"><span class="badge-external">後端第三方接入配置</span><span class="login-settings-card-count">3 個原生平台配置 + 1 個小程序配置</span></div></div><div class="wechat-status-panel" :class="'status-' + wechatStatus.status"><div class="wechat-status-indicator"><span class="status-dot"></span><strong>{{statusLabel(wechatStatus.status)}}</strong></div><span>{{wechatStatus.message}}</span><button type="button" class="secondary status-check-button" :disabled="checking" @click="checkWechatStatus">{{statusActionLabel(wechatStatus.status)}}</button></div><div class="platform-tabs" role="tablist" :aria-label="t('loginPlatforms')"><button type="button" :class="{active: activePlatform==='miniProgram'}" @click="activePlatform='miniProgram'">乘客端微信小程序</button><button v-for="platform in platformDefinitions" :key="platform.id" type="button" :class="{active: activePlatform===platform.id}" @click="activePlatform=platform.id">{{platform.label}}</button></div><div v-show="activePlatform==='miniProgram'" class="platform-panel mini-program-platform-panel"><div class="platform-panel-title"><div><span class="platform-kicker">MINI PROGRAM CONFIGURATION</span><h4>乘客端微信小程序</h4><p>此區域只控制乘客端 WeChat 小程序，不影響乘客 Web／App 或司機端。</p></div><label class="switch"><input type="checkbox" v-model="configurations.miniProgram.enabled" :disabled="!canWrite"/><span class="slider"></span></label></div><div class="login-settings-form-grid"><label><span>AppID</span><input v-model="configurations.miniProgram.appId" placeholder="AppID" autocomplete="off" :disabled="!canWrite"/></label><label><span>AppSecret</span><div class="secret-input-row"><input :value="showAppSecret && appSecretValue ? appSecretValue : configurations.miniProgram.appSecret" @input="configurations.miniProgram.appSecret = $event.target.value" :type="showAppSecret ? 'text' : 'password'" placeholder="AppSecret（僅後端保存）" autocomplete="new-password" :disabled="!canWrite || showAppSecret"/><button type="button" class="secret-toggle-button" :disabled="loadingSecret" @click="revealAppSecret">{{loadingSecret ? '讀取中…' : showAppSecret ? '隱藏' : '顯示'}}</button></div><small class="wechat-secret-help">{{appSecretConfigured ? 'AppSecret 已安全保存。' : '保存後會加密存放於後端。'}}</small></label><label class="login-settings-toggle"><input type="checkbox" v-model="configurations.miniProgram.phoneCapability" :disabled="!canWrite"/><span>允許微信手機號碼授權</span></label><label class="mini-program-login-mode"><span>小程序登入模式</span><select v-model="configurations.miniProgram.loginMode" :disabled="!canWrite"><option value="wechatOnly">模式一：只有微信登入</option><option value="wechatAndSms">模式二：微信／短信二選一</option><option value="smsOnly">模式三：只有短信登入</option></select><small>只作用於乘客端 WeChat 小程序。</small></label></div></div><div v-for="platform in platformDefinitions" v-show="activePlatform===platform.id" :key="platform.id" class="platform-panel"><div class="platform-panel-title"><div><span class="platform-kicker">{{t('platformConfiguration')}}</span><h4>{{platform.label}}</h4><p>{{t(platform.id + 'Hint')}}</p></div><label class="switch"><input type="checkbox" v-model="configurations[platform.id].enabled" :disabled="!canWrite"/><span class="slider"></span></label></div><div class="login-settings-form-grid"><label><span>AppID</span><input v-model="configurations[platform.id].appId" placeholder="AppID" autocomplete="off" :disabled="!canWrite"/></label><label><span>AppSecret</span><div class="secret-input-row"><input :value="showAppSecret && appSecretValue ? appSecretValue : configurations[platform.id].appSecret" @input="configurations[platform.id].appSecret = $event.target.value" :type="showAppSecret ? 'text' : 'password'" placeholder="appSecretConfigured ? 'AppSecret（已保存；點擊「顯示」查看）' : 'AppSecret（僅後端保存）'" autocomplete="new-password" :disabled="!canWrite || showAppSecret"/><button type="button" class="secret-toggle-button" :disabled="loadingSecret" @click="revealAppSecret">{{loadingSecret ? '讀取中…' : showAppSecret ? '隱藏' : '顯示'}}</button></div><small class="wechat-secret-help">{{appSecretConfigured ? 'AppSecret 已安全保存；可按「顯示」查看，或輸入新值後再次保存。' : '請填寫 AppSecret，保存後會加密存放於後端。'}}</small></label><label v-if="platform.id==='miniProgram'" class="login-settings-toggle"><input type="checkbox" v-model="configurations[platform.id].phoneCapability" :disabled="!canWrite"/><span>{{t('phoneCapability')}}</span></label><label v-if="platform.id==='miniProgram'" class="mini-program-login-mode"><span>小程序登入模式</span><select v-model="configurations[platform.id].loginMode" :disabled="!canWrite"><option value="wechatOnly">模式一：只有微信登入</option><option value="wechatAndSms">模式二：微信／短信二選一</option><option value="smsOnly">模式三：只有短信登入</option></select><small>此設定只作用於乘客端 WeChat 小程序，不會影響司機端或乘客端 Web／iOS／Android。</small></label><label v-if="platform.id==='web'"><span>{{t('callbackDomain')}}</span><input v-model="configurations[platform.id].callbackDomain" placeholder="https://example.com" :disabled="!canWrite"/></label><label v-if="platform.id==='android'"><span>{{t('packageName')}}</span><input v-model="configurations[platform.id].packageName" placeholder="com.example.app" :disabled="!canWrite"/></label><label v-if="platform.id==='android'"><span>{{t('appSignature')}}</span><input v-model="configurations[platform.id].appSignature" placeholder="App Signature" :disabled="!canWrite"/></label><label v-if="platform.id==='ios'"><span>{{t('bundleId')}}</span><input v-model="configurations[platform.id].bundleId" placeholder="com.example.app" :disabled="!canWrite"/></label><label v-if="platform.id==='ios'"><span>{{t('universalLink')}}</span><input v-model="configurations[platform.id].universalLink" placeholder="https://example.com/apple-app-site-association" :disabled="!canWrite"/></label></div></div></div>
    <div v-show="activeLoginTab==='apple'" class="login-settings-card apple-settings-card"><div class="login-settings-card-header"><div><h3>{{t('appleLoginSettings')}}</h3><p>{{t('appleLoginSettingsDesc')}}</p></div><div class="login-settings-card-meta"><span class="badge-external">後端第三方接入配置</span><span class="login-settings-card-count">2 個平台配置</span></div></div><div class="wechat-status-panel" :class="'status-' + appleStatus.status"><div class="wechat-status-indicator"><span class="status-dot"></span><strong>{{statusLabel(appleStatus.status)}}</strong></div><span>{{appleStatus.message}}</span><button type="button" class="secondary status-check-button" :disabled="appleStatus.status==='checking'" @click="checkAppleStatus">{{statusActionLabel(appleStatus.status)}}</button></div><div class="platform-tabs" role="tablist" :aria-label="t('appleLoginPlatforms')"><button v-for="platform in applePlatformDefinitions" :key="platform.id" type="button" :class="{active: activeApplePlatform===platform.id}" @click="activeApplePlatform=platform.id">{{platform.label}}</button></div><div v-for="platform in applePlatformDefinitions" v-show="activeApplePlatform===platform.id" :key="platform.id" class="platform-panel"><div class="platform-panel-title"><div><span class="platform-kicker">{{t('platformConfiguration')}}</span><h4>{{platform.label}}</h4><p>{{t(platform.id + 'Hint')}}</p></div><label class="switch"><input type="checkbox" v-model="appleConfigurations[platform.id].enabled" :disabled="!canWrite"/><span class="slider"></span></label></div><div class="login-settings-form-grid"><label><span>Team ID</span><input v-model="appleConfigurations[platform.id].teamId" placeholder="Team ID" :disabled="!canWrite"/></label><label><span>Key ID</span><input v-model="appleConfigurations[platform.id].keyId" placeholder="Key ID" :disabled="!canWrite"/></label><label v-if="platform.id==='appleIos'"><span>Bundle ID</span><input v-model="appleConfigurations[platform.id].bundleId" placeholder="com.example.app" :disabled="!canWrite"/></label><label v-else><span>Client ID／Services ID</span><input v-model="appleConfigurations[platform.id].clientId" placeholder="com.example.web" :disabled="!canWrite"/></label><label v-if="platform.id==='appleWeb'"><span>{{t('redirectUri')}}</span><input v-model="appleConfigurations[platform.id].redirectUri" placeholder="https://example.com/auth/apple/callback" :disabled="!canWrite"/></label><label class="col-span-2"><span>Apple Private Key（僅後端保存）</span><input v-model="appleConfigurations[platform.id].privateKey" type="password" placeholder="Private Key" autocomplete="new-password" :disabled="!canWrite"/></label></div></div></div>
    <div class="login-settings-save-bar"><span v-if="error" class="error-hint">⚠ {{error}}</span><span v-else-if="saved" class="success-hint">✓ {{saveMessage}}</span><span v-else-if="dirty" class="login-settings-note">有未保存的修改</span><span v-else class="login-settings-note">{{appSecretConfigured ? '設定已保存並由後端安全管理' : t('loginSettingsUiOnly')}}</span><button type="button" class="primary" :disabled="!canWrite || loading" @click="save">{{loading ? '保存中…' : t('saveChanges')}}</button></div>
  </section>`
}
