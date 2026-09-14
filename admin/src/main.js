import { createApp, ref, computed, nextTick, onMounted, watch, provide } from 'vue'
import { createApiClient } from './api/client'
import { createUsersApi } from './api/users.js'
import { createDriversApi } from './api/drivers.js'
import { createTripsApi } from './api/trips.js'
import { createAddressesApi } from './api/addresses.js'
import { LoadingState, ErrorState, EmptyState, ToastHost, ConfirmDialog } from './components/index.js'
import { sortByOrder, currencyLabel, formatOrderNumber, displayMainlandCity, apiMainlandCity, displayPlaceName } from './utils/formatters.js'
import { promotionKindLabel, promotionDiscountLabel } from './utils/promotions.js'
import { dateTimeInput, formatTripAmount, paymentMethodLabel, formatBenefits } from './utils/display-formatters.js'
import { createOperationsStorage } from './utils/operations-storage.js'
import { filterStoredDrivers } from './utils/drivers.js'
import { createLocalization } from './utils/localization.js'
import { createAdminSessionActions } from './utils/admin-session.js'
import { createPromotionDisplay } from './utils/promotion-display.js'
import { primaryNavigation, operationsNavigation, createNavigationController, createOverlayController } from './layout/index.js'
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
const { t, translateRegion, translateStatus, formatDate, toggleLocale } = createLocalization(locale)
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
const confirmDialog = ref({ open: false, title: '', message: '', confirmLabel: '確認', cancelLabel: '取消', danger: false, action: null })
let toastId = 0
function dismissToast(id) { toasts.value = toasts.value.filter(item => item.id !== id) }
function notify(message, type = 'success') {
  const id = ++toastId
  toasts.value.push({ id, message, type })
  window.setTimeout(() => dismissToast(id), 4000)
}
function requestConfirmation({ title = '確認操作', message, confirmLabel = '確認', cancelLabel = '取消', danger = false }) {
  return new Promise(resolve => {
    confirmDialog.value = { open: true, title, message, confirmLabel, cancelLabel, danger, action: resolve }
  })
}
function resolveConfirmation(confirmed) {
  const resolve = confirmDialog.value.action
  confirmDialog.value = { open: false, title: '', message: '', confirmLabel: '確認', cancelLabel: '取消', danger: false, action: null }
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
const totalAddressCount = addressesPageState.totalCount
const enabledAddressCount = addressesPageState.enabledCount
const mainlandAddressCount = addressesPageState.mainlandCount
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
const driverFiltersActive = driversPageState.hasActiveFilters
const resetDriverFilters = driversPageState.resetFilters
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
  view,
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
const adminSessionActions = createAdminSessionActions({ api, token, username, password, currentAdministrator, error, exchangeRate, adminLogo, view, load, displayError })
const { apiLogin, logout, saveExchangeRate, uploadAdminLogo, removeAdminLogo } = adminSessionActions
const notificationsActions = createNotificationsActions({ api, notificationForm, notificationRecipientSearch, load, error, displayError })
const { resetNotification, clearNotificationRecipients, toggleNotificationRecipient, notificationRecipientChecked, saveNotification } = notificationsActions
const paymentsActions = createPaymentsActions({ api, paymentSettings, paymentSettingsSaved, driverRaceSaving, error, displayError })
const { savePaymentSettings } = paymentsActions
async function updateCharterStatus(order, status) { try { await api(`/admin/charter-orders/${order.id}/status`, { method: 'POST', body: JSON.stringify({ status }) }); await load() } catch (e) { error.value = displayError(e) } }
const { edit: editUser, reset: resetUser, select: selectUser, save: saveUser, updateStatus: updateUserStatus, openWalletAdjustment, saveWalletAdjustment } = usersActions
const tripsActions = createTripsActions({ api, tripsApi, addressesApi, tripForm, selectedTrip, tripQuote, tripBookingStep, tripPaymentMethod, tripUseFareBalance, tripUseCashBalance, tripLocationKeyword, tripLocationResults, tripLocationSearching, tripLocationTarget, dispatchForm, orderUrlForm, createdOrderUrl, users, trips, error, load, displayError, canWrite, requestConfirmation, notify, tripCatalog, dateTimeInput })
const { editTrip, resetTrip, clearTripLocationSearch, searchTripLocation, selectTripLocation, handleTripRegionChange, showTrip, closeTrip, updateTripStatus, prepareTripQuote, calculateTripRoute, completeTripBooking, saveTrip, openDispatch, saveDispatch, openOrderUrlForm, createOrderUrl, closeCreatedOrderUrl, copyOrderUrl, revokeOrderUrl } = tripsActions
function editCharter(item) { charterForm.value = { ...item, scheduledAt: dateTimeInput(item.scheduledAt) } }
async function saveCharter() { try { await api(`/admin/charter-orders/${charterForm.value.id}`, { method: 'POST', body: JSON.stringify(charterForm.value) }); charterForm.value = null; await load() } catch (e) { error.value = displayError(e) } }
const membershipActions = createMembershipActions({ api, membershipForm, membershipPlans, load, error, displayError, requestConfirmation, notify, t })
const { editMembership, resetMembership, saveMembership, removeMembership } = membershipActions
function generateRandomCouponCodeStr() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length))
  return `PROMO${code}`
}
const promotionsActions = createPromotionsActions({ api, promotionForm, promotionSaving, promotionDeletingId, promotionTogglingId, pricingCurrency, dateTimeInput, nextTick, load, error, displayError, notify, requestConfirmation, t, generateRandomCouponCodeStr })
const { openPromotionForm, resetPromotion, editPromotion, savePromotion, removePromotion, duplicatePromotion, togglePromotionEnabled, generateRandomCouponCode } = promotionsActions

const promotionDisplay = createPromotionDisplay({ promotionForm, promotionsPageState, severeWeatherEnabled, extras })
const { promotionDiscountHint, promotionStackingHint, filteredPromotions, toggleWeekday, isWeekdaySelected, setWeekdaysPreset, formatWeekdaysText, formatRouteText, formatTimeRangeText, triggerLabel, triggerSummary, isTriggerActive } = promotionDisplay
const routePricingActions = createRoutePricingActions({ api, pricingCurrency, distancePricing, routeMinimumFareForm, error, load, displayError, requestConfirmation, notify, t })
const { addPricingTier, removePricingTier, syncPreviousTier, syncNextTier, saveDistancePricing, switchPricingCurrency, resetRouteMinimumFare, editRouteMinimumFare, saveRouteMinimumFare, removeRouteMinimumFare } = routePricingActions
const vehiclesActions = createVehiclesActions({ api, view, categories, vehicles, extras, distancePricing, routeMinimumFareForm, categoryForm, vehicleForm, extraForm, pricingCurrency, severeWeatherEnabled, extraSortId, load, error, displayError, requestConfirmation, notify, t })
const { editExtra, resetExtra, saveExtra, moveExtra, showOnlyExtra, toggleSevereWeather, removeExtra, editVehicle, editCategory, resetCategory, resetVehicle, saveCategory, toggleCategory, saveVehicle, toggleVehicle, removeCategory, removeVehicle } = vehiclesActions
const addressesActions = createAddressesActions({ addressesApi, addresses, addressForm, mainlandCities, mainlandCityForm, addressSearchKeyword, addressSearchResults, addressSearching, error, load, displayError, displayMainlandCity, apiMainlandCity, displayPlaceName, requestConfirmation, notify, t })
const { editAddress, resetAddress, searchAddressPlaces, handleAddressRegionChange, handleAddressCityChange, selectAddressSearchResult, saveAddress, removeAddress, resetMainlandCity, editMainlandCity, saveMainlandCity, removeMainlandCity } = addressesActions
const driverActions = createDriversActions({ driversApi, driverForm, selectedDriver, settlementForm, drivers, error, load, displayError, requestConfirmation, notify })
const { resetDriver, editDriver, uploadDriverPhotos, removeDriverPhoto, saveDriver, removeDriver, openDriverDetail, previewDriver, closeDriverDetail, resetSettlement, saveSettlement } = driverActions
const administratorsActions = createAdministratorsActions({ api, administratorForm, load, error, displayError, requestConfirmation, notify })
const { resetAdministrator, editAdministrator, saveAdministrator, disableAdministrator } = administratorsActions
const operationsStorage = createOperationsStorage({ personnel, entryItems, expenseItems, drivers })
const persistOperations = operationsStorage.persist
const seedOperations = operationsStorage.seed
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
  createOverlayController({ confirmDialog, createdOrderUrl, orderUrlForm, dispatchForm, tripForm, selectedTrip, selectedUser, closeCreatedOrderUrl, closeTrip })
  onMounted(() => {
    seedOperations()
    load()
  })
  watch(view, () => { mobileNavOpen.value = false })
  const userNavigation = target => navigate(target)
  const setVehicleView = tab => {
    vehicleTab.value = tab
    return navigate('vehicles')
  }
  const adminContext = { token, locale, view, vehicleTab, mobileNavOpen, navigate, userNavigation, setVehicleView, visiblePrimaryNavigation, visibleOperationsNavigation, title, dashboard, exchangeRate, severeWeatherEnabled, adminLogo, users, selectedUser, walletTransactions, topUpWithdrawalHistory, trips, charterOrders, addresses, mainlandCities, mainlandCityForm, addressRegionFilter, addressCityFilter, totalCount: totalAddressCount, enabledCount: enabledAddressCount, mainlandCount: mainlandAddressCount, filteredAddresses, addressSearchKeyword, addressSearchResults, addressSearching, categories, vehicles, extras, extraSortId, distancePricing, pricingCurrency, routeMinimumFares, routeMinimumFareForm, membershipPlans, promotions, promotionForm, membershipForm, addressForm, categoryForm, vehicleForm, extraForm, userForm, userPage, userPageSize, userPageCount, pagedUsers, filteredUsers, userSearchQuery, userStatusFilter, goToUserPage, walletAdjustment, tripForm, selectedTrip, tripCatalog, tripQuote, dispatchForm, orderUrlForm, orderUrls, createdOrderUrl, dispatchSearch, dispatchPage, dispatchPageSize, dispatchPageCount, dispatchFilteredTrips, pagedDispatchTrips, goToDispatchPage, tripBookingStep, tripPaymentMethod, tripUseFareBalance, tripUseCashBalance, selectedDriver, settlementForm, tripLocationKeyword, tripLocationResults, tripLocationSearching, tripLocationTarget, tripSearchQuery, tripStatusFilter, tripDateFilter, tripPage, tripPageSize, tripPageCount, pagedTrips, goToTripPage, tripDateYear, tripDateMonth, tripDateDay, tripDateYears, tripDateDays, clearTripDateFilter, filteredTrips, charterForm, currentAdministrator, administrators, auditLogs, administratorForm, notifications, notificationForm, personnel, personnelForm, personnelFilter, drivers, vehicleCategories, driverForm, driverFilter, driverTypeFilter, driverSearch, driverFiltersActive, resetDriverFilters, filteredDrivers, filteredPersonnel, entryItems, entryForm, entryFilter, filteredEntryItems, expenseItems, expenseForm, expenseFilter, filteredExpenses, incomeRows, incomeTotal, expenseTotal, canWrite, isSuperAdministrator, loading, error, username, password, timeOptions, apiLogin, logout, load, resetAdministrator, editAdministrator, saveAdministrator, disableAdministrator, saveExchangeRate, uploadAdminLogo, removeAdminLogo, t, toggleLocale, translateRegion, translateStatus, formatDate, formatOrderNumber, formatTripAmount, paymentMethodLabel, displayMainlandCity, updateCharterStatus, editUser, resetUser, selectUser, saveUser, updateUserStatus, openWalletAdjustment, editTrip, resetTrip, searchTripLocation, selectTripLocation, handleTripRegionChange, calculateTripRoute, prepareTripQuote, completeTripBooking, showTrip, closeTrip, updateTripStatus, saveWalletAdjustment, saveTrip, saveCharter, openDispatch, saveDispatch, openOrderUrlForm, createOrderUrl, copyOrderUrl, closeCreatedOrderUrl, revokeOrderUrl, editAddress, resetAddress, searchAddressPlaces, selectAddressSearchResult, handleAddressRegionChange, handleAddressCityChange, saveAddress, removeAddress, resetMainlandCity, editMainlandCity, saveMainlandCity, removeMainlandCity, editCategory, editVehicle, resetCategory, saveCategory, toggleCategory, saveVehicle, toggleVehicle, removeCategory, removeVehicle, resetVehicle, editExtra, resetExtra, triggerLabel, triggerSummary, isTriggerActive, toggleSevereWeather, showOnlyExtra, addPricingTier, removePricingTier, syncPreviousTier, syncNextTier, saveDistancePricing, switchPricingCurrency, resetRouteMinimumFare, editRouteMinimumFare, saveRouteMinimumFare, removeRouteMinimumFare, editMembership, resetMembership, saveMembership, removeMembership, formatBenefits, resetPromotion, editPromotion, savePromotion, removePromotion, promotionKindLabel, promotionDiscountLabel, promotionDiscountHint, promotionStackingHint, promotionFilterTab, promotionSearchQuery, filteredPromotions, duplicatePromotion, togglePromotionEnabled, generateRandomCouponCode, toggleWeekday, isWeekdaySelected, setWeekdaysPreset, formatWeekdaysText, formatRouteText, formatTimeRangeText, resetNotification, saveNotification, resetDriver, editDriver, uploadDriverPhotos, removeDriverPhoto, saveDriver, removeDriver, openDriverDetail, closeDriverDetail, resetSettlement, saveSettlement, previewDriver, resetPersonnel, editPersonnel, savePersonnel, removePersonnel, resetEntryItem, editEntryItem, saveEntryItem, removeEntryItem, resetExpense, editExpense, saveExpense, removeExpense, paymentSettings, paymentSettingsSaved, driverRaceSaving, savePaymentSettings, promotionSaving, promotionDeletingId, promotionTogglingId, toasts, dismissToast, confirmDialog, resolveConfirmation }
   provide('adminContext', adminContext)
   return adminContext
 }, template: `<ToastHost :items="toasts" @dismiss="dismissToast" /><ConfirmDialog v-bind="confirmDialog" @confirm="resolveConfirmation(true)" @cancel="resolveConfirmation(false)" /><div v-if="!token" class="login"><button type="button" class="login-language" @click="toggleLocale" :aria-label="t('languageLabel')">中 / EN</button><div class="login-orb login-orb-one"></div><div class="login-orb login-orb-two"></div><form @submit.prevent="apiLogin"><div class="brand"><img v-if="adminLogo" :src="adminLogo" width="180" height="56" alt="Admin logo"/><span v-else>{{t('brand')}}</span></div><h1>{{t('welcome')}}</h1><p>{{t('signInPrompt')}}</p><input v-model="username" :placeholder="t('adminUsername')" autocomplete="username" required/><input v-model="password" type="password" :placeholder="t('password')" autocomplete="current-password" required/><button type="submit">{{t('signIn')}}</button><small v-if="error">{{error}}</small></form><footer class="login-footer">© 2026 IM MASTER INC. LIMITED All Rights Reserved.</footer></div><div v-else class="shell"><aside :class="{ 'mobile-nav-open': mobileNavOpen }"><div class="brand"><img v-if="adminLogo" :src="adminLogo" width="180" height="56" alt="Admin logo"/><span v-else>{{t('brand')}}</span></div><button type="button" class="mobile-nav-toggle" :aria-expanded="mobileNavOpen ? 'true' : 'false'" aria-controls="admin-navigation" @click="mobileNavOpen = !mobileNavOpen"><span aria-hidden="true">☰</span><span>{{mobileNavOpen ? '關閉選單' : '開啟選單'}}</span></button><nav id="admin-navigation" @click="mobileNavOpen = false">
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
  <button type="button" class="logout logout-mobile" @click="logout">{{t('signOut')}}</button>
</nav><div v-if="currentAdministrator" class="admin-identity"><b>{{currentAdministrator.displayName}}</b><span>{{currentAdministrator.role}}</span></div><button type="button" class="logout logout-desktop" @click="logout">{{t('signOut')}}</button>
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
