import { createApp, ref, computed, nextTick, onMounted, watch } from 'vue'
import './style.css'

const API = import.meta.env.VITE_API_URL || '/api'
const token = ref(import.meta.env.DEV ? 'dev-bypass' : (localStorage.getItem('admin_token') || ''))
const locale = ref(localStorage.getItem('admin_locale') || 'en')
const view = ref('dashboard')
const vehicleTab = ref('catalog')
const loading = ref(false)
let loadRequestId = 0
const error = ref('')
const dashboard = ref(null)
const exchangeRate = ref(0.92)
const pricingCurrency = ref('RMB')
const severeWeatherEnabled = ref(false)
const adminLogo = ref('')
const users = ref([])
const selectedUser = ref(null)
const walletTransactions = ref([])
const topUpWithdrawalHistory = ref([])
const trips = ref([])
const charterOrders = ref([])
const addresses = ref([])
const mainlandCities = ref([])
const mainlandCityForm = ref(null)
const addressRegionFilter = ref('')
const addressCityFilter = ref('')
const addressSearchKeyword = ref('')
const addressSearchResults = ref([])
const addressSearching = ref(false)
const categories = ref([])
const vehicles = ref([])
const extras = ref([])
const distancePricing = ref([])
const routeMinimumFares = ref([])
const routeMinimumFareForm = ref(null)
const membershipPlans = ref([])
const promotions = ref([])
const promotionForm = ref(null)
const promotionFilterTab = ref('ALL')
const promotionSearchQuery = ref('')
const membershipForm = ref(null)
const categoryForm = ref(null)
const vehicleForm = ref(null)
const extraForm = ref(null)
const paymentSettings = ref({
  fareBalancePayEnabled: true,
  cashBalancePayEnabled: true,
  wechatPayEnabled: true,
  alipayPayEnabled: true,
  bankCardPayEnabled: true,
  sandboxMode: false
})
const paymentSettingsSaved = ref(false)
const addressForm = ref({ id: '', region: '香港', city: '', name: '', address: '', latitude: null, longitude: null, enabled: true, order: 1 })
const userForm = ref(null)
const walletAdjustment = ref(null)
const tripForm = ref(null)
const selectedTrip = ref(null)
const tripCatalog = ref({ categories: [], data: [], extras: [] })
const tripQuote = ref(null)
const tripBookingStep = ref('details')
const tripPaymentMethod = ref('sandbox')
const tripUseFareBalance = ref(false)
const tripUseCashBalance = ref(false)
const tripLocationKeyword = ref('')
const tripLocationResults = ref([])
const tripLocationSearching = ref(false)
const tripLocationTarget = ref('origin')
const tripSearchQuery = ref('')
const tripStatusFilter = ref('ALL')
const tripDateFilter = ref('')
const charterForm = ref(null)
const username = ref('')
const password = ref('')
const currentAdministrator = ref(null)
const administrators = ref([])
const auditLogs = ref([])
const administratorForm = ref(null)
const personnel = ref(JSON.parse(localStorage.getItem('admin_personnel') || '[]'))
const personnelForm = ref(null)
const personnelFilter = ref('全部')
const entryItems = ref(JSON.parse(localStorage.getItem('admin_entry_items') || '[]'))
const entryForm = ref(null)
const entryFilter = ref('全部')
const expenseItems = ref(JSON.parse(localStorage.getItem('admin_expenses') || '[]'))
const expenseForm = ref(null)
const expenseFilter = ref('全部')
const canWrite = computed(() => currentAdministrator.value?.role !== 'VIEWER')
const isSuperAdministrator = computed(() => currentAdministrator.value?.role === 'SUPER_ADMIN')
const sortByOrder = (items) => [...items].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0))
const currencyLabel = (currency) => currency === 'HKD' ? 'HKD$' : 'RMB¥'
const timeOptions = Array.from({ length: 48 }, (_, index) => `${String(Math.floor(index / 2)).padStart(2, '0')}:${index % 2 ? '30' : '00'}`)

const messages = {
  en: {
    brand: 'Cross-border Admin',
    welcome: 'Welcome back',
    signInPrompt: 'Sign in to manage riders and trips.',
    adminUsername: 'Admin username', password: 'Password', signIn: 'Sign in', signOut: 'Sign out',
    dashboard: 'Dashboard', 'operations-personnel': 'Personnel management', entries: 'Entry / exit items', income: 'Income report', expenses: 'Expense details', users: 'Users', trips: 'Trip orders', charters: 'Business charter', addresses: 'Recommended addresses', membership: 'Membership plans', promotions: 'Promotion settings', payments: 'Payment settings', paymentSettings: 'Payment settings', paymentSettingsDesc: 'Configure available payment options for passengers and toggle sandbox test mode.', walletPaymentGroup: 'Wallet Balance Deduction', fareBalancePay: 'Fare balance deduction', fareBalancePayHint: 'Allow passengers to use prepaid fare balance for order payment', cashBalancePay: 'Cash balance deduction', cashBalancePayHint: 'Allow passengers to use cash balance for order payment', externalPaymentGroup: 'Third-party Gateways', wechatPay: 'WeChat Pay', wechatPayHint: 'Enable WeChat Pay for cross-border transactions', alipayPay: 'Alipay', alipayPayHint: 'Enable Alipay for mainland/cross-border transactions', bankCardPay: 'Bank Card Pay', bankCardPayHint: 'Enable UnionPay and international bank cards', envModeGroup: 'Environment & Mode', sandboxMode: 'Sandbox Mode', sandboxModeHint: 'When enabled, simulated payment receipts are generated without live charges', sandboxBadge: 'Sandbox active', productionBadge: 'Production live', internalBadge: 'Instant Deduction', externalBadge: 'Third-party Gateway', savePaymentSettings: 'Save settings', paymentSavedSuccess: 'Payment settings updated successfully', administrators: 'Administrators', auditLogs: 'Operation logs', adminConsole: 'ADMIN CONSOLE', operations: 'Operations', personnelManagement: 'Personnel management', vehicleManagement: 'Vehicle management', entryItems: 'Entry / exit items', incomeReport: 'Income report', expenseDetails: 'Expense details',
    refresh: 'Refresh', totalUsers: 'Total users', totalTrips: 'Total trips', pendingTrips: 'Pending trips', charterOrders: 'Charter orders', activeAddresses: 'Active addresses',
    completedTrips: 'Completed trips', name: 'Name', phone: 'Phone', joined: 'Joined', id: 'ID',
    route: 'Route', region: 'Region', scheduled: 'Scheduled', status: 'Status', loading: 'Loading…',
    requestFailed: 'Request failed', sessionExpired: 'Your session has expired. Please sign in again.',
    regions: { HK: 'Hong Kong', MACAU: 'Macau', GUANGDONG: 'Guangdong' },
    statuses: { PENDING: 'Pending', CONFIRMED: 'Confirmed', COMPLETED: 'Completed', CANCELLED: 'Cancelled' },
    language: '中文', languageLabel: 'Language', currency: 'Currency', exchangeRate: 'RMB per HKD', saveRate: 'Save exchange rate', origin: 'Origin', destination: 'Destination', duration: 'Duration', actions: 'Actions', edit: 'Edit', remove: 'Delete', save: 'Save address', saveChanges: 'Save changes', cancel: 'Cancel',         close: 'Close', addressName: 'Place name', detailedAddress: 'District and detailed address', latitude: 'Latitude', longitude: 'Longitude', order: 'Order', coordinates: 'Coordinates', enabled: 'Enabled', hours: 'hours', user: 'User', originRegion: 'Origin region', destinationRegion: 'Destination region',     cashWallet: 'Cash wallet',     fareWallet: 'Fare wallet',     adjustBalance: 'Adjust balance', currentTrips: 'Current trips', noCurrentTrips: 'No current trips.',     currentCharterOrders: 'Current charter orders',     noCurrentCharterOrders: 'No current charter orders.',     balanceHistory: 'Immutable balance transaction history',     noBalanceTransactions: 'No balance transactions.',     topUpHistory: 'Top-up and withdrawal history',         noTopUps: 'No top-ups or withdrawals.', increase: 'Increase', decrease: 'Decrease', amount: 'Amount', reasonRequired: 'Reason (required)', confirmAdjustment: 'Confirm adjustment'
  },
  zh: {
    brand: '跨境管理後台', welcome: '欢迎回来', signInPrompt: '登录以管理乘客和行程。',
    adminUsername: '管理员用户名', password: '密码', signIn: '登录', signOut: '退出登录',
    dashboard: '仪表盘', 'operations-personnel': '人员管理', entries: '进出项目', income: '收入报表', expenses: '支出明细', users: '用户', trips: '行程订单', charters: '商务包车', addresses: '推荐地址', promotions: '優惠設定', payments: '支付設定', paymentSettings: '支付設定', paymentSettingsDesc: '配置乘客端可用之支付通道與錢包扣款功能，以及切換沙盒測試環境。', walletPaymentGroup: '錢包餘額抵扣', fareBalancePay: '車費餘額抵扣', fareBalancePayHint: '允許乘客優先使用車費專用餘額抵扣車資', cashBalancePay: '現金餘額抵扣', cashBalancePayHint: '允許乘客使用現金餘額支付剩餘車資', externalPaymentGroup: '第三方支付通道', wechatPay: '微信支付', wechatPayHint: '支援微信支付香港錢包與大陸錢包跨境結算', alipayPay: '支付寶支付', alipayPayHint: '支援支付寶大陸與境外跨境結算通道', bankCardPay: '銀行卡支付', bankCardPayHint: '支援銀聯卡與主流國際信用卡快捷結算', envModeGroup: '系統環境模式', sandboxMode: '沙盒測試模式', sandboxModeHint: '開啟後將進入模擬交易環境，不產生實際扣款手續費', sandboxBadge: '沙盒測試中', productionBadge: '正式運行中', internalBadge: '即時扣款', externalBadge: '第三方接口', savePaymentSettings: '保存支付設定', paymentSavedSuccess: '支付設定已成功保存', administrators: '管理员账户', auditLogs: '操作日志', adminConsole: '管理控制台', operations: '经营管理', personnelManagement: '人员管理', vehicleManagement: '车辆管理', entryItems: '进出项目', incomeReport: '收入报表', expenseDetails: '支出明细', refresh: '刷新',
    totalUsers: '用户总数', totalTrips: '行程总数', pendingTrips: '待处理行程', charterOrders: '包车订单', activeAddresses: '启用地址', completedTrips: '已完成行程', membership: '会员方案',
    name: '姓名', phone: '电话', joined: '加入时间', id: '编号', currency: '货币', exchangeRate: '每港币人民币', saveRate: '保存汇率', route: '路线', region: '地区',
    scheduled: '计划时间', status: '状态', loading: '加载中…', requestFailed: '请求失败',
    sessionExpired: '登录已过期，请重新登录。', regions: { HK: '香港', MACAU: '澳门', GUANGDONG: '广东' },
    statuses: { PENDING: '待处理', CONFIRMED: '已确认', COMPLETED: '已完成', CANCELLED: '已取消' },
    language: 'English', languageLabel: '语言', origin: '出发地', destination: '目的地', duration: '用车时间', actions: '操作', edit: '编辑', remove: '删除', save: '保存地址', saveChanges: '保存修改', cancel: '取消', close: '关闭', addressName: '地点名称', detailedAddress: '地区及详细地址', latitude: '纬度', longitude: '经度', order: '排序', coordinates: '坐标', enabled: '启用', hours: '小时', user: '用户', originRegion: '出发地区', destinationRegion: '目的地区', cashWallet: '现金钱包', fareWallet: '车费钱包', adjustBalance: '调整余额', currentTrips: '当前行程', noCurrentTrips: '暂无当前行程。', currentCharterOrders: '当前包车订单', noCurrentCharterOrders: '暂无当前包车订单。', balanceHistory: '不可变余额交易记录', noBalanceTransactions: '暂无余额交易记录。', topUpHistory: '充值及提现记录',     noTopUps: '暂无充值或提现记录。', increase: '增加', decrease: '减少', amount: '金额', reasonRequired: '原因（必填）', confirmAdjustment: '确认调整'
  }
}

const t = (key) => key.split('.').reduce((value, part) => value?.[part], messages[locale.value]) || key
const translateRegion = (value) => t(`regions.${value}`)
const translateStatus = (value) => t(`statuses.${value}`)
const displayMainlandCity = (value) => {
  if (typeof value !== 'string') return ''
  const normalized = value.trim()
  return normalized.replace(/市$/, '') || normalized
}
const apiMainlandCity = (value) => {
  const normalized = typeof value === 'string' ? value.trim() : ''
  return normalized && !normalized.endsWith('市') ? `${normalized}市` : normalized
}
const displayPlaceName = (value) => typeof value === 'string' ? value.trim() : ''
const formatDate = (value, withTime = false) => new Date(value).toLocaleString(locale.value === 'zh' ? 'zh-CN' : 'en-US', withTime ? {} : { dateStyle: 'medium' })
function toggleLocale() { locale.value = locale.value === 'en' ? 'zh' : 'en'; localStorage.setItem('admin_locale', locale.value) }
function displayError(message) { return message === 'Request failed' ? t('requestFailed') : message.includes('session') ? t('sessionExpired') : message }

async function api(path, options = {}) {
  const res = await fetch(`${API}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(token.value ? { Authorization: 'Bearer ' + token.value } : {}), ...(options.headers || {}) } })
  if (!res.ok) {
    const message = (await res.json().catch(() => ({}))).message || 'Request failed'
    if (res.status === 401) {
      token.value = ''
      localStorage.removeItem('admin_token')
    }
    throw new Error(message)
  }
  return res.json()
}
async function load() {
  const requestId = ++loadRequestId
  loading.value = true; error.value = ''
  const requestedView = view.value
  try {
    const settings = await api('/settings')
    exchangeRate.value = Number(settings.exchangeRate) || 0.92
    pricingCurrency.value = settings.pricingCurrency === 'HKD' ? 'HKD' : 'RMB'
    severeWeatherEnabled.value = Boolean(settings.severeWeatherEnabled)
    adminLogo.value = settings.adminLogo || ''
    paymentSettings.value = {
      fareBalancePayEnabled: settings.fareBalancePayEnabled !== false,
      cashBalancePayEnabled: settings.cashBalancePayEnabled !== false,
      wechatPayEnabled: settings.wechatPayEnabled !== false,
      alipayPayEnabled: settings.alipayPayEnabled !== false,
      bankCardPayEnabled: settings.bankCardPayEnabled !== false,
      sandboxMode: Boolean(settings.sandboxMode)
    }
    if (!token.value) return
    if (!currentAdministrator.value) currentAdministrator.value = await api('/admin/auth/me')
    if (requestedView === 'dashboard') dashboard.value = await api('/admin/dashboard')
    if (['users', 'trips', 'charters'].includes(requestedView)) users.value = (await api('/admin/users')).data
    if (requestedView === 'trips') {
      const [tripResult, catalogResult] = await Promise.all([api('/admin/trips'), api('/vehicles')])
      trips.value = tripResult.data
      tripCatalog.value = catalogResult
    }
    if (requestedView === 'charters') charterOrders.value = (await api('/admin/charter-orders')).data
    if (requestedView === 'addresses') {
      const [addressResult, cityResult] = await Promise.allSettled([
        api('/admin/recommended-addresses'),
        api('/admin/mainland-cities')
      ])
      if (addressResult.status === 'fulfilled') {
        addresses.value = addressResult.value.data
      } else {
        addresses.value = []
        error.value = displayError(addressResult.reason?.message || '推薦地址載入失敗')
      }
      if (cityResult.status === 'fulfilled') {
        mainlandCities.value = cityResult.value.data.map(item => ({ ...item, name: displayMainlandCity(item.name) }))
      } else {
        mainlandCities.value = []
        error.value = displayError(cityResult.reason?.message || '城市資料載入失敗')
      }
    }
    if (['membership', 'promotions'].includes(requestedView)) membershipPlans.value = (await api('/admin/membership-plans')).data
    if (requestedView === 'promotions') promotions.value = (await api('/admin/promotions')).data
    if (requestedView === 'administrators') administrators.value = (await api('/admin/administrators')).data
    if (requestedView === 'auditLogs') auditLogs.value = (await api('/admin/audit-logs')).data
    if (requestedView === 'vehicles') {
      const [categoryResult, vehicleResult, extraResult, pricingResult] = await Promise.all([
        api('/admin/vehicle-categories'),
        api('/admin/vehicles'),
        api('/admin/vehicle-extras'),
        api('/admin/distance-pricing')
      ])
      categories.value = sortByOrder(categoryResult.data)
      vehicles.value = sortByOrder(vehicleResult.data)
      extras.value = sortByOrder(extraResult.data)
      distancePricing.value = sortByOrder(pricingResult.data)
    }
    if (requestedView === 'route-pricing') { categories.value = (await api('/admin/vehicle-categories')).data; routeMinimumFares.value = (await api('/admin/route-minimum-fares')).data }
  }
  catch (e) { error.value = displayError(e.message); if (e.message.includes('session')) { token.value = ''; localStorage.removeItem('admin_token') } }
  finally {
    if (requestId === loadRequestId) loading.value = false
  }
}
async function apiLogin() { try { error.value = ''; localStorage.removeItem('admin_token'); token.value = ''; const result = await api('/admin/auth/login', { method: 'POST', body: JSON.stringify({ username: username.value, password: password.value }) }); token.value = result.token; currentAdministrator.value = result.administrator; localStorage.setItem('admin_token', token.value); password.value = ''; load() } catch (e) { error.value = displayError(e.message) } }
async function logout() { try { if (token.value) await api('/admin/auth/logout', { method: 'POST' }) } catch {} finally { token.value = ''; currentAdministrator.value = null; localStorage.removeItem('admin_token'); view.value = 'dashboard'; dashboard.value = null } }
function resetAdministrator() { administratorForm.value = { id: '', username: '', displayName: '', role: 'OPERATOR', enabled: true, password: '' } }
function editAdministrator(item) { administratorForm.value = { ...item, password: '' } }
async function saveAdministrator() { try { await api('/admin/administrators', { method: 'POST', body: JSON.stringify(administratorForm.value) }); administratorForm.value = null; await load() } catch (e) { error.value = displayError(e.message) } }
async function disableAdministrator(item) { if (!confirm(`停用 ${item.displayName}?`)) return; try { await api(`/admin/administrators/${item.id}`, { method: 'DELETE' }); await load() } catch (e) { error.value = displayError(e.message) } }
async function saveExchangeRate() { const value = Number(exchangeRate.value); if (!Number.isFinite(value) || value <= 0) { error.value = 'Valid exchange rate required'; return } try { await api('/settings', { method: 'POST', body: JSON.stringify({ exchangeRate: value }) }); exchangeRate.value = value } catch (e) { error.value = displayError(e.message) } }
async function savePaymentSettings() {
  try {
    error.value = ''
    paymentSettingsSaved.value = false
    await api('/settings', {
      method: 'POST',
      body: JSON.stringify({
        fareBalancePayEnabled: paymentSettings.value.fareBalancePayEnabled,
        cashBalancePayEnabled: paymentSettings.value.cashBalancePayEnabled,
        wechatPayEnabled: paymentSettings.value.wechatPayEnabled,
        alipayPayEnabled: paymentSettings.value.alipayPayEnabled,
        bankCardPayEnabled: paymentSettings.value.bankCardPayEnabled,
        sandboxMode: paymentSettings.value.sandboxMode
      })
    })
    paymentSettingsSaved.value = true
    setTimeout(() => { paymentSettingsSaved.value = false }, 3000)
  } catch (e) {
    error.value = displayError(e.message)
  }
}
async function uploadAdminLogo(event) {
  const file = event.target.files?.[0]; event.target.value = ''
  if (!file) return
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { error.value = 'Logo 只支援 PNG、JPEG 或 WebP'; return }
  if (file.size > 1024 * 1024) { error.value = 'Logo 檔案不可超過 1 MB'; return }
  try {
    const dataUrl = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file) })
    const settings = await api('/settings', { method: 'POST', body: JSON.stringify({ adminLogo: dataUrl }) })
    adminLogo.value = settings.adminLogo || ''; error.value = ''
  } catch (e) { error.value = displayError(e.message || 'Logo 上傳失敗') }
}
async function removeAdminLogo() { try { const settings = await api('/settings', { method: 'POST', body: JSON.stringify({ adminLogo: null }) }); adminLogo.value = settings.adminLogo || '' } catch (e) { error.value = displayError(e.message) } }
async function updateCharterStatus(order, status) { try { await api(`/admin/charter-orders/${order.id}/status`, { method: 'POST', body: JSON.stringify({ status }) }); await load() } catch (e) { error.value = displayError(e.message) } }
const dateTimeInput = value => value ? new Date(value).toISOString().slice(0, 16) : ''
function editUser(item) { selectedUser.value = null; walletAdjustment.value = null; userForm.value = { ...item } }
function resetUser() { selectedUser.value = null; walletAdjustment.value = null; userForm.value = { id: '', name: '', countryCode: '+852', phoneNumber: '' } }
async function selectUser(item) {
  try {
    const [detail, transactions, history] = await Promise.all([
      api(`/admin/users/${item.id}`),
      api(`/admin/users/${item.id}/wallet-transactions`),
      api(`/admin/users/${item.id}/top-up-withdrawal-history`)
    ])
    selectedUser.value = detail
    userForm.value = null
    walletTransactions.value = transactions.data
    topUpWithdrawalHistory.value = history.data
  } catch (e) { error.value = displayError(e.message) }
}
function openWalletAdjustment(wallet) { walletAdjustment.value = { wallet, direction: 'INCREASE', amount: '', reason: '' } }
function editTrip(item) { selectedTrip.value = null; tripForm.value = { ...item, scheduledAt: dateTimeInput(item.scheduledAt) }; clearTripLocationSearch() }
function resetTrip() { selectedTrip.value = null; tripForm.value = { id: '', userId: users.value[0]?.id || '', origin: '', destination: '', originLatitude: '', originLongitude: '', destinationLatitude: '', destinationLongitude: '', originCity: '', destinationCity: '', distanceMeters: 0, categoryId: '', vehicleId: '', extraIds: [], region: 'GUANGDONG', scheduledAt: dateTimeInput(new Date(Date.now() + 3600000).toISOString()), status: 'PENDING' }; tripQuote.value = null; tripBookingStep.value = 'details'; clearTripLocationSearch() }
function clearTripLocationSearch() { tripLocationKeyword.value = ''; tripLocationResults.value = []; tripLocationTarget.value = 'origin' }
async function searchTripLocation(target) {
  const keyword = tripLocationKeyword.value.trim()
  if (!keyword || tripLocationSearching.value || !tripForm.value) return
  tripLocationTarget.value = target
  tripLocationSearching.value = true
  error.value = ''
  try {
    const region = tripForm.value.region === 'HK' ? '香港' : tripForm.value.region === 'MACAU' ? '澳門' : '大陸'
    const result = await api(`/location/search?keyword=${encodeURIComponent(keyword)}&region=${encodeURIComponent(region)}`)
    tripLocationResults.value = result.data || []
  } catch (e) { tripLocationResults.value = []; error.value = displayError(e.message) } finally { tripLocationSearching.value = false }
}
function selectTripLocation(item) {
  if (!tripForm.value) return
  const target = tripLocationTarget.value
  tripForm.value[target] = item.displayAddress || item.address || item.name
  tripForm.value[`${target}Latitude`] = item.latitude ?? item.lat ?? ''
  tripForm.value[`${target}Longitude`] = item.longitude ?? item.lng ?? ''
  tripForm.value[`${target}City`] = item.city || item.district || ''
  tripLocationKeyword.value = ''
  tripLocationResults.value = []
}
function handleTripRegionChange() { clearTripLocationSearch() }
function showTrip(item) { tripForm.value = null; selectedTrip.value = item }
function closeTrip() { selectedTrip.value = null }
function formatTripAmount(amount, currency = selectedTrip.value?.quote?.currency || 'RMB¥') {
  const value = Number(amount)
  return Number.isFinite(value) ? `${currency}${value.toFixed(2)}` : '—'
}
function paymentMethodLabel(method) {
  return ({ sandbox: '沙盒支付', wechat: '微信支付', alipay: '支付寶', bank_card: '銀行卡' })[method] || method || '—'
}
async function updateTripStatus(item, status) {
  if (!canWrite.value || item.status === status) return
  try {
    await api(`/admin/trips/${item.id}`, { method: 'POST', body: JSON.stringify({ ...item, status }) })
    await load()
    selectedTrip.value = trips.value.find(trip => trip.id === item.id) || null
  } catch (e) { error.value = displayError(e.message) }
}
function editCharter(item) { charterForm.value = { ...item, scheduledAt: dateTimeInput(item.scheduledAt) } }
async function saveUser() { try { const path = userForm.value.id ? `/admin/users/${userForm.value.id}` : '/admin/users'; const user = await api(path, { method: 'POST', body: JSON.stringify(userForm.value) }); userForm.value = null; await load(); await selectUser(user) } catch (e) { error.value = displayError(e.message) } }
async function saveWalletAdjustment() { try { const result = await api(`/admin/users/${selectedUser.value.id}/wallet-adjustments`, { method: 'POST', body: JSON.stringify(walletAdjustment.value) }); walletAdjustment.value = null; await load(); await selectUser(result.user) } catch (e) { error.value = displayError(e.message) } }
async function prepareTripQuote() {
  if (!tripForm.value || tripForm.value.id) return
  const vehicle = tripCatalog.value.data.find(item => item.id === tripForm.value.vehicleId)
  const categoryId = tripForm.value.categoryId || vehicle?.categoryId
  if (!categoryId || !tripForm.value.distanceMeters) { error.value = '請先搜尋並選擇完整路線，再選擇車型'; return }
  try {
    tripQuote.value = await api('/quotes', { method: 'POST', body: JSON.stringify({ categoryId, vehicleId: tripForm.value.vehicleId, distanceMeters: Number(tripForm.value.distanceMeters), extraIds: tripForm.value.extraIds || [], displayCurrency: 'RMB', userId: tripForm.value.userId, originRegion: tripForm.value.region === 'HK' ? '香港' : tripForm.value.region === 'MACAU' ? '澳門' : '大陸', destinationRegion: tripForm.value.region === 'HK' ? '香港' : tripForm.value.region === 'MACAU' ? '澳門' : '大陸', originCity: tripForm.value.originCity || '', destinationCity: tripForm.value.destinationCity || '', scheduledAt: tripForm.value.scheduledAt }) })
    tripBookingStep.value = 'payment'; error.value = ''
  } catch (e) { error.value = displayError(e.message) }
}
async function calculateTripRoute() {
  if (!tripForm.value?.originLatitude || !tripForm.value?.destinationLatitude) { error.value = '請先從搜尋結果選擇出發地及目的地'; return }
  try {
    const route = await api(`/location/driving-route?origin=${tripForm.value.originLongitude},${tripForm.value.originLatitude}&destination=${tripForm.value.destinationLongitude},${tripForm.value.destinationLatitude}`)
    tripForm.value.distanceMeters = Number(route.distance) || 0
    error.value = ''
  } catch (e) { error.value = displayError(e.message) }
}
async function completeTripBooking() {
  if (!tripQuote.value || !tripForm.value) return
  try {
    const result = await api('/payments/trip-pay', { method: 'POST', body: JSON.stringify({ userId: tripForm.value.userId, quoteId: tripQuote.value.id, useFareBalance: tripUseFareBalance.value, useCashBalance: tripUseCashBalance.value, externalPaymentMethod: tripPaymentMethod.value === 'sandbox' ? 'sandbox' : tripPaymentMethod.value, origin: tripForm.value.origin, destination: tripForm.value.destination, scheduledAt: tripForm.value.scheduledAt }) })
    tripForm.value = null; tripQuote.value = null; tripBookingStep.value = 'details'; await load()
    selectedTrip.value = trips.value.find(trip => trip.id === result?.tripId) || null
  } catch (e) { error.value = displayError(e.message) }
}
async function saveTrip() {
  if (!tripForm.value) return
  if (!tripForm.value.id) return prepareTripQuote()
  try { await api(`/admin/trips/${tripForm.value.id}`, { method: 'POST', body: JSON.stringify(tripForm.value) }); tripForm.value = null; await load() } catch (e) { error.value = displayError(e.message) }
}

async function saveCharter() { try { await api(`/admin/charter-orders/${charterForm.value.id}`, { method: 'POST', body: JSON.stringify(charterForm.value) }); charterForm.value = null; await load() } catch (e) { error.value = displayError(e.message) } }
function editMembership(item) { membershipForm.value = { ...item, benefits: item.benefits.join('\n') } }
function resetMembership() { membershipForm.value = { id: '', level: '', name: '', monthly: 0, yearly: 0, recommended: false, benefits: '', enabled: true, order: membershipPlans.value.length + 1 } }
async function saveMembership() { try { const form = { ...membershipForm.value, benefits: String(membershipForm.value.benefits).split('\n').map(v => v.trim()).filter(Boolean) }; await api('/admin/membership-plans', { method: 'POST', body: JSON.stringify(form) }); membershipForm.value = null; await load() } catch (e) { error.value = displayError(e.message) } }
async function removeMembership(item) { if (confirm(`${t('remove')} ${item.name}?`)) { await api(`/admin/membership-plans/${item.id}`, { method: 'DELETE' }); await load() } }
function formatBenefits(item) { return item.benefits.join(' · ') }
async function openPromotionForm(form) {
  promotionForm.value = form
  await nextTick()
  const container = document.querySelector('.promo-form-container')
  container?.scrollIntoView({ block: 'start' })
  container?.querySelector('input:not([readonly])')?.focus({ preventScroll: true })
}
function resetPromotion(kind = 'CAMPAIGN') {
  return openPromotionForm({ id: '', name: '', kind, discountType: 'PERCENTAGE', stackingMode: 'NONE', discountValue: 10, currency: pricingCurrency.value === 'HKD' ? 'HKD$' : 'RMB¥', minimumSpend: 0, maximumDiscount: '', priority: 0, startsAt: '', endsAt: '', enabled: true, couponCode: '', usageLimit: '', membershipLevel: '', originRegion: '', originCity: '', destinationRegion: '', destinationCity: '', weekdays: [], timeStart: '', timeEnd: '' })
}
function editPromotion(item) {
  return openPromotionForm({ ...item, stackingMode: item.stackingMode || 'NONE', startsAt: dateTimeInput(item.startsAt), endsAt: dateTimeInput(item.endsAt), maximumDiscount: item.maximumDiscount ?? '', usageLimit: item.usageLimit ?? '', weekdays: item.weekdays || [] })
}
async function savePromotion() { try { await api('/admin/promotions', { method: 'POST', body: JSON.stringify(promotionForm.value) }); promotionForm.value = null; await load() } catch (e) { error.value = displayError(e.message) } }
async function removePromotion(item) { if (!confirm(`刪除優惠「${item.name}」？`)) return; try { await api(`/admin/promotions/${item.id}`, { method: 'DELETE' }); await load() } catch (e) { error.value = displayError(e.message) } }
const promotionKindLabel = kind => ({ CAMPAIGN: '折扣活動', COUPON: '優惠碼', MEMBER: '會員專屬' }[kind] || kind)
const promotionDiscountLabel = item => item.discountType === 'PERCENTAGE'
  ? `${item.discountValue}%`
  : item.discountType === 'TOTAL_PRICE'
    ? `總價 ${item.currency}${item.discountValue}`
    : `${item.currency}${item.discountValue}`
const promotionDiscountHint = computed(() => {
  if (!promotionForm.value) return ''
  if (promotionForm.value.discountType === 'PERCENTAGE') return '輸入折扣百分比，例如 10 代表減免 10%。'
  if (promotionForm.value.discountType === 'TOTAL_PRICE') return '輸入折扣後應付總價，例如 500 代表原價會折到 500。'
  return '輸入固定折抵金額，例如 50 代表直接減免 50。'
})
const promotionStackingHint = computed(() => {
  if (!promotionForm.value) return ''
  if (promotionForm.value.stackingMode === 'PERCENTAGE_AND_VOUCHER') return '可同時套用一個百分比優惠與一張現金券。'
  if (promotionForm.value.stackingMode === 'ALL') return '符合條件的優惠都可以一起套用，系統會依序計算。'
  return '只套用這一項優惠，不會與其他優惠疊加。'
})
const filteredPromotions = computed(() => {
  let list = promotions.value
  if (promotionFilterTab.value === 'CAMPAIGN') {
    list = list.filter(item => item.kind === 'CAMPAIGN')
  } else if (promotionFilterTab.value === 'COUPON') {
    list = list.filter(item => item.kind === 'COUPON')
  } else if (promotionFilterTab.value === 'MEMBER') {
    list = list.filter(item => item.kind === 'MEMBER')
  } else if (promotionFilterTab.value === 'ACTIVE') {
    list = list.filter(item => item.enabled !== false)
  }
  if (promotionSearchQuery.value.trim()) {
    const q = promotionSearchQuery.value.trim().toLowerCase()
    list = list.filter(item =>
      (item.name || '').toLowerCase().includes(q) ||
      (item.couponCode || '').toLowerCase().includes(q) ||
      (item.membershipLevel || '').toLowerCase().includes(q) ||
      (item.originCity || '').toLowerCase().includes(q) ||
      (item.destinationCity || '').toLowerCase().includes(q)
    )
  }
  return list
})

function duplicatePromotion(item) {
  const copy = JSON.parse(JSON.stringify(item))
  copy.id = ''
  copy.name = `[複製] ${copy.name}`
  copy.startsAt = dateTimeInput(copy.startsAt)
  copy.endsAt = dateTimeInput(copy.endsAt)
  copy.maximumDiscount = copy.maximumDiscount ?? ''
  copy.usageLimit = copy.usageLimit ?? ''
  copy.weekdays = copy.weekdays || []
  if (copy.kind === 'COUPON') {
    copy.couponCode = generateRandomCouponCodeStr()
  }
  return openPromotionForm(copy)
}

async function togglePromotionEnabled(item) {
  try {
    const updated = { ...item, enabled: !item.enabled }
    await api('/admin/promotions', { method: 'POST', body: JSON.stringify(updated) })
    await load()
  } catch (e) {
    error.value = displayError(e.message)
  }
}

function generateRandomCouponCodeStr() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `PROMO${code}`
}

function generateRandomCouponCode() {
  if (promotionForm.value) {
    promotionForm.value.couponCode = generateRandomCouponCodeStr()
  }
}

function toggleWeekday(day) {
  if (!promotionForm.value) return
  if (!Array.isArray(promotionForm.value.weekdays)) {
    promotionForm.value.weekdays = []
  }
  const idx = promotionForm.value.weekdays.indexOf(day)
  if (idx >= 0) {
    promotionForm.value.weekdays.splice(idx, 1)
  } else {
    promotionForm.value.weekdays.push(day)
    promotionForm.value.weekdays.sort((a, b) => a - b)
  }
}

function isWeekdaySelected(day) {
  return Array.isArray(promotionForm.value?.weekdays) && promotionForm.value.weekdays.includes(day)
}

function setWeekdaysPreset(preset) {
  if (!promotionForm.value) return
  if (preset === 'ALL') {
    promotionForm.value.weekdays = [1, 2, 3, 4, 5, 6, 7]
  } else if (preset === 'WORKDAYS') {
    promotionForm.value.weekdays = [1, 2, 3, 4, 5]
  } else if (preset === 'WEEKENDS') {
    promotionForm.value.weekdays = [6, 7]
  } else if (preset === 'CLEAR') {
    promotionForm.value.weekdays = []
  }
}

function formatWeekdaysText(weekdays) {
  if (!Array.isArray(weekdays) || weekdays.length === 0) return '每天適用'
  const daysMap = { 1: '週一', 2: '週二', 3: '週三', 4: '週四', 5: '週五', 6: '週六', 7: '週日' }
  const sorted = [...weekdays].sort((a, b) => a - b)
  if (sorted.length === 7) return '每天 (週一至週日)'
  if (sorted.length === 5 && sorted.every((val, index) => val === index + 1)) return '工作日 (週一至週五)'
  if (sorted.length === 2 && sorted[0] === 6 && sorted[1] === 7) return '週末 (週六至週日)'
  return sorted.map(d => daysMap[d]).join('、')
}

function formatRouteText(item) {
  const origin = [item.originRegion, item.originCity].filter(Boolean).join(' ') || '不限地點'
  const dest = [item.destinationRegion, item.destinationCity].filter(Boolean).join(' ') || '不限地點'
  if (origin === '不限地點' && dest === '不限地點') return '不限路線'
  return `${origin} → ${dest}`
}

function formatTimeRangeText(item) {
  if (!item.timeStart && !item.timeEnd) return ''
  return `${item.timeStart || '00:00'} ~ ${item.timeEnd || '24:00'}`
}
function editExtra(item) { extraForm.value = { triggerType: item.triggerType || (item.requiredForImmediate ? 'IMMEDIATE' : 'NONE'), triggerEnabled: item.triggerEnabled !== false, nightStartTime: item.nightStartTime || '22:00', nightEndTime: item.nightEndTime || '06:00', ...item } }
function resetExtra() { extraForm.value = { id: '', label: '', price: 0, currency: pricingCurrency.value === 'HKD' ? 'HKD$' : 'RMB¥', enabled: true, order: extras.value.length + 1, requiredForImmediate: false, requiredWithinMinutes: null, triggerType: 'NONE', triggerEnabled: true, nightStartTime: '22:00', nightEndTime: '06:00' } }
async function saveExtra() {
  const currentView = view.value
  try {
    const form = extraForm.value
    await api('/admin/vehicle-extras', { method: 'POST', body: JSON.stringify({ ...form, requiredForImmediate: form.triggerType === 'IMMEDIATE' }) })
    if (form.triggerType === 'WEATHER') await api('/settings', { method: 'POST', body: JSON.stringify({ severeWeatherEnabled: severeWeatherEnabled.value }) })
    extraForm.value = null
    view.value = currentView
    await load()
    view.value = currentView
  } catch (e) {
    view.value = currentView
    error.value = displayError(e.message)
  }
}
async function showOnlyExtra(item) {
  const currentView = view.value
  try {
    const visibleItems = extras.value.filter(extra => extra.id !== item.id && extra.enabled !== false)
    await Promise.all(visibleItems.map(extra => api('/admin/vehicle-extras', {
      method: 'POST',
      body: JSON.stringify({ ...extra, enabled: false })
    })))
    await api('/admin/vehicle-extras', {
      method: 'POST',
      body: JSON.stringify({ ...item, enabled: true })
    })
    await load()
    view.value = currentView
  } catch (e) {
    error.value = displayError(e.message)
  }
}
const triggerLabel = (item) => ({ NONE: '一般', IMMEDIATE: '即時訂單', NIGHT: '深夜加班費', WEATHER: '惡劣天氣' }[item.triggerType || (item.requiredForImmediate ? 'IMMEDIATE' : 'NONE')] || '一般')
const triggerSummary = (item) => item.triggerType === 'IMMEDIATE' ? `出發前 ${item.requiredWithinMinutes || 60} 分鐘` : item.triggerType === 'NIGHT' ? `${item.nightStartTime || '22:00'}–${item.nightEndTime || '06:00'}` : item.triggerType === 'WEATHER' ? (severeWeatherEnabled.value ? '目前啟用' : '目前停用') : '手動選擇'
const isTriggerActive = (type) => extras.value.some(item => (item.triggerType || (item.requiredForImmediate ? 'IMMEDIATE' : 'NONE')) === type && item.triggerEnabled !== false) && (type !== 'WEATHER' || severeWeatherEnabled.value)
async function toggleSevereWeather() { try { const updated = await api('/settings', { method: 'POST', body: JSON.stringify({ severeWeatherEnabled: !severeWeatherEnabled.value }) }); severeWeatherEnabled.value = Boolean(updated.severeWeatherEnabled) } catch (e) { error.value = displayError(e.message) } }
async function removeExtra(item) { if (confirm(`${t('remove')} ${item.label}?`)) { await api(`/admin/vehicle-extras/${item.id}`, { method: 'DELETE' }); await load() } }
function addPricingTier(pricing) { const previous = pricing.tiers.at(-1); if (previous) previous.toKm = previous.toKm ?? previous.fromKm + 20; pricing.tiers.push({ id: `${pricing.categoryId}-tier-${Date.now()}`, fromKm: previous?.toKm ?? 0, toKm: null, pricePerKm: 0, order: pricing.tiers.length + 1 }) }
function removePricingTier(pricing, index) { pricing.tiers.splice(index, 1); pricing.tiers.forEach((tier, tierIndex) => { tier.order = tierIndex + 1; if (tierIndex > 0) tier.fromKm = pricing.tiers[tierIndex - 1].toKm }); if (pricing.tiers.length) pricing.tiers.at(-1).toKm = null }
function syncPreviousTier(pricing, index) { if (index > 0) pricing.tiers[index - 1].toKm = pricing.tiers[index].fromKm }
function syncNextTier(pricing, index) { const tier = pricing.tiers[index]; if (index < pricing.tiers.length - 1) pricing.tiers[index + 1].fromKm = tier.toKm }
async function saveDistancePricing(pricing) { try { await api(`/admin/distance-pricing/${pricing.categoryId}`, { method: 'POST', body: JSON.stringify(pricing) }); await load() } catch (e) { error.value = displayError(e.message) } }
async function switchPricingCurrency() { try { await api('/admin/distance-pricing/currency', { method: 'POST', body: JSON.stringify({ currency: pricingCurrency.value }) }); await load() } catch (e) { error.value = displayError(e.message) } }
function resetRouteMinimumFare() { routeMinimumFareForm.value = { id: '', originRegion: '香港', originCity: '', destinationRegion: '大陸', destinationCity: '', categoryId: '', minimumFare: 800, currency: pricingCurrency.value === 'HKD' ? 'HKD$' : 'RMB¥', enabled: true } }
function editRouteMinimumFare(item) { routeMinimumFareForm.value = { ...item, originCity: item.originCity || '', destinationCity: item.destinationCity || '', categoryId: item.categoryId || '' } }
async function saveRouteMinimumFare() { try { await api('/admin/route-minimum-fares', { method: 'POST', body: JSON.stringify(routeMinimumFareForm.value) }); routeMinimumFareForm.value = null; await load() } catch (e) { error.value = displayError(e.message) } }
async function removeRouteMinimumFare(item) { if (!confirm(`${t('remove')} ${item.originRegion} → ${item.destinationRegion}?`)) return; try { await api(`/admin/route-minimum-fares/${item.id}`, { method: 'DELETE' }); await load() } catch (e) { error.value = displayError(e.message) } }
function editVehicle(item) { vehicleForm.value = { ...item } }
function editCategory(item) { categoryForm.value = { ...item } }
function resetCategory() { categoryForm.value = { id: '', name: '', tabLabel: '', order: categories.value.length + 1, enabled: true } }
function resetVehicle() { vehicleForm.value = { id: '', categoryId: categories.value[0]?.id || '', brand: '', model: '', series: '', seats: 4, image: '', colorLabel: '不限顏色', modelChoiceLabel: '', enabled: true, order: 1 } }
async function saveCategory() { try { await api('/admin/vehicle-categories', { method: 'POST', body: JSON.stringify(categoryForm.value) }); categoryForm.value = null; await load() } catch (e) { error.value = displayError(e.message) } }
async function toggleCategory(item) { try { await api('/admin/vehicle-categories', { method: 'POST', body: JSON.stringify({ ...item, enabled: !item.enabled }) }); await load() } catch (e) { error.value = displayError(e.message) } }
async function saveVehicle() { try { await api('/admin/vehicles', { method: 'POST', body: JSON.stringify(vehicleForm.value) }); vehicleForm.value = null; await load() } catch (e) { error.value = displayError(e.message) } }
async function toggleVehicle(item) { try { await api('/admin/vehicles', { method: 'POST', body: JSON.stringify({ ...item, enabled: !item.enabled }) }); await load() } catch (e) { error.value = displayError(e.message) } }
async function removeCategory(item) { if (confirm(`${t('remove')} ${item.name}?`)) { await api(`/admin/vehicle-categories/${item.id}`, { method: 'DELETE' }); await load() } }
async function removeVehicle(item) { if (confirm(`${t('remove')} ${item.model}?`)) { await api(`/admin/vehicles/${item.id}`, { method: 'DELETE' }); await load() } }
function editAddress(item) { addressForm.value = { ...item, city: displayMainlandCity(item.city || ''), address: item.displayAddress || item.address } }
function resetAddress() {
  const nextOrder = addresses.value.reduce((max, item) => Math.max(max, Number(item.order) || 0), 0) + 1
  addressForm.value = { id: '', region: '香港', city: '', name: '', address: '', latitude: null, longitude: null, enabled: true, order: nextOrder }
}
async function searchAddressPlaces() {
  const keyword = addressSearchKeyword.value.trim()
  if (!keyword || addressSearching.value) return
  addressSearching.value = true
  error.value = ''
  try {
    const city = addressForm.value.region === '大陸' ? apiMainlandCity(addressForm.value.city.trim()) : ''
    const cityQuery = city ? `&city=${encodeURIComponent(city)}` : ''
    const result = await api(`/location/search?keyword=${encodeURIComponent(keyword)}&region=${encodeURIComponent(addressForm.value.region)}${cityQuery}`)
    addressSearchResults.value = result.data || []
  } catch (e) {
    addressSearchResults.value = []
    error.value = displayError(e.message)
  } finally {
    addressSearching.value = false
  }
}
function handleAddressRegionChange() {
  if (addressForm.value.region !== '大陸') addressForm.value = { ...addressForm.value, city: '' }
  addressSearchResults.value = []
  addressSearchKeyword.value = ''
}
function handleAddressCityChange() {
  addressSearchResults.value = []
  addressSearchKeyword.value = ''
}
function selectAddressSearchResult(item) {
  addressForm.value = { ...addressForm.value, city: addressForm.value.region === '大陸' ? addressForm.value.city : '', name: displayPlaceName(item.name), address: item.displayAddress || item.address, latitude: null, longitude: null }
  addressSearchResults.value = []
  addressSearchKeyword.value = ''
}
async function saveAddress() { try { const { latitude, longitude, ...form } = addressForm.value; const payload = { ...form, city: form.region === '大陸' ? apiMainlandCity(form.city.trim()) : '' }; const path = form.id ? `/admin/recommended-addresses/${form.id}` : '/admin/recommended-addresses'; await api(path, { method: form.id ? 'PATCH' : 'POST', body: JSON.stringify(payload) }); resetAddress(); await load() } catch (e) { error.value = displayError(e.message) } }
async function removeAddress(item) { if (!confirm(`${t('remove')} ${item.name}?`)) return; try { await api(`/admin/recommended-addresses/${item.id}`, { method: 'DELETE' }); await load() } catch (e) { error.value = displayError(e.message) } }
function resetMainlandCity() { mainlandCityForm.value = { id: '', name: '', enabled: true, order: mainlandCities.value.length + 1 } }
function editMainlandCity(item) { mainlandCityForm.value = { ...item } }
async function saveMainlandCity() { try { const form = { ...mainlandCityForm.value, name: apiMainlandCity(mainlandCityForm.value.name.trim()) }; await api('/admin/mainland-cities', { method: 'POST', body: JSON.stringify(form) }); mainlandCityForm.value = null; await load() } catch (e) { error.value = displayError(e.message) } }
async function removeMainlandCity(item) { if (!confirm(`${t('remove')} ${item.name}? 已歸屬該市的推薦地址將轉為大陸總分類。`)) return; try { await api(`/admin/mainland-cities/${item.id}`, { method: 'DELETE' }); await load() } catch (e) { error.value = displayError(e.message) } }
const persistOperations = () => {
  localStorage.setItem('admin_personnel', JSON.stringify(personnel.value))
  localStorage.setItem('admin_entry_items', JSON.stringify(entryItems.value))
  localStorage.setItem('admin_expenses', JSON.stringify(expenseItems.value))
}
const seedOperations = () => {
  if (!personnel.value.length) personnel.value = [{ id: 'staff-1', name: '王小明', role: '調度主管', phone: '9123 4567', status: '在職' }, { id: 'staff-2', name: '李怡君', role: '客服專員', phone: '9234 5678', status: '在職' }]
  if (!entryItems.value.length) entryItems.value = [{ id: 'entry-1', name: '機場接送', category: '接送服務', unit: '趟', price: 680, enabled: true }, { id: 'entry-2', name: '跨境包車', category: '包車服務', unit: '小時', price: 500, enabled: true }, { id: 'entry-3', name: '深夜服務費', category: '附加服務', unit: '次', price: 120, enabled: true }]
  if (!expenseItems.value.length) expenseItems.value = [{ id: 'expense-1', date: '2026-09-08', category: '車輛維護', description: '例行保養與洗車', amount: 1280, status: '已核銷' }, { id: 'expense-2', date: '2026-09-06', category: '人事費用', description: '兼職司機薪資', amount: 3600, status: '待核銷' }]
  persistOperations()
}
function resetPersonnel() { personnelForm.value = { id: '', name: '', role: '司機', phone: '', status: '在職' } }
function editPersonnel(item) { personnelForm.value = { ...item } }
function savePersonnel() { const form = { ...personnelForm.value, id: personnelForm.value.id || `staff-${Date.now()}` }; personnel.value = personnel.value.some(item => item.id === form.id) ? personnel.value.map(item => item.id === form.id ? form : item) : [form, ...personnel.value]; personnelForm.value = null; persistOperations() }
function removePersonnel(item) { if (confirm(`刪除人員「${item.name}」？`)) { personnel.value = personnel.value.filter(record => record.id !== item.id); persistOperations() } }
function resetEntryItem() { entryForm.value = { id: '', name: '', category: '接送服務', unit: '趟', price: 0, enabled: true } }
function editEntryItem(item) { entryForm.value = { ...item } }
function saveEntryItem() { const form = { ...entryForm.value, id: entryForm.value.id || `entry-${Date.now()}`, price: Number(entryForm.value.price) || 0 }; entryItems.value = entryItems.value.some(item => item.id === form.id) ? entryItems.value.map(item => item.id === form.id ? form : item) : [form, ...entryItems.value]; entryForm.value = null; persistOperations() }
function removeEntryItem(item) { if (confirm(`刪除項目「${item.name}」？`)) { entryItems.value = entryItems.value.filter(record => record.id !== item.id); persistOperations() } }
function resetExpense() { expenseForm.value = { id: '', date: new Date().toISOString().slice(0, 10), category: '車輛維護', description: '', amount: 0, status: '待核銷' } }
function editExpense(item) { expenseForm.value = { ...item } }
function saveExpense() { const form = { ...expenseForm.value, id: expenseForm.value.id || `expense-${Date.now()}`, amount: Number(expenseForm.value.amount) || 0 }; expenseItems.value = expenseItems.value.some(item => item.id === form.id) ? expenseItems.value.map(item => item.id === form.id ? form : item) : [form, ...expenseItems.value]; expenseForm.value = null; persistOperations() }
function removeExpense(item) { if (confirm(`刪除支出「${item.description}」？`)) { expenseItems.value = expenseItems.value.filter(record => record.id !== item.id); persistOperations() } }
const filteredPersonnel = computed(() => personnelFilter.value === '全部' ? personnel.value : personnel.value.filter(item => item.status === personnelFilter.value))
const filteredEntryItems = computed(() => entryFilter.value === '全部' ? entryItems.value : entryItems.value.filter(item => item.category === entryFilter.value))
const filteredExpenses = computed(() => expenseFilter.value === '全部' ? expenseItems.value : expenseItems.value.filter(item => item.category === expenseFilter.value))
const incomeRows = computed(() => [...trips.value.map((item, index) => ({ id: item.id, date: item.scheduledAt, category: '接送服務', description: `${item.origin} → ${item.destination}`, amount: 680 + index * 120 })), ...charterOrders.value.map(item => ({ id: item.id, date: item.scheduledAt, category: '包車服務', description: `${item.origin} → ${item.destination}`, amount: item.durationHours * 500 }))])
const incomeTotal = computed(() => incomeRows.value.reduce((sum, item) => sum + item.amount, 0))
const expenseTotal = computed(() => expenseItems.value.reduce((sum, item) => sum + Number(item.amount || 0), 0))
const filteredTrips = computed(() => {
  const query = tripSearchQuery.value.trim().toLowerCase()
  return trips.value.filter(item => {
    const matchesQuery = !query || [item.id, item.origin, item.destination, item.user?.name, item.user?.phoneNumber].some(value => String(value || '').toLowerCase().includes(query))
    const matchesStatus = tripStatusFilter.value === 'ALL' || item.status === tripStatusFilter.value
    const matchesDate = !tripDateFilter.value || String(item.scheduledAt || '').slice(0, 10) === tripDateFilter.value
    return matchesQuery && matchesStatus && matchesDate
  })
})
const title = computed(() => t(view.value))
const filteredAddresses = computed(() => addresses.value.filter(item =>
  (!addressRegionFilter.value || item.region === addressRegionFilter.value) &&
  (!addressCityFilter.value || addressRegionFilter.value !== '大陸' ||
    (addressCityFilter.value === '__mainland__' ? !item.city : displayMainlandCity(item.city) === addressCityFilter.value))))

const App = { setup() { onMounted(() => { seedOperations(); load() }); return { token, locale, view, vehicleTab, title, dashboard, exchangeRate, severeWeatherEnabled, adminLogo, users, selectedUser, walletTransactions, topUpWithdrawalHistory, trips, charterOrders, addresses, mainlandCities, mainlandCityForm, addressRegionFilter, addressCityFilter, filteredAddresses, addressSearchKeyword, addressSearchResults, addressSearching, categories, vehicles, extras, distancePricing, pricingCurrency, routeMinimumFares, routeMinimumFareForm, membershipPlans, promotions, promotionForm, membershipForm, addressForm, categoryForm, vehicleForm, extraForm, userForm, walletAdjustment, tripForm, selectedTrip, tripCatalog, tripQuote, tripBookingStep, tripPaymentMethod, tripUseFareBalance, tripUseCashBalance, tripLocationKeyword, tripLocationResults, tripLocationSearching, tripLocationTarget, tripSearchQuery, tripStatusFilter, tripDateFilter, filteredTrips, charterForm, currentAdministrator, administrators, auditLogs, administratorForm, personnel, personnelForm, personnelFilter, filteredPersonnel, entryItems, entryForm, entryFilter, filteredEntryItems, expenseItems, expenseForm, expenseFilter, filteredExpenses, incomeRows, incomeTotal, expenseTotal, canWrite, isSuperAdministrator, loading, error, username, password, timeOptions, apiLogin, logout, load, resetAdministrator, editAdministrator, saveAdministrator, disableAdministrator, saveExchangeRate, uploadAdminLogo, removeAdminLogo, t, toggleLocale, translateRegion, translateStatus, formatDate, formatTripAmount, paymentMethodLabel, displayMainlandCity, updateCharterStatus, editUser, resetUser, selectUser, openWalletAdjustment, editTrip, resetTrip, searchTripLocation, selectTripLocation, handleTripRegionChange, calculateTripRoute, prepareTripQuote, completeTripBooking, showTrip, closeTrip, updateTripStatus, saveWalletAdjustment, saveTrip, saveCharter, editAddress, resetAddress, searchAddressPlaces, selectAddressSearchResult, handleAddressRegionChange, handleAddressCityChange, saveAddress, removeAddress, resetMainlandCity, editMainlandCity, saveMainlandCity, removeMainlandCity, editCategory, editVehicle, resetCategory, saveCategory, toggleCategory, saveVehicle, toggleVehicle, removeCategory, removeVehicle, resetVehicle, editExtra, resetExtra, triggerLabel, triggerSummary, isTriggerActive, toggleSevereWeather, showOnlyExtra, addPricingTier, removePricingTier, syncPreviousTier, syncNextTier, saveDistancePricing, switchPricingCurrency, resetRouteMinimumFare, editRouteMinimumFare, saveRouteMinimumFare, removeRouteMinimumFare, editMembership, resetMembership, saveMembership, removeMembership, formatBenefits, resetPromotion, editPromotion, savePromotion, removePromotion, promotionKindLabel, promotionDiscountLabel, promotionDiscountHint, promotionStackingHint, promotionFilterTab, promotionSearchQuery, filteredPromotions, duplicatePromotion, togglePromotionEnabled, generateRandomCouponCode, toggleWeekday, isWeekdaySelected, setWeekdaysPreset, formatWeekdaysText, formatRouteText, formatTimeRangeText, resetPersonnel, editPersonnel, savePersonnel, removePersonnel, resetEntryItem, editEntryItem, saveEntryItem, removeEntryItem, resetExpense, editExpense, saveExpense, removeExpense, paymentSettings, paymentSettingsSaved, savePaymentSettings } }, template: `<div v-if="!token" class="login"><button class="login-language" @click="toggleLocale" :aria-label="t('languageLabel')">中 / EN</button><div class="login-orb login-orb-one"></div><div class="login-orb login-orb-two"></div><form @submit.prevent="apiLogin"><div class="brand"><img v-if="adminLogo" :src="adminLogo" width="180" height="56" alt="Admin logo"/><span v-else>{{t('brand')}}</span></div><h1>{{t('welcome')}}</h1><p>{{t('signInPrompt')}}</p><input v-model="username" :placeholder="t('adminUsername')" autocomplete="username" required/><input v-model="password" type="password" :placeholder="t('password')" autocomplete="current-password" required/><button>{{t('signIn')}}</button><small v-if="error">{{error}}</small></form></div><div v-else class="shell"><aside><div class="brand"><img v-if="adminLogo" :src="adminLogo" width="180" height="56" alt="Admin logo"/><span v-else>{{t('brand')}}</span></div><nav>
  <button :class="{active:view==='dashboard'}" @click="view='dashboard';load()">{{t('dashboard')}}</button>
  <button :class="{active:view==='users'}" @click="view='users';load()">{{t('users')}}</button>
  <button :class="{active:view==='trips'}" @click="view='trips';load()">{{t('trips')}}</button>
  <button :class="{active:view==='charters'}" @click="view='charters';load()">{{t('charters')}}</button>
  <button :class="{active:view==='addresses'}" @click="view='addresses';load()">{{t('addresses')}}</button>
  <button :class="{active:view==='vehicles'}" @click="view='vehicles';load()">車型設定</button>
  <button :class="{active:view==='route-pricing'}" @click="view='route-pricing';load()">路線最低價</button>
  <button :class="{active:view==='membership'}" @click="view='membership';load()">{{t('membership')}}</button>
  <button :class="{active:view==='promotions'}" @click="view='promotions';load()">優惠設定</button>
  <button :class="{active:view==='payments'}" @click="view='payments';load()">{{t('paymentSettings')}}</button>
  <button v-if="isSuperAdministrator" :class="{active:view==='administrators'}" @click="view='administrators';load()">{{t('administrators')}}</button>
  <button v-if="isSuperAdministrator" :class="{active:view==='auditLogs'}" @click="view='auditLogs';load()">{{t('auditLogs')}}</button>
  <div class="nav-group operations-nav">
    <button class="nav-group-toggle" type="button">{{t('operations')}} <span>⌄</span></button>
    <div class="nav-group-items">
      <button :class="{active:view==='operations-personnel'}" @click="view='operations-personnel'">{{t('personnelManagement')}}</button>
      <button :class="{active:view==='vehicles'}" @click="view='vehicles';load()">{{t('vehicleManagement')}}</button>
      <button :class="{active:view==='entries'}" @click="view='entries'">{{t('entryItems')}}</button>
      <button :class="{active:view==='income'}" @click="view='income';load()">{{t('incomeReport')}}</button>
      <button :class="{active:view==='expenses'}" @click="view='expenses'">{{t('expenseDetails')}}</button>
    </div>
  </div>
</nav><div v-if="currentAdministrator" class="admin-identity"><b>{{currentAdministrator.displayName}}</b><span>{{currentAdministrator.role}}</span></div><button class="logout" @click="logout">{{t('signOut')}}</button>
</aside><main :class="{readonly: !canWrite}"><header><div><span class="eyebrow">{{t('adminConsole')}}</span><h1>{{title}}</h1></div><div class="header-actions"><span v-if="!canWrite" class="readonly-badge">唯讀模式</span><label v-if="canWrite" class="rate-control">{{t('exchangeRate')}} <input v-model="exchangeRate" type="number" min="0.0001" step="0.0001"/><button @click="saveExchangeRate">{{t('saveRate')}}</button></label><button class="language-toggle" @click="toggleLocale" :aria-label="t('languageLabel')">中 / EN</button><button class="refresh" @click="load">↻ {{t('refresh')}}</button></div></header><div v-if="error" class="error">{{error}}</div><section v-if="view==='dashboard' && isSuperAdministrator" class="logo-settings panel"><div><span class="eyebrow">BRANDING</span><h2>Logo 設定</h2><p>上傳後會以保持比例置中裁切方式填滿固定 180 × 56 px 顯示框，檔案上限 1 MB。</p></div><div class="logo-settings-actions"><div class="logo-preview"><img v-if="adminLogo" :src="adminLogo" width="180" height="56" alt="Admin logo"/><span v-else>尚未設定 Logo</span></div><label class="logo-upload">更換 Logo<input type="file" accept="image/png,image/jpeg,image/webp" @change="uploadAdminLogo"/></label><button v-if="adminLogo" class="logo-remove" @click="removeAdminLogo">移除</button></div></section><section v-if="view==='dashboard' && dashboard" class="cards"><article><span>{{t('totalUsers')}}</span><strong>{{dashboard.users}}</strong></article><article><span>{{t('totalTrips')}}</span><strong>{{dashboard.trips}}</strong></article><article><span>{{t('pendingTrips')}}</span><strong>{{dashboard.pendingTrips}}</strong></article><article><span>{{t('completedTrips')}}</span><strong>{{dashboard.completedTrips}}</strong></article><article><span>{{t('charterOrders')}}</span><strong>{{dashboard.charterOrders}}</strong></article><article><span>{{t('activeAddresses')}}</span><strong>{{dashboard.recommendedAddresses}}</strong></article></section><section v-if="view==='operations-personnel' || view==='entries' || view==='expenses' || view==='income'" class="operations-management"><div v-if="view==='operations-personnel'" class="panel"><div class="admin-toolbar"><div><span class="eyebrow">OPERATIONS</span><h2>{{t('personnelManagement')}}</h2></div><div class="toolbar-actions"><select v-model="personnelFilter"><option>全部</option><option>在職</option><option>停用</option></select><button v-if="canWrite" @click="resetPersonnel">新增人員</button></div></div><form v-if="personnelForm" class="record-form" @submit.prevent="savePersonnel"><input v-model="personnelForm.name" placeholder="姓名" required/><input v-model="personnelForm.role" placeholder="職務" required/><input v-model="personnelForm.phone" placeholder="聯絡電話"/><select v-model="personnelForm.status"><option>在職</option><option>停用</option></select><button>儲存</button><button type="button" class="secondary" @click="personnelForm=null">取消</button></form><table><thead><tr><th>姓名</th><th>職務</th><th>聯絡電話</th><th>狀態</th><th>操作</th></tr></thead><tbody><tr v-for="item in filteredPersonnel" :key="item.id"><td><strong>{{item.name}}</strong></td><td>{{item.role}}</td><td>{{item.phone || '—'}}</td><td><span class="status" :class="item.status === '在職' ? 'completed' : 'cancelled'">{{item.status}}</span></td><td class="row-actions"><button v-if="canWrite" @click="editPersonnel(item)">編輯</button><button v-if="canWrite" @click="removePersonnel(item)">刪除</button></td></tr></tbody></table></div><div v-else-if="view==='entries'" class="panel"><div class="admin-toolbar"><div><span class="eyebrow">SERVICE CATALOG</span><h2>{{t('entryItems')}}</h2></div><div class="toolbar-actions"><select v-model="entryFilter"><option>全部</option><option>接送服務</option><option>包車服務</option><option>附加服務</option></select><button v-if="canWrite" @click="resetEntryItem">新增項目</button></div></div><form v-if="entryForm" class="record-form" @submit.prevent="saveEntryItem"><input v-model="entryForm.name" placeholder="項目名稱" required/><select v-model="entryForm.category"><option>接送服務</option><option>包車服務</option><option>附加服務</option></select><input v-model="entryForm.unit" placeholder="單位"/><input v-model.number="entryForm.price" type="number" min="0" placeholder="單價"/><button>儲存</button><button type="button" class="secondary" @click="entryForm=null">取消</button></form><table><thead><tr><th>項目名稱</th><th>分類</th><th>單位</th><th>單價</th><th>狀態</th><th>操作</th></tr></thead><tbody><tr v-for="item in filteredEntryItems" :key="item.id"><td><strong>{{item.name}}</strong></td><td><span class="tag">{{item.category}}</span></td><td>{{item.unit}}</td><td>RMB¥{{item.price}}</td><td><span class="status" :class="item.enabled ? 'completed' : 'cancelled'">{{item.enabled ? '啟用' : '停用'}}</span></td><td class="row-actions"><button v-if="canWrite" @click="editEntryItem(item)">編輯</button><button v-if="canWrite" @click="removeEntryItem(item)">刪除</button></td></tr></tbody></table></div><div v-else-if="view==='income'" class="operations-report"><div class="cards report-cards"><article><span>本期收入</span><strong>RMB¥{{incomeTotal.toLocaleString()}}</strong></article><article><span>接送服務</span><strong>{{incomeRows.filter(item => item.category === '接送服務').length}} 筆</strong></article><article><span>包車服務</span><strong>{{incomeRows.filter(item => item.category === '包車服務').length}} 筆</strong></article></div><div class="panel"><div class="admin-toolbar"><div><span class="eyebrow">FINANCE</span><h2>{{t('incomeReport')}}</h2></div><button class="secondary" @click="load">↻ 更新報表</button></div><table><thead><tr><th>日期</th><th>收入分類</th><th>項目</th><th>金額</th></tr></thead><tbody><tr v-for="item in incomeRows" :key="item.id"><td>{{formatDate(item.date)}}</td><td><span class="tag">{{item.category}}</span></td><td>{{item.description}}</td><td><strong>RMB¥{{item.amount.toLocaleString()}}</strong></td></tr><tr v-if="!incomeRows.length"><td colspan="4" class="muted">目前沒有收入資料</td></tr></tbody></table></div></div><div v-else class="panel"><div class="admin-toolbar"><div><span class="eyebrow">FINANCE</span><h2>{{t('expenseDetails')}}</h2></div><div class="toolbar-actions"><select v-model="expenseFilter"><option>全部</option><option>車輛維護</option><option>人事費用</option><option>營運費用</option></select><button v-if="canWrite" @click="resetExpense">新增支出</button></div></div><div class="expense-total">支出合計 <strong>RMB¥{{expenseTotal.toLocaleString()}}</strong></div><form v-if="expenseForm" class="record-form" @submit.prevent="saveExpense"><input v-model="expenseForm.date" type="date" required/><select v-model="expenseForm.category"><option>車輛維護</option><option>人事費用</option><option>營運費用</option></select><input v-model="expenseForm.description" placeholder="支出說明" required/><input v-model.number="expenseForm.amount" type="number" min="0" placeholder="金額" required/><select v-model="expenseForm.status"><option>待核銷</option><option>已核銷</option></select><button>儲存</button><button type="button" class="secondary" @click="expenseForm=null">取消</button></form><table><thead><tr><th>日期</th><th>支出分類</th><th>說明</th><th>金額</th><th>狀態</th><th>操作</th></tr></thead><tbody><tr v-for="item in filteredExpenses" :key="item.id"><td>{{item.date}}</td><td><span class="tag">{{item.category}}</span></td><td>{{item.description}}</td><td><strong>RMB¥{{Number(item.amount).toLocaleString()}}</strong></td><td><span class="status" :class="item.status === '已核銷' ? 'completed' : 'pending'">{{item.status}}</span></td><td class="row-actions"><button v-if="canWrite" @click="editExpense(item)">編輯</button><button v-if="canWrite" @click="removeExpense(item)">刪除</button></td></tr></tbody></table></div></section><section v-if="view==='users'" class="user-management"><div class="panel user-list-panel"><div class="admin-toolbar user-list-toolbar"><div><span class="eyebrow">CUSTOMER DIRECTORY</span><h2>用戶管理</h2><p class="muted">管理聯絡資料、錢包餘額與用戶服務記錄</p></div><button v-if="canWrite" class="primary user-add-btn" @click="resetUser"><span aria-hidden="true">＋</span>新增用戶</button></div><div v-if="userForm?.id" class="user-edit-backdrop" @click="userForm=null"></div><form v-if="userForm" class="user-form-card" :class="{ 'user-edit-drawer': userForm.id }" @submit.prevent="saveUser"><div class="user-form-heading"><div><span class="eyebrow">{{userForm.id ? 'EDIT CUSTOMER' : 'NEW CUSTOMER'}}</span><h3>{{userForm.id ? '編輯用戶資料' : '建立用戶'}}</h3></div><button type="button" class="icon-close-btn" aria-label="關閉表單" @click="userForm=null">×</button></div><div class="user-form-grid"><label><span>姓名</span><input v-model.trim="userForm.name" placeholder="輸入用戶姓名" autocomplete="name"/></label><label><span>國家／地區</span><select v-model="userForm.countryCode" aria-label="國家／地區"><option value="+852">香港　+852</option><option value="+86">中國大陸　+86</option><option value="+853">澳門　+853</option></select></label><label class="phone-field"><span>手機號碼 <b>*</b></span><div class="phone-input"><strong>{{userForm.countryCode}}</strong><input v-model.trim="userForm.phoneNumber" inputmode="numeric" placeholder="輸入手機號碼" autocomplete="tel-national" required/></div></label></div><div class="user-form-actions"><span class="muted">手機號碼將用作登入與聯絡識別</span><div><button type="button" class="secondary" @click="userForm=null">取消</button><button class="primary">{{userForm.id ? '保存修改' : '建立用戶'}}</button></div></div></form><div class="user-list-summary"><span>共 {{users.length}} 位用戶</span><span class="muted">點擊用戶列查看錢包與訂單記錄</span></div><div class="user-table-wrap"><table><thead><tr><th>用戶</th><th>聯絡電話</th><th>錢包餘額</th><th>加入日期</th><th>{{t('actions')}}</th></tr></thead><tbody><tr v-for="u in users" :key="u.id" class="user-row" :class="{ selected: selectedUser?.id === u.id }" @click="selectUser(u)"><td><div class="user-identity"><span class="user-avatar">{{(u.name || u.phoneNumber || '?').slice(0,1).toUpperCase()}}</span><div><strong>{{u.name || '未設定姓名'}}</strong><small>{{u.id}}</small></div></div></td><td><span class="phone-display">{{u.countryCode}} {{u.phoneNumber}}</span></td><td><div class="wallet-summary"><span>現金 {{Number(u.cashBalance || 0).toFixed(2)}}</span><span>車費 {{Number(u.fareBalance || 0).toFixed(2)}}</span></div></td><td>{{formatDate(u.createdAt)}}</td><td class="row-actions" @click.stop><button class="secondary" @click="selectUser(u)">查看</button><button v-if="canWrite" @click="editUser(u)">{{t('edit')}}</button></td></tr><tr v-if="!users.length"><td colspan="5" class="muted user-empty">目前沒有用戶資料</td></tr></tbody></table></div></div><div v-if="selectedUser" class="user-detail-backdrop" @click="selectedUser=null"></div><section v-if="selectedUser" class="user-detail user-detail-drawer panel" @click.stop><div class="admin-toolbar"><div><span class="eyebrow">CUSTOMER PROFILE</span><h2>{{selectedUser.name || selectedUser.phone}}</h2><span class="muted">{{selectedUser.countryCode}} {{selectedUser.phoneNumber}} · {{selectedUser.id}}</span><div class="user-auth-times"><span><b>加入日期</b>{{formatDate(selectedUser.createdAt)}}</span><span><b>上一次登入</b>{{selectedUser.lastLoginAt ? formatDate(selectedUser.lastLoginAt) : '尚未登入'}}</span><span><b>上一次登出</b>{{selectedUser.lastLogoutAt ? formatDate(selectedUser.lastLogoutAt) : '尚未登出'}}</span></div></div><button class="secondary" @click="selectedUser=null">關閉</button></div><div class="wallet-cards"><article><span>{{t('cashWallet')}}</span><strong>{{selectedUser.cashBalance.toFixed(2)}}</strong><div v-if="canWrite" class="wallet-actions"><button @click="openWalletAdjustment('CASH')">調整餘額</button></div></article><article><span>{{t('fareWallet')}}</span><strong>{{selectedUser.fareBalance.toFixed(2)}}</strong><div v-if="canWrite" class="wallet-actions"><button @click="openWalletAdjustment('FARE')">調整餘額</button></div></article></div><form v-if="walletAdjustment" class="record-form wallet-form" @submit.prevent="saveWalletAdjustment"><b>{{walletAdjustment.wallet === 'CASH' ? t('cashWallet') : t('fareWallet')}}</b><select v-model="walletAdjustment.direction"><option value="INCREASE">{{t('increase')}}</option><option value="DECREASE">{{t('decrease')}}</option></select><input v-model.number="walletAdjustment.amount" type="number" min="0.01" step="0.01" :placeholder="t('amount')" required/><input v-model="walletAdjustment.reason" maxlength="500" :placeholder="t('reasonRequired')" required/><button>{{t('confirmAdjustment')}}</button><button type="button" class="secondary" @click="walletAdjustment=null">{{t('cancel')}}</button></form><div class="user-records"><div><h3>{{t('currentTrips')}}</h3><p v-if="!selectedUser.currentTrips.length" class="muted">{{t('noCurrentTrips')}}</p><table v-else><tbody><tr v-for="trip in selectedUser.currentTrips" :key="trip.id"><td><b>{{trip.origin}}</b> → {{trip.destination}}</td><td>{{translateStatus(trip.status)}}</td><td>{{formatDate(trip.scheduledAt, true)}}</td></tr></tbody></table></div><div><h3>{{t('currentCharterOrders')}}</h3><p v-if="!selectedUser.currentCharterOrders.length" class="muted">{{t('noCurrentCharterOrders')}}</p><table v-else><tbody><tr v-for="order in selectedUser.currentCharterOrders" :key="order.id"><td><b>{{order.origin}}</b> → {{order.destination}}</td><td>{{translateStatus(order.status)}}</td><td>{{formatDate(order.scheduledAt, true)}}</td></tr></tbody></table></div></div><div class="history-table"><h3>{{t('balanceHistory')}}</h3><p v-if="!walletTransactions.length" class="muted">{{t('noBalanceTransactions')}}</p><table v-else><thead><tr><th>Time</th><th>Wallet</th><th>Type</th><th>Amount</th><th>Balance after</th><th>Reason</th></tr></thead><tbody><tr v-for="transaction in walletTransactions" :key="transaction.id"><td>{{formatDate(transaction.createdAt, true)}}</td><td>{{transaction.wallet}}</td><td>{{transaction.type}}</td><td>{{transaction.amount.toFixed(2)}}</td><td>{{transaction.balanceAfter.toFixed(2)}}</td><td>{{transaction.reason}}</td></tr></tbody></table></div><div class="history-table"><h3>{{t('topUpHistory')}}</h3><p v-if="!topUpWithdrawalHistory.length" class="muted">{{t('noTopUps')}}</p><table v-else><thead><tr><th>Time</th><th>Wallet</th><th>Type</th><th>Amount</th><th>Reason</th></tr></thead><tbody><tr v-for="transaction in topUpWithdrawalHistory" :key="transaction.id"><td>{{formatDate(transaction.createdAt, true)}}</td><td>{{transaction.wallet}}</td><td>{{transaction.type}}</td><td>{{transaction.amount.toFixed(2)}}</td><td>{{transaction.reason}}</td></tr></tbody></table></div></section></section><section v-if="view==='trips'" class="editor-section"><div class="panel trip-orders-panel"><div class="admin-toolbar"><div><span class="eyebrow">TRIP ORDERS</span><h2>{{t('trips')}}</h2></div><div class="toolbar-actions"><input v-model="tripSearchQuery" placeholder="搜尋訂單、乘客或路線"/><select v-model="tripStatusFilter"><option value="ALL">全部狀態</option><option value="PENDING">{{translateStatus('PENDING')}}</option><option value="CONFIRMED">{{translateStatus('CONFIRMED')}}</option><option value="COMPLETED">{{translateStatus('COMPLETED')}}</option><option value="CANCELLED">{{translateStatus('CANCELLED')}}</option></select><input v-model="tripDateFilter" type="date"/><button class="secondary" @click="tripSearchQuery='';tripStatusFilter='ALL';tripDateFilter=''">清除篩選</button></div></div><p class="muted"><button v-if="canWrite" class="primary compact trip-add-order-btn" @click="resetTrip"><span aria-hidden="true">＋</span>新增行程訂單</button><span>共 {{filteredTrips.length}} 筆，按預約時間排序</span></p><form v-if="tripForm" class="record-form trip-booking-form" @submit.prevent="saveTrip"><select v-model="tripForm.userId" required><option v-for="user in users" :key="user.id" :value="user.id">{{user.name || user.phone || user.id}}</option></select><select v-model="tripForm.region" @change="handleTripRegionChange"><option value="HK">香港</option><option value="MACAU">澳門</option><option value="GUANGDONG">大陸</option></select><div class="location-field"><input v-model="tripLocationKeyword" placeholder="搜尋出發地" @keyup.enter="searchTripLocation('origin')"/><button type="button" class="secondary" @click="searchTripLocation('origin')">搜尋</button><input v-model="tripForm.origin" :placeholder="t('origin')" required readonly/><div v-if="tripLocationTarget === 'origin' && tripLocationResults.length" class="location-results"><button v-for="item in tripLocationResults" :key="item.id || item.displayAddress" type="button" @click="selectTripLocation(item)">{{item.displayAddress || item.address || item.name}}</button></div></div><div class="location-field"><input v-model="tripLocationKeyword" placeholder="搜尋目的地" @keyup.enter="searchTripLocation('destination')"/><button type="button" class="secondary" @click="searchTripLocation('destination')">搜尋</button><input v-model="tripForm.destination" :placeholder="t('destination')" required readonly/><div v-if="tripLocationTarget === 'destination' && tripLocationResults.length" class="location-results"><button v-for="item in tripLocationResults" :key="item.id || item.displayAddress" type="button" @click="selectTripLocation(item)">{{item.displayAddress || item.address || item.name}}</button></div></div><input v-model="tripForm.scheduledAt" type="datetime-local" required/><div v-if="!tripForm.id" class="booking-actions"><button type="button" class="secondary" @click="calculateTripRoute">計算路線</button><span v-if="tripForm.distanceMeters">距離 {{(tripForm.distanceMeters / 1000).toFixed(1)}} km</span><select v-model="tripForm.vehicleId" required><option value="" disabled>選擇車型</option><option v-for="vehicle in tripCatalog.data" :key="vehicle.id" :value="vehicle.id">{{(vehicle.brand ? vehicle.brand + ' ' : '') + (vehicle.model || vehicle.series || vehicle.id)}}（{{vehicle.seats}}座）</option></select><div v-if="tripCatalog.extras.length" class="trip-extras"><label v-for="extra in tripCatalog.extras" :key="extra.id"><input v-model="tripForm.extraIds" type="checkbox" :value="extra.id"/> {{extra.label}} +{{extra.price}}</label></div><button type="button" @click="prepareTripQuote">取得報價</button></div><div v-if="tripQuote" class="quote-summary"><strong>報價：{{tripQuote.total ?? tripQuote.totalAmount ?? '—'}}</strong><label><input v-model="tripUseFareBalance" type="checkbox"/> 車費錢包</label><label><input v-model="tripUseCashBalance" type="checkbox"/> 現金錢包</label><select v-model="tripPaymentMethod"><option value="sandbox">沙盒支付</option><option value="wechat">微信支付</option><option value="alipay">支付寶</option><option value="bank_card">銀行卡</option></select><button type="button" @click="completeTripBooking">確認下單</button></div><select v-if="tripForm.id" v-model="tripForm.status"><option v-for="status in ['PENDING','CONFIRMED','COMPLETED','CANCELLED']" :value="status">{{translateStatus(status)}}</option></select><button v-if="tripForm.id">{{t('saveChanges')}}</button><button type="button" class="secondary" @click="tripForm=null">{{t('cancel')}}</button></form><table><thead><tr><th>訂單／乘客</th><th>{{t('route')}}</th><th>{{t('region')}}</th><th>{{t('scheduled')}}</th><th>{{t('status')}}</th><th>{{t('actions')}}</th></tr></thead><tbody><tr v-for="trip in filteredTrips" :key="trip.id"><td><strong>{{trip.id}}</strong><br/><span class="muted">{{trip.user?.name || trip.user?.phoneNumber || '—'}}</span></td><td><b>{{trip.origin}}</b><br/><span class="muted">→ {{trip.destination}}</span></td><td>{{translateRegion(trip.region)}}</td><td>{{formatDate(trip.scheduledAt, true)}}<br/><span class="muted">建立 {{formatDate(trip.createdAt, true)}}</span></td><td><span class="status" :class="trip.status.toLowerCase()">{{translateStatus(trip.status)}}</span></td><td class="row-actions"><button class="secondary" @click="showTrip(trip)">查看詳情</button><button v-if="canWrite" @click="editTrip(trip)">{{t('edit')}}</button></td></tr><tr v-if="!filteredTrips.length"><td colspan="6" class="muted">目前沒有符合條件的行程訂單</td></tr></tbody></table></div><div v-if="selectedTrip" class="panel trip-detail-panel"><div class="admin-toolbar"><div><span class="eyebrow">ORDER DETAIL</span><h2>{{selectedTrip.id}}</h2><span class="muted">建立於 {{formatDate(selectedTrip.createdAt, true)}}</span></div><button class="secondary" @click="closeTrip">關閉</button></div><div class="trip-detail-grid"><div class="trip-detail-card"><span>乘客</span><strong>{{selectedTrip.user?.name || '未提供姓名'}}</strong><small>{{selectedTrip.user?.countryCode || ''}} {{selectedTrip.user?.phoneNumber || '未提供電話'}}</small></div><div class="trip-detail-card"><span>行程狀態</span><strong><span class="status" :class="selectedTrip.status.toLowerCase()">{{translateStatus(selectedTrip.status)}}</span></strong><small>預約 {{formatDate(selectedTrip.scheduledAt, true)}}</small></div><div class="trip-detail-card trip-route-card"><span>行程路線</span><strong>{{selectedTrip.origin}}</strong><small>↓</small><strong>{{selectedTrip.destination}}</strong><small>{{translateRegion(selectedTrip.region)}}</small></div><div class="trip-detail-card"><span>車型與距離</span><strong v-if="selectedTrip.quote?.vehicle">{{selectedTrip.quote.vehicle.brand}} {{selectedTrip.quote.vehicle.model || selectedTrip.quote.vehicle.series}}</strong><strong v-else>未記錄</strong><small v-if="selectedTrip.quote">{{selectedTrip.quote.pricing?.categoryName || '未分類'}} · {{selectedTrip.quote.distanceKm.toFixed(1)}} km</small><small v-else>舊訂單沒有報價快照</small></div><div class="trip-detail-card"><span>優惠</span><template v-if="selectedTrip.quote?.promotions?.length"><div v-for="promotion in selectedTrip.quote.promotions" :key="promotion.usageId" class="trip-promotion-entry"><strong>{{promotion.name}}</strong><small><span>{{promotionKindLabel(promotion.kind)}}</span><span v-if="promotion.couponCode">優惠碼：{{promotion.couponCode}}</span><span>狀態：{{promotion.status === 'USED' ? '已使用' : promotion.status === 'RESERVED' ? '已保留' : '已釋放'}}</span></small><small v-if="promotion.discount > 0" class="trip-discount">折抵 {{formatTripAmount(promotion.discount, promotion.currency)}}</small></div><small>優惠合計 {{formatTripAmount(selectedTrip.quote.subtotal - selectedTrip.quote.total, selectedTrip.quote.currency)}}</small></template><template v-else-if="selectedTrip.quote?.lines?.some(line => line.type === 'DISCOUNT')"><strong class="trip-discount" v-for="line in selectedTrip.quote.lines.filter(line => line.type === 'DISCOUNT')" :key="line.order">{{line.label}}</strong><small>共節省 {{formatTripAmount(selectedTrip.quote.subtotal - selectedTrip.quote.total, selectedTrip.quote.currency)}}</small></template><template v-else><strong>未使用優惠</strong><small>此訂單沒有折扣紀錄</small></template></div><div class="trip-detail-card trip-total-card"><span>訂單總額</span><strong>{{selectedTrip.quote ? formatTripAmount(selectedTrip.quote.total, selectedTrip.quote.currency) : '未記錄'}}</strong><small v-if="selectedTrip.quote">折扣前 {{formatTripAmount(selectedTrip.quote.subtotal, selectedTrip.quote.currency)}}</small><small v-else>舊訂單沒有價格快照</small></div></div><div v-if="selectedTrip.quote || selectedTrip.payment" class="trip-finance-grid"><section v-if="selectedTrip.quote" class="trip-price-panel"><div class="trip-section-heading"><div><span class="eyebrow">PRICE BREAKDOWN</span><h3>價格明細</h3></div><strong>{{formatTripAmount(selectedTrip.quote.total, selectedTrip.quote.currency)}}</strong></div><div class="trip-price-lines"><div v-for="line in selectedTrip.quote.lines" :key="line.order" class="trip-price-line" :class="{discount: line.type === 'DISCOUNT'}"><div><b>{{line.label}}</b><small v-if="line.quantity !== 1">{{line.quantity}} × {{formatTripAmount(line.unitAmount, line.currency)}}</small></div><span>{{line.type === 'DISCOUNT' ? '−' : ''}}{{formatTripAmount(Math.abs(line.totalAmount), line.currency)}}</span></div></div><div class="trip-price-summary"><span>小計 <b>{{formatTripAmount(selectedTrip.quote.subtotal, selectedTrip.quote.currency)}}</b></span><span v-if="selectedTrip.quote.subtotal !== selectedTrip.quote.total" class="discount">優惠折抵 <b>−{{formatTripAmount(selectedTrip.quote.subtotal - selectedTrip.quote.total, selectedTrip.quote.currency)}}</b></span><span class="total">實付總額 <b>{{formatTripAmount(selectedTrip.quote.total, selectedTrip.quote.currency)}}</b></span></div></section><section class="trip-payment-panel"><div class="trip-section-heading"><div><span class="eyebrow">PAYMENT</span><h3>付款明細</h3></div><span v-if="selectedTrip.payment" class="status" :class="selectedTrip.payment.status.toLowerCase()">{{selectedTrip.payment.status === 'REFUNDED' ? '已退款' : '已支付'}}</span></div><div class="trip-payment-lines"><div><span>車費錢包</span><b>{{formatTripAmount(selectedTrip.payment?.fareAmount ?? selectedTrip.fareBalancePaid, selectedTrip.quote?.currency || selectedTrip.payment?.currency)}}</b></div><div><span>現金錢包</span><b>{{formatTripAmount(selectedTrip.payment?.cashAmount ?? selectedTrip.cashBalancePaid, selectedTrip.quote?.currency || selectedTrip.payment?.currency)}}</b></div><div><span>{{(selectedTrip.payment?.externalAmount ?? selectedTrip.externalPaid) > 0 ? paymentMethodLabel(selectedTrip.payment?.externalPaymentMethod || selectedTrip.externalPaymentMethod) : '第三方支付'}}</span><b>{{formatTripAmount(selectedTrip.payment?.externalAmount ?? selectedTrip.externalPaid, selectedTrip.quote?.currency || selectedTrip.payment?.currency)}}</b></div></div><div class="trip-payment-total"><span>已支付</span><strong>{{formatTripAmount(selectedTrip.payment?.total ?? (Number(selectedTrip.fareBalancePaid || 0) + Number(selectedTrip.cashBalancePaid || 0) + Number(selectedTrip.externalPaid || 0)), selectedTrip.quote?.currency || selectedTrip.payment?.currency)}}</strong></div><small v-if="selectedTrip.payment">交易參考：{{selectedTrip.payment.externalReference || '—'}} · {{formatDate(selectedTrip.payment.createdAt, true)}}</small></section></div><div v-else class="trip-detail-empty"><strong>此訂單沒有價格與優惠紀錄</strong><span>此為資料欄位加入前建立的舊訂單；新建立的訂單會自動保存完整報價、優惠及付款明細。</span></div><div v-if="canWrite" class="trip-status-actions"><span>更新訂單狀態</span><button v-for="status in ['PENDING','CONFIRMED','COMPLETED','CANCELLED']" :key="status" :class="{active: selectedTrip.status === status}" @click="updateTripStatus(selectedTrip, status)">{{translateStatus(status)}}</button></div></div></section><section v-if="view==='charters'" class="editor-section"><form v-if="charterForm" class="record-form charter-editor" @submit.prevent="saveCharter"><select v-model="charterForm.userId"><option v-for="user in users" :key="user.id" :value="user.id">{{user.name || user.phone || user.id}}</option></select><select v-model="charterForm.originRegion"><option>香港</option><option>大陸</option><option>澳門</option></select><input v-model="charterForm.origin" :placeholder="t('origin')" required/><select v-model="charterForm.destinationRegion"><option>香港</option><option>大陸</option><option>澳門</option></select><input v-model="charterForm.destination" :placeholder="t('destination')" required/><input v-model="charterForm.scheduledAt" type="datetime-local" required/><input v-model.number="charterForm.durationHours" type="number" min="1" step="0.5" required/><select v-model="charterForm.status"><option v-for="status in ['PENDING','CONFIRMED','COMPLETED','CANCELLED']" :value="status">{{translateStatus(status)}}</option></select><button>{{t('saveChanges')}}</button><button type="button" class="secondary" @click="charterForm=null">{{t('cancel')}}</button></form><div class="panel"><table><thead><tr><th>{{t('route')}}</th><th>{{t('scheduled')}}</th><th>{{t('duration')}}</th><th>{{t('status')}}</th><th>{{t('actions')}}</th></tr></thead><tbody><tr v-for="order in charterOrders" :key="order.id"><td><b>{{order.originRegion}} · {{order.origin}}</b><br/><span class="muted">→ {{order.destinationRegion}} · {{order.destination}}</span></td><td>{{formatDate(order.scheduledAt, true)}}</td><td>{{order.durationHours}} {{t('hours')}}</td><td><select :value="order.status" @change="updateCharterStatus(order, $event.target.value)"><option v-for="status in ['PENDING','CONFIRMED','COMPLETED','CANCELLED']" :key="status" :value="status">{{translateStatus(status)}}</option></select></td><td class="row-actions"><button @click="editCharter(order)">{{t('edit')}}</button></td></tr></tbody></table></div></section><section v-if="view==='addresses'" class="panel mainland-city-management"><div class="admin-toolbar"><div><h2>大陸市級單位</h2><span class="muted">先新增市級單位，再獨立設定該市推薦地址；停用後市級入口會隱藏，但地址仍保留在大陸聚合入口</span></div><button v-if="canWrite" @click="resetMainlandCity">新增市級單位</button></div><form v-if="mainlandCityForm" class="record-form" @submit.prevent="saveMainlandCity"><input v-model="mainlandCityForm.name" placeholder="市級單位，例如深圳市" required/><input v-model.number="mainlandCityForm.order" type="number" min="0" step="1" placeholder="排序" required/><label><input v-model="mainlandCityForm.enabled" type="checkbox"/> 啟用</label><button type="submit">{{mainlandCityForm.id ? '保存修改' : '新增市級單位'}}</button><button type="button" class="secondary" @click="mainlandCityForm=null">取消</button></form><table><thead><tr><th>市級單位</th><th>排序</th><th>狀態</th><th>操作</th></tr></thead><tbody><tr v-for="city in mainlandCities" :key="city.id"><td>{{city.name}}</td><td>{{city.order}}</td><td>{{city.enabled ? '已啟用' : '已停用'}}</td><td class="row-actions"><button v-if="canWrite" @click="editMainlandCity(city)">編輯</button><button v-if="canWrite" class="danger" @click="removeMainlandCity(city)">刪除</button></td></tr></tbody></table></section><section v-if="view==='addresses'" class="address-layout"><div v-if="canWrite" class="address-search panel"><div class="address-search-controls"><select v-model="addressForm.region" @change="handleAddressRegionChange"><option>香港</option><option>大陸</option><option>澳門</option></select><select v-if="addressForm.region === '大陸'" v-model="addressForm.city" @change="handleAddressCityChange"><option value="">大陸總分類</option><option v-for="city in mainlandCities.filter(item => item.enabled)" :key="city.id" :value="city.name">{{city.name}}</option></select><input v-model="addressSearchKeyword" placeholder="搜索位置名称或关键字" @keyup.enter="searchAddressPlaces"/><button type="button" @click="searchAddressPlaces">{{addressSearching ? '搜索中…' : '搜索位置'}}</button></div><div v-if="addressSearchResults.length" class="address-search-results"><button v-for="item in addressSearchResults" :key="item.id" type="button" class="address-search-result" @click="selectAddressSearchResult(item)"><b>{{item.name}}</b><span>{{item.displayAddress || item.address}}</span></button></div><p v-else-if="addressSearchKeyword && !addressSearching" class="muted">暂无搜索结果</p></div><form v-if="canWrite" class="address-form" @submit.prevent="saveAddress"><select v-model="addressForm.region" @change="handleAddressRegionChange"><option>香港</option><option>大陸</option><option>澳門</option></select><select v-if="addressForm.region === '大陸'" v-model="addressForm.city" @change="handleAddressCityChange"><option value="">大陸總分類</option><option v-for="city in mainlandCities.filter(item => item.enabled)" :key="city.id" :value="city.name">{{city.name}}</option></select><input v-model="addressForm.name" :placeholder="t('addressName')" required/><input v-model="addressForm.address" :placeholder="t('detailedAddress')" required/><input v-model.number="addressForm.order" type="number" min="0" step="1" :placeholder="t('order')" required/><label><input v-model="addressForm.enabled" type="checkbox"/> {{t('enabled')}}</label><div><button type="submit">{{addressForm.id ? t('saveChanges') : t('save')}}</button><button v-if="addressForm.id" type="button" class="secondary" @click="resetAddress">{{t('cancel')}}</button></div></form><div class="panel"><div class="address-list-toolbar"><h2>推薦地址列表</h2><select v-model="addressRegionFilter" aria-label="篩選推薦地址地區"><option value="">全部地區</option><option value="香港">香港</option><option value="大陸">大陸總分類</option><option value="澳門">澳門</option></select><select v-if="addressRegionFilter === '大陸'" v-model="addressCityFilter" aria-label="篩選大陸城市"><option value="">全部內地城市</option><option value="__mainland__">大陸總分類</option><option v-for="city in mainlandCities" :key="city.id" :value="city.name">{{city.name}}</option></select></div><table><thead><tr><th>{{t('region')}}</th><th>歸屬</th><th>{{t('addressName')}}</th><th>{{t('detailedAddress')}}</th><th>{{t('order')}}</th><th>{{t('enabled')}}</th><th>{{t('actions')}}</th></tr></thead><tbody><tr v-for="item in filteredAddresses" :key="item.id"><td>{{item.region}}</td><td>{{item.region === '大陸' ? (item.city ? displayMainlandCity(item.city) : '大陸總分類') : item.region}}</td><td><b>{{item.name}}</b></td><td>{{item.displayAddress || item.address}}</td><td>{{item.order}}</td><td>{{item.enabled ? '' : '—'}}</td><td class="row-actions"><button v-if="canWrite" @click="editAddress(item)">{{t('edit')}}</button><button v-if="canWrite" class="danger" @click="removeAddress(item)">{{t('remove')}}</button></td></tr></tbody></table></div></section><section v-if="view==='promotions'" class="promotion-admin">
  <div class="promotion-summary">
    <article class="summary-card" :class="{ active: promotionFilterTab === 'CAMPAIGN' }" @click="promotionFilterTab = (promotionFilterTab === 'CAMPAIGN' ? 'ALL' : 'CAMPAIGN')">
      <div>
        <span>折扣活動</span>
        <strong>{{promotions.filter(item => item.kind === 'CAMPAIGN').length}}</strong>
      </div>
    </article>
    <article class="summary-card" :class="{ active: promotionFilterTab === 'COUPON' }" @click="promotionFilterTab = (promotionFilterTab === 'COUPON' ? 'ALL' : 'COUPON')">
      <div>
        <span>優惠碼</span>
        <strong>{{promotions.filter(item => item.kind === 'COUPON').length}}</strong>
      </div>
    </article>
    <article class="summary-card" :class="{ active: promotionFilterTab === 'MEMBER' }" @click="promotionFilterTab = (promotionFilterTab === 'MEMBER' ? 'ALL' : 'MEMBER')">
      <div>
        <span>會員專屬</span>
        <strong>{{promotions.filter(item => item.kind === 'MEMBER').length}}</strong>
      </div>
    </article>
  </div>

  <div class="panel">
    <div class="admin-toolbar promo-toolbar">
      <div>
        <h2>優惠功能設定</h2>
        <span class="muted">簡化設定流程，輕鬆管理折扣活動、優惠碼與會員專屬優惠</span>
      </div>
      <div class="promotion-add-actions">
        <button class="add-btn campaign-btn" @click="resetPromotion('CAMPAIGN')">＋ 新增活動</button>
        <button class="add-btn coupon-btn" @click="resetPromotion('COUPON')">＋ 新增優惠碼</button>
        <button class="add-btn member-btn" @click="resetPromotion('MEMBER')">＋ 新增會員優惠</button>
      </div>
    </div>

    <div class="promo-filter-bar">
      <div class="promo-tabs">
        <button :class="{ active: promotionFilterTab === 'ALL' }" @click="promotionFilterTab = 'ALL'">全部 ({{promotions.length}})</button>
        <button :class="{ active: promotionFilterTab === 'CAMPAIGN' }" @click="promotionFilterTab = 'CAMPAIGN'">折扣活動 ({{promotions.filter(i => i.kind === 'CAMPAIGN').length}})</button>
        <button :class="{ active: promotionFilterTab === 'COUPON' }" @click="promotionFilterTab = 'COUPON'">優惠碼 ({{promotions.filter(i => i.kind === 'COUPON').length}})</button>
        <button :class="{ active: promotionFilterTab === 'MEMBER' }" @click="promotionFilterTab = 'MEMBER'">會員專屬 ({{promotions.filter(i => i.kind === 'MEMBER').length}})</button>
        <button :class="{ active: promotionFilterTab === 'ACTIVE' }" @click="promotionFilterTab = 'ACTIVE'">已啟用 ({{promotions.filter(i => i.enabled !== false).length}})</button>
      </div>
      <div class="promo-search">
        <input v-model="promotionSearchQuery" placeholder="搜尋名稱 / 優惠碼 / 城市..." />
      </div>
    </div>

    <div v-if="promotionForm" class="promo-form-container">
      <div class="promo-form-card">
        <div class="promo-form-header">
          <div class="modal-title-group">
            <h3>{{ promotionForm.id ? '編輯優惠設定' : '建立新優惠' }}</h3>
            <span class="promo-kind-badge" :class="promotionForm.kind.toLowerCase()">{{ promotionKindLabel(promotionForm.kind) }}</span>
          </div>
          <button type="button" class="close-btn" @click="promotionForm = null">X</button>
        </div>

        <form class="promo-modal-form" @submit.prevent="savePromotion">
          <div class="form-section">
            <div class="section-title">基本設定</div>
            <div class="form-grid">
              <label class="form-group col-span-2">
                <span class="label-text">優惠名稱 <span class="required">*</span></span>
                <input v-model="promotionForm.name" placeholder="例如：春季出行88折優惠" required />
              </label>

              <label class="form-group">
                <span class="label-text">優惠類型</span>
                <select v-model="promotionForm.kind">
                  <option value="CAMPAIGN">折扣活動</option>
                  <option value="COUPON">優惠碼</option>
                  <option value="MEMBER">會員專屬</option>
                </select>
              </label>

              <label class="form-group switch-group">
                <span class="label-text">啟用狀態</span>
                <div class="toggle-wrapper">
                  <input id="promo-enabled-toggle" v-model="promotionForm.enabled" type="checkbox" class="toggle-checkbox" />
                  <label for="promo-enabled-toggle" class="toggle-label"></label>
                  <span class="toggle-text">{{ promotionForm.enabled ? '已啟用' : '已停用' }}</span>
                </div>
              </label>

              <template v-if="promotionForm.kind === 'COUPON'">
                <label class="form-group col-span-2">
                  <span class="label-text">優惠碼 (Coupon Code) <span class="required">*</span></span>
                  <div class="code-input-group">
                    <input v-model.trim="promotionForm.couponCode" class="promotion-code-input" placeholder="例如：SUMMER88" required />
                    <button type="button" class="btn-gen-code" @click="generateRandomCouponCode">隨機生成</button>
                  </div>
                </label>
                <label class="form-group">
                  <span class="label-text">使用次數上限</span>
                  <input v-model="promotionForm.usageLimit" type="number" min="1" step="1" placeholder="不限次數（選填）" />
                </label>
              </template>

              <template v-if="promotionForm.kind === 'MEMBER'">
                <label class="form-group col-span-2">
                  <span class="label-text">適用會員等級 <span class="required">*</span></span>
                  <select v-model="promotionForm.membershipLevel" required>
                    <option value="" disabled>請選擇會員等級</option>
                    <option v-for="plan in membershipPlans" :key="plan.level" :value="plan.level">{{plan.name}}（{{plan.level}}）</option>
                  </select>
                </label>
              </template>
            </div>
          </div>

          <div class="form-section">
            <div class="section-title">折扣與計價規則</div>
            <div class="form-grid">
              <label class="form-group">
                <span class="label-text">優惠方式</span>
                <select v-model="promotionForm.discountType">
                  <option value="PERCENTAGE">總金額打折（百分比）</option>
                  <option value="FIXED_AMOUNT">現金券（固定折抵金額）</option>
                  <option value="TOTAL_PRICE">折後固定總價</option>
                </select>
              </label>

              <label class="form-group">
                <span class="label-text">
                  {{promotionForm.discountType === 'PERCENTAGE' ? '折扣百分比（%）' : promotionForm.discountType === 'TOTAL_PRICE' ? '折後應付總價' : '現金券折抵金額'}} <span class="required">*</span>
                </span>
                <input v-model.number="promotionForm.discountValue" type="number" min="0.01" :max="promotionForm.discountType === 'PERCENTAGE' ? 100 : undefined" step="0.01" :placeholder="promotionForm.discountType === 'PERCENTAGE' ? '例如 10 代表減 10%' : '例如 50 代表折抵 50'" required />
              </label>

              <label class="form-group">
                <span class="label-text">計價幣別</span>
                <input :value="pricingCurrency === 'HKD' ? 'HKD$（系統定價貨幣）' : 'RMB¥（系統定價貨幣）'" readonly />
              </label>

              <label class="form-group">
                <span class="label-text">優惠組合（疊加模式）</span>
                <select v-model="promotionForm.stackingMode">
                  <option value="NONE">不可與其他優惠合併</option>
                  <option value="PERCENTAGE_AND_VOUCHER">百分比優惠＋現金券可合併</option>
                  <option value="ALL">可與所有優惠合併</option>
                </select>
              </label>

              <label class="form-group">
                <span class="label-text">優先級 (數字越小越優先)</span>
                <input v-model.number="promotionForm.priority" type="number" step="1" placeholder="預設 0" />
              </label>

              <div class="form-group col-span-full help-banner">
                <b>規則說明：</b> {{promotionDiscountHint}} {{promotionStackingHint}}
              </div>
            </div>
          </div>

          <div class="form-section">
            <div class="section-title">使用門檻與限制</div>
            <div class="form-grid">
              <label class="form-group">
                <span class="label-text">最低消費門檻</span>
                <input v-model.number="promotionForm.minimumSpend" type="number" min="0" step="0.01" placeholder="0 代表無門檻" />
              </label>

              <label class="form-group">
                <span class="label-text">最高折抵上限</span>
                <input v-model="promotionForm.maximumDiscount" type="number" min="0.01" step="0.01" placeholder="不限上限（選填）" />
              </label>
            </div>
          </div>

          <div class="form-section">
            <div class="section-title">適用路線與地區</div>
            <div class="form-grid">
              <label class="form-group">
                <span class="label-text">出發地區</span>
                <select v-model="promotionForm.originRegion">
                  <option value="">不限出發地區</option>
                  <option>香港</option>
                  <option>澳門</option>
                  <option>大陸</option>
                </select>
              </label>

              <label class="form-group">
                <span class="label-text">出發城市</span>
                <input v-model.trim="promotionForm.originCity" placeholder="指定城市（例如：深圳市）" />
              </label>

              <label class="form-group">
                <span class="label-text">目的地區</span>
                <select v-model="promotionForm.destinationRegion">
                  <option value="">不限目的地區</option>
                  <option>香港</option>
                  <option>澳門</option>
                  <option>大陸</option>
                </select>
              </label>

              <label class="form-group">
                <span class="label-text">目的城市</span>
                <input v-model.trim="promotionForm.destinationCity" placeholder="指定城市（例如：廣州市）" />
              </label>
            </div>
          </div>

          <div class="form-section">
            <div class="section-title">適用時間與週期</div>
            <div class="form-grid">
              <div class="form-group col-span-full">
                <span class="label-text">適用星期</span>
                <div class="weekday-selector">
                  <div class="weekday-presets">
                    <button type="button" class="preset-chip" @click="setWeekdaysPreset('ALL')">全選</button>
                    <button type="button" class="preset-chip" @click="setWeekdaysPreset('WORKDAYS')">工作日 (一~五)</button>
                    <button type="button" class="preset-chip" @click="setWeekdaysPreset('WEEKENDS')">週末 (六~日)</button>
                    <button type="button" class="preset-chip secondary" @click="setWeekdaysPreset('CLEAR')">清空</button>
                  </div>
                  <div class="weekday-chips">
                    <button type="button" v-for="day in [1,2,3,4,5,6,7]" :key="day"
                      class="day-chip" :class="{ selected: isWeekdaySelected(day) }"
                      @click="toggleWeekday(day)">
                      {{ ['週一','週二','週三','週四','週五','週六','週日'][day-1] }}
                    </button>
                  </div>
                </div>
              </div>

              <label class="form-group">
                <span class="label-text">每日開始時間</span>
                <input v-model="promotionForm.timeStart" type="time" />
              </label>

              <label class="form-group">
                <span class="label-text">每日結束時間</span>
                <input v-model="promotionForm.timeEnd" type="time" />
              </label>

              <label class="form-group">
                <span class="label-text">活動開始日期時間</span>
                <input v-model="promotionForm.startsAt" type="datetime-local" />
              </label>

              <label class="form-group">
                <span class="label-text">活動結束日期時間</span>
                <input v-model="promotionForm.endsAt" type="datetime-local" />
              </label>
            </div>
          </div>

          <div class="promo-modal-actions">
            <button type="button" class="btn-cancel" @click="promotionForm = null">取消</button>
            <button type="submit" class="btn-save">儲存優惠設定</button>
          </div>
        </form>
      </div>
    </div>

    <div class="promo-table-wrapper">
      <table>
        <thead>
          <tr>
            <th>優惠名稱 / 類型</th>
            <th>折扣內容</th>
            <th>使用條件 & 路線</th>
            <th>適用時間與週期</th>
            <th>啟用狀態</th>
            <th style="text-align: right;">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!filteredPromotions.length">
            <td colspan="6" class="muted promotion-empty">
              {{ promotionSearchQuery ? '查無符合條件的優惠' : '尚未建立優惠' }}
            </td>
          </tr>
          <tr v-for="item in filteredPromotions" :key="item.id" :class="{ disabled: !item.enabled }">
            <td>
              <div class="promo-name-cell">
                <strong class="promo-title">{{item.name}}</strong>
                <div class="promo-tags">
                  <span class="kind-tag" :class="item.kind.toLowerCase()">{{promotionKindLabel(item.kind)}}</span>
                  <span v-if="item.couponCode" class="code-tag">{{item.couponCode}}</span>
                  <span v-if="item.membershipLevel" class="member-tag">{{item.membershipLevel}}</span>
                  <span v-if="item.priority" class="priority-tag">優先級: {{item.priority}}</span>
                </div>
              </div>
            </td>
            <td>
              <div class="discount-cell">
                <strong class="discount-val">{{promotionDiscountLabel(item)}}</strong>
                <span v-if="item.maximumDiscount" class="muted-info">最高折抵 {{item.currency}}{{item.maximumDiscount}}</span>
                <span v-if="item.stackingMode !== 'NONE'" class="stacking-badge">可疊加</span>
              </div>
            </td>
            <td>
              <div class="condition-cell">
                <div><span>最低門檻:</span> <strong>{{ item.minimumSpend > 0 ? (item.currency + item.minimumSpend) : '無門檻' }}</strong></div>
                <div class="muted-info">
                  <span v-if="item.usageLimit">使用數: {{item.usageCount || 0}} / {{item.usageLimit}} 次</span>
                  <span v-else>使用數: {{item.usageCount || 0}} 次 (不限次)</span>
                </div>
                <div class="route-tag">{{ formatRouteText(item) }}</div>
              </div>
            </td>
            <td>
              <div class="validity-cell">
                <div class="weekday-summary">{{ formatWeekdaysText(item.weekdays) }}</div>
                <div v-if="formatTimeRangeText(item)" class="time-summary">{{ formatTimeRangeText(item) }}</div>
                <div class="date-range muted-info">
                  {{item.startsAt ? formatDate(item.startsAt, true) : '即日起'}} ~ {{item.endsAt ? formatDate(item.endsAt, true) : '長期'}}
                </div>
              </div>
            </td>
            <td>
              <button type="button" class="status-toggle-btn" :class="item.enabled ? 'is-active' : 'is-inactive'" @click="togglePromotionEnabled(item)" title="點擊快速切換狀態">
                <span class="status-dot"></span>
                {{item.enabled ? '已啟用' : '已停用'}}
              </button>
            </td>
            <td class="row-actions" style="text-align: right;">
              <button type="button" class="action-btn edit-btn" @click="editPromotion(item)">編輯</button>
              <button type="button" class="action-btn clone-btn" @click="duplicatePromotion(item)">複製</button>
              <button type="button" class="action-btn danger-btn" @click="removePromotion(item)">刪除</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</section><section v-if="view==='route-pricing'" class="editor-section"><div class="panel"><div class="admin-toolbar"><div><h2>路線最低價</h2><p class="muted">在原有距離計價結果上設定出發地到目的地的最低車資（使用目前定價貨幣）。</p></div><button v-if="canWrite" @click="resetRouteMinimumFare">新增規則</button></div><form v-if="routeMinimumFareForm" class="record-form" @submit.prevent="saveRouteMinimumFare"><select v-model="routeMinimumFareForm.originRegion" required><option>香港</option><option>澳門</option><option>大陸</option></select><input v-model="routeMinimumFareForm.originCity" placeholder="出發城市（留空代表全部）"/><select v-model="routeMinimumFareForm.destinationRegion" required><option>香港</option><option>澳門</option><option>大陸</option></select><input v-model="routeMinimumFareForm.destinationCity" placeholder="目的城市（留空代表全部）"/><select v-model="routeMinimumFareForm.categoryId"><option value="">所有車種</option><option v-for="category in categories" :key="category.id" :value="category.id">{{category.name}}</option></select><input v-model.number="routeMinimumFareForm.minimumFare" type="number" min="0" step="0.01" placeholder="最低金額" required/><input :value="pricingCurrency === 'HKD' ? 'HKD$（系統定價貨幣）' : 'RMB¥（系統定價貨幣）'" readonly/><label><input v-model="routeMinimumFareForm.enabled" type="checkbox"/> 啟用</label><button>{{routeMinimumFareForm.id ? '保存修改' : '新增規則'}}</button><button type="button" class="secondary" @click="routeMinimumFareForm=null">取消</button></form><table><thead><tr><th>路線</th><th>車種</th><th>最低金額</th><th>狀態</th><th>操作</th></tr></thead><tbody><tr v-for="item in routeMinimumFares" :key="item.id"><td>{{item.originRegion}}{{item.originCity ? ' · '+item.originCity : ''}} → {{item.destinationRegion}}{{item.destinationCity ? ' · '+item.destinationCity : ''}}</td><td>{{categories.find(category => category.id === item.categoryId)?.name || '所有車種'}}</td><td>{{item.currency}}{{item.minimumFare.toFixed(2)}}</td><td>{{item.enabled ? '啟用' : '停用'}}</td><td class="row-actions"><button v-if="canWrite" @click="editRouteMinimumFare(item)">編輯</button><button v-if="canWrite" @click="removeRouteMinimumFare(item)">刪除</button></td></tr></tbody></table></div></section><section v-if="view==='membership'" class="editor-section"><div class="panel"><div class="admin-toolbar"><h2>會員方案</h2><button @click="resetMembership">新增方案</button></div><form v-if="membershipForm" class="record-form" @submit.prevent="saveMembership"><input v-model="membershipForm.id" placeholder="方案 ID" required/><input v-model="membershipForm.level" placeholder="等級" required/><input v-model="membershipForm.name" placeholder="方案名稱" required/><input v-model.number="membershipForm.monthly" type="number" min="0" placeholder="月付"/><input v-model.number="membershipForm.yearly" type="number" min="0" placeholder="年付"/><input v-model.number="membershipForm.order" type="number" min="1" placeholder="排序"/><textarea v-model="membershipForm.benefits" placeholder="權益（每行一項）"></textarea><label><input v-model="membershipForm.recommended" type="checkbox"/> 推薦</label><label><input v-model="membershipForm.enabled" type="checkbox"/> 啟用</label><button>儲存</button><button type="button" class="secondary" @click="membershipForm=null">取消</button></form><table><thead><tr><th>ID</th><th>方案</th><th>月付</th><th>年付</th><th>權益</th><th>操作</th></tr></thead><tbody><tr v-for="item in membershipPlans" :key="item.id"><td>{{item.id}}</td><td><b>{{item.name}}</b><br/><span class="muted">{{item.level}}</span></td><td>HKD {{item.monthly}}</td><td>HKD {{item.yearly}}</td><td>{{formatBenefits(item)}}</td><td class="row-actions"><button @click="editMembership(item)">編輯</button><button class="danger" @click="removeMembership(item)">刪除</button></td></tr></tbody></table></div></section><section v-if="view==='vehicles'" class="vehicle-admin"><nav class="vehicle-tabs" aria-label="車型設定分類"><button type="button" :class="{active: vehicleTab==='catalog'}" @click="vehicleTab='catalog'">車型資料</button><button type="button" :class="{active: vehicleTab==='pricing'}" @click="vehicleTab='pricing'">距離定價</button><button type="button" :class="{active: vehicleTab==='extras'}" @click="vehicleTab='extras'">額外選擇</button></nav><div v-show="vehicleTab==='pricing'" class="panel currency-switcher"><div><h2>指定定價貨幣</h2><span class="muted">所有價格設定使用此貨幣定義；結算貨幣仍由結算流程獨立處理，匯率不會改寫價格</span></div><div class="currency-switcher-actions"><select v-model="pricingCurrency"><option value="RMB">人民幣 RMB¥</option><option value="HKD">港幣 HKD$</option></select><button @click="switchPricingCurrency">套用定價貨幣</button></div></div><div v-for="pricing in distancePricing" :key="pricing.categoryId" class="panel"><div class="admin-toolbar"><h2>{{pricing.category.name}}（{{pricing.category.tabLabel}}）· 按距離收費</h2><button @click="addPricingTier(pricing)">新增價格區間</button></div><form class="pricing-form" @submit.prevent="saveDistancePricing(pricing)"><div class="pricing-settings"><label>最低收費 <input v-model.number="pricing.minimumFare" type="number" min="0" step="0.01" required/></label><label>幣別 <input :value="pricingCurrency === 'HKD' ? 'HKD$（系統統一）' : 'RMB¥（系統統一）'" readonly/></label></div><table><thead><tr><th>起始公里</th><th>結束公里</th><th>每公里收費</th><th>操作</th></tr></thead><tbody><tr v-for="(tier,index) in pricing.tiers" :key="tier.id"><td><input v-model.number="tier.fromKm" type="number" min="0" step="0.01" required @change="syncPreviousTier(pricing,index)"/></td><td><input v-if="index < pricing.tiers.length-1" v-model.number="tier.toKm" type="number" :min="tier.fromKm" step="0.01" required @change="syncNextTier(pricing,index)"/><span v-else>以上（無上限）</span></td><td><input v-model.number="tier.pricePerKm" type="number" min="0" step="0.01" required/></td><td class="row-actions"><button v-if="pricing.tiers.length>1" type="button" class="danger" @click="removePricingTier(pricing,index)">刪除</button></td></tr></tbody></table><div class="pricing-actions"><button type="submit">儲存此車型收費</button><span class="muted">價格按區間累進計算，最終金額不低於最低收費。</span></div></form></div><div class="panel"><div class="admin-toolbar"><h2>車型類別</h2><button @click="resetCategory">新增類別</button></div><form v-if="categoryForm" class="record-form" @submit.prevent="saveCategory"><input v-model="categoryForm.id" placeholder="類別 ID" required/><input v-model="categoryForm.name" placeholder="卡片標題" required/><input v-model="categoryForm.tabLabel" placeholder="分頁標籤" required/><input v-model.number="categoryForm.order" type="number" min="1" placeholder="排序"/><label><input v-model="categoryForm.enabled" type="checkbox"/> 開啟</label><button>儲存</button><button type="button" class="secondary" @click="categoryForm=null">取消</button></form><table><thead><tr><th>ID</th><th>卡片標題</th><th>分頁標籤</th><th>排序</th><th>狀態</th><th>操作</th></tr></thead><tbody><tr v-for="item in categories" :key="item.id"><td>{{item.id}}</td><td>{{item.name}}</td><td>{{item.tabLabel}}</td><td>{{item.order}}</td><td><span class="status" :class="item.enabled ? 'completed' : 'cancelled'">{{item.enabled ? '已開啟' : '已關閉'}}</span></td><td class="row-actions"><button @click="editCategory(item)">編輯</button><button class="secondary" @click="toggleCategory(item)">{{item.enabled ? '關閉' : '開啟'}}</button><button class="danger" @click="removeCategory(item)">刪除</button></td></tr></tbody></table></div><div class="panel"><div class="admin-toolbar"><h2>車型資料</h2><button @click="resetVehicle">新增車型</button></div><form v-if="vehicleForm" class="record-form vehicle-record-form" @submit.prevent="saveVehicle"><input v-model="vehicleForm.id" placeholder="車型 ID" required/><select v-model="vehicleForm.categoryId"><option :value="null">未分類</option><option v-for="item in categories" :value="item.id">{{item.name}}{{item.enabled ? '' : '（已關閉）'}}</option></select><input v-model="vehicleForm.brand" placeholder="品牌文字"/><input v-model="vehicleForm.model" placeholder="車型文字" required/><input v-model="vehicleForm.series" placeholder="系列標籤"/><input v-model.number="vehicleForm.seats" type="number" min="1" placeholder="座位"/><input v-model="vehicleForm.image" placeholder="圖片 URL" required/><input v-model="vehicleForm.colorLabel" placeholder="顏色標籤"/><input v-model="vehicleForm.modelChoiceLabel" placeholder="車款標籤"/><button>儲存</button><button type="button" class="secondary" @click="vehicleForm=null">取消</button></form><table><thead><tr><th>車型</th><th>圖片</th><th>座位</th><th>狀態</th><th>操作</th></tr></thead><tbody><tr v-for="item in vehicles" :key="item.id"><td><b>{{item.brand}} {{item.model}} {{item.series}}</b><br/><span class="muted">{{item.colorLabel}} · {{item.modelChoiceLabel}}</span></td><td><img class="vehicle-thumb" :src="item.image" alt=""/></td><td>{{item.seats}}</td><td><span class="status" :class="item.enabled ? 'completed' : 'cancelled'">{{item.enabled ? '已開啟' : '已關閉'}}</span></td><td class="row-actions"><button @click="editVehicle(item)">編輯</button><button class="secondary" @click="toggleVehicle(item)">{{item.enabled ? '關閉' : '開啟'}}</button><button class="danger" @click="removeVehicle(item)">刪除</button></td></tr></tbody></table></div><div class="panel extra-settings"><div class="admin-toolbar"><div><span class="eyebrow">EXTRA OPTIONS</span><h2>額外選擇與觸發條件</h2><p class="muted">先選擇分類，再設定費用與觸發條件；符合條件時會自動加入報價。</p></div><button @click="resetExtra">新增額外選擇</button></div><div class="trigger-cards"><article v-for="type in ['IMMEDIATE','NIGHT','WEATHER']" :key="type" class="trigger-card" :class="{active: isTriggerActive(type)}"><div class="trigger-card-head"><div><span class="trigger-kicker">{{type==='IMMEDIATE' ? 'TIME WINDOW' : type==='NIGHT' ? 'NIGHT SURCHARGE' : 'WEATHER CONTROL'}}</span><h3>{{type==='IMMEDIATE' ? '即時訂單' : type==='NIGHT' ? '深夜加班費' : '惡劣天氣'}}</h3></div><span class="status" :class="{completed: isTriggerActive(type), cancelled: !isTriggerActive(type)}">{{isTriggerActive(type) ? '已啟用' : '未啟用'}}</span></div><p>{{type==='IMMEDIATE' ? '出發前指定時間內自動列為必選。' : type==='NIGHT' ? '依香港時間的出發時間自動加收。' : '由管理員手動開關，暫不依賴外部天氣 API。'}}</p><button class="card-action" @click="editExtra(extras.find(item => (item.triggerType || (item.requiredForImmediate ? 'IMMEDIATE' : 'NONE')) === type) || {id:type==='IMMEDIATE'?'instant-order':type==='NIGHT'?'night-surcharge':'severe-weather',label:type==='IMMEDIATE'?'即時訂單':type==='NIGHT'?'深夜加班費':'惡劣天氣費',price:0,currency:'RMB¥',triggerType:type,triggerEnabled:true,requiredWithinMinutes:60,nightStartTime:'22:00',nightEndTime:'06:00'})">設定條件</button></article></div><div v-if="extraForm" class="extra-editor"><div class="editor-heading"><div><h3>{{triggerLabel(extraForm)}}</h3><span class="muted">設定費用、顯示名稱與觸發方式</span></div><button type="button" class="secondary" @click="extraForm=null">取消</button></div><form class="record-form" @submit.prevent="saveExtra"><label>選項 ID<input v-model="extraForm.id" placeholder="例如 instant-order" required/></label><label>顯示文字<input v-model="extraForm.label" placeholder="顯示文字" required/></label><label>費用<input v-model.number="extraForm.price" type="number" min="0" step="0.01" required/></label><label>幣別<input v-model="extraForm.currency" placeholder="RMB¥" required/></label><label>觸發分類<select v-model="extraForm.triggerType"><option value="NONE">一般額外選擇</option><option value="IMMEDIATE">即時訂單</option><option value="NIGHT">深夜加班費</option><option value="WEATHER">惡劣天氣</option></select></label><label class="check-field"><input v-model="extraForm.enabled" type="checkbox"/> 顯示於用戶端</label><label class="check-field"><input v-model="extraForm.triggerEnabled" type="checkbox"/> 啟用此條件</label><label v-if="extraForm.triggerType==='IMMEDIATE'">出發前分鐘數<input v-model.number="extraForm.requiredWithinMinutes" type="number" min="1" max="1440" required/></label><template v-if="extraForm.triggerType==='NIGHT'"><label>開始時間<select v-model="extraForm.nightStartTime" required><option v-for="time in timeOptions" :key="'start-' + time" :value="time">{{time}}</option></select></label><label>結束時間<select v-model="extraForm.nightEndTime" required><option v-for="time in timeOptions" :key="'end-' + time" :value="time">{{time}}</option></select></label></template><label v-if="extraForm.triggerType==='WEATHER'" class="check-field"><input v-model="severeWeatherEnabled" type="checkbox"/> 全站啟用惡劣天氣費</label><button type="submit">儲存設定</button></form></div><div class="extra-table"><div class="table-heading"><h3>所有額外選項</h3><span class="muted">{{extras.length}} 個選項</span></div><table><thead><tr><th>選項</th><th>費用</th><th>分類</th><th>條件</th><th>狀態</th><th>操作</th></tr></thead><tbody><tr v-for="item in extras" :key="item.id"><td><b>{{item.label}}</b><span class="table-subtitle">{{item.id}}</span></td><td>{{item.currency}}{{item.price}}</td><td><span class="rule-chip">{{triggerLabel(item)}}</span></td><td>{{triggerSummary(item)}}</td><td><span class="status" :class="item.triggerEnabled === false ? 'cancelled' : 'completed'">{{item.triggerEnabled === false ? '停用' : '啟用'}}</span></td><td class="row-actions"><button @click="editExtra(item)">編輯</button><button v-if="item.enabled !== false" @click="showOnlyExtra(item)">只顯示此項</button><button class="danger" @click="removeExtra(item)">刪除</button></td></tr></tbody></table></div></div></section><section v-if="view==='administrators'" class="editor-section"><div class="panel"><div class="admin-toolbar"><h2>{{t('administrators')}}</h2><button @click="resetAdministrator">新增管理員</button></div><form v-if="administratorForm" class="record-form" @submit.prevent="saveAdministrator"><input v-model="administratorForm.username" placeholder="登入帳號" required/><input v-model="administratorForm.displayName" placeholder="顯示名稱" required/><select v-model="administratorForm.role"><option value="SUPER_ADMIN">超級管理員</option><option value="OPERATOR">營運管理員</option><option value="VIEWER">唯讀使用者</option></select><input v-model="administratorForm.password" type="password" :required="!administratorForm.id" :placeholder="administratorForm.id ? '留空即不修改密碼' : '密碼至少 8 字元'"/><label><input v-model="administratorForm.enabled" type="checkbox"/> 啟用</label><button>儲存</button><button type="button" class="secondary" @click="administratorForm=null">取消</button></form><table><thead><tr><th>帳號</th><th>名稱</th><th>角色</th><th>狀態</th><th>最後登入</th><th>操作</th></tr></thead><tbody><tr v-for="item in administrators" :key="item.id"><td>{{item.username}}</td><td>{{item.displayName}}</td><td>{{item.role}}</td><td><span class="status" :class="item.enabled ? 'completed' : 'cancelled'">{{item.enabled ? '已啟用' : '已停用'}}</span></td><td>{{item.lastLoginAt ? formatDate(item.lastLoginAt,true) : '—'}}</td><td class="row-actions"><button @click="editAdministrator(item)">編輯</button><button v-if="item.enabled && item.id !== currentAdministrator.id" class="danger" @click="disableAdministrator(item)">停用</button></td></tr></tbody></table></div></section><section v-if="view==='auditLogs'" class="panel"><table><thead><tr><th>時間</th><th>管理員</th><th>操作</th><th>結果</th><th>IP</th></tr></thead><tbody><tr v-for="item in auditLogs" :key="item.id"><td>{{formatDate(item.createdAt,true)}}</td><td>{{item.username}}</td><td><b>{{item.action}}</b><br/><span class="muted">{{item.resource}}</span></td><td><span class="status" :class="item.status === 'SUCCESS' ? 'completed' : 'cancelled'">{{item.status}}</span></td><td>{{item.ip || '—'}}</td></tr></tbody></table></section><section v-if="view==='payments'" class="payment-settings-admin panel">
  <div class="payment-settings-header">
    <span class="eyebrow">PAYMENT GATEWAYS & WALLET</span>
    <h2>{{t('paymentSettings')}}</h2>
    <p class="section-desc">{{t('paymentSettingsDesc')}}</p>
  </div>

  <div class="payment-grid">
    <div class="payment-group-card">
      <div class="payment-group-header">
        <h3>{{t('walletPaymentGroup')}}</h3>
        <span class="badge-internal">{{t('internalBadge')}}</span>
      </div>
      <div class="payment-item-row">
        <div class="payment-item-info">
          <strong>{{t('fareBalancePay')}}</strong>
          <span>{{t('fareBalancePayHint')}}</span>
        </div>
        <label class="switch">
          <input type="checkbox" v-model="paymentSettings.fareBalancePayEnabled" :disabled="!canWrite">
          <span class="slider"></span>
        </label>
      </div>
      <div class="payment-item-row">
        <div class="payment-item-info">
          <strong>{{t('cashBalancePay')}}</strong>
          <span>{{t('cashBalancePayHint')}}</span>
        </div>
        <label class="switch">
          <input type="checkbox" v-model="paymentSettings.cashBalancePayEnabled" :disabled="!canWrite">
          <span class="slider"></span>
        </label>
      </div>
    </div>

    <div class="payment-group-card">
      <div class="payment-group-header">
        <h3>{{t('externalPaymentGroup')}}</h3>
        <span class="badge-external">{{t('externalBadge')}}</span>
      </div>
      <div class="payment-item-row">
        <div class="payment-item-info">
          <strong>{{t('wechatPay')}}</strong>
          <span>{{t('wechatPayHint')}}</span>
        </div>
        <label class="switch">
          <input type="checkbox" v-model="paymentSettings.wechatPayEnabled" :disabled="!canWrite">
          <span class="slider"></span>
        </label>
      </div>
      <div class="payment-item-row">
        <div class="payment-item-info">
          <strong>{{t('alipayPay')}}</strong>
          <span>{{t('alipayPayHint')}}</span>
        </div>
        <label class="switch">
          <input type="checkbox" v-model="paymentSettings.alipayPayEnabled" :disabled="!canWrite">
          <span class="slider"></span>
        </label>
      </div>
      <div class="payment-item-row">
        <div class="payment-item-info">
          <strong>{{t('bankCardPay')}}</strong>
          <span>{{t('bankCardPayHint')}}</span>
        </div>
        <label class="switch">
          <input type="checkbox" v-model="paymentSettings.bankCardPayEnabled" :disabled="!canWrite">
          <span class="slider"></span>
        </label>
      </div>
    </div>

    <div class="payment-group-card">
      <div class="payment-group-header">
        <h3>{{t('envModeGroup')}}</h3>
        <span class="badge-env">{{ paymentSettings.sandboxMode ? t('sandboxBadge') : t('productionBadge') }}</span>
      </div>
      <div class="payment-item-row">
        <div class="payment-item-info">
          <strong>{{t('sandboxMode')}}</strong>
          <span>{{t('sandboxModeHint')}}</span>
        </div>
        <label class="switch">
          <input type="checkbox" v-model="paymentSettings.sandboxMode" :disabled="!canWrite">
          <span class="slider"></span>
        </label>
      </div>
    </div>
  </div>

  <div class="payment-save-bar">
    <button class="primary" :disabled="!canWrite" @click="savePaymentSettings">{{t('savePaymentSettings')}}</button>
    <span v-if="paymentSettingsSaved" class="success-hint"> {{t('paymentSavedSuccess')}}</span>
  </div>
</section><div v-if="loading" class="loading">{{t('loading')}}</div></main></div>` }
const mountExtraSortControls = () => {
  const appRoot = document.querySelector('#app')
  if (!appRoot) return
  const render = () => {
    const heading = [...appRoot.querySelectorAll('h3')].find(item => item.textContent?.includes('所有額外選項'))
    if (!heading || !extras.value.length) return
    const parent = heading.parentElement
    let controls = parent?.querySelector('[data-extra-sort-controls]')
    if (!controls) {
      controls = document.createElement('div')
      controls.dataset.extraSortControls = 'true'
      controls.className = 'extra-sort-toolbar'
      controls.innerHTML = '<div class="extra-sort-copy"><strong>用戶端顯示順序</strong><span>選擇項目後調整前台顯示位置</span></div><div class="extra-sort-actions"><select data-extra-sort-select aria-label="選擇要排序的額外選項"></select><button type="button" class="secondary" data-extra-sort-up>↑ 上移</button><button type="button" data-extra-sort-down>↓ 下移</button></div>'
      parent?.append(controls)
    }
    const select = controls.querySelector('[data-extra-sort-select]')
    const selectedId = select?.value
    if (select) {
      const optionsHtml = extras.value.map((extra, index) => `<option value="${extra.id}">${index + 1}. ${extra.label}</option>`).join('')
      if (select.innerHTML !== optionsHtml) select.innerHTML = optionsHtml
      if (selectedId && extras.value.some(extra => extra.id === selectedId)) select.value = selectedId
    }
    if (controls.dataset.bound === 'true') return
    controls.dataset.bound = 'true'
    const move = async (direction) => {
      const selectedId = controls.querySelector('[data-extra-sort-select]')?.value
      const selected = extras.value.find(extra => extra.id === selectedId)
      if (!selected) return
      const index = extras.value.findIndex(extra => extra.id === selected.id)
      const target = index + direction
      if (target < 0 || target >= extras.value.length) return
      const reordered = [...extras.value]
      const [item] = reordered.splice(index, 1)
      reordered.splice(target, 0, item)
      await Promise.all(reordered.map((extra, order) => api('/admin/vehicle-extras', { method: 'POST', body: JSON.stringify({ ...extra, order: order + 1 }) })))
      await load()
    }
    controls.querySelector('[data-extra-sort-up]')?.addEventListener('click', () => void move(-1))
    controls.querySelector('[data-extra-sort-down]')?.addEventListener('click', () => void move(1))
  }
  new MutationObserver(render).observe(appRoot, { childList: true, subtree: true })
  render()
}
const mountVehicleTabPanels = () => {
  const appRoot = document.querySelector('#app')
  if (!appRoot) return
  const sync = () => {
    const section = [...appRoot.querySelectorAll('.vehicle-admin')].find(item => item.querySelector('.vehicle-tabs'))
    if (!section) return
    const panels = [...section.querySelectorAll(':scope > .panel')]
    panels.forEach(panel => {
      const text = panel.textContent || ''
      const group = panel.classList.contains('currency-switcher') || text.includes('按距離收費')
        ? 'pricing'
        : text.includes('額外選擇與觸發條件') || text.includes('EXTRA OPTIONS')
          ? 'extras'
          : 'catalog'
      panel.hidden = group !== vehicleTab.value
    })
  }
  watch(vehicleTab, sync)
  new MutationObserver(sync).observe(appRoot, { childList: true, subtree: true })
  sync()
}
const mountVehicleSidebar = () => {
  const nav = document.querySelector('nav')
  if (!nav || nav.querySelector('[data-vehicle-sidebar]')) return
  const vehicleButton = [...nav.querySelectorAll('button')].find(button => button.textContent?.includes('車型設定'))
  const routePricingButton = [...nav.querySelectorAll('button')].find(button => button.textContent?.includes('路線最低價'))
  if (!vehicleButton || !routePricingButton) return

  const group = document.createElement('div')
  group.dataset.vehicleSidebar = 'true'
  group.className = 'nav-group'
  group.innerHTML = '<button type="button" class="nav-group-toggle" aria-expanded="true">車型與定價 <span>⌄</span></button><div class="nav-group-items"><button type="button" data-vehicle-tab="catalog">車型資料</button><button type="button" data-vehicle-tab="pricing">車型定價</button><button type="button" data-vehicle-tab="extras">額外服務</button><button type="button" data-vehicle-tab="route-pricing">路線最低價</button></div>'
  vehicleButton.hidden = true
  routePricingButton.hidden = true
  nav.insertBefore(group, vehicleButton)

  const toggle = group.querySelector('.nav-group-toggle')
  const items = group.querySelector('.nav-group-items')
  toggle?.addEventListener('click', () => {
    const expanded = group.dataset.expanded !== 'false'
    group.dataset.expanded = String(!expanded)
    if (toggle) toggle.setAttribute('aria-expanded', String(!expanded))
    if (items) items.hidden = expanded
  })
  group.querySelectorAll('[data-vehicle-tab]').forEach(button => {
    button.addEventListener('click', () => {
      const tab = button.dataset.vehicleTab
      if (tab === 'route-pricing') {
        view.value = 'route-pricing'
      } else {
        view.value = 'vehicles'
        vehicleTab.value = tab
      }
      load()
    })
  })

  const sync = () => {
    const active = view.value === 'route-pricing' ? 'route-pricing' : view.value === 'vehicles' ? vehicleTab.value : ''
    group.querySelectorAll('[data-vehicle-tab]').forEach(button => {
      button.classList.toggle('active', button.dataset.vehicleTab === active)
    })
    toggle?.classList.toggle('active', Boolean(active))
  }
  watch([view, vehicleTab], sync)
  sync()
}
const app = createApp(App)
app.config.globalProperties.saveExtra = saveExtra
app.mount('#app')
mountExtraSortControls()
mountVehicleTabPanels()
mountVehicleSidebar()
