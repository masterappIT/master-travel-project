import { serializeAdminQuery } from './admin-query-state.js'

export async function loadAllPages(fetchPage, query = {}, pageSize = 100) {
  const first = await fetchPage({ ...query, page: 1, pageSize })
  const data = [...(first.data || [])]
  const pageCount = Number(first.pageCount || 1)
  for (let page = 2; page <= pageCount; page += 1) {
    const result = await fetchPage({ ...query, page, pageSize })
    data.push(...(result.data || []))
  }
  return { ...first, data }
}

export async function loadAddressResources({ addressesApi, addresses, mainlandCities, displayMainlandCity, displayError }) {
  const [addressResult, cityResult] = await Promise.allSettled([
    addressesApi.list(),
    addressesApi.cities()
  ])

  if (addressResult.status === 'fulfilled') {
    addresses.value = addressResult.value.data
  } else if (addressResult.reason?.kind !== 'cancelled') {
    addresses.value = []
  }

  if (cityResult.status === 'fulfilled') {
    mainlandCities.value = cityResult.value.data.map(item => ({ ...item, name: displayMainlandCity(item.name) }))
  } else if (cityResult.reason?.kind !== 'cancelled') {
    mainlandCities.value = []
  }

  const errors = [addressResult, cityResult]
    .filter(result => result.status === 'rejected' && result.reason?.kind !== 'cancelled')
    .map(result => result.reason)

  return errors.length ? displayError(errors[0]) : ''
}

export async function loadNotificationResources({ api, usersApi, driversApi, notifications, notificationTemplates, notificationUsers, notificationDrivers, search = '', query = { page: 1, pageSize: 20 }, state }) {
  const [notificationResult, templateResult, userResult, driverResult] = await Promise.all([
    api(`/admin/notifications${serializeAdminQuery(query)}`),
    api('/admin/notification-templates'),
    usersApi.options({ page: 1, pageSize: 20, search }),
    driversApi.options({ page: 1, pageSize: 20, search })
  ])
  notifications.value = notificationResult.data
  state?.apply(notificationResult)
  notificationTemplates.value = templateResult.data
  notificationUsers.value = userResult.data
  notificationDrivers.value = driverResult.data
}

export async function loadVehicleResources({ api, vehiclesApi, categories, vehicles, extras, distancePricing, sortByOrder }) {
  const [categoryResult, vehicleResult, extraResult, pricingResult] = await Promise.all([
    api('/admin/vehicle-categories'),
    vehiclesApi.list(),
    api('/admin/vehicle-extras'),
    api('/admin/distance-pricing')
  ])
  categories.value = sortByOrder(categoryResult.data)
  vehicles.value = sortByOrder(vehicleResult.data)
  extras.value = sortByOrder(extraResult.data)
  distancePricing.value = sortByOrder(pricingResult.data)
}

export async function loadMembershipResources({ api, membershipPlans, membershipOrders, query = { page: 1, pageSize: 20 }, state }) {
  const [plansResult, ordersResult] = await Promise.all([
    api('/admin/membership-plans'),
    api(`/admin/membership-orders${serializeAdminQuery(query)}`)
  ])
  membershipPlans.value = plansResult.data
  membershipOrders.value = ordersResult.data
  state?.apply(ordersResult)
}

export async function loadPromotionResources({ api, promotions, mileageRules, mileageRewards, mileageAccounts, invitationSettings, invitationWalletCurrency, invitationSummary, invitationRecords }) {
  const [promotionResult, mileageResult, invitationResult] = await Promise.all([
    api('/admin/promotions'),
    api('/admin/mileage/settings'),
    api('/admin/invitations/settings')
  ])
  promotions.value = promotionResult.data
  mileageRules.value = mileageResult.rules
  mileageRewards.value = mileageResult.rewards
  mileageAccounts.value = mileageResult.accounts
  invitationSettings.value = invitationResult.rules
  invitationWalletCurrency.value = invitationResult.walletCurrency
  invitationSummary.value = invitationResult.summary
  invitationRecords.value = invitationResult.records
}

export async function loadRoutePricingResources({ api, categories, routeMinimumFares }) {
  const [categoryResult, fareResult] = await Promise.all([
    api('/admin/vehicle-categories'),
    api('/admin/route-minimum-fares')
  ])
  categories.value = categoryResult.data
  routeMinimumFares.value = fareResult.data
}

export async function loadCoreUsers({ usersApi, users, state }) {
  const result = await usersApi.list(state?.query.value || { page: 1, pageSize: 10 })
  if (state) state.apply(result)
  else users.value = result.data
}

export async function loadDriversResources({ driversApi, vehicleCategories, drivers, allVehicles, state, includeVehicles = true }) {
  const requests = [driversApi.categories(), driversApi.list(state?.query.value || { page: 1, pageSize: 20 })]
  if (includeVehicles) requests.push(driversApi.listAllVehicles())
  const [categoryResult, driverResult, vehicleResult] = await Promise.all(requests)
  vehicleCategories.value = categoryResult.data.filter(item => item.enabled !== false)
  if (state) state.apply(driverResult)
  else drivers.value = driverResult.data
  if (vehicleResult) allVehicles.value = vehicleResult.data.map(vehicle => ({ ...vehicle, vehiclePhotoUrl: null }))
}

export async function loadDispatchResources({ tripsApi, driversApi, trips, drivers, orderUrls, state }) {
  const [tripResult, driverResult] = await Promise.all([
    tripsApi.list(state?.dispatchQuery.value || { page: 1, pageSize: 10, mode: 'dispatch' }),
    driversApi.options({ page: 1, pageSize: 100 })
  ])
  state?.apply(tripResult, 'dispatch')
  if (!state) trips.value = tripResult.data
  drivers.value = driverResult.data
  orderUrls.value = tripResult.data.flatMap(trip => trip.orderUrls || [])
}

export async function loadSettlementResources({ tripsApi, driversApi, trips, drivers, query = { page: 1, pageSize: 10, mode: 'settlements' }, state }) {
  const [tripResult, driverResult] = await Promise.all([tripsApi.list(query), driversApi.options({ page: 1, pageSize: 100 })])
  if (state) state.apply(tripResult)
  else trips.value = tripResult.data
  drivers.value = driverResult.data
  return tripResult
}

export async function loadTripsResources({ tripsApi, usersApi, api, trips, users, state, tripCatalog }) {
  const [tripResult, catalogResult, userResult] = await Promise.all([
    tripsApi.list(state?.query.value || { page: 1, pageSize: 10, mode: 'list' }),
    api('/vehicles'),
    usersApi.options({ page: 1, pageSize: 100 })
  ])
  state?.apply(tripResult, 'list')
  if (!state) trips.value = tripResult.data
  users.value = userResult.data
  tripCatalog.value = catalogResult
}

export async function loadCharterResources({ api, charterOrders }) {
  charterOrders.value = (await api('/admin/charter-orders')).data
}

export async function loadAdministratorResources({ api, administrators }) {
  administrators.value = (await api('/admin/administrators')).data
}

export async function loadAuditLogResources({ api, auditLogs, query = { page: 1, pageSize: 20 } }) {
  const result = await api(`/admin/audit-logs${serializeAdminQuery(query)}`)
  auditLogs.value = result.data
  return result
}
