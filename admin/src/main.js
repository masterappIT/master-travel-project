import { createApp, computed, nextTick, onMounted, watch, provide } from 'vue'
import { createAdminApi } from './utils/admin-api.js'
import { LoadingState, ErrorState, ToastHost, ConfirmDialog } from './components/index.js'
import { DriverReviewActions } from './components/DriverReviewActions.js'
import { VehiclePhotoViewer } from './components/VehiclePhotoViewer.js'
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
import { getPassengerTripStatus, getPassengerTripStatusLabel } from './utils/trip-status.js'
import { createAdminSessionActions } from './utils/admin-session.js'
import { createPromotionDisplay } from './utils/promotion-display.js'
import { applyAdminSettings } from './utils/admin-settings-loader.js'
import { createAdminResourceLoader } from './utils/admin-load-orchestrator.js'
import { registerAdminComponents } from './utils/register-admin-components.js'
import { primaryNavigation, operationsNavigation, createNavigationController, createOverlayController } from './layout/index.js'
import { UsersPage } from './pages/users/UsersPage.js'
import { createUsersActions } from './pages/users/users.actions.js'
import { DriversPage } from './pages/drivers/DriversPage.js'
import { DriverVehiclesPage } from './pages/drivers/DriverVehiclesPage.js'
import { createDriversActions } from './pages/drivers/drivers.actions.js'
import { TripsPage } from './pages/trips/TripsPage.js'
import { createTripsActions } from './pages/trips/trips.actions.js'
import { SettlementsPage } from './pages/settlements/SettlementsPage.js'
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
import { ChartersPage } from './pages/charters/ChartersPage.js'
import { DashboardPage } from './pages/dashboard/DashboardPage.js'
import './style.css'

const API = import.meta.env.VITE_API_URL || '/api'
const { token, locale, username, password, currentAdministrator } = createAdminSessionState()
const { t, translateRegion, translateStatus, formatDate, toggleLocale } = createLocalization(locale)
const passengerTripStatusLabel = trip => getPassengerTripStatusLabel(trip, translateStatus)
const displayError = createErrorDisplay({ locale, t })
const { view, mobileNavOpen, loading, error, dashboard } = createAdminShellState()
const vehiclesPageState = createVehiclesPageState()
const vehicleTab = vehiclesPageState.tab
const extraSortId = vehiclesPageState.extraSortId
let loadRequestId = 0
const { exchangeRate, pricingCurrency, severeWeatherEnabled, adminLogo, paymentSettings } = createAdminSettingsState()
const { users, selectedUser, walletTransactions, topUpWithdrawalHistory, trips, charterOrders, addresses, mainlandCities, addressSearchKeyword, addressSearchResults, addressSearching, categories, vehicles, extras, distancePricing, routeMinimumFares, routeMinimumFareForm, membershipPlans, membershipOrders, promotions, promotionForm, promotionSaving, promotionDeletingId, promotionTogglingId, mileageRules, mileageRewards, mileageAccounts, mileageRewardForm, mileageLedger, mileageSelectedAccount, mileageSaving, invitationSettings, invitationWalletCurrency, invitationSummary, invitationRecords, invitationSaving } = createAdminResourceState()
const { administrators, auditLogs, notifications, notificationTemplates, notificationUsers, notificationDrivers, personnel, entryItems, drivers, selectedDriver, expenseItems } = createAdminAuxiliaryState()
const { orderUrls, createdOrderUrl, tripCatalog, tripQuote, vehicleCategories, tripBookingStep, tripPaymentMethod, tripUseFareBalance, tripUseCashBalance, tripLocationKeyword, tripLocationResults, tripLocationSearching, tripLocationTarget } = createAdminInteractionState()
const { toasts, confirmDialog, dismissToast, notify, requestConfirmation, resolveConfirmation } = createFeedbackController()
const paymentsPageState = createPaymentsPageState()
const paymentSettingsSaved = paymentsPageState.saved
const driverRaceSaving = paymentsPageState.raceSaving
const notificationPageState = createNotificationsPageState(notificationUsers, notificationDrivers)
const notificationRecipientSearch = notificationPageState.recipientSearch
const { addressForm, userForm, walletAdjustment, tripForm, selectedTrip, dispatchForm, orderUrlForm, charterForm, administratorForm, notificationForm, notificationTemplateForm, mainlandCityForm, membershipForm, categoryForm, vehicleForm, extraForm, personnelForm, driverForm, settlementForm, entryForm, expenseForm } = createAdminFormState()
const {
  usersPageState, addressesPageState, promotionsPageState, tripsPageState, settlementsPageState, driversPageState, operationsPageState,
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
  loadRequestId: loadRequestState,
  displayError,
  applySettings: applyAdminSettings,
  settings: { exchangeRate, pricingCurrency, severeWeatherEnabled, adminLogo, paymentSettings },
  resourceLoaders: {
    coreUsers: () => import('./utils/admin-resource-loader.js').then(({ loadCoreUsers }) => loadCoreUsers({ usersApi, users })),
    drivers: () => import('./utils/admin-resource-loader.js').then(({ loadDriversResources }) => loadDriversResources({ driversApi, vehicleCategories, drivers })),
    dispatch: () => import('./utils/admin-resource-loader.js').then(({ loadDispatchResources }) => loadDispatchResources({ tripsApi, driversApi, trips, drivers, orderUrls, tripPage })),
    settlements: () => import('./utils/admin-resource-loader.js').then(({ loadSettlementResources }) => loadSettlementResources({ tripsApi, driversApi, trips, drivers })),
    trips: () => import('./utils/admin-resource-loader.js').then(({ loadTripsResources }) => loadTripsResources({ tripsApi, driversApi, api, trips, drivers, tripPage, tripCatalog })),
    charters: () => import('./utils/admin-resource-loader.js').then(({ loadCharterResources }) => loadCharterResources({ api, charterOrders })),
    addresses: () => import('./utils/admin-resource-loader.js').then(({ loadAddressResources }) => loadAddressResources({ addressesApi, addresses, mainlandCities, displayMainlandCity, displayError })),
    membership: () => import('./utils/admin-resource-loader.js').then(({ loadMembershipResources }) => loadMembershipResources({ api, membershipPlans, membershipOrders })),
    promotions: () => import('./utils/admin-resource-loader.js').then(({ loadPromotionResources }) => loadPromotionResources({ api, promotions, mileageRules, mileageRewards, mileageAccounts, invitationSettings, invitationWalletCurrency, invitationSummary, invitationRecords })),
    administrators: () => import('./utils/admin-resource-loader.js').then(({ loadAdministratorResources }) => loadAdministratorResources({ api, administrators })),
    notifications: () => import('./utils/admin-resource-loader.js').then(({ loadNotificationResources }) => loadNotificationResources({ api, usersApi, driversApi, notifications, notificationTemplates, notificationUsers, notificationDrivers })),
    vehicles: () => import('./utils/admin-resource-loader.js').then(({ loadVehicleResources }) => loadVehicleResources({ api, categories, vehicles, extras, distancePricing, sortByOrder })),
    routePricing: () => import('./utils/admin-resource-loader.js').then(({ loadRoutePricingResources }) => loadRoutePricingResources({ api, categories, routeMinimumFares }))
  }
})
load = resourceLoader.load
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
const adminSessionActions = createAdminSessionActions({ api, token, username, password, currentAdministrator, error, exchangeRate, adminLogo, view, load, displayError })
const { apiLogin, logout, saveExchangeRate, uploadAdminLogo, removeAdminLogo } = adminSessionActions
const notificationsActions = createNotificationsActions({ api, notificationForm, notificationRecipientSearch, notificationTemplates, load, error, displayError })
const { resetNotification, createTemplate, clearNotificationRecipients, toggleNotificationRecipient, notificationRecipientChecked, saveNotification } = notificationsActions
const paymentsActions = createPaymentsActions({ api, paymentSettings, paymentSettingsSaved, driverRaceSaving, error, displayError })
const { savePaymentSettings } = paymentsActions
const { updateCharterStatus, editCharter, saveCharter } = createCharterActions({ api, charterForm, load, error, displayError, dateTimeInput })
const { edit: editUser, reset: resetUser, select: selectUser, save: saveUser, updateStatus: updateUserStatus, remove: removeUser, openWalletAdjustment, saveWalletAdjustment } = usersActions
const tripsActions = createTripsActions({ api, tripsApi, addressesApi, tripForm, selectedTrip, tripQuote, tripBookingStep, tripPaymentMethod, tripUseFareBalance, tripUseCashBalance, tripLocationKeyword, tripLocationResults, tripLocationSearching, tripLocationTarget, dispatchForm, orderUrlForm, createdOrderUrl, users, trips, error, load, displayError, canWrite, requestConfirmation, notify, tripCatalog, dateTimeInput })
const { editTrip, resetTrip, clearTripLocationSearch, searchTripLocation, selectTripLocation, handleTripRegionChange, showTrip, closeTrip, updateTripStatus, settleTrip, unsettleTrip, prepareTripQuote, calculateTripRoute, completeTripBooking, saveTrip, confirmDispatch, openDispatch, saveDispatch, openOrderUrlForm, createOrderUrl, closeCreatedOrderUrl, copyOrderUrl, revokeOrderUrl } = tripsActions
const membershipActions = createMembershipActions({ api, membershipForm, membershipPlans, load, error, displayError, requestConfirmation, notify, t })
const { editMembership, resetMembership, saveMembership, removeMembership, confirmMembershipOrder } = membershipActions
const promotionsActions = createPromotionsActions({ api, promotionForm, promotionSaving, promotionDeletingId, promotionTogglingId, pricingCurrency, dateTimeInput, nextTick, load, error, displayError, notify, requestConfirmation, t, generateRandomCouponCodeStr, mileageRules, mileageRewardForm, mileageLedger, mileageSelectedAccount, mileageSaving, invitationSettings, invitationSaving })
const { openPromotionForm, resetPromotion, editPromotion, savePromotion, removePromotion, duplicatePromotion, togglePromotionEnabled, generateRandomCouponCode, resetMileageReward, editMileageReward, saveMileageRules, saveMileageReward, toggleMileageReward, removeMileageReward, openMileageAccount, adjustMileage, saveInvitationSettings } = promotionsActions

const promotionDisplay = createPromotionDisplay({ promotionForm, promotionsPageState, severeWeatherEnabled, extras })
const { promotionDiscountHint, promotionStackingHint, filteredPromotions, toggleWeekday, isWeekdaySelected, setWeekdaysPreset, formatWeekdaysText, formatRouteText, formatTimeRangeText, triggerLabel, triggerSummary, isTriggerActive } = promotionDisplay
const routePricingActions = createRoutePricingActions({ api, pricingCurrency, distancePricing, routeMinimumFareForm, error, load, displayError, requestConfirmation, notify, t })
const { addPricingTier, removePricingTier, syncPreviousTier, syncNextTier, saveDistancePricing, switchPricingCurrency, resetRouteMinimumFare, editRouteMinimumFare, saveRouteMinimumFare, removeRouteMinimumFare } = routePricingActions
const vehiclesActions = createVehiclesActions({ api, view, categories, vehicles, extras, distancePricing, routeMinimumFareForm, categoryForm, vehicleForm, extraForm, pricingCurrency, severeWeatherEnabled, extraSortId, load, error, displayError, requestConfirmation, notify, t })
const { editExtra, resetExtra, saveExtra, moveExtra, showOnlyExtra, toggleSevereWeather, removeExtra, editVehicle: editCatalogVehicle, editCategory, resetCategory, resetVehicle, saveCategory, toggleCategory, saveVehicle, toggleVehicle, removeCategory, removeVehicle } = vehiclesActions
const addressesActions = createAddressesActions({ addressesApi, addresses, addressForm, mainlandCities, mainlandCityForm, addressSearchKeyword, addressSearchResults, addressSearching, error, load, displayError, displayMainlandCity, apiMainlandCity, displayPlaceName, requestConfirmation, notify, t })
const { editAddress, resetAddress, searchAddressPlaces, handleAddressRegionChange, handleAddressCityChange, selectAddressSearchResult, saveAddress, removeAddress, resetMainlandCity, editMainlandCity, saveMainlandCity, removeMainlandCity } = addressesActions
const driverActions = createDriversActions({ driversApi, driverForm, selectedDriver, settlementForm, drivers, error, load, displayError, requestConfirmation, notify })
const { reviewStatusLabel, resetDriver, editDriver, formatDriverHongKongPlate, formatDriverMacauPlate, formatDriverMainlandPlate, changeDriverOwnership, uploadDriverPhotos, removeDriverPhoto, saveDriver, updateDriverStatus, removeDriver, openDriverDetail, previewDriver, closeDriverDetail, approveDriver, requestDriverRevision, rejectDriver, resetSettlement, saveSettlement, refreshDriverVehicles, updateVehicleStatus, removeVehicle: removeDriverVehicle, vehicleForm: driverVehicleForm, resetVehicleForm, editVehicle: editDriverVehicle, closeVehicleForm, changeVehicleOwnership: changeDriverVehicleOwnership, saveVehicle: saveDriverVehicle } = driverActions
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
  const appContext = { token, locale, view, vehicleTab, mobileNavOpen, navigate, userNavigation, setVehicleView, visiblePrimaryNavigation, visibleOperationsNavigation, title, dashboard, exchangeRate, severeWeatherEnabled, adminLogo, users, selectedUser, walletTransactions, topUpWithdrawalHistory, trips, charterOrders, addresses, mainlandCities, mainlandCityForm, addressRegionFilter, addressCityFilter, totalCount: totalAddressCount, enabledCount: enabledAddressCount, mainlandCount: mainlandAddressCount, filteredAddresses, addressSearchKeyword, addressSearchResults, addressSearching, categories, vehicles, extras, extraSortId, distancePricing, pricingCurrency, routeMinimumFares, routeMinimumFareForm, membershipPlans, promotions, promotionForm, membershipForm, addressForm, categoryForm, vehicleForm, extraForm, userForm, userPage, userPageSize, userPageCount, pagedUsers, filteredUsers, userSearchQuery, userStatusFilter, goToUserPage, walletAdjustment, tripForm, selectedTrip, tripCatalog, tripQuote, dispatchForm, orderUrlForm, orderUrls, createdOrderUrl, dispatchSearch, dispatchPage, dispatchPageSize, dispatchPageCount, dispatchFilteredTrips, pagedDispatchTrips, goToDispatchPage, tripBookingStep, tripPaymentMethod, tripUseFareBalance, tripUseCashBalance, selectedDriver, settlementForm, tripLocationKeyword, tripLocationResults, tripLocationSearching, tripLocationTarget, tripSearchQuery, tripStatusFilter, tripDateFilter, tripPage, tripPageSize, tripPageCount, pagedTrips, goToTripPage, tripDateYear, tripDateMonth, tripDateDay, tripDateYears, tripDateDays, clearTripDateFilter, filteredTrips, charterForm, currentAdministrator, administrators, auditLogs, administratorForm, notifications, notificationTemplates, notificationForm, notificationTemplateForm, personnel, personnelForm, personnelFilter, drivers, vehicleCategories, driverForm, driverFilter, driverTypeFilter, driverSearch, driverFiltersActive, resetDriverFilters, filteredDrivers, filteredPersonnel, entryItems, entryForm, entryFilter, filteredEntryItems, expenseItems, expenseForm, expenseFilter, filteredExpenses, incomeRows, incomeTotal, expenseTotal, canWrite, isSuperAdministrator, loading, error, username, password, timeOptions, apiLogin, logout, load, resetAdministrator, editAdministrator, saveAdministrator, disableAdministrator, saveExchangeRate, uploadAdminLogo, removeAdminLogo, t, toggleLocale, translateRegion, translateStatus, formatDate, formatOrderNumber, formatTripAmount, paymentMethodLabel, displayMainlandCity, updateCharterStatus, editUser, resetUser, selectUser, saveUser, updateUserStatus, openWalletAdjustment, editTrip, resetTrip, searchTripLocation, selectTripLocation, handleTripRegionChange, calculateTripRoute, prepareTripQuote, completeTripBooking, showTrip, closeTrip, updateTripStatus, saveWalletAdjustment, saveTrip, saveCharter, openDispatch, saveDispatch, openOrderUrlForm, createOrderUrl, copyOrderUrl, closeCreatedOrderUrl, revokeOrderUrl, editAddress, resetAddress, searchAddressPlaces, selectAddressSearchResult, handleAddressRegionChange, handleAddressCityChange, saveAddress, removeAddress, resetMainlandCity, editMainlandCity, saveMainlandCity, removeMainlandCity, editCategory, editCatalogVehicle, resetCategory, saveCategory, toggleCategory, saveVehicle, toggleVehicle, removeCategory, removeVehicle, resetVehicle, editExtra, resetExtra, triggerLabel, triggerSummary, isTriggerActive, toggleSevereWeather, showOnlyExtra, addPricingTier, removePricingTier, syncPreviousTier, syncNextTier, saveDistancePricing, switchPricingCurrency, resetRouteMinimumFare, editRouteMinimumFare, saveRouteMinimumFare, removeRouteMinimumFare, editMembership, resetMembership, saveMembership, removeMembership, formatBenefits, resetPromotion, editPromotion, savePromotion, removePromotion, promotionKindLabel, promotionDiscountLabel, promotionDiscountHint, promotionStackingHint, promotionFilterTab, promotionSearchQuery, filteredPromotions, duplicatePromotion, togglePromotionEnabled, generateRandomCouponCode, toggleWeekday, isWeekdaySelected, setWeekdaysPreset, formatWeekdaysText, formatRouteText, formatTimeRangeText, resetNotification, saveNotification, resetDriver, editDriver, uploadDriverPhotos, removeDriverPhoto, saveDriver, removeDriver, openDriverDetail, closeDriverDetail, resetSettlement, saveSettlement, previewDriver, resetPersonnel, editPersonnel, savePersonnel, removePersonnel, resetEntryItem, editEntryItem, saveEntryItem, removeEntryItem, resetExpense, editExpense, saveExpense, removeExpense, paymentSettings, paymentSettingsSaved, driverRaceSaving, savePaymentSettings, promotionSaving, promotionDeletingId, promotionTogglingId, toasts, dismissToast, confirmDialog, resolveConfirmation }
   // Domain contexts are provided independently; the legacy aggregate context is no longer exposed.
   provide('adminPaymentsContext', {
     view,
     t,
     canWrite,
     error,
     loading,
     load,
     paymentSettings,
     paymentSettingsSaved,
     savePaymentSettings
   })
   provide('adminNotificationsContext', {
     view,
     t,
     formatDate,
     canWrite,
     notifications,
     notificationTemplates,
     notificationForm,
     notificationTemplateForm,
     notificationRecipientSearch,
     filteredNotificationUsers,
     filteredNotificationDrivers,
     resetNotification,
     createTemplate,
     clearNotificationRecipients,
     toggleNotificationRecipient,
     notificationRecipientChecked,
     saveNotification
   })
   provide('adminMembershipContext', {
     view,
     membershipPlans,
     membershipOrders,
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
     resetAdministrator,
     editAdministrator,
     saveAdministrator,
     disableAdministrator
   })
   provide('adminVehiclePricingContext', {
     view,
     t,
     canWrite,
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
     editCatalogVehicle,
     saveVehicle,
     toggleVehicle,
     removeVehicle,
     resetExtra,
     editExtra,
     saveExtra,
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
   provide('adminUsersAddressesContext', {
     view,
     t,
     formatDate,
     translateStatus,
     canWrite,
     users,
     selectedUser,
     walletTransactions,
     topUpWithdrawalHistory,
     walletAdjustment,
     userForm,
     userPage,
     userPageSize,
     userPageCount,
     pagedUsers,
     filteredUsers,
     userSearchQuery,
     userStatusFilter,
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
     resetUser,
     editUser,
     selectUser,
     saveUser,
     updateUserStatus,
     removeUser,
     openWalletAdjustment,
     saveWalletAdjustment,
     goToUserPage,
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
     confirmDispatch,
     openDispatch,
     saveDispatch,
     openOrderUrlForm,
     createOrderUrl,
     copyOrderUrl,
     closeCreatedOrderUrl,
     revokeOrderUrl,
     paymentSettings,
     driverRaceSaving,
     paymentSettingsSaved,
     savePaymentSettings,
     drivers,
     vehicleCategories,
     selectedDriver,
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
     saveVehicle: saveDriverVehicle   })
   provide('adminDriverVehiclesContext', {
      view,
      canWrite,
      vehicles: computed(() => drivers.value.flatMap(driver => (driver.vehicles || []).map(vehicle => ({ ...vehicle, driverId: driver.id, driverName: driver.name })))),
      refresh: () => load(),
      openFirstVehicleForm: () => { view.value = 'drivers'; resetVehicleForm() },
      editVehicleFromRegistry: vehicle => { view.value = 'drivers'; const driver = drivers.value.find(item => item.id === vehicle.driverId); if (driver) { selectedDriver.value = driver; openDriverDetail(driver); editDriverVehicle(vehicle) } },
      openDriver: driverId => { view.value = 'drivers'; const driver = drivers.value.find(item => item.id === driverId); if (driver) openDriverDetail(driver) }
    })

   provide('adminDashboardContext', {
     view,
     isSuperAdministrator,
     dashboard,
     adminLogo,
     t,
     uploadAdminLogo,
     removeAdminLogo
   })
   provide('adminTripsContext', {
     view,
     t,
     canWrite,
     formatDate,
     formatOrderNumber,
     formatTripAmount,
     paymentMethodLabel,
     translateRegion,
     translateStatus,
     passengerTripStatusLabel,
     getPassengerTripStatus,
     trips,
     users,
     tripForm,
     selectedTrip,
     tripCatalog,
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
     tripLocationResults,
     tripLocationSearching,
     tripLocationTarget,
     tripPaymentMethod,
     tripUseFareBalance,
     tripUseCashBalance,
     resetTrip,
     editTrip,
     showTrip,
     closeTrip,
     saveTrip,
     updateTripStatus,
     settleTrip,
     unsettleTrip,
     selectTripLocation,
     handleTripRegionChange,
     calculateTripRoute,
     prepareTripQuote,
     completeTripBooking,
     goToTripPage,
     confirmDispatch,
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
     createOrderUrl,
     copyOrderUrl,
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
     eligibleSettlements,
     filteredSettlements,
     pagedSettlements,
     settlementPageCount,
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
   provide('adminDispatchCharterContext', {
     view,
     users,
     charterOrders,
     charterForm,
     t,
     translateStatus,
     formatDate,
     canWrite,
     updateCharterStatus,
     editCharter,
     saveCharter
   })
   provide('adminOperationsContext', {
     view,
     t,
     formatDate,
     canWrite,
     load,
     personnel,
     personnelForm,
     personnelFilter,
     filteredPersonnel,
     entryItems,
     entryForm,
     entryFilter,
     filteredEntryItems,
     expenseItems,
     expenseForm,
     expenseFilter,
     filteredExpenses,
     incomeRows,
     incomeTotal,
     expenseTotal,
     resetPersonnel,
     editPersonnel,
     savePersonnel,
     removePersonnel,
     resetEntryItem,
     editEntryItem,
     saveEntryItem,
     removeEntryItem,
     resetExpense,
     editExpense,
     saveExpense,
     removeExpense
   })
    return {
      token,
      locale,
      view,
      vehicleTab,
      mobileNavOpen,
      navigate,
      setVehicleView,
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
      saveExchangeRate,
      t,
      toggleLocale,
      toasts,
      dismissToast,
      confirmDialog,
      resolveConfirmation
    }
 }, template: `<ToastHost :items="toasts" @dismiss="dismissToast" /><ConfirmDialog v-bind="confirmDialog" @confirm="resolveConfirmation(true)" @cancel="resolveConfirmation(false)" /><div v-if="!token" class="login"><button type="button" class="login-language" @click="toggleLocale" :aria-label="t('languageLabel')">中 / EN</button><div class="login-orb login-orb-one"></div><div class="login-orb login-orb-two"></div><form @submit.prevent="apiLogin"><div class="brand"><img v-if="adminLogo" :src="adminLogo" width="180" height="56" alt="Admin logo"/><span v-else>{{t('brand')}}</span></div><h1>{{t('welcome')}}</h1><p>{{t('signInPrompt')}}</p><input v-model="username" :placeholder="t('adminUsername')" autocomplete="username" required/><input v-model="password" type="password" :placeholder="t('password')" autocomplete="current-password" required/><button type="submit">{{t('signIn')}}</button><small v-if="error">{{error}}</small></form><footer class="login-footer">© 2026 IM MASTER INC. LIMITED All Rights Reserved.</footer></div><div v-else class="shell"><aside :class="{ 'mobile-nav-open': mobileNavOpen }"><div class="brand"><img v-if="adminLogo" :src="adminLogo" width="180" height="56" alt="Admin logo"/><span v-else>{{t('brand')}}</span></div><button type="button" class="mobile-nav-toggle" :aria-expanded="mobileNavOpen ? 'true' : 'false'" aria-controls="admin-navigation" @click="mobileNavOpen = !mobileNavOpen"><span aria-hidden="true">☰</span><span>{{mobileNavOpen ? '關閉選單' : '開啟選單'}}</span></button><nav id="admin-navigation" @click="mobileNavOpen = false">
  <button type="button" :class="{active:view==='dashboard'}" @click="navigate('dashboard')">{{t('dashboard')}}</button>
  <button type="button" :class="{active:view==='users'}" @click="navigate('users')">{{t('users')}}</button>
  <button type="button" :class="{active:view==='drivers'}" @click="navigate('drivers')">{{t('drivers')}}</button><button type="button" :class="{active:view==='driver-vehicles'}" @click="navigate('driver-vehicles')">車輛管理</button>
  <button type="button" :class="{active:view==='trips'}" @click="navigate('trips')">{{t('trips')}}</button>
  <button type="button" :class="{active:view==='dispatch'}" @click="navigate('dispatch')">{{t('dispatch')}}</button>
  <button type="button" :class="{active:view==='settlements'}" @click="navigate('settlements')">{{t('settlements')}}</button>
  <button type="button" :class="{active:view==='charters'}" @click="navigate('charters')">{{t('charters')}}</button>
  <button type="button" :class="{active:view==='addresses'}" @click="navigate('addresses')">{{t('addresses')}}</button>
  <div class="nav-group vehicle-nav">
    <button type="button" class="nav-group-toggle" :class="{active:view==='vehicles'||view==='route-pricing'}" aria-expanded="true">車型與定價 <span>⌄</span></button>
    <div class="nav-group-items">
      <button type="button" :class="{active:view==='vehicles'&&vehicleTab==='catalog'}" @click="setVehicleView('catalog')">車型資料</button>
      <button type="button" :class="{active:view==='vehicles'&&vehicleTab==='pricing'}" @click="setVehicleView('pricing')">車型定價</button>
      <button type="button" :class="{active:view==='vehicles'&&vehicleTab==='extras'}" @click="setVehicleView('extras')">額外服務</button>
      <button type="button" :class="{active:view==='route-pricing'}" @click="navigate('route-pricing')">路線最低價</button>
    </div>
  </div>
  <button type="button" :class="{active:view==='membership'}" @click="navigate('membership')">{{t('membership')}}</button>
  <button type="button" :class="{active:view==='promotions'}" @click="navigate('promotions')">優惠設定</button>
  <button type="button" :class="{active:view==='payments'}" @click="navigate('payments')">{{t('paymentSettings')}}</button>
  <button type="button" :class="{active:view==='notifications'}" @click="navigate('notifications')">消息推送</button>
  <button type="button" v-if="isSuperAdministrator" :class="{active:view==='administrators'}" @click="navigate('administrators')">{{t('administrators')}}</button>
  <button type="button" v-if="isSuperAdministrator" :class="{active:view==='auditLogs'}" @click="navigate('auditLogs')">{{t('auditLogs')}}</button>
  <div class="nav-group operations-nav">
    <button class="nav-group-toggle" type="button">{{t('operations')}} <span>⌄</span></button>
    <div class="nav-group-items">
      <button type="button" :class="{active:view==='operations-personnel'}" @click="navigate('operations-personnel')">{{t('personnelManagement')}}</button><button type="button" :class="{active:view==='drivers'}" @click="navigate('drivers')">{{t('drivers')}}</button>
      <button type="button" :class="{active:view==='entries'}" @click="navigate('entries')">{{t('entryItems')}}</button>
      <button type="button" :class="{active:view==='income'}" @click="navigate('income')">{{t('incomeReport')}}</button>
      <button type="button" :class="{active:view==='expenses'}" @click="navigate('expenses')">{{t('expenseDetails')}}</button>
    </div>
  </div>
  <button type="button" class="logout logout-mobile" @click="logout">{{t('signOut')}}</button>
</nav><div v-if="currentAdministrator" class="admin-identity"><b>{{currentAdministrator.displayName}}</b><span>{{currentAdministrator.role}}</span></div><button type="button" class="logout logout-desktop" @click="logout">{{t('signOut')}}</button>
</aside><main :class="{readonly: !canWrite}"><header><div v-if="view==='dashboard'"><span class="eyebrow">{{t('adminConsole')}}</span><h1>{{title}}</h1></div><div v-else class="page-header-spacer" aria-hidden="true"></div><div class="header-actions"><span v-if="!canWrite" class="readonly-badge">唯讀模式</span><label v-if="canWrite && view==='dashboard'" class="rate-control">{{t('exchangeRate')}} <input v-model="exchangeRate" type="number" min="0.0001" step="0.0001"/><button type="button" @click="saveExchangeRate">{{t('saveRate')}}</button></label><template v-if="view==='dashboard'"><button type="button" class="language-toggle" @click="toggleLocale" :aria-label="t('languageLabel')">中 / EN</button><button type="button" class="refresh" @click="load">↻ {{t('refresh')}}</button></template></div></header><div v-if="error" class="error">{{error}}</div><DashboardPage /> <ChartersPage /> <UsersPage /><DriversPage /><DriverVehiclesPage /><TripsPage /><SettlementsPage /><AddressesPage /><PromotionsPage /><MembershipPage /><RoutePricingPage /><VehiclesPage /><OperationsPage />      <NotificationsPage /><AdministratorsPage /><AuditLogsPage /><PaymentsPage /></main></div>` }
const app = createApp(App)
registerAdminComponents(app, {
  UsersPage,
  DriversPage,
  DriverVehiclesPage,
  TripsPage,
  SettlementsPage,
  ChartersPage,
  DashboardPage,
  AddressesPage,
  PromotionsPage,
  MembershipPage,
  RoutePricingPage,
  VehiclesPage,
  OperationsPage,
  PaymentsPage,
  AuditLogsPage,
  AdministratorsPage,
  NotificationsPage,
  LoadingState,
  ErrorState,
  ToastHost,
  ConfirmDialog,
  DriverReviewActions,
  VehiclePhotoViewer
})
app.mount('#app')
