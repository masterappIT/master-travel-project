import { ref } from 'vue'

export function createAdminInteractionState() {
  return {
    orderUrls: ref([]),
    createdOrderUrl: ref(''),
    tripCatalog: ref({ categories: [], data: [], extras: [] }),
    tripVehicleCategoryId: ref(''),
    tripQuote: ref(null),
    vehicleCategories: ref([]),
    tripBookingStep: ref('details'),
    tripPaymentMethod: ref('sandbox'),
    tripPaymentAmount: ref(''),
    tripUseFareBalance: ref(false),
    tripUseCashBalance: ref(false),
    tripLocationKeyword: ref(''),
    tripOriginKeyword: ref(''),
    tripDestinationKeyword: ref(''),
    tripLocationResults: ref([]),
    tripLocationSearching: ref(false),
    tripLocationTarget: ref('origin')
  }
}
