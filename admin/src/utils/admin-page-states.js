import { createUsersPageState } from '../pages/users/users.state.js'
import { createAddressesPageState } from '../pages/addresses/addresses.state.js'
import { createPromotionsPageState } from '../pages/promotions/promotions.state.js'
import { createTripsPageState } from '../pages/trips/trips.state.js'
import { createSettlementsPageState } from '../pages/settlements/settlements.state.js'
import { createDriversPageState } from '../pages/drivers/drivers.state.js'
import { createOperationsPageState } from '../pages/operations/operations.state.js'

export function createAdminPageStates({ users, addresses, promotions, trips, drivers, personnel, entryItems, expenseItems }) {
  const usersPageState = createUsersPageState(users, 10)
  const addressesPageState = createAddressesPageState(addresses)
  const promotionsPageState = createPromotionsPageState(promotions)
  const tripsPageState = createTripsPageState(trips, 10)
  const settlementsPageState = createSettlementsPageState(trips, drivers, 10)
  const driversPageState = createDriversPageState(drivers)
  const operationsPageState = createOperationsPageState(personnel, entryItems, expenseItems)

  return {
    usersPageState,
    addressesPageState,
    promotionsPageState,
    tripsPageState,
    settlementsPageState,
    driversPageState,
    operationsPageState,
    addressRegionFilter: addressesPageState.regionFilter,
    addressCityFilter: addressesPageState.cityFilter,
    totalAddressCount: addressesPageState.totalCount,
    enabledAddressCount: addressesPageState.enabledCount,
    mainlandAddressCount: addressesPageState.mainlandCount,
    promotionFilterTab: promotionsPageState.filterTab,
    promotionSearchQuery: promotionsPageState.searchQuery,
    userPage: usersPageState.page,
    userPageSize: usersPageState.pageSize,
    userSearchQuery: usersPageState.searchQuery,
    userStatusFilter: usersPageState.statusFilter,
    filteredUsers: usersPageState.filtered,
    userPageCount: usersPageState.pageCount,
    pagedUsers: usersPageState.paged,
    goToUserPage: usersPageState.goToPage,
    tripSearchQuery: tripsPageState.searchQuery,
    tripStatusFilter: tripsPageState.statusFilter,
    tripDateFilter: tripsPageState.dateFilter,
    tripPage: tripsPageState.page,
    tripPageSize: tripsPageState.pageSize,
    dispatchSearch: tripsPageState.dispatchSearch,
    dispatchPage: tripsPageState.dispatchPage,
    dispatchPageSize: tripsPageState.pageSize,
    tripDateYear: tripsPageState.dateYear,
    tripDateMonth: tripsPageState.dateMonth,
    tripDateDay: tripsPageState.dateDay,
    tripDateYears: tripsPageState.dateYears,
    tripDateDays: tripsPageState.dateDays,
    clearTripDateFilter: tripsPageState.clearDateFilter,
    driverFilter: driversPageState.statusFilter,
    driverTypeFilter: driversPageState.typeFilter,
    driverSearch: driversPageState.searchQuery,
    driverFiltersActive: driversPageState.hasActiveFilters,
    resetDriverFilters: driversPageState.resetFilters,
    personnelFilter: operationsPageState.personnelFilter,
    entryFilter: operationsPageState.entryFilter,
    expenseFilter: operationsPageState.expenseFilter
  }
}
