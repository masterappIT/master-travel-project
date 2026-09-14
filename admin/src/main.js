import { createApp, ref, computed, nextTick, onMounted, onBeforeUnmount, watch, provide } from 'vue'
import { createApiClient } from './api/client'
import { createUsersApi } from './api/users.js'
import { createDriversApi } from './api/drivers.js'
import { createTripsApi } from './api/trips.js'
import { createAddressesApi } from './api/addresses.js'
import { LoadingState, ErrorState, EmptyState, ToastHost, ConfirmDialog } from './components/index.js'
import { sortByOrder, currencyLabel, formatOrderNumber, displayMainlandCity, apiMainlandCity, displayPlaceName } from './utils/formatters.js'
import { promotionKindLabel, promotionDiscountLabel } from './utils/promotions.js'
import { filterStoredDrivers } from './utils/drivers.js'
import { primaryNavigation, operationsNavigation, createNavigationController } from './layout/index.js'
import { createUsersPageState } from './pages/users/users.state.js'
import { createUsersActions } from './pages/users/users.actions.js'
import { UsersPage } from './pages/users/UsersPage.js'
import { DriversPage } from './pages/drivers/DriversPage.js'
import { createDriversPageState } from './pages/drivers/drivers.state.js'
import { createDriversActions } from './pages/drivers/drivers.actions.js'
import { TripsPage } from './pages/trips/TripsPage.js'
import { createTripsPageState } from './pages/trips/trips.state.js'
import { createTripsActions } from './pages/trips/trips.actions.js'
import { AddressesPage } from './pages/addresses/AddressesPage.js'
import { createAddressesPageState } from './pages/addresses/addresses.state.js'
import { createAddressesActions } from './pages/addresses/addresses.actions.js'
import { createPromotionsPageState } from './pages/promotions/promotions.state.js'
import { createPromotionsActions } from './pages/promotions/promotions.actions.js'
import { PromotionsPage } from './pages/promotions/PromotionsPage.js'
import { MembershipPage } from './pages/membership/MembershipPage.js'
import { createMembershipActions } from './pages/membership/membership.actions.js'
import { RoutePricingPage } from './pages/route-pricing/RoutePricingPage.js'
import { createRoutePricingActions } from './pages/route-pricing/route-pricing.actions.js'
import { VehiclesPage } from './pages/vehicles/VehiclesPage.js'
import { createVehiclesPageState } from './pages/vehicles/vehicles.state.js'
import { createVehiclesActions } from './pages/vehicles/vehicles.actions.js'
import { createPaymentsPageState } from './pages/payments/payments.state.js'
import { PaymentsPage } from './pages/payments/PaymentsPage.js'
import { createPaymentsActions } from './pages/payments/payments.actions.js'
import { AuditLogsPage } from './pages/audit-logs/AuditLogsPage.js'
import { AdministratorsPage } from './pages/administrators/AdministratorsPage.js'
import { createAdministratorsActions } from './pages/administrators/administrators.actions.js'
import { NotificationsPage } from './pages/notifications/NotificationsPage.js'
import { createNotificationsPageState } from './pages/notifications/notifications.state.js'
import { createNotificationsActions } from './pages/notifications/notifications.actions.js'
import { OperationsPage } from './pages/operations/OperationsPage.js'
import { createOperationsPageState } from './pages/operations/operations.state.js'
import { createOperationsActions } from './pages/operations/operations.actions.js'
import './style.css'

const API = import.meta.env.VITE_API_URL || '/api'
const token = ref(import.meta.env.DEV ? 'dev-bypass' : (localStorage.getItem('admin_token') || ''))
const locale = ref(localStorage.getItem('admin_locale') || 'en')
const view = ref('dashboard')
const mobileNavOpen = ref(false)
const vehiclesPageState = createVehiclesPageState()
const vehicleTab = vehiclesPageState.tab
const extraSortId = vehiclesPageState.extraSortId
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
const promotionSaving = ref(false)
const promotionDeletingId = ref('')
const promotionTogglingId = ref('')
const toasts = ref([])
const confirmDialog = ref({ open: false, title: '', message: '', confirmLabel: '確認', danger: false, action: null })
let toastId = 0
function dismissToast(id) { toasts.value = toasts.value.filter(item => item.id !== id) }
function notify(message, type = 'success') {
  const id = ++toastId
  toasts.value.push({ id, message, type })
  window.setTimeout(() => dismissToast(id), 4000)
}
function requestConfirmation({ title = '確認操作', message, confirmLabel = '確認', danger = false }) {
  return new Promise(resolve => {
    confirmDialog.value = { open: true, title, message, confirmLabel, danger, action: resolve }
  })
}
function resolveConfirmation(confirmed) {
  const resolve = confirmDialog.value.action
  confirmDialog.value = { open: false, title: '', message: '', confirmLabel: '確認', danger: false, action: null }
  resolve?.(confirmed)
}
const membershipForm = ref(null)
const categoryForm = ref(null)
const vehicleForm = ref(null)
const extraForm = ref(null)
const paymentSettings = ref({
  driverRaceEnabled: false,
  fareBalancePayEnabled: true,
  cashBalancePayEnabled: true,
  wechatPayEnabled: true,
  alipayPayEnabled: true,
  bankCardPayEnabled: true,
  sandboxMode: false
})
const paymentsPageState = createPaymentsPageState()
const paymentSettingsSaved = paymentsPageState.saved
const driverRaceSaving = paymentsPageState.raceSaving
const notifications = ref([])
const notificationForm = ref(null)
const notificationUsers = ref([])
const notificationDrivers = ref([])
const notificationPageState = createNotificationsPageState(notificationUsers, notificationDrivers)
const notificationRecipientSearch = notificationPageState.recipientSearch
const addressForm = ref({ id: '', region: '香港', city: '', name: '', address: '', latitude: null, longitude: null, enabled: true, order: 1 })
const userForm = ref(null)
const usersPageState = createUsersPageState(users, 10)
const addressesPageState = createAddressesPageState(addresses)
const addressRegionFilter = addressesPageState.regionFilter
const addressCityFilter = addressesPageState.cityFilter
const promotionsPageState = createPromotionsPageState(promotions)
const promotionFilterTab = promotionsPageState.filterTab
const promotionSearchQuery = promotionsPageState.searchQuery
const userPage = usersPageState.page
const userPageSize = usersPageState.pageSize
const userSearchQuery = usersPageState.searchQuery
const userStatusFilter = usersPageState.statusFilter
const filteredUsers = usersPageState.filtered
const userPageCount = usersPageState.pageCount
const pagedUsers = usersPageState.paged
const goToUserPage = usersPageState.goToPage
const walletAdjustment = ref(null)
const tripForm = ref(null)
const selectedTrip = ref(null)
const dispatchForm = ref(null)
const orderUrlForm = ref(null)
const orderUrls = ref([])
const createdOrderUrl = ref('')
const tripCatalog = ref({ categories: [], data: [], extras: [] })
const tripQuote = ref(null)
const vehicleCategories = ref([])
const tripBookingStep = ref('details')
const tripPaymentMethod = ref('sandbox')
const tripUseFareBalance = ref(false)
const tripUseCashBalance = ref(false)
const tripLocationKeyword = ref('')
const tripLocationResults = ref([])
const tripLocationSearching = ref(false)
const tripLocationTarget = ref('origin')
const tripsPageState = createTripsPageState(trips, 10)
const tripSearchQuery = tripsPageState.searchQuery
const tripStatusFilter = tripsPageState.statusFilter
const tripDateFilter = tripsPageState.dateFilter
const tripPage = tripsPageState.page
const tripPageSize = tripsPageState.pageSize
const dispatchSearch = tripsPageState.dispatchSearch
const dispatchPage = tripsPageState.dispatchPage
const dispatchPageSize = tripsPageState.pageSize

const tripDateYear = tripsPageState.dateYear
const tripDateMonth = tripsPageState.dateMonth
const tripDateDay = tripsPageState.dateDay
const tripDateYears = tripsPageState.dateYears
const tripDateDays = tripsPageState.dateDays
const clearTripDateFilter = tripsPageState.clearDateFilter
const charterForm = ref(null)
const username = ref('')
const password = ref('')
const currentAdministrator = ref(null)
const administrators = ref([])
const auditLogs = ref([])
const administratorForm = ref(null)
const readStoredList = (key) => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}
const personnel = ref(readStoredList('admin_personnel'))
const entryItems = ref(readStoredList('admin_entry_items'))
const drivers = ref(filterStoredDrivers(readStoredList('admin_drivers')))
const personnelForm = ref(null)
const driverForm = ref(null)
const selectedDriver = ref(null)
const settlementForm = ref(null)
const driversPageState = createDriversPageState(drivers)
const driverFilter = driversPageState.statusFilter
const driverTypeFilter = driversPageState.typeFilter
const driverSearch = driversPageState.searchQuery
const entryForm = ref(null)
const expenseItems = ref(JSON.parse(localStorage.getItem('admin_expenses') || '[]'))
const expenseForm = ref(null)
const operationsPageState = createOperationsPageState(personnel, entryItems, expenseItems)
const personnelFilter = operationsPageState.personnelFilter
const entryFilter = operationsPageState.entryFilter
const expenseFilter = operationsPageState.expenseFilter
const canWrite = computed(() => currentAdministrator.value?.role !== 'VIEWER')
const isSuperAdministrator = computed(() => currentAdministrator.value?.role === 'SUPER_ADMIN')
const timeOptions = Array.from({ length: 48 }, (_, index) => `${String(Math.floor(index / 2)).padStart(2, '0')}:${index % 2 ? '30' : '00'}`)

const messages = {
  en: {
    brand: 'Cross-border Admin',
    welcome: 'Welcome back',
    signInPrompt: 'Sign in to manage riders and trips.',
    adminUsername: 'Admin username', password: 'Password', signIn: 'Sign in', signOut: 'Sign out',
    dashboard: 'Dashboard', 'operations-personnel': 'Personnel management', dispatch: 'Dispatch management', entries: 'Entry / exit items', income: 'Income report', expenses: 'Expense details', users: 'Users', trips: 'Trip orders', charters: 'Business charter', addresses: 'Recommended addresses', membership: 'Membership plans', promotions: 'Promotion settings', payments: 'Payment settings', paymentSettings: 'Payment settings', paymentSettingsDesc: 'Configure available payment options for passengers and toggle sandbox test mode.', walletPaymentGroup: 'Wallet Balance Deduction', fareBalancePay: 'Fare balance deduction', fareBalancePayHint: 'Allow passengers to use prepaid fare balance for order payment', cashBalancePay: 'Cash balance deduction', cashBalancePayHint: 'Allow passengers to use cash balance for order payment', externalPaymentGroup: 'Third-party Gateways', wechatPay: 'WeChat Pay', wechatPayHint: 'Enable WeChat Pay for cross-border transactions', alipayPay: 'Alipay', alipayPayHint: 'Enable Alipay for mainland/cross-border transactions', bankCardPay: 'Bank Card Pay', bankCardPayHint: 'Enable UnionPay and international bank cards', envModeGroup: 'Environment & Mode', sandboxMode: 'Sandbox Mode', sandboxModeHint: 'When enabled, simulated payment receipts are generated without live charges', sandboxBadge: 'Sandbox active', productionBadge: 'Production live', internalBadge: 'Instant Deduction', externalBadge: 'Third-party Gateway', savePaymentSettings: 'Save settings', paymentSavedSuccess: 'Payment settings updated successfully', administrators: 'Administrators', auditLogs: 'Operation logs', adminConsole: 'ADMIN CONSOLE', operations: 'Operations', personnelManagement: 'Personnel management', vehicleManagement: 'Vehicle management', entryItems: 'Entry / exit items', incomeReport: 'Income report', expenseDetails: 'Expense details',
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
    dashboard: '仪表盘', 'operations-personnel': '人员管理', dispatch: '派单管理', drivers: '司机管理', entries: '进出项目', income: '收入报表', expenses: '支出明细', users: '用户', trips: '行程订单', charters: '商务包车', addresses: '推荐地址', promotions: '優惠設定', payments: '支付設定', paymentSettings: '支付設定', paymentSettingsDesc: '配置乘客端可用之支付通道與錢包扣款功能，以及切換沙盒測試環境。', walletPaymentGroup: '錢包餘額抵扣', fareBalancePay: '車費餘額抵扣', fareBalancePayHint: '允許乘客優先使用車費專用餘額抵扣車資', cashBalancePay: '現金餘額抵扣', cashBalancePayHint: '允許乘客使用現金餘額支付剩餘車資', externalPaymentGroup: '第三方支付通道', wechatPay: '微信支付', wechatPayHint: '支援微信支付香港錢包與大陸錢包跨境結算', alipayPay: '支付寶支付', alipayPayHint: '支援支付寶大陸與境外跨境結算通道', bankCardPay: '銀行卡支付', bankCardPayHint: '支援銀聯卡與主流國際信用卡快捷結算', envModeGroup: '系統環境模式', sandboxMode: '沙盒測試模式', sandboxModeHint: '開啟後將進入模擬交易環境，不產生實際扣款手續費', sandboxBadge: '沙盒測試中', productionBadge: '正式運行中', internalBadge: '即時扣款', externalBadge: '第三方接口', savePaymentSettings: '保存支付設定', paymentSavedSuccess: '支付設定已成功保存', administrators: '管理员账户', auditLogs: '操作日志', adminConsole: '管理控制台', operations: '经营管理', personnelManagement: '人员管理', vehicleManagement: '车辆管理', entryItems: '进出项目', incomeReport: '收入报表', expenseDetails: '支出明细', refresh: '刷新',
    totalUsers: '用户总数', totalTrips: '行程总数', pendingTrips: '待处理行程', charterOrders: '包车订单', activeAddresses: '启用地址', drivers: '司機管理', completedTrips: '已完成行程', membership: '会员方案',
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
const formatDate = (value, withTime = false) => new Date(value).toLocaleString(locale.value === 'zh' ? 'zh-CN' : 'en-US', withTime ? {} : { dateStyle: 'medium' })
function toggleLocale() { locale.value = locale.value === 'en' ? 'zh' : 'en'; localStorage.setItem('admin_locale', locale.value) }
function displayError(message) {
  const error = typeof message === 'object' && message ? message : null
  if (error?.kind === 'network') return locale.value === 'zh' ? '網路連線失敗，請稍後重試。' : 'Network request failed. Please try again.'
  if (error?.kind === 'unauthorized' || error?.status === 401 || String(error?.message || message).includes('session')) return t('sessionExpired')
  if (error?.kind === 'forbidden' || error?.status === 403) return locale.value === 'zh' ? '您沒有執行此操作的權限。' : 'You do not have permission to perform this action.'
  if (error?.kind === 'not-found' || error?.status === 404) return locale.value === 'zh' ? '找不到要求的資料。' : 'The requested data was not found.'
  const text = error?.message || message || 'Request failed'
  return text === 'Request failed' ? t('requestFailed') : text
}

async function api(path, options = {}) {
  return apiClient(path, options)
}
const apiClient = createApiClient({
  baseUrl: API,
  getToken: () => token.value,
  onUnauthorized: () => {
    token.value = ''
    localStorage.removeItem('admin_token')
  }
})
const usersApi = createUsersApi(apiClient)
const driversApi = createDriversApi(apiClient)
const tripsApi = createTripsApi(apiClient)
const addressesApi = createAddressesApi(apiClient)
const usersActions = createUsersActions({
  usersApi,
  users,
  selectedUser,
  userForm,
  walletTransactions,
  topUpWithdrawalHistory,
  walletAdjustment,
  load,
  requestConfirmation,
  canWrite,
  displayError,
  error
})
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
      driverRaceEnabled: Boolean(settings.driverRaceEnabled),
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
    if (['users', 'trips', 'charters'].includes(requestedView)) users.value = (await usersApi.list()).data
    if (requestedView === 'drivers') {
      const [categoryResult, driverResult] = await Promise.all([driversApi.categories(), driversApi.list()])
      vehicleCategories.value = categoryResult.data.filter(item => item.enabled !== false)
      if (!driverResult.data.length && drivers.value.length) {
        for (const driver of drivers.value) await driversApi.save(driver)
        drivers.value = (await driversApi.list()).data
      } else {
        drivers.value = driverResult.data
      }
      localStorage.setItem('admin_drivers', JSON.stringify(drivers.value))
    }
    if (requestedView === 'dispatch') {
      const [tripResult, driverResult] = await Promise.all([tripsApi.list(), driversApi.list()])
      trips.value = tripResult.data
      drivers.value = driverResult.data
      orderUrls.value = []
      for (const trip of trips.value) {
        const result = await tripsApi.orderUrls(trip.id)
        orderUrls.value.push(...result.data)
      }
      tripPage.value = 1
    }
    if (requestedView === 'trips') {
      const [tripResult, catalogResult, driverResult] = await Promise.all([tripsApi.list(), api('/vehicles'), driversApi.list()])
      trips.value = tripResult.data
      drivers.value = driverResult.data
      tripPage.value = 1
      tripCatalog.value = catalogResult
    }
    if (requestedView === 'charters') charterOrders.value = (await api('/admin/charter-orders')).data
    if (requestedView === 'addresses') {
      const [addressResult, cityResult] = await Promise.allSettled([
        addressesApi.list(),
        addressesApi.cities()
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
    if (requestedView === 'notifications') {
      const [notificationResult, userResult, driverResult] = await Promise.all([
        api('/admin/notifications'),
        usersApi.list(),
        driversApi.list()
      ])
      notifications.value = notificationResult.data
      notificationUsers.value = userResult.data
      notificationDrivers.value = driverResult.data
    }
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
  catch (e) { error.value = displayError(e); if (e.message.includes('session')) { token.value = ''; localStorage.removeItem('admin_token') } }
  finally {
    if (requestId === loadRequestId) loading.value = false
  }
}
async function apiLogin() { try { error.value = ''; localStorage.removeItem('admin_token'); token.value = ''; const result = await api('/admin/auth/login', { method: 'POST', body: JSON.stringify({ username: username.value, password: password.value }) }); token.value = result.token; currentAdministrator.value = result.administrator; localStorage.setItem('admin_token', token.value); password.value = ''; load() } catch (e) { error.value = displayError(e) } }
async function logout() { try { if (token.value) await api('/admin/auth/logout', { method: 'POST' }) } catch {} finally { token.value = ''; currentAdministrator.value = null; localStorage.removeItem('admin_token'); view.value = 'dashboard'; dashboard.value = null } }
async function saveExchangeRate() {
  const value = Number(exchangeRate.value)
  if (!Number.isFinite(value) || value <= 0) { error.value = 'Valid exchange rate required'; return }
  try {
    await api('/settings', { method: 'POST', body: JSON.stringify({ exchangeRate: value }) })
    exchangeRate.value = value
  } catch (e) { error.value = displayError(e) }
}
const notificationsActions = createNotificationsActions({ api, notificationForm, notificationRecipientSearch, load, error, displayError })
const { resetNotification, clearNotificationRecipients, toggleNotificationRecipient, notificationRecipientChecked, saveNotification } = notificationsActions
const paymentsActions = createPaymentsActions({ api, paymentSettings, paymentSettingsSaved, driverRaceSaving, error, displayError })
const { savePaymentSettings } = paymentsActions
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
async function removeAdminLogo() { try { const settings = await api('/settings', { method: 'POST', body: JSON.stringify({ adminLogo: null }) }); adminLogo.value = settings.adminLogo || '' } catch (e) { error.value = displayError(e) } }
async function updateCharterStatus(order, status) { try { await api(`/admin/charter-orders/${order.id}/status`, { method: 'POST', body: JSON.stringify({ status }) }); await load() } catch (e) { error.value = displayError(e) } }
const dateTimeInput = value => value ? new Date(value).toISOString().slice(0, 16) : ''
const { edit: editUser, reset: resetUser, select: selectUser, save: saveUser, updateStatus: updateUserStatus, openWalletAdjustment, saveWalletAdjustment } = usersActions
const tripsActions = createTripsActions({ api, tripsApi, addressesApi, tripForm, selectedTrip, tripQuote, tripBookingStep, tripPaymentMethod, tripUseFareBalance, tripUseCashBalance, tripLocationKeyword, tripLocationResults, tripLocationSearching, tripLocationTarget, dispatchForm, orderUrlForm, createdOrderUrl, users, trips, error, load, displayError, canWrite, requestConfirmation, notify, tripCatalog, dateTimeInput })
const { editTrip, resetTrip, clearTripLocationSearch, searchTripLocation, selectTripLocation, handleTripRegionChange, showTrip, closeTrip, updateTripStatus, prepareTripQuote, calculateTripRoute, completeTripBooking, saveTrip, openDispatch, saveDispatch, openOrderUrlForm, createOrderUrl, closeCreatedOrderUrl, copyOrderUrl, revokeOrderUrl } = tripsActions
function formatTripAmount(amount, currency = selectedTrip.value?.quote?.currency || 'RMB¥') {
  const value = Number(amount)
  return Number.isFinite(value) ? `${currency}${value.toFixed(2)}` : '—'
}
function paymentMethodLabel(method) {
  return ({ sandbox: '沙盒支付', wechat: '微信支付', alipay: '支付寶', bank_card: '銀行卡' })[method] || method || '—'
}
function editCharter(item) { charterForm.value = { ...item, scheduledAt: dateTimeInput(item.scheduledAt) } }
async function saveCharter() { try { await api(`/admin/charter-orders/${charterForm.value.id}`, { method: 'POST', body: JSON.stringify(charterForm.value) }); charterForm.value = null; await load() } catch (e) { error.value = displayError(e) } }
const membershipActions = createMembershipActions({ api, membershipForm, membershipPlans, load, error, displayError, requestConfirmation, notify, t })
const { editMembership, resetMembership, saveMembership, removeMembership } = membershipActions
function formatBenefits(item) { return item.benefits.join(' · ') }
function generateRandomCouponCodeStr() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length))
  return `PROMO${code}`
}
const promotionsActions = createPromotionsActions({ api, promotionForm, promotionSaving, promotionDeletingId, promotionTogglingId, pricingCurrency, dateTimeInput, nextTick, load, error, displayError, notify, requestConfirmation, t, generateRandomCouponCodeStr })
const { openPromotionForm, resetPromotion, editPromotion, savePromotion, removePromotion, duplicatePromotion, togglePromotionEnabled, generateRandomCouponCode } = promotionsActions

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
const filteredPromotions = promotionsPageState.filtered

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
const triggerLabel = (item) => ({ NONE: '一般', IMMEDIATE: '即時訂單', NIGHT: '深夜加班費', WEATHER: '惡劣天氣' }[item.triggerType || (item.requiredForImmediate ? 'IMMEDIATE' : 'NONE')] || '一般')
const triggerSummary = (item) => item.triggerType === 'IMMEDIATE' ? `出發前 ${item.requiredWithinMinutes || 60} 分鐘` : item.triggerType === 'NIGHT' ? `${item.nightStartTime || '22:00'}–${item.nightEndTime || '06:00'}` : item.triggerType === 'WEATHER' ? (severeWeatherEnabled.value ? '目前啟用' : '目前停用') : '手動選擇'
const isTriggerActive = (type) => extras.value.some(item => (item.triggerType || (item.requiredForImmediate ? 'IMMEDIATE' : 'NONE')) === type && item.triggerEnabled !== false) && (type !== 'WEATHER' || severeWeatherEnabled.value)
const routePricingActions = createRoutePricingActions({ api, pricingCurrency, distancePricing, routeMinimumFareForm, error, load, displayError, requestConfirmation, notify, t })
const { addPricingTier, removePricingTier, syncPreviousTier, syncNextTier, saveDistancePricing, switchPricingCurrency, resetRouteMinimumFare, editRouteMinimumFare, saveRouteMinimumFare, removeRouteMinimumFare } = routePricingActions
const vehiclesActions = createVehiclesActions({ api, view, categories, vehicles, extras, distancePricing, routeMinimumFareForm, categoryForm, vehicleForm, extraForm, pricingCurrency, severeWeatherEnabled, extraSortId, load, error, displayError, requestConfirmation, notify, t })
const { editExtra, resetExtra, saveExtra, moveExtra, showOnlyExtra, toggleSevereWeather, removeExtra, editVehicle, editCategory, resetCategory, resetVehicle, saveCategory, toggleCategory, saveVehicle, toggleVehicle, removeCategory, removeVehicle } = vehiclesActions
const addressesActions = createAddressesActions({ addressesApi, addresses, addressForm, mainlandCities, mainlandCityForm, addressSearchKeyword, addressSearchResults, addressSearching, error, load, displayError, displayMainlandCity, apiMainlandCity, displayPlaceName, requestConfirmation, notify, t })
const { editAddress, resetAddress, searchAddressPlaces, handleAddressRegionChange, handleAddressCityChange, selectAddressSearchResult, saveAddress, removeAddress, resetMainlandCity, editMainlandCity, saveMainlandCity, removeMainlandCity } = addressesActions
const persistOperations = () => {
  localStorage.setItem('admin_personnel', JSON.stringify(personnel.value))
  localStorage.setItem('admin_drivers', JSON.stringify(drivers.value))
  localStorage.setItem('admin_entry_items', JSON.stringify(entryItems.value))
  localStorage.setItem('admin_expenses', JSON.stringify(expenseItems.value))
}
const seedOperations = () => {
  if (!personnel.value.length) personnel.value = [{ id: 'staff-1', name: '王小明', role: '調度主管', phone: '9123 4567', status: '在職' }, { id: 'staff-2', name: '李怡君', role: '客服專員', phone: '9234 5678', status: '在職' }]
  if (!entryItems.value.length) entryItems.value = [{ id: 'entry-1', name: '機場接送', category: '接送服務', unit: '趟', price: 680, enabled: true }, { id: 'entry-2', name: '跨境包車', category: '包車服務', unit: '小時', price: 500, enabled: true }, { id: 'entry-3', name: '深夜服務費', category: '附加服務', unit: '次', price: 120, enabled: true }]
  if (!expenseItems.value.length) expenseItems.value = [{ id: 'expense-1', date: '2026-09-08', category: '車輛維護', description: '例行保養與洗車', amount: 1280, status: '已核銷' }, { id: 'expense-2', date: '2026-09-06', category: '人事費用', description: '兼職司機薪資', amount: 3600, status: '待核銷' }]
  persistOperations()
}
const driverActions = createDriversActions({ driversApi, driverForm, selectedDriver, settlementForm, drivers, error, load, displayError, requestConfirmation, notify })
const { resetDriver, editDriver, uploadDriverPhotos, removeDriverPhoto, saveDriver, removeDriver, openDriverDetail, previewDriver, closeDriverDetail, resetSettlement, saveSettlement } = driverActions
const administratorsActions = createAdministratorsActions({ api, administratorForm, load, error, displayError, requestConfirmation, notify })
const { resetAdministrator, editAdministrator, saveAdministrator, disableAdministrator } = administratorsActions
const operationsActions = createOperationsActions({ personnel, personnelForm, entryItems, entryForm, expenseItems, expenseForm, persistOperations, requestConfirmation, notify })
const { resetPersonnel, editPersonnel, savePersonnel, removePersonnel, resetEntryItem, editEntryItem, saveEntryItem, removeEntryItem, resetExpense, editExpense, saveExpense, removeExpense } = operationsActions
const filteredPersonnel = operationsPageState.filteredPersonnel
const filteredDrivers = driversPageState.filtered
const filteredEntryItems = operationsPageState.filteredEntryItems
const filteredExpenses = operationsPageState.filteredExpenses
const incomeRows = computed(() => [...trips.value.map((item, index) => ({ id: item.id, date: item.scheduledAt, category: '接送服務', description: `${item.origin} → ${item.destination}`, amount: 680 + index * 120 })), ...charterOrders.value.map(item => ({ id: item.id, date: item.scheduledAt, category: '包車服務', description: `${item.origin} → ${item.destination}`, amount: item.durationHours * 500 }))])
const incomeTotal = computed(() => incomeRows.value.reduce((total, item) => total + (Number(item.amount) || 0), 0))
const expenseTotal = computed(() => expenseItems.value.reduce((total, item) => total + (Number(item.amount) || 0), 0))
const filteredNotificationUsers = notificationPageState.filteredUsers
const filteredNotificationDrivers = notificationPageState.filteredDrivers

const filteredTrips = tripsPageState.filtered
const dispatchFilteredTrips = tripsPageState.dispatchFiltered
const dispatchPageCount = tripsPageState.dispatchPageCount
const pagedDispatchTrips = tripsPageState.dispatchPaged
const goToDispatchPage = tripsPageState.goToDispatchPage
const tripPageCount = tripsPageState.pageCount
const pagedTrips = tripsPageState.paged
const goToTripPage = tripsPageState.goToPage

const title = computed(() => t(view.value))
const filteredAddresses = addressesPageState.filtered

const App = { setup() {
  const navigate = createNavigationController({ view, load, mobileNavOpen })
  const visiblePrimaryNavigation = computed(() => primaryNavigation.filter(item => !item.superAdminOnly || isSuperAdministrator.value))
  const visibleOperationsNavigation = operationsNavigation
  let lastOverlayFocus = null
  const getFormOverlay = () => document.querySelector('.modal-backdrop [role="dialog"]')
  const focusFormOverlay = () => {
    const overlay = getFormOverlay()
    if (!overlay) return
    if (!lastOverlayFocus) lastOverlayFocus = document.activeElement
    const firstFocusable = overlay.querySelector('input, select, textarea, button, [tabindex]:not([tabindex="-1"])')
    nextTick(() => (firstFocusable || overlay).focus())
  }
  const restoreFormOverlayFocus = () => {
    const element = lastOverlayFocus
    lastOverlayFocus = null
    if (element && typeof element.focus === 'function') nextTick(() => element.focus())
  }
  const handleOverlayKeydown = event => {
    if (confirmDialog.value.open) return
    const overlay = getFormOverlay()
    if (!overlay) return
    if (event.key === 'Escape') {
      if (createdOrderUrl.value) { closeCreatedOrderUrl(); return }
      if (orderUrlForm.value) { orderUrlForm.value = null; return }
      if (dispatchForm.value) { dispatchForm.value = null; return }
      if (tripForm.value) { tripForm.value = null; return }
      if (selectedTrip.value) { closeTrip(); return }
      if (selectedUser.value) { selectedUser.value = null; return }
    }
    if (event.key !== 'Tab') return
    const focusable = [...overlay.querySelectorAll('input, select, textarea, button, [href], [tabindex]:not([tabindex="-1"])')].filter(element => !element.disabled && element.offsetParent !== null)
    if (!focusable.length) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
  }
  const syncOverlayScrollLock = () => {
    const hasOverlay = Boolean(confirmDialog.value.open || createdOrderUrl.value || orderUrlForm.value || dispatchForm.value || tripForm.value || selectedTrip.value || selectedUser.value)
    document.body.classList.toggle('overlay-open', hasOverlay)
    if (hasOverlay && !confirmDialog.value.open && getFormOverlay()) focusFormOverlay()
    if (!hasOverlay) restoreFormOverlayFocus()
  }
  onMounted(() => {
    seedOperations()
    load()
    document.addEventListener('keydown', handleOverlayKeydown)
  })
  onBeforeUnmount(() => {
    document.removeEventListener('keydown', handleOverlayKeydown)
    document.body.classList.remove('overlay-open')
  })
  watch([() => confirmDialog.value.open, createdOrderUrl, orderUrlForm, dispatchForm, tripForm, selectedTrip, selectedUser], syncOverlayScrollLock)
  watch(view, () => { mobileNavOpen.value = false })
  const userNavigation = target => navigate(target)
  const setVehicleView = tab => {
    vehicleTab.value = tab
    return navigate('vehicles')
  }
  const adminContext = { token, locale, view, vehicleTab, mobileNavOpen, navigate, userNavigation, setVehicleView, visiblePrimaryNavigation, visibleOperationsNavigation, title, dashboard, exchangeRate, severeWeatherEnabled, adminLogo, users, selectedUser, walletTransactions, topUpWithdrawalHistory, trips, charterOrders, addresses, mainlandCities, mainlandCityForm, addressRegionFilter, addressCityFilter, filteredAddresses, addressSearchKeyword, addressSearchResults, addressSearching, categories, vehicles, extras, extraSortId, distancePricing, pricingCurrency, routeMinimumFares, routeMinimumFareForm, membershipPlans, promotions, promotionForm, membershipForm, addressForm, categoryForm, vehicleForm, extraForm, userForm, userPage, userPageSize, userPageCount, pagedUsers, filteredUsers, userSearchQuery, userStatusFilter, goToUserPage, walletAdjustment, tripForm, selectedTrip, tripCatalog, tripQuote, dispatchForm, orderUrlForm, orderUrls, createdOrderUrl, dispatchSearch, dispatchPage, dispatchPageSize, dispatchPageCount, dispatchFilteredTrips, pagedDispatchTrips, goToDispatchPage, tripBookingStep, tripPaymentMethod, tripUseFareBalance, tripUseCashBalance, selectedDriver, settlementForm, tripLocationKeyword, tripLocationResults, tripLocationSearching, tripLocationTarget, tripSearchQuery, tripStatusFilter, tripDateFilter, tripPage, tripPageSize, tripPageCount, pagedTrips, goToTripPage, tripDateYear, tripDateMonth, tripDateDay, tripDateYears, tripDateDays, clearTripDateFilter, filteredTrips, charterForm, currentAdministrator, administrators, auditLogs, administratorForm, notifications, notificationForm, personnel, personnelForm, personnelFilter, drivers, vehicleCategories, driverForm, driverFilter, driverTypeFilter, driverSearch, filteredDrivers, filteredPersonnel, entryItems, entryForm, entryFilter, filteredEntryItems, expenseItems, expenseForm, expenseFilter, filteredExpenses, incomeRows, incomeTotal, expenseTotal, canWrite, isSuperAdministrator, loading, error, username, password, timeOptions, apiLogin, logout, load, resetAdministrator, editAdministrator, saveAdministrator, disableAdministrator, saveExchangeRate, uploadAdminLogo, removeAdminLogo, t, toggleLocale, translateRegion, translateStatus, formatDate, formatOrderNumber, formatTripAmount, paymentMethodLabel, displayMainlandCity, updateCharterStatus, editUser, resetUser, selectUser, updateUserStatus, openWalletAdjustment, editTrip, resetTrip, searchTripLocation, selectTripLocation, handleTripRegionChange, calculateTripRoute, prepareTripQuote, completeTripBooking, showTrip, closeTrip, updateTripStatus, saveWalletAdjustment, saveTrip, saveCharter, openDispatch, saveDispatch, openOrderUrlForm, createOrderUrl, copyOrderUrl, closeCreatedOrderUrl, revokeOrderUrl, editAddress, resetAddress, searchAddressPlaces, selectAddressSearchResult, handleAddressRegionChange, handleAddressCityChange, saveAddress, removeAddress, resetMainlandCity, editMainlandCity, saveMainlandCity, removeMainlandCity, editCategory, editVehicle, resetCategory, saveCategory, toggleCategory, saveVehicle, toggleVehicle, removeCategory, removeVehicle, resetVehicle, editExtra, resetExtra, triggerLabel, triggerSummary, isTriggerActive, toggleSevereWeather, showOnlyExtra, addPricingTier, removePricingTier, syncPreviousTier, syncNextTier, saveDistancePricing, switchPricingCurrency, resetRouteMinimumFare, editRouteMinimumFare, saveRouteMinimumFare, removeRouteMinimumFare, editMembership, resetMembership, saveMembership, removeMembership, formatBenefits, resetPromotion, editPromotion, savePromotion, removePromotion, promotionKindLabel, promotionDiscountLabel, promotionDiscountHint, promotionStackingHint, promotionFilterTab, promotionSearchQuery, filteredPromotions, duplicatePromotion, togglePromotionEnabled, generateRandomCouponCode, toggleWeekday, isWeekdaySelected, setWeekdaysPreset, formatWeekdaysText, formatRouteText, formatTimeRangeText, resetNotification, saveNotification, resetDriver, editDriver, uploadDriverPhotos, removeDriverPhoto, saveDriver, removeDriver, openDriverDetail, closeDriverDetail, resetSettlement, saveSettlement, previewDriver, resetPersonnel, editPersonnel, savePersonnel, removePersonnel, resetEntryItem, editEntryItem, saveEntryItem, removeEntryItem, resetExpense, editExpense, saveExpense, removeExpense, paymentSettings, paymentSettingsSaved, driverRaceSaving, savePaymentSettings, promotionSaving, promotionDeletingId, promotionTogglingId, toasts, dismissToast, confirmDialog, resolveConfirmation }
   provide('adminContext', adminContext)
   return adminContext
 }, template: `<ToastHost :items="toasts" @dismiss="dismissToast" /><ConfirmDialog v-bind="confirmDialog" @confirm="resolveConfirmation(true)" @cancel="resolveConfirmation(false)" /><div v-if="!token" class="login"><button type="button" class="login-language" @click="toggleLocale" :aria-label="t('languageLabel')">中 / EN</button><div class="login-orb login-orb-one"></div><div class="login-orb login-orb-two"></div><form @submit.prevent="apiLogin"><div class="brand"><img v-if="adminLogo" :src="adminLogo" width="180" height="56" alt="Admin logo"/><span v-else>{{t('brand')}}</span></div><h1>{{t('welcome')}}</h1><p>{{t('signInPrompt')}}</p><input v-model="username" :placeholder="t('adminUsername')" autocomplete="username" required/><input v-model="password" type="password" :placeholder="t('password')" autocomplete="current-password" required/><button type="submit">{{t('signIn')}}</button><small v-if="error">{{error}}</small></form></div><div v-else class="shell"><aside :class="{ 'mobile-nav-open': mobileNavOpen }"><div class="brand"><img v-if="adminLogo" :src="adminLogo" width="180" height="56" alt="Admin logo"/><span v-else>{{t('brand')}}</span></div><button type="button" class="mobile-nav-toggle" :aria-expanded="mobileNavOpen ? 'true' : 'false'" aria-controls="admin-navigation" @click="mobileNavOpen = !mobileNavOpen"><span aria-hidden="true">☰</span><span>{{mobileNavOpen ? '關閉選單' : '開啟選單'}}</span></button><nav id="admin-navigation" @click="mobileNavOpen = false">
  <button type="button" :class="{active:view==='dashboard'}" @click="navigate('dashboard')">{{t('dashboard')}}</button>
  <button type="button" :class="{active:view==='users'}" @click="navigate('users')">{{t('users')}}</button>
  <button type="button" :class="{active:view==='drivers'}" @click="navigate('drivers')">{{t('drivers')}}</button>
  <button type="button" :class="{active:view==='trips'}" @click="navigate('trips')">{{t('trips')}}</button>
  <button type="button" :class="{active:view==='dispatch'}" @click="navigate('dispatch')">{{t('dispatch')}}</button>
  <button type="button" :class="{active:view==='charters'}" @click="navigate('charters')">{{t('charters')}}</button>
  <button type="button" :class="{active:view==='addresses'}" @click="navigate('addresses')">{{t('addresses')}}</button>
  <div class="nav-group vehicle-nav">
    <button type="button" class="nav-group-toggle" :class="{active:view==='vehicles'||view==='route-pricing'}" aria-expanded="true">車型與定價 <span>⌄</span></button>
    <div class="nav-group-items">
      <button type="button" :class="{active:view==='vehicles'&&vehicleTab==='catalog'}" @click="view='vehicles';vehicleTab='catalog';load()">車型資料</button>
      <button type="button" :class="{active:view==='vehicles'&&vehicleTab==='pricing'}" @click="view='vehicles';vehicleTab='pricing';load()">車型定價</button>
      <button type="button" :class="{active:view==='vehicles'&&vehicleTab==='extras'}" @click="view='vehicles';vehicleTab='extras';load()">額外服務</button>
      <button type="button" :class="{active:view==='route-pricing'}" @click="view='route-pricing';load()">路線最低價</button>
    </div>
  </div>
  <button type="button" :class="{active:view==='membership'}" @click="view='membership';load()">{{t('membership')}}</button>
  <button type="button" :class="{active:view==='promotions'}" @click="view='promotions';load()">優惠設定</button>
  <button type="button" :class="{active:view==='payments'}" @click="view='payments';load()">{{t('paymentSettings')}}</button>
  <button type="button" :class="{active:view==='notifications'}" @click="view='notifications';load()">消息推送</button>
  <button type="button" v-if="isSuperAdministrator" :class="{active:view==='administrators'}" @click="view='administrators';load()">{{t('administrators')}}</button>
  <button type="button" v-if="isSuperAdministrator" :class="{active:view==='auditLogs'}" @click="view='auditLogs';load()">{{t('auditLogs')}}</button>
  <div class="nav-group operations-nav">
    <button class="nav-group-toggle" type="button">{{t('operations')}} <span>⌄</span></button>
    <div class="nav-group-items">
      <button type="button" :class="{active:view==='operations-personnel'}" @click="view='operations-personnel'">{{t('personnelManagement')}}</button><button type="button" :class="{active:view==='drivers'}" @click="view='drivers'">{{t('drivers')}}</button>
      <button type="button" :class="{active:view==='vehicles'}" @click="view='vehicles';load()">{{t('vehicleManagement')}}</button>
      <button type="button" :class="{active:view==='entries'}" @click="view='entries'">{{t('entryItems')}}</button>
      <button type="button" :class="{active:view==='income'}" @click="view='income';load()">{{t('incomeReport')}}</button>
      <button type="button" :class="{active:view==='expenses'}" @click="view='expenses'">{{t('expenseDetails')}}</button>
    </div>
  </div>
</nav><div v-if="currentAdministrator" class="admin-identity"><b>{{currentAdministrator.displayName}}</b><span>{{currentAdministrator.role}}</span></div><button type="button" class="logout" @click="logout">{{t('signOut')}}</button>
</aside><main :class="{readonly: !canWrite}"><header><div v-if="view==='dashboard'"><span class="eyebrow">{{t('adminConsole')}}</span><h1>{{title}}</h1></div><div v-else class="page-header-spacer" aria-hidden="true"></div><div class="header-actions"><span v-if="!canWrite" class="readonly-badge">唯讀模式</span><label v-if="canWrite && view==='dashboard'" class="rate-control">{{t('exchangeRate')}} <input v-model="exchangeRate" type="number" min="0.0001" step="0.0001"/><button type="button" @click="saveExchangeRate">{{t('saveRate')}}</button></label><template v-if="view==='dashboard'"><button type="button" class="language-toggle" @click="toggleLocale" :aria-label="t('languageLabel')">中 / EN</button><button type="button" class="refresh" @click="load">↻ {{t('refresh')}}</button></template></div></header><div v-if="error" class="error">{{error}}</div><section v-if="view==='dashboard' && isSuperAdministrator" class="logo-settings panel"><div><span class="eyebrow">BRANDING</span><h2>Logo 設定</h2><p>上傳後會以保持比例置中裁切方式填滿固定 180 × 56 px 顯示框，檔案上限 1 MB。</p></div><div class="logo-settings-actions"><div class="logo-preview"><img v-if="adminLogo" :src="adminLogo" width="180" height="56" alt="Admin logo"/><span v-else>尚未設定 Logo</span></div><label class="logo-upload">更換 Logo<input type="file" accept="image/png,image/jpeg,image/webp" @change="uploadAdminLogo"/></label><button type="button" v-if="adminLogo" class="logo-remove" @click="removeAdminLogo">移除</button></div></section><section v-if="view==='dashboard' && dashboard" class="cards"><article><span>{{t('totalUsers')}}</span><strong>{{dashboard.users}}</strong></article><article><span>{{t('totalTrips')}}</span><strong>{{dashboard.trips}}</strong></article><article><span>{{t('pendingTrips')}}</span><strong>{{dashboard.pendingTrips}}</strong></article><article><span>{{t('completedTrips')}}</span><strong>{{dashboard.completedTrips}}</strong></article><article><span>{{t('charterOrders')}}</span><strong>{{dashboard.charterOrders}}</strong></article><article><span>{{t('activeAddresses')}}</span><strong>{{dashboard.recommendedAddresses}}</strong></article></section><section v-if="view==='charters'" class="editor-section"><form v-if="charterForm" class="record-form charter-editor" @submit.prevent="saveCharter"><select v-model="charterForm.userId"><option v-for="user in users" :key="user.id" :value="user.id">{{user.name || user.phone || user.id}}</option></select><select v-model="charterForm.originRegion"><option>香港</option><option>大陸</option><option>澳門</option></select><input v-model="charterForm.origin" :placeholder="t('origin')" required/><select v-model="charterForm.destinationRegion"><option>香港</option><option>大陸</option><option>澳門</option></select><input v-model="charterForm.destination" :placeholder="t('destination')" required/><input v-model="charterForm.scheduledAt" type="datetime-local" required/><input v-model.number="charterForm.durationHours" type="number" min="1" step="0.5" required/><select v-model="charterForm.status"><option v-for="status in ['PENDING','CONFIRMED','COMPLETED','CANCELLED']" :value="status">{{translateStatus(status)}}</option></select><button type="submit">{{t('saveChanges')}}</button><button type="button" class="secondary" @click="charterForm=null">{{t('cancel')}}</button></form><div class="panel"><table><thead><tr><th>{{t('route')}}</th><th>{{t('scheduled')}}</th><th>{{t('duration')}}</th><th>{{t('status')}}</th><th>{{t('actions')}}</th></tr></thead><tbody><tr v-for="order in charterOrders" :key="order.id"><td><b>{{order.originRegion}} · {{order.origin}}</b><br/><span class="muted">→ {{order.destinationRegion}} · {{order.destination}}</span></td><td>{{formatDate(order.scheduledAt, true)}}</td><td>{{order.durationHours}} {{t('hours')}}</td><td><select :value="order.status" @change="updateCharterStatus(order, $event.target.value)"><option v-for="status in ['PENDING','CONFIRMED','COMPLETED','CANCELLED']" :key="status" :value="status">{{translateStatus(status)}}</option></select></td><td class="row-actions"><button type="button" @click="editCharter(order)">{{t('edit')}}</button></td></tr></tbody></table></div></section><UsersPage /><DriversPage /><TripsPage /><AddressesPage /><PromotionsPage /><MembershipPage /><RoutePricingPage /><VehiclesPage /><OperationsPage />      <NotificationsPage /><AdministratorsPage /><AuditLogsPage /><PaymentsPage /></main></div>` }
const app = createApp(App)
app.component('UsersPage', UsersPage)
app.component('DriversPage', DriversPage)
app.component('TripsPage', TripsPage)
app.component('AddressesPage', AddressesPage)
app.component('PromotionsPage', PromotionsPage)
app.component('MembershipPage', MembershipPage)
app.component('RoutePricingPage', RoutePricingPage)
app.component('VehiclesPage', VehiclesPage)
app.component('OperationsPage', OperationsPage)
app.component('PaymentsPage', PaymentsPage)
app.component('AuditLogsPage', AuditLogsPage)
app.component('AdministratorsPage', AdministratorsPage)
app.component('NotificationsPage', NotificationsPage)
app.component('LoadingState', LoadingState)
app.component('ErrorState', ErrorState)
app.component('EmptyState', EmptyState)
app.component('ToastHost', ToastHost)
app.component('ConfirmDialog', ConfirmDialog)
app.mount('#app')
