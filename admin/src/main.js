import { createApp, computed, nextTick, onMounted, watch, provide } from 'vue'
import { createAdminApi } from './utils/admin-api.js'
import { LoadingState, ErrorState, EmptyState, ToastHost, ConfirmDialog } from './components/index.js'
import { sortByOrder, formatOrderNumber, displayMainlandCity, apiMainlandCity, displayPlaceName } from './utils/formatters.js'
import { promotionKindLabel, promotionDiscountLabel } from './utils/promotions.js'
import { dateTimeInput, formatTripAmount, paymentMethodLabel, formatBenefits } from './utils/display-formatters.js'
import { createOperationsStorage } from './utils/operations-storage.js'
import { createFeedbackController } from './utils/feedback.js'
import { createErrorDisplay } from './utils/error-display.js'
import { generateRandomCouponCodeStr, createTimeOptions, createOperationsDisplay } from './utils/entry-helpers.js'
import { createAdminFormState } from './utils/admin-form-state.js'
import { createAdminSettingsState } from './utils/admin-settings-state.js'
import { createAdminSessionState } from './utils/admin-session-state.js'
import { createAdminShellState } from './utils/admin-shell-state.js'
import { createAdminResourceState } from './utils/admin-resource-state.js'
import { createAdminAuxiliaryState } from './utils/admin-auxiliary-state.js'
import { createAdminInteractionState } from './utils/admin-interaction-state.js'
import { createAdminPageStates } from './utils/admin-page-states.js'
import { createLocalization } from './utils/localization.js'
import { createAdminSessionActions } from './utils/admin-session.js'
import { createPromotionDisplay } from './utils/promotion-display.js'
import { applyAdminSettings } from './utils/admin-settings-loader.js'
import { loadAddressResources, loadDispatchOrderUrls, loadNotificationResources, loadVehicleResources, loadMembershipResources, loadPromotionResources, loadRoutePricingResources, loadCoreUsers, loadDriversResources, loadDispatchResources, loadTripsResources, loadCharterResources, loadAdministratorResources } from './utils/admin-resource-loader.js'
import { primaryNavigation, operationsNavigation, createNavigationController, createOverlayController } from './layout/index.js'
import { UsersPage } from './pages/users/UsersPage.js'
import { createUsersActions } from './pages/users/users.actions.js'
import { DriversPage } from './pages/drivers/DriversPage.js'
import { createDriversActions } from './pages/drivers/drivers.actions.js'
import { TripsPage } from './pages/trips/TripsPage.js'
import { createTripsActions } from './pages/trips/trips.actions.js'
import { AddressesPage } from './pages/addresses/AddressesPage.js'
import { createAddressesActions } from './pages/addresses/addresses.actions.js'
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
import { createOperationsActions } from './pages/operations/operations.actions.js'
import { createCharterActions } from './pages/charters/charters.actions.js'
import './style.css'

const API = import.meta.env.VITE_API_URL || '/api'
const { token, locale, username, password, currentAdministrator } = createAdminSessionState()
const { t, translateRegion, translateStatus, formatDate, toggleLocale } = createLocalization(locale)
const displayError = createErrorDisplay({ locale, t })
const { view, mobileNavOpen, loading, error, dashboard } = createAdminShellState()
const vehiclesPageState = createVehiclesPageState()
const vehicleTab = vehiclesPageState.tab
const extraSortId = vehiclesPageState.extraSortId
let loadRequestId = 0
const { exchangeRate, pricingCurrency, severeWeatherEnabled, adminLogo, paymentSettings } = createAdminSettingsState()
const { users, selectedUser, walletTransactions, topUpWithdrawalHistory, trips, charterOrders, addresses, mainlandCities, addressSearchKeyword, addressSearchResults, addressSearching, categories, vehicles, extras, distancePricing, routeMinimumFares, routeMinimumFareForm, membershipPlans, promotions, promotionForm, promotionSaving, promotionDeletingId, promotionTogglingId } = createAdminResourceState()
const { administrators, auditLogs, notifications, notificationUsers, notificationDrivers, personnel, entryItems, drivers, selectedDriver, expenseItems } = createAdminAuxiliaryState()
const { orderUrls, createdOrderUrl, tripCatalog, tripQuote, vehicleCategories, tripBookingStep, tripPaymentMethod, tripUseFareBalance, tripUseCashBalance, tripLocationKeyword, tripLocationResults, tripLocationSearching, tripLocationTarget } = createAdminInteractionState()
const { toasts, confirmDialog, dismissToast, notify, requestConfirmation, resolveConfirmation } = createFeedbackController()
const paymentsPageState = createPaymentsPageState()
const paymentSettingsSaved = paymentsPageState.saved
const driverRaceSaving = paymentsPageState.raceSaving
const notificationPageState = createNotificationsPageState(notificationUsers, notificationDrivers)
const notificationRecipientSearch = notificationPageState.recipientSearch
const { addressForm, userForm, walletAdjustment, tripForm, selectedTrip, dispatchForm, orderUrlForm, charterForm, administratorForm, notificationForm, mainlandCityForm, membershipForm, categoryForm, vehicleForm, extraForm, personnelForm, driverForm, settlementForm, entryForm, expenseForm } = createAdminFormState()
const {
  usersPageState, addressesPageState, promotionsPageState, tripsPageState, driversPageState, operationsPageState,
  addressRegionFilter, addressCityFilter, totalAddressCount, enabledAddressCount, mainlandAddressCount,
  promotionFilterTab, promotionSearchQuery,
  userPage, userPageSize, userSearchQuery, userStatusFilter, filteredUsers, userPageCount, pagedUsers, goToUserPage,
  tripSearchQuery, tripStatusFilter, tripDateFilter, tripPage, tripPageSize, dispatchSearch, dispatchPage, dispatchPageSize,
  tripDateYear, tripDateMonth, tripDateDay, tripDateYears, tripDateDays, clearTripDateFilter,
  driverFilter, driverTypeFilter, driverSearch, driverFiltersActive, resetDriverFilters,
  personnelFilter, entryFilter, expenseFilter
} = createAdminPageStates({ users, addresses, promotions, trips, drivers, personnel, entryItems, expenseItems })
const canWrite = computed(() => currentAdministrator.value?.role !== 'VIEWER')
const isSuperAdministrator = computed(() => currentAdministrator.value?.role === 'SUPER_ADMIN')
const timeOptions = createTimeOptions()


const { api, usersApi, driversApi, tripsApi, addressesApi } = createAdminApi({ baseUrl: API, token })
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
    applyAdminSettings(settings, { exchangeRate, pricingCurrency, severeWeatherEnabled, adminLogo, paymentSettings })
    if (!token.value) return
    if (!currentAdministrator.value) currentAdministrator.value = await api('/admin/auth/me')
    if (requestedView === 'dashboard') dashboard.value = await api('/admin/dashboard')
    if (['users', 'trips', 'charters'].includes(requestedView)) await loadCoreUsers({ usersApi, users })
    if (requestedView === 'drivers') await loadDriversResources({ driversApi, vehicleCategories, drivers })
    if (requestedView === 'dispatch') await loadDispatchResources({ tripsApi, driversApi, trips, drivers, orderUrls, tripPage })
    if (requestedView === 'trips') await loadTripsResources({ tripsApi, driversApi, api, trips, drivers, tripPage, tripCatalog })
    if (requestedView === 'charters') await loadCharterResources({ api, charterOrders })
    if (requestedView === 'addresses') {
      error.value = await loadAddressResources({ addressesApi, addresses, mainlandCities, displayMainlandCity, displayError })
    }
    if (requestedView === 'membership') await loadMembershipResources({ api, membershipPlans })
    if (requestedView === 'promotions') await loadPromotionResources({ api, promotions })
    if (requestedView === 'administrators') await loadAdministratorResources({ api, administrators })
    if (requestedView === 'notifications') {
      await loadNotificationResources({ api, usersApi, driversApi, notifications, notificationUsers, notificationDrivers })
    }
    if (requestedView === 'vehicles') {
      await loadVehicleResources({ api, categories, vehicles, extras, distancePricing, sortByOrder })
    }
    if (requestedView === 'route-pricing') await loadRoutePricingResources({ api, categories, routeMinimumFares })
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
const { updateCharterStatus, editCharter, saveCharter } = createCharterActions({ api, charterForm, load, error, displayError, dateTimeInput })
const { edit: editUser, reset: resetUser, select: selectUser, save: saveUser, updateStatus: updateUserStatus, openWalletAdjustment, saveWalletAdjustment } = usersActions
const tripsActions = createTripsActions({ api, tripsApi, addressesApi, tripForm, selectedTrip, tripQuote, tripBookingStep, tripPaymentMethod, tripUseFareBalance, tripUseCashBalance, tripLocationKeyword, tripLocationResults, tripLocationSearching, tripLocationTarget, dispatchForm, orderUrlForm, createdOrderUrl, users, trips, error, load, displayError, canWrite, requestConfirmation, notify, tripCatalog, dateTimeInput })
const { editTrip, resetTrip, clearTripLocationSearch, searchTripLocation, selectTripLocation, handleTripRegionChange, showTrip, closeTrip, updateTripStatus, prepareTripQuote, calculateTripRoute, completeTripBooking, saveTrip, openDispatch, saveDispatch, openOrderUrlForm, createOrderUrl, closeCreatedOrderUrl, copyOrderUrl, revokeOrderUrl } = tripsActions
const membershipActions = createMembershipActions({ api, membershipForm, membershipPlans, load, error, displayError, requestConfirmation, notify, t })
const { editMembership, resetMembership, saveMembership, removeMembership } = membershipActions
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
const { incomeRows, incomeTotal, expenseTotal } = createOperationsDisplay({ trips, charterOrders, expenseItems })
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
