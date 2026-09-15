import { ref } from 'vue'

export function createAdminInteractionState() {
  return {
    orderUrls: ref([]),
    createdOrderUrl: ref(''),
    tripCatalog: ref({ categories: [], data: [], extras: [] }),
    tripQuote: ref(null),
    vehicleCategories: ref([]),
    tripBookingStep: ref('details'),
    tripPaymentMethod: ref('sandbox'),
    tripUseFareBalance: ref(false),
    tripUseCashBalance: ref(false),
    tripLocationKeyword: ref(''),
    tripLocationResults: ref([]),
    tripLocationSearching: ref(false),
    tripLocationTarget: ref('origin')
  }
}
