export async function loadAddressResources({ addressesApi, addresses, mainlandCities, displayMainlandCity, displayError }) {
  const [addressResult, cityResult] = await Promise.allSettled([
    addressesApi.list(),
    addressesApi.cities()
  ])

  if (addressResult.status === 'fulfilled') {
    addresses.value = addressResult.value.data
  } else {
    addresses.value = []
  }

  if (cityResult.status === 'fulfilled') {
    mainlandCities.value = cityResult.value.data.map(item => ({ ...item, name: displayMainlandCity(item.name) }))
  } else {
    mainlandCities.value = []
  }

  const errors = [addressResult, cityResult]
    .filter(result => result.status === 'rejected')
    .map(result => result.reason?.message)
    .filter(Boolean)

  return errors.length ? displayError(errors[0]) : ''
}

export async function loadDispatchOrderUrls({ trips, tripsApi, orderUrls }) {
  orderUrls.value = []
  for (const trip of trips.value) {
    const result = await tripsApi.orderUrls(trip.id)
    orderUrls.value.push(...result.data)
  }
}

export async function loadNotificationResources({ api, usersApi, driversApi, notifications, notificationTemplates, notificationUsers, notificationDrivers }) {
  const [notificationResult, templateResult, userResult, driverResult] = await Promise.all([
    api('/admin/notifications'),
    api('/admin/notification-templates'),
    usersApi.list(),
    driversApi.list()
  ])
  notifications.value = notificationResult.data
  notificationTemplates.value = templateResult.data
  notificationUsers.value = userResult.data
  notificationDrivers.value = driverResult.data
}

export async function loadVehicleResources({ api, categories, vehicles, extras, distancePricing, sortByOrder }) {
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

export async function loadMembershipResources({ api, membershipPlans, membershipOrders }) {
  const [plansResult, ordersResult] = await Promise.all([
    api('/admin/membership-plans'),
    api('/admin/membership-orders')
  ])
  membershipPlans.value = plansResult.data
  membershipOrders.value = ordersResult.data
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

export async function loadCoreUsers({ usersApi, users }) {
  users.value = (await usersApi.list()).data
}


export async function loadDriversResources({ driversApi, vehicleCategories, drivers, allVehicles }) {
  const [categoryResult, driverResult, vehicleResult] = await Promise.all([driversApi.categories(), driversApi.list(), driversApi.listAllVehicles()])
  vehicleCategories.value = categoryResult.data.filter(item => item.enabled !== false)
  drivers.value = driverResult.data
  allVehicles.value = vehicleResult.data
}

export async function loadDispatchResources({ tripsApi, driversApi, trips, drivers, orderUrls, tripPage }) {
  const [tripResult, driverResult] = await Promise.all([tripsApi.list(), driversApi.list()])
  trips.value = tripResult.data
  drivers.value = driverResult.data
  await loadDispatchOrderUrls({ trips, tripsApi, orderUrls })
  tripPage.value = 1
}

export async function loadSettlementResources({ tripsApi, driversApi, trips, drivers }) {
  const [tripResult, driverResult] = await Promise.all([tripsApi.list(), driversApi.list()])
  trips.value = tripResult.data
  drivers.value = driverResult.data
}

export async function loadTripsResources({ tripsApi, driversApi, api, trips, drivers, tripPage, tripCatalog }) {
  const [tripResult, catalogResult, driverResult] = await Promise.all([tripsApi.list(), api('/vehicles'), driversApi.list()])
  trips.value = tripResult.data
  drivers.value = driverResult.data
  tripPage.value = 1
  tripCatalog.value = catalogResult
}

export async function loadCharterResources({ api, charterOrders }) {
  charterOrders.value = (await api('/admin/charter-orders')).data
}

export async function loadAdministratorResources({ api, administrators }) {
  administrators.value = (await api('/admin/administrators')).data
}
