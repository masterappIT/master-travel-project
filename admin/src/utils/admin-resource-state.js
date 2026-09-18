import { ref } from 'vue'

export function createAdminResourceState() {
  return {
    users: ref([]),
    selectedUser: ref(null),
    walletTransactions: ref([]),
    topUpWithdrawalHistory: ref([]),
    trips: ref([]),
    charterOrders: ref([]),
    addresses: ref([]),
    mainlandCities: ref([]),
    addressSearchKeyword: ref(''),
    addressSearchResults: ref([]),
    addressSearching: ref(false),
    categories: ref([]),
    vehicles: ref([]),
    extras: ref([]),
    distancePricing: ref([]),
    routeMinimumFares: ref([]),
    routeMinimumFareForm: ref(null),
    membershipPlans: ref([]),
    promotions: ref([]),
    promotionForm: ref(null),
    promotionSaving: ref(false),
    promotionDeletingId: ref(''),
    promotionTogglingId: ref(''),
    mileageRules: ref({ spendPerKm: 10, validityMonths: 12 }),
    mileageRewards: ref([]),
    mileageAccounts: ref([]),
    mileageRewardForm: ref(null),
    mileageLedger: ref([]),
    mileageSelectedAccount: ref(null),
    mileageSaving: ref(false)
  }
}
