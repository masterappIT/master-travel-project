import { createApp, computed, ref, nextTick, onMounted, watch, provide, defineAsyncComponent } from 'vue'
import { createAdminApi } from './utils/admin-api.js'
import { LoadingState, ErrorState, ToastHost, ConfirmDialog } from './components/index.js'
import { AdminDatePicker } from './components/AdminDatePicker.js'
import { AdminDateTimePicker } from './components/AdminDateTimePicker.js'
import { AdminTimePicker } from './components/AdminTimePicker.js'
import { AdminSelect } from './components/AdminSelect.js'
import { AdminCheckbox } from './components/AdminCheckbox.js'
import { DriverReviewActions } from './components/DriverReviewActions.js'
import { VehiclePhotoViewer } from './components/VehiclePhotoViewer.js'
import { LazyVehiclePhotoViewer } from './components/LazyVehiclePhotoViewer.js'
import { sortByOrder, formatOrderNumber, displayMainlandCity, apiMainlandCity, displayPlaceName, formatTripAddress } from './utils/formatters.js'
import { promotionKindLabel, promotionDiscountLabel } from './utils/promotions.js'
import { dateTimeInput, formatTripAmount, paymentMethodLabel, formatBenefits } from './utils/display-formatters.js'
import { createFeedbackController } from './utils/feedback.js'
import { createErrorDisplay } from './utils/error-display.js'
import { generateRandomCouponCodeStr, createTimeOptions } from './utils/entry-helpers.js'
import { createAdminFormState } from './utils/admin-form-state.js'
import { createAdminSettingsState } from './utils/admin-settings-state.js'
import { createAdminSessionState } from './utils/admin-session-state.js'
import { createAdminShellState } from './utils/admin-shell-state.js'
import { createAdminResourceState } from './utils/admin-resource-state.js'
import { createAdminAuxiliaryState } from './utils/admin-auxiliary-state.js'
import { createAdminInteractionState } from './utils/admin-interaction-state.js'
import { createAdminPageStates } from './utils/admin-page-states.js'
import { createLocalization } from './utils/localization.js'
import { getPassengerTripStatus, getPassengerTripStatusLabel } from './utils/trip-status.js'
import { createAdminSessionActions } from './utils/admin-session.js'
import { createPromotionDisplay } from './utils/promotion-display.js'
import { applyAdminSettings, createAdminSettingsLoader } from './utils/admin-settings-loader.js'
import { createAdminResourceLoader } from './utils/admin-load-orchestrator.js'
import { registerAdminComponents } from './utils/register-admin-components.js'
import { primaryNavigation, createNavigationController, createOverlayController } from './layout/index.js'
const DashboardPage = defineAsyncComponent(() => import('./pages/dashboard/DashboardPage.js').then(module => module.DashboardPage))
const ProjectObservabilityPage = defineAsyncComponent(() => import('./pages/project-observability/ProjectObservabilityPage.js').then(module => module.ProjectObservabilityPage))
const UsersPage = defineAsyncComponent(() => import('./pages/users/UsersPage.js').then(module => module.UsersPage))
const DriversPage = defineAsyncComponent(() => import('./pages/drivers/DriversPage.js').then(module => module.DriversPage))
const DriverVehiclesPage = defineAsyncComponent(() => import('./pages/drivers/DriverVehiclesPage.js').then(module => module.DriverVehiclesPage))
const TripsPage = defineAsyncComponent(() => import('./pages/trips/TripsPage.js').then(module => module.TripsPage))
const SettlementsPage = defineAsyncComponent(() => import('./pages/settlements/SettlementsPage.js').then(module => module.SettlementsPage))
const AddressesPage = defineAsyncComponent(() => import('./pages/addresses/AddressesPage.js').then(module => module.AddressesPage))
const PromotionsPage = defineAsyncComponent(() => import('./pages/promotions/PromotionsPage.js').then(module => module.PromotionsPage))
const MembershipPage = defineAsyncComponent(() => import('./pages/membership/MembershipPage.js').then(module => module.MembershipPage))
const RoutePricingPage = defineAsyncComponent(() => import('./pages/route-pricing/RoutePricingPage.js').then(module => module.RoutePricingPage))
const VehiclesPage = defineAsyncComponent(() => import('./pages/vehicles/VehiclesPage.js').then(module => module.VehiclesPage))
const PaymentsPage = defineAsyncComponent(() => import('./pages/payments/PaymentsPage.js').then(module => module.PaymentsPage))
const FinancePage = defineAsyncComponent(() => import('./pages/finance/FinancePage.js').then(module => module.FinancePage))
const LoginSettingsPage = defineAsyncComponent(() => import('./pages/login-settings/LoginSettingsPage.js').then(module => module.LoginSettingsPage))
const AuditLogsPage = defineAsyncComponent(() => import('./pages/audit-logs/AuditLogsPage.js').then(module => module.AuditLogsPage))
const AdministratorsPage = defineAsyncComponent(() => import('./pages/administrators/AdministratorsPage.js').then(module => module.AdministratorsPage))
const NotificationsPage = defineAsyncComponent(() => import('./pages/notifications/NotificationsPage.js').then(module => module.NotificationsPage))
const SupportPage = defineAsyncComponent(() => import('./pages/support/SupportPage.js').then(module => module.SupportPage))
import { createUsersActions } from './pages/users/users.actions.js'
import { createDriversActions } from './pages/drivers/drivers.actions.js'
import { isEligibleVehicleDriver } from './utils/drivers.js'
import { createTripsActions } from './pages/trips/trips.actions.js'
import { createAddressesActions } from './pages/addresses/addresses.actions.js'
import { createPromotionsActions } from './pages/promotions/promotions.actions.js'
import { createMembershipActions } from './pages/membership/membership.actions.js'
import { createRoutePricingActions } from './pages/route-pricing/route-pricing.actions.js'
import { createVehiclesPageState } from './pages/vehicles/vehicles.state.js'
import { createVehiclesActions } from './pages/vehicles/vehicles.actions.js'
import { createPaymentsPageState } from './pages/payments/payments.state.js'
import { createPaymentsActions } from './pages/payments/payments.actions.js'
import { createFinancePageState } from './pages/finance/finance.state.js'
import { createAdministratorsActions } from './pages/administrators/administrators.actions.js'
import { createNotificationsPageState } from './pages/notifications/notifications.state.js'
import { createNotificationsActions } from './pages/notifications/notifications.actions.js'
import { createServerListState } from './utils/admin-query-state.js'
import { loadAllOptions, retainSelectedOptions } from './utils/admin-remote-options.js'
import './style.css'
import './styles/project-observability.css'

const API = import.meta.env.VITE_API_URL || '/api'
const { token, locale, username, password, currentAdministrator } = createAdminSessionState()
const { t, translateRegion, translateStatus, formatDate, toggleLocale } = createLocalization(locale)
const passengerTripStatusLabel = trip => getPassengerTripStatusLabel(trip, translateStatus)
const displayError = createErrorDisplay({ locale, t })
const { view, mobileNavOpen, loading, error, dashboard, dashboardUpdatedAt, dashboardRefreshFailed } = createAdminShellState()
const vehiclesPageState = createVehiclesPageState()
const vehicleTab = vehiclesPageState.tab
const extraSortId = vehiclesPageState.extraSortId
let loadRequestId = 0
const { exchangeRate, pricingCurrency, settlementCurrency, passengerDefaultCurrency, driverDefaultCurrency, paymentCurrencies, severeWeatherEnabled, adminLogo, supportSettings, paymentSettings } = createAdminSettingsState()
const { users, selectedUser, walletTransactions, topUpWithdrawalHistory, trips, addresses, mainlandCities, addressSearchKeyword, addressSearchResults, addressSearching, categories, vehicles, extras, distancePricing, routeMinimumFares, routeMinimumFareForm, membershipPlans, membershipOrders, promotions, promotionForm, promotionSaving, promotionDeletingId, promotionTogglingId, mileageRules, mileageRewards, mileageAccounts, mileageRewardForm, mileageLedger, mileageSelectedAccount, mileageSaving, invitationSettings, invitationWalletCurrency, invitationSummary, invitationRecords, invitationSaving } = createAdminResourceState()
const { administrators, auditLogs, notifications, notificationTemplates, notificationUsers, notificationDrivers, drivers, selectedDriver } = createAdminAuxiliaryState()
const allVehicles = ref([])
const eligibleVehicleDrivers = computed(() => drivers.value.filter(isEligibleVehicleDriver))
const { orderUrls, createdOrderUrl, tripCatalog, tripVehicleCategoryId, tripQuote, vehicleCategories, tripBookingStep, tripPaymentMethod, tripPaymentAmount, tripUseFareBalance, tripUseCashBalance, tripLocationKeyword, tripOriginKeyword, tripDestinationKeyword, tripLocationResults, tripLocationSearching, tripLocationTarget } = createAdminInteractionState()
const { toasts, confirmDialog, dismissToast, notify, requestConfirmation, resolveConfirmation } = createFeedbackController()
const paymentsPageState = createPaymentsPageState()
const financePageState = createFinancePageState()
watch([pricingCurrency, settlementCurrency, passengerDefaultCurrency, driverDefaultCurrency], () => financePageState.syncCurrencySettings({ pricingCurrency: pricingCurrency.value, settlementCurrency: settlementCurrency.value, passengerDefaultCurrency: passengerDefaultCurrency.value, driverDefaultCurrency: driverDefaultCurrency.value }), { immediate: true })
const { saved: paymentSettingsSaved, raceSaving: driverRaceSaving, configs: paymentConfigs, selectedConfig: selectedPaymentConfig, editorOpen: paymentEditorOpen, editorStep: paymentEditorStep, filter: paymentConfigFilter, testResult: paymentTestResult, openEditor: openPaymentEditor, visibleConfigs: visiblePaymentConfigs, currencyConfigCount } = paymentsPageState
const notificationPageState = createNotificationsPageState(notificationUsers, notificationDrivers)
const notificationRecipientSearch = notificationPageState.recipientSearch
let notificationOptionRequest = 0
const { addressForm, userForm, walletAdjustment, tripForm, selectedTrip, tripDetailLoading, tripDetailError, tripDetailId, dispatchForm, orderUrlForm, administratorForm, notificationForm, notificationTemplateForm, mainlandCityForm, membershipForm, categoryForm, vehicleForm, extraForm, driverForm, settlementForm } = createAdminFormState()
const {
  usersPageState, addressesPageState, promotionsPageState, tripsPageState, settlementsPageState, driversPageState,
  addressRegionFilter, addressCityFilter, totalAddressCount, enabledAddressCount, mainlandAddressCount,
  promotionFilterTab, promotionSearchQuery,
  userPage, userPageSize, userSearchQuery, userStatusFilter, filteredUsers, userPageCount, pagedUsers, goToUserPage,
  tripSearchQuery, tripStatusFilter, tripDateFilter, tripPage, tripPageSize, dispatchSearch, dispatchPage, dispatchPageSize,
  tripDateYear, tripDateMonth, tripDateDay, tripDateYears, tripDateDays, clearTripDateFilter,
  driverFilter, driverTypeFilter, driverSearch, driverFiltersActive, resetDriverFilters
} = createAdminPageStates({ users, addresses, promotions, trips, drivers })
const membershipOrdersState = createServerListState({ pageSize: 20 })
const notificationsState = createServerListState({ pageSize: 10 })
const auditLogsState = createServerListState({ pageSize: 20, filters: { search: '', status: 'all', method: 'all' } })
const canWrite = computed(() => currentAdministrator.value?.role !== 'VIEWER')
const isSuperAdministrator = computed(() => currentAdministrator.value?.role === 'SUPER_ADMIN')
const timeOptions = createTimeOptions()


const { api, usersApi, driversApi, tripsApi, addressesApi, vehiclesApi } = createAdminApi({ baseUrl: API, token, currentAdministrator })
const settingsLoader = createAdminSettingsLoader({ api })
api.onMutation(({ path }) => { if (path === '/settings') settingsLoader.invalidate() })
let load
const loadRequestState = { value: loadRequestId }
const resourceLoader = createAdminResourceLoader({
  api,
  token,
  currentAdministrator,
  view,
  loading,
  error,
  dashboard,
  dashboardUpdatedAt,
  dashboardRefreshFailed,
  loadRequestId: loadRequestState,
  displayError,
  applySettings: applyAdminSettings,
  loadSettings: settingsLoader.load,
  settings: { exchangeRate, pricingCurrency, settlementCurrency, passengerDefaultCurrency, driverDefaultCurrency, paymentCurrencies, severeWeatherEnabled, adminLogo, supportSettings, paymentSettings },
  resourceLoaders: {
    coreUsers: () => import('./utils/admin-resource-loader.js').then(({ loadCoreUsers }) => loadCoreUsers({ usersApi, users, state: usersPageState })),
    drivers: () => import('./utils/admin-resource-loader.js').then(({ loadDriversResources }) => loadDriversResources({ driversApi, vehicleCategories, drivers, allVehicles, state: driversPageState })),
    dispatch: () => import('./utils/admin-resource-loader.js').then(({ loadDispatchResources }) => loadDispatchResources({ tripsApi, driversApi, trips, drivers, orderUrls, state: tripsPageState })),
    settlements: () => import('./utils/admin-resource-loader.js').then(({ loadSettlementResources }) => loadSettlementResources({ tripsApi, driversApi, trips, drivers, query: settlementsPageState.query.value, state: settlementsPageState })),
    trips: () => import('./utils/admin-resource-loader.js').then(({ loadTripsResources }) => loadTripsResources({ tripsApi, usersApi, api, trips, users, state: tripsPageState, tripCatalog })),
    addresses: () => import('./utils/admin-resource-loader.js').then(({ loadAddressResources }) => loadAddressResources({ addressesApi, addresses, mainlandCities, displayMainlandCity, displayError })),
    membership: () => import('./utils/admin-resource-loader.js').then(({ loadMembershipResources }) => loadMembershipResources({ api, membershipPlans, membershipOrders, query: membershipOrdersState.query.value, state: membershipOrdersState })),
    promotions: () => import('./utils/admin-resource-loader.js').then(({ loadPromotionResources }) => loadPromotionResources({ api, promotions, mileageRules, mileageRewards, mileageAccounts, invitationSettings, invitationWalletCurrency, invitationSummary, invitationRecords })),
    administrators: () => import('./utils/admin-resource-loader.js').then(({ loadAdministratorResources }) => loadAdministratorResources({ api, administrators })),
    auditLogs: () => import('./utils/admin-resource-loader.js').then(({ loadAuditLogResources }) => loadAuditLogResources({ api, auditLogs, query: auditLogsState.query.value }).then(result => { auditLogs.value = auditLogsState.apply(result) })),
    notifications: () => import('./utils/admin-resource-loader.js').then(({ loadNotificationResources }) => loadNotificationResources({ api, usersApi, driversApi, notifications, notificationTemplates, notificationUsers, notificationDrivers, search: notificationRecipientSearch.value, query: notificationsState.query.value, state: notificationsState })),
    vehicles: () => import('./utils/admin-resource-loader.js').then(({ loadVehicleResources }) => loadVehicleResources({ api, vehiclesApi, categories, vehicles, extras, distancePricing, sortByOrder })),
    routePricing: () => import('./utils/admin-resource-loader.js').then(({ loadRoutePricingResources }) => loadRoutePricingResources({ api, categories, routeMinimumFares })),
    payments: () => paymentsActions.loadPaymentConfigs()
  }
})
load = resourceLoader.load
usersPageState.setRefresh(() => { if (view.value === 'users') load() })
tripsPageState.setRefresh(() => { if (['trips', 'dispatch'].includes(view.value)) load() })
driversPageState.setRefresh(() => { if (view.value === 'drivers') load() })
settlementsPageState.setRefresh(() => { if (view.value === 'settlements') load() })
watch(membershipOrdersState.page, () => { if (view.value === 'membership') load() }, { flush: 'post' })
watch(notificationsState.page, () => { if (view.value === 'notifications') load() }, { flush: 'post' })
watch(notificationRecipientSearch, async search => {
  if (view.value !== 'notifications') return
  const request = ++notificationOptionRequest
  const [userResult, driverResult] = await Promise.all([
    usersApi.options({ page: 1, pageSize: 20, search }),
    driversApi.options({ page: 1, pageSize: 20, search })
  ])
  if (request !== notificationOptionRequest) return
  notificationUsers.value = retainSelectedOptions(notificationUsers.value, userResult.data, notificationForm.value?.userIds)
  notificationDrivers.value = retainSelectedOptions(notificationDrivers.value, driverResult.data, notificationForm.value?.driverIds)
}, { flush: 'post' })
watch([auditLogsState.page, auditLogsState.search, auditLogsState.status, auditLogsState.method], () => { if (view.value === 'auditLogs') load() }, { flush: 'post' })
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
  error,
  notify
})
const adminSessionActions = createAdminSessionActions({ api, token, username, password, currentAdministrator, error, adminLogo, dashboard, dashboardUpdatedAt, dashboardRefreshFailed, view, load, displayError })
const { apiLogin, logout, uploadAdminLogo, removeAdminLogo } = adminSessionActions
const saveFinanceCurrencySettings = async () => {
  try {
    await financePageState.saveCurrencySettings(api)
    settingsLoader.invalidate()
    await load()
  } catch (e) {
    error.value = displayError(e)
  }
}
const saveFinanceRateSettings = async () => {
  try {
    await financePageState.saveRateSettings(api)
    settingsLoader.invalidate()
    await load()
  } catch (e) {
    error.value = displayError(e)
  }
}
const notificationsActions = createNotificationsActions({ api, notificationForm, notificationRecipientSearch, notificationTemplates, load, error, displayError, notify, requestConfirmation })
const { templateActionId, resetNotification, createTemplate, setTemplateEnabled, removeTemplate, clearNotificationRecipients, toggleNotificationRecipient, notificationRecipientChecked, saveNotification } = notificationsActions
const paymentsActions = createPaymentsActions({ api, paymentSettings, paymentCurrencies, paymentSettingsSaved, driverRaceSaving, error, displayError, configs: paymentConfigs, selectedConfig: selectedPaymentConfig, editorOpen: paymentEditorOpen, editorStep: paymentEditorStep, testResult: paymentTestResult })
const { savePaymentSettings, loadPaymentConfigs, closePaymentEditor, savePaymentConfigDraft, duplicatePaymentConfig, testPaymentConfig } = paymentsActions
const { edit: editUser, reset: resetUser, select: selectUser, save: saveUser, saving: userSaving, updateStatus: updateUserStatus, remove: removeUser, openWalletAdjustment, saveWalletAdjustment } = usersActions
const loadUserOptions = async selectedId => {
  const options = await loadAllOptions(query => usersApi.options(query))
  users.value = retainSelectedOptions(users.value, options, [selectedId])
}
const loadDriverOptions = async selectedId => {
  const options = await loadAllOptions(query => driversApi.options(query))
  drivers.value = retainSelectedOptions(drivers.value, options, [selectedId])
}
const tripsActions = createTripsActions({ api, tripsApi, addressesApi, tripForm, selectedTrip, tripDetailLoading, tripDetailError, tripDetailId, tripQuote, tripVehicleCategoryId, tripBookingStep, tripPaymentMethod, tripPaymentAmount, tripUseFareBalance, tripUseCashBalance, tripLocationKeyword, tripOriginKeyword, tripDestinationKeyword, tripLocationResults, tripLocationSearching, tripLocationTarget, dispatchForm, orderUrlForm, createdOrderUrl, users, trips, error, load, loadUserOptions, loadDriverOptions, displayError, canWrite, requestConfirmation, notify, tripCatalog, dateTimeInput })
const { editTrip, resetTrip, clearTripLocationSearch, searchTripLocation, selectTripLocation, handleTripRegionChange, showTrip, closeTrip, retryTrip, updateTripStatus, settleTrip, unsettleTrip, prepareTripQuote, calculateTripRoute, createPendingTrip, completeTripBooking, saveTrip, openDispatch, saveDispatch, openOrderUrlForm, openOrderUrlExpiryForm, createOrderUrl, closeCreatedOrderUrl, copyOrderUrl, copyExistingOrderUrl, revokeOrderUrl } = tripsActions
const membershipActions = createMembershipActions({ api, membershipForm, membershipPlans, load, error, displayError, requestConfirmation, notify, t })
const { editMembership, resetMembership, saveMembership, removeMembership, confirmMembershipOrder } = membershipActions
const promotionsActions = createPromotionsActions({ api, promotionForm, promotionSaving, promotionDeletingId, promotionTogglingId, pricingCurrency, dateTimeInput, nextTick, load, error, displayError, notify, requestConfirmation, t, generateRandomCouponCodeStr, mileageRules, mileageRewardForm, mileageLedger, mileageSelectedAccount, mileageSaving, invitationSettings, invitationSaving })
const { openPromotionForm, resetPromotion, editPromotion, savePromotion, removePromotion, duplicatePromotion, togglePromotionEnabled, generateRandomCouponCode, resetMileageReward, editMileageReward, saveMileageRules, saveMileageReward, toggleMileageReward, removeMileageReward, openMileageAccount, adjustMileage, saveInvitationSettings } = promotionsActions

const promotionDisplay = createPromotionDisplay({ promotionForm, promotionsPageState, severeWeatherEnabled, extras })
const { promotionDiscountHint, promotionStackingHint, filteredPromotions, toggleWeekday, isWeekdaySelected, setWeekdaysPreset, formatWeekdaysText, formatRouteText, formatTimeRangeText, triggerLabel, triggerSummary, isTriggerActive } = promotionDisplay
const routePricingActions = createRoutePricingActions({ api, pricingCurrency, distancePricing, routeMinimumFareForm, error, load, displayError, requestConfirmation, notify, t })
const { addPricingTier, removePricingTier, syncPreviousTier, syncNextTier, saveDistancePricing, switchPricingCurrency, resetRouteMinimumFare, editRouteMinimumFare, saveRouteMinimumFare, removeRouteMinimumFare } = routePricingActions
const vehiclesActions = createVehiclesActions({ api, vehiclesApi, view, categories, vehicles, extras, distancePricing, routeMinimumFareForm, categoryForm, vehicleForm, extraForm, pricingCurrency, severeWeatherEnabled, extraSortId, load, error, displayError, requestConfirmation, notify, t })
const { editExtra, resetExtra, saveExtra, moveExtra, showOnlyExtra, toggleSevereWeather, removeExtra, editVehicle: editCatalogVehicle, editCategory, resetCategory, resetVehicle, uploadVehicleImage, uploadVehicleLogo, removeVehicleImage, removeVehicleLogo, closeVehicleForm: closeCatalogVehicleForm, saveCategory, toggleCategory, saveVehicle, toggleVehicle, removeCategory, removeVehicle } = vehiclesActions
const addressesActions = createAddressesActions({ addressesApi, addresses, addressForm, mainlandCities, mainlandCityForm, addressSearchKeyword, addressSearchResults, addressSearching, error, load, displayError, displayMainlandCity, apiMainlandCity, displayPlaceName, requestConfirmation, notify, t })
const { editAddress, resetAddress, searchAddressPlaces, handleAddressRegionChange, handleAddressCityChange, selectAddressSearchResult, saveAddress, removeAddress, resetMainlandCity, editMainlandCity, saveMainlandCity, removeMainlandCity } = addressesActions
const driverActions = createDriversActions({ driversApi, driverForm, selectedDriver, settlementForm, drivers, allVehicles, error, load, displayError, requestConfirmation, notify })
const { reviewStatusLabel, resetDriver, editDriver, closeDriverForm, formatDriverHongKongPlate, formatDriverMacauPlate, formatDriverMainlandPlate, changeDriverOwnership, uploadDriverPhotos, removeDriverPhoto, saveDriver, updateDriverStatus, removeDriver, openDriverDetail, previewDriver, closeDriverDetail, approveDriver, requestDriverRevision, rejectDriver, resetSettlement, saveSettlement, refreshDriverVehicles, loadDriverTrips, driverTrips, driverTripsLoading, driverTripsError, driverTripsPage, driverTripsTotal, driverTripsPageCount, updateVehicleStatus, removeVehicle: removeDriverVehicle, vehicleForm: driverVehicleForm, resetVehicleForm, editVehicle: editDriverVehicle, closeVehicleForm, changeVehicleOwnership: changeDriverVehicleOwnership, uploadVehiclePhoto, saveVehicle: saveDriverVehicle, manageVehicleAssignments, closeVehicleAssignments, bindVehicleDriver, setPrimaryVehicle, unbindVehicleDriver, vehicleAssignments, assignmentVehicle } = driverActions
const administratorsActions = createAdministratorsActions({ api, administratorForm, load, error, displayError, requestConfirmation, notify })
const { resetAdministrator, editAdministrator, saveAdministrator, disableAdministrator, unlockAdministrator, revokeAdministratorSessions } = administratorsActions
const filteredDrivers = driversPageState.filtered
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
const settlementSearchQuery = settlementsPageState.searchQuery
const settlementStatusFilter = settlementsPageState.statusFilter
const settlementPage = settlementsPageState.page
const settlementMethods = settlementsPageState.methods
const eligibleSettlements = settlementsPageState.eligible
const filteredSettlements = settlementsPageState.filtered
const pagedSettlements = settlementsPageState.paged
const settlementPageCount = settlementsPageState.pageCount
const settledSettlements = settlementsPageState.settled
const unsettledSettlements = settlementsPageState.unsettled
const openSettlementDetail = settlementsPageState.openDetail
const closeSettlementDetail = settlementsPageState.closeDetail
const selectedSettlementTrip = settlementsPageState.selectedTrip
const goToSettlementPage = settlementsPageState.goToPage
const settlementDriverFor = settlementsPageState.driverFor
const formatSettlementTotal = settlementsPageState.formatTotal

const title = computed(() => t(view.value))
const filteredAddresses = addressesPageState.filtered

const App = { setup() {
  const navigate = createNavigationController({ view, load })
  const visiblePrimaryNavigation = computed(() => primaryNavigation.filter(item => !item.superAdminOnly || isSuperAdministrator.value))
  const activePageComponent = computed(() => ({
    dashboard: 'DashboardPage',
    'project-observability': 'ProjectObservabilityPage',
    users: 'UsersPage',
    drivers: 'DriversPage',
    dispatch: 'DriversPage',
    'driver-vehicles': 'DriverVehiclesPage',
    trips: 'TripsPage',
    settlements: 'SettlementsPage',
    addresses: 'AddressesPage',
    promotions: 'PromotionsPage',
    membership: 'MembershipPage',
    'route-pricing': 'RoutePricingPage',
    vehicles: 'VehiclesPage',
    notifications: 'NotificationsPage',
    support: 'SupportPage',
    administrators: 'AdministratorsPage',
    auditLogs: 'AuditLogsPage',
    finance: 'FinancePage',
    payments: 'PaymentsPage',
    'login-settings': 'LoginSettingsPage'
  })[view.value] || 'DashboardPage')
  createOverlayController({ confirmDialog, createdOrderUrl, orderUrlForm, dispatchForm, tripForm, selectedTrip, selectedUser, closeCreatedOrderUrl, closeTrip })
  onMounted(() => {
    load()
  })
  const userNavigation = target => navigate(target)
  const setVehicleView = tab => {
    vehicleTab.value = tab
    return navigate('vehicles')
  }
   // Domain contexts are provided independently; the legacy aggregate context is no longer exposed.
   provide('adminPaymentsContext', {
     view,
     t,
     canWrite,
     paymentSettings,
     paymentSettingsSaved,
     paymentConfigs,
     selectedPaymentConfig,
     paymentEditorOpen,
     paymentEditorStep,
     paymentConfigFilter,
     paymentTestResult,
     visiblePaymentConfigs,
     currencyConfigCount,
     openPaymentEditor,
     closePaymentEditor,
     savePaymentConfigDraft,
     duplicatePaymentConfig,
     testPaymentConfig,
     savePaymentSettings
   })
   provide('adminFinanceContext', {
     view,
     api,
     ...financePageState,
     saveFinanceCurrencySettings,
     saveFinanceRateSettings
   })
   // 登入配置頁（分配層：登入方式管理／配置層：短信、微信、Apple）的所有寫入與測試端點
   // 後端僅允許 SUPER_ADMIN，故 canWrite 在此綁定 isSuperAdministrator 而非全域
   // 「非 VIEWER 可寫」的 canWrite，讓 OPERATOR 在此頁看到的可編輯狀態與後端實際權限一致（唯讀）。
   provide('adminLoginSettingsContext', {
    view,
    t,
    canWrite: isSuperAdministrator,
    api
  })

   provide('adminNotificationsContext', {
     view,
     t,
     formatDate,
     canWrite,
     notifications,
     notificationTemplates,
     templateActionId,
     notificationForm,
     notificationTemplateForm,
     notificationRecipientSearch,
     notificationTotal: notificationsState.total,
     notificationPage: notificationsState.page,
     notificationPageCount: notificationsState.pageCount,
     goToNotificationPage: notificationsState.goToPage,
     filteredNotificationUsers,
     filteredNotificationDrivers,
     resetNotification,
     createTemplate,
     setTemplateEnabled,
     removeTemplate,
     clearNotificationRecipients,
     toggleNotificationRecipient,
     notificationRecipientChecked,
     saveNotification
   })
   provide('adminSupportContext', {
     view,
     api,
     canWrite,
     isSuperAdministrator,
     supportSettings,
     settingsLoader,
     notify,
     displayError,
     load
   })
   provide('adminMembershipContext', {
     view,
     membershipPlans,
     membershipOrders,
     membershipOrderTotal: membershipOrdersState.total,
     membershipOrderSummary: membershipOrdersState.summary,
     membershipOrderPage: membershipOrdersState.page,
     membershipOrderPageCount: membershipOrdersState.pageCount,
     goToMembershipOrderPage: membershipOrdersState.goToPage,
     membershipForm,
     resetMembership,
     editMembership,
     saveMembership,
     removeMembership,
     confirmMembershipOrder,
     formatBenefits
   })
   provide('adminPromotionsContext', {
     view,
     t,
     canWrite,
     pricingCurrency,
     promotions,
     promotionSection: promotionsPageState.section,
     promotionForm,
     promotionSaving,
     promotionDeletingId,
     promotionTogglingId,
     promotionFilterTab,
     promotionSearchQuery,
     filteredPromotions,
     resetPromotion,
     editPromotion,
     savePromotion,
     removePromotion,
     duplicatePromotion,
     togglePromotionEnabled,
     promotionKindLabel,
     promotionDiscountLabel,
     promotionDiscountHint,
     promotionStackingHint,
     generateRandomCouponCode,
     toggleWeekday,
     isWeekdaySelected,
     setWeekdaysPreset,
     formatWeekdaysText,
     formatRouteText,
     formatTimeRangeText,
     formatDate,
     mileageRules,
     mileageRewards,
     mileageAccounts,
     mileageRewardForm,
     mileageLedger,
     mileageSelectedAccount,
     mileageSearchQuery: promotionsPageState.mileageSearchQuery,
     mileageSaving,
     resetMileageReward,
     editMileageReward,
     saveMileageRules,
     saveMileageReward,
     toggleMileageReward,
     removeMileageReward,
     openMileageAccount,
     adjustMileage,
     invitationSettings,
     invitationWalletCurrency,
     invitationSummary,
     invitationRecords,
     invitationSaving,
     invitationSearchQuery: promotionsPageState.invitationSearchQuery,
     invitationStatusFilter: promotionsPageState.invitationStatusFilter,
     saveInvitationSettings
   })
   provide('adminAccessContext', {
     view,
     t,
     formatDate,
     canWrite,
     currentAdministrator,
     administrators,
     administratorForm,
     auditLogs,
     auditTotal: auditLogsState.total,
     auditSummary: auditLogsState.summary,
     auditPage: auditLogsState.page,
     auditPageCount: auditLogsState.pageCount,
     auditSearch: auditLogsState.search,
     auditStatusFilter: auditLogsState.status,
     auditMethodFilter: auditLogsState.method,
     refreshAuditLogs: load,
     resetAdministrator,
     editAdministrator,
     saveAdministrator,
     disableAdministrator,
     unlockAdministrator,
     revokeAdministratorSessions
   })
   provide('adminVehiclePricingContext', {
     view,
     navigate,
     t,
     canWrite,
     timeOptions,
     formatDate,
     vehicleTab,
     categories,
     vehicles,
     extras,
     pricingCurrency,
     distancePricing,
     routeMinimumFares,
     routeMinimumFareForm,
     categoryForm,
     vehicleForm,
     extraForm,
     extraSortId,
     triggerLabel,
     triggerSummary,
     isTriggerActive,
     showOnlyExtra,
     resetCategory,
     editCategory,
     saveCategory,
     toggleCategory,
     removeCategory,
     resetVehicle,
     editVehicle: editCatalogVehicle,
     uploadVehicleImage,
     uploadVehicleLogo,
     removeVehicleImage,
     removeVehicleLogo,
     closeVehicleForm: closeCatalogVehicleForm,
     vehicleImageUrl: vehiclesApi.imageUrl,
     vehicleLogoUrl: vehiclesApi.logoUrl,
     saveVehicle,
     toggleVehicle,
     removeVehicle,
     resetExtra,
     editExtra,
     saveExtra,
     moveExtra,
     removeExtra,
     addPricingTier,
     removePricingTier,
     syncPreviousTier,
     syncNextTier,
     saveDistancePricing,
     switchPricingCurrency,
     resetRouteMinimumFare,
     editRouteMinimumFare,
     saveRouteMinimumFare,
     removeRouteMinimumFare
   })
   provide('adminUsersContext', {
     view,
     t,
     formatDate,
     translateStatus,
     canWrite,
     users,
     total: usersPageState.total,
     summary: usersPageState.summary,
     selectedUser,
     walletTransactions,
     topUpWithdrawalHistory,
     walletAdjustment,
     userForm,
     userSaving,
     userPage,
     userPageSize,
     userPageCount,
     pagedUsers,
     filteredUsers,
     userSearchQuery,
     userStatusFilter,
     resetUser,
     editUser,
     selectUser,
     saveUser,
     updateUserStatus,
     removeUser,
     openWalletAdjustment,
     saveWalletAdjustment,
     goToUserPage
   })
   provide('adminUsersAddressesContext', {
     view,
     t,
     formatDate,
     translateStatus,
     canWrite,
     addressForm,
     addresses,
     mainlandCities,
     mainlandCityForm,
     addressRegionFilter,
     addressCityFilter,
     totalCount: totalAddressCount,
     enabledCount: enabledAddressCount,
     mainlandCount: mainlandAddressCount,
     filteredAddresses,
     addressSearchKeyword,
     addressSearchResults,
     addressSearching,
     displayMainlandCity,
     resetAddress,
     editAddress,
     searchAddressPlaces,
     selectAddressSearchResult,
     handleAddressRegionChange,
     handleAddressCityChange,
     saveAddress,
     removeAddress,
     resetMainlandCity,
     editMainlandCity,
     saveMainlandCity,
     removeMainlandCity
   })
   provide('adminDriversContext', {
     view,
     t,
     formatDate,
     formatOrderNumber,
     translateStatus,
     passengerTripStatusLabel,
     getPassengerTripStatus,
     canWrite,
     load,
     navigate,
     trips,
     users,
     dispatchForm,
     orderUrlForm,
     orderUrls,
     createdOrderUrl,
     dispatchSearch,
     dispatchPage,
     dispatchPageSize,
     dispatchPageCount,
     dispatchFilteredTrips,
     pagedDispatchTrips,
     goToDispatchPage,
     openDispatch,
     saveDispatch,
     openOrderUrlForm,
     openOrderUrlExpiryForm,
     createOrderUrl,
     copyOrderUrl,
     copyExistingOrderUrl,
     closeCreatedOrderUrl,
     revokeOrderUrl,
     paymentSettings,
     driverRaceSaving,
     paymentSettingsSaved,
     savePaymentSettings,
     drivers,
     dispatchTotal: tripsPageState.dispatchTotal,
     dispatchSummary: tripsPageState.dispatchSummary,
     driverTotal: driversPageState.total,
     driversPage: driversPageState.page,
     driversPageCount: driversPageState.pageCount,
     goToDriversPage: driversPageState.goToPage,
     driverSummary: driversPageState.summary,
     vehicleCategories,
     selectedDriver,
     driverTrips,
     driverTripsLoading,
     driverTripsError,
     driverTripsPage,
     driverTripsTotal,
     driverTripsPageCount,
     loadDriverTrips,
     driverForm,
     settlementForm,
     driverFilter,
     driverTypeFilter,
     driverSearch,
     driverFiltersActive,
     filteredDrivers,
     resetDriverFilters,
     reviewStatusLabel,
     resetDriver,
     editDriver,
     closeDriverForm,
     formatDriverHongKongPlate,
     formatDriverMacauPlate,
     formatDriverMainlandPlate,
     changeDriverOwnership,
     uploadDriverPhotos,
     removeDriverPhoto,
     saveDriver,
     updateDriverStatus,
     removeDriver,
     previewDriver,
     openDriverDetail,
     closeDriverDetail,
     approveDriver,
     requestDriverRevision,
     rejectDriver,
     resetSettlement,
     saveSettlement,
     refreshDriverVehicles,
     updateVehicleStatus,
     removeVehicle: removeDriverVehicle,
     vehicleForm: driverVehicleForm,
     resetVehicleForm,
     editVehicle: editDriverVehicle,
     closeVehicleForm,
     changeVehicleOwnership: changeDriverVehicleOwnership,
     uploadVehiclePhoto,
     saveVehicle: saveDriverVehicle,
     saveDriverVehicle
    })
   provide('adminDriverVehiclesContext', {
      view,
      canWrite,
      vehicles: computed(() => allVehicles.value.map(vehicle => ({ ...vehicle, driverName: vehicle.assignments?.map(item => item.driver?.name).filter(Boolean).join('、') || '—' }))),
      drivers,
      vehicleCategories,
      vehicleForm: driverVehicleForm,
      resetVehicleForm,
      closeVehicleForm,
      changeVehicleOwnership: changeDriverVehicleOwnership,
      uploadVehiclePhoto,
      saveVehicle: saveDriverVehicle,
      refresh: () => load(),
      loadVehiclePhotoThumbnail: id => driversApi.vehiclePhotoThumbnailByVehicle(id, { cancelOnNavigate: false }),
      loadVehiclePhoto: id => driversApi.vehiclePhotoByVehicle(id, { cancelOnNavigate: false }),
      openFirstVehicleForm: () => { resetVehicleForm(); view.value = 'driver-vehicles' },
      updateVehicleStatus,
      removeVehicle: removeDriverVehicle,
      assignmentVehicle,
      vehicleAssignments,
      manageVehicleAssignments,
      closeVehicleAssignments,
      bindVehicleDriver,
      setPrimaryVehicle,
      unbindVehicleDriver,
      availableDrivers: eligibleVehicleDrivers,
      editVehicleFromRegistry: vehicle => { editDriverVehicle(vehicle); view.value = 'driver-vehicles' },
      openDriver: driverId => { view.value = 'drivers'; const driver = drivers.value.find(item => item.id === driverId); if (driver) openDriverDetail(driver) }
    })

   provide('adminProjectObservabilityContext', {
     view,
     baseUrl: API,
     api,
     isSuperAdministrator
   })
   provide('adminDashboardContext', {
     view,
     isSuperAdministrator,
     loading,
     error,
     dashboard,
     dashboardUpdatedAt,
     dashboardRefreshFailed,
     adminLogo,
     t,
     formatDate,
     navigate,
     uploadAdminLogo,
     removeAdminLogo
   })
   provide('adminTripsContext', {
     view,
     t,
     canWrite,
     formatDate,
     formatOrderNumber,
     formatTripAddress,
     formatTripAmount,
     paymentMethodLabel,
     translateRegion,
     translateStatus,
     promotionKindLabel,
     passengerTripStatusLabel,
     getPassengerTripStatus,
     trips,
     tripTotal: tripsPageState.total,
     tripSummary: tripsPageState.summary,
     users,
     tripForm,
     tripCatalog,
     tripVehicleCategoryId,
     selectedTrip,
     tripDetailLoading,
     tripDetailError,
     tripDetailId,
     tripQuote,
     tripSearchQuery,
     tripStatusFilter,
     tripDateFilter,
     tripPage,
     tripPageSize,
     tripPageCount,
     pagedTrips,
     tripDateYear,
     tripDateMonth,
     tripDateDay,
     tripDateYears,
     tripDateDays,
     filteredTrips,
     tripLocationKeyword,
     tripOriginKeyword,
     tripDestinationKeyword,
     tripLocationResults,
     tripLocationSearching,
     tripLocationTarget,
     tripPaymentMethod,
     tripPaymentAmount,
     tripUseFareBalance,
     tripUseCashBalance,
     resetTrip,
     editTrip,
     showTrip,
     closeTrip,
     retryTrip,
     saveTrip,
     updateTripStatus,
     settleTrip,
     unsettleTrip,
     selectTripLocation,
     searchTripLocation,
     handleTripRegionChange,
     calculateTripRoute,
     prepareTripQuote,
     createPendingTrip,
     completeTripBooking,
     goToTripPage,
     dispatchForm,
     orderUrlForm,
     orderUrls,
     createdOrderUrl,
     dispatchSearch,
     dispatchPage,
     dispatchPageSize,
     dispatchPageCount,
     dispatchFilteredTrips,
     pagedDispatchTrips,
     goToDispatchPage,
     openDispatch,
     saveDispatch,
     openOrderUrlForm,
     openOrderUrlExpiryForm,
     createOrderUrl,
     copyOrderUrl,
     copyExistingOrderUrl,
     closeCreatedOrderUrl,
     revokeOrderUrl
   })
   provide('adminSettlementsContext', {
     view,
     canWrite,
     load,
     formatDate,
     formatOrderNumber,
     settlementSearchQuery,
     settlementStatusFilter,
     settlementPage,
     settlementMethods,
     pricingCurrency,
     paymentSettings,
     settlementCurrency,
     paymentCurrencies,
     paymentSettingsSaved,
     savePaymentSettings,
     eligibleSettlements,
     filteredSettlements,
     pagedSettlements,
     settlementPageCount,
     settlementTotal: settlementsPageState.total,
     settlementSummary: settlementsPageState.summary,
     settledSettlements,
     unsettledSettlements,
     selectedSettlementTrip,
     openSettlementDetail,
     closeSettlementDetail,
     goToSettlementPage,
     settlementDriverFor,
     formatSettlementTotal,
     settleTrip,
     unsettleTrip
   })
    return {
      token,
      locale,
      view,
      vehicleTab,
      mobileNavOpen,
      navigate,
      setVehicleView,
      activePageComponent,
      title,
      exchangeRate,
      adminLogo,
      currentAdministrator,
      isSuperAdministrator,
      canWrite,
      error,
      username,
      password,
      apiLogin,
      logout,
      load,
      t,
      toggleLocale,
      toasts,
      dismissToast,
      confirmDialog,
      resolveConfirmation
    }
 }, template: `<ToastHost :items="toasts" @dismiss="dismissToast" /><ConfirmDialog v-bind="confirmDialog" @confirm="resolveConfirmation(true)" @cancel="resolveConfirmation(false)" /><div v-if="!token" class="login"><button type="button" class="login-language" @click="toggleLocale" :aria-label="t('languageLabel')">中 / EN</button><div class="login-orb login-orb-one"></div><div class="login-orb login-orb-two"></div><form @submit.prevent="apiLogin"><div class="brand"><img v-if="adminLogo" :src="adminLogo" width="180" height="56" alt="Admin logo"/><span v-else>{{t('brand')}}</span></div><h1>{{t('welcome')}}</h1><p>{{t('signInPrompt')}}</p><input v-model="username" :placeholder="t('adminUsername')" autocomplete="username" required/><input v-model="password" type="password" :placeholder="t('password')" autocomplete="current-password" required/><button type="submit">{{t('signIn')}}</button><small v-if="error">{{error}}</small></form><footer class="login-footer">© 2026 IM MASTER INC. LIMITED All Rights Reserved.</footer></div><div v-else class="shell"><aside :class="{ 'mobile-nav-open': mobileNavOpen }"><div class="brand"><img v-if="adminLogo" :src="adminLogo" width="180" height="56" alt="Admin logo"/><span v-else>{{t('brand')}}</span></div><button type="button" class="mobile-nav-toggle" :aria-expanded="mobileNavOpen ? 'true' : 'false'" aria-controls="admin-navigation" @click="mobileNavOpen = !mobileNavOpen"><span aria-hidden="true">☰</span><span>{{mobileNavOpen ? '關閉選單' : '開啟選單'}}</span></button><nav id="admin-navigation">
  <button type="button" :class="{active:view==='dashboard'}" @click="navigate('dashboard')">{{t('dashboard')}}</button>
  <button type="button" :class="{active:view==='project-observability'}" @click="navigate('project-observability')">數據流監控</button>
  <button type="button" :class="{active:view==='users'}" @click="navigate('users')">{{t('users')}}</button>
  <div class="nav-group"><button class="nav-group-toggle" type="button">{{t('drivers')}} <span>⌄</span></button><div class="nav-group-items"><button type="button" :class="{active:view==='drivers'}" @click="navigate('drivers')">{{t('drivers')}}</button><button type="button" :class="{active:view==='driver-vehicles'}" @click="navigate('driver-vehicles')">車輛管理</button></div></div>
  <button type="button" :class="{active:view==='trips'}" @click="navigate('trips')">{{t('trips')}}</button>
  <button type="button" :class="{active:view==='dispatch'}" @click="navigate('dispatch')">{{t('dispatch')}}</button>
  <button type="button" :class="{active:view==='settlements'}" @click="navigate('settlements')">{{t('settlements')}}</button>
  <button type="button" :class="{active:view==='addresses'}" @click="navigate('addresses')">{{t('addresses')}}</button>
  <button type="button" :class="{active:view==='vehicles'||view==='route-pricing'}" @click="setVehicleView(vehicleTab === 'route-pricing' ? 'catalog' : vehicleTab)">車型與定價</button>
  <button type="button" :class="{active:view==='membership'}" @click="navigate('membership')">{{t('membership')}}</button>
  <button type="button" :class="{active:view==='promotions'}" @click="navigate('promotions')">優惠設定</button>
  <button type="button" :class="{active:view==='payments'}" @click="navigate('payments')">{{t('paymentSettings')}}</button>
  <button type="button" :class="{active:view==='finance'}" @click="navigate('finance')">財務管理中心</button>
  <button type="button" :class="{active:view==='login-settings'}" @click="navigate('login-settings')">{{t('loginSettings')}}</button>
  <button type="button" :class="{active:view==='notifications'}" @click="navigate('notifications')">消息推送</button>
  <button type="button" :class="{active:view==='support'}" @click="navigate('support')">客服管理</button>
  <button type="button" v-if="isSuperAdministrator" :class="{active:view==='administrators'}" @click="navigate('administrators')">{{t('administrators')}}</button>
  <button type="button" v-if="isSuperAdministrator" :class="{active:view==='auditLogs'}" @click="navigate('auditLogs')">{{t('auditLogs')}}</button>
  <button type="button" class="logout logout-mobile" @click="logout">{{t('signOut')}}</button>
</nav><div v-if="currentAdministrator" class="admin-identity"><b>{{currentAdministrator.displayName}}</b><span>{{currentAdministrator.role}}</span></div><button type="button" class="logout logout-desktop" @click="logout">{{t('signOut')}}</button>
</aside><main :class="{readonly: !canWrite}"><header><div v-if="view==='dashboard'"><span class="eyebrow">{{t('dashboardConsoleLabel')}}</span><h1>{{t('dashboardPageTitle')}}</h1></div><div v-else class="page-header-spacer" aria-hidden="true"></div><div class="header-actions"><span v-if="!canWrite" class="readonly-badge">唯讀模式</span><template v-if="view==='dashboard'"><button type="button" class="language-toggle" @click="toggleLocale" :aria-label="t('languageLabel')">中 / EN</button><button type="button" class="refresh" :disabled="loading" @click="load">↻ {{loading ? t('loading') : t('refresh')}}</button></template></div></header><div v-if="error" class="error">{{error}}</div><KeepAlive><component :is="activePageComponent" /></KeepAlive></main></div>` }
const app = createApp(App)
registerAdminComponents(app, {
  UsersPage,
  DriversPage,
  DriverVehiclesPage,
  TripsPage,
  SettlementsPage,
  DashboardPage,
  AddressesPage,
  ProjectObservabilityPage,
  PromotionsPage,
  MembershipPage,
  RoutePricingPage,
  VehiclesPage,
  PaymentsPage,
  FinancePage,
  LoginSettingsPage,
  AuditLogsPage,
  AdministratorsPage,
  NotificationsPage,
  SupportPage,
  LoadingState,
  ErrorState,
  ToastHost,
  ConfirmDialog,
  AdminDatePicker,
  AdminDateTimePicker,
  AdminTimePicker,
  AdminSelect,
  AdminCheckbox,
  DriverReviewActions,
  VehiclePhotoViewer,
  LazyVehiclePhotoViewer
})
app.mount('#app')
